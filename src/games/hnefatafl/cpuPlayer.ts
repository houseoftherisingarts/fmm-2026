// ─── Le Hnefatafl : l'adversaire de bois ────────────────────────────
// Alex, 2026-09-01 : l'ancien joueur d'ici regardait deux choses, le
// nombre d'hommes sur le damier et la distance du roi au coin le plus
// proche. Cela suffisait pour perdre contre n'importe qui : il laissait
// le roi ouvrir deux lignes vers un coin sans broncher, puisqu'une
// ligne libre ne change ni le compte des hommes ni la distance.
//
// Le fichier est récrit sur le moteur commun de `src/games/moteur`. La
// recherche, la table de transposition, la quiescence et les dix
// marches ne vivent plus ici : ce fichier ne dit que ce que le tafl a
// de particulier, et il le dit bien.
//
// Ce que l'évaluation regarde désormais, dans l'ordre où cela décide
// des parties :
//
//   · les chemins libres du roi vers un coin. Un roi qui tient deux
//     lignes ouvertes gagne au coup suivant, parce que l'adversaire ne
//     peut en boucher qu'une. C'est LA chose à voir, et c'est celle
//     que l'ancien code ne voyait pas;
//   · le péril du roi, jusqu'à la lance qui manque pour le prendre;
//   · la garde des coins et des diagonales par les assaillants, qui est
//     tout leur plan de partie;
//   · la mobilité des deux camps et les hommes murés qui ne bougent plus;
//   · l'anneau d'encerclement, là où la variante le connaît;
//   · les prises qui pendent, des deux côtés.
//
// ⚠️ LE SIGNE. Le moteur est un negamax : `evaluer` rend une note du
// point de vue DU CAMP QUI A LE TRAIT, jamais du point de vue des
// assaillants. L'ancien fichier notait toujours pour les assaillants,
// et le jour où on l'aurait branché sur une vraie recherche il aurait
// joué contre lui-même sans que rien ne le signale. Tout se calcule ici
// du point de vue des défenseurs, puis se retourne d'un coup selon le
// trait, à un seul endroit.
//
// ⚠️ LE RÈGLEMENT. `gameLogic.ts` garde le règlement courant dans une
// variable de module que `setRegle` change pour tout le monde. On le
// pose une fois, avant de réfléchir, et on n'y touche plus tant que la
// recherche tourne.

import {
  isCorner, isThrone, setRegle, validMoves,
  N, REGLE,
  type Board, type Coord, type Side,
} from './gameLogic';
import {
  appliquerCoup, caseHostile, clePosition, respiration,
  type EtatTafl,
} from './arbitre';
import { choisirAuNiveau, type ChoixOptions, type Niveau } from '../moteur/niveaux';
import type { Adaptateur } from '../moteur/types';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface CpuMove {
  from: Coord;
  to: Coord;
}

const DIRS: Coord[] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
const AXES: Array<[Coord, Coord]> = [
  [[0, 1], [0, -1]],
  [[1, 0], [-1, 0]],
];

/** Le roi disparu ne se note pas, il se tranche. La recherche voit la
 *  fin par `fini`; cette note ne sert qu'aux positions bâtardes. */
const SANS_ROI = -50_000;

// ─── Les coups ──────────────────────────────────────────────────────
export function coupsTafl(e: EtatTafl): CpuMove[] {
  if (e.verdict) return [];
  const out: CpuMove[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = e.board[r][c];
      if (!v) continue;
      const camp: Side = v === 1 ? 'attacker' : 'defender';
      if (camp !== e.tour) continue;
      for (const dst of validMoves(e.board, r, c)) out.push({ from: [r, c], to: dst });
    }
  }
  return out;
}

// ─── La garde des coins ─────────────────────────────────────────────
// Le plan des assaillants tient en une phrase : fermer les quatre
// coins avant que le roi n'y coure. La table dit ce que vaut chaque
// case pour eux, une fois pour toutes. Les deux cases qui bouchent les
// lignes du coin valent le plus, puis vient la diagonale qui barre le
// quadrant à deux et trois cases, celle que les traités anciens
// appellent la garde.
const GARDES = new Map<number, number[][]>();

