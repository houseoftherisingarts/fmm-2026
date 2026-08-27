// ─── Seed des rapports publicitaires ─────────────────────────────────
// Verse les rapports de campagne (Meta, journal, Google Ads, AdSense)
// dans la collection Firestore `rapports_pubs`, lue par la section
// admin Publicité.
//
//   node scripts/seed-rapports-pubs.mjs
//
// Rejouable sans dégât : l'identifiant de chaque rapport se calcule à
// partir de la date et de la source, donc relancer le script réécrit
// les mêmes documents au même endroit.
//
// Même patron de credentials que tools/importer-clients.mjs : ce que
// gcloud a déjà déposé sur cette machine (identifiant par défaut, ou
// celui du compte connecté via `firebase login`) suffit.

import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.resolve(ici, '..');
const PROJET = 'festivalmedieval';

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

Lance ceci une seule fois, puis relance le seed :
  gcloud auth application-default login --project ${PROJET}
`);
    process.exit(1);
  }
  const requireFonctions = createRequire(path.join(racine, 'functions', 'package.json'));
  const admin = requireFonctions('firebase-admin');
  admin.initializeApp({ projectId: PROJET, credential: admin.credential.applicationDefault() });
  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  return { db, admin, source };
}

// ── Les 4 rapports ───────────────────────────────────────────────────
const DATE = '2026-08-27';
const AUTEUR = 'claude';

const rapports = [
  {
    source: 'meta',
    titre: 'Pubs Facebook FMM 2026, 30 derniers jours',
    resume: "Compte Alex T. St-Laurent : 4 campagnes actives, 94,48 $ dépensés, 805 visites du site et 45 abonnés. Tout clic mène au site. Campagne \"likes\" du 24 août mise en pause.",
    lignes: [
      { libelle: 'Ontario EN 5 $/jour', valeur: '30,52 $ · CTR 7,28 % · CPC 0,04 $ · 322 vues de page' },
      { libelle: 'Promo site 19 août', valeur: '37,22 $ · CTR 8,20 % · CPC 0,06 $ · 360 vues' },
      { libelle: 'Promo site 19 août #2', valeur: '15,41 $ · CTR 8,29 % · 123 vues' },
      { libelle: 'Page QC likes (en pause)', valeur: '11,33 $ · 45 likes à 0,25 $' },
    ],
    detail: 'Compte Salon des Inconnus : 5 campagnes marquées actives à 0 $ de dépense depuis 2023-2025 (zombies), pause recommandée.',
  },
  {
    source: 'journal',
    titre: "Coops de l'information, campagne 0155387W",
    resume: '13 au 17 sept 2025, 9 785 impressions sur 10 100 prévues, 14 clics, CTR 0,14 % (moyenne display 0,46 %). Coût par clic autour de 15 $. Facture payée par Alex à titre de bonne volonté.',
    lignes: [
      { libelle: 'Impressions', valeur: '9 785' },
      { libelle: 'Clics', valeur: '14' },
      { libelle: 'CTR', valeur: '0,14 %' },
      { libelle: 'Placement', valeur: '1' },
    ],
  },
  {
    source: 'google_ads',
    titre: 'Campagne Google Ads FMM 2026',
    resume: "Campagne Recherche prête (3 groupes : intention directe, quoi faire en fin de semaine, marque), rayon 150 km, FR et EN, 10 $/jour jusqu'au 27 septembre. En attente de mise en ligne et de la balise gtag.",
    lignes: [
      { libelle: 'Statut', valeur: 'à monter' },
      { libelle: 'Budget proposé', valeur: '10 $/jour' },
      { libelle: 'Fin', valeur: '27 sept 2026' },
    ],
  },
  {
    source: 'adsense',
    titre: 'AdSense, compte ca-pub-7365982984401895',
    resume: "Balise et ads.txt en ligne. Onboarding : Paiements et Connexion du site à compléter sur le compte d'Alex. Décision : pub uniquement dans les jeux, au début de chaque partie (composant PubDebutPartie déployé, inerte tant que VITE_ADSENSE_SLOT_JEUX est vide).",
    lignes: [
      { libelle: 'Étape Paiements', valeur: 'à faire' },
      { libelle: 'Étape Site', valeur: 'à faire' },
      { libelle: 'Bloc pub jeux', valeur: 'à créer après approbation' },
    ],
  },
];

const { db, admin, source } = ouvrirBase();
console.log(`Identifiants : ${source}\n`);

const lot = db.batch();
for (const r of rapports) {
  const id = `${DATE}__${r.source}`;
  lot.set(db.collection('rapports_pubs').doc(id), {
    date: DATE,
    titre: r.titre,
    source: r.source,
    resume: r.resume,
    lignes: r.lignes,
    ...(r.detail ? { detail: r.detail } : {}),
    auteur: AUTEUR,
    importe: admin.firestore.FieldValue.serverTimestamp(),
  });
}
await lot.commit();

console.log(`${rapports.length} rapports écrits dans rapports_pubs.`);
process.exit(0);
