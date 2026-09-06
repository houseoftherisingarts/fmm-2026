// ─── Le bureau de change ─────────────────────────────────────────────
// Addendum 2 du 6 septembre 2026, ordres 11 et 12. Toutes les pièces
// de groupe se cotent au même tableau, lu dans le miroir public
// guildesPubliques/{id} (que le serveur enrichit du taux, des actifs,
// du trésor et de sa part). Passer d'une pièce à l'autre se fait par
// le Montpellois : A → M au cours de A, moins cinq pour cent de pièces
// A pour le trésor de A, puis M → B au cours de B. Entiers partout,
// arrondis vers le bas à chaque marche, comme sur le serveur.
//
// Rien ici n'écrit un solde : les deux callables de functions/guildes.js
// bougent l'argent, le navigateur lit et demande.

import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, firebaseApp } from '../firebase';
import type { PointTaux } from './guildes';
import type { GuildePublique } from './guildesPubliques';
import { FRAIS_CHANGE, tauxPour } from './guildeMonnaie';

/** Ce que le miroir public porte depuis l'ordre 12, en plus de la
 *  fiche : le cours, les actifs, le trésor et sa valeur. Les champs
 *  restent facultatifs tant que le serveur ne les a pas tous posés. */
export interface Cote {
  taux?: number;
  nbActifs?: number;
  nbMembres?: number;
  tresor?: number;
  valeurTresorM?: number;
  partTresor?: number;
  tauxHistorique?: Array<PointTaux & { partTresor?: number }>;
}

export type GuildeCotee = GuildePublique & Cote;

/** Le cours d'une guilde, ou son repli sur la formule des actifs. */
export const tauxDe = (g: Cote): number => g.taux ?? tauxPour(g.nbActifs ?? g.nbMembres ?? 0);

/** La valeur du trésor en Montpellois, calculée si le serveur ne l'a
 *  pas encore écrite. */
export const valeurTresorDe = (g: Cote): number =>
  g.valeurTresorM ?? Math.floor((g.tresor ?? 0) * tauxDe(g));

/** La part du trésor de la guilde dans l'ensemble, telle que le
 *  serveur l'a écrite; zéro tant qu'il ne l'a pas fait. */
export const partTresorDe = (g: Cote): number => g.partTresor ?? 0;

/** Ce que vaut une pièce de A en pièces de B : taux_A / taux_B. */
export function tauxCroise(tauxA: number, tauxB: number): number {
  if (tauxB <= 0) return 0;
  return Math.round((tauxA / tauxB) * 1000) / 1000;
}

/** La même arithmétique que le serveur, sinon l'aperçu ment : les
 *  frais en pièces A arrondis, puis M vers le bas, puis B vers le bas.
 *  Le transfert de trésor à trésor passe `sansFrais`. */
export function apercuChangeCroise(
  montant: number, tauxA: number, tauxB: number, sansFrais = false,
): { frais: number; montpellois: number; recu: number } {
  const n = Math.max(0, Math.floor(montant));
  const frais = sansFrais ? 0 : Math.round(n * FRAIS_CHANGE);
  const montpellois = Math.floor((n - frais) * tauxA);
  const recu = tauxB > 0 ? Math.floor(montpellois / tauxB) : 0;
  return { frais, montpellois, recu };
}

/** Toutes les guildes du miroir public, par nom. Se lit sans compte. */
export function suivreToutesLesGuildesPubliques(cb: (guildes: GuildeCotee[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, 'guildesPubliques'), orderBy('nom'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GuildeCotee, 'id'>) }))),
    () => cb([]),
  );
}

// Le même patron d'appel que guildeMonnaie.ts (qui garde le sien privé).
function appeler<TIn extends object, TOut>(nom: string) {
  return async (data: TIn): Promise<TOut> => {
    if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
    const fn = httpsCallable<TIn, TOut>(getFunctions(firebaseApp, 'us-central1'), nom);
    const { data: reponse } = await fn(data);
    return reponse;
  };
}

/** Mes pièces de A deviennent des pièces de B. Il faut être membre des
 *  deux; le plafond du jour se compte côté A. */
export const guildeChangerCroise = (args: { deGuildeId: string; versGuildeId: string; montant: number }) =>
  appeler<typeof args, { recu?: number }>('guildeChangerCroise')(args);

/** Un chef (ou l'équipe) de A verse une fortune du trésor de A au
 *  trésor de B, aux deux cours, sans frais. */
export const guildeTresorTransferer = (args: { deGuildeId: string; versGuildeId: string; montant: number; note?: string }) =>
  appeler<typeof args, { recu?: number }>('guildeTresorTransferer')(args);