export function tableGarde(taille: number): number[][] {
  const dejaLa = GARDES.get(taille);
  if (dejaLa) return dejaLa;
  const t: number[][] = Array.from({ length: taille }, () => new Array<number>(taille).fill(0));
  const dedans = (r: number, c: number) => r >= 0 && r < taille && c >= 0 && c < taille;
  for (const [cr, cc] of [[0, 0], [0, taille - 1], [taille - 1, 0], [taille - 1, taille - 1]]) {
    const dr = cr === 0 ? 1 : -1;
    const dc = cc === 0 ? 1 : -1;
    t[cr + dr][cc] += 30;
    t[cr][cc + dc] += 30;
    t[cr + dr][cc + dc] += 24;
    for (const d of [2, 3]) {
      for (let k = 0; k <= d; k++) {
        const r = cr + dr * k;
        const c = cc + dc * (d - k);
        if (dedans(r, c)) t[r][c] += d === 2 ? 20 : 12;
      }
    }
  }
  GARDES.set(taille, t);
  return t;
}

const distanceCoin = (r: number, c: number): number =>
  Math.min(r + c, r + (N - 1 - c), (N - 1 - r) + c, (N - 1 - r) + (N - 1 - c));

// ─── Les chemins du roi ─────────────────────────────────────────────
/** Le segment droit entre deux cases est-il libre, la case d'arrivée comprise ? */
function segmentLibre(b: Board, r1: number, c1: number, r2: number, c2: number): boolean {
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  let r = r1 + dr;
  let c = c1 + dc;
  while (r !== r2 || c !== c2) {
    if (b[r][c] !== 0) return false;
    r += dr;
    c += dc;
  }
  return b[r2][c2] === 0;
}

/**
 * Les routes que le roi a vers un coin. `enUn` compte les lignes
 * droites déjà ouvertes : une seule se bouche, deux ne se bouchent pas,
 * et le roi qui en tient deux a gagné la partie au coup suivant.
 * `enDeux` compte les chemins en équerre, ceux qui vont mûrir.
 */
export function routesRoi(b: Board, kr: number, kc: number): { enUn: number; enDeux: number } {
  let enUn = 0;
  let enDeux = 0;
  for (const [cr, cc] of [[0, 0], [0, N - 1], [N - 1, 0], [N - 1, N - 1]]) {
    if (kr === cr || kc === cc) {
      if (segmentLibre(b, kr, kc, cr, cc)) enUn++;
      continue;
    }
    // Les deux équerres : par la rangée puis la colonne, ou l'inverse.
    for (const [pr, pc] of [[kr, cc], [cr, kc]]) {
      if (isCorner(pr, pc)) continue;
      if (segmentLibre(b, kr, kc, pr, pc) && segmentLibre(b, pr, pc, cr, cc)) enDeux++;
    }
  }
  return { enUn, enDeux };
}

// ─── La mobilité, sans allouer ──────────────────────────────────────
// Le compte suit les mêmes règles que `validMoves`, sans en dresser la
// liste : l'évaluation tourne à chaque feuille de l'arbre, et le tafl a
// une centaine de coups par position. Ce n'est qu'une mesure, une
// divergence d'une case ne fausserait rien.
function nbDestinations(b: Board, r: number, c: number): number {
  const p = b[r][c];
  if (!p) return 0;
  const roi = p === 3;
  let n = 0;
  for (const [dr, dc] of DIRS) {
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < N && nc >= 0 && nc < N) {
      if (b[nr][nc]) break;
      if (isCorner(nr, nc) && !(roi && REGLE.sortieCoins)) break;
      if (!roi && isThrone(nr, nc)) { nr += dr; nc += dc; continue; }
      n++;
      nr += dr;
      nc += dc;
    }
  }
  return n;
}

