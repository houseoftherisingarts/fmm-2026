// ─── Les guildes ───────────────────────────────────────────────────
// Alex, 2026-08-27 : des sous-groupes que n'importe quel membre de
// l'Ordre peut fonder, comme les groupes Facebook. Le fondateur en
// devient l'unique admin; les autres demandent à joindre, et l'admin
// de la guilde accepte ou refuse. L'équipe du festival garde la main
// pour modifier ou détruire n'importe quelle guilde depuis l'espace
// admin.
//
//   /guildes/{id} { nom, description, blason?, creePar, admins: string[],
//                    membres: string[], demandes: string[], nbMembres,
//                    creeLe, maj }
//
// Storage (prévu, pas encore branché — aucun bouton de téléversement
// pour l'instant) : guildes/{id}/blason.webp

import {
  collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot,
  query, orderBy, where, arrayUnion, arrayRemove, increment, serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Guilde {
  id: string;
  nom: string;
  description: string;
  blason?: string;
  creePar: string;
  admins: string[];
  membres: string[];
  demandes: string[];
  nbMembres: number;
  creeLe: Timestamp | null;
  maj: Timestamp | null;
}

const COL = 'guildes';
export const LONGUEUR_NOM_MIN = 2;
export const LONGUEUR_NOM_MAX = 60;
export const LONGUEUR_DESCRIPTION_MAX = 1000;

const lire = (d: { id: string; data: () => Record<string, unknown> }): Guilde =>
  ({ id: d.id, ...(d.data() as Omit<Guilde, 'id'>) });

export async function creerGuilde(opts: { uid: string; nom: string; description: string }): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const nom = opts.nom.trim().slice(0, LONGUEUR_NOM_MAX);
  if (nom.length < LONGUEUR_NOM_MIN) throw new Error('Le nom de la guilde est trop court.');
  const description = opts.description.trim().slice(0, LONGUEUR_DESCRIPTION_MAX);
  const id = doc(collection(db, COL)).id;
  await setDoc(doc(db, COL, id), {
    nom, description,
    creePar: opts.uid,
    admins: [opts.uid],
    membres: [opts.uid],
    demandes: [],
    nbMembres: 1,
    creeLe: serverTimestamp(),
    maj: serverTimestamp(),
  });
  return id;
}

/** Toutes les guildes, les plus peuplées d'abord. */
export function suivreGuildes(cb: (guildes: Guilde[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COL), orderBy('nbMembres', 'desc'), orderBy('nom'));
  return onSnapshot(q, (snap) => cb(snap.docs.map(lire)), () => cb([]));
}

export async function lireGuilde(id: string): Promise<Guilde | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? lire(snap) : null;
}

export function suivreGuilde(id: string, cb: (g: Guilde | null) => void): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(doc(db, COL, id), (snap) => cb(snap.exists() ? lire(snap) : null), () => cb(null));
}

/** Demander à joindre : on s'ajoute soi-même à la file d'attente. */
export async function demanderAdhesion(id: string, uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, id), { demandes: arrayUnion(uid), maj: serverTimestamp() });
}

/** Retirer sa propre demande. */
export async function retirerDemande(id: string, uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, id), { demandes: arrayRemove(uid), maj: serverTimestamp() });
}

/** L'admin de la guilde accepte une demande : elle passe à la liste des membres. */
export async function accepterMembre(id: string, uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, id), {
    demandes: arrayRemove(uid),
    membres: arrayUnion(uid),
    nbMembres: increment(1),
    maj: serverTimestamp(),
  });
}

export async function refuserMembre(id: string, uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, id), { demandes: arrayRemove(uid), maj: serverTimestamp() });
}

/** Quitter une guilde : on se retire soi-même des membres (et des
 *  admins, si on en était). */
export async function quitterGuilde(id: string, uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, id), {
    membres: arrayRemove(uid),
    admins: arrayRemove(uid),
    nbMembres: increment(-1),
    maj: serverTimestamp(),
  });
}

/** Réservé à l'équipe ou à un admin de la guilde (voir firestore.rules). */
export async function modifierGuilde(id: string, patch: { nom?: string; description?: string }): Promise<void> {
  if (!db) return;
  const data: Record<string, unknown> = { maj: serverTimestamp() };
  if (patch.nom !== undefined) data.nom = patch.nom.trim().slice(0, LONGUEUR_NOM_MAX);
  if (patch.description !== undefined) data.description = patch.description.trim().slice(0, LONGUEUR_DESCRIPTION_MAX);
  await updateDoc(doc(db, COL, id), data);
}

/** Réservé à l'équipe ou à un admin de la guilde. */
export async function supprimerGuilde(id: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, COL, id));
}

/** Les guildes dont uid est membre. */
export async function listerMesGuildes(uid: string): Promise<Guilde[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, COL), where('membres', 'array-contains', uid)));
  return snap.docs.map(lire);
}
