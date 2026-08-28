// ─── Le catalogue d'équipement de l'inventaire ────────────────────────
// Chaque objet est une pièce SVG paramétrée par couleur (voir
// Personnage.tsx), rangée dans un emplacement du mannequin et porteuse
// d'un bonus de statistique additif. Premier jeu d'objets du chantier
// (Alex, 2026-08-27) : 3 casques, 3 torses, 2 jambes, 2 bottes, 3 armes,
// 2 boucliers, 2 capes, 1 amulette, 1 anneau.

import type { StatsMembre } from '../firebase/ordre';

export type Emplacement =
  | 'tete' | 'torse' | 'mains' | 'jambes' | 'pieds'
  | 'mainDroite' | 'mainGauche' | 'cape' | 'amulette' | 'anneau';

export const EMPLACEMENTS: Emplacement[] = [
  'tete', 'amulette', 'torse', 'mainGauche', 'mainDroite',
  'mains', 'anneau', 'jambes', 'pieds', 'cape',
];

export const LIBELLE_EMPLACEMENT: Record<Emplacement, { FR: string; EN: string }> = {
  tete:       { FR: 'Tête',        EN: 'Head'       },
  torse:      { FR: 'Torse',       EN: 'Chest'       },
  mains:      { FR: 'Mains',       EN: 'Hands'       },
  jambes:     { FR: 'Jambes',      EN: 'Legs'        },
  pieds:      { FR: 'Pieds',       EN: 'Feet'        },
  mainDroite: { FR: 'Main droite', EN: 'Right hand'  },
  mainGauche: { FR: 'Main gauche', EN: 'Left hand'   },
  cape:       { FR: 'Cape',        EN: 'Cape'        },
  amulette:   { FR: 'Amulette',    EN: 'Amulet'      },
  anneau:     { FR: 'Anneau',      EN: 'Ring'        },
};

export type Rarete = 'commune' | 'rare' | 'legendaire';

export const COULEUR_RARETE: Record<Rarete, string> = {
  commune: 'rgba(244,239,227,0.30)',
  rare: '#6FA8DC',
  legendaire: '#D8B05A',
};

export interface Objet {
  id: string;
  nom: { FR: string; EN: string };
  emplacement: Emplacement;
  bonus: Partial<StatsMembre>;
  rarete: Rarete;
  /** Couleur principale passée au composant SVG de la pièce. */
  couleur: string;
  /** Variante de dessin (forme) au sein de son emplacement : 1, 2, 3… */
  variante: number;
}