/** Un homme de ce camp peut-il gagner cette case vide en un seul coup ? */
function atteignablePar(b: Board, r: number, c: number, camp: Side): boolean {
  for (const [dr, dc] of DIRS) {
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < N && nc >= 0 && nc < N) {
      const p = b[nr][nc];
      if (p) {
        // Le premier homme rencontré barre la ligne : ou bien c'est le
        // mien et il peut venir, ou bien plus rien ne passe par là.
        const bonCamp = camp === 'attacker'
          ? p === 1
          : p === 2 || (p === 3 && REGLE.roiArme);
        if (bonCamp) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return false;
}

/** La pièce est-elle prenable au prochain coup adverse ? Le roi non :
 *  il tombe sous une autre règle, comptée par `perilRoi`. */
function enPrise(b: Board, r: number, c: number): boolean {
  const p = b[r][c];
  if (!p || p === 3) return false;
  const camp: Side = p === 1 ? 'attacker' : 'defender';
  const ennemi: Side = camp === 'attacker' ? 'defender' : 'attacker';
  for (const [a, z] of AXES) {
    for (const [enclume, marteau] of [[a, z], [z, a]]) {
      if (!caseHostile(b, r + enclume[0], c + enclume[1], camp)) continue;
      const mr = r + marteau[0];
      const mc = c + marteau[1];
      if (mr < 0 || mr >= N || mc < 0 || mc >= N) continue;
      if (b[mr][mc] !== 0 || isCorner(mr, mc) || isThrone(mr, mc)) continue;
      if (atteignablePar(b, mr, mc, ennemi)) return true;
    }
  }
  return false;
}

/** Ce que coûte au camp du roi l'étau qui se referme sur lui. */
function perilRoi(b: Board, kr: number, kc: number): number {
  const auBord = kr === 0 || kc === 0 || kr === N - 1 || kc === N - 1;
  const cerne = (r: number, c: number): boolean => {
    if (r < 0 || r >= N || c < 0 || c >= N) return false;
    return b[r][c] === 1 || (isThrone(r, c) && b[r][c] === 0) || isCorner(r, c);
  };
  const libre = (r: number, c: number): boolean =>
    r >= 0 && r < N && c >= 0 && c < N && b[r][c] === 0
    && !isCorner(r, c) && !isThrone(r, c);

  if (REGLE.roiPrisA === 4) {
    // À Copenhague le roi collé au bord est imprenable : l'y pousser
    // n'est pas un danger, c'est même souvent sa meilleure route.
    if (auBord && !REGLE.roiPrisAuBord) return 0;
    const cotes = DIRS
      .map(([dr, dc]) => [kr + dr, kc + dc] as Coord)
      .filter(([r, c]) => r >= 0 && r < N && c >= 0 && c < N);
    const manquant = cotes.filter(([r, c]) => !cerne(r, c));
    if (manquant.length === 1) {
      const [mr, mc] = manquant[0];
      return libre(mr, mc) && atteignablePar(b, mr, mc, 'attacker') ? 3000 : 700;
    }
    const tenus = cotes.length - manquant.length;
    return tenus * tenus * 45;
  }

  // Le roi désarmé des règles galloise et irlandaise tombe sous deux
  // lances en ligne : une seule lance posée est déjà la moitié du chemin.
  let peril = 0;
  for (const [a, z] of AXES) {
    const cA = cerne(kr + a[0], kc + a[1]);
    const cZ = cerne(kr + z[0], kc + z[1]);
    if (cA && cZ) return 5000;
    if (!cA && !cZ) continue;
    const mr = cA ? kr + z[0] : kr + a[0];
    const mc = cA ? kc + z[1] : kc + a[1];
    peril += libre(mr, mc) && atteignablePar(b, mr, mc, 'attacker') ? 2200 : 260;
  }
  return peril;
}

// ─── L'évaluation, vue par les défenseurs ───────────────────────────
// Tout ce qui suit se compte en centièmes de point, du point de vue du
// camp du roi. Le retournement selon le trait se fait plus bas, à un
// seul endroit, et c'est ce qui garde le signe honnête.
export function evaluerDefense(b: Board): number {
  const garde = tableGarde(N);
  let att = 0;
  let def = 0;
  let kr = -1;
  let kc = -1;
  let mobAtt = 0;
  let mobDef = 0;
  let mobRoi = 0;
  let muresAtt = 0;
  let muresDef = 0;
  let gardeAtt = 0;
  let prisAtt = 0;
  let prisDef = 0;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = b[r][c];
      if (!v) continue;
      const n = nbDestinations(b, r, c);
      if (v === 1) {
        att++;
        mobAtt += n;
        if (n === 0) muresAtt++;
        gardeAtt += garde[r][c];
        if (enPrise(b, r, c)) prisAtt++;
      } else if (v === 2) {
        def++;
        mobDef += n;
        if (n === 0) muresDef++;
        if (enPrise(b, r, c)) prisDef++;
      } else {
        kr = r;
        kc = c;
        mobRoi = n;
        mobDef += n;
      }
    }
  }
  if (kr < 0) return SANS_ROI;

  // Le matériel. Un défenseur vaut près de deux assaillants : ils sont
  // deux fois moins nombreux, et l'échange un pour un ruine leur camp.
  let s = 190 * def - 100 * att;

  // Les chemins du roi vers un coin, le coeur de l'affaire.
  const { enUn, enDeux } = routesRoi(b, kr, kc);
  if (enUn >= 2) s += 6000;
  else if (enUn === 1) s += 850;
  s += 220 * Math.min(enDeux, 4);
  s += (N - distanceCoin(kr, kc)) * 10;

  // Le péril du roi, et le roi muré qui ne peut plus fuir.
  s -= perilRoi(b, kr, kc);
  if (mobRoi === 0) s -= 300;

  // La garde des coins et des diagonales tenue par les assaillants.
  s -= gardeAtt;

  // La mobilité, et les hommes que plus personne ne peut sortir.
  s += 4 * mobDef - 2 * mobAtt;
  s -= 45 * muresDef;
  s += 25 * muresAtt;

  // Les prises qui pendent au prochain coup.
  s += 55 * prisAtt - 85 * prisDef;

  // L'anneau, là où la variante en fait une victoire.
  if (REGLE.encerclement) {
    const { cases, bords } = respiration(b);
    s -= (8 - Math.min(bords, 8)) * 55;
    if (cases < 40) s -= (40 - cases) * 18;
  }
  return s;
}

