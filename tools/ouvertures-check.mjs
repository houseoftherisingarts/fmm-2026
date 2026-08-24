// Vérification du suivi des ouvertures d'infolettre (aucun cadre de
// test installé).
//   node tools/ouvertures-check.mjs
//
// Ce que le script protège, dans l'ordre où ça coûterait cher.
//
// LA SIGNATURE. Sans elle, connaître l'identifiant d'une campagne
// suffirait à fabriquer des ouvertures pour n'importe quelle adresse,
// et le taux affiché à Alex serait un nombre inventé. Un jeton forgé,
// tronqué ou emprunté à une autre campagne doit toujours être refusé.
//
// LE COMPTE UNIQUE. Une personne qui rouvre la même lettre quatre fois
// compte pour une. Si cette règle lâche, une seule personne curieuse
// suffit à faire croire à Alex qu'une campagne a bien marché, et il
// écrira la suivante en imitant celle qui a échoué.
//
// LE TAUX. La division elle-même, avec ses deux cas laids : zéro envoi
// et un compte qui dépasse le nombre d'envois, ce qu'Apple provoque en
// chargeant les images de ses usagers avant même qu'ils ouvrent quoi
// que ce soit.
//
// Aucune donnée réelle ici. Les adresses de ce fichier sont inventées.

import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const O = require('../functions/ouvertures.js');

// Le taux vit du côté du navigateur, là où il s'affiche.
const out = join(mkdtempSync(join(tmpdir(), 'ouvertures-')), 'ouvertures.mjs');
await build({
  entryPoints: ['src/firebase/campagnesOuvertures.ts'],
  bundle: true, format: 'esm', outfile: out, logLevel: 'warning',
  define: { 'import.meta.env': '{}' },
});
const V = await import(out);

let ko = 0;
const ok = (cond, msg) => { if (!cond) { console.log('KO', msg); ko++; } };

const CLE = 'une-clé-de-test-qui-ne-sert-nulle-part';
const CAMPAGNE = 'aBcDeF1234567890xyz';
const ADRESSE = 'jeanne.tremblay@exemple.com';

// ── Le jeton qui valide ─────────────────────────────────────────────
const bon = O.jetonPixel(CAMPAGNE, ADRESSE, CLE);
ok(bon.length === 32, `le jeton fait 32 caractères, vu ${bon.length}`);
ok(O.jetonValide(CAMPAGNE, ADRESSE, bon, CLE), 'le jeton que nous venons de signer passe');

// La casse et les espaces de bout ne changent rien : l'adresse se range
// avant d'être signée, des deux côtés du voyage.
ok(O.jetonValide(CAMPAGNE, '  Jeanne.Tremblay@EXEMPLE.com ', bon, CLE),
  'la même adresse mal tapée passe quand même');

// ── Le jeton qui ne valide pas ──────────────────────────────────────
ok(!O.jetonValide(CAMPAGNE, ADRESSE, '', CLE), 'un jeton vide est refusé');
ok(!O.jetonValide(CAMPAGNE, ADRESSE, bon.slice(0, 31), CLE), 'un jeton tronqué est refusé');
ok(!O.jetonValide(CAMPAGNE, ADRESSE, `${bon}ff`, CLE), 'un jeton rallongé est refusé');
ok(!O.jetonValide(CAMPAGNE, ADRESSE, 'f'.repeat(32), CLE), 'un jeton inventé est refusé');
ok(!O.jetonValide(CAMPAGNE, 'quelqun.dautre@exemple.com', bon, CLE),
  'le jeton d’une personne ne vaut pas pour sa voisine');
ok(!O.jetonValide('uneAutreCampagne0000', ADRESSE, bon, CLE),
  'le jeton d’une campagne ne vaut pas pour la suivante');
ok(!O.jetonValide(CAMPAGNE, ADRESSE, bon, 'une-autre-clé'),
  'un jeton signé avec une autre clé est refusé');

// Le jeton de désabonnement signe l'adresse seule. Celui du pixel signe
// l'adresse ET la campagne : les deux ne doivent jamais se confondre,
// sans quoi un lien de désabonnement partagé publiquement fabriquerait
// des ouvertures.
const commeDesabonnement = O.jetonPixel('', ADRESSE, CLE);
ok(commeDesabonnement !== bon, 'un jeton sans campagne ne vaut pas celui de la campagne');

// ── La clé d'un document d'ouverture ────────────────────────────────
ok(O.cleOuverture(CAMPAGNE, ADRESSE) === `${CAMPAGNE}__${ADRESSE}`, 'la clé porte les deux');
ok(O.cleOuverture(CAMPAGNE, ' JEANNE.Tremblay@Exemple.com ') === `${CAMPAGNE}__${ADRESSE}`,
  'l’adresse se range avant d’entrer dans la clé');
