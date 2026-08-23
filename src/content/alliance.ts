// ─── L'Alliance ──────────────────────────────────────────────────────
// Les maisons avec qui le festival marche : d'autres festivals, la
// monnaie locale, les lieux qui nous accueillent. Écrite le 2026-08-23,
// gardée EN DORMANCE à la demande d'Alex : la page existe, elle ne
// s'allume que par le drapeau `pubAlliance` dans l'admin.
//
// ⚠️ Rien n'est annoncé ici qui n'ait été convenu avec la maison
// concernée. Ajouter une entrée seulement quand l'entente existe.

export interface Allie {
  id: string;
  nom: string;
  /** Ce qu'ils sont, en une ligne. */
  quoiFR: string; quoiEN: string;
  /** Ce qui nous lie. */
  lienFR: string; lienEN: string;
  lieu?: string;
  site?: string;
  /** Tant qu'une entente n'est pas signée, l'entrée reste en attente. */
  confirme: boolean;
}

export const ALLIES: Allie[] = [
  {
    id: 'salon',
    nom: 'Le Salon des Inconnus',
    quoiFR: 'L’auberge artistique de la Petite-Nation, à Namur.',
    quoiEN: 'The artistic inn of the Petite-Nation, in Namur.',
    lienFR: 'La maison d’où le festival est parti. Elle loge les artistes, prête ses cuisines et ouvre ses chambres aux festivaliers.',
    lienEN: 'The house the festival came from. It lodges artists, lends its kitchens and opens its rooms to festival-goers.',
    lieu: 'Namur, Québec',
    site: 'https://lesalondesinconnus.com',
    confirme: true,
  },
  {
    id: 'petite-monnaie',
    nom: 'La Petite Monnaie',
    quoiFR: 'La monnaie locale de la Petite-Nation.',
    quoiEN: 'The local currency of the Petite-Nation.',
    lienFR: 'Elle circule sur le site du festival, et ce qu’elle achète ici reste dans la région.',
    lienEN: 'It circulates on the festival grounds, and what it buys here stays in the region.',
    lieu: 'Petite-Nation',
    confirme: true,
  },
];

/** Ce qui reste à écrire quand les ententes seront faites. */
export const A_VENIR_FR = 'D’autres maisons rejoindront cette page à mesure que les ententes se signeront.';
export const A_VENIR_EN = 'Other houses will join this page as agreements are signed.';
