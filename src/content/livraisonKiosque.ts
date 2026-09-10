// ─── Repas livrés au kiosque · programme pilote 2026 ─────────────────
// Alex, 10 septembre 2026 : le service de repas livrés qui a été rendu
// aux Artisans d'Azure devient une offre, ouverte à dix kiosques pour
// cette édition. Cinquante dollars avant taxes par personne et par
// jour, deux repas apportés à la tente, des boîtes surprises tirées du
// menu du village. La page vit derrière un lien, /kiosque/livraison,
// et n'apparaît dans aucun menu.
//
// Le serveur garde la même table de prix dans functions/index.js : ce
// fichier-ci sert l'affichage, jamais le calcul qui encaisse.

export const PLACES_PILOTE = 10;
export const REPAS_PAR_JOUR = 2;

/** Cinquante dollars, en cents, par personne et par jour. */
export const PRIX_JOUR_CENTS = 5000;

export const TAUX_TPS = 0.05;
export const TAUX_TVQ = 0.09975;
export const NO_TPS = '736597287 RT0001';
export const NO_TVQ = '1225724543 TQ0001';

export type JourId = 'ven' | 'sam' | 'dim';

export interface JourFestival {
  id: JourId;
  labelFR: string;
  labelEN: string;
}

export const JOURS: JourFestival[] = [
  { id: 'ven', labelFR: 'Vendredi 25 septembre', labelEN: 'Friday, September 25' },
  { id: 'sam', labelFR: 'Samedi 26 septembre',   labelEN: 'Saturday, September 26' },
  { id: 'dim', labelFR: 'Dimanche 27 septembre', labelEN: 'Sunday, September 27' },
];

export interface Facture {
  sousTotalCents: number;
  tpsCents: number;
  tvqCents: number;
  totalCents: number;
}

/** La même arithmétique que le serveur : sous-total, puis les deux
 *  taxes calculées chacune sur le sous-total, jamais l'une sur l'autre. */
export function calculer(personnes: number, nbJours: number): Facture {
  const sousTotalCents = PRIX_JOUR_CENTS * Math.max(0, personnes) * Math.max(0, nbJours);
  const tpsCents = Math.round(sousTotalCents * TAUX_TPS);
  const tvqCents = Math.round(sousTotalCents * TAUX_TVQ);
  return { sousTotalCents, tpsCents, tvqCents, totalCents: sousTotalCents + tpsCents + tvqCents };
}

/** 10348 rend « 103,48 $ » en français et « $103.48 » en anglais. */
export function argent(cents: number, lang: 'FR' | 'EN'): string {
  const v = (cents / 100).toFixed(2);
  return lang === 'FR' ? `${v.replace('.', ',')} $` : `$${v}`;
}
