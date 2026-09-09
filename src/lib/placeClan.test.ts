// ─── Banc d'essai du moteur « Ta place dans le clan » ───────────────
//   npx esbuild src/lib/placeClan.test.ts --bundle --platform=browser \
//     --format=esm --external:node:assert --outfile=/tmp/place-clan.mjs && node /tmp/place-clan.mjs
import assert from 'node:assert';
import { FONCTIONS, GROUPES, LISTE_GROUPES, QUESTIONS } from '../content/placeClan';
import { calculerScores, composerEquipe, couverture, equipeComplete, plafonds, trancher, verdict } from './placeClan';

// Le contenu tient ses promesses.
assert.strictEqual(QUESTIONS.length, 15, 'quinze questions');
for (const q of QUESTIONS) {
  assert.strictEqual(q.reponses.length, 4, `${q.id} : quatre réponses`);
  for (const r of q.reponses) {
    const total = Object.values(r.poids).reduce((a, b) => a + (b ?? 0), 0);
    assert.strictEqual(total, 3, `${q.id} « ${r.texte} » vaut 3 points`);
  }
}
for (const g of LISTE_GROUPES) for (const f of FONCTIONS) assert.ok(GROUPES[g].titres[f], `${g} nomme ${f}`);
// Chaque fonction peut gagner : au moins 6 réponses la nourrissent et son plafond dépasse 12.
const c = couverture(), p = plafonds();
for (const f of FONCTIONS) { assert.ok(c[f] >= 6, `${f} : ${c[f]} réponses`); assert.ok(p[f] >= 12, `${f} : plafond ${p[f]}`); }

// Le souverain pur : la première réponse « souverain » partout où elle existe.
const idxSouverain = QUESTIONS.map((q) => q.reponses.findIndex((r) => (r.poids.souverain ?? 0) >= 2));
const v = verdict('vikings', idxSouverain);
assert.strictEqual(v.fonction, 'souverain');
assert.strictEqual(v.titre, 'Jarl');
assert.strictEqual(v.archetype, 'roi');
assert.strictEqual(verdict('pirates', idxSouverain).titre, 'Capitaine');

// Sans réponse, tout est à zéro et le tranchage reste stable.
assert.deepStrictEqual(Object.values(calculerScores([])), FONCTIONS.map(() => 0));
assert.strictEqual(trancher(calculerScores([])).fonction, 'souverain');

// Composer : une personne par fonction, même groupe seulement, jamais soi-même deux fois.
const moi = { uid: 'moi', groupe: 'vikings' as const, fonction: 'sage' as const, seconde: 'batisseur' as const };
const gens = FONCTIONS.flatMap((f, i) => [
  { uid: `v-${f}`, groupe: 'vikings' as const, fonction: f, seconde: FONCTIONS[(i + 1) % 7] },
  { uid: `p-${f}`, groupe: 'pirates' as const, fonction: f, seconde: f },
]);
const eq = composerEquipe(moi, gens, new Set(), () => 0);
assert.ok(equipeComplete(eq), 'équipe complète');
assert.ok(eq.every((pl) => !pl.uid || pl.uid === 'moi' || pl.uid.startsWith('v-')), 'que des vikings');
assert.strictEqual(eq.find((pl) => pl.fonction === 'sage')!.uid, 'moi');
assert.strictEqual(new Set(eq.map((pl) => pl.uid)).size, 7, 'sept personnes distinctes');
// Exclure quelqu'un le retire; la seconde fonction comble le trou.
const eq2 = composerEquipe(moi, gens, new Set(['v-souverain']), () => 0);
const pl = eq2.find((x) => x.fonction === 'souverain')!;
assert.notStrictEqual(pl.uid, 'v-souverain');
assert.ok(pl.uid === null || pl.parDefaut, 'comblé par défaut ou vide');

console.log('place-clan : tout passe');
