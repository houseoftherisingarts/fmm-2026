// ─── Le Hnefatafl : l'arbitre de la table ───────────────────────────
// Alex, 2026-09-01 : « L'IA qui contrôle les jeux est vraiment très
// mauvaise. » Une des deux plaies nommées est le camp qui n'essaie plus
// de gagner et se contente d'empêcher l'autre d'y arriver. Au tafl, ce
// camp est presque toujours celui du roi : il fait aller et venir le
// même homme entre deux cases, et la partie ne finit jamais.
//
// Ce fichier est l'arbitre qui siège à côté du plateau. Il ne récrit
// aucune règle du jeu : `gameLogic.ts` reste la seule autorité sur ce
// qui est un coup légal et sur ce qui se prend. L'arbitre empile
// par-dessus les deux règles qui closent une partie enlisée, dans
// l'esprit du règlement de Copenhague :
//
//   · la même position revenue trois fois fait PERDRE le camp qui l'a
//     ramenée, ce qui interdit la répétition perpétuelle;
//   · cent vingt demi-coups sans une seule prise rendent la partie
//     nulle, ce qui closent les fins de partie stériles.
//
// L'arbitre est pur et déterministe. Les deux joueurs d'une partie en
// ligne rejouent la même liste de coups chacun de son côté et doivent
// tomber sur exactement le même verdict, sans horloge et sans hasard.
//
// ⚠️ LE RÈGLEMENT EST UNE VARIABLE DE MODULE. `gameLogic.ts` garde le
// règlement courant dans `REGLE`, que `setRegle(id)` change pour tout
// le module d'un coup. `N`, `MID`, `validMoves`, `applyMove` et
// `checkWin` le lisent à l'exécution. Deux conséquences dont il ne faut
// jamais se départir : on pose le bon règlement AVANT de raisonner (ce
// que fait `etatInitial`), et on n'en change JAMAIS au milieu d'une
// recherche, sinon l'arbre se retrouve à moitié taillé sous Copenhague
// et à moitié sous Brandubh, et la machine rend un coup qui n'a de sens
// dans aucun des deux.

import {
  applyMove, checkWin, hasAnyMoves, initBoard, isCorner, isThrone, setRegle, validMoves,
  N, REGLE,
  type Board, type Coord, type Side,
} from './gameLogic';

/** Le nombre de demi-coups sans prise au bout desquels la partie est nulle. */
export const LIMITE_SANS_PRISE = 120;

/** Le nombre de fois qu'une position peut revenir avant de coûter la partie. */
export const LIMITE_REPETITION = 3;

export type IssueTafl = Side | 'nulle';

export type CauseFin =
  | 'fuite' | 'roiPris' | 'encerclement'
  | 'blocage' | 'repetition' | 'sansPrise';

export interface VerdictTafl {
  issue: IssueTafl;
  cause: CauseFin;
}

export interface EtatTafl {
  board: Board;
  /** Le camp qui doit jouer. Les assaillants ouvrent toujours la partie. */
  tour: Side;
  /** Les demi-coups écoulés depuis la dernière prise. */
  sansPrise: number;
  /** Combien de fois chaque position (damier et trait) a déjà paru. */
  vues: Readonly<Record<string, number>>;
  /** Nul tant que la partie court. */
  verdict: VerdictTafl | null;
}

export const autreCamp = (s: Side): Side =>
  (s === 'attacker' ? 'defender' : 'attacker');

/** Le damier écrit en une ligne. Il sert de clé partout. */
export function texteDamier(b: Board): string {
  let s = '';
  for (const rangee of b) s += rangee.join('');
  return s;
}

/** La position, trait compris. C'est elle que la règle de répétition compte. */
export const clePosition = (e: EtatTafl): string =>
  `${texteDamier(e.board)}|${e.tour}`;

// ─── La respiration du camp du roi ──────────────────────────────────
// L'eau part du roi et traverse tout ce qui n'est pas un assaillant.
// Le nombre de cases atteintes dit combien le camp a d'espace, et le
// nombre de cases de bord atteintes dit s'il respire encore. Zéro case
// de bord veut dire que l'anneau s'est refermé, ce que Copenhague
// compte comme une victoire des assaillants. L'adversaire de bois s'en
// sert aussi pour mesurer combien l'étau est serré, bien avant qu'il ne
// se ferme.
export interface Respiration { cases: number; bords: number }

