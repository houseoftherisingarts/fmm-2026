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
  commune: 'rgba(var(--sk-parchment-rgb),0.30)',
  rare: '#6FA8DC',
  legendaire: 'var(--sk-gilt)',
};

/** D'où vient l'objet : le sac de départ, un badge gagné, une trouvaille
 *  aléatoire au fil des visites, ou un achat en Montpellois à la
 *  boutique (Alex, 2026-08-28 — voir src/firebase/montpellois.ts). */
export type SourceObjet = 'depart' | 'badge' | 'trouvaille' | 'boutique';

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
  source: SourceObjet;
  /** Prix en Montpellois, seulement pour source === 'boutique'. */
  prix?: number;
  /** L'id du badge qui le débloque, seulement pour source === 'badge'
   *  (voir src/firebase/badges.ts pour la liste des ids). */
  badgeId?: string;
}

export const CATALOGUE: Objet[] = [
  // Casques
  { id: 'casque_cuir', nom: { FR: 'Capuche de cuir', EN: 'Leather hood' }, emplacement: 'tete', bonus: { ruse: 1 }, rarete: 'commune', couleur: '#6B4A2E', variante: 1, source: 'trouvaille' },
  { id: 'casque_mailles', nom: { FR: 'Coiffe de mailles', EN: 'Mail coif' }, emplacement: 'tete', bonus: { endurance: 2, force: 1 }, rarete: 'rare', couleur: '#8A8F96', variante: 2, source: 'trouvaille' },
  { id: 'casque_heaume', nom: { FR: 'Heaume du gardien', EN: "Guardian's greathelm" }, emplacement: 'tete', bonus: { force: 3, endurance: 2 }, rarete: 'legendaire', couleur: 'var(--sk-gilt)', variante: 3, source: 'trouvaille' },
  { id: 'casque_corbeau', nom: { FR: 'Masque du corbeau', EN: 'Raven mask' }, emplacement: 'tete', bonus: {}, rarete: 'rare', couleur: '#1B1B1E', variante: 4, source: 'boutique', prix: 15 },
  { id: 'casque_couronne_parrain', nom: { FR: 'Couronne du Parrain', EN: "Godfather's crown" }, emplacement: 'tete', bonus: {}, rarete: 'legendaire', couleur: 'var(--sk-gilt)', variante: 5, source: 'badge', badgeId: 'le-parrain' },
  { id: 'couronne_fleurs', nom: { FR: 'Couronne de fleurs', EN: 'Flower crown' }, emplacement: 'tete', bonus: {}, rarete: 'rare', couleur: '#7FA86B', variante: 6, source: 'boutique', prix: 12 },
  // Torses
  { id: 'torse_cuir', nom: { FR: 'Jaque de cuir', EN: 'Leather jack' }, emplacement: 'torse', bonus: { ruse: 1, endurance: 1 }, rarete: 'commune', couleur: '#6B4A2E', variante: 1, source: 'depart' },
  { id: 'torse_mailles', nom: { FR: 'Cotte de mailles', EN: 'Chainmail' }, emplacement: 'torse', bonus: { endurance: 3, force: 1 }, rarete: 'rare', couleur: '#8A8F96', variante: 2, source: 'trouvaille' },
  { id: 'torse_plates', nom: { FR: 'Plates du chevalier', EN: "Knight's plate" }, emplacement: 'torse', bonus: { force: 4, endurance: 3 }, rarete: 'legendaire', couleur: 'var(--sk-brass-warm)', variante: 3, source: 'trouvaille' },
  { id: 'torse_troubadour', nom: { FR: 'Justaucorps du troubadour', EN: "Troubadour's doublet" }, emplacement: 'torse', bonus: { ruse: 2, verve: 1 }, rarete: 'rare', couleur: '#7A4A6B', variante: 4, source: 'trouvaille' },
  // Jambes
  { id: 'jambes_cuir', nom: { FR: 'Braies de cuir', EN: 'Leather breeches' }, emplacement: 'jambes', bonus: { verve: 1 }, rarete: 'commune', couleur: '#6B4A2E', variante: 1, source: 'trouvaille' },
  { id: 'jambes_mailles', nom: { FR: 'Chausses de mailles', EN: 'Mail chausses' }, emplacement: 'jambes', bonus: { endurance: 2 }, rarete: 'rare', couleur: '#8A8F96', variante: 2, source: 'trouvaille' },
  // Bottes
  { id: 'bottes_cuir', nom: { FR: 'Bottes de route', EN: 'Road boots' }, emplacement: 'pieds', bonus: { verve: 1 }, rarete: 'commune', couleur: '#4A3420', variante: 1, source: 'trouvaille' },
  { id: 'bottes_ferrees', nom: { FR: 'Bottes ferrées', EN: 'Ironshod boots' }, emplacement: 'pieds', bonus: { force: 1, endurance: 1 }, rarete: 'rare', couleur: '#5C5F66', variante: 2, source: 'trouvaille' },
  { id: 'bottes_ailees', nom: { FR: 'Bottes ailées', EN: 'Winged boots' }, emplacement: 'pieds', bonus: { verve: 2, chance: 1 }, rarete: 'legendaire', couleur: 'var(--sk-brass-warm)', variante: 3, source: 'trouvaille' },
  // Armes (main droite)
  { id: 'epee', nom: { FR: 'Épée de vagabond', EN: "Wanderer's sword" }, emplacement: 'mainDroite', bonus: { force: 2 }, rarete: 'commune', couleur: '#9AA0A6', variante: 1, source: 'depart' },
  { id: 'hache', nom: { FR: 'Hache de guerre', EN: 'War axe' }, emplacement: 'mainDroite', bonus: { force: 3, chance: -1 }, rarete: 'rare', couleur: '#7A7F86', variante: 2, source: 'trouvaille' },
  { id: 'baton', nom: { FR: 'Bâton du sage', EN: "Sage's staff" }, emplacement: 'mainDroite', bonus: { ruse: 3, chance: 1 }, rarete: 'legendaire', couleur: 'var(--sk-gilt)', variante: 3, source: 'trouvaille' },
  { id: 'epee_errant', nom: { FR: 'Épée du chevalier errant', EN: "Wandering knight's sword" }, emplacement: 'mainDroite', bonus: { force: 2, endurance: 1 }, rarete: 'rare', couleur: '#7C8894', variante: 1, source: 'trouvaille' },
  { id: 'epee_lune', nom: { FR: 'Épée de lune', EN: 'Moonlight sword' }, emplacement: 'mainDroite', bonus: { force: 3, chance: 2 }, rarete: 'legendaire', couleur: '#B9C6E0', variante: 4, source: 'trouvaille' },
  // Boucliers (main gauche)
  { id: 'bouclier_bois', nom: { FR: 'Écu de bois', EN: 'Wooden buckler' }, emplacement: 'mainGauche', bonus: { endurance: 1 }, rarete: 'commune', couleur: '#6B4A2E', variante: 1, source: 'trouvaille' },
  { id: 'bouclier_fer', nom: { FR: 'Écu ferré', EN: 'Ironbound shield' }, emplacement: 'mainGauche', bonus: { endurance: 2, force: 1 }, rarete: 'rare', couleur: '#8A8F96', variante: 2, source: 'trouvaille' },
  // Capes
  { id: 'cape_voyageur', nom: { FR: 'Cape du voyageur', EN: "Traveller's cape" }, emplacement: 'cape', bonus: { chance: 1 }, rarete: 'commune', couleur: '#5B2E2E', variante: 1, source: 'depart' },
  { id: 'cape_ordre', nom: { FR: "Cape de l'Ordre", EN: "Cape of the Order" }, emplacement: 'cape', bonus: { chance: 2, verve: 1 }, rarete: 'rare', couleur: '#3A2E5B', variante: 2, source: 'trouvaille' },
  { id: 'cape_benevole', nom: { FR: 'Cape du bénévole', EN: "Volunteer's cape" }, emplacement: 'cape', bonus: { endurance: 2, verve: 1 }, rarete: 'rare', couleur: '#4A6B4A', variante: 3, source: 'badge', badgeId: 'benevole' },
  { id: 'cape_etoilee', nom: { FR: 'Cape étoilée', EN: 'Starlit cape' }, emplacement: 'cape', bonus: {}, rarete: 'legendaire', couleur: '#453390', variante: 4, source: 'boutique', prix: 25 },
  // Amulette
  { id: 'amulette_lievre', nom: { FR: 'Amulette du lièvre', EN: 'Hare amulet' }, emplacement: 'amulette', bonus: { chance: 2 }, rarete: 'rare', couleur: 'var(--sk-gilt)', variante: 1, source: 'trouvaille' },
  { id: 'amulette_oeil', nom: { FR: "Amulette de l'œil", EN: 'Amulet of the eye' }, emplacement: 'amulette', bonus: { ruse: 1, chance: 2 }, rarete: 'rare', couleur: '#5B3A6B', variante: 2, source: 'badge', badgeId: 'photographe' },
  // Anneau
  { id: 'anneau_brume', nom: { FR: 'Anneau de brume', EN: 'Mist ring' }, emplacement: 'anneau', bonus: { ruse: 2 }, rarete: 'rare', couleur: 'var(--sk-gilt)', variante: 1, source: 'trouvaille' },
];

/** Les objets qu'on peut tirer au sort au chantier (voir trouvailles.ts). */
export const OBJETS_TROUVAILLE: Objet[] = CATALOGUE.filter((o) => o.source === 'trouvaille');
/** Les objets vendus à la boutique en Montpellois. */
export const OBJETS_BOUTIQUE: Objet[] = CATALOGUE.filter((o) => o.source === 'boutique');
/** Les objets débloqués par un badge, indexés par id de badge. */
export const OBJET_PAR_BADGE: Record<string, Objet> = Object.fromEntries(
  CATALOGUE.filter((o) => o.source === 'badge' && o.badgeId).map((o) => [o.badgeId as string, o]),
);

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
export const COULEURS_COIFFURE = ['#3B2A1C', '#6B4423', '#9A9A9A', 'var(--sk-brass-warm)'];
