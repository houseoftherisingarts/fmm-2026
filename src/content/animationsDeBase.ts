// ─── Les trois premières fiches d'animation ─────────────────────────
// Alex, 2026-09-15 : « préloader le système avec Aslak, Hullsborg,
// AMQ ». Ces trois-là existent déjà dans le site, mais éparpillés :
// le Chevalier Vert est le personnage vedette de la page Activités,
// Hullsborg est nommée dans le chapeau de la page Musique et dans un
// Saviez-vous, et les quatre activités de l'AMQ sont écrites dans les
// fiches d'activités. La graine les rassemble en trois dossiers.
//
// Rien n'est inventé ici. Les descriptifs sont recopiés de ce que le
// site dit déjà, et TOUT le reste (cachet, transport, électricité,
// couchage, heures de passage) reste vide : ce sont des engagements,
// et ils appartiennent à Tristan, pas à une graine de départ.

import { CONFIRMATIONS_VIDES, type AnimationInput } from '../firebase/animations';
import { CURRENT_YEAR } from '../firebase/applications';

const base = {
  statut: 'piste' as const,
  annee: CURRENT_YEAR,
  contactNom: '', courriel: '', telephone: '',
  eau: false, feu: false,
  hebergement: 'aucun' as const,
  transportMode: 'aucun' as const,
  repasFournis: false, hebergementFourni: false,
  confirmations: { ...CONFIRMATIONS_VIDES },
};

export const ANIMATIONS_DE_BASE: AnimationInput[] = [
  {
    ...base,
    nom: 'Aslak · le Chevalier Vert',
    type: 'campement',
    contactNom: 'Aslak Stormhammer',
    provenance: 'Clan Viking Autonome',
    descriptionFR: 'Co-chef du clan Viking Autonome avec Ariane Sigurdsdottir. Au fond des bois, loin de l’électricité, il tient forge et atelier : l’un des piliers vivants du festival. Retrouvez-le au marché ou autour du feu pour entendre les sagas.',
    descriptionEN: 'Co-chief of the Autonomous Viking Clan with Ariane Sigurdsdottir. Deep in the northern woods, far from electricity, he tends a forge and a workshop: one of the living pillars of the festival. Find him at the market or around the fire for the sagas.',
    jours: [],
    creneaux: [],
    notes: 'Fiche ouverte d’office le 15 septembre 2026 à partir de ce que le site dit déjà (personnage vedette de la page Activités). Le cachet, le transport et les heures de passage restent à convenir.',
    ordre: 10,
  },
  {
    ...base,
    nom: 'Troupe Hird Hafn Hullsborg',
    type: 'troupe',
    descriptionFR: 'Troupe de reconstitution viking qui incarne les gens du Nord dans les règles de l’art. Le festival la met à l’honneur dans sa programmation 2026, aux côtés de ses invités vikings.',
    descriptionEN: 'A Viking reenactment troupe who embody the people of the North by the book. The festival features them in its 2026 programme, alongside its Viking guests.',
    jours: [],
    creneaux: [],
    notes: 'Fiche ouverte d’office le 15 septembre 2026. Le descriptif vient du chapeau de la page Musique et du Saviez-vous sur la scène de reconstitution au Québec; tout le volet logistique et financier reste à remplir.',
    ordre: 20,
  },
  {
    ...base,
    nom: 'AMQ · Association médiévale de Québec',
    type: 'joute',
    provenance: 'Québec',
    descriptionFR: 'L’Association médiévale de Québec personnifie des chevaliers du XVᵉ siècle. Ses activités tiennent l’arène : les Chevaliers, la Joute AMQ, le Jeu du peuple et la Finale de joute du dimanche.',
    descriptionEN: 'The Association médiévale de Québec brings fifteenth-century knights to life. Their activities hold the arena: the Knights, the AMQ Joust, the People’s Game and Sunday’s Joust Final.',
    jours: [],
    // Les quatre passages sont déjà nommés dans les fiches d'activités.
    // Ils entrent ici sans heure : c'est exactement ce qui bloque le
    // bouton « Publier à l'horaire » tant que Tristan ne les a pas
    // convenus avec l'AMQ, et c'est voulu.
    creneaux: [
      { id: 'amq-chevaliers', jour: 'samedi',   heure: '', titre: 'Les Chevaliers',        lieu: 'Arène' },
      { id: 'amq-joute',      jour: 'samedi',   heure: '', titre: 'La Joute AMQ',          lieu: 'Arène' },
      { id: 'amq-peuple',     jour: 'samedi',   heure: '', titre: 'Le Jeu du peuple',      lieu: 'Arène' },
      { id: 'amq-finale',     jour: 'dimanche', heure: '', titre: 'Finale de joute',       lieu: 'Arène' },
    ],
    notes: 'Fiche ouverte d’office le 15 septembre 2026. Les quatre passages viennent des fiches d’activités déjà en ligne; les heures restent à convenir avec l’AMQ.',
    ordre: 30,
  },
];
