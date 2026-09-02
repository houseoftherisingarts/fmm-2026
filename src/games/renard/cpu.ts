// ─── L'adversaire du Renard et des Oies ─────────────────────────────
// Alex, 2026-09-01 : « L'IA qui contrôle les jeux est vraiment très
// mauvaise. » Le premier adversaire de ce jeu regardait trois
// demi-coups devant lui avec une évaluation écrite du seul point de vue
// du renard, et il ne connaissait aucune des règles qui empêchent une
// partie de s'enliser. Il est remplacé par le moteur commun de
// `src/games/moteur`, qui apporte l'approfondissement progressif, la
// table de transposition, la quiescence et les dix niveaux.
//
// ⚠️ LE SIGNE. Le moteur compte tout au negamax, c'est-à-dire du point
// de vue du camp qui a le trait. L'ancienne évaluation notait toujours
// du point de vue du renard, et brancher l'une sur l'autre sans
// retourner le signe fait jouer les oies POUR le renard : la machine se
// bat contre elle-même, et cela ne se voit qu'au banc d'essai. La note
// brute reste calculée pour le renard dans `noteRenard`, parce que
// c'est ainsi qu'elle se lit et que l'ancienne signature `evaluer` la
// rend encore telle quelle, et l'adaptateur la retourne quand ce sont
// les oies qui jouent.
//
// L'évaluation garde ce que l'ancienne avait de juste (le nombre
// d'oies, la prise offerte, le souffle du renard, l'avance du troupeau)
// et ajoute ce qui lui manquait : la structure du troupeau, les trous
// dans la ligne d'oies, l'enfermement réel du renard mesuré au parcours
// plutôt qu'à ses quatre voisins, sa distance à la tanière, et surtout
// le compteur de la basse-cour. C'est ce dernier terme qui règle la
// plainte d'Alex : des oies qui campent voient la punition venir, et le
// renard sait qu'il gagne en attendant.

import { choisirAuNiveau, type ChoixOptions, type Niveau } from '../moteur/niveaux';
import type { Adaptateur } from '../moteur/types';
import {
  PLAFOND_DEMI_COUPS, SEUIL_BASSE_COUR, avanceDuTroupeau, clePosition, cohesionDuTroupeau,
  etatDepuis, jouerRecherche, libertesDuRenard, menacesDuRenard, profondeurDansUnBras,
  trousDansLaLigne, verdictArbitre,
  type EtatRenard,
} from './arbitre';
import {
  POINTS, coupEnTexte, coupsPossibles, nbOies, PAS, plateauInitial, pointDe,
  positionRenard, reglement,
  type Camp, type Coup, type Plateau, type Variante,
} from './logic';

export type Difficulte = 'facile' | 'moyen' | 'difficile';

/** Le nombre de points libres autour du renard, ses quatre voisins seulement. */
function souffleDuRenard(p: Plateau): number {
  const ou = positionRenard(p);
  if (ou < 0) return 0;
  const { r, c } = POINTS[ou];
  let n = 0;
  for (const { dr, dc } of PAS) {
    const voisin = pointDe(r + dr, c + dc);
    if (voisin >= 0 && p[voisin] === null) n++;
  }
  return n;
}

// ─── Les poids ──────────────────────────────────────────────────────
// L'échelle est celle du moteur : une oie vaut cent, comme un pion vaut
// cent aux échecs. C'est ce qui donne son sens à la fenêtre des petits
// niveaux, qui se compte en centièmes de point dans `niveaux.ts`.

const POIDS_ECRITS = {
  /** Chaque oie encore debout pèse contre le renard. */
  oie: 100,
  /**
   * Une oie qu'il peut croquer tout de suite. Le poids reste TRÈS
   * au-dessous de celui de l'oie elle-même, et c'est délibéré : une
   * menace qui vaut autant que le repas donne un renard qui préfère
   * saliver plutôt que manger, parce que croquer efface la menace et
   * lui coûte donc autant que le gain. L'ancienne évaluation faisait
   * exactement cette faute, avec une menace qui pesait le double d'une
   * oie.
   */
  menace: 30,
  /** Le troupeau qui monte vers la tanière. */
  avance: 12,
  /** Ses quatre voisins libres. */
  souffle: 12,
  /** Les points qu'il atteint réellement en marchant. */
  liberte: 6,
  /** Chaque pas qu'il a fait dans un bras de la croix. */
  bras: 30,
  /** Sa distance à la tanière, en rangées. Il vit mieux loin d'elle. */
  taniere: 5,
  /** Les oies qui se tiennent la main. */
  cohesion: 9,
  /** Les trous derrière la ligne d'oies. */
  trou: 11,
  /** Le compteur de la basse-cour, qui travaille pour le renard. */
  bassecour: 10,
} as const;