const DIRS: Coord[] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

export function respiration(b: Board): Respiration {
  let kr = -1;
  let kc = -1;
  for (let r = 0; r < N && kr < 0; r++) {
    for (let c = 0; c < N; c++) if (b[r][c] === 3) { kr = r; kc = c; break; }
  }
  if (kr < 0) return { cases: 0, bords: 0 };

  const vus = new Uint8Array(N * N);
  const pile: number[] = [kr * N + kc];
  let cases = 0;
  let bords = 0;
  while (pile.length) {
    const clef = pile.pop()!;
    if (vus[clef]) continue;
    vus[clef] = 1;
    const r = (clef / N) | 0;
    const c = clef % N;
    cases++;
    if (r === 0 || c === 0 || r === N - 1 || c === N - 1) bords++;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      if (b[nr][nc] === 1) continue;
      if (!vus[nr * N + nc]) pile.push(nr * N + nc);
    }
  }
  return { cases, bords };
}

// ─── Le verdict ─────────────────────────────────────────────────────
// L'ordre compte. Une vraie victoire du jeu passe avant les règles de
// l'arbitre : un roi qui atteint le coin gagne, même si la position
// revient pour la troisième fois au même instant.
export function verdictArbitre(e: EtatTafl): VerdictTafl | null {
  const gagnant = checkWin(e.board);
  if (gagnant === 'defender') return { issue: 'defender', cause: 'fuite' };
  if (gagnant === 'attacker') {
    const cause: CauseFin =
      REGLE.encerclement && respiration(e.board).bords === 0 ? 'encerclement' : 'roiPris';
    return { issue: 'attacker', cause };
  }

  // Un camp qui n'a plus un seul coup perd la partie : c'est la règle
  // de toutes les variantes, et elle vaut aussi pour les assaillants.
  if (!hasAnyMoves(e.board, e.tour)) {
    return { issue: autreCamp(e.tour), cause: 'blocage' };
  }

  // La répétition perpétuelle. Le fautif est celui qui vient de jouer,
  // donc l'inverse du camp au trait : c'est lui qui a ramené la
  // position, et c'est lui qui perd. Cette asymétrie est le coeur de la
  // règle de Copenhague, et c'est elle qui interdit au camp du roi de
  // faire la navette pour éviter de perdre.
  if ((e.vues[clePosition(e)] ?? 0) >= LIMITE_REPETITION) {
    return { issue: e.tour, cause: 'repetition' };
  }

  if (e.sansPrise >= LIMITE_SANS_PRISE) {
    return { issue: 'nulle', cause: 'sansPrise' };
  }
  return null;
}

// ─── La mise en place ───────────────────────────────────────────────
export function etatInitial(regleId: string): EtatTafl {
  // Le règlement se pose ici, une fois, avant que quoi que ce soit ne
  // lise `N` ou `REGLE`. Tout ce qui suit dans la partie en hérite.
  setRegle(regleId);
  const base: EtatTafl = {
    board: initBoard(), tour: 'attacker', sansPrise: 0, vues: {}, verdict: null,
  };
  return { ...base, vues: { [clePosition(base)]: 1 } };
}

/** Le coup est-il légal ? Vérification directe, sans dresser la liste. */
export function coupLegal(b: Board, tour: Side, from: Coord, to: Coord): boolean {
  const [fr, fc] = from;
  const [tr, tc] = to;
  if (fr < 0 || fr >= N || fc < 0 || fc >= N) return false;
  if (tr < 0 || tr >= N || tc < 0 || tc >= N) return false;
  const piece = b[fr][fc];
  if (!piece) return false;
  const camp: Side = piece === 1 ? 'attacker' : 'defender';
  if (camp !== tour) return false;
  return validMoves(b, fr, fc).some(([r, c]) => r === tr && c === tc);
}

// ─── Jouer un coup devant l'arbitre ─────────────────────────────────
/**
 * Applique un coup et rend l'état suivant, verdict compris. La liste
 * des positions vues repart à neuf après chaque prise : une prise est
 * irréversible, donc rien de ce qui précède ne pourra jamais revenir,
 * et le compteur reste court même dans une partie longue.
 */
