// ─── Le banc du lien de composition du bottin ────────────────────────
// Le bottin des ressources ne sert à rien si le numéro ne se compose pas
// d'un doigt pendant le festival. La fonction lienTel() traduit un
// numéro écrit à la main en un lien tel: que le téléphone comprend, et
// c'est le seul endroit du bottin où il y a une vraie règle à casser.
//
// Ce banc ne récrit pas la règle : il va la CHERCHER dans
// src/firebase/carnetContacts.ts, l'exécute pour de vrai, et vérifie ce
// qu'elle rend sur les formes de numéros que l'équipe écrit vraiment.
//
//   node tools/bottin-check.mjs
//
// Aucune écriture, aucun accès au réseau, aucun identifiant.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FICHIER = 'src/firebase/carnetContacts.ts';
const source = readFileSync(path.join(racine, FICHIER), 'utf8');

const debut = source.indexOf('export function lienTel');
const fin = source.indexOf('export function lienCourriel');
if (debut < 0 || fin < 0) {
  throw new Error(`lienTel ou lienCourriel introuvable dans ${FICHIER} : la fonction a été déplacée ou renommée.`);
}

const { lienTel } = new Function(`${stripTypeScriptTypes(source.slice(debut, fin)).replace(/^export /gm, '')}
  return { lienTel };`)();

const cas = [
  // Le format que l'équipe écrit, dans la feuille comme dans la régie.
  ['819 428-1280', 'tel:+18194281280'],
  ['819-428-1280', 'tel:+18194281280'],
  ['(819) 428-1280', 'tel:+18194281280'],
  ['514.418.3450', 'tel:+15144183450'],
  // L'indicatif de pays déjà écrit ne se double pas.
  ['1 800 790-2424', 'tel:+18007902424'],
  ['+1 819 427-6262', 'tel:+18194276262'],
  // Le poste se range derrière la virgule d'attente des téléphones.
  ['819 427-6262 poste 221', 'tel:+18194276262,221'],
  ['819 427-6262, ext. 221', 'tel:+18194276262,221'],
  ['819 427-6262 #221', 'tel:+18194276262,221'],
  // Les numéros courts d'urgence passent tels quels, sans indicatif.
  ['911', 'tel:911'],
  ['310-4141', 'tel:3104141'],
  // Ce qui n'a aucun chiffre ne donne pas de lien : l'écran affichera un
  // tiret plutôt qu'un lien mort.
  ['', ''],
  ['non vérifié', ''],
];

let echecs = 0;
for (const [numero, attendu] of cas) {
  const obtenu = lienTel(numero);
  if (obtenu === attendu) continue;
  echecs += 1;
  console.error(`  ✗ « ${numero} » donne « ${obtenu} », attendu « ${attendu} »`);
}

assert.equal(echecs, 0, `${echecs} cas du lien de composition ont échoué.`);
console.log(`Le lien de composition du bottin tient sur les ${cas.length} cas du banc.`);
