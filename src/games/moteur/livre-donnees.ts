// ─── Ce que la machine a appris ─────────────────────────────────────
// FICHIER GÉNÉRÉ. Ne pas modifier à la main.
// Écrit par tools/entrainement.ts (npm run entrainement).
//
// Chaque entrée associe une clé de position au coup que les parties
// gagnées ont retenu. Le fichier part vide : il se remplit au premier
// entraînement, et il se relit tel quel par le moteur.

import type { Livre } from './livre';

export const LIVRES_APPRIS: Record<string, Livre> = {};

/** L'heure du dernier entraînement, en texte lisible. Vide tant que
 *  l'entraînement n'a pas tourné. */
export const APPRIS_LE = '';
