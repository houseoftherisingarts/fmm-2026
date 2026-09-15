// Vérifie les règles Firestore du module Animations contre l'émulateur.
//
//   npx firebase emulators:exec --only firestore "node scripts/check-animations.mjs"
//
// Ce que le script protège. Une fiche d'animation porte un cachet, un
// remboursement de transport et le numéro de téléphone d'une troupe :
// personne d'autre que la programmation n'a d'affaire à la lire. La
// candidature, elle, doit pouvoir s'écrire sans compte, sinon une
// troupe qui découvre le festival se heurte à une porte fermée; mais
// cette ouverture-là est exactement le genre de porte par où entrent
// les documents-spam, donc la forme du document est bornée au mot près.
// Et comme Tristan tient la programmation sans figurer dans la liste de
// courriels de l'équipe, son rôle doit lui ouvrir l'horaire : c'est le
// dernier bloc du fichier qui le prouve.

import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, addDoc, collection, updateDoc,
} from 'firebase/firestore';

const TRISTAN  = 'uid-tristan';
const BENEVOLE = 'uid-benevole';
const VISITEUR = 'uid-visiteur';

let reussis = 0;
const essais = [];
const essai = (nom, fn) => essais.push([nom, fn]);

const env = await initializeTestEnvironment({
  projectId: 'fmm-check-animations',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

// Le décor : deux rôles accordés, une fiche d'animation et un horaire.
await env.withSecurityRulesDisabled(async (libre) => {
  const d = libre.firestore();
  await setDoc(doc(d, 'adminRoles', 'tristan@exemple.test'),  { email: 'tristan@exemple.test',  role: 'organisateur' });
  await setDoc(doc(d, 'adminRoles', 'benevole@exemple.test'), { email: 'benevole@exemple.test', role: 'benevole' });
  await setDoc(doc(d, 'animations', 'a1'), { nom: 'Troupe essai', cachet: 1200, courriel: 'troupe@exemple.test' });
  await setDoc(doc(d, 'schedule', '2026'), { year: 2026, days: [] });
  await setDoc(doc(d, 'candidaturesAnimation', 'c1'), {
    nom: 'Les Saltimbanques', contactNom: 'Jeanne', courriel: 'jeanne@exemple.test',
    description: 'Nous jonglons avec des torches depuis douze ans.', lang: 'FR', annee: 2026, statut: 'nouvelle',
  });
});

const tristan  = env.authenticatedContext(TRISTAN,  { email: 'tristan@exemple.test'  }).firestore();
const benevole = env.authenticatedContext(BENEVOLE, { email: 'benevole@exemple.test' }).firestore();
const visiteur = env.authenticatedContext(VISITEUR, { email: 'visiteur@exemple.test' }).firestore();
const passant  = env.unauthenticatedContext().firestore();

const CANDIDATURE = {
  nom: 'Hird Hafn', type: 'troupe', contactNom: 'Sigrid', courriel: 'sigrid@exemple.test',
  telephone: '514-555-0199', description: 'Un campement viking qui tient trois jours, forge comprise.',
  jours: ['samedi'], hebergement: true, dejaVenu: false, lang: 'FR', annee: 2026, statut: 'nouvelle',
};

// ── La candidature s'écrit sans compte ───────────────────────────────
essai('un passant dépose une candidature bien formée', () =>
  assertSucceeds(addDoc(collection(passant, 'candidaturesAnimation'), { ...CANDIDATURE })));

essai('une personne connectée dépose la sienne avec son uid', () =>
  assertSucceeds(addDoc(collection(visiteur, 'candidaturesAnimation'), { ...CANDIDATURE, uid: VISITEUR })));

// ── Et la porte ouverte reste étroite ────────────────────────────────
essai('un champ inventé fait refuser le dépôt', () =>
  assertFails(addDoc(collection(passant, 'candidaturesAnimation'), { ...CANDIDATURE, roleAdmin: 'super' })));

essai('une candidature qui s’auto-déclare importée est refusée', () =>
  assertFails(addDoc(collection(passant, 'candidaturesAnimation'), { ...CANDIDATURE, statut: 'importee' })));

essai('un courriel qui n’en est pas un fait refuser le dépôt', () =>
  assertFails(addDoc(collection(passant, 'candidaturesAnimation'), { ...CANDIDATURE, courriel: 'pas-un-courriel' })));

essai('une description sans fin est refusée', () =>
  assertFails(addDoc(collection(passant, 'candidaturesAnimation'), { ...CANDIDATURE, description: 'x'.repeat(4001) })));

essai('personne ne dépose une candidature au nom d’un autre compte', () =>
  assertFails(addDoc(collection(visiteur, 'candidaturesAnimation'), { ...CANDIDATURE, uid: TRISTAN })));

essai('le passant ne relit pas les candidatures déposées', () =>
  assertFails(getDoc(doc(passant, 'candidaturesAnimation', 'c1'))));

essai('un membre ordinaire ne relit pas les candidatures', () =>
  assertFails(getDoc(doc(visiteur, 'candidaturesAnimation', 'c1'))));

// ── Les fiches d'animation restent à la programmation ────────────────
essai('le passant ne lit aucune fiche d’animation', () =>
  assertFails(getDoc(doc(passant, 'animations', 'a1'))));

essai('un membre ordinaire ne lit aucune fiche d’animation', () =>
  assertFails(getDoc(doc(visiteur, 'animations', 'a1'))));

essai('un bénévole à qui on a donné ce rôle-là n’y entre pas non plus', () =>
  assertFails(getDoc(doc(benevole, 'animations', 'a1'))));

essai('un bénévole n’écrit pas dans une fiche d’animation', () =>
  assertFails(setDoc(doc(benevole, 'animations', 'a2'), { nom: 'Fiche pirate' })));

essai('Tristan lit la fiche', () =>
  assertSucceeds(getDoc(doc(tristan, 'animations', 'a1'))));

essai('Tristan écrit une nouvelle fiche', () =>
  assertSucceeds(setDoc(doc(tristan, 'animations', 'a2'), { nom: 'Troupe Hullsborg', statut: 'piste' })));

essai('Tristan marque une candidature comme importée', () =>
  assertSucceeds(updateDoc(doc(tristan, 'candidaturesAnimation', 'c1'), { statut: 'importee', animationId: 'a2' })));

// ── L'horaire, que le bouton « Publier » écrit ───────────────────────
essai('Tristan publie à l’horaire', () =>
  assertSucceeds(setDoc(doc(tristan, 'schedule', '2026'), { year: 2026, days: [] }, { merge: true })));

essai('un bénévole ne touche pas à l’horaire', () =>
  assertFails(setDoc(doc(benevole, 'schedule', '2026'), { year: 2026, days: [] }, { merge: true })));

essai('un passant ne touche pas à l’horaire', () =>
  assertFails(setDoc(doc(passant, 'schedule', '2026'), { year: 2026, days: [] }, { merge: true })));

essai('l’horaire, lui, se lit sans compte', () =>
  assertSucceeds(getDoc(doc(passant, 'schedule', '2026'))));

for (const [nom, fn] of essais) {
  try {
    await fn();
    reussis += 1;
    console.log(`  ✓ ${nom}`);
  } catch (e) {
    console.error(`  ✗ ${nom}\n    ${e.message}`);
  }
}

await env.cleanup();
console.log(`\n${reussis}/${essais.length} vérifications passées.`);
process.exit(reussis === essais.length ? 0 : 1);