/** La note brute, avant que l'étalon ne la ramène autour de zéro. */
function noteBrute(p: Plateau, v: Variante, sansProgres = 0): number {
  // Ce qui compte n'est pas le nombre d'oies mais celles qu'il reste à
  // croquer avant le seuil de la variante.
  const aCroquer = nbOies(p) - reglement(v).seuilRenard;
  const ou = positionRenard(p);
  return (
    -POIDS.oie * aCroquer
    + POIDS.menace * menacesDuRenard(p)
    - POIDS.avance * avanceDuTroupeau(p)
    + POIDS.souffle * souffleDuRenard(p)
    + POIDS.liberte * libertesDuRenard(p)
    - POIDS.bras * profondeurDansUnBras(p)
    + POIDS.taniere * (ou < 0 ? 0 : POINTS[ou].r)
    - POIDS.cohesion * cohesionDuTroupeau(p)
    + POIDS.trou * trousDansLaLigne(p)
    + POIDS.bassecour * sansProgres
  );
}

/**
 * Le zéro de l'échelle, pris sur la position de départ de la variante.
 *
 * Le moteur donne la note 0 à une nulle. Une évaluation qui ne passe
 * jamais par zéro fait donc dire n'importe quoi à l'arbitre : un renard
 * dont toutes les positions valent moins deux cents accepte n'importe
 * quelle répétition, croyant y gagner deux cents points, et il annule
 * des parties qu'il tenait. Mesuré avant l'étalon : deux connétables
 * signaient la nulle au seizième demi-coup.
 */
const ETALON: Record<Variante, number> = {
  oies13: noteBrute(plateauInitial('oies13'), 'oies13'),
  oies17: noteBrute(plateauInitial('oies17'), 'oies17'),
};

/**
 * La note de la position, du point de vue du renard, en centièmes, sur
 * une échelle où la mise en place vaut zéro.
 *
 * Le compteur de la basse-cour entre dans le compte : douze coups
 * d'oies sans progrès coûtent une oie, et un troupeau qui campe voit
 * donc sa note se dégrader coup après coup au lieu de rester plate.
 * C'est exactement ce qui manquait pour que les oies arrêtent de se
 * cacher dans un coin.
 */
export const noteRenard = (p: Plateau, v: Variante, sansProgres = 0): number =>
  noteBrute(p, v, sansProgres) - ETALON[v];

/**
 * Le contrat que le jeu remplit pour le moteur commun.
 *
 * `evaluer` et `fini` rendent leur verdict du point de vue du camp qui
 * a le trait, jamais de celui du renard. La clé de transposition porte
 * le compteur de la basse-cour et le record d'avance, sans quoi deux
 * positions identiques dont l'une est à un coup de la punition
 * vaudraient la même chose.
 */
