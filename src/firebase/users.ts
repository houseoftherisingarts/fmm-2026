// Users collection: Firestore read-only for the admin CRM.
// Collection: `users/{uid}`. Documents are created/updated by the
// applications flow (upsertUserProfile in applications.ts) whenever
// a user signs in or submits a form.
//
// Shape mirrors MockUser from mockData.ts so ComptesSection can use
// a single type for both live and mock data.

import {
  collection, doc, getDocs, query, limit as fsLimit, serverTimestamp, setDoc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { RoleMembre } from './ordre';

export interface AppUser {
  uid:            string;
  email:          string;
  displayName:    string;
  phone?:         string;
  lang?:          string;
  hasBenevoleApp: boolean;
  hasVendorApp:   boolean;
  createdAt?:     Timestamp | unknown;
  /** Compte créé d'office depuis les exports Zeffy (Alex, 2026-08-27). */
  origine?:       'zeffy';
}

const COL = 'users';

// List users ordered by creation date descending, capped at pageSize.
// Returns [] when Firestore is not configured (offline / missing env).
// Sans `orderBy('createdAt')` : Firestore exclut d'une requête triée les
// fiches qui n'ont pas le champ, et des comptes réels disparaissaient du
// registre (Alex, 2026-08-31). Le tri se fait ici, les fiches sans date
// en queue.
export async function listUsers(pageSize = 2000): Promise<AppUser[]> {
  if (!db) return [];
  const q = query(collection(db, COL), fsLimit(pageSize));
  const snap = await getDocs(q);
  const ms = (v: unknown) => (v && typeof (v as { toMillis?: () => number }).toMillis === 'function'
    ? (v as { toMillis: () => number }).toMillis() : 0);
  return snap.docs.sort((a, b) => ms(b.data().createdAt) - ms(a.data().createdAt)).map((d) => {
    const data = d.data();
    return {
      uid:            d.id,
      email:          String(data.email ?? ''),
      displayName:    String(data.displayName ?? ''),
      phone:          data.phone ? String(data.phone) : undefined,
      lang:           data.lang  ? String(data.lang)  : undefined,
      origine:        data.origine === 'zeffy' ? 'zeffy' : undefined,
      // flags array written by addUserFlag: derive booleans from it
      hasBenevoleApp: Array.isArray(data.flags) ? (data.flags as string[]).includes('benevole') : false,
      hasVendorApp:   Array.isArray(data.flags) ? (data.flags as string[]).includes('vendor')   : false,
      createdAt:      data.createdAt ?? null,
    };
  });
}

// ── L'import des comptes Zeffy ────────────────────────────────────────
// Appelle la Cloud Function `importerComptesZeffy` (équipe seulement) :
// un compte par courriel du registre des clients, rejouable.
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '../firebase';

export interface ResultatImportZeffy {
  courriels: number; crees: number; existants: number; fiches: number; erreurs: number;
}

export async function importerComptesZeffy(): Promise<ResultatImportZeffy> {
  if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
  const appeler = httpsCallable<Record<string, never>, ResultatImportZeffy>(getFunctions(firebaseApp, 'us-central1'), 'importerComptesZeffy');
  const { data } = await appeler({});
  return data;
}

/** Rattrape le registre : une fiche users + membres pour chaque compte
 *  Auth (équipe seulement). Rend le nombre de comptes lus et corrigés. */
export async function synchroniserRegistre(): Promise<{ comptes: number; corriges: number }> {
  const fn = httpsCallable<void, { comptes: number; corriges: number }>(getFunctions(undefined, 'us-central1'), 'synchroniserRegistre');
  const r = await fn();
  return r.data;
}

// ── Les fonctions portées au festival, décernées depuis la fiche ─────
// Alex, 2026-09-02 : la fiche d'un compte (FicheCompte.tsx) pose et
// retire les fonctions sans passer par l'écran des membres. L'écriture
// va au même endroit que `definirRoles` de ordre.ts, dans
// `membres/{uid}`, et laisse en plus la trace de la personne qui a
// changé quelque chose, sur le modèle des documents `adminRoles`
// (assignedBy, assignedByEmail, assignedAt).
//
// La règle Firestore réserve déjà le champ `roles` à l'équipe : un
// membre ne se décerne rien tout seul. Voir le rapport de livraison
// pour la ligne à ajouter à cette règle afin que les trois champs de
// trace soient protégés comme `roles` l'est.
export async function definirFonctions(
  uid: string,
  roles: RoleMembre[],
  par: { uid: string; email: string },
): Promise<void> {
  if (!db) throw new Error('Firebase n’est pas configuré');
  await setDoc(doc(db, 'membres', uid), {
    uid,
    roles,
    rolesPar:      par.uid,
    rolesParEmail: par.email.trim().toLowerCase(),
    rolesLe:       serverTimestamp(),
    maj:           serverTimestamp(),
  }, { merge: true });
}
