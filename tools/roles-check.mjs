// Vérification des fonctions d'un membre (aucun cadre de test installé).
// `node tools/roles-check.mjs`
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'roles-')), 'ordre.mjs');
await build({
  entryPoints: ['src/firebase/ordre.ts'],
  bundle: true, format: 'esm', outfile: out,
  // Le module tire la configuration de Vite : hors du navigateur, elle
  // est vide et Firebase reste endormi.
  define: { 'import.meta.env': '{}' },
});
const O = await import(out);

let ko = 0;
const ok = (cond, msg) => { if (!cond) { console.log('KO', msg); ko++; } };

// Tout le monde porte au moins « Membre ».
ok(O.rolesAffiches().join() === 'membre', 'sans fonction, membre quand même');
ok(O.rolesAffiches([]).join() === 'membre', 'liste vide, membre quand même');

// Les fonctions se cumulent, dans l'ordre reçu, sans doublon.
ok(O.rolesAffiches(['tresorier']).join() === 'membre,tresorier', 'la fonction s’ajoute à membre');
ok(O.rolesAffiches(['membre', 'benevole']).join() === 'membre,benevole', 'membre ne double pas');
ok(O.rolesAffiches(['securite', 'administrateur', 'tresorier']).length === 4, 'trois fonctions cumulées');

// Une valeur qui n'existe pas au registre ne passe pas.
ok(O.rolesAffiches(['roi']).join() === 'membre', 'fonction inconnue écartée');

// Chaque fonction a ses deux libellés.
ok(O.ROLES_MEMBRE.length === 11, 'onze fonctions au registre');
ok(O.ROLES_MEMBRE.every((r) => O.LIBELLE_ROLE[r]?.FR && O.LIBELLE_ROLE[r]?.EN), 'libellés FR et EN partout');

console.log(ko === 0 ? '✓ fonctions des membres : tout passe' : `${ko} vérification(s) en échec`);
process.exit(ko === 0 ? 0 : 1);