export const CATALOGUE: Objet[] = [
  // Casques
  { id: 'casque_cuir', nom: { FR: 'Capuche de cuir', EN: 'Leather hood' }, emplacement: 'tete', bonus: { ruse: 1 }, rarete: 'commune', couleur: '#6B4A2E', variante: 1 },
  { id: 'casque_mailles', nom: { FR: 'Coiffe de mailles', EN: 'Mail coif' }, emplacement: 'tete', bonus: { endurance: 2, force: 1 }, rarete: 'rare', couleur: '#8A8F96', variante: 2 },
  { id: 'casque_heaume', nom: { FR: 'Heaume du gardien', EN: "Guardian's greathelm" }, emplacement: 'tete', bonus: { force: 3, endurance: 2 }, rarete: 'legendaire', couleur: '#D8B05A', variante: 3 },
  // Torses
  { id: 'torse_cuir', nom: { FR: 'Jaque de cuir', EN: 'Leather jack' }, emplacement: 'torse', bonus: { ruse: 1, endurance: 1 }, rarete: 'commune', couleur: '#6B4A2E', variante: 1 },
  { id: 'torse_mailles', nom: { FR: 'Cotte de mailles', EN: 'Chainmail' }, emplacement: 'torse', bonus: { endurance: 3, force: 1 }, rarete: 'rare', couleur: '#8A8F96', variante: 2 },
  { id: 'torse_plates', nom: { FR: 'Plates du chevalier', EN: "Knight's plate" }, emplacement: 'torse', bonus: { force: 4, endurance: 3 }, rarete: 'legendaire', couleur: '#C9A85A', variante: 3 },
  // Jambes
  { id: 'jambes_cuir', nom: { FR: 'Braies de cuir', EN: 'Leather breeches' }, emplacement: 'jambes', bonus: { verve: 1 }, rarete: 'commune', couleur: '#6B4A2E', variante: 1 },
  { id: 'jambes_mailles', nom: { FR: 'Chausses de mailles', EN: 'Mail chausses' }, emplacement: 'jambes', bonus: { endurance: 2 }, rarete: 'rare', couleur: '#8A8F96', variante: 2 },
  // Bottes
  { id: 'bottes_cuir', nom: { FR: 'Bottes de route', EN: 'Road boots' }, emplacement: 'pieds', bonus: { verve: 1 }, rarete: 'commune', couleur: '#4A3420', variante: 1 },
  { id: 'bottes_ferrees', nom: { FR: 'Bottes ferrées', EN: 'Ironshod boots' }, emplacement: 'pieds', bonus: { force: 1, endurance: 1 }, rarete: 'rare', couleur: '#5C5F66', variante: 2 },
  // Armes (main droite)
  { id: 'epee', nom: { FR: 'Épée de vagabond', EN: "Wanderer's sword" }, emplacement: 'mainDroite', bonus: { force: 2 }, rarete: 'commune', couleur: '#9AA0A6', variante: 1 },
  { id: 'hache', nom: { FR: 'Hache de guerre', EN: 'War axe' }, emplacement: 'mainDroite', bonus: { force: 3, chance: -1 }, rarete: 'rare', couleur: '#7A7F86', variante: 2 },
  { id: 'baton', nom: { FR: 'Bâton du sage', EN: "Sage's staff" }, emplacement: 'mainDroite', bonus: { ruse: 3, chance: 1 }, rarete: 'legendaire', couleur: '#D8B05A', variante: 3 },
  // Boucliers (main gauche)
  { id: 'bouclier_bois', nom: { FR: 'Écu de bois', EN: 'Wooden buckler' }, emplacement: 'mainGauche', bonus: { endurance: 1 }, rarete: 'commune', couleur: '#6B4A2E', variante: 1 },
  { id: 'bouclier_fer', nom: { FR: 'Écu ferré', EN: 'Ironbound shield' }, emplacement: 'mainGauche', bonus: { endurance: 2, force: 1 }, rarete: 'rare', couleur: '#8A8F96', variante: 2 },
  // Capes
  { id: 'cape_voyageur', nom: { FR: 'Cape du voyageur', EN: "Traveller's cape" }, emplacement: 'cape', bonus: { chance: 1 }, rarete: 'commune', couleur: '#5B2E2E', variante: 1 },
  { id: 'cape_ordre', nom: { FR: "Cape de l'Ordre", EN: "Cape of the Order" }, emplacement: 'cape', bonus: { chance: 2, verve: 1 }, rarete: 'rare', couleur: '#3A2E5B', variante: 2 },
  // Amulette
  { id: 'amulette_lievre', nom: { FR: 'Amulette du lièvre', EN: 'Hare amulet' }, emplacement: 'amulette', bonus: { chance: 2 }, rarete: 'rare', couleur: '#D8B05A', variante: 1 },
  // Anneau
  { id: 'anneau_brume', nom: { FR: 'Anneau de brume', EN: 'Mist ring' }, emplacement: 'anneau', bonus: { ruse: 2 }, rarete: 'rare', couleur: '#D8B05A', variante: 1 },
];

export function objetParId(id: string | null | undefined): Objet | null {
  if (!id) return null;
  return CATALOGUE.find((o) => o.id === id) ?? null;
}

export const SAC_DEPART: string[] = ['epee', 'torse_cuir', 'cape_voyageur'];

/** Corps, teintes de peau et coiffures : les paramètres du mannequin
 *  hors équipement, aussi choisis dans l'inventaire. */
export const CORPS = ['A', 'B'] as const;
export type CorpsId = (typeof CORPS)[number];

export const TEINTES_PEAU = ['#E8DDC1', '#C9966B', '#8B5A3C'];

export const COIFFURES = [0, 1, 2, 3] as const;
export const COULEURS_COIFFURE = ['#3B2A1C', '#6B4423', '#9A9A9A', '#C9A85A'];
