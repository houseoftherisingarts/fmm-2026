// ─── La Mérelle : les règles, sans une ligne de rendu ───────────────
// Alex, 2026-08-30 : tout ce fichier est pur. Aucun accès au DOM, aucun
// Three.js, aucun React. C'est ce qui permet de le passer au banc
// d'essai (logic.test.ts) et de le donner à l'ordinateur (cpu.ts) sans
// monter une scène.
//
// Le plateau porte vingt-quatre points, répartis sur trois carrés
// emboîtés que relient les milieux des côtés. La numérotation suit la
// lecture, de haut en bas et de gauche à droite :
//
//   00-----------01-----------02
//    |            |            |
//    |  03-------04-------05   |
//    |   |        |        |   |
//    |   |  06---07---08   |   |
//    |   |   |         |   |   |
//   09--10--11        12--13--14
//    |   |   |         |   |   |
//    |   |  15---16---17   |   |
//    |   |        |        |   |
//    |  18-------19-------20   |
//    |            |            |
//   21-----------22-----------23

export type Camp = 1 | 2;
export type Case = 0 | Camp;

export type Coup =
  | { type: 'pose'; vers: number }
  | { type: 'deplacement'; de: number; vers: number }
  | { type: 'retrait'; p: number };

export interface Etat {
  /** Vingt-quatre cases : 0 vide, 1 chêne clair, 2 bois teint. */
  points: Case[];
  tour: Camp;
  /** Pions qu'il reste à poser, par camp : [camp 1, camp 2]. */
  aPoser: [number, number];
  /** Un moulin vient de se former : le même joueur retire un pion. */
  doitRetirer: boolean;
  /** La variante du vol : à trois pions, on saute où l'on veut. */
  vol: boolean;
  gagnant: Camp | null;
}

export const PIONS_PAR_CAMP = 9;

/** Les seize alignements du plateau. Jamais de diagonale : les carrés
 *  emboîtés n'en portent pas, et c'est la faute la plus courante quand
 *  on découvre le jeu. */
export const LIGNES: ReadonlyArray<readonly [number, number, number]> = [
  // Les huit rangées
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [9, 10, 11], [12, 13, 14],
  [15, 16, 17], [18, 19, 20], [21, 22, 23],
  // Les huit colonnes
  [0, 9, 21], [3, 10, 18], [6, 11, 15],
  [1, 4, 7], [16, 19, 22],
  [8, 12, 17], [5, 13, 20], [2, 14, 23],
];

/** Les arêtes gravées dans le bois : deux points consécutifs d'une même
 *  ligne se touchent, et rien d'autre. Le voisinage du jeu se déduit
 *  donc entièrement des alignements, sans seconde table à tenir à jour. */
export const ARETES: ReadonlyArray<readonly [number, number]> = LIGNES.flatMap(
  ([a, b, c]) => [[a, b] as const, [b, c] as const],
);

const VOISINS: number[][] = (() => {
  const v: number[][] = Array.from({ length: 24 }, () => []);
  for (const [a, b] of ARETES) { v[a].push(b); v[b].push(a); }
  return v;
})();

export function voisins(p: number): readonly number[] { return VOISINS[p]; }

/** La position de chaque point sur la grille du plateau, en unités de
 *  case, l'origine au centre. Le rendu 3D et la texture gravée s'en
 *  servent tous les deux : une seule géométrie de référence. */
export const POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [-3, -3], [0, -3], [3, -3],
  [-2, -2], [0, -2], [2, -2],
  [-1, -1], [0, -1], [1, -1],
  [-3, 0], [-2, 0], [-1, 0], [1, 0], [2, 0], [3, 0],
  [-1, 1], [0, 1], [1, 1],
  [-2, 2], [0, 2], [2, 2],
  [-3, 3], [0, 3], [3, 3],
];

export function autreCamp(c: Camp): Camp { return c === 1 ? 2 : 1; }

export function etatInitial(vol = true): Etat {
  return {
    points: Array(24).fill(0) as Case[],
    tour: 1,
    aPoser: [PIONS_PAR_CAMP, PIONS_PAR_CAMP],
    doitRetirer: false,
    vol,
    gagnant: null,
  };
}

export function compte(points: readonly Case[], camp: Camp): number {
  let n = 0;
  for (const c of points) if (c === camp) n++;
  return n;
}

export function aPoserDe(e: Etat, camp: Camp): number { return e.aPoser[camp - 1]; }

/** Ce que le camp est en train de faire : poser ses pions, les glisser
 *  d'un point à l'autre, ou voler d'un bout à l'autre du plateau. */
export function phaseDe(e: Etat, camp: Camp): 'pose' | 'deplacement' | 'vol' {
  if (aPoserDe(e, camp) > 0) return 'pose';
  if (e.vol && compte(e.points, camp) === 3) return 'vol';
  return 'deplacement';
}

/** Le point p ferme-t-il un alignement complet ? */
export function estDansMoulin(points: readonly Case[], p: number): boolean {
  const camp = points[p];
  if (!camp) return false;
  return LIGNES.some((l) => l.includes(p) && l.every((q) => points[q] === camp));
}

