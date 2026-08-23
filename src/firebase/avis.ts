// ─── Les avis décrochés du babillard ─────────────────────────────────
// Alex, 2026-08-23 : chaque avis du babillard porte un bouton
// « Accepter ». L'avis quitte alors le tableau et rejoint la collection
// de la personne, dans son espace. L'équipe, elle, voit qui a pris quoi.
//
//   /avisAcceptes/{uid_avisId}  { uid, avisId, nom, courriel, date }

import {
  collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore';
import { db } from '../firebase';

const COL = 'avisAcceptes';

export interface Acceptation {
  uid: string;
  avisId: string;
  nom: string;
  courriel: string;
  date?: { seconds: number } | null;
}

const cle = (uid: string, avisId: string) => `${uid}__${avisId}`;

export async function accepterAvis(
  uid: string, avisId: string, nom: string, courriel: string,
): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, COL, cle(uid, avisId)), {
    uid, avisId, nom, courriel, date: serverTimestamp(),
  }, { merge: true });
}

/** Les avis qu'une personne a décrochés, en direct. */
export function suivreMesAvis(uid: string, cb: (ids: string[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, COL), where('uid', '==', uid)),
    (snap) => cb(snap.docs.map((d) => (d.data() as Acceptation).avisId)),
    () => cb([]),
  );
}

/** Côté admin : qui a accepté quoi. */
export async function listerAcceptations(): Promise<Acceptation[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, COL), orderBy('date', 'desc')));
    return snap.docs.map((d) => d.data() as Acceptation);
  } catch {
    const snap = await getDocs(collection(db, COL));
    return snap.docs.map((d) => d.data() as Acceptation);
  }
}
