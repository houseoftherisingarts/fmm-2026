// ─── La carte du site ────────────────────────────────────────────────
// Alex, 2026-09-10 : la carte 2026 remplace celle de 2025 partout, et
// elle devient un avis du babillard qu'on décroche une seule fois.
//
// Un seul endroit tient les fichiers et l'identifiant, parce que la même
// image sert maintenant l'accueil, l'hébergement, le babillard, le
// pop-up d'arrivée et l'espace client. Changer la carte l'an prochain,
// c'est changer ces lignes-ci et déposer les quatre fichiers.
//
// Les fichiers vivent dans public/site, fabriqués depuis l'original
// 4096 × 2122 fourni par Alex (Inkarnate) :
//   carte-fmm-2026-960.webp   ·  téléphone
//   carte-fmm-2026-1920.webp  ·  bureau
//   carte-fmm-2026-2560.webp  ·  écran dense et zoom
//   carte-fmm-2026.jpg        ·  la copie qui se télécharge et s'imprime

/** L'identifiant de l'avis « carte » au babillard. Le pop-up et le
 *  parchemin écrivent le même document : décrocher l'un ferme l'autre. */
export const CARTE_AVIS_ID = 'carte-2026';

export const CARTE = {
  jpg:      '/site/carte-fmm-2026.jpg',
  webp960:  '/site/carte-fmm-2026-960.webp',
  webp1920: '/site/carte-fmm-2026-1920.webp',
  webp2560: '/site/carte-fmm-2026-2560.webp',
  /** Rapport de l'original, pour réserver la place avant le chargement. */
  largeur: 4096,
  hauteur: 2122,
  /** Le nom du fichier tel qu'il arrive dans les téléchargements. */
  nomFichier: 'Carte-FMM-2026.jpg',
} as const;

/** Le jeu de sources, identique partout où la carte paraît. */
export const CARTE_SRCSET =
  `${CARTE.webp960} 960w, ${CARTE.webp1920} 1920w, ${CARTE.webp2560} 2560w`;
