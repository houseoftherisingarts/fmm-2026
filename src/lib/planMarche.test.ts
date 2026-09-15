// ─── Le banc d'essai du plan du marché ───────────────────────────────
// Même patron que guildeChange.test.ts : pas de cadre de test, un
// fichier qui s'exécute et des assertions.
//
//   npx esbuild src/lib/planMarche.test.ts --bundle --platform=node \
//     --format=esm --external:node:assert --outfile=/tmp/plan-marche.mjs \
//     && node /tmp/plan-marche.mjs
//
// Il couvre la seule chose qui ferait du tort à Jesse si elle dérivait :
// un marchand ne se tient jamais sur deux kiosques, et un échange par
// glisser ne perd jamais personne.

import assert from 'node:assert/strict';
import {
  planParDefaut, assigner, echanger, liberer, kiosqueDe, ajouterKiosque,
  retirerDernierKiosque, retirerRangee, placerSurCarte, kiosquesDeRangee,
  prixAffiche, codeKiosque, compterPremium, normaliserKiosque, modifierKiosque,
} from './planMarche';

const plan = planParDefaut(2026);
assert.equal(plan.rangees.length, 3);
assert.equal(plan.kiosques.length, 24);
assert.equal(plan.kiosques[0].code, 'R1-01');
assert.equal(codeKiosque(2, 12), 'R3-12');

// Poser un marchand, puis le déplacer : il quitte le premier kiosque.
let p = assigner(plan, 'r1-1', 'lea');
assert.equal(kiosqueDe(p, 'lea')?.id, 'r1-1');
p = assigner(p, 'r2-3', 'lea');
assert.equal(kiosqueDe(p, 'lea')?.id, 'r2-3');
assert.equal(p.kiosques.filter((k) => k.vendorUid === 'lea').length, 1);

// Glisser sur un kiosque occupé : l'occupant prend la place laissée.
p = assigner(p, 'r1-1', 'tristan');
p = assigner(p, 'r1-1', 'lea');
assert.equal(kiosqueDe(p, 'lea')?.id, 'r1-1');
assert.equal(kiosqueDe(p, 'tristan')?.id, 'r2-3');

// Un marchand sans kiosque qui prend une place occupée : l'autre sort.
p = assigner(p, 'r1-1', 'oceane');
assert.equal(kiosqueDe(p, 'oceane')?.id, 'r1-1');
assert.equal(kiosqueDe(p, 'lea'), null);

// Échange direct de deux kiosques, dont un vide.
p = echanger(p, 'r1-1', 'r3-8');
assert.equal(kiosqueDe(p, 'oceane')?.id, 'r3-8');
assert.equal(p.kiosques.find((k) => k.id === 'r1-1')?.vendorUid, null);
assert.equal(echanger(p, 'r1-1', 'r1-1'), p);

// Libérer, puis retirer : un kiosque occupé ne se retire pas.
p = liberer(p, 'r3-8');
assert.equal(kiosqueDe(p, 'oceane'), null);
p = assigner(p, 'r3-8', 'oceane');
assert.equal(retirerDernierKiosque(p, 'r3').kiosques.length, 24);
p = liberer(p, 'r3-8');
assert.equal(retirerDernierKiosque(p, 'r3').kiosques.length, 23);
assert.equal(ajouterKiosque(p, 'r1').kiosques.length, 25);
assert.equal(kiosquesDeRangee(ajouterKiosque(p, 'r1'), 'r1').at(-1)?.code, 'R1-09');

// Une rangée occupée ne se retire pas ; vidée, elle part avec ses kiosques.
p = assigner(p, 'r2-1', 'tristan');
assert.equal(retirerRangee(p, 'r2').rangees.length, 3);
p = liberer(p, 'r2-1');
assert.equal(retirerRangee(p, 'r2').kiosques.length, 16);

// Position sur la carte : bornée à 0–100, une décimale.
const pose = placerSurCarte(p, 'r1-1', 133.333, -4);
const k = pose.kiosques.find((x) => x.id === 'r1-1')!;
assert.deepEqual([k.x, k.y], [100, 0]);
assert.equal(placerSurCarte(p, 'r1-1', 12.345, 6.78).kiosques[0].x, 12.3);

assert.equal(prixAffiche(15000, 'FR'), '150 $');
assert.equal(prixAffiche(15050, 'EN'), '$150.50');
assert.equal(prixAffiche(undefined, 'FR'), 'Prix à venir');

// ── Le premium, choisi kiosque par kiosque ───────────────────────────
// Ce que le banc protège : le repère suit le kiosque et non le marchand,
// donc un échange de places ne l'emporte pas avec lui, et un document
// écrit avant le 15 septembre 2026 se relit sans `undefined` qui traîne.
let q = planParDefaut(2026);
assert.equal(compterPremium(q), 0, 'aucun kiosque ne naît premium');
q = modifierKiosque(q, 'r1-1', { premium: true });
q = modifierKiosque(q, 'r2-3', { premium: true });
assert.equal(compterPremium(q), 2);
assert.equal(q.kiosques.find((x) => x.id === 'r1-1')!.premium, true);
assert.equal(q.kiosques.find((x) => x.id === 'r1-2')!.premium, false, 'le voisin n’est pas contaminé');

// L'emplacement reste premium quand le marchand s'en va ou change.
q = assigner(q, 'r1-1', 'jesse');
q = echanger(q, 'r1-1', 'r1-2');
assert.equal(q.kiosques.find((x) => x.id === 'r1-1')!.premium, true, 'le premium tient au lieu, pas à l’occupant');
assert.equal(q.kiosques.find((x) => x.id === 'r1-2')!.premium, false);
assert.equal(kiosqueDe(q, 'jesse')?.id, 'r1-2');
q = liberer(q, 'r1-2');
assert.equal(compterPremium(q), 2, 'libérer un kiosque ne retire pas son repère');

// Une fiche d'avant le champ se relit comme un kiosque ordinaire.
const vieux = { ...planParDefaut(2026).kiosques[0] } as Record<string, unknown>;
delete vieux.premium;
assert.equal(normaliserKiosque(vieux as never).premium, false);

console.log('planMarche : tout tient.');