/** Combien d'alignements complets ce camp tient-il ? */
export function moulins(points: readonly Case[], camp: Camp): number {
  return LIGNES.filter((l) => l.every((q) => points[q] === camp)).length;
}

export function pointsLibres(points: readonly Case[]): number[] {
  const libres: number[] = [];
  for (let i = 0; i < 24; i++) if (points[i] === 0) libres.push(i);
  return libres;
}

/** Les pions adverses qu'on a le droit de retirer. Ceux qui tiennent un
 *  moulin sont protégés, sauf quand tous le sont : sans cette exception,
 *  la partie se bloquerait. */
export function retraitsPossibles(e: Etat): number[] {
  const cible = autreCamp(e.tour);
  const tous: number[] = [];
  const hors: number[] = [];
  for (let i = 0; i < 24; i++) {
    if (e.points[i] !== cible) continue;
    tous.push(i);
    if (!estDansMoulin(e.points, i)) hors.push(i);
  }
  return hors.length > 0 ? hors : tous;
}

export function deplacementsDe(e: Etat, camp: Camp): Array<{ de: number; vers: number }> {
  const sortie: Array<{ de: number; vers: number }> = [];
  const libres = pointsLibres(e.points);
  const vole = phaseDe(e, camp) === 'vol';
  for (let i = 0; i < 24; i++) {
    if (e.points[i] !== camp) continue;
    if (vole) { for (const l of libres) sortie.push({ de: i, vers: l }); continue; }
    for (const v of VOISINS[i]) if (e.points[v] === 0) sortie.push({ de: i, vers: v });
  }
  return sortie;
}

export function coupsLegaux(e: Etat): Coup[] {
  if (e.gagnant) return [];
  if (e.doitRetirer) return retraitsPossibles(e).map((p) => ({ type: 'retrait', p }));
  if (aPoserDe(e, e.tour) > 0) {
    return pointsLibres(e.points).map((vers) => ({ type: 'pose', vers }));
  }
  return deplacementsDe(e, e.tour).map(({ de, vers }) => ({ type: 'deplacement', de, vers }));
}

/** Les points où le pion sélectionné peut aller. Rendu à l'écran par la
 *  surbrillance, et rien d'autre ne décide de ce qui s'allume. */
export function destinations(e: Etat, de: number): number[] {
  if (e.gagnant || e.doitRetirer) return [];
  if (e.points[de] !== e.tour) return [];
  if (aPoserDe(e, e.tour) > 0) return [];
  if (phaseDe(e, e.tour) === 'vol') return pointsLibres(e.points);
  return VOISINS[de].filter((v) => e.points[v] === 0);
}

function copier(e: Etat): Etat {
  return { ...e, points: e.points.slice(), aPoser: [e.aPoser[0], e.aPoser[1]] };
}

/** Passe la main et regarde si la partie se termine là. Un joueur perd
 *  quand il tombe à deux pions ou qu'aucun de ses pions ne peut bouger,
 *  et jamais pendant la pose : il lui reste des pions en main. */
function passerLaMain(e: Etat): Etat {
  const suivant = autreCamp(e.tour);
  e.tour = suivant;
  e.doitRetirer = false;
  if (aPoserDe(e, suivant) > 0) return e;
  if (compte(e.points, suivant) < 3) { e.gagnant = autreCamp(suivant); return e; }
  if (deplacementsDe(e, suivant).length === 0) { e.gagnant = autreCamp(suivant); return e; }
  return e;
}

/** Le pion vient de se poser : si l'alignement est complet, le même
 *  joueur garde la main pour retirer. Sinon la main passe. */
function apresPose(e: Etat, vers: number): Etat {
  if (estDansMoulin(e.points, vers) && retraitsPossibles(e).length > 0) {
    e.doitRetirer = true;
    return e;
  }
  return passerLaMain(e);
}

/** Joue un coup et rend un état neuf. Un coup illégal rend l'état
 *  d'origine inchangé : c'est la frontière de confiance du jeu, tous
 *  les clics de la scène 3D passent par ici. */
export function jouer(e: Etat, coup: Coup): Etat {
  if (e.gagnant) return e;
  const n = copier(e);

  if (coup.type === 'retrait') {
    if (!e.doitRetirer) return e;
    if (!retraitsPossibles(e).includes(coup.p)) return e;
    n.points[coup.p] = 0;
    return passerLaMain(n);
  }

  if (e.doitRetirer) return e;

  if (coup.type === 'pose') {
    if (aPoserDe(e, e.tour) === 0) return e;
    if (e.points[coup.vers] !== 0) return e;
    n.points[coup.vers] = e.tour;
    n.aPoser[e.tour - 1] -= 1;
    return apresPose(n, coup.vers);
  }

  if (aPoserDe(e, e.tour) > 0) return e;
  if (!destinations(e, coup.de).includes(coup.vers)) return e;
  n.points[coup.de] = 0;
  n.points[coup.vers] = e.tour;
  return apresPose(n, coup.vers);
}
