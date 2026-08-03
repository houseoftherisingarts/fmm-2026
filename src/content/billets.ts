// ─── Billetterie : les cartes de la page d'accueil des billets ───────
//
// Les montants viennent des deux billetteries Zeffy, relevés le
// 2026-08-03 sur les pages réelles :
//   • https://www.zeffy.com/fr-CA/ticketing/fmm--2026   (entrées)
//   • https://www.zeffy.com/fr-CA/ticketing/camping-7   (camping)
// Rien n'est inventé ici. Si un prix change sur Zeffy, il faut le
// changer ici aussi : les deux ne sont pas synchronisés.
//
// 🚨 `zeffyAmount` = le montant affiché PAR Zeffy.
// `showBeforeTax` décide de ce que la carte montre :
//   true  -> le montant hors taxes, calculé à partir du montant Zeffy
//   false -> le montant Zeffy tel quel
// Alex veut le prix avant taxes sur les cartes, Zeffy affichant le prix
// taxes comprises. À CONFIRMER avant mise en ligne : si les montants
// Zeffy sont en réalité HORS taxes, il faut passer ce drapeau à false,
// sinon les cartes annonceraient un prix plus bas que la réalité.

export const TPS = 0.05;
export const TVQ = 0.09975;
export const TAX_RATE = TPS + TVQ;          // 14,975 % au Québec

export const showBeforeTax = true;

export interface Billet {
  id:        string;
  /** Montant affiché par Zeffy, en dollars. */
  zeffyAmount: number;
  labelFR:   string;
  labelEN:   string;
  descFR:    string;
  descEN:    string;
  /** Mention courte sous le prix (durée, composition d'un groupe). */
  noteFR?:   string;
  noteEN?:   string;
  /** Vers quelle billetterie Zeffy la carte envoie. */
  billetterie: 'entrees' | 'camping';
  /** Mise en avant visuelle : la carte se détache du jeu. */
  vedette?:  boolean;
}

export const BILLETS: Billet[] = [
  {
    id: 'adulte-jour',
    zeffyAmount: 35,
    labelFR: 'Adulte, une journée',   labelEN: 'Adult, one day',
    descFR: 'Le programme complet et les activités principales, pour la journée de votre choix.',
    descEN: 'The full program and the main activities, for the day of your choice.',
    noteFR: 'Une personne · un jour',  noteEN: 'One person · one day',
    billetterie: 'entrees',
  },
  {
    id: 'enfant-jour',
    zeffyAmount: 20,
    labelFR: 'Enfant, une journée',   labelEN: 'Child, one day',
    descFR: 'Le programme complet et les activités principales, pour la journée de votre choix.',
    descEN: 'The full program and the main activities, for the day of your choice.',
    noteFR: '6 à 16 ans · un jour',    noteEN: 'Ages 6 to 16 · one day',
    billetterie: 'entrees',
  },
  {
    id: 'adulte-weekend',
    zeffyAmount: 55,
    labelFR: 'Adulte, passe fin de semaine', labelEN: 'Adult, weekend pass',
    descFR: 'Les trois jours. Le programme complet et les activités principales, du vendredi au dimanche.',
    descEN: 'All three days. The full program and the main activities, Friday through Sunday.',
    noteFR: 'Une personne · trois jours', noteEN: 'One person · three days',
    billetterie: 'entrees',
    vedette: true,
  },
  {
    id: 'enfant-weekend',
    zeffyAmount: 25,
    labelFR: 'Enfant, passe fin de semaine', labelEN: 'Child, weekend pass',
    descFR: 'Les trois jours. Le programme complet et les activités principales, du vendredi au dimanche.',
    descEN: 'All three days. The full program and the main activities, Friday through Sunday.',
    noteFR: '6 à 16 ans · trois jours', noteEN: 'Ages 6 to 16 · three days',
    billetterie: 'entrees',
  },
  {
    id: 'famille-jour',
    zeffyAmount: 90,
    labelFR: 'Famille, une journée',  labelEN: 'Family, one day',
    descFR: 'Un billet de groupe qui en contient quatre. Le programme complet pour la journée de votre choix.',
    descEN: 'A group ticket holding four. The full program for the day of your choice.',
    noteFR: '2 adultes, 2 enfants · un jour', noteEN: '2 adults, 2 children · one day',
    billetterie: 'entrees',
  },
  {
    id: 'famille-weekend',
    zeffyAmount: 125,
    labelFR: 'Famille, passe fin de semaine', labelEN: 'Family, weekend pass',
    descFR: 'Un billet de groupe qui en contient quatre, pour les trois jours du festival.',
    descEN: 'A group ticket holding four, for all three festival days.',
    noteFR: '2 adultes, 2 enfants · trois jours', noteEN: '2 adults, 2 children · three days',
    billetterie: 'entrees',
    vedette: true,
  },
  {
    id: 'camping-vr',
    zeffyAmount: 40,
    labelFR: 'Emplacement caravane',  labelEN: 'Caravan pitch',
    descFR: 'Un grand emplacement pour une roulotte ou un véhicule récréatif, sur le terrain du festival.',
    descEN: 'A large pitch for a camper or an RV, on the festival grounds.',
    noteFR: 'Du 25 au 27 septembre',  noteEN: 'September 25 to 27',
    billetterie: 'camping',
  },
  {
    id: 'camping-tente',
    zeffyAmount: 20,
    labelFR: 'Emplacement tente',     labelEN: 'Tent pitch',
    descFR: 'Un emplacement pour une tente ou une petite voiture, à deux pas du village.',
    descEN: 'A pitch for a tent or a small car, a few steps from the village.',
    noteFR: 'Du 25 au 27 septembre',  noteEN: 'September 25 to 27',
    billetterie: 'camping',
  },
];

/** Montant à afficher sur la carte, selon le drapeau `showBeforeTax`. */
export function displayAmount(b: Billet): number {
  return showBeforeTax ? b.zeffyAmount / (1 + TAX_RATE) : b.zeffyAmount;
}

/** « 30,44 $ » en français, « $30.44 » en anglais. */
export function formatAmount(n: number, lang: 'FR' | 'EN'): string {
  const v = n.toFixed(2).replace(/\.00$/, '');
  return lang === 'FR' ? `${v.replace('.', ',')} $` : `$${v}`;
}
