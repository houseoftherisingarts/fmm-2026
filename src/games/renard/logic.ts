// ─── Le Renard et les Oies : la règle, sans rien à l'écran ──────────
// Alex, 2026-08-30 : tout ce qui décide d'un coup vit ici, en pur
// TypeScript, pour que la logique se teste au terminal (logic.test.ts)
// sans monter une scène Three.js. La recherche historique qui fixe ces
// choix est dans HISTOIRE.md, à côté.
//
// Le plateau est une croix de 33 points taillée dans une grille de 7
// par 7 : les quatre carrés de coin, de 2 par 2, sont retirés. Les
// points sont numérotés de 0 à 32, de haut en bas et de gauche à
// droite. La rangée 0 est celle du haut, là où le renard tient sa
// tanière; les oies montent depuis la rangée 6.

export const COTE = 7;

export interface Point { r: number; c: number; }

/** Un point de la grille appartient-il à la croix ? */
const surLaCroix = (r: number, c: number): boolean =>
  r >= 0 && r < COTE && c >= 0 && c < COTE && ((c >= 2 && c <= 4) || (r >= 2 && r <= 4));

export const POINTS: readonly Point[] = (() => {
  const liste: Point[] = [];
  for (let r = 0; r < COTE; r++) {
    for (let c = 0; c < COTE; c++) if (surLaCroix(r, c)) liste.push({ r, c });
  }
  return liste;
})();

export const NB_POINTS = POINTS.length; // 33

// Table de conversion (r, c) vers numéro de point. Remplie une fois.
const NUMERO: number[] = new Array(COTE * COTE).fill(-1);
POINTS.forEach((p, i) => { NUMERO[p.r * COTE + p.c] = i; });

/** Le numéro du point, ou -1 hors de la croix. */
export const pointDe = (r: number, c: number): number =>
  (surLaCroix(r, c) ? NUMERO[r * COTE + c] : -1);

export const CENTRE = pointDe(3, 3);

/** Les quatre pas orthogonaux. Le plateau ne porte pas de diagonales :
 *  les planches anciennes s'en passent, et la croix se lit mieux. */
