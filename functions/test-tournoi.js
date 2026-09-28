/**
 * Auto-vérification du tableau du tournoi (functions/tournoi.js) :
 * `node functions/test-tournoi.js` sort à zéro quand tout tient.
 * Vérifié : le nombre de rondes, les exemptions jamais face à face, le
 * bon nombre de matchs, et l'appariement 2k/2k+1 de la ronde suivante.
 */
const assert = require('assert');
const { nombreDeRondes, premiereRonde, rondeSuivante, echeancesRondes } = require('./tournoi').tableau;

assert.strictEqual(nombreDeRondes(2), 1);
assert.strictEqual(nombreDeRondes(5), 3);
assert.strictEqual(nombreDeRondes(8), 3);
assert.strictEqual(nombreDeRondes(9), 4);

for (const n of [2, 3, 5, 6, 8, 11, 16]) {
  const joueurs = Array.from({ length: n }, (_, i) => `j${i}`);
  const r1 = premiereRonde(joueurs);
  const places = 2 ** nombreDeRondes(n);
  assert.strictEqual(r1.length, places / 2, `n=${n} : ${places / 2} matchs attendus`);
  const exemptions = r1.filter((m) => m.joueurs[1] === null).length;
  assert.strictEqual(exemptions, places - n, `n=${n} : ${places - n} exemptions`);
  assert.ok(r1.every((m) => m.joueurs[0] !== null), 'jamais un match sans premier joueur');
  const tous = r1.flatMap((m) => m.joueurs).filter(Boolean).sort();
  assert.deepStrictEqual(tous, [...joueurs].sort(), 'chaque inscrit joue une fois');
}

// La ronde suivante : les vainqueurs de 0 et 1 se rencontrent en 0, etc.
const finis = [
  { ordre: 3, gagnant: 'd' }, { ordre: 0, gagnant: 'a' },
  { ordre: 2, gagnant: 'c' }, { ordre: 1, gagnant: 'b' },
];
assert.deepStrictEqual(rondeSuivante(finis), [
  { ordre: 0, joueurs: ['a', 'b'] },
  { ordre: 1, joueurs: ['c', 'd'] },
]);

// Les échéances : trois rondes sur une semaine, la dernière tombe pile à la fin.
const semaine = 7 * 24 * 60 * 60 * 1000;
const ech = echeancesRondes(0, semaine, 3);
assert.strictEqual(ech.length, 3);
assert.strictEqual(ech[2], semaine, 'la finale finit avec la semaine');
assert.ok(ech[0] < ech[1] && ech[1] < ech[2], 'les échéances montent');
assert.strictEqual(echeancesRondes(100, 50, 2)[1], 100, 'une fin déjà passée ne recule jamais');

console.log('tournoi : tout tient');
