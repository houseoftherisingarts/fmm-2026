// ─── Le bottin des ressources, versé dans le carnet ──────────────────
// Alex, 2026-09-02 : « il faudrait rajouter dans l'admin du festival un
// genre de bottin téléphonique des ressources, notamment la
// municipalité de Montpellier ». Les fiches vivent dans la collection
// `carnetContacts`, celle que la section Bottin et contacts affiche.
//
//   node tools/bottin-seed.mjs             (essai : montre, n'écrit rien)
//   node tools/bottin-seed.mjs --ecrire    (écrit pour de vrai)
//
// L'essai est le comportement par défaut, à l'inverse des autres outils
// du dossier : un bottin faux coûte plus cher qu'un bottin vide, et
// personne ne doit pouvoir le remplir par accident.
//
// Rejouable sans dégât : chaque fiche porte un identifiant calculé sur
// son nom, et l'écriture se fait en fusion. Relancer l'outil corrige les
// fiches versées ici sans toucher à ce que l'équipe a écrit à la main
// dans les champs que le bottin ne connaît pas.
//
// ⚠️ RÈGLE DE VÉRITÉ. Aucune coordonnée de ce fichier n'est devinée.
// Chaque fiche porte sa source et la date où elle a été vérifiée. Une
// donnée qui n'a pas pu être vérifiée reste VIDE, et la note dit ce qui
// manque et où aller le chercher. Un numéro plausible mais jamais vu sur
// une page officielle est pire que pas de numéro du tout : il envoie
// quelqu'un ailleurs pendant une urgence.
//
// ⚠️ Ce bottin ne porte QUE des ressources et l'équipe d'organisation.
// Les marchands, les bénévoles et les musiciens ont leurs propres
// sections dans la régie : les verser ici mélangerait deux registres et
// noierait les numéros qu'on cherche en courant.

import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..');
const PROJET = 'festivalmedieval';
const COLLECTION = 'carnetContacts';

// La date où les ressources publiques ci-dessous ont été vérifiées sur
// les sites officiels. À changer le jour où quelqu'un les revérifie.
const VERIFIE_LE = '2026-09-02';

const SOURCE_EQUIPE = "Drive du festival, feuille « Equipe d'Organization 2023 - Info Contact »";

// ── L'équipe d'organisation ─────────────────────────────────────────
// Tirée telle quelle de la feuille de 2023. Trois éditions ont passé
// depuis : chaque fiche part donc sans date de vérification, ce que la
// régie affiche comme « À vérifier ».
const EQUIPE = [
  { name: 'Tristan Coté-Hotte', fonction: 'Chef du festival', phone: '819 428-1280',
    email: 'tristan_cote_hotte@hotmail.fr',
    notes: "Aussi connu sous le nom de Sergei Stanoffsky. Subventions, animation et thème narratif, comptabilité, tournois d'épée, coordination générale. Numéro de la maison." },
  { name: 'Océane Leclair', fonction: 'Coordination du village paysan', phone: '514 882-5023',
    email: 'oceaneleclair@gmail.com', notes: '' },
  { name: 'Jesse Dippy', fonction: 'Coordination du village paysan et de la foire locale', phone: '904 994-4072',
    email: 'jesse.dippy@gmail.com', notes: 'Cellulaire américain : prévoir les frais et le décalage.' },
  { name: 'Carilynn Proulx', fonction: 'Chevaux et clinique équestre', phone: '819 981-0838',
    email: 'carilynnlrouche@hotmail.com', notes: "S'occupe des chevaux de l'AMQ et coordonne la clinique à cheval." },
  { name: 'Samuelle Pilon', fonction: 'Coordination du village paysan', phone: '819 981-1645',
    email: 'samlpilon@outlook.com', notes: 'Aussi appelée Sam ou Sami.' },
  { name: 'Éric Pichette', fonction: 'Coordination du son, de la scène et des musiciens', phone: '819 983-8643',
    email: 'info@tanwen.qc.ca', notes: "Surnommé Pitch. Performe aussi dans le groupe l'Harfang." },
  { name: 'Alex St-Laurent', fonction: 'Site web, médias sociaux, vidéo', phone: '514 418-3450',
    email: 'alex@lesalondesinconnus.com', notes: '' },
  { name: 'Mikael Lamarche', fonction: 'Construction et planification du site', phone: '819 981-1631',
    email: 'lamarchemikael45@gmail.com', notes: 'Surnommé Mik.' },
  { name: "Nicolas l'Écuyer-Pilon", fonction: 'Restauration et bar', phone: '819 981-0604',
    email: 'nicolaslecuyerpilon@gmail.com', notes: 'Surnommé Nic.' },
  { name: 'Maïté Fournel', fonction: 'Gestion des bénévoles', phone: '438 530-4093',
    email: 'm.fournel11@gmail.com', notes: '' },
  { name: 'Arthur Adrien', fonction: 'Master bénévoles', phone: '514 651-9090',
    email: 'arthuradrien514@gmail.com', notes: '' },
].map((membre) => ({
  ...membre,
  role: 'organisateur',
  organisation: 'Festival Médiéval de Montpellier',
  adresse: '',
  urgence: false,
  verifieLe: '',
  source: SOURCE_EQUIPE,
  notes: [membre.notes, "Coordonnées de l'édition 2023, à reconfirmer auprès de la personne."]
    .filter(Boolean).join(' '),
}));

