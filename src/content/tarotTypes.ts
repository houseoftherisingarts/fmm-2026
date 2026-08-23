// ─── Le vocabulaire du jeu ──────────────────────────────────────────
// Une lame porte son nom, son rang, son image et ses deux lectures.

export type Couleur = 'batons' | 'coupes' | 'epees' | 'deniers';

export interface Lame {
  /** Code du fichier image : /tarot/<code>.webp */
  code:   string;
  nomFR:  string;
  nomEN:  string;
  majeure: boolean;
  couleur?: Couleur;
  /** 0-21 pour les majeures, 1-14 pour les mineures. */
  rang:   number;
  droitFR:    string;  droitEN:    string;
  renverseFR: string;  renverseEN: string;
}
