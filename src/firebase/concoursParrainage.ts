// ─── Les candidats au concours de parrainage ─────────────────────────
// Alex, 2026-09-10 : un artisan commandite un prix, et le tirage se fait
// parmi les gens qui ont amené quelqu'un au festival. Personne ne
// s'inscrit à ce concours : la liste se déduit de `parrainages`, où
// chaque filleul porte l'identifiant de celui qui l'a amené.
//
//   /parrainages/{filleulUid}  { parrainUid, code, filleulNom, creeLe }
//   /users/{uid}               { nom, prenom, email, codeParrain, … }
//
// Une chance par filleul, comme sur le concours William : quelqu'un qui
// en a amené trois voit son nom trois fois dans le chapeau.

import {
  collection, getDocs, query, where, documentId,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, firebaseApp } from '../firebase';
import type { Parrainage } from './parrainage';

export interface CandidatParrainage {
  uid: string;
  nom: string;
  courriel: string;
  code: string;
  /** Le nombre de filleuls, qui est aussi le nombre de chances au tirage. */
  chances: number;
  /** Les noms des filleuls, dans l'ordre où ils sont arrivés. */
  filleuls: string[];
  /** Le dernier filleul amené, en millisecondes, pour trier à égalité. */
  dernierLe: number;
  /** La case du tirage est cochée dans son espace membre. */
  auTirage: boolean;
}

const nomDeFiche = (d: Record<string, unknown>): string => {
  const complet = [d.prenom, d.nom].filter(Boolean).join(' ').trim();
  return complet || (d.displayName as string) || (d.email as string) || 'Sans nom';
};

/**
 * Tous ceux qui ont amené au moins une personne, du plus grand nombre de
 * filleuls au plus petit. Les fiches manquantes ne font pas tomber la
 * liste : le parrain reste, sous son identifiant.
 */
export async function listerCandidatsParrainage(): Promise<CandidatParrainage[]> {
  if (!db) return [];

  const snap = await getDocs(collection(db, 'parrainages'));
  const parParrain = new Map<string, Parrainage[]>();
  snap.docs.forEach((d) => {
    const p = d.data() as Parrainage;
    if (!p.parrainUid) return;
    const liste = parParrain.get(p.parrainUid) || [];
    liste.push(p);
    parParrain.set(p.parrainUid, liste);
  });
  if (parParrain.size === 0) return [];

  // Les fiches des parrains, par lots de trente : c'est la limite d'un `in`.
  const uids = [...parParrain.keys()];
  const fiches = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < uids.length; i += 30) {
    const lot = uids.slice(i, i + 30);
    const q = query(collection(db, 'users'), where(documentId(), 'in', lot));
    const res = await getDocs(q);
    res.docs.forEach((d) => fiches.set(d.id, d.data() as Record<string, unknown>));
  }

  const rangees: CandidatParrainage[] = uids.map((uid) => {
    const liste = parParrain.get(uid) || [];
    liste.sort((a, b) => (a.creeLe?.toMillis?.() ?? 0) - (b.creeLe?.toMillis?.() ?? 0));
    const fiche = fiches.get(uid);
    return {
      uid,
      nom: fiche ? nomDeFiche(fiche) : 'Fiche introuvable',
      courriel: (fiche?.email as string) || '',
      code: (fiche?.codeParrain as string) || liste[0]?.code || '',
      chances: liste.length,
      filleuls: liste.map((p) => p.filleulNom || 'Sans nom'),
      dernierLe: liste[liste.length - 1]?.creeLe?.toMillis?.() ?? 0,
      auTirage: Boolean((fiche?.concoursParrainage as { accepte?: boolean } | undefined)?.accepte),
    };
  });

  rangees.sort((a, b) => b.chances - a.chances || b.dernierLe - a.dernierLe);
  return rangees;
}

/**
 * Un nom tiré au sort, pondéré par le nombre de filleuls. Chaque chance
 * occupe une place dans le chapeau, donc trois filleuls valent trois
 * billets et non un seul.
 */
export function tirerAuSort(candidats: CandidatParrainage[]): CandidatParrainage | null {
  const total = candidats.reduce((somme, c) => somme + c.chances, 0);
  if (total === 0) return null;
  let n = Math.floor(Math.random() * total);
  for (const c of candidats) {
    n -= c.chances;
    if (n < 0) return c;
  }
  return candidats[candidats.length - 1] ?? null;
}

// ─── Le consentement du participant ──────────────────────────────────
// Alex, 2026-09-10 : quelqu'un entre au tirage en cochant la case, et la
// même coche remet son courriel au commanditaire pour son marketing. La
// coche ne veut rien dire sans filleul, donc la porte se ferme tant que
// personne n'est entré avec son code.
//
// Le compte des filleuls et l'écriture vivent côté serveur
// (functions/concoursParrainage.js). La première version comptait dans
// le navigateur puis écrivait `concoursParrainage` en direct, alors que
// les règles laissaient chaque membre écrire ce champ de sa propre
// fiche : n'importe qui entrait au tirage depuis la console sans avoir
// parrainé personne. Le champ est désormais rangé dans
// `userChampsServeur()` et seul le SDK admin y touche.

export interface EtatConcours {
  /** Le nombre de filleuls, qui est aussi le nombre de chances au tirage. */
  chances: number;
  /** Ce que la fiche dit aujourd'hui, ou rien si la case n'a jamais été touchée. */
  consentement: { accepte: boolean; commanditaire: string | null } | null;
}

export const COMMANDITAIRE_CONCOURS = 'artisans-azure-2026';

function appeler<TIn extends object, TOut>(nom: string) {
  return async (data: TIn): Promise<TOut> => {
    if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
    const fn = httpsCallable<TIn, TOut>(getFunctions(firebaseApp, 'us-central1'), nom);
    const { data: reponse } = await fn(data);
    return reponse;
  };
}

/** Mes chances et l'état de ma case, lus au serveur. */
export const lireMonConcours = appeler<Record<string, never>, EtatConcours>('concoursParrainageLire');

/**
 * Cocher la case, ou la décocher. Le serveur recompte les filleuls avant
 * d'écrire, donc « sans-filleul » est une vraie porte fermée et non un
 * simple affichage.
 */
export async function poserConsentementConcours(accepte: boolean): Promise<'ok' | 'sans-filleul' | 'erreur'> {
  try {
    const r = await appeler<{ accepte: boolean }, { etat: 'ok' | 'sans-filleul' }>(
      'concoursParrainagePoser',
    )({ accepte });
    return r.etat;
  } catch {
    return 'erreur';
  }
}
