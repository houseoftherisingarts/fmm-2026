// ─── L'arbitre de la Mérelle ────────────────────────────────────────
// Alex, 2026-09-01 : deux joueurs prudents peuvent glisser leurs pions
// d'un point à l'autre jusqu'à la fin des temps, sans jamais rien
// risquer et sans jamais rien gagner. La règle du jeu ne dit rien de ce
// cas, et le plateau finissait par se figer devant le joueur.
//
// Ce fichier empile deux règles de tournoi par-dessus `logic.ts`, qui
// ne bouge pas d'une ligne. Les parties en ligne rejouent la même liste
// de coups avec les mêmes fonctions qu'avant, et chaque camp recalcule
// le verdict de son côté :
//
//   cinquante demi-coups sans retrait ni pose, la partie est nulle;
//   la même position vue trois fois, la partie est nulle.
//
// Tout est pur et déterministe. Aucune horloge, aucun hasard, aucun
// `Math.random` : les deux joueurs d'une partie en ligne partent de la
// même liste de coups et doivent tomber sur exactement le même verdict.

import {
  coupsLegaux, etatInitial as etatInitialJeu, jouer,
  type Camp, type Coup, type Etat,
} from './logic';

/** Le compteur de la règle des cinquante. Il se compte en demi-coups,
 *  donc en tours de jeu, et non en paires de coups. */
export const DEMI_COUPS_SANS_PRISE = 50;

/** Trois passages sur la même position suffisent : à la troisième, plus
 *  personne n'a l'intention d'en sortir. */
export const REPETITIONS_NULLES = 3;

export type RaisonNulle = 'compteur' | 'repetition';

export interface EtatMerelle {
  /** La position, telle que `logic.ts` la connaît. */
  jeu: Etat;
  /** Demi-coups joués depuis le dernier retrait ou la dernière pose. */
  sansPrise: number;
  /**
   * Les positions traversées depuis ce dernier retrait ou cette dernière
   * pose, la position courante comprise et toujours en dernier. Rien de
   * plus ancien n'a besoin d'être gardé : une pose vide la réserve et un
   * retrait enlève un pion, et ni l'une ni l'autre ne se défont jamais,
   * donc aucune position d'avant ne peut revenir.
   */
  vues: readonly string[];
  /** La raison de la nulle, quand l'arbitre a tranché. */
  nulle: RaisonNulle | null;
}

/** La position en texte : les vingt-quatre points, le trait, le retrait
 *  en attente et les deux réserves. Deux positions qui se ressemblent
 *  mais dont l'une doit un retrait ne sont pas la même position. */
export function positionEnTexte(j: Etat): string {
  return `${j.points.join('')}|${j.tour}${j.doitRetirer ? 'r' : ''}|${j.aPoser[0]}${j.aPoser[1]}`;
}

/**
 * La position courante, en texte. Le dernier élément de `vues` est
 * toujours celle où l'on se trouve, ce qui évite au moteur de recalculer
 * la même chaîne à chaque nœud de sa recherche.
 */
export const clePosition = (e: EtatMerelle): string => e.vues[e.vues.length - 1];

/** Habille une position nue des compteurs de l'arbitre. */
export function depuisJeu(jeu: Etat): EtatMerelle {
  return { jeu, sansPrise: 0, vues: [positionEnTexte(jeu)], nulle: null };
}

export function etatInitial(vol = true): EtatMerelle {
  return depuisJeu(etatInitialJeu(vol));
}

function occurrences(vues: readonly string[], cle: string): number {
  let n = 0;
  for (const v of vues) if (v === cle) n++;
  return n;
}

/** Les coups jouables. La liste est vide quand l'arbitre a sifflé la
 *  nulle, même si le plateau, lui, offre encore des glissements. */
export function coupsArbitre(e: EtatMerelle): Coup[] {
  return e.nulle ? [] : coupsLegaux(e.jeu);
}

/**
 * Joue un coup et rend un état neuf. Un coup que la règle du jeu refuse
 * rend l'état d'origine inchangé, exactement comme `jouer` : c'est la
 * même frontière de confiance, l'arbitre ne fait que compter par-dessus.
 */
export function jouerArbitre(e: EtatMerelle, coup: Coup): EtatMerelle {
  if (e.nulle || e.jeu.gagnant) return e;
  const jeu = jouer(e.jeu, coup);
  if (jeu === e.jeu) return e;

  // Une pose et un retrait font tous les deux avancer la partie pour de
  // bon. Ils remettent le compteur à zéro et effacent la mémoire des
  // positions, qui ne peut plus servir à rien.
  const avance = coup.type !== 'deplacement';
  const cle = positionEnTexte(jeu);
  const vues = avance ? [cle] : [...e.vues, cle];
  const sansPrise = avance ? 0 : e.sansPrise + 1;

  let nulle: RaisonNulle | null = null;
  if (!jeu.gagnant) {
    if (sansPrise >= DEMI_COUPS_SANS_PRISE) nulle = 'compteur';
    else if (occurrences(vues, cle) >= REPETITIONS_NULLES) nulle = 'repetition';
  }
  return { jeu, sansPrise, vues, nulle };
}

export interface Verdict {
  finie: boolean;
  gagnant: Camp | null;
  nulle: RaisonNulle | null;
}

export function verdictArbitre(e: EtatMerelle): Verdict {
  return {
    finie: e.nulle !== null || e.jeu.gagnant !== null,
    gagnant: e.jeu.gagnant,
    nulle: e.nulle,
  };
}

// ─── Ce que le joueur lit à l'écran ─────────────────────────────────
// Même patron que les pages voisines : deux objets, une clé par phrase,
// et la page choisit l'un ou l'autre selon la langue.

export const ARBITRE_FR = {
  compteur: 'Cinquante demi-coups sans qu’un pion soit posé ni retiré. La partie est nulle.',
  repetition: 'La même position revient pour la troisième fois. La partie est nulle.',
  titre: 'Partie nulle',
};

export const ARBITRE_EN = {
  compteur: 'Fifty half-moves without a man placed or taken. The game is drawn.',
  repetition: 'The same position has come round a third time. The game is drawn.',
  titre: 'Drawn game',
};

/** La phrase à afficher, ou `null` tant que la partie continue. */
export function texteArbitre(e: EtatMerelle, fr: boolean): string | null {
  if (!e.nulle) return null;
  return (fr ? ARBITRE_FR : ARBITRE_EN)[e.nulle];
}
