// Vérifie contre l'émulateur la porte de la Cuisine, posée le
// 15 septembre 2026 à la demande d'Alex : personne d'autre que lui,
// Marc-Alexis, Arno, Tristan et Jesse n'entre dans le coin Nourriture
// et Bar.
//
//   npx firebase emulators:exec --only firestore "node tools/cuisine-rules-check.mjs"
//
// Ce que le script protège : le bar et les tâches du Village, qui
// s'ouvraient à toute l'équipe et se fermaient à Marc-Alexis malgré son
// rôle Cuisine, et l'inventaire du container, qui s'ouvrait à n'importe
// quel porteur de rôle, bénévole compris.

import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const COLLECTIONS = ['bar', 'inventaire', 'tachesVillage', 'livraisonsKiosque'];

let reussis = 0;
const essais = [];
const essai = (nom, fn) => essais.push([nom, fn]);

const env = await initializeTestEnvironment({
  projectId: 'fmm-check-cuisine',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

const comme = (uid, email) => env.authenticatedContext(uid, { email }).firestore();
const alex        = comme('uid-alex',  'houseoftherisingarts@gmail.com');
const marcAlexis  = comme('uid-marc',  'marcalexispepin@gmail.com');
const jesse       = comme('uid-jesse', 'jesse.dippy@gmail.com');
const maite       = comme('uid-maite', 'benevoles.medievalmontpellier@gmail.com');
const benevole    = comme('uid-ben',   'benevole@exemple.test');
const passant     = env.unauthenticatedContext().firestore();

// Le décor : une fiche dans chaque collection de la Cuisine, et un rôle
// de bénévole ordinaire, celui qui ouvrait l'inventaire avant ce jour.
await env.withSecurityRulesDisabled(async (libre) => {
  const d = libre.firestore();
  for (const col of COLLECTIONS) await setDoc(doc(d, col, 'etat'), { seme: true });
  await setDoc(doc(d, 'adminRoles', 'benevole@exemple.test'), { email: 'benevole@exemple.test', role: 'benevole' });
});

for (const col of COLLECTIONS) {
  essai(`Alex lit ${col}`,            () => assertSucceeds(getDoc(doc(alex, col, 'etat'))));
  essai(`Marc-Alexis écrit ${col}`,   () => assertSucceeds(setDoc(doc(marcAlexis, col, 'etat'), { touche: 1 }, { merge: true })));
  essai(`Jesse écrit ${col}`,         () => assertSucceeds(setDoc(doc(jesse, col, 'etat'), { touche: 2 }, { merge: true })));
  essai(`Maïté n’entre pas dans ${col}`,  () => assertFails(getDoc(doc(maite, col, 'etat'))));
  essai(`Un bénévole n’entre pas dans ${col}`, () => assertFails(getDoc(doc(benevole, col, 'etat'))));
  essai(`Le passant n’entre pas dans ${col}`,  () => assertFails(getDoc(doc(passant, col, 'etat'))));
}

// Maïté garde tout le reste : la Cuisine se referme sans rien lui
// enlever de son propre monde, les bénévoles.
essai('Maïté lit toujours les bénévoles',
  () => assertSucceeds(getDoc(doc(maite, 'benevoles', 'uid-quelconque'))));

for (const [nom, fn] of essais) {
  try { await fn(); reussis += 1; }
  catch (err) { console.log('KO', nom, '\n   ', String((err && err.message) || err)); }
}

await env.cleanup();
const total = essais.length;
console.log(reussis === total
  ? `OK porte de la Cuisine (${total} vérifications)`
  : `${total - reussis} vérification(s) en échec sur ${total}`);
process.exit(reussis === total ? 0 : 1);
