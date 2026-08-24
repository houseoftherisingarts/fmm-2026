// ─── L'import du registre des clients ────────────────────────────────
// Verse un export Zeffy (.xlsx) dans la collection Firestore `clients`.
//
//   node tools/importer-clients.mjs "~/Downloads/FMM 2026_8-24-2026.xlsx"
//   node tools/importer-clients.mjs fichier1.xlsx fichier2.xlsx …
//   node tools/importer-clients.mjs --essai fichier.xlsx    (lit, n'écrit rien)
//
// ⚠️ DONNÉES PERSONNELLES RÉELLES. Les fichiers portent des noms, des
// courriels et des numéros de téléphone de vraies personnes. Cet outil
// lit un fichier local et écrit dans Firestore, point. Il n'envoie
// aucun courriel, il ne recopie rien dans le dépôt, et il n'écrit
// jamais sur disque.
//
// Rejouable sans dégât : l'identifiant de chaque fiche se calcule à
// partir de l'année, de la catégorie et du courriel. Relancer le même
// fichier réécrit les mêmes documents au même endroit.
//
// Deux dépendances, toutes deux déjà là : openpyxl côté Python lit le
// classeur, firebase-admin (installé pour les Cloud Functions) écrit
// dans la base. Rien à installer.

import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.resolve(ici, '..');
const PROJET = 'festivalmedieval';

// ── Les arguments ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const essai = args.includes('--essai');
const fichiers = args.filter((a) => !a.startsWith('--'));

if (fichiers.length === 0) {
  console.error(`
Donne-moi le chemin d'au moins un export Zeffy.

  node tools/importer-clients.mjs "~/Downloads/FMM 2026_8-24-2026.xlsx"
  node tools/importer-clients.mjs --essai "~/Downloads/Kiosques 2026_8-24-2026.xlsx"

L'option --essai lit tout, compte tout, et n'écrit rien dans Firestore.
`);
  process.exit(1);
}

// ── Le lecteur de classeur ──────────────────────────────────────────
// openpyxl vit déjà sur cette machine et gère les cas tordus qu'un
// lecteur maison raterait : cellules en ligne, dates réelles, feuilles
// vides. Il rend les en-têtes et les lignes en JSON, rien d'autre.
const LECTEUR_PYTHON = `
import json, sys, datetime, openpyxl
wb = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
ws = wb.worksheets[0]
rows = list(ws.iter_rows(values_only=True))
def net(v):
    if v is None: return ''
    if isinstance(v, (datetime.datetime, datetime.date)): return v.isoformat()
    if isinstance(v, float) and v.is_integer(): return str(int(v))
    return str(v)
entetes = [net(h) for h in rows[0]] if rows else []
lignes = [[net(c) for c in r] for r in rows[1:] if any(c not in (None, '') for c in r)]
json.dump({'entetes': entetes, 'lignes': lignes}, sys.stdout, ensure_ascii=False)
wb.close()
`;

function lireClasseur(chemin) {
  const brut = execFileSync('python3', ['-c', LECTEUR_PYTHON, chemin], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(brut);
}

// ── Le modèle partagé ───────────────────────────────────────────────
// Une seule source de vérité pour la normalisation et la fusion :
// src/firebase/clients.ts, le même fichier que lit la section d'admin.
// esbuild le met en paquet pour Node, et la configuration de Vite reste
// vide hors du navigateur, donc Firebase côté client dort.
const sortie = path.join(mkdtempSync(path.join(tmpdir(), 'clients-')), 'clients.mjs');
await build({
  entryPoints: [path.join(racine, 'src', 'firebase', 'clients.ts')],
  bundle: true, format: 'esm', outfile: sortie, logLevel: 'warning',
  define: { 'import.meta.env': '{}' },
});
const M = await import(sortie);

// ── Trouver une colonne par ce qu'elle porte ────────────────────────
// Zeffy renomme ses colonnes d'un export à l'autre : « Numéro de
// Téléphone », « Village / Municipalité / Ville », « De quelle ville ou
// village venez-vous ? ». On cherche donc par morceau de mot, accents
// et casse mis de côté.
const plat = (v) => String(v ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function colonne(entetes, ...motifs) {
  for (const motif of motifs) {
    const i = entetes.findIndex((e) => plat(e).includes(plat(motif)));
    if (i !== -1) return i;
  }
  return -1;
}

/** Au mot exact. « Nom » ne doit pas attraper « Prénom », et la forme
 *  des dons porte les deux colonnes côte à côte. */
function colonneExacte(entetes, motif) {
  return entetes.findIndex((e) => plat(e) === plat(motif));
}

const cellule = (ligne, i) => (i === -1 ? '' : M.normaliserTexte(ligne[i]));

/** L'année d'une date de paiement Zeffy : « 23/09/2023 » ou une date
 *  ISO. Rend `null` quand rien ne se lit, jamais une année inventée. */
function anneeDepuisDate(valeur) {
  const v = String(valeur ?? '').trim();
  const iso = v.match(/^(\d{4})-\d{2}-\d{2}/);
  if (iso) return Number(iso[1]);
  const jma = v.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d\d)\b/);
  if (jma) return Number(jma[3]);
  return null;
}