export function adaptateurRenard(v: Variante): Adaptateur<EtatRenard, Coup> {
  return {
    coups: (e) => coupsPossibles(e.plateau, e.tour, v),
    jouer: (e, c) => jouerRecherche(e, c).etat,
    fini: (e) => {
      const gagnant = verdictArbitre(e);
      if (gagnant === null) return null;
      if (gagnant === 'nulle') return 0;
      return gagnant === e.tour ? 1 : -1;
    },
    evaluer: (e) => {
      const note = noteRenard(e.plateau, v, e.sansProgres);
      return e.tour === 'renard' ? note : -note;
    },
    // Le plafond des quatre cents demi-coups change la valeur d'une
    // position, et deux nœuds de même planche mais de compteurs
    // différents ne valent alors pas la même chose. Le compteur n'entre
    // dans la clé qu'à l'approche du plafond, avec une marge plus large
    // que l'arbre le plus profond : ailleurs il priverait la recherche
    // de toutes ses transpositions pour rien.
    cle: (e) => `${clePosition(e.plateau, e.tour)}|${e.sansProgres}|${e.avanceRecord}`
      + (e.demiCoups > PLAFOND_DEMI_COUPS - 64 ? `|${e.demiCoups}` : ''),
    nomCoup: coupEnTexte,
    // La quiescence suit les prises, et le coup d'oie qui va déclencher
    // la punition en est une : il change la matière au coup suivant.
    bruyant: (e, c) =>
      c.prises.length > 0 || (e.tour === 'oies' && e.sansProgres >= SEUIL_BASSE_COUR - 1),
    // L'ordre a priori : le renard essaie d'abord ce qui croque, les
    // oies d'abord ce qui monte vers la tanière.
    promesse: (e, c) =>
      e.tour === 'renard'
        ? c.prises.length * 20
        : (POINTS[c.de].r - POINTS[c.vers].r) * 4 + 1,
  };
}

/**
 * La porte d'entrée du jeu : le coup que la machine joue à ce niveau,
 * en partant d'un état d'arbitre complet.
 *
 * Passer l'état plutôt que le seul plateau est ce qui permet à la
 * machine de compter les coups sans progrès. Un renard qui sait que la
 * basse-cour travaille pour lui n'a plus à se jeter sur le troupeau, et
 * des oies qui voient la punition venir cessent de camper.
 */
export function choisirCoupNiveau(
  e: EtatRenard, niveau: Niveau, options: ChoixOptions = {},
): Coup | null {
  return choisirAuNiveau(adaptateurRenard(e.variante), e, niveau, options);
}

// ─── Les anciennes signatures ───────────────────────────────────────
// `index.tsx` et `logic.test.ts` les appellent encore. Elles sont
// branchées sur le nouveau moteur et ne changent pas de forme, pour que
// rien ne casse pendant le chantier.
//
// ⚠️ POURQUOI « moyen » ET « difficile » TIENNENT LA MÊME MARCHE.
// `moteur/recherche.ts` ne rend une note exacte que pour le PREMIER
// coup de la racine. Les suivants sont cherchés avec une fenêtre fermée
// par l'alpha courant, et ils remontent tous la même valeur plafonnée.
// La fenêtre des marches 3 à 9 les tient alors pour équivalents et
// pioche au hasard parmi eux, y compris un coup qui offre une oie au
// renard. Mesuré sur la position du contrôle « les oies moyennes
// refusent d'offrir une oie » : la liste de racine rend 226 pour les
// sept coups, alors qu'en repesant chaque coup tout seul on lit 226,
// 226, 194, 194, 79, 79 et 23. Tant que la racine ne rouvrira pas sa
// fenêtre, les trois difficultés se règlent sur des marches dont la
// fenêtre ne mord pas : le marmiton, qui ne regarde qu'un demi-coup et
// dont les notes sont donc exactes, et le connétable, qui n'a pas de
// fenêtre du tout et à qui on donne un budget de réflexion différent.

const MARCHE: Record<Difficulte, { niveau: Niveau; noeudsMax: number }> = {
  facile: { niveau: 2, noeudsMax: 1_500 },
  moyen: { niveau: 10, noeudsMax: 2_000 },
  difficile: { niveau: 10, noeudsMax: 20_000 },
};

/**
 * Le coup que l'ordinateur joue pour ce camp, à partir du seul plateau.
 *
 * L'état est reconstruit avec des compteurs à neuf, faute d'en recevoir
 * un : cette porte-là ne voit donc pas où en est la basse-cour. Les
 * pages qui tiennent l'état complet passent par `choisirCoupNiveau`.
 */
export function choisirCoup(p: Plateau, camp: Camp, v: Variante, d: Difficulte): Coup | null {
  const { niveau, noeudsMax } = MARCHE[d];
  return choisirCoupNiveau(etatDepuis(p, camp, v), niveau, { noeudsMax });
}

/** La note de la position, du point de vue du renard, comme autrefois. */
export const evaluer = (p: Plateau, v: Variante): number => noteRenard(p, v);
