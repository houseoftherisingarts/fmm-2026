// ─── Les huit photos approuvées du kit de presse ─────────────────────
// Alex a retenu ces huit images de l'édition 2025 (vault Onyx,
// 10_projects/fmm/06-communication/photos-pub-web). Les recadrages du
// vault sont compressés en 1200×628 : le kit repart des ORIGINAUX de
// Léna qui vivent dans le dépôt, retrouvés par corrélation d'image
// (score ≥ 0,998 contre le 2e meilleur candidat à 0,53).
//
// 🚨 Aucun filtre, aucun dégradé, aucune retouche de couleur sur ces
// photos : Léna travaille déjà sa couleur (ordre d'Alex). Le recadrage
// est la seule opération permise.
export const PHOTOS = [
  { id: '01', slug: 'vikings-boucliers', orig: '2025-IMG_5050' },
  { id: '02', slug: 'vikings-mur',       orig: '2025-IMG_4828' },
  { id: '03', slug: 'viking-lance',      orig: '2025-IMG_5107' },
  { id: '04', slug: 'vikings-bataille',  orig: '2025-IMG_4737' },
  { id: '05', slug: 'vikings-feu-nuit',  orig: '2025-IMG_6481' },
  { id: '06', slug: 'vikings-duel',      orig: '2025-IMG_5156' },
  { id: '07', slug: 'joute',             orig: '2025-IMG_5526' },
  { id: '08', slug: 'cracheur-feu',      orig: '2025-IMG_6377' },
];

export const PHOTO_BY_ID = Object.fromEntries(PHOTOS.map((p) => [p.id, p]));