export const PAS: ReadonlyArray<{ dr: number; dc: number }> = [
  { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
];

export type Occupant = 'renard' | 'oie' | null;
export type Plateau = readonly Occupant[];
export type Camp = 'renard' | 'oies';
export type Variante = 'oies13' | 'oies17';

export interface Reglement {
  id: Variante;
  /** Le nombre d'oies au premier coup. */
  oies: number;
  /** La forme ancienne laisse les oies reculer, la tardive non. */
  reculAutorise: boolean;
  /** Le renard l'emporte dès qu'il reste ce nombre d'oies, ou moins. */
  seuilRenard: number;
  nomFR: string;
  nomEN: string;
  texteFR: string;
  texteEN: string;
}

export const REGLEMENTS: readonly Reglement[] = [
  {
    id: 'oies13',
    oies: 13,
    reculAutorise: true,
    seuilRenard: 5,
    nomFR: 'Treize oies',
    nomEN: 'Thirteen geese',
    texteFR: 'La forme ancienne, celle que Murray tient pour authentique. Les oies vont dans les quatre directions et peuvent reculer.',
    texteEN: 'The old form, the one Murray holds to be authentic. The geese move in all four directions and may fall back.',
  },
  {
    id: 'oies17',
    oies: 17,
    reculAutorise: false,
    seuilRenard: 5,
    nomFR: 'Dix-sept oies',
    nomEN: 'Seventeen geese',
    texteFR: 'La forme tardive, à partir du XVIe siècle. Les oies sont plus nombreuses, mais elles avancent ou vont de côté, jamais en arrière.',
    texteEN: 'The later form, from the sixteenth century. More geese, but they move forward or sideways and never backward.',
  },
];

export const VARIANTE_DEFAUT: Variante = 'oies13';

export const reglement = (id: Variante): Reglement =>
  REGLEMENTS.find((r) => r.id === id) ?? REGLEMENTS[0];

/** La mise en place. Le renard tient le centre, les oies le bas.
 *  Treize oies : les rangées 4, 5 et 6 de la croix. Dix-sept : les
 *  mêmes, plus les quatre points des bras latéraux sur la rangée du
 *  milieu. Le détail et sa réserve sont dans HISTOIRE.md. */
export function plateauInitial(v: Variante): Plateau {
  const cases: Occupant[] = new Array(NB_POINTS).fill(null);
  POINTS.forEach((p, i) => { if (p.r >= 4) cases[i] = 'oie'; });
  if (reglement(v).oies === 17) {
    for (const c of [0, 1, 5, 6]) cases[pointDe(3, c)] = 'oie';
  }
  cases[CENTRE] = 'renard';
  return cases;
}

/** Un coup : d'où, vers où, les oies emportées au passage, et les
 *  points traversés dans l'ordre (l'animation les rejoue un à un). */
export interface Coup {
  de: number;
  vers: number;
  prises: number[];
  etapes: number[];
}

export const nbOies = (p: Plateau): number => p.reduce((n, c) => (c === 'oie' ? n + 1 : n), 0);

export const positionRenard = (p: Plateau): number => p.indexOf('renard');

/** Tous les enchaînements de sauts que le renard peut faire depuis un
 *  point. Chaque étape du chemin est un coup à part entière : la prise
 *  n'est pas obligatoire et le renard a le droit de s'arrêter en
 *  route. */
function sauts(p: Plateau, depart: number): Coup[] {
  const trouves: Coup[] = [];
  const vus = new Set<string>();

  const creuser = (ici: number, prises: number[], etapes: number[]) => {
    if (etapes.length >= 8) return; // garde-fou : la croix ne permet pas mieux
    const { r, c } = POINTS[ici];
    for (const { dr, dc } of PAS) {
      const survole = pointDe(r + dr, c + dc);
      const arrivee = pointDe(r + dr * 2, c + dc * 2);
      if (survole < 0 || arrivee < 0) continue;
      if (p[survole] !== 'oie' || prises.includes(survole)) continue;
      // Le point d'arrivée doit être libre. Le point de départ l'est
      // aussi : le renard n'y est plus.
      if (p[arrivee] !== null && arrivee !== depart) continue;
      if (etapes.includes(arrivee)) continue;
      const suitePrises = [...prises, survole];
      const suiteEtapes = [...etapes, arrivee];
      const cle = `${arrivee}|${[...suitePrises].sort((a, b) => a - b).join(',')}`;
      if (!vus.has(cle)) {
        vus.add(cle);
        trouves.push({ de: depart, vers: arrivee, prises: suitePrises, etapes: suiteEtapes });
      }
      creuser(arrivee, suitePrises, suiteEtapes);
    }
  };

  creuser(depart, [], []);
  return trouves;
}

/** Tous les coups légaux d'un camp. */
export function coupsPossibles(p: Plateau, camp: Camp, v: Variante): Coup[] {
  const coups: Coup[] = [];

  if (camp === 'renard') {
    const depart = positionRenard(p);
    if (depart < 0) return coups;
    const { r, c } = POINTS[depart];
    for (const { dr, dc } of PAS) {
      const voisin = pointDe(r + dr, c + dc);
      if (voisin >= 0 && p[voisin] === null) {
        coups.push({ de: depart, vers: voisin, prises: [], etapes: [voisin] });
      }
    }
    coups.push(...sauts(p, depart));
    return coups;
  }

  const recul = reglement(v).reculAutorise;
  p.forEach((occ, i) => {
    if (occ !== 'oie') return;
    const { r, c } = POINTS[i];
    for (const { dr, dc } of PAS) {
      // Les oies montent vers la tanière : reculer, c'est aller vers
      // le bas du plateau (rangée croissante).
      if (!recul && dr > 0) continue;
      const voisin = pointDe(r + dr, c + dc);
      if (voisin >= 0 && p[voisin] === null) {
        coups.push({ de: i, vers: voisin, prises: [], etapes: [voisin] });
      }
    }
  });
  return coups;
}

/** Le plateau après le coup. L'ancien n'est jamais modifié. */
export function jouer(p: Plateau, coup: Coup): Plateau {
  const suite = [...p];
  const piece = suite[coup.de];
  suite[coup.de] = null;
  for (const prise of coup.prises) suite[prise] = null;
  suite[coup.vers] = piece;
  return suite;
}

export type Verdict = 'renard' | 'oies' | null;

/** Qui a gagné, sachant que c'est au tour de `tour` de jouer.
 *  Le renard l'emporte s'il ne reste plus assez d'oies pour l'enfermer,
 *  ou si les oies n'ont plus de coup. Les oies l'emportent si le renard
 *  est immobilisé. */
export function verdict(p: Plateau, tour: Camp, v: Variante): Verdict {
  if (nbOies(p) <= reglement(v).seuilRenard) return 'renard';
  if (coupsPossibles(p, tour, v).length === 0) return tour === 'renard' ? 'oies' : 'renard';
  return null;
}

// ─── Un coup, en texte ──────────────────────────────────────────────
// Une partie en ligne ne stocke pas la planche, seulement la liste des
// coups (Alex, 2026-08-31, même patron que le tafl). Un saut du renard
// porte les oies emportées, parce que deux enchaînements différents
// peuvent finir sur le même point.

/** « 12>10 » un pas, « 12>10:11,17 » un saut et ce qu'il emporte. */
export function coupEnTexte(c: Coup): string {
  return c.prises.length > 0 ? `${c.de}>${c.vers}:${c.prises.join(',')}` : `${c.de}>${c.vers}`;
}

/**
 * Relit un coup venu de l'autre bout et lui rend ses étapes.
 *
 * Le coup n'est pas reconstruit à la main : il est CHERCHÉ dans la
 * liste des coups légaux de la position courante. Un coup qui n'y est
 * pas rend `null`, et la planche ne bouge pas.
 */
export function coupDepuisTexte(
  s: string, p: Plateau, camp: Camp, v: Variante,
): Coup | null {
  const [chemin, prises] = s.split(':');
  const [de, vers] = (chemin ?? '').split('>').map(Number);
  if (!Number.isInteger(de) || !Number.isInteger(vers)) return null;
  const attendues = prises ? prises.split(',').map(Number).join(',') : '';
  return coupsPossibles(p, camp, v).find(
    (c) => c.de === de && c.vers === vers && c.prises.join(',') === attendues,
  ) ?? null;
}
