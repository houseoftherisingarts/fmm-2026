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
  SEUIL_BASSE_COUR, avanceDuTroupeau, clePosition, cohesionDuTroupeau, etatDepuis,
  jouerRecherche, libertesDuRenard, menacesDuRenard, profondeurDansUnBras,
  trousDansLaLigne, verdictArbitre,
  type EtatRenard,
} from './arbitre';
import {
  POINTS, coupEnTexte, coupsPossibles, nbOies, PAS, pointDe, positionRenard, reglement,
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

const POIDS = {
  /** Chaque oie encore debout pèse contre le renard. */
  oie: 100,
  /** Une oie qu'il peut croquer tout de suite, sans même chercher. */
  menace: 110,
  /** Le troupeau qui monte vers la tanière. */
  avance: 12,
  /** Ses quatre voisins libres. */
  souffle: 18,
  /** Les points qu'il atteint réellement en marchant. */
  liberte: 7,
  /** Chaque pas qu'il a fait dans un bras de la croix. */
  bras: 45,
  /** Sa distance à la tanière, en rangées. Il vit mieux loin d'elle. */
  taniere: 5,
  /** Les oies qui se tiennent la main. */
  cohesion: 9,
  /** Les trous derrière la ligne d'oies. */
  trou: 11,
  /** Le compteur de la basse-cour, qui travaille pour le renard. */
  bassecour: 10,
} as const;

/**
 * La note de la position, du point de vue du renard, en centièmes.
 *
 * Le compteur de la basse-cour entre dans le compte : douze coups
 * d'oies sans progrès coûtent une oie, et un troupeau qui campe voit
 * donc sa note se dégrader coup après coup au lieu de rester plate.
 * C'est exactement ce qui manquait pour que les oies arrêtent de se
 * cacher dans un coin.
 */
export function noteRenard(p: Plateau, v: Variante, sansProgres = 0): number {
  // Ce qui compte n'est pas le nombre d'oies mais celles qu'il reste à
  // croquer avant le seuil de la variante. La note passe ainsi par zéro
  // au moment exact où le renard l'emporte.
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
    cle: (e) => `${clePosition(e.plateau, e.tour)}|${e.sansProgres}|${e.avanceRecord}`,
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
// Un plafond de nœuds accompagne chaque marche : le navigateur d'un
// visiteur ne doit pas figer une seconde entière entre deux coups, et
// le contrôle du terminal doit finir une partie complète en quelques
// secondes.

const MARCHE: Record<Difficulte, { niveau: Niveau; noeudsMax: number }> = {
  facile: { niveau: 2, noeudsMax: 1_500 },
  moyen: { niveau: 7, noeudsMax: 12_000 },
  difficile: { niveau: 9, noeudsMax: 40_000 },
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
