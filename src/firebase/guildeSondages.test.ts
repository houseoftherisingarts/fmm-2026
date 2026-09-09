// ─── Le banc d'essai des sondages ────────────────────────────────────
// Même patron que guildeMonnaie.test.ts : pas de cadre de test, un
// fichier qui s'exécute et des assertions.
//
//   npx esbuild src/firebase/guildeSondages.test.ts --bundle --platform=browser \
//     --format=esm --external:node:assert --define:import.meta.env='{}' \
//     --outfile=/tmp/guilde-sondages.mjs && node /tmp/guilde-sondages.mjs

import assert from 'node:assert/strict';
import { depouiller } from './guildeSondages';

let essais = 0;
const essai = (nom: string, fn: () => void) => { fn(); essais += 1; console.log(`  ✓ ${nom}`); };

essai('trois voix sur deux réponses donnent 67 et 33', () => {
  const r = depouiller({ options: ['Oui', 'Non'], votes: { a: 0, b: 0, c: 1 } });
  assert.deepEqual(r.comptes, [2, 1]);
  assert.equal(r.total, 3);
  assert.deepEqual(r.parts, [67, 33]);
});

essai('sans voix, tout vaut zéro', () => {
  const r = depouiller({ options: ['Oui', 'Non', 'Peut-être'], votes: {} });
  assert.deepEqual(r.comptes, [0, 0, 0]);
  assert.deepEqual(r.parts, [0, 0, 0]);
});

essai('un index hors des réponses ne compte pas', () => {
  const r = depouiller({ options: ['Oui', 'Non'], votes: { a: 7, b: -1, c: 1 } });
  assert.deepEqual(r.comptes, [0, 1]);
  assert.equal(r.total, 1);
});

console.log(`${essais} essais, tout tient.`);
