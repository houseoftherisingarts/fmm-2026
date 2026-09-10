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
  collection, doc, getDoc, getDocs, query, where, documentId, setDoc,
  serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
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
// personne n'est entré avec son code. Le champ vit dans la fiche du
// membre, hors des champs réservés au serveur, donc aucune règle
// Firestore à toucher.

export interface ConsentementConcours {
  accepte: boolean;
  /** Le commanditaire à qui la liste est remise, pour ne pas mêler les éditions. */
  commanditaire: string;
  signeLe: Timestamp | null;
}

export const COMMANDITAIRE_CONCOURS = 'artisans-azure-2026';

// Alex tient le site et n'a pas de filleul à lui : son compte compte
// pour un, sans quoi il ne peut pas voir ni essayer le bouton avant de
// le montrer au commanditaire. Rien d'autre ne change pour lui.
const COURRIELS_TEST = ['alex@lesalondesinconnus.com'];

/** Le nombre de personnes entrées avec mon code. */
export async function monNombreDeFilleuls(uid: string): Promise<number> {
  if (!db) return 0;
  const snap = await getDocs(query(collection(db, 'parrainages'), where('parrainUid', '==', uid)));
  if (snap.size > 0) return snap.size;
  const fiche = await getDoc(doc(db, 'users', uid));
  const courriel = fiche.exists() ? String(fiche.data().email || '').toLowerCase() : '';
  return COURRIELS_TEST.includes(courriel) ? 1 : 0;
}

/** Ce que la fiche dit aujourd'hui de mon inscription au tirage. */
export async function monConsentementConcours(uid: string): Promise<ConsentementConcours | null> {
  if (!db) return null;
  const fiche = await getDoc(doc(db, 'users', uid));
  const c = fiche.exists() ? (fiche.data().concoursParrainage as ConsentementConcours | undefined) : undefined;
  return c ?? null;
}

/**
 * Cocher la case, ou la décocher. Sans filleul, rien ne s'écrit et la
 * réponse dit pourquoi, pour que l'espace affiche la phrase au membre.
 */
export async function poserConsentementConcours(uid: string, accepte: boolean): Promise<'ok' | 'sans-filleul' | 'erreur'> {
  if (!db) return 'erreur';
  if (accepte && (await monNombreDeFilleuls(uid)) === 0) return 'sans-filleul';
  try {
    await setDoc(doc(db, 'users', uid), {
      concoursParrainage: {
        accepte,
        commanditaire: COMMANDITAIRE_CONCOURS,
        signeLe: serverTimestamp(),
      },
    }, { merge: true });
    return 'ok';
  } catch {
    return 'erreur';
  }
}