// ─── L'ordre des coups et la quiescence ─────────────────────────────
/** Le coup prendrait-il un homme ? Vérification directe sur le damier,
 *  sans recopier le plateau : elle sert à trier des centaines de coups
 *  par position. Le mur de boucliers lui échappe, et c'est sans
 *  conséquence : il n'a qu'à ne pas être suivi par la quiescence. */
function prendrait(b: Board, from: Coord, to: Coord): boolean {
  const piece = b[from[0]][from[1]];
  if (piece === 3 && !REGLE.roiArme) return false;
  const camp: Side = piece === 1 ? 'attacker' : 'defender';
  const [tr, tc] = to;
  for (const [dr, dc] of DIRS) {
    const nr = tr + dr;
    const nc = tc + dc;
    if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
    const cible = b[nr][nc];
    if (!cible || cible === 3) continue;
    const campCible: Side = cible === 1 ? 'attacker' : 'defender';
    if (campCible === camp) continue;
    const ar = nr + dr;
    const ac = nc + dc;
    // La pièce qui bouge a quitté sa case : elle n'y fait plus enclume.
    if (ar === from[0] && ac === from[1]) continue;
    if (caseHostile(b, ar, ac, campCible)) return true;
  }
  return false;
}

const estUneSortie = (b: Board, from: Coord, to: Coord): boolean => {
  if (b[from[0]][from[1]] !== 3) return false;
  return REGLE.sortieCoins
    ? isCorner(to[0], to[1])
    : to[0] === 0 || to[1] === 0 || to[0] === N - 1 || to[1] === N - 1;
};

const bruyant = (e: EtatTafl, c: CpuMove): boolean =>
  prendrait(e.board, c.from, c.to) || estUneSortie(e.board, c.from, c.to);

function promesse(e: EtatTafl, c: CpuMove): number {
  const piece = e.board[c.from[0]][c.from[1]];
  if (piece === 3) {
    // Le roi qui se rapproche d'un coin passe en premier : c'est son but.
    return 12 + Math.max(0, distanceCoin(c.from[0], c.from[1]) - distanceCoin(c.to[0], c.to[1])) * 2;
  }
  if (piece === 1) return Math.min(tableGarde(N)[c.to[0]][c.to[1]] / 6, 8);
  return 0;
}

// ─── L'adaptateur ───────────────────────────────────────────────────
export function adaptateurTafl(regleId: string): Adaptateur<EtatTafl, CpuMove> {
  // Le règlement se pose une fois, ici, et ne bouge plus de toute la
  // recherche : `N`, `validMoves` et `applyMove` le lisent à chaque nœud.
  setRegle(regleId);
  return {
    coups: coupsTafl,
    jouer: (e, c) => appliquerCoup(e, c.from, c.to),
    fini: (e) => {
      const v = e.verdict;
      if (!v) return null;
      if (v.issue === 'nulle') return 0;
      // Le verdict nomme un camp; le trait a déjà changé de main. Le
      // camp au trait a donc gagné quand le verdict le nomme lui.
      return v.issue === e.tour ? 1 : -1;
    },
    evaluer: (e) => {
      const s = evaluerDefense(e.board);
      return e.tour === 'defender' ? s : -s;
    },
    cle: (e) => {
      // La clé porte le trait, le compteur de la règle des cent vingt
      // et le nombre de fois que la position a déjà paru : deux damiers
      // identiques dont l'un est à un coup de la nulle ne valent pas
      // la même chose, et les confondre ferait mentir la table.
      const p = clePosition(e);
      return `${p}|${e.sansPrise}|${e.vues[p] ?? 0}`;
    },
    nomCoup: (c) => `${c.from[0]},${c.from[1]}>${c.to[0]},${c.to[1]}`,
    bruyant,
    promesse,
  };
}

