// ─── La billetterie, selon que la personne a un compte ou non ────────
// Alex, 2026-08-28 : « au lieu d'amener les gens directement sur Zeffy,
// un pop-up : vous serez redirigé vers notre billetterie, créez-vous un
// compte pour obtenir 5 $ de rabais par billet. Une fois le compte créé
// et la personne connectée, le bouton redevient le bouton actuel. »
//
// Deux campagnes Zeffy vivent donc côte à côte :
//   • la campagne PUBLIQUE, cinq dollars plus cher par billet, pour qui
//     arrive sans compte et refuse d'en créer un;
//   • la campagne MEMBRE, le prix d'aujourd'hui, pour qui est connecté.
//
// Les adresses viennent de .env.local :
//   VITE_ZEFFY_TICKET_URL         → la campagne membre (déjà en place)
//   VITE_ZEFFY_TICKET_URL_PUBLIC  → la campagne publique, majorée
// Tant que la seconde n'est pas posée, tout le monde retombe sur la
// première : le site ne se casse pas pendant qu'Alex monte la campagne.

export const RABAIS_MEMBRE = 5;

export function lienBilletterie(connecte: boolean): string {
  const membre = import.meta.env.VITE_ZEFFY_TICKET_URL || '#';
  const publique = import.meta.env.VITE_ZEFFY_TICKET_URL_PUBLIC || membre;
  return connecte ? membre : publique;
}

/** Le prix affiché sur le site : majoré tant que la personne n'a pas de compte. */
export const prixAffiche = (montantMembre: number, connecte: boolean): number =>
  connecte ? montantMembre : montantMembre + RABAIS_MEMBRE;
