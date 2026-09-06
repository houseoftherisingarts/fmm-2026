// ─── Le banc d'essai du bureau de change ────────────────────────────
// Même patron que guildeMonnaie.test.ts : pas de cadre de test, un
// fichier qui s'exécute et des assertions.
//
//   npx esbuild src/firebase/guildeChange.test.ts --bundle --platform=browser \
//     --format=esm --external:node:assert --define:import.meta.env='{}' \
//     --outfile=/tmp/guilde-change.mjs && node /tmp/guilde-change.mjs
//
// Il couvre l'arithmétique du change croisé, la seule chose ici qui
// ment à l'écran si elle dérive de celle du serveur.

import assert from 'node:assert/strict';
import { apercuChangeCroise, tauxCroise, tauxDe, valeurTresorDe } from './guildeChange';

let essais = 0;
const essai = (nom: string, fn: () => void) => { fn(); essais += 1; console.log(`  ✓ ${nom}`); };

essai('le taux croisé est taux_A / taux_B, à trois décimales', () => {
  assert.equal(tauxCroise(1, 0.5), 2);
  assert.equal(tauxCroise(0.5, 1), 0.5);
  assert.equal(tauxCroise(0.7, 0.9), 0.778);
  assert.equal(tauxCroise(1, 0), 0);
});

essai('cent pièces de A à 0,5 vers B à 1 : 5 de frais, 47 M, 47 B', () => {
  // 100 - 5 = 95 pièces A × 0,5 = 47,5 M → 47 M → 47 B à parité.
  assert.deepEqual(apercuChangeCroise(100, 0.5, 1), { frais: 5, montpellois: 47, recu: 47 });
});

essai('chaque marche arrondit vers le bas', () => {
  // 10 pièces : frais round(0,5) = 1 (à l'arrondi de JS), 9 × 0,5 = 4 M, 4 / 0,7 = 5,71 → 5.
  assert.deepEqual(apercuChangeCroise(10, 0.5, 0.7), { frais: 1, montpellois: 4, recu: 5 });
});

essai('le transfert de trésor ne paie pas de frais', () => {
  assert.deepEqual(apercuChangeCroise(100, 0.5, 1, true), { frais: 0, montpellois: 50, recu: 50 });
});

essai('un montant nul ou négatif ne rapporte rien', () => {
  assert.deepEqual(apercuChangeCroise(0, 1, 1), { frais: 0, montpellois: 0, recu: 0 });
  assert.deepEqual(apercuChangeCroise(-4, 1, 1), { frais: 0, montpellois: 0, recu: 0 });
});

essai('le cours et la valeur du trésor se replient sur la formule', () => {
  assert.equal(tauxDe({ taux: 1.25 }), 1.25);
  assert.equal(tauxDe({ nbActifs: 40 }), 1);
  assert.equal(valeurTresorDe({ valeurTresorM: 12 }), 12);
  assert.equal(valeurTresorDe({ tresor: 33, taux: 0.5 }), 16);
});

console.log(`\n${essais} essais, tous passés.`);