export function appliquerCoup(e: EtatTafl, from: Coord, to: Coord): EtatTafl {
  const { board, removed } = applyMove(e.board, from[0], from[1], to[0], to[1]);
  const tour = autreCamp(e.tour);
  const suivant: EtatTafl = {
    board,
    tour,
    sansPrise: removed.length > 0 ? 0 : e.sansPrise + 1,
    vues: {},
    verdict: null,
  };
  const cle = clePosition(suivant);
  const vues = removed.length > 0
    ? { [cle]: 1 }
    : { ...e.vues, [cle]: (e.vues[cle] ?? 0) + 1 };
  const avecVues: EtatTafl = { ...suivant, vues };
  return { ...avecVues, verdict: verdictArbitre(avecVues) };
}

/**
 * La porte publique : elle refuse un coup illégal plutôt que de rendre
 * un damier faux. Une partie en ligne rejoue des coups venus du réseau,
 * et un seul coup accepté à tort ferait diverger les deux plateaux en
 * silence. La recherche, elle, passe par `appliquerCoup` : ses coups
 * sortent déjà de `validMoves`, et la vérification doublerait son coût.
 */
export function jouerArbitre(e: EtatTafl, from: Coord, to: Coord): EtatTafl {
  if (e.verdict) return e;
  if (!coupLegal(e.board, e.tour, from, to)) {
    throw new Error(
      `Coup illégal au hnefatafl : ${from[0]},${from[1]} vers ${to[0]},${to[1]}.`,
    );
  }
  return appliquerCoup(e, from, to);
}

// ─── Ce qu'on dit au joueur ─────────────────────────────────────────
const FR: Record<CauseFin, string> = {
  fuite: 'Le roi a gagné le coin et la partie avec lui. Les défenseurs l’emportent.',
  roiPris: 'Les lances se sont refermées sur le roi. Les assaillants l’emportent.',
  encerclement: 'L’anneau des assaillants s’est fermé et le camp du roi ne respire plus. Les assaillants l’emportent.',
  blocage: 'Le camp au trait n’a plus un seul coup à jouer, et perd la partie.',
  repetition: 'La même position est revenue trois fois. Celui qui l’a ramenée perd la partie.',
  sansPrise: 'Cent vingt demi-coups ont passé sans une seule prise. La partie est nulle.',
};

const EN: Record<CauseFin, string> = {
  fuite: 'The king has reached the corner and the game with it. The defenders win.',
  roiPris: 'The spears have closed around the king. The raiders win.',
  encerclement: 'The raiders’ ring has closed and the king’s side no longer breathes. The raiders win.',
  blocage: 'The side to move has not a single move left, and loses the game.',
  repetition: 'The same position has come back three times. Whoever brought it back loses the game.',
  sansPrise: 'One hundred and twenty half-moves have passed without a single capture. The game is a draw.',
};

export const TEXTES_ARBITRE = { FR, EN };

/** La phrase à afficher quand la partie se termine. */
export const texteVerdict = (v: VerdictTafl, fr: boolean): string =>
  (fr ? FR : EN)[v.cause];

/** Le camp vainqueur sous la forme attendue par les pages, ou null si nulle. */
export const gagnantDe = (v: VerdictTafl | null): Side | null =>
  (v && v.issue !== 'nulle' ? v.issue : null);

/** Les quatre coins du damier courant, dans l'ordre de lecture. */
export const coins = (): Coord[] =>
  [[0, 0], [0, N - 1], [N - 1, 0], [N - 1, N - 1]];

/** Rendu utile à l'évaluation : la case fait-elle office d'enclume ? */
export const caseHostile = (b: Board, r: number, c: number, contre: Side): boolean => {
  if (r < 0 || r >= N || c < 0 || c >= N) return false;
  if (isCorner(r, c)) return REGLE.sortieCoins;
  if (isThrone(r, c) && b[r][c] === 0) {
    // Le trône vide sert toujours d'enclume contre les assaillants. Il
    // ne sert contre les défenseurs que là où la variante le dit.
    return contre === 'attacker' ? true : REGLE.troneHostileDefenseurs;
  }
  const p = b[r][c];
  if (!p) return false;
  if (contre === 'defender') return p === 1;
  return p === 2 || (p === 3 && REGLE.roiArme);
};
