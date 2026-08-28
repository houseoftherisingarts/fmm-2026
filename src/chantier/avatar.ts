// ─── L'avatar du chantier : persistance Firestore ─────────────────────
// Un document par membre, avatars/{uid}. Lecture réservée aux comptes
// connectés, écriture réservée au propriétaire (voir firestore.rules).
// À la première visite, un sac de départ est posé (Alex, 2026-08-27).

import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { type CorpsId, type Emplacement, SAC_DEPART } from './objets';

export interface AvatarChantier {
  corps: CorpsId;
  peau: number;
  coiffure: number;
  equipe: Partial<Record<Emplacement, string | null>>;
  sac: string[];
  /** Jusqu'à trois objets montrés publiquement sur la fiche (voir
   *  VitrineObjets.tsx). Alex, 2026-08-28. */
  vitrine?: string[];
  /** Les skins de plateforme achetés en Montpellois ('bleu', 'dore') :
   *  posé par la Cloud Function acheterCosmetique, jamais par le
   *  client (Alex, 2026-08-28 — voir src/firebase/montpellois.ts). */
  skinsDebloques?: string[];
  maj?: unknown;
}

export const AVATAR_VIDE: AvatarChantier = {
  corps: 'A',
  peau: 0,
  coiffure: 0,
  equipe: {},
  sac: SAC_DEPART,
};

const COLLECTION = 'avatars';

/** Rend l'avatar du membre, en le créant avec le sac de départ s'il n'en
 *  a pas encore un. */
export async function chargerAvatar(uid: string): Promise<AvatarChantier> {
  if (!db) return AVATAR_VIDE;
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as AvatarChantier;
  await setDoc(ref, { ...AVATAR_VIDE, maj: serverTimestamp() });
  return AVATAR_VIDE;
}

export function ecouterAvatar(uid: string, cb: (a: AvatarChantier) => void): () => void {
  if (!db) return () => {};
  return onSnapshot(doc(db, COLLECTION, uid), (snap) => {
    if (snap.exists()) cb(snap.data() as AvatarChantier);
  });
}

export async function sauverAvatar(uid: string, avatar: AvatarChantier): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, COLLECTION, uid), { ...avatar, maj: serverTimestamp() }, { merge: true });
}

export const MAX_VITRINE = 3;

/** Choisit les objets montrés publiquement, jusqu'à trois (voir
 *  VitrineObjets.tsx, geste du propriétaire seulement). */
export async function definirVitrine(uid: string, ids: string[]): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, COLLECTION, uid), { vitrine: ids.slice(0, MAX_VITRINE), maj: serverTimestamp() }, { merge: true });
}