for (const mauvais of [
  ['', ADRESSE],
  [CAMPAGNE, ''],
  [null, ADRESSE],
  ['camp/agne', ADRESSE],
  [CAMPAGNE, 'jean/paul@exemple.com'],
  ['deja__pris', ADRESSE],
]) {
  ok(O.cleOuverture(mauvais[0], mauvais[1]) === null,
    `une clé douteuse (${JSON.stringify(mauvais)}) ne s’écrit jamais`);
}

// ── La deuxième ouverture ne compte pas pour deux ───────────────────
const premiere = O.fusionnerOuverture(null);
ok(premiere.unique === true, 'la première ouverture compte pour une personne de plus');
ok(premiere.fois === 1, `la première ouverture met le compteur à 1, vu ${premiere.fois}`);

const deuxieme = O.fusionnerOuverture({ fois: 1 });
ok(deuxieme.unique === false, 'la deuxième ouverture n’ajoute pas de personne');
ok(deuxieme.fois === 2, `la deuxième ouverture met le compteur à 2, vu ${deuxieme.fois}`);

// Quatre ouvertures de la même personne : une seule au taux.
let etat = null;
let uniques = 0;
for (let i = 0; i < 4; i += 1) {
  const suite = O.fusionnerOuverture(etat);
  if (suite.unique) uniques += 1;
  etat = { fois: suite.fois };
}
ok(uniques === 1, `quatre ouvertures d’une même personne comptent pour une, vu ${uniques}`);
ok(etat.fois === 4, `mais le compteur de relectures monte à 4, vu ${etat.fois}`);

// Un document abîmé ne fait pas repartir le compteur à zéro ni tomber
// sur NaN, ce qui écrirait une saleté dans Firestore.
ok(O.fusionnerOuverture({}).fois === 1, 'un document sans compteur repart à 1');
ok(O.fusionnerOuverture({ fois: 'trois' }).fois === 1, 'un compteur illisible repart à 1');
ok(O.fusionnerOuverture({ fois: -5 }).fois === 1, 'un compteur négatif repart à 1');

// ── Le calcul du taux ───────────────────────────────────────────────
ok(V.tauxOuverture(41, 120) === 34, `41 sur 120 donne 34 %, vu ${V.tauxOuverture(41, 120)}`);
ok(V.tauxOuverture(0, 120) === 0, 'personne n’a ouvert, le taux est à zéro');
ok(V.tauxOuverture(120, 120) === 100, 'tout le monde a ouvert, le taux est à cent');
ok(V.tauxOuverture(1, 3) === 33, `1 sur 3 s’arrondit à 33 %, vu ${V.tauxOuverture(1, 3)}`);
ok(V.tauxOuverture(2, 3) === 67, `2 sur 3 s’arrondit à 67 %, vu ${V.tauxOuverture(2, 3)}`);

// Une campagne qui n'a rien envoyé ne divise pas par zéro.
ok(V.tauxOuverture(0, 0) === 0, 'aucun envoi, aucun taux, aucune division par zéro');
ok(V.tauxOuverture(5, 0) === 0, 'des ouvertures sans envoi ne fabriquent pas un taux');

// Apple charge les images de ses usagers sans que personne ouvre quoi
// que ce soit : le compte peut dépasser le nombre d'envois. Un taux de
// 130 % ferait douter Alex de tout le tableau.
ok(V.tauxOuverture(150, 120) === 100, `le taux plafonne à cent, vu ${V.tauxOuverture(150, 120)}`);
ok(V.tauxOuverture(undefined, undefined) === 0, 'des champs absents donnent zéro');
ok(V.tauxOuverture(-3, 120) === 0, 'un compte négatif donne zéro');

// ── L'ordre des deux passages sur la lettre ─────────────────────────
// Le pixel doit rester une image DISTANTE. Les images de la lettre,
// elles, sont jointes au message par `incorporerImages` pour paraître
// sans permission. Si un jour quelqu'un remet le pixel avant ce
// passage-là, il partira en pièce jointe et ne mesurera plus rien : le
// taux tomberait à zéro sans que personne comprenne pourquoi.
const source = readFileSync('functions/index.js', 'utf8');
ok(source.includes('poserPixel(corps.html'),
  'le pixel se pose sur la lettre DÉJÀ incorporée, jamais avant');
ok(/const corps = incorporerImages\(/.test(source),
  'l’incorporation des images est toujours là, et elle passe en premier');

console.log(ko === 0 ? 'OK — les ouvertures tiennent' : `${ko} vérification(s) en échec`);
process.exit(ko === 0 ? 0 : 1);
