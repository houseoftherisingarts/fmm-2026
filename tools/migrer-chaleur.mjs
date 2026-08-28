// ─── La chaleur, versée sur les billets déjà en ligne ────────────────
// Alex, 2026-08-28 : suivreLeMur() trie maintenant sur `chaleur` plutôt
// que sur `creeLe`. Un billet posté avant ce jour n'a pas ce champ, et
// une requête `orderBy('chaleur')` exclut purement et simplement les
// documents qui ne le portent pas : sans cet outil, tout l'historique
// du mur disparaîtrait du fil.
//
//   node tools/migrer-chaleur.mjs            (écrit)
//   node tools/migrer-chaleur.mjs --essai    (affiche, n'écrit rien)
//
// Pose pour/contre/score/nbCommentaires à 0 et calcule la chaleur à
// partir de creeLe, sur chaque billet de la collection `mur` qui n'a
// pas encore de champ `chaleur`. Rejouable sans dégât : un billet déjà
// migré (chaleur présente) est simplement sauté.
//
// Formule JUMELLE de calculerChaleur() dans src/firebase/mur.ts et
// functions/index.js : si l'une des trois change, les deux autres
// doivent suivre.

import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..');
const PROJET = 'festivalmedieval';
const DEMI_VIE_CHALEUR = 45_000;

function calculerChaleur(score, creeLeMs) {
  const secondes = creeLeMs / 1000;
  return Math.log10(Math.max(Math.abs(score), 1)) * Math.sign(score) + secondes / DEMI_VIE_CHALEUR;
}

// ── Les identifiants ────────────────────────────────────────────────
// Ce que gcloud a déjà déposé sur cette machine suffit.
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

const essai = process.argv.includes('--essai');

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

const snap = await db.collection('mur').get();
const aMigrer = snap.docs.filter((d) => typeof d.data().chaleur !== 'number');

console.log(`${snap.size} billet(s) sur le mur, ${aMigrer.length} à migrer (${snap.size - aMigrer.length} déjà fait).`);

if (aMigrer.length === 0) {
  console.log('Rien à faire.');
  process.exit(0);
}

if (essai) {
  for (const d of aMigrer.slice(0, 10)) {
    const creeLeMs = d.data().creeLe?.toMillis ? d.data().creeLe.toMillis() : Date.now();
    console.log(`  ${d.id}  chaleur=${calculerChaleur(0, creeLeMs).toFixed(4)}`);
  }
  if (aMigrer.length > 10) console.log(`  … et ${aMigrer.length - 10} autre(s).`);
  console.log('Essai : rien n’a été écrit.');
  process.exit(0);
}

// Lots de 500 (limite d'un batch Firestore).
for (let i = 0; i < aMigrer.length; i += 500) {
  const lot = aMigrer.slice(i, i + 500);
  const batch = db.batch();
  for (const d of lot) {
    const creeLeMs = d.data().creeLe?.toMillis ? d.data().creeLe.toMillis() : Date.now();
    batch.set(d.ref, {
      pour: 0, contre: 0, score: 0, nbCommentaires: 0,
      chaleur: calculerChaleur(0, creeLeMs),
    }, { merge: true });
  }
  await batch.commit();
  console.log(`  ${Math.min(i + 500, aMigrer.length)}/${aMigrer.length} écrits.`);
}

console.log('Migration terminée.');
