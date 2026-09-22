// Sème la troupe Hird Hafn Hullsborg dans la collection `guildes` de la
// production, une seule fois.
//
//   node scripts/semer-guilde-hullsborg.mjs
//
// Alex, 22 septembre 2026 : « C'est Martin Paquette le chef. Il peut
// claim le groupe une fois qu'il se fait un compte. » Le groupe naît
// donc sans lui : sa ligne attend dans `membresFondateurs` avec
// `chef: true`, et la porte /rejoindre/{codeInvitation} lui rend le
// titre dès qu'il ouvre son compte (guildeRevendiquerProfil), sans
// qu'un courriel ait à être écrit d'avance. Même chemin que le clan
// Vestrvegir Vikingar en septembre.
//
// Le slug compte autant que le nom : `estDeHullsborg` (functions/index.js)
// ouvre le skin du hnefatafl aux membres d'un groupe dont l'identifiant
// est `hullsborg` ou dont le slug passe SLUG_HULLSBORG. Les deux sont
// vrais ici, et le script refuse d'écrire si la regex ne suit plus.
//
// Le script ne touche à rien si le groupe existe déjà : il se relance
// sans risque. Il passe par les droits d'administration du compte
// gcloud connecté, pas par les règles Firestore.

import path from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.resolve(ici, '..');
const PROJET = 'festivalmedieval';

const ID = 'hullsborg';
const NOM = 'Hird Hafn Hullsborg';
const FORME = 'troupe';
const SLUG = 'hirdhafnhullsborgtroupe';
const CHEF = 'Martin Paquette';
// Alex, fondateur technique du groupe le temps que Martin le revendique.
const UID_ALEX = '2lqW0drD7IhdhAY4qKqUZU7bSZ22';
const DESCRIPTION = 'La troupe Hird Hafn Hullsborg incarne les Vikings dans les règles de l’art, et elle revient au Festival médiéval de Montpellier année après année, avec son campement, ses armes et ses métiers. Le groupe se retrouve ici entre deux festivals, et ses membres y reçoivent le Plateau Futhark du hnefatafl, gravé pour eux.';

// La garde du skin, recopiée de functions/index.js.
const SLUG_HULLSBORG = /^(troupe)?(hirdhafn)?hull?sborg(guilde|clan|compagnie|confrerie|troupe|maisonnee|ordre)?$/;
if (!SLUG_HULLSBORG.test(SLUG)) {
  console.error(`Le slug « ${SLUG} » ne passe pas SLUG_HULLSBORG : le skin resterait payant pour la troupe.`);
  process.exit(1);
}

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
Firestore refuse de s'ouvrir : aucun identifiant sur cette machine.

Lance ceci une seule fois, puis relance le script :
  gcloud auth application-default login --project ${PROJET}
`);
  process.exit(1);
}

const requireFonctions = createRequire(path.join(racine, 'functions', 'package.json'));
const admin = requireFonctions('firebase-admin');
admin.initializeApp({ projectId: PROJET, credential: admin.credential.applicationDefault() });
const db = admin.firestore();

console.log(`Identifiants : ${source}`);

const ref = db.doc(`guildes/${ID}`);
if ((await ref.get()).exists) {
  console.log(`guildes/${ID} existe déjà : rien n’a été semé.`);
  process.exit(0);
}

// Un deuxième groupe au même slug volerait l'adresse au premier.
const doublon = await db.collection('guildes').where('slug', '==', SLUG).limit(1).get();
if (!doublon.empty) {
  console.error(`L’adresse ${SLUG} est déjà prise par guildes/${doublon.docs[0].id}.`);
  process.exit(1);
}

await ref.set({
  nom: NOM,
  description: DESCRIPTION,
  forme: FORME,
  slug: SLUG,
  creePar: UID_ALEX,
  admins: [],
  membres: [UID_ALEX],
  demandes: [],
  nbMembres: 1,
  membresFondateurs: [{ nom: CHEF, chef: true }],
  creeLe: admin.firestore.FieldValue.serverTimestamp(),
  maj: admin.firestore.FieldValue.serverTimestamp(),
});

console.log(`guildes/${ID} semé. La fonction guildeFondation pose la monnaie et le code d’invitation.`);

// Le code d'invitation arrive par le déclencheur : on le guette une
// dizaine de secondes pour l'afficher tout de suite.
let code = null;
for (let essai = 0; essai < 10 && !code; essai += 1) {
  await new Promise((r) => setTimeout(r, 1500));
  code = ((await ref.get()).data() || {}).codeInvitation || null;
}

if (code) {
  console.log(`\nCode d’invitation : ${code}`);
  console.log(`Lien pour ${CHEF} : https://festivalmedievaldemontpellier.org/rejoindre/${code}`);
} else {
  console.log('\nLe code d’invitation n’est pas encore posé. Relis la fiche dans une minute.');
}
process.exit(0);
