// Vérifie les règles Firestore de la messagerie contre l'émulateur.
//
//   npx firebase emulators:exec --only firestore "node scripts/check-messagerie.mjs"
//
// Ce que le script protège : une conversation privée qui fuirait vers
// un tiers, un message signé du nom de quelqu'un d'autre, un mot du
// salon réécrit ou effacé par un inconnu, et le blocage qui doit
// vraiment arrêter l'envoi. Le festival accueille des mineurs, donc
// ces quatre points ne peuvent pas reposer sur le navigateur seul.

import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, addDoc, collection, deleteDoc, updateDoc, getDocs,
} from 'firebase/firestore';

const ANNE = 'uid-anne';
const BRAN = 'uid-bran';
const CLEM = 'uid-clem';
const FIL  = [ANNE, BRAN].sort().join('__');

let reussis = 0;
const essais = [];
const essai = (nom, fn) => essais.push([nom, fn]);

const env = await initializeTestEnvironment({
  projectId: 'fmm-check-messagerie',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

const anne = env.authenticatedContext(ANNE, { email: 'anne@exemple.test' }).firestore();
const bran = env.authenticatedContext(BRAN, { email: 'bran@exemple.test' }).firestore();
const clem = env.authenticatedContext(CLEM, { email: 'clem@exemple.test' }).firestore();
const passant = env.unauthenticatedContext().firestore();

// Le décor : un fil entre Anne et Bran, et un mot d'Anne au salon.
await env.withSecurityRulesDisabled(async (libre) => {
  const d = libre.firestore();
  await setDoc(doc(d, 'dms', FIL), {
    participantUids: [ANNE, BRAN].sort(),
    participantNames: { [ANNE]: 'Anne', [BRAN]: 'Bran' },
    participantHues: { [ANNE]: 12, [BRAN]: 200 },
  });
  await setDoc(doc(d, 'dms', FIL, 'messages', 'm1'), {
    senderUid: ANNE, senderName: 'Anne', body: 'Bonsoir Bran.',
  });
  await setDoc(doc(d, 'salonOrdre', 'mot-anne'), {
    uid: ANNE, nom: 'Anne', texte: 'La salle est ouverte.',
  });
});

// ── Les messages privés ────────────────────────────────────────────
essai('Bran lit le fil qui le concerne', () => assertSucceeds(getDoc(doc(bran, 'dms', FIL))));
essai('Clem ne lit pas le fil des autres', () => assertFails(getDoc(doc(clem, 'dms', FIL))));
essai('Clem ne lit pas les messages des autres',
  () => assertFails(getDocs(collection(clem, 'dms', FIL, 'messages'))));
essai('Le passant ne lit rien', () => assertFails(getDoc(doc(passant, 'dms', FIL))));

essai('Bran répond dans son fil', () => assertSucceeds(
  addDoc(collection(bran, 'dms', FIL, 'messages'), { senderUid: BRAN, senderName: 'Bran', body: 'Bonsoir.' })));
essai('Bran ne signe pas du nom d’Anne', () => assertFails(
  addDoc(collection(bran, 'dms', FIL, 'messages'), { senderUid: ANNE, senderName: 'Anne', body: 'Faux.' })));
essai('Clem ne se glisse pas dans le fil', () => assertFails(
  addDoc(collection(clem, 'dms', FIL, 'messages'), { senderUid: CLEM, senderName: 'Clem', body: 'Coucou.' })));
essai('Un message de plus de 2000 caractères est refusé', () => assertFails(
  addDoc(collection(bran, 'dms', FIL, 'messages'), { senderUid: BRAN, senderName: 'Bran', body: 'a'.repeat(2001) })));
essai('Un message vide est refusé', () => assertFails(
  addDoc(collection(bran, 'dms', FIL, 'messages'), { senderUid: BRAN, senderName: 'Bran', body: '' })));
essai('Personne ne réécrit le message d’un autre', () => assertFails(
  updateDoc(doc(bran, 'dms', FIL, 'messages', 'm1'), { body: 'Réécrit.' })));
essai('Personne n’efface le message d’un autre', () => assertFails(
  deleteDoc(doc(bran, 'dms', FIL, 'messages', 'm1'))));
essai('Bran ne remplace pas les participants du fil', () => assertFails(
  updateDoc(doc(bran, 'dms', FIL), { participantUids: [BRAN, CLEM].sort() })));

// ── Le blocage ─────────────────────────────────────────────────────
essai('Anne tient sa propre liste de silences', () => assertSucceeds(
  setDoc(doc(anne, 'blocages', ANNE), { uids: [CLEM] })));
essai('Bran ne lit pas la liste d’Anne', () => assertFails(getDoc(doc(bran, 'blocages', ANNE))));
essai('Bran n’écrit pas dans la liste d’Anne', () => assertFails(
  setDoc(doc(bran, 'blocages', ANNE), { uids: [] })));
essai('Clem, bloqué par Anne, ne peut plus ouvrir de fil vers elle', () => assertFails(
  setDoc(doc(clem, 'dms', [ANNE, CLEM].sort().join('__')), {
    participantUids: [ANNE, CLEM].sort(),
    participantNames: { [ANNE]: 'Anne', [CLEM]: 'Clem' },
    participantHues: { [ANNE]: 12, [CLEM]: 90 },
  })));
essai('Bran, qui n’est pas bloqué, ouvre bien un fil vers Clem', () => assertSucceeds(
  setDoc(doc(bran, 'dms', [BRAN, CLEM].sort().join('__')), {
    participantUids: [BRAN, CLEM].sort(),
    participantNames: { [BRAN]: 'Bran', [CLEM]: 'Clem' },
    participantHues: { [BRAN]: 200, [CLEM]: 90 },
  })));

// ── Le salon public ────────────────────────────────────────────────
essai('Tout membre connecté lit le salon', () => assertSucceeds(getDocs(collection(clem, 'salonOrdre'))));
essai('Le passant ne lit pas le salon', () => assertFails(getDocs(collection(passant, 'salonOrdre'))));
essai('Bran parle en son nom', () => assertSucceeds(
  addDoc(collection(bran, 'salonOrdre'), { uid: BRAN, nom: 'Bran', texte: 'Présent.' })));
essai('Bran ne parle pas au nom d’Anne', () => assertFails(
  addDoc(collection(bran, 'salonOrdre'), { uid: ANNE, nom: 'Anne', texte: 'Faux.' })));
essai('Un mot de plus de 2000 caractères est refusé', () => assertFails(
  addDoc(collection(bran, 'salonOrdre'), { uid: BRAN, nom: 'Bran', texte: 'a'.repeat(2001) })));
essai('Personne ne réécrit le mot d’un autre', () => assertFails(
  updateDoc(doc(bran, 'salonOrdre', 'mot-anne'), { texte: 'Détourné.' })));
essai('Personne n’efface le mot d’un autre', () => assertFails(
  deleteDoc(doc(bran, 'salonOrdre', 'mot-anne'))));
essai('Anne retire son propre mot', () => assertSucceeds(
  deleteDoc(doc(anne, 'salonOrdre', 'mot-anne'))));

// ── Les signalements ───────────────────────────────────────────────
essai('Bran signale en son nom', () => assertSucceeds(
  addDoc(collection(bran, 'signalements'), {
    parUid: BRAN, parNom: 'Bran', contreUid: CLEM, contreNom: 'Clem',
    texte: 'Propos déplacés.', lieu: 'salon', reference: 'mot-x',
  })));
essai('Bran ne signale pas au nom d’un autre', () => assertFails(
  addDoc(collection(bran, 'signalements'), {
    parUid: ANNE, parNom: 'Anne', contreUid: CLEM, contreNom: 'Clem',
    texte: 'Faux.', lieu: 'salon', reference: 'mot-x',
  })));
essai('Un membre ne relit pas les signalements', () => assertFails(
  getDocs(collection(bran, 'signalements'))));

for (const [nom, fn] of essais) {
  try { await fn(); reussis++; console.log(`  ok   ${nom}`); }
  catch (err) { console.error(`  ÉCHEC ${nom}\n        ${err.message}`); }
}

await env.cleanup();
console.log(`\n${reussis}/${essais.length} vérifications passées.`);
process.exit(reussis === essais.length ? 0 : 1);
