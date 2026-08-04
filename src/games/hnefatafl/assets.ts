// ─── Hnefatafl — jeux d'assets (plateaux et pièces) ─────────────────
// Le plateau et les pièces se choisissent SÉPARÉMENT : un plateau de
// noyer peut porter des guerriers vikings, et inversement. Chaque jeu
// est décrit ici et nulle part ailleurs; ajouter une variante, c'est
// ajouter une entrée dans BOARD_SETS ou PIECE_SETS.
//
// 🚨 CALAGE PAR PLATEAU. Les constantes de placement (échelle, hauteur,
// rotation) sont MESURÉES à l'écran pour chaque modèle, jamais devinées
// ni calculées par autofit : un damier peint qui tombe à côté des cases
// cliquables rend le jeu injouable. En développement, l'accordeur
// window.__hnefBoard.tune(échelle, y, rotY, x, z) sert à mesurer, puis
// la valeur trouvée est figée ici.
//
// Les entrées `statut: 'bientot'` s'affichent en boutique, grisées :
// elles annoncent sans mentir, et n'ont pas besoin de fichier.

export type StatutAsset = 'disponible' | 'bientot';

export interface BoardSet {
  id:        string;
  statut:    StatutAsset;
  nomFR:     string;  nomEN: string;
  texteFR:   string;  texteEN: string;
  /** Vignette de boutique. */
  vignette:  string;
  /** GLB du plateau. Absent = plateau procédural (noyer et laiton). */
  url?:      string;
  /** Calage mesuré, obligatoire dès qu'il y a un `url`. */
  scale?:    number;
  y?:        number;
  rotY?:     number;
  /** Teinte du blason peint au centre, et sa présence. */
  decal?:    { couleur: number; opacite: number };
}

export interface PieceSet {
  id:        string;
  statut:    StatutAsset;
  nomFR:     string;  nomEN: string;
  texteFR:   string;  texteEN: string;
  vignette:  string;
  /** GLB par type de pièce : 1 = assaillant, 2 = défenseur, 3 = roi.
   *  Absent = pièces procédurales (cylindre et coiffe). */
  urls?:     Record<number, string>;
  /** Échelle par type. Meshy normalise ses sorties à une hauteur de
   *  1.9 (y de -0.95 à 0.95), d'où des valeurs autour de 0.45. */
  scales?:   Record<number, number>;
}

export const BOARD_SETS: BoardSet[] = [
  {
    id: 'chene',
    statut: 'disponible',
    nomFR: 'Le chêne du festival',
    nomEN: 'The festival oak',
    texteFR: 'Le plateau sculpté du FMM, entrelacs et pierres de coin, avec le blason peint au centre.',
    texteEN: 'The carved FMM board, knotwork and corner stones, with the crest painted at its centre.',
    vignette: '/games/hnefatafl/vignettes/chene.webp',
    url: '/games/hnefatafl/models/board.glb',
    scale: 7.85,
    y: -0.63,
    rotY: 0,
    decal: { couleur: 0xd8bd82, opacite: 0.36 },
  },
];

export const PIECE_SETS: PieceSet[] = [
  {
    id: 'loups',
    statut: 'disponible',
    nomFR: 'Les loups et les os',
    nomEN: 'Wolves and bone',
    texteFR: 'Assaillants à tête de loup en noyer, défenseurs d’os au bouclier, roi couronné de bronze.',
    texteEN: 'Walnut wolf-head attackers, bone defenders with shields, a bronze crowned king.',
    vignette: '/games/hnefatafl/vignettes/loups.webp',
    urls: {
      1: '/games/hnefatafl/models/piece-raider.glb',
      2: '/games/hnefatafl/models/piece-defender.glb',
      3: '/games/hnefatafl/models/piece-king.glb',
    },
    scales: { 1: 0.45, 2: 0.45, 3: 0.63 },
  },
];

// Jeux par défaut : ceux qui existaient avant la boutique.
export const BOARD_DEFAUT = 'chene';
export const PIECES_DEFAUT = 'loups';

export const boardSet = (id: string): BoardSet =>
  BOARD_SETS.find((b) => b.id === id && b.statut === 'disponible')
  ?? BOARD_SETS.find((b) => b.id === BOARD_DEFAUT)!;

export const pieceSet = (id: string): PieceSet =>
  PIECE_SETS.find((p) => p.id === id && p.statut === 'disponible')
  ?? PIECE_SETS.find((p) => p.id === PIECES_DEFAUT)!;

// ── Choix du joueur ─────────────────────────────────────────────────
// Gardé dans le navigateur pour l'instant. Quand la collection sera
// rattachée au compte (espace client), ce module sera le seul endroit à
// changer : même API, écriture vers users/{uid}/collection en plus.
const CLE_PLATEAU = 'fmm.hnefatafl.plateau';
const CLE_PIECES  = 'fmm.hnefatafl.pieces';

export function lireChoix(): { plateau: string; pieces: string } {
  try {
    return {
      plateau: localStorage.getItem(CLE_PLATEAU) || BOARD_DEFAUT,
      pieces:  localStorage.getItem(CLE_PIECES)  || PIECES_DEFAUT,
    };
  } catch {
    // Navigation privée stricte : on joue avec les jeux par défaut.
    return { plateau: BOARD_DEFAUT, pieces: PIECES_DEFAUT };
  }
}

export function ecrireChoix(plateau: string, pieces: string): void {
  try {
    localStorage.setItem(CLE_PLATEAU, plateau);
    localStorage.setItem(CLE_PIECES, pieces);
  } catch {
    /* rien à faire : le choix vaudra pour la session courante */
  }
}
