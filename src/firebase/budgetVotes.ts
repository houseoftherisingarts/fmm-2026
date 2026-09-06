// ─── Le vote budgétaire, côté navigateur ─────────────────────────────
// Alex, 2026-09-06 : la mise se paie en Montpellois, donc elle passe
// obligatoirement par une Cloud Function. Le navigateur n'écrit jamais
// dans `bourses`, et il n'écrit pas non plus dans `votesBudget` : il ne
// fait que lire les totaux et appeler `voterBudget`.
//
//   votesBudget/totaux                { montpellois: {cat: n}, mises: {cat: n} }
//   votesBudget/totaux/membres/{uid}  { [cat]: n }

import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, firebaseApp } from '../firebase';
import type { CategorieBudgetId } from '../content/budgetVotes';

export interface TotauxBudget {
  /** Les Montpellois misés, par catégorie. */
  montpellois: Partial<Record<CategorieBudgetId, number>>;
  /** Le nombre de mises, par catégorie. */
  mises: Partial<Record<CategorieBudgetId, number>>;
}

const VIDE: TotauxBudget = { montpellois: {}, mises: {} };

/** Les totaux en direct. Une case jamais misée reste absente du
 *  document, donc l'appelant lit toujours avec un repli à zéro. */
export function suivreTotauxBudget(cb: (t: TotauxBudget) => void): () => void {
  if (!db) { cb(VIDE); return () => {}; }
  return onSnapshot(
    doc(db, 'votesBudget', 'totaux'),
    (snap) => cb(snap.exists() ? { ...VIDE, ...(snap.data() as TotauxBudget) } : VIDE),
    (e) => console.warn('[budget] écoute des totaux interrompue', e),
  );
}

/** Ce que le membre a déjà mis, case par case. */
export function suivreMesMises(
  uid: string,
  cb: (m: Partial<Record<CategorieBudgetId, number>>) => void,
): () => void {
  if (!db || !uid) { cb({}); return () => {}; }
  return onSnapshot(
    doc(db, 'votesBudget', 'totaux', 'membres', uid),
    (snap) => cb(snap.exists() ? (snap.data() as Partial<Record<CategorieBudgetId, number>>) : {}),
    (e) => console.warn('[budget] écoute de mes mises interrompue', e),
  );
}

/** Mise en Montpellois. Le serveur débite la bourse et incrémente les
 *  deux compteurs; il refuse (failed-precondition) quand le solde ne
 *  suffit pas, et l'appelant montre le message tel quel. */
export async function voterBudget(
  categorie: CategorieBudgetId,
  montant: number,
): Promise<{ solde: number }> {
  if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
  const fn = httpsCallable<{ categorie: string; montant: number }, { solde: number }>(
    getFunctions(firebaseApp, 'us-central1'), 'voterBudget',
  );
  const { data } = await fn({ categorie, montant });
  return data;
}