export interface OptionsTafl extends ChoixOptions {
  /** Le règlement à poser avant de réfléchir. Défaut : celui en cours. */
  regleId?: string;
}

/** Le coup que joue la machine à cette marche, arbitre compris. */
export function choisirCoupNiveau(
  etat: EtatTafl, niveau: Niveau, options: OptionsTafl = {},
): CpuMove | null {
  const a = adaptateurTafl(options.regleId ?? REGLE.id);
  return choisirAuNiveau(a, etat, niveau, options);
}

// ─── L'ancienne porte, gardée ouverte ───────────────────────────────
// La page de jeu offre encore trois boutons, et `index.tsx` les appelle
// sur le fil principal, entre deux images de la scène. Deux choses se
// règlent donc ici, et nulle part ailleurs, puisque tout ce que la page
// demande à la machine passe par cette porte.
//
// LE PLAFOND DE NŒUDS. Les marches un à cinq n'ont aucune horloge dans
// `NIVEAUX`, et personne ne leur en donnait une en passant par ici. Le
// bouton « Moyen » cherchait donc jusqu'au bout de sa profondeur trois,
// ce qui gelait la scène deux secondes et deux dixièmes sur un damier de
// Copenhague, et jusqu'à cinq secondes et demie quand la machine avait
// autre chose à faire. Il était par là même plus lent que le bouton
// « Difficile », que son horloge d'une seconde bornait déjà. Un plafond
// de nœuds borne les trois boutons du même geste, il les rend
// reproductibles d'une partie à l'autre, et il retire au connétable la
// seule raison qu'il avait de ne pas descendre jusqu'ici.
//
// LES TROIS MARCHES. Mesurées les unes contre les autres, à graine fixe,
// sur les deux damiers : le connétable bat le sergent vingt et une fois
// sur vingt-deux, le sergent bat le vilain dix-sept fois sur vingt-deux,
// et le connétable ne perd aucune des vingt-deux parties contre le
// vilain. La marche huit avait la place du connétable et perdait contre
// la marche cinq, dix parties sur douze : sous plafond comme sous
// horloge, sa quiescence lui coûte plus de profondeur qu'elle ne lui en
// rend, et le joueur qui cliquait « Difficile » recevait un adversaire
// plus tendre que celui du milieu.
// Le budget de nœuds de la porte synchrone, marche par marche. Un
// plafond unique pour les trois boutons les rendait équivalents : au
// même budget, la marche 10 et la marche 5 s'arrêtent à la même
// profondeur et jouent la même partie (mesuré le 2026-09-01, le bouton
// « difficile » ne gagnait que deux parties sur six contre « moyen »).
// Le budget monte donc avec le bouton, en restant sous la seconde pour
// ne pas figer la scène. La vraie force du connétable, elle, se joue
// dans le travailleur de fond, où l'horloge lui laisse ses 2,6 s.
const NOEUDS_FIL_PRINCIPAL: Record<Difficulty, number> = {
  easy: 800, medium: 2_500, hard: 9_000,
};

const MARCHE_PAR_DIFFICULTE: Record<Difficulty, Niveau> = {
  easy: 2, medium: 5, hard: 10,
};

/**
 * L'appel historique, branché sur le nouveau moteur. Un damier nu ne
 * porte ni l'historique des positions ni le compteur des prises : la
 * règle de la répétition ne peut donc pas s'appliquer ici, et c'est la
 * page qui tient le compte quand elle passe par l'arbitre.
 */
export function pickMove(
  board: Board,
  side: Side,
  difficulty: Difficulty,
): CpuMove | null {
  const etat: EtatTafl = { board, tour: side, sansPrise: 0, vues: {}, verdict: null };
  return choisirCoupNiveau(etat, MARCHE_PAR_DIFFICULTE[difficulty], {
    noeudsMax: NOEUDS_FIL_PRINCIPAL[difficulty],
  });
}