// ── Les ressources publiques du secteur ─────────────────────────────
// Vérifiées une à une sur les sites officiels le 2026-09-02. Chaque
// fiche porte l'adresse de la page consultée dans son champ `source`.
const RESSOURCES = [
  /* REMPLI_PAR_LA_VERIFICATION */
];

// ── L'assemblage ────────────────────────────────────────────────────

const FICHE_VIDE = {
  name: '', role: 'autre', allegiance: 'neutre', fonction: '', organisation: '',
  email: '', phone: '', notes: '', lastContactAt: '',
  adresse: '', urgence: false, verifieLe: '', source: '',
  photoUrl: '', photoPath: '', archived: false, order: 0,
};

/** L'identifiant d'une fiche se calcule sur son nom, pour qu'une
 *  deuxième exécution corrige la fiche existante au lieu d'en créer une
 *  jumelle. Préfixé, pour qu'on voie d'un coup d'œil dans la base ce qui
 *  vient de cet outil et ce que l'équipe a saisi elle-même. */
function identifiant(nom) {
  const cle = nom
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `bottin-${cle}`;
}

const fiches = [...EQUIPE, ...RESSOURCES].map((f) => ({ ...FICHE_VIDE, ...f }));

// Un doublon d'identifiant ferait qu'une fiche en écraserait une autre
// en silence. Mieux vaut refuser de tourner.
const vus = new Set();
for (const f of fiches) {
  const id = identifiant(f.name);
  if (vus.has(id)) throw new Error(`Deux fiches portent le même identifiant « ${id} ». Distinguez leurs noms.`);
  vus.add(id);
}

const manquantes = fiches.filter((f) => !f.phone && !f.email);
const aVerifier = fiches.filter((f) => !f.verifieLe);

// ── Le mode essai ───────────────────────────────────────────────────

const ecrire = process.argv.includes('--ecrire');

if (!ecrire) {
  console.log(`\nESSAI. Rien ne sera écrit. Ajoutez --ecrire pour verser dans ${COLLECTION}.\n`);
  let familleCourante = null;
  for (const f of fiches) {
    if (f.role !== familleCourante) {
      familleCourante = f.role;
      console.log(`\n── ${familleCourante} ──`);
    }
    const marques = [f.urgence ? 'URGENCE' : '', f.verifieLe ? `vérifié ${f.verifieLe}` : 'À VÉRIFIER']
      .filter(Boolean).join(', ');
    console.log(`  ${identifiant(f.name)}`);
    console.log(`    ${f.name}${f.fonction ? ` — ${f.fonction}` : ''}  [${marques}]`);
    console.log(`    tél. ${f.phone || '(vide)'}   courriel ${f.email || '(vide)'}`);
    if (f.adresse) console.log(`    ${f.adresse}`);
    if (f.notes) console.log(`    note : ${f.notes}`);
    if (f.source) console.log(`    source : ${f.source}`);
  }
  console.log(`\n${fiches.length} fiche(s) prêtes.`);
  console.log(`  ${aVerifier.length} sans date de vérification, affichées « À vérifier » dans la régie.`);
  if (manquantes.length) {
    console.log(`  ${manquantes.length} sans téléphone ni courriel : ${manquantes.map((f) => f.name).join(', ')}.`);
  }
  console.log('\nEssai terminé, la base n’a pas été touchée.\n');
  process.exit(0);
}

// ── L'écriture ──────────────────────────────────────────────────────
// Les identifiants : ce que gcloud a déjà déposé sur cette machine
// suffit. Patron repris de tools/migrer-chaleur.mjs.
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

const source = preparerIdentifiants();
if (!source) {
  console.error(`
Firestore refuse de s’ouvrir : aucun identifiant sur cette machine.

Lance ceci une seule fois, puis relance l’outil :
  gcloud auth application-default login --project ${PROJET}
`);
  process.exit(1);
}

const requireFonctions = createRequire(path.join(racine, 'functions', 'package.json'));
const admin = requireFonctions('firebase-admin');
admin.initializeApp({ projectId: PROJET, credential: admin.credential.applicationDefault() });
const db = admin.firestore();

console.log(`Identifiants : ${source}. Écriture de ${fiches.length} fiche(s) dans ${COLLECTION}…`);

const lot = db.batch();
for (const f of fiches) {
  lot.set(db.collection(COLLECTION).doc(identifiant(f.name)), {
    ...f,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}
await lot.commit();

console.log(`${fiches.length} fiche(s) versées. ${aVerifier.length} restent à vérifier dans la régie.`);
