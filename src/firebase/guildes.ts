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
  query, orderBy, where, limit, arrayUnion, arrayRemove, increment, serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref as refStockage, uploadBytes, getDownloadURL } from 'firebase/storage';
import { versWebp } from './photosPubliques';

// Alex, 2026-08-28 : « ils peuvent choisir si c'est une guilde, un clan
// ou d'autres formulations; c'est la même chose, seulement tagué
// différemment ». Les vikings fonderont des clans, les chevaliers des
// guildes, et le reste suit.
export type FormeGuilde = 'guilde' | 'clan' | 'compagnie' | 'confrerie' | 'troupe' | 'maisonnee' | 'ordre';

export const FORMES_GUILDE: Array<{ id: FormeGuilde; FR: string; EN: string; articleFR: string }> = [
  { id: 'guilde',    FR: 'Guilde',     EN: 'Guild',       articleFR: 'une' },
  { id: 'clan',      FR: 'Clan',       EN: 'Clan',        articleFR: 'un'  },
  { id: 'compagnie', FR: 'Compagnie',  EN: 'Company',     articleFR: 'une' },
  { id: 'confrerie', FR: 'Confrérie',  EN: 'Brotherhood', articleFR: 'une' },
  { id: 'troupe',    FR: 'Troupe',     EN: 'Troupe',      articleFR: 'une' },
  { id: 'maisonnee', FR: 'Maisonnée',  EN: 'Household',   articleFR: 'une' },
  { id: 'ordre',     FR: 'Ordre',      EN: 'Order',       articleFR: 'un'  },
];

/** Le mot que cette guilde s'est donné, dans la langue de la page. */
export const motDeLaForme = (forme: FormeGuilde | undefined, lang: 'FR' | 'EN'): string => {
  const f = FORMES_GUILDE.find((x) => x.id === (forme || 'guilde')) || FORMES_GUILDE[0];
  return lang === 'FR' ? f.FR : f.EN;
};

export interface Guilde {
  id: string;
  nom: string;
  description: string;
  /** Le mot choisi à la fondation; absent veut dire « guilde ». */
  forme?: FormeGuilde;
  blason?: string;
  /** La bannière large de la guilde (guildes/{id}/banniere.webp). */
  banniereUrl?: string;
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

export async function creerGuilde(opts: { uid: string; nom: string; description: string; forme?: FormeGuilde }): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const nom = opts.nom.trim().slice(0, LONGUEUR_NOM_MAX);
  if (nom.length < LONGUEUR_NOM_MIN) throw new Error('Le nom de la guilde est trop court.');
  const description = opts.description.trim().slice(0, LONGUEUR_DESCRIPTION_MAX);
  const id = doc(collection(db, COL)).id;
  await setDoc(doc(db, COL, id), {
    nom, description,
    forme: opts.forme || 'guilde',
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
export async function modifierGuilde(id: string, patch: { nom?: string; description?: string; blason?: string; banniereUrl?: string; forme?: FormeGuilde }): Promise<void> {
  if (!db) return;
  const data: Record<string, unknown> = { maj: serverTimestamp() };
  if (patch.nom !== undefined) data.nom = patch.nom.trim().slice(0, LONGUEUR_NOM_MAX);
  if (patch.description !== undefined) data.description = patch.description.trim().slice(0, LONGUEUR_DESCRIPTION_MAX);
  await updateDoc(doc(db, COL, id), data as never);
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

/** L'admin de la guilde (ou l'équipe) change le blason : la photo est
 *  redimensionnée côté navigateur et rangée sous guildes/{id}/blason.webp
 *  (Alex, 2026-08-28 : « changer la photo de guilde »). */
/** La bannière large de la guilde, posée par un de ses admins. */
export async function changerBanniereGuilde(id: string, fichier: File): Promise<string> {
  if (!db || !storage) throw new Error('Le stockage est indisponible pour le moment.');
  const { blob } = await versWebp(fichier, 1800, 0.85);
  const r = refStockage(storage, `guildes/${id}/banniere.webp`);
  await uploadBytes(r, blob, { contentType: 'image/webp' });
  const url = `${await getDownloadURL(r)}&v=${Date.now()}`;
  await modifierGuilde(id, { banniereUrl: url });
  return url;
}

export async function changerBlason(id: string, fichier: File): Promise<string> {
  if (!db || !storage) throw new Error('Le stockage est indisponible pour le moment.');
  const { blob } = await versWebp(fichier, 1200, 0.85);
  const r = refStockage(storage, `guildes/${id}/blason.webp`);
  await uploadBytes(r, blob, { contentType: 'image/webp' });
  const url = `${await getDownloadURL(r)}&v=${Date.now()}`;
  await modifierGuilde(id, { blason: url });
  return url;
}
