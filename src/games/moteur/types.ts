// ─── Le moteur commun : le contrat ──────────────────────────────────
// Alex, 2026-09-01 : les trois jeux de plateau du festival avaient
// chacun leur adversaire de bois, écrit à part, et les trois étaient
// battus par le premier venu. Ils partagent désormais un seul moteur de
// recherche. Un jeu n'a plus qu'à dire six choses de lui-même, et il
// hérite de la table de transposition, de l'approfondissement
// progressif, de la quiescence et des dix niveaux.
//
// La convention est celle du negamax : TOUT se compte du point de vue
// du joueur qui a le trait. Une note positive veut dire « la position
// est bonne pour celui qui doit jouer », jamais « bonne pour les
// blancs ». Un jeu qui oublie ce détail joue contre lui-même.

/** Ce qu'un jeu doit savoir dire de lui-même pour être joué. */
export interface Adaptateur<E, C> {
  /** Tous les coups légaux. Une liste vide veut dire que `fini` tranche. */
  coups(e: E): C[];
  /** L'état après le coup. L'état d'origine n'est jamais modifié. */
  jouer(e: E, c: C): E;
  /**
   * La partie est-elle terminée ?
   *   1  le joueur au trait a gagné
   *  -1  le joueur au trait a perdu
   *   0  nulle
   *   null la partie continue
   */
  fini(e: E): 1 | 0 | -1 | null;
  /** La note de la position, en centièmes, vue par le joueur au trait. */
  evaluer(e: E): number;
  /** Un texte qui identifie la position, le trait compris. */
  cle(e: E): string;
  /** Un texte stable pour un coup : table des tueurs, livre, journal. */
  nomCoup(c: C): string;
  /**
   * Le coup change-t-il la matière (prise, moulin fermé, oie mangée) ?
   * La quiescence ne suit que ceux-là : sans elle, la recherche
   * s'arrête au milieu d'un échange et croit avoir gagné une pièce.
   */
  bruyant?(e: E, c: C): boolean;
  /** Ordre a priori, du plus prometteur au moins. Plus grand = plus tôt. */
  promesse?(e: E, c: C): number;
}

export interface OptionsRecherche {
  /** La profondeur visée. L'approfondissement y monte marche par marche. */
  profondeurMax: number;
  /** Le budget de temps, en millisecondes. Absent : aucune horloge. */
  tempsMs?: number;
  /** Plafond de nœuds, pour que le banc d'essai reste reproductible. */
  noeudsMax?: number;
  /** Suivre les prises au-delà de la profondeur. */
  quiescence?: boolean;
  /** Le livre d'ouvertures : clé de position vers nom de coup. */
  livre?: Record<string, string>;
  /** Un signal d'arrêt, lu entre deux nœuds (le travailleur s'en sert). */
  arret?: () => boolean;
  /**
   * Pèse CHAQUE coup de la racine à fenêtre pleine.
   *
   * Sans ce réglage, seul le premier coup reçoit une note exacte : les
   * suivants sont cherchés dans une fenêtre déjà fermée par l'alpha
   * courant, et leur note n'est plus qu'une borne supérieure. Le
   * meilleur coup reste juste, donc une machine qui joue toujours le
   * meilleur ne voit pas la différence. Les marches intermédiaires,
   * elles, piochent dans une fenêtre autour du meilleur : avec des
   * bornes au lieu de notes, elles tiennent pour équivalents des coups
   * qui ne le sont pas, et le niveau 3 se met à jouer comme le niveau
   * 1. Mesuré au banc d'essai du Renard le 2026-09-01 : 5 victoires et
   * 5 défaites du niveau 3 contre le niveau 1, au lieu d'une
   * domination nette.
   *
   * La fenêtre pleine coûte le gain de l'élagage à la racine
   * seulement : l'élagage continue de jouer dans chaque sous-arbre.
   */
  notesExactes?: boolean;
}

export interface CoupNote<C> { coup: C; note: number }

export interface Resultat<C> {
  /** Le meilleur coup trouvé, ou null quand il n'y en a aucun. */
  coup: C | null;
  note: number;
  /** La profondeur réellement atteinte avant l'horloge. */
  profondeur: number;
  noeuds: number;
  /** Tous les coups de la racine avec leur note, du meilleur au pire.
   *  C'est ce qui permet aux petits niveaux de choisir moins bien
   *  qu'ils ne le pourraient, sans jouer n'importe quoi. */
  racine: CoupNote<C>[];
  /** Le coup est sorti du livre d'ouvertures. */
  duLivre?: boolean;
}

/** La note d'un mat. La distance au mat est retranchée pour que la
 *  machine préfère gagner tout de suite et perdre le plus tard possible. */
export const MAT = 1_000_000;
