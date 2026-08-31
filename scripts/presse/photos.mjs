// ─── Les douze photographies du kit de presse ────────────────────────
// Choisies le 2026-08-31 dans les 656 originaux de Léna LeBozec qui
// vivent dans public/histoire/archives/lena/, par planches-contact de
// quarante regardées une à une. Critères : netteté, exposition, aucun
// visage d'enfant reconnaissable en gros plan, et de la VARIÉTÉ, parce
// que la première série était vikings de bout en bout.
//
// 🚨 Aucun filtre, aucun dégradé, aucune retouche de couleur sur ces
// photos : Léna travaille déjà sa couleur (ordre d'Alex). Le recadrage
// 16:9 est la seule opération permise.
//
// `focus` dit où tombe le CENTRE du recadrage, en fraction de la
// hauteur de l'original. Les portraits (1280 × 1920) perdent près des
// deux tiers de leur hauteur en 16:9 : sans ce repère, le chevalier
// sort du cadre par le haut et il ne reste que le sable.
//
// Retirée le 2026-08-31 sur ordre d'Alex : 2025-IMG_6481, « le camp la
// nuit », éclairée aux DEL.

/** Le préfixe de toutes les cibles de QR. Jamais de lien relatif. */
export const BASE_URL = 'https://www.festivalmedievaldemontpellier.org';

export const PHOTOS = [
  { id: '01', slug: 'chevalier-plumet', orig: '2025-IMG_5743', focus: 0.40 },
  { id: '02', slug: 'chevalier-lice',   orig: '2025-IMG_5321', focus: 0.44 },
  { id: '03', slug: 'joute',            orig: '2025-IMG_5526', focus: 0.50 },
  { id: '04', slug: 'forge',            orig: '2025-IMG_8036', focus: 0.50 },
  { id: '05', slug: 'rouet',            orig: '2024-IMG_5475', focus: 0.40 },
  { id: '06', slug: 'poteries',         orig: '2025-IMG_4526', focus: 0.50 },
  { id: '07', slug: 'vielle-a-roue',    orig: '2025-IMG_6090', focus: 0.45 },
  { id: '08', slug: 'convives',         orig: '2025-IMG_8568', focus: 0.50 },
  { id: '09', slug: 'paniers-herbes',   orig: '2025-IMG_8121', focus: 0.55 },
  { id: '10', slug: 'mur-de-boucliers', orig: '2025-IMG_5050', focus: 0.50 },
  { id: '11', slug: 'guerrier-epee',    orig: '2025-IMG_5107', focus: 0.50 },
  { id: '12', slug: 'feu-dragon',       orig: '2025-IMG_6377', focus: 0.50 },
];
