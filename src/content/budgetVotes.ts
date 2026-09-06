// ─── Votez avec votre portefeuille ───────────────────────────────────
// Alex, 2026-09-06 : « où voulez-vous voir votre argent travailler
// l'an prochain ? » Six enveloppes, une bourse, et deux façons d'y
// mettre du poids : les Montpellois du site, ou de l'argent réel qui
// passe par Zeffy.
//
// Les identifiants sont les MÊMES que CATEGORIES_BUDGET dans
// functions/index.js. Le serveur refuse tout ce qui n'y figure pas,
// donc un ajout ici sans l'autre là-bas rend la case morte.

/** La billetterie Zeffy ouverte pour l'instant. Chaque enveloppe
 *  gagnera la sienne quand Alex les aura créées : il suffira alors de
 *  poser l'adresse dans le champ `zeffy` de la catégorie. */
export const ZEFFY_BUDGET =
  'https://www.zeffy.com/fr-CA/donation-form/apportez-le-reseau-a-montpellier';

export type CategorieBudgetId =
  | 'pourboires' | 'musique' | 'animations' | 'village' | 'bouffe' | 'reseau';

export interface CategorieBudget {
  id: CategorieBudgetId;
  /** Le nom du fichier d'icône lucide, résolu par le panneau. */
  icone: 'hand-heart' | 'music' | 'drama' | 'tent' | 'utensils-crossed' | 'wifi';
  nomFR: string; nomEN: string;
  texteFR: string; texteEN: string;
  /** Sa propre campagne Zeffy, quand elle existe. */
  zeffy?: string;
}

export const CATEGORIES_BUDGET: CategorieBudget[] = [
  {
    id: 'pourboires', icone: 'hand-heart',
    nomFR: 'Pourboires aux bénévoles et aux organisateurs',
    nomEN: 'Tips for the volunteers and the organizers',
    texteFR: 'Les organisateurs bâtissent le festival gratuitement depuis la première année. Ce que vous mettez ici leur revient, et aux bénévoles qui tiennent les trois jours debout.',
    texteEN: 'The organizers have built this festival for free since year one. What you put here goes back to them, and to the volunteers who stay on their feet for three days.',
  },
  {
    id: 'musique', icone: 'music',
    nomFR: 'Le son et la musique',
    nomEN: 'Sound and music',
    texteFR: 'Cette enveloppe paie une meilleure sono et des techniciens qui savent s’en servir. Elle allonge aussi la liste des groupes qui montent sur scène.',
    texteEN: 'This envelope pays for a better sound system and for technicians who know how to run it. It also lengthens the list of bands that make it onstage.',
  },
  {
    id: 'animations', icone: 'drama',
    nomFR: 'Les animations et les spectacles',
    nomEN: 'Shows and street acts',
    texteFR: 'Les comédiens, les cracheurs de feu et les combats en armure vivent de cette case. Elle paie ce qui se joue quand la scène musicale se tait.',
    texteEN: 'Actors, fire breathers and armoured combat live off this one. It pays for what happens when the music stage falls quiet.',
  },
  {
    id: 'village', icone: 'tent',
    nomFR: 'Le village paysan et les rituels',
    nomEN: 'The peasant village and the rituals',
    texteFR: 'Le village se bâtit une tente à la fois, et chaque atelier ajouté rend l’immersion plus vraie. Les veillées et les rituels du soir se financent ici.',
    texteEN: 'The village grows one tent at a time, and every workshop added makes the immersion truer. The evening rituals are funded here.',
  },
  {
    id: 'bouffe', icone: 'utensils-crossed',
    nomFR: 'La bouffe et le bar',
    nomEN: 'Food and bar',
    texteFR: 'Cette case achète de meilleurs produits et allonge le menu. Elle garde aussi le bar approvisionné jusqu’à la fin du samedi soir.',
    texteEN: 'This one buys better ingredients and lengthens the menu. It also keeps the bar stocked to the end of Saturday night.',
  },
  {
    id: 'reseau', icone: 'wifi',
    nomFR: 'Internet et infrastructure',
    nomEN: 'Internet and infrastructure',
    texteFR: 'Le site du festival est un champ, et le réseau n’y monte pas tout seul. L’antenne et le courant sortent de cette enveloppe.',
    texteEN: 'The festival grounds are a field, and the network does not climb up there on its own. The antenna and the power come out of this envelope.',
    zeffy: ZEFFY_BUDGET,
  },
];

/** Les mises proposées d'un clic, sous le banc de mise. */
export const MISES_RAPIDES = [5, 10, 25, 50];
