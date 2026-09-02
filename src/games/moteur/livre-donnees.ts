// ─── Ce que la machine a appris ─────────────────────────────────────
// FICHIER GÉNÉRÉ. Ne pas modifier à la main.
// Écrit par tools/entrainement.ts (npm run entrainement).
//
// Le livre associe une clé de position au coup que les parties gagnées
// ont retenu. La clé est celle de l'adaptateur du jeu, exactement celle
// que `recherche.ts` interroge avant de réfléchir : une clé bâtie
// autrement ne serait jamais trouvée. Le nom du livre est le jeu, deux
// points, la variante, comme le veut `nomDuLivre`.
//
// Les poids sont ceux que la montée de colline a retenus. Le jeu les
// lit au chargement et les pose par-dessus les siens.

import type { Livre } from './livre';

export const LIVRES_APPRIS: Record<string, Livre> = {};

/** Les coefficients d'évaluation retenus par l'entraînement. Le jeu
 *  les pose par-dessus ceux qui sont écrits dans son `cpu.ts`. */
export const POIDS_APPRIS: Record<string, Record<string, number>> = {};

/** L'heure du dernier entraînement, en texte lisible. Vide tant que
 *  l'entraînement n'a pas tourné. */
export const APPRIS_LE = '';
