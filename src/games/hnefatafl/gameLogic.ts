// ─── Hnefatafl: pure game logic ────────────────────────────────────
// No Three.js, no React. Deterministic functions over the board.
// Cell values: 0 empty · 1 attacker (raider) · 2 defender · 3 king.
//
// 🎲 LES RÈGLES SE CHOISISSENT (Alex, 2026-08-22). Le tafl n'a jamais eu
// un règlement unique : chaque région jouait le sien, et le monde des
// tournois modernes s'est fixé sur Copenhague. Les variantes vivent
// ici, dans REGLES, et le reste du jeu lit les drapeaux plutôt que de
// coder une règle en dur.
//
// Sources consultées le 2026-08-22 :
//   · aagenielsen.dk/tafl_rules.php et /copenhagen_summary.php
//     (les règles de Copenhague, la référence des tournois)
//   · tafl.cyningstan.com, pages Fetlar et variantes
//
// Tablut (9×9) est écarté tant que son damier n'est pas taillé en 3D
// (Alex, 2026-08-23) : mieux vaut trois règlements qui tiennent qu'un
// quatrième qui s'ouvre sur un plateau faux.
//
// Ce qui change d'une variante à l'autre :
//   · la taille du damier (11×11 ou 7×7)
//   · le roi armé (il aide à capturer) ou désarmé
//   · le roi pris à quatre (roi fort) ou à deux (roi faible)
//   · la sortie par les coins ou par n'importe quel bord
//   · le mur de boucliers et l'encerclement complet (Copenhague)

export const CELL = 1;

export type CellValue = 0 | 1 | 2 | 3;
export type Board = CellValue[][];
export type Coord = [number, number];
export type Side = 'attacker' | 'defender';
export type Winner = 'attacker' | 'defender' | null;

export interface Regle {
  id: string;
  nomFR: string;
  nomEN: string;
  /** Une ligne qui dit ce qui la distingue, montrée au joueur. */
  texteFR: string;
  texteEN: string;
  taille: number;
  /** Le roi participe aux captures. */
  roiArme: boolean;
  /** Nombre d'assaillants requis pour prendre le roi en plein damier. */
  roiPrisA: 2 | 4;
  /** Le roi peut être pris contre le bord (Copenhague : non). */
  roiPrisAuBord: boolean;
  /** Le roi s'échappe par les coins; sinon par n'importe quelle case de bord. */
  sortieCoins: boolean;
  /** Le trône vide est hostile aux défenseurs (il aide à les prendre). */
  troneHostileDefenseurs: boolean;
  /** Mur de boucliers : une rangée collée au bord se prend d'un coup. */
  murDeBoucliers: boolean;
  /** Encerclement total : les assaillants qui enferment tout le camp gagnent. */
  encerclement: boolean;
  /** Les défenseurs, en plaçant leurs hommes, forment le camp du roi. */
  setup: (b: Board, n: number) => void;
}

// ── Les mises en place ──────────────────────────────────────────────
// Chaque variante pose ses hommes autrement. Les coordonnées sont
// relatives au centre : elles tiennent donc sur n'importe quel damier
// impair.
const croix = (b: Board, n: number, bras: number[], diagonales: Coord[]) => {
  const m = (n - 1) / 2;
  b[m][m] = 3;
  for (const d of bras) {
    b[m][m - d] = 2; b[m][m + d] = 2;
    b[m - d][m] = 2; b[m + d][m] = 2;
  }
  for (const [dr, dc] of diagonales) b[m + dr][m + dc] = 2;
};

const assaillantsAuxBords = (b: Board, n: number, largeur: number, avance: boolean) => {
  const m = (n - 1) / 2;
  for (let d = -largeur; d <= largeur; d++) {
    b[0][m + d] = 1; b[n - 1][m + d] = 1;
    b[m + d][0] = 1; b[m + d][n - 1] = 1;
  }
  if (avance) {
    b[1][m] = 1; b[n - 2][m] = 1;
    b[m][1] = 1; b[m][n - 2] = 1;
  }
};

