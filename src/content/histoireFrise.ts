// Frise animée de l'histoire du festival, section Histoire & Apprendre.
// Contenu dicté par Alex (2026-08-05) : l'ordre des 8 jalons est certain,
// les années sont déduites du seul fait daté du site ("Fondé en 2021",
// HistoirePage.tsx) additionné année par année jusqu'à 2026 (SITE.year,
// confirmé) puis au-delà pour les deux éditions à venir. Les années 2022 à
// 2025 ne sont donc pas trouvées telles quelles dans une source, mais
// déduites par arithmétique simple sur une base vérifiée : à confirmer par
// Alex avant publication (`showHistoireFrise` reste éteint jusque-là).

export interface FriseStop {
  id:      string;
  year:    number;
  /** L'édition en cours (2026) porte un repère visuel distinct. */
  current?: boolean;
  titleFR: string;
  titleEN: string;
  /** Sous-titre court, sans détail inventé — seuls les faits déjà établis
   *  ailleurs sur le site (fondation, édition en cours) sont repris ici. */
  noteFR?: string;
  noteEN?: string;
}

export const FRISE_HISTOIRE: FriseStop[] = [
  {
    id: 'pique-nique',
    year: 2021,
    titleFR: 'Le pique-nique médiéval',
    titleEN: 'The medieval picnic',
    noteFR: 'L’étincelle de départ, en pleine pandémie.',
    noteEN: 'The spark it all began with, in the middle of the pandemic.',
  },
  {
    id: 'video',
    year: 2022,
    titleFR: 'La vidéo',
    titleEN: 'The video',
  },
  {
    id: 'festival',
    year: 2023,
    titleFR: 'Le festival',
    titleEN: 'The festival',
  },
  {
    id: 'nouvelle-france',
    year: 2024,
    titleFR: 'Spécial Nouvelle-France',
    titleEN: 'New France special',
    noteFR: 'Le début des thèmes.',
    noteEN: 'Where the yearly themes began.',
  },
  {
    id: 'viking',
    year: 2025,
    titleFR: 'Spécial Viking',
    titleEN: 'Viking special',
  },
  {
    id: 'caravanes',
    year: 2026,
    current: true,
    titleFR: 'Caravanes & Saltimbanques',
    titleEN: 'Caravans & Players',
    noteFR: 'L’édition en cours.',
    noteEN: 'The current edition.',
  },
  {
    id: 'chevaliers',
    year: 2027,
    titleFR: 'Chevaliers',
    titleEN: 'Knights',
  },
  {
    id: 'celtique',
    year: 2028,
    titleFR: 'Celtique',
    titleEN: 'Celtic',
  },
];
