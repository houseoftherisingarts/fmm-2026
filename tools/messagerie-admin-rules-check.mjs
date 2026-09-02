// Vérifie contre l'émulateur les règles Firestore ajoutées pour la
// messagerie de l'équipe.
//
//   npx firebase emulators:exec --only firestore "node tools/messagerie-admin-rules-check.mjs"
//
// Ce que le script protège : un membre qui s'attribuerait tout seul une
// étiquette de groupe, un curieux qui lirait l'historique des envois du
// festival, une fausse trace d'envoi fabriquée à la main, et le message
// venu de l'admin, qui doit se lire comme un message ordinaire par son
// destinataire et par personne d'autre.

import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';

const ADMIN  = 'uid-maite';
const ANNE   = 'uid-anne';
const CLEM   = 'uid-clem';
const FESTIVAL = 'festival';
const FIL_ANNONCE = [FESTIVAL, ANNE].sort().join('__');

let reussis = 0;
const essais = [];
const essai = (nom, fn) => essais.push([nom, fn]);

const env = await initializeTestEnvironment({
  projectId: 'fmm-check-messagerie-admin',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

const equipe  = env.authenticatedContext(ADMIN, { email: 'm.fournel11@gmail.com' }).firestore();
const anne    = env.authenticatedContext(ANNE,  { email: 'anne@exemple.test' }).firestore();
const clem    = env.authenticatedContext(CLEM,  { email: 'clem@exemple.test' }).firestore();
const passant = env.unauthenticatedContext().firestore();

// Le décor : deux fiches, un catalogue d'étiquettes, une trace d'envoi,
// et le fil d'annonce que la Cloud Function écrit pour Anne.
await env.withSecurityRulesDisabled(async (libre) => {
  const d = libre.firestore();
  await setDoc(doc(d, 'membres', ANNE), { uid: ANNE, nom: 'Anne', roles: ['membre'], tags: ['viking'] });
  await setDoc(doc(d, 'membres', CLEM), { uid: CLEM, nom: 'Clem', roles: ['membre'] });
  await setDoc(doc(d, 'etiquettesOrdre', 'liste'), { tags: ['viking', 'pirate'] });
  await setDoc(doc(d, 'envoisMasse', 'envoi-1'), {
    parUid: ADMIN, parNom: 'Maïté', cible: 'Tout le registre',
    portee: 'tous', texte: 'Le montage commence vendredi.',
    destinataires: 2, faits: 2, statut: 'terminé',
  });
  await setDoc(doc(d, 'dms', FIL_ANNONCE), {
    participantUids: [FESTIVAL, ANNE].sort(),
    participantNames: { [FESTIVAL]: 'Le Festival Médiéval de Montpellier', [ANNE]: 'Anne' },
    participantHues: { [FESTIVAL]: 38, [ANNE]: 12 },
    annonce: true,
  });
  await setDoc(doc(d, 'dms', FIL_ANNONCE, 'messages', 'm1'), {
    senderUid: FESTIVAL, senderName: 'Le Festival Médiéval de Montpellier',
    body: 'Le montage commence vendredi.',
  });
});

// ── Les étiquettes de groupe ───────────────────────────────────────
essai('L’équipe colle une étiquette sur une fiche',
  () => assertSucceeds(setDoc(doc(equipe, 'membres', CLEM), { tags: ['pirate'] }, { merge: true })));
essai('Anne ne s’attribue pas une étiquette',
  () => assertFails(setDoc(doc(anne, 'membres', ANNE), { tags: ['administrateur'] }, { merge: true })));
essai('Anne ne colle rien sur la fiche de Clem',
  () => assertFails(setDoc(doc(anne, 'membres', CLEM), { tags: ['pirate'] }, { merge: true })));
essai('Anne modifie encore sa devise',
  () => assertSucceeds(setDoc(doc(anne, 'membres', ANNE), { devise: 'Toujours debout.' }, { merge: true })));

// ── La signature du dernier changement de fonctions ────────────────
// definirRoles (ordre.ts) écrit rolesPar / rolesParEmail / rolesLe, et
// la fiche du compte les affiche comme « dernier changement par X ».
// Une signature que le membre peut écrire lui-même ne vaut rien.
essai('L’équipe signe le changement de fonctions',
  () => assertSucceeds(setDoc(doc(equipe, 'membres', CLEM),
    { roles: ['membre', 'benevole'], rolesPar: ADMIN, rolesParEmail: 'm.fournel11@gmail.com' }, { merge: true })));
essai('Anne ne signe pas un changement à la place de l’équipe',
  () => assertFails(setDoc(doc(anne, 'membres', ANNE),
    { rolesParEmail: 'm.fournel11@gmail.com' }, { merge: true })));
essai('Une fiche neuve ne naît pas signée',
  () => assertFails(setDoc(doc(anne, 'membres', 'uid-neuf'), { uid: 'uid-neuf', rolesPar: ADMIN })));

// ── Le catalogue des étiquettes ────────────────────────────────────
essai('Anne lit le catalogue',
  () => assertSucceeds(getDoc(doc(anne, 'etiquettesOrdre', 'liste'))));
essai('Anne n’ajoute pas d’étiquette au catalogue',
  () => assertFails(setDoc(doc(anne, 'etiquettesOrdre', 'liste'), { tags: ['roi'] }, { merge: true })));
essai('L’équipe ajoute une étiquette au catalogue',
  () => assertSucceeds(setDoc(doc(equipe, 'etiquettesOrdre', 'liste'), { tags: ['viking', 'roi'] }, { merge: true })));
essai('Le passant ne lit pas le catalogue',
  () => assertFails(getDoc(doc(passant, 'etiquettesOrdre', 'liste'))));

// ── L'historique des envois ────────────────────────────────────────
essai('L’équipe lit l’historique',
  () => assertSucceeds(getDocs(collection(equipe, 'envoisMasse'))));
essai('Anne ne lit pas l’historique',
  () => assertFails(getDocs(collection(anne, 'envoisMasse'))));
essai('Le passant ne lit pas l’historique',
  () => assertFails(getDoc(doc(passant, 'envoisMasse', 'envoi-1'))));
essai('Personne ne fabrique une trace à la main, pas même l’équipe',
  () => assertFails(setDoc(doc(equipe, 'envoisMasse', 'faux'), { texte: 'jamais envoyé' })));

// ── Le message venu de l'admin ─────────────────────────────────────
essai('Anne lit le fil du festival qui lui est adressé',
  () => assertSucceeds(getDoc(doc(anne, 'dms', FIL_ANNONCE))));
essai('Anne lit le message du festival',
  () => assertSucceeds(getDocs(collection(anne, 'dms', FIL_ANNONCE, 'messages'))));
essai('Clem ne lit pas le fil du festival adressé à Anne',
  () => assertFails(getDoc(doc(clem, 'dms', FIL_ANNONCE))));
essai('L’équipe non plus ne lit pas ce fil depuis le navigateur',
  () => assertFails(getDoc(doc(equipe, 'dms', FIL_ANNONCE))));
essai('Le passant ne lit pas le fil du festival',
  () => assertFails(getDoc(doc(passant, 'dms', FIL_ANNONCE))));
essai('Anne marque le fil du festival comme lu',
  () => assertSucceeds(setDoc(doc(anne, 'dms', FIL_ANNONCE), { unread: { [ANNE]: 0 } }, { merge: true })));

for (const [nom, fn] of essais) {
  try { await fn(); reussis += 1; }
  catch (err) { console.log('KO', nom, '\n   ', String((err && err.message) || err)); }
}

await env.cleanup();
const total = essais.length;
console.log(reussis === total
  ? `OK règles messagerie admin (${total} vérifications)`
  : `${total - reussis} vérification(s) en échec sur ${total}`);
process.exit(reussis === total ? 0 : 1);
