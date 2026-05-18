// ─── Hnefatafl — pure game logic ────────────────────────────────────
// No Three.js, no React. Deterministic functions over an 11×11 board.
// Cell values: 0 empty · 1 attacker (raider) · 2 defender · 3 king.

export const N = 11;
export const CELL = 1;
export const MID = 5;

export type CellValue = 0 | 1 | 2 | 3;
export type Board = CellValue[][];
export type Coord = [number, number];
export type Side = 'attacker' | 'defender';
export type Winner = 'attacker' | 'defender' | null;

export const isCorner = (r: number, c: number): boolean =>
  (r === 0 || r === N - 1) && (c === 0 || c === N - 1);

export const isThrone = (r: number, c: number): boolean =>
  r === MID && c === MID;

export function initBoard(): Board {
  const b: Board = Array.from({ length: N }, () =>
    Array<CellValue>(N).fill(0),
  );
  b[5][5] = 3;
  ([
    [5, 3], [5, 4], [5, 6], [5, 7],
    [3, 5], [4, 5], [6, 5], [7, 5],
    [4, 4], [4, 6], [6, 4], [6, 6],
  ] as Coord[]).forEach(([r, c]) => (b[r][c] = 2));
  ([
    [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 5],
    [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [9, 5],
    [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [5, 1],
    [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [5, 9],
  ] as Coord[]).forEach(([r, c]) => (b[r][c] = 1));
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
      if (!king && isCorner(nr, nc)) break;
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
  const isMine = (p: CellValue) => p > 0 && (p === 1 ? 1 : 2) === myT;
  const isHostile = (r: number, c: number) =>
    isCorner(r, c) || (isThrone(r, c) && b[r][c] === 0);
  const removed: Coord[] = [];
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
    if (isMine(b[nr2][nc2]) || isHostile(nr2, nc2)) {
      b[nr][nc] = 0;
      removed.push([nr, nc]);
    }
  }
  return { board: b, removed };
}

export function checkWin(board: Board): Winner {
  let kr = -1;
  let kc = -1;
  outer: for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] === 3) {
        kr = r;
        kc = c;
        break outer;
      }
    }
  }
  if (kr === -1) return 'attacker';
  if (isCorner(kr, kc)) return 'defender';
  const surrounded = DIRS.every(([dr, dc]) => {
    const nr = kr + dr;
    const nc = kc + dc;
    if (nr < 0 || nr >= N || nc < 0 || nc >= N) return false;
    return board[nr][nc] === 1 || isThrone(nr, nc) || isCorner(nr, nc);
  });
  return surrounded ? 'attacker' : null;
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
