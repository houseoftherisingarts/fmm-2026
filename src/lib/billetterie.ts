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
//
// Alex, 2026-08-31 : tout ce système passe derrière le drapeau de site
// `billetsNonMembres`, ÉTEINT le temps que l'équipe vote. Éteint, la
// distinction disparaît : personne ne voit la porte, personne ne voit
// un prix majoré, tout le monde part sur la campagne membre.

export const RABAIS_MEMBRE = 5;

/** Tous les boutons « billets » du site passent par ce nom d'événement :
    la porte (PorteBilletterieGlobale, montée une fois dans App) l'écoute. */
export const EVENEMENT_PORTE = 'fmm:porte-billets';

// Miroir du drapeau `billetsNonMembres`. Les fonctions d'ici servent des
// gestionnaires de clic et un événement global, hors de tout composant :
// elles ne peuvent pas lire le contexte React. SiteFlagsProvider tient
// donc ce miroir à jour à chaque rendu (voir contexts/SiteFlagsContext).
let systemeNonMembres = false;

export function reglerSystemeNonMembres(actif: boolean): void {
  systemeNonMembres = actif;
}

/** Vrai quand la personne a droit au parcours membre : soit elle est
    connectée, soit le système des billets non membres est éteint. */
export const tarifMembre = (connecte: boolean): boolean => connecte || !systemeNonMembres;

export function lienBilletterie(connecte: boolean): string {
  const membre = import.meta.env.VITE_ZEFFY_TICKET_URL || '#';
  const publique = import.meta.env.VITE_ZEFFY_TICKET_URL_PUBLIC || membre;
  return tarifMembre(connecte) ? membre : publique;
}

/** Le geste unique de tout bouton « billets » : la personne au tarif
    membre file sur la campagne membre; la personne sans compte, quand le
    système est allumé, voit d'abord la porte qui offre les cinq dollars. */
export function ouvrirBilletterie(connecte: boolean): void {
  if (tarifMembre(connecte)) {
    window.open(lienBilletterie(true), '_blank', 'noopener,noreferrer');
  } else {
    window.dispatchEvent(new Event(EVENEMENT_PORTE));
  }
}

/** La majoration à ajouter au prix affiché : zéro au tarif membre. */
export const surchargeBillet = (connecte: boolean): number =>
  tarifMembre(connecte) ? 0 : RABAIS_MEMBRE;

/** Le prix affiché sur le site : majoré tant que la personne n'a pas de compte. */
export const prixAffiche = (montantMembre: number, connecte: boolean): number =>
  montantMembre + surchargeBillet(connecte);
