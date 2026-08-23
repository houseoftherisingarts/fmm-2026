// Vérification rapide du moteur de règles (aucun cadre de test installé).
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const out = join(mkdtempSync(join(tmpdir(), 'tafl-')), 'logic.mjs');
await build({ entryPoints: ['src/games/hnefatafl/gameLogic.ts'], bundle: true, format: 'esm', outfile: out });
const L = await import(out);
const compte = (b, v) => b.flat().filter((x) => x === v).length;
let ko = 0;
const ok = (cond, msg) => { if (!cond) { console.log('KO', msg); ko++; } };

L.setRegle('copenhague');
let b = L.initBoard();
ok(L.N === 11, 'Copenhague 11x11');
ok(compte(b, 1) === 24, 'Copenhague 24 assaillants, vu ' + compte(b, 1));
ok(compte(b, 2) === 12, 'Copenhague 12 défenseurs, vu ' + compte(b, 2));
ok(compte(b, 3) === 1, 'un roi');

L.setRegle('tablut');
b = L.initBoard();
ok(L.N === 9, 'Tablut 9x9');
ok(compte(b, 1) === 16, 'Tablut 16 assaillants, vu ' + compte(b, 1));
ok(compte(b, 2) === 8, 'Tablut 8 défenseurs, vu ' + compte(b, 2));
// Roi faible : deux lances en ligne suffisent
b = L.initBoard();
b = b.map((r) => r.map(() => 0));
b[4][4] = 3; b[4][3] = 1; b[4][5] = 1;
ok(L.checkWin(b) === 'attacker', 'Tablut : roi faible pris à deux');
// Sortie par le bord
b = b.map((r) => r.map(() => 0));
b[0][4] = 3;
ok(L.checkWin(b) === 'defender', 'Tablut : sortie par le bord');

L.setRegle('copenhague');
b = L.initBoard().map((r) => r.map(() => 0));
b[0][5] = 3; // roi au bord, pas dans un coin
ok(L.checkWin(b) === null, 'Copenhague : le bord ne libère pas le roi');
b[0][0] = 3; b[0][5] = 0;
ok(L.checkWin(b) === 'defender', 'Copenhague : le coin libère le roi');

L.setRegle('brandubh');
b = L.initBoard();
ok(L.N === 7, 'Brandubh 7x7');
ok(compte(b, 1) === 8 && compte(b, 2) === 4, 'Brandubh 8 contre 4, vu ' + compte(b, 1) + '/' + compte(b, 2));

console.log(ko === 0 ? 'TOUT PASSE' : ko + ' échec(s)');
process.exit(ko === 0 ? 0 : 1);
