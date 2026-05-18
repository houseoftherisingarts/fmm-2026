// ─── Hnefatafl — CPU player (3 difficulty levels) ───────────────────
// Pure module: no Three.js, no React. Three tiers:
//
//   easy    — weighted-random legal moves (captures boosted)
//   medium  — 1-ply lookahead with material + king-corner heuristic
//   hard    — depth-2 minimax with α-β pruning, capture-first ordering
//
// Calls applyMove from gameLogic on temporary boards — applyMove already
// builds a fresh board copy, so callers never see the AI's scratch state.

import {
  applyMove,
  checkWin,
  hasAnyMoves,
  N,
  validMoves,
  type Board,
  type Coord,
  type Side,
} from './gameLogic';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface CpuMove {
  from: Coord;
  to: Coord;
}

// ─── Move enumeration ───────────────────────────────────────────────
function sideOf(v: number): Side | null {
  if (v === 1) return 'attacker';
  if (v === 2 || v === 3) return 'defender';
  return null;
}

function allMoves(board: Board, side: Side): CpuMove[] {
  const out: CpuMove[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (sideOf(board[r][c]) !== side) continue;
      for (const dst of validMoves(board, r, c)) {
        out.push({ from: [r, c], to: dst });
      }
    }
  }
  return out;
}

// ─── Evaluation (positive = attackers winning) ──────────────────────
// Material differential biased toward attacker count, plus king-to-
// nearest-corner Manhattan distance. Terminal positions short-circuit
// to ±1e6 inside the search.
function evaluate(board: Board): number {
  let atk = 0;
  let def = 0;
  let kr = -1;
  let kc = -1;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = board[r][c];
      if (v === 1) atk++;
      else if (v === 2) def++;
      else if (v === 3) {
        kr = r;
        kc = c;
      }
    }
  }
  if (kr === -1) return 1e6; // King already captured
  const kdist = Math.min(
    kr + kc,
    kr + (N - 1 - kc),
    (N - 1 - kr) + kc,
    (N - 1 - kr) + (N - 1 - kc),
  );
  if (kdist === 0) return -1e6; // King reached a corner
  // Attacker side weighting: more attackers good, fewer defenders good,
  // king far from any corner good. Coefficients tuned for stable play.
  return (atk - 2 * def) + kdist * 0.4;
}

function terminalScore(board: Board, maximizingSide: Side): number | null {
  const w = checkWin(board);
  if (!w) return null;
  return w === maximizingSide ? 1e6 : -1e6;
}

// ─── Easy: weighted-random ──────────────────────────────────────────
function pickEasy(board: Board, side: Side): CpuMove | null {
  const moves = allMoves(board, side);
  if (!moves.length) return null;
  const weights: number[] = [];
  let total = 0;
  for (const m of moves) {
    const { removed } = applyMove(board, m.from[0], m.from[1], m.to[0], m.to[1]);
    // Base weight 1, capture moves boosted; king captures very strongly.
    const w = 1 + removed.length * 4;
    weights.push(w);
    total += w;
  }
  let pick = Math.random() * total;
  for (let i = 0; i < moves.length; i++) {
    pick -= weights[i];
    if (pick <= 0) return moves[i];
  }
  return moves[moves.length - 1];
}

// ─── Medium: 1-ply lookahead ────────────────────────────────────────
function pickMedium(board: Board, side: Side): CpuMove | null {
  const moves = allMoves(board, side);
  if (!moves.length) return null;
  const sign = side === 'attacker' ? 1 : -1;
  let bestScore = -Infinity;
  const bestMoves: CpuMove[] = [];
  for (const m of moves) {
    const { board: nb } = applyMove(board, m.from[0], m.from[1], m.to[0], m.to[1]);
    const term = terminalScore(nb, side);
    const score = term !== null ? term : sign * evaluate(nb);
    if (score > bestScore) {
      bestScore = score;
      bestMoves.length = 0;
      bestMoves.push(m);
    } else if (score === bestScore) {
      bestMoves.push(m);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// ─── Hard: depth-2 minimax with α-β ─────────────────────────────────
function orderedMoves(board: Board, side: Side): CpuMove[] {
  const moves = allMoves(board, side);
  const captures: number[] = moves.map((m) => {
    const { removed } = applyMove(board, m.from[0], m.from[1], m.to[0], m.to[1]);
    return removed.length;
  });
  const idx = moves.map((_, i) => i);
  idx.sort((a, b) => captures[b] - captures[a]);
  return idx.map((i) => moves[i]);
}

function minimax(
  board: Board,
  side: Side,
  depth: number,
  alpha: number,
  beta: number,
  maximizingSide: Side,
): number {
  const term = terminalScore(board, maximizingSide);
  if (term !== null) return term;
  if (!hasAnyMoves(board, side)) {
    return side === maximizingSide ? -1e6 : 1e6;
  }
  if (depth === 0) {
    const sign = maximizingSide === 'attacker' ? 1 : -1;
    return sign * evaluate(board);
  }
  const next: Side = side === 'attacker' ? 'defender' : 'attacker';
  const moves = orderedMoves(board, side);
  if (side === maximizingSide) {
    let best = -Infinity;
    let a = alpha;
    for (const m of moves) {
      const { board: nb } = applyMove(board, m.from[0], m.from[1], m.to[0], m.to[1]);
      const v = minimax(nb, next, depth - 1, a, beta, maximizingSide);
      if (v > best) best = v;
      if (best > a) a = best;
      if (beta <= a) break;
    }
    return best;
  }
  let best = Infinity;
  let b = beta;
  for (const m of moves) {
    const { board: nb } = applyMove(board, m.from[0], m.from[1], m.to[0], m.to[1]);
    const v = minimax(nb, next, depth - 1, alpha, b, maximizingSide);
    if (v < best) best = v;
    if (best < b) b = best;
    if (b <= alpha) break;
  }
  return best;
}

function pickHard(board: Board, side: Side): CpuMove | null {
  const moves = orderedMoves(board, side);
  if (!moves.length) return null;
  const next: Side = side === 'attacker' ? 'defender' : 'attacker';
  let bestScore = -Infinity;
  const bestMoves: CpuMove[] = [];
  for (const m of moves) {
    const { board: nb } = applyMove(board, m.from[0], m.from[1], m.to[0], m.to[1]);
    const term = terminalScore(nb, side);
    const score = term !== null ? term : minimax(nb, next, 1, -Infinity, Infinity, side);
    if (score > bestScore) {
      bestScore = score;
      bestMoves.length = 0;
      bestMoves.push(m);
    } else if (score === bestScore) {
      bestMoves.push(m);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// ─── Public API ─────────────────────────────────────────────────────
export function pickMove(
  board: Board,
  side: Side,
  difficulty: Difficulty,
): CpuMove | null {
  switch (difficulty) {
    case 'easy':
      return pickEasy(board, side);
    case 'medium':
      return pickMedium(board, side);
    case 'hard':
      return pickHard(board, side);
  }
}
