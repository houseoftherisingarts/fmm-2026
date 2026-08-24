// Vérification du décompte des places du banquet (aucun cadre de test installé).
// `node tools/banquet-check.mjs`
//
// Ce qui se joue ici : le chiffre affiché sur la page publique. Un faux
// chiffre est pire que pas de chiffre, alors tout ce qui n'est pas une
// lecture propre doit rendre `null` et faire taire la ligne.
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'banquet-')), 'places.mjs');
await build({
  entryPoints: ['src/firebase/banquetPlaces.ts'],
  bundle: true, format: 'esm', outfile: out,
  // Le module tire la configuration de Vite : hors du navigateur, elle
  // est vide et Firebase reste endormi.
  define: { 'import.meta.env': '{}' },
});
const B = await import(out);

let ko = 0;
const ok = (cond, msg) => { if (!cond) { console.log('KO', msg); ko++; } };

// La capacité de la salle ne bouge pas.
ok(B.PLACES_BANQUET === 50, 'la salle compte cinquante places');

// Le cas courant : des ventes réelles, des places qui restent.
ok(B.placesRestantes(0) === 50, 'aucune vente, cinquante places libres');
ok(B.placesRestantes(4) === 46, 'quatre vendues, quarante-six libres');
ok(B.placesRestantes(49) === 1, 'quarante-neuf vendues, une seule libre');
ok(B.placesRestantes(50) === 0, 'salle pleine, zéro place');

// Une surréservation ne descend jamais sous zéro : « moins deux places »
// ne doit jamais s'écrire sur la page.
ok(B.placesRestantes(53) === 0, 'plus de ventes que de places, plancher à zéro');

// Tout ce qui n'est pas un nombre entier positif se tait.
for (const mauvais of [undefined, null, '4', '', NaN, Infinity, -1, {}, [], true]) {
  ok(B.placesRestantes(mauvais) === null, `lecture douteuse (${JSON.stringify(mauvais)}) : rien ne s'affiche`);
}

// Un décimal se tronque plutôt que d'inventer une demi-place.
ok(B.placesRestantes(4.9) === 46, 'un décimal se tronque vers le bas');

console.log(ko ? `${ko} vérification(s) en échec` : 'banquet : tout passe');
process.exit(ko ? 1 : 0);
