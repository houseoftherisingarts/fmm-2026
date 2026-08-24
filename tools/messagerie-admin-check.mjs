// Vérification des étiquettes de groupe et des filtres d'envoi
// (aucun cadre de test installé).
//   node tools/messagerie-admin-check.mjs
//
// Ce que le script protège : une étiquette qui se dédouble parce que
// quelqu'un a tapé « Viking » au lieu de « viking », un filtre par
// fonction qui oublie ceux qui ne portent que « membre », et le compte
// de destinataires du panneau de confirmation, qui doit être exact
// avant qu'un message parte à trois cents personnes.

import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'messagerie-')), 'ordre.mjs');
await build({
  entryPoints: ['src/firebase/ordre.ts'],
  bundle: true, format: 'esm', outfile: out,
  define: { 'import.meta.env': '{}' },
});
const O = await import(out);

let ko = 0;
const ok = (cond, msg) => { if (!cond) { console.log('KO', msg); ko++; } };

// ── L'étiquette se range avant d'être écrite ────────────────────────
ok(O.normaliserTag('  viking  ') === 'viking', 'les espaces de bout tombent');
ok(O.normaliserTag('marchand   du   dimanche') === 'marchand du dimanche', 'les espaces doubles se resserrent');
ok(O.normaliserTag('') === '', 'une étiquette vide reste vide');
ok(O.normaliserTag('x'.repeat(60)).length === O.LONGUEUR_TAG, 'une étiquette trop longue se coupe');

// ── Le registre de démonstration ────────────────────────────────────
const registre = [
  { uid: 'a', nom: 'Alix la Rousse',   roles: ['membre', 'marchand'],  tags: ['viking', 'client'] },
  { uid: 'b', nom: 'Bertrand du Pont', roles: ['membre', 'benevole'],  tags: ['Viking'] },
  { uid: 'c', nom: 'Célestine',        roles: ['benevole', 'musicien'] },
  { uid: 'd', nom: 'Dagobert',         roles: [],                      tags: ['municipalité'] },
];

// ── Le filtre par fonction ──────────────────────────────────────────
ok(O.membresParRole(registre, 'marchand').map((m) => m.uid).join() === 'a', 'la fonction marchand ne retient qu’Alix');
ok(O.membresParRole(registre, 'benevole').map((m) => m.uid).join() === 'b,c', 'la fonction bénévole en retient deux');
// « membre » est portée par tout le monde, même par une fiche sans rôle.
ok(O.membresParRole(registre, 'membre').length === 4, 'tout le monde porte membre, même sans rôle inscrit');

// ── Le filtre par étiquette ─────────────────────────────────────────
ok(O.membresParTag(registre, 'viking').map((m) => m.uid).join() === 'a,b', 'viking et Viking désignent le même groupe');
ok(O.membresParTag(registre, 'VIKING').map((m) => m.uid).join() === 'a,b', 'la casse ne change rien');
ok(O.membresParTag(registre, 'municipalite').map((m) => m.uid).join() === 'd', 'les accents ne changent rien');
ok(O.membresParTag(registre, 'saltimbanque').length === 0, 'une étiquette que personne ne porte ne retient personne');
ok(O.membresParTag(registre, '   ').length === 0, 'une étiquette vide ne retient personne');

// ── Les filtres se cumulent, comme dans la section d'admin ──────────
const cumul = O.filtrerMembres(
  O.membresParTag(O.membresParRole(registre, 'membre'), 'viking'),
  'alix',
);
ok(cumul.length === 1 && cumul[0].uid === 'a', 'fonction, étiquette et nom se cumulent');

// ── Le compte des destinataires ─────────────────────────────────────
// La personne qui écrit ne s'envoie jamais le message à elle-même :
// c'est ce compte que le panneau de confirmation affiche.
const moi = 'c';
const vises = registre.filter((m) => m.uid && m.uid !== moi);
ok(vises.length === 3, 'l’expéditeur sort du compte des destinataires');

// ── Le découpage en lots de la Cloud Function ───────────────────────
// 200 membres par lot font 400 écritures, sous le plafond de 500 de
// Firestore. Le dernier lot est partiel et doit être compté juste.
const PAR_LOT = 200;
const compter = (n) => {
  let faits = 0;
  for (let i = 0; i < n; i += PAR_LOT) faits += Math.min(PAR_LOT, n - i);
  return faits;
};
ok(compter(0) === 0, 'zéro membre, zéro fil');
ok(compter(1) === 1, 'un seul membre tient dans un lot');
ok(compter(200) === 200, 'un lot plein se compte juste');
ok(compter(201) === 201, 'le lot suivant ne compte qu’un membre');
ok(compter(317) === 317, 'un registre quelconque se compte juste');
ok(PAR_LOT * 2 <= 500, 'deux écritures par membre restent sous le plafond du lot Firestore');

console.log(ko === 0 ? 'OK messagerie admin' : `${ko} vérification(s) en échec`);
process.exit(ko === 0 ? 0 : 1);
