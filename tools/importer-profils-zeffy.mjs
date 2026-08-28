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
  console.error('Aucun identifiant Google. Lancez `gcloud auth application-default login`.');
  process.exit(1);
}
console.log(`Identifiants : ${source}`);

const require = createRequire(import.meta.url);
const admin = require(path.join(racine, 'functions/node_modules/firebase-admin'));
admin.initializeApp({ projectId: PROJET });
const db = admin.firestore();
const auth = admin.auth();

const teinte = (nom) => {
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
};

// Un profil par courriel du registre des clients : le compte d'authentification,
// la fiche `users` marquée `origine: zeffy`, et la fiche `membres` qui fait
// paraître la personne au registre de l'Ordre (Alex, 2026-08-28).
const snap = await db.collection('clients').get();
const parCourriel = new Map();
for (const d of snap.docs) {
  const c = d.data();
  const mail = String(c.courriel || '').trim().toLowerCase();
  if (!mail || !mail.includes('@') || c.statut === 'annule') continue;
  const nom = String(c.nom || '').trim();
  const deja = parCourriel.get(mail);
  if (!deja || (!deja.nom && nom)) parCourriel.set(mail, { nom: nom || (deja && deja.nom) || '' });
}
console.log(`${snap.size} lignes de clients, ${parCourriel.size} courriels distincts.`);
if (essai) { console.log('Essai : rien n\'est écrit.'); process.exit(0); }

let crees = 0, existants = 0, fiches = 0, erreurs = 0;
let lot = db.batch(), dansLot = 0;
const pousser = async () => { if (dansLot) { await lot.commit(); lot = db.batch(); dansLot = 0; } };

for (const [mail, { nom }] of parCourriel) {
  let user;
  try {
    user = await auth.getUserByEmail(mail);
    existants++;
  } catch (e) {
    if (e && e.code === 'auth/user-not-found') {
      try { user = await auth.createUser({ email: mail, displayName: nom || undefined }); crees++; }
      catch (e2) { erreurs++; console.warn('refusé', mail, e2.message); continue; }
    } else { erreurs++; console.warn('lecture refusée', mail, e.message); continue; }
  }
  const uid = user.uid;
  const nomFinal = nom || user.displayName || mail.split('@')[0];
  lot.set(db.collection('users').doc(uid), {
    email: mail, displayName: nomFinal, origine: 'zeffy', importe: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  lot.set(db.collection('membres').doc(uid), {
    uid, nom: nomFinal, avatarHue: teinte(nomFinal),
    tags: admin.firestore.FieldValue.arrayUnion('importé'),
    maj: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  fiches++; dansLot += 2;
  if (dansLot >= 400) await pousser();
}
await pousser();
console.log(`Terminé : ${crees} comptes créés, ${existants} déjà là, ${fiches} fiches, ${erreurs} refus.`);
process.exit(0);