/** Le téléphone caché dans un champ de notes libres. Les formulaires de
 *  boutique n'ont pas de colonne de téléphone : les gens l'écrivent
 *  dans « Questions et notes », collé au nom de leur entreprise. */
function telephoneDansLeTexte(texte) {
  // Un numéro nord-américain, avec ou sans indicatif 1, écrit collé ou
  // espacé. Les gardes de chiffres évitent d'attraper un morceau de
  // numéro plus long ou une suite de chiffres dans une adresse web.
  const m = String(texte ?? '')
    .match(/(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/);
  return m ? m[0].replace(/\D/g, '') : '';
}

const ouiNon = (v) => {
  const t = plat(v);
  if (t === 'oui' || t === 'yes' || t === 'true') return true;
  if (t === 'non' || t === 'no' || t === 'false') return false;
  return null;
};

// ── Une ligne d'export devient une ligne de registre ────────────────
function lignesDuFichier(chemin) {
  const nom = path.basename(chemin);
  const { entetes, lignes } = lireClasseur(chemin);
  const forme = M.formeDuFichier(entetes);
  const { categorie, annee: anneeDuNom, edition } = M.categorieEtAnnee(nom);

  // Les colonnes communes aux trois formes.
  const iCourriel = colonne(entetes, "courriel de l'acheteur", 'courriel', 'email');
  const iNom      = colonne(entetes, "nom de l'acheteur", 'nom');
  const iTel      = colonne(entetes, 'telephone');
  const iVille    = colonne(entetes, 'municipalite', 'ville', 'village');
  const iVenu     = colonne(entetes, 'deja venu');
  const iSource   = colonne(entetes, 'entendu parler');

  // Ce qui change d'une forme à l'autre.
  const iType   = colonne(entetes, 'type de billet');
  const iArt    = colonne(entetes, 'articles');
  const iNotes  = colonne(entetes, 'questions et notes', 'notes du billet');
  const iMont   = colonne(entetes, 'montant total');
  const iRemb   = colonne(entetes, 'montant rembourse');
  const iDate   = colonne(entetes, 'date du paiement', 'date de la commande');
  const iPrenom = colonne(entetes, 'prenom');
  const iNomSeul = colonneExacte(entetes, 'nom');
  const iEntreprise = colonne(entetes, "nom de l'entreprise");
  const iStatut = forme === 'dons'
    ? colonne(entetes, 'statut du paiement')
    : colonne(entetes, 'statut de traitement', 'statut');

  let sansCourriel = 0;
  const sorties = [];

  for (const l of lignes) {
    const courriel = M.normaliserCourriel(l[iCourriel]);
    if (!courriel) { sansCourriel += 1; continue; }

    const statut = plat(cellule(l, iStatut));
    const annule = statut === 'annule' || statut === 'rembourse'
      || (forme === 'dons' && statut !== 'reussi')
      || (iRemb !== -1 && Number(cellule(l, iRemb)) > 0);

    const notes = cellule(l, iNotes);

    // L'année, dans cet ordre : celle du nom du fichier, puis celle
    // d'une date de paiement dans les données, puis la présomption de
    // 2024. Alex, 2026-08-24 : les exports qui ne portent pas de date
    // datent des années où le festival ne datait pas encore ses
    // fichiers. La fiche garde la trace de ce qui a tranché.
    const anneeLue = anneeDuNom ?? (iDate !== -1 ? anneeDepuisDate(l[iDate]) : null);
    const annee = anneeLue ?? M.ANNEE_PRESUMEE;
    const anneeSource = anneeDuNom != null ? 'nom-fichier'
      : anneeLue != null ? 'donnees'
      : 'defaut-2024';

    let nomAcheteur = cellule(l, iNom);
    if (forme === 'dons') {
      // La forme des dons éclate le nom en deux colonnes, et une
      // entreprise donne parfois à la place d'une personne.
      const prenom = cellule(l, iPrenom);
      const famille = cellule(l, iNomSeul);
      nomAcheteur = M.normaliserTexte(`${prenom} ${famille}`) || cellule(l, iEntreprise);
    }

    const articles = [];
    if (forme === 'boutique' && iArt !== -1) articles.push(M.analyserArticle(l[iArt]));
    else if (forme === 'billets' && iType !== -1) articles.push({ libelle: cellule(l, iType), quantite: 1 });

    const brutMontant = cellule(l, iMont);
    const montant = forme === 'dons' && brutMontant ? Number(brutMontant) : NaN;

    sorties.push({
      courriel,
      nom: nomAcheteur,
      telephone: cellule(l, iTel) || telephoneDansLeTexte(notes),
      annee,
      anneeSource,
      categorie,
      edition,
      articles: articles.filter((a) => a.libelle),
      montant: Number.isFinite(montant) ? montant : undefined,
      dejaVenu: iVenu !== -1 ? ouiNon(l[iVenu]) : null,
      source: cellule(l, iSource),
      municipalite: cellule(l, iVille),
      notes,
      annule,
    });
  }

  return { nom, forme, categorie, anneeDuNom, edition, entetes, lues: lignes.length, sansCourriel, sorties };
}

// ── Les identifiants ────────────────────────────────────────────────
// Ce que gcloud a déjà déposé sur cette machine suffit : le fichier
// d'identifiants par défaut, ou celui que garde le compte connecté.
// Rien de secret n'entre dans le dépôt.
function preparerIdentifiants() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return 'GOOGLE_APPLICATION_CREDENTIALS';

  const defaut = path.join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');
  if (existsSync(defaut)) return 'identifiants par défaut de gcloud';

  const dossier = path.join(homedir(), '.config', 'gcloud', 'legacy_credentials');
  if (existsSync(dossier)) {
    for (const compte of readdirSync(dossier)) {
      const adc = path.join(dossier, compte, 'adc.json');
      if (existsSync(adc)) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = adc;
        return `compte gcloud ${compte}`;
      }
    }
  }
  return null;
}

