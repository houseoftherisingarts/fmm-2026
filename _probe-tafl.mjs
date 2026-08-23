import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const out = join(mkdtempSync(join(tmpdir(), 'tafl-')), 'logic.mjs');
await build({ entryPoints: ['src/games/hnefatafl/gameLogic.ts'], bundle: true, format: 'esm', outfile: out });
const L = await import(out);
const vide = () => Array.from({length: L.N}, () => Array(L.N).fill(0));

// ---- 1) trône hostile : le drapeau troneHostileDefenseurs ----
for (const id of ['copenhague','tablut','brandubh']) {
  L.setRegle(id);
  const M = (L.N-1)/2;
  // attaquant prend un défenseur contre le trône vide
  let b = vide();
  b[M][M-1] = 2;         // défenseur cible, adjacent au trône
  b[M][M-3] = 1;         // assaillant qui vient en M,M-2
  const r1 = L.applyMove(b, M, M-3, M, M-2);
  // défenseur prend un assaillant contre le trône vide
  let b2 = vide();
  b2[M][M-1] = 1;        // assaillant cible
  b2[M][M-3] = 2;        // défenseur qui vient
  const r2 = L.applyMove(b2, M, M-3, M, M-2);
  console.log(id, 'flag troneHostileDefenseurs=', L.REGLE.troneHostileDefenseurs,
    '| attaquant prend def contre trone:', r1.removed.length>0,
    '| defenseur prend att contre trone:', r2.removed.length>0);
}

// ---- 2) Tablut : le roi peut-il entrer dans un coin (case de bord) ? ----
L.setRegle('tablut');
let b = vide();
b[0][2] = 3;
const mv = L.validMoves(b, 0, 2).map(m=>m.join(','));
console.log('tablut roi en 0,2 peut aller en 0,0 ?', mv.includes('0,0'), '| coups:', mv.join(' '));
// et un simple soldat ?
b = vide(); b[0][2] = 1;
console.log('tablut soldat en 0,2 peut aller en 0,0 ?', L.validMoves(b,0,2).map(m=>m.join(',')).includes('0,0'));

// ---- 3) Copenhague : roi désarmé ? non. Tawlbwrdd roi désarmé ----
L.setRegle('tawlbwrdd');
b = vide();
const M = (L.N-1)/2;
b[2][2] = 3;     // roi
b[2][4] = 1;     // assaillant cible
b[2][5] = 2;     // défenseur derrière
const rr = L.applyMove(b, 2, 2, 2, 3);
console.log('tawlbwrdd roi desarme ne capture pas:', rr.removed.length === 0);

// ---- 4) encerclement copenhague : faux positif au premier coup ? ----
L.setRegle('copenhague');
b = L.initBoard();
console.log('copenhague depart, checkWin =', L.checkWin(b));

// ---- 5) mur de boucliers : faux positif sur la position de depart ? ----
L.setRegle('copenhague');
b = L.initBoard();
// assaillant du bord haut (0,5) descend... teste plutot une prise au bord
// Position de depart : rangee 0 cols 3..7 assaillants. Un defenseur arrive au bord.
let faux = 0;
for (let r=0;r<L.N;r++) for(let c=0;c<L.N;c++){
  if (b[r][c]!==2) continue;
  for (const [tr,tc] of L.validMoves(b,r,c)) {
    const res = L.applyMove(b,r,c,tr,tc);
    if (res.removed.length) { faux++; if (faux<4) console.log('  prise defenseur des le 1er coup:', r,c,'->',tr,tc,'retire',JSON.stringify(res.removed)); }
  }
}
console.log('copenhague: coups de defenseur qui capturent au 1er tour (depuis la position initiale, tour des assaillants normalement):', faux);

// ---- 6) le roi seul contre le bord, Copenhague vs Fetlar ----
for (const id of ['copenhague','fetlar']) {
  L.setRegle(id);
  b = vide();
  b[0][5] = 3; b[0][4]=1; b[0][6]=1; b[1][5]=1;
  console.log(id,'roi au bord cerne de 3:', L.checkWin(b));
}

// ---- 7) hasAnyMoves / roi seul sans coups ----
L.setRegle('brandubh');
b = vide();
b[0][3]=3;
console.log('brandubh roi en 0,3 (bord, pas coin) checkWin =', L.checkWin(b), '(sortieCoins=true donc null attendu)');
