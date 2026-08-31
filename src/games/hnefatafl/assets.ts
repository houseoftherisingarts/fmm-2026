// ─── Hnefatafl : jeux d'assets (plateaux et pièces) ─────────────────
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

// 'recompense' : le jeu existe mais ne se débloque qu'à la roue des
// sept jours (bourses/{uid}.taflPieces, voir RecompensesQuotidiennes).
export type StatutAsset = 'disponible' | 'bientot' | 'recompense';

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
  /** Palette du plateau procédural (voir PALETTES dans boardMesh). */
  palette?:  'noyer' | 'pierre' | 'taverne' | 'caravane';
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
  /** Teintes des pièces tournées, quand il n'y a pas de modèle 3D. */
  teintes?:  { assaillant: number; defenseur: number; roi: number };
  /** Pièces construites en géométrie (caravaneMesh.ts), sans GLB. */
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
    palette: 'noyer',
  },
  {
    id: 'pierre',
    statut: 'disponible',
    nomFR: 'La pierre runique',
    nomEN: 'The rune stone',
    texteFR: 'Un damier taillé net dans la pierre, filets de fer et trône de mousse. Sobre, lisible, et il s\u2019ouvre sans rien faire attendre.',
    texteEN: 'A grid cut cleanly into stone, iron rails and a mossy throne. Plain, legible, and it opens with nothing to wait for.',
    vignette: '/games/hnefatafl/vignettes/pierre.webp',
    palette: 'pierre',
    decal: { couleur: 0xc8d0d8, opacite: 0.22 },
  },
  {
    id: 'caravane',
    statut: 'recompense',
    nomFR: 'La route de la caravane',
    nomEN: 'The caravan road',
    texteFR: 'Un plateau peint comme une roulotte : vert de roulotte et bordeaux, filets ocre. Se gagne avec la caravane, au troisième jour de visite d\u2019affilée.',
    texteEN: 'A board painted like a wagon: vardo green and burgundy, ochre lines. Earned with the caravan, on the third daily visit in a row.',
    vignette: '/games/hnefatafl/vignettes/route-caravane.webp',
    palette: 'caravane',
  },
  {
    id: 'bientot',
    statut: 'bientot',
    nomFR: 'D\u2019autres plateaux',
    nomEN: 'More boards',
    texteFR: 'De nouveaux plateaux arrivent, dont ceux de nos commanditaires : soutenir le festival, c\u2019est aussi avoir sa table.',
    texteEN: 'New boards are on the way, including our sponsors\u2019: backing the festival also means having your own table.',
    vignette: '',
  },
  {
    id: 'taverne',
    statut: 'disponible',
    nomFR: 'La table de la taverne',
    nomEN: 'The tavern table',
    texteFR: 'Le damier gravé dans le chêne sombre, entrelacs au pourtour, posé sur les planches d\u2019une table de salle basse.',
    texteEN: 'The grid carved into dark oak, knotwork around the rim, resting on the planks of a low tavern table.',
    vignette: '/games/hnefatafl/vignettes/table-taverne.webp',
    palette: 'taverne',
    decal: { couleur: 0xc9a227, opacite: 0.34 },
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
  {
    id: 'jarl',
    statut: 'disponible',
    nomFR: 'La hird du Jarl',
    nomEN: 'The Jarl\u2019s hird',
    texteFR: 'Des hommes, pas des bêtes : guerriers à la hache et au bouclier rond, porteuses de pavois, et un Jarl en manteau de fourrure à la place du roi couronné.',
    texteEN: 'Men, not beasts: axe and round-shield warriors, shield-bearers, and a fur-cloaked Jarl in place of the crowned king.',
    vignette: '/games/hnefatafl/vignettes/jarl.webp',
    urls: {
      1: '/games/hnefatafl/models/piece-raider2.glb',
      2: '/games/hnefatafl/models/piece-defender2.glb',
      3: '/games/hnefatafl/models/piece-jarl.glb',
    },
    scales: { 1: 0.54, 2: 0.54, 3: 0.74 },
  },
  {
    id: 'taverne',
    statut: 'disponible',
    nomFR: 'Le jeu de la taverne',
    nomEN: 'The tavern set',
    texteFR: 'Des pièces tournées à la main, comme celles qui traînent sur les tables du festival : l\u2019érable clair pour les défenseurs, le bois teint au sang pour les assaillants, et un roi couronné de laiton.',
    texteEN: 'Hand-turned pieces, the kind that sit on the festival tables: pale maple for the defenders, blood-stained wood for the attackers, and a king crowned in brass.',
    vignette: '/games/hnefatafl/vignettes/taverne.webp',
    teintes: { assaillant: 0x7b2018, defenseur: 0xd9c49a, roi: 0xc9a227 },
  },
  {
    id: 'caravane',
    statut: 'recompense',
    nomFR: 'La caravane',
    nomEN: 'The caravan',
    texteFR: 'Une roulotte de gitans pour roi, qui doit gagner un coin du plateau; des hommes de la route au foulard rouge à l\u2019assaut, des femmes en jupe rayée pour la défendre. Se gagne au troisième jour de visite d\u2019affilée.',
    texteEN: 'A gypsy wagon for a king, bound for a corner of the board; red-scarfed men of the road on the attack, women in striped skirts to defend it. Earned on the third daily visit in a row.',
    vignette: '/games/hnefatafl/vignettes/caravane.webp',
    urls: {
      1: '/games/hnefatafl/models/caravane-homme.glb',
      2: '/games/hnefatafl/models/caravane-femme.glb',
      3: '/games/hnefatafl/models/caravane-roulotte.glb',
    },
    scales: { 1: 0.58, 2: 0.58, 3: 0.72 },
    teintes: { assaillant: 0x233b5c, defenseur: 0x7a1f3a, roi: 0x8a2430 },
  },
  {
    id: 'bientot',
    statut: 'bientot',
    nomFR: 'D\u2019autres troupes',
    nomEN: 'More companies',
    texteFR: 'De nouvelles pièces arrivent. Les commanditaires du festival auront les leurs.',
    texteEN: 'New pieces are on the way. Festival sponsors will have their own.',
    vignette: '',
  },
];

// Jeux par défaut, choisis à l'œil : le chêne du festival porte le blason
// et c'est la table du FMM, et la hird du Jarl sculpte de vrais hommes là
// où les loups restaient des bêtes. Un joueur qui a déjà choisi garde son
// choix, gardé dans le navigateur.
export const BOARD_DEFAUT = 'chene';
export const PIECES_DEFAUT = 'jarl';

export const boardSet = (id: string): BoardSet =>
  BOARD_SETS.find((b) => b.id === id && b.statut !== 'bientot')
  ?? BOARD_SETS.find((b) => b.id === BOARD_DEFAUT)!;

export const pieceSet = (id: string): PieceSet =>
  PIECE_SETS.find((p) => p.id === id && p.statut !== 'bientot')
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
