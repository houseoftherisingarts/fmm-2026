// Le décompte des places du banquet du Prince William.
//
// La salle compte cinquante places, et pas une de plus. Le nombre de
// places déjà vendues est tenu par le webhook Square (`squareGrimoire`
// dans functions/index.js), qui incrémente un seul document quand un
// paiement de banquet se termine.
//
// Ce document ne contient QUE le nombre et la date de sa dernière mise
// à jour. Aucun acheteur, aucun courriel, aucun montant : il est lisible
// par tout le monde, alors il ne doit jamais rien porter d'autre.
//
// Règle d'or : si la lecture échoue, ou si le document n'existe pas
// encore, la fonction rend `null` et la page n'affiche rien. Mieux vaut
// se taire qu'annoncer un chiffre faux (Alex, 2026-08-23).

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/** La capacité réelle de la tablée, écrite en dur parce qu'elle ne bouge pas. */
export const PLACES_BANQUET = 50;

/**
 * Traduit le champ `vendues` du compteur en places encore libres.
 *
 * Tout ce qui n'est pas un nombre entier positif rend `null`, qui veut
 * dire « je ne sais pas » et fait taire l'affichage. Un document vide,
 * une chaîne, un négatif : rien de tout cela ne doit produire un chiffre.
 * Vérifiée par `node tools/banquet-check.mjs`.
 */
export function placesRestantes(vendues: unknown): number | null {
  if (typeof vendues !== 'number' || !Number.isFinite(vendues) || vendues < 0) return null;
  // Une vente de plus que la capacité ne descend pas sous zéro : la page
  // dirait alors « il reste moins deux places ».
  return Math.max(0, PLACES_BANQUET - Math.floor(vendues));
}

/**
 * S'abonne au nombre de places encore libres.
 * Rend une fonction de désabonnement, comme `onSnapshot`.
 * La valeur `null` signifie « aucune lecture fiable », jamais « zéro ».
 */
export function subscribeBanquetRestant(cb: (restant: number | null) => void): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(
    doc(db, 'banquetPlaces', 'compteur'),
    (snap) => cb(placesRestantes(snap.exists() ? (snap.data() as { vendues?: unknown }).vendues : undefined)),
    () => cb(null),
  );
}