function ouvrirBase() {
  const source = preparerIdentifiants();
  if (!source) {
    console.error(`
Firestore refuse de s'ouvrir : aucun identifiant sur cette machine.

Lance ceci une seule fois, puis relance l'import :
  gcloud auth application-default login --project ${PROJET}
`);
    process.exit(1);
  }
  const requireFonctions = createRequire(path.join(racine, 'functions', 'package.json'));
  const admin = requireFonctions('firebase-admin');
  admin.initializeApp({ projectId: PROJET, credential: admin.credential.applicationDefault() });
  const db = admin.firestore();
  // Les champs vides ne partent pas : une fiche sans téléphone n'a pas
  // de champ téléphone, plutôt qu'un champ qui vaut « rien ».
  db.settings({ ignoreUndefinedProperties: true });
  return { db, admin, source };
}

// ── L'écriture ──────────────────────────────────────────────────────
const TAILLE_LOT = 400;

async function ecrire(db, admin, fiches) {
  let ecrites = 0;
  for (let i = 0; i < fiches.length; i += TAILLE_LOT) {
    const lot = db.batch();
    for (const fiche of fiches.slice(i, i + TAILLE_LOT)) {
      const { id, ...donnees } = fiche;
      // Sans fusion : le document se réécrit en entier, donc un second
      // passage du même fichier laisse exactement le même contenu.
      lot.set(db.collection('clients').doc(id), {
        ...donnees,
        importe: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await lot.commit();
    ecrites += Math.min(TAILLE_LOT, fiches.length - i);
  }
  return ecrites;
}

// ── En route ────────────────────────────────────────────────────────
const rapports = [];
const toutesLesLignes = [];

for (const brut of fichiers) {
  const chemin = brut.startsWith('~') ? path.join(homedir(), brut.slice(1)) : path.resolve(brut);
  if (!existsSync(chemin)) {
    console.error(`[clients] Introuvable : ${chemin}`);
    process.exitCode = 1;
    continue;
  }
  const r = lignesDuFichier(chemin);
  rapports.push(r);
  toutesLesLignes.push(...r.sorties);
}

if (toutesLesLignes.length === 0) {
  console.error('[clients] Aucune ligne exploitable. Rien à écrire.');
  process.exit(1);
}

const fiches = M.fusionnerClients(toutesLesLignes);

// Le compte rendu, fichier par fichier.
console.log('');
for (const r of rapports) {
  // Les personnes de CE fichier : les clés que ses propres lignes
  // produisent, jamais un filtre sur le tas commun, sinon un fichier
  // sans année ramasserait les fiches de tous les autres.
  const cles = new Set(r.sorties.map((s) => M.identifiantClient(s.annee, s.categorie, s.courriel)));
  const lesSiennes = { length: cles.size };
  const annees = [...new Set(r.sorties.map((s) => s.annee))].sort();
  const source = r.sorties[0]?.anneeSource ?? 'defaut-2024';
  console.log(`  ${r.nom}`);
  console.log(`    forme ${r.forme} · catégorie ${r.categorie}`
    + ` · année ${annees.join(', ')}${source === 'defaut-2024' ? ' (présumée)' : ''}`
    + `${r.edition ? ` · édition ${r.edition}` : ''}`);
  console.log(`    ${r.lues} lignes lues`
    + (r.sansCourriel ? ` · ${r.sansCourriel} sans courriel, écartées` : '')
    + ` · ${lesSiennes.length} personnes après fusion`);
}

const annulees = fiches.filter((f) => f.statut === 'annule').length;
const presumees = fiches.filter((f) => f.anneeSource === 'defaut-2024').length;
console.log('');
console.log(`  Total : ${toutesLesLignes.length} lignes retenues, ${fiches.length} fiches`
  + ` · ${annulees} annulées · ${presumees} à l’année présumée ${M.ANNEE_PRESUMEE}`);

if (essai) {
  // Trois fiches au hasard, pour vérifier à l'œil que la fusion a bien
  // travaillé. Le courriel est masqué : un essai se lance souvent
  // devant quelqu'un, et ces adresses appartiennent à de vraies gens.
  console.log('\n  Aperçu :');
  for (const f of fiches.filter((_, i) => i % Math.ceil(fiches.length / 3) === 0).slice(0, 3)) {
    const masque = f.courriel.replace(/^(.).*(@.*)$/, '$1•••$2');
    console.log(`    ${f.nom} · ${masque} · ${f.annee}`
      + `${f.anneeSource === 'defaut-2024' ? ' (présumée)' : ''} · ${f.categorie}`);
    console.log(`      ${f.detail || 'aucun détail'} · ${f.quantite} au total`
      + ` · ${f.lignes} ligne${f.lignes > 1 ? 's' : ''} fondue${f.lignes > 1 ? 's' : ''}`
      + (f.telephone ? ` · tél. présent` : ' · sans téléphone')
      + (f.statut === 'annule' ? ' · ANNULÉE' : ''));
  }
  console.log('\n  Essai seulement. Rien n’a été écrit dans Firestore.\n');
  process.exit(0);
}

const { db, admin, source } = ouvrirBase();
console.log(`\n  Identifiants : ${source}`);
const ecrites = await ecrire(db, admin, fiches);
console.log(`  ${ecrites} fiches écrites dans clients/ du projet ${PROJET}.\n`);
process.exit(0);
