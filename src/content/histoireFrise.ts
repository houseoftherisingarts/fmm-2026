// Frise animée de l'histoire du festival, section Histoire & Apprendre.
// Années et titres CONFIRMÉS par Alex le 2026-08-05.

export interface FriseStop {
  id:      string;
  year:    number;
  /** L'édition en cours (2026) porte un repère visuel distinct. */
  current?: boolean;
  titleFR: string;
  titleEN: string;
  /** Sous-titre court, sans détail inventé : seuls les faits déjà établis
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
    id: 'premiere-edition',
    year: 2022,
    titleFR: 'Festival Médiéval de Montpellier',
    titleEN: 'Festival Médiéval de Montpellier',
    noteFR: 'La première vraie édition.',
    noteEN: 'The first real edition.',
  },
  {
    id: 'deuxieme-edition',
    year: 2023,
    titleFR: 'Festival Médiéval de Montpellier',
    titleEN: 'Festival Médiéval de Montpellier',
    noteFR: 'Plus grand.',
    noteEN: 'Bigger.',
  },
  {
    id: 'nouvelle-france',
    year: 2024,
    titleFR: 'Édition Nouvelle-France',
    titleEN: 'New France edition',
    noteFR: 'Le début des thèmes.',
    noteEN: 'Where the yearly themes began.',
  },
  {
    id: 'viking',
    year: 2025,
    titleFR: 'Édition Viking',
    titleEN: 'Viking edition',
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