const setup11 = (b: Board, n: number) => {
  croix(b, n, [1, 2], [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
  assaillantsAuxBords(b, n, 2, true);
};

const setup7 = (b: Board, n: number) => {
  croix(b, n, [1], []);
  const m = (n - 1) / 2;
  b[0][m] = 1; b[n - 1][m] = 1; b[m][0] = 1; b[m][n - 1] = 1;
  b[1][m] = 1; b[n - 2][m] = 1; b[m][1] = 1; b[m][n - 2] = 1;
};

export const REGLES: Regle[] = [
  {
    id: 'copenhague',
    nomFR: 'Copenhague', nomEN: 'Copenhagen',
    texteFR: 'La règle des tournois modernes. Roi armé, pris à quatre, jamais contre le bord. Mur de boucliers et encerclement complet.',
    texteEN: 'The modern tournament rule. Armed king, captured by four, never against the edge. Shieldwall capture and full encirclement.',
    taille: 11, roiArme: true, roiPrisA: 4, roiPrisAuBord: false, sortieCoins: true,
    troneHostileDefenseurs: true, murDeBoucliers: true, encerclement: true, setup: setup11,
  },
  {
    id: 'fetlar',
    nomFR: 'Fetlar', nomEN: 'Fetlar',
    texteFR: 'La règle classique moderne, née des tournois des Shetland. Roi armé, pris à quatre, y compris contre le bord. Pas de mur de boucliers.',
    texteEN: 'The classic modern rule, born of the Shetland tournaments. Armed king, captured by four, edge included. No shieldwall.',
    taille: 11, roiArme: true, roiPrisA: 4, roiPrisAuBord: true, sortieCoins: true,
    troneHostileDefenseurs: true, murDeBoucliers: false, encerclement: false, setup: setup11,
  },
  {
    id: 'tawlbwrdd',
    nomFR: 'Tawlbwrdd', nomEN: 'Tawlbwrdd',
    texteFR: 'La table galloise. Même damier, mais le roi est désarmé et tombe sous deux lances : les parties sont vives et courtes.',
    texteEN: 'The Welsh board. Same grid, but the king is unarmed and falls to two spears: quick, sharp games.',
    taille: 11, roiArme: false, roiPrisA: 2, roiPrisAuBord: true, sortieCoins: true,
    troneHostileDefenseurs: true, murDeBoucliers: false, encerclement: false, setup: setup11,
  },
  {
    id: 'brandubh',
    nomFR: 'Brandubh', nomEN: 'Brandubh',
    texteFR: 'Le « corbeau noir » irlandais. Sept sur sept, huit hommes contre quatre et le roi : une partie tient dans une veillée.',
    texteEN: 'The Irish "black raven". Seven by seven, eight men against four and the king: a game fits in one evening.',
    taille: 7, roiArme: true, roiPrisA: 2, roiPrisAuBord: true, sortieCoins: true,
    troneHostileDefenseurs: false, murDeBoucliers: false, encerclement: false, setup: setup7,
  },
];

export const REGLE_DEFAUT = 'copenhague';

export function regle(id: string): Regle {
  return REGLES.find((r) => r.id === id) ?? REGLES[0];
}

// La règle courante. `N` et `MID` en dépendent : le reste du jeu les
// lit à l'exécution (liaisons vivantes des modules ES), donc changer de
// règle avant de reconstruire la scène suffit.
export let REGLE: Regle = REGLES[0];
export let N = REGLE.taille;
export let MID = (N - 1) / 2;

export function setRegle(id: string): Regle {
  REGLE = regle(id);
  N = REGLE.taille;
  MID = (N - 1) / 2;
  return REGLE;
}

export const isCorner = (r: number, c: number): boolean =>
  (r === 0 || r === N - 1) && (c === 0 || c === N - 1);

export const isThrone = (r: number, c: number): boolean =>
  r === MID && c === MID;

const isEdge = (r: number, c: number): boolean =>
  r === 0 || c === 0 || r === N - 1 || c === N - 1;

export function initBoard(): Board {
  const b: Board = Array.from({ length: N }, () =>
    Array<CellValue>(N).fill(0),
  );
  REGLE.setup(b, N);
  return b;
}

const DIRS: Coord[] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

export function validMoves(board: Board, r: number, c: number): Coord[] {
  const p = board[r][c];
  if (!p) return [];
  const king = p === 3;
  const moves: Coord[] = [];
  for (const [dr, dc] of DIRS) {
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < N && nc >= 0 && nc < N) {
      if (board[nr][nc]) break;
      // Les coins n'accueillent que le roi, et seulement là où la
      // variante fait des coins la sortie.
      if (!king && isCorner(nr, nc)) break;
      if (king && !REGLE.sortieCoins && isCorner(nr, nc)) break;
      if (!king && isThrone(nr, nc)) {
        nr += dr;
        nc += dc;
        continue;
      }
      moves.push([nr, nc]);
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}

export interface ApplyMoveResult {
  board: Board;
  removed: Coord[];
}

export function applyMove(
  board: Board,
  fr: number,
  fc: number,
  tr: number,
  tc: number,
): ApplyMoveResult {
  const b: Board = board.map((row) => [...row]);
  const piece = b[fr][fc];
  b[tr][tc] = piece;
  b[fr][fc] = 0;
  const myT = piece === 1 ? 1 : 2;
  // Un roi désarmé regarde la prise sans y prendre part.
  const capteur = piece !== 3 || REGLE.roiArme;
  const isMine = (r: number, c: number) => {
    const p = b[r][c];
    if (!p) return false;
    if (p === 3) return myT === 2 && REGLE.roiArme;
    return (p === 1 ? 1 : 2) === myT;
  };
  const isHostile = (r: number, c: number) => {
    if (isCorner(r, c)) return REGLE.sortieCoins;
    if (isThrone(r, c) && b[r][c] === 0) return myT === 1 || REGLE.troneHostileDefenseurs;
    return false;
  };
  const removed: Coord[] = [];

  if (capteur) {
    // ── La prise ordinaire : un homme pris en tenaille ──────────────
    for (const [dr, dc] of DIRS) {
      const nr = tr + dr;
      const nc = tc + dc;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      const tgt = b[nr][nc];
      if (!tgt || tgt === 3) continue;
      if ((tgt === 1 ? 1 : 2) === myT) continue;
      const nr2 = nr + dr;
      const nc2 = nc + dc;
      if (nr2 < 0 || nr2 >= N || nc2 < 0 || nc2 >= N) continue;
      if (isMine(nr2, nc2) || isHostile(nr2, nc2)) {
        b[nr][nc] = 0;
        removed.push([nr, nc]);
      }
    }

    // ── Le mur de boucliers (Copenhague) ───────────────────────────
    // Une rangée d'ennemis collée au bord se prend d'un seul coup si
    // elle est bordée aux deux bouts par mes hommes et si chacun de
    // ses hommes a un des miens devant lui, comme des pierres de go.
    if (REGLE.murDeBoucliers && isEdge(tr, tc)) {
      for (const mur of mursDeBoucliers(b, tr, tc, myT)) {
        for (const [r, c] of mur) {
          if (b[r][c] === 3) continue; // le roi ne tombe pas dans un mur
          b[r][c] = 0;
          removed.push([r, c]);
        }
      }
    }
  }
  return { board: b, removed };
}

// Cherche, le long du bord où vient de tomber la pièce, les rangées
// ennemies enfermées. Renvoie chaque rangée prise.
function mursDeBoucliers(b: Board, tr: number, tc: number, myT: number): Coord[][] {
  const murs: Coord[][] = [];
  const ennemi = (r: number, c: number) => {
    const p = b[r][c];
    return !!p && (p === 1 ? 1 : 2) !== myT;
  };
  const amiOuCoin = (r: number, c: number) => {
    if (r < 0 || r >= N || c < 0 || c >= N) return false;
    if (isCorner(r, c)) return true;
    const p = b[r][c];
    return !!p && (p === 1 ? 1 : 2) === myT;
  };

  // Le bord concerné, et la direction « vers l'intérieur ».
  const bords: Array<{ fixe: 'r' | 'c'; val: number; dedans: Coord }> = [];
  if (tr === 0)     bords.push({ fixe: 'r', val: 0,     dedans: [1, 0] });
  if (tr === N - 1) bords.push({ fixe: 'r', val: N - 1, dedans: [-1, 0] });
  if (tc === 0)     bords.push({ fixe: 'c', val: 0,     dedans: [0, 1] });
  if (tc === N - 1) bords.push({ fixe: 'c', val: N - 1, dedans: [0, -1] });

  for (const bord of bords) {
    const at = (i: number): Coord => (bord.fixe === 'r' ? [bord.val, i] : [i, bord.val]);
    const iCourant = bord.fixe === 'r' ? tc : tr;
    // On part de la case jouée et on étend des deux côtés tant qu'on
    // trouve des ennemis qui ont un des miens juste devant eux.
    const dedans = bord.dedans;
    const tenu = (i: number) => {
      const [r, c] = at(i);
      if (!ennemi(r, c)) return false;
      const dr = r + dedans[0];
      const dc = c + dedans[1];
      return amiOuCoin(dr, dc);
    };
    let g = iCourant - 1;
    while (g >= 0 && tenu(g)) g--;
    let d = iCourant + 1;
    while (d < N && tenu(d)) d++;
    const dedansMur: Coord[] = [];
    for (let i = g + 1; i < d; i++) {
      const [r, c] = at(i);
      if (ennemi(r, c)) dedansMur.push([r, c]);
    }
    if (dedansMur.length < 2) continue;
    // Les deux bouts doivent être tenus par les miens (ou un coin).
    const [gr, gc] = at(g);
    const [dr2, dc2] = at(d);
    if (!amiOuCoin(gr, gc) || !amiOuCoin(dr2, dc2)) continue;
    murs.push(dedansMur);
  }
  return murs;
}

function trouveRoi(board: Board): Coord | null {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) if (board[r][c] === 3) return [r, c];
  }
  return null;
}

export function checkWin(board: Board): Winner {
  const roi = trouveRoi(board);
  if (!roi) return 'attacker';
  const [kr, kc] = roi;

  // ── La fuite du roi ────────────────────────────────────────────
  if (REGLE.sortieCoins ? isCorner(kr, kc) : isEdge(kr, kc)) return 'defender';

  // ── La prise du roi ────────────────────────────────────────────
  const cerne = (r: number, c: number) => {
    if (r < 0 || r >= N || c < 0 || c >= N) return false;
    return board[r][c] === 1 || (isThrone(r, c) && board[r][c] === 0) || isCorner(r, c);
  };
  if (REGLE.roiPrisA === 4) {
    const auBord = isEdge(kr, kc);
    if (auBord && !REGLE.roiPrisAuBord) {
      // Copenhague : le roi collé au bord ne se prend pas.
    } else {
      const pris = DIRS.every(([dr, dc]) => cerne(kr + dr, kc + dc));
      if (pris) return 'attacker';
    }
  } else {
    // Roi faible : deux lances suffisent, en ligne.
    const paires: Array<[Coord, Coord]> = [
      [[0, 1], [0, -1]],
      [[1, 0], [-1, 0]],
    ];
    const pris = paires.some(([a, z]) => cerne(kr + a[0], kc + a[1]) && cerne(kr + z[0], kc + z[1]));
    if (pris) return 'attacker';
  }

  // ── L'encerclement complet (Copenhague) ────────────────────────
  // Si plus aucune case libre atteignable depuis le camp du roi ne
  // touche le bord, les assaillants ont fermé l'anneau : ils gagnent.
  if (REGLE.encerclement && !toucheLeBord(board, kr, kc)) return 'attacker';

  return null;
}

// Inondation depuis le roi à travers tout ce qui n'est pas assaillant :
// si l'eau atteint un bord, le camp respire encore.
function toucheLeBord(board: Board, kr: number, kc: number): boolean {
  const vus = new Set<number>();
  const pile: Coord[] = [[kr, kc]];
  while (pile.length) {
    const [r, c] = pile.pop()!;
    const clef = r * N + c;
    if (vus.has(clef)) continue;
    vus.add(clef);
    if (isEdge(r, c)) return true;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      if (board[nr][nc] === 1) continue;
      pile.push([nr, nc]);
    }
  }
  return false;
}

export function hasAnyMoves(board: Board, turn: Side): boolean {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const p = board[r][c];
      if (!p) continue;
      const pt: Side = p === 1 ? 'attacker' : 'defender';
      if (pt !== turn) continue;
      if (validMoves(board, r, c).length > 0) return true;
    }
  }
  return false;
}
