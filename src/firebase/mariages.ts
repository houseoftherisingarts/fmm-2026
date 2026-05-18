// Mariages médiévaux — Firestore-backed CRUD
// Collection layout: mariages/{id}  (flat collection, addDoc-generated ids)
// Falls back gracefully when db is null (no Firebase config).

import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  serverTimestamp, orderBy, query,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Re-exports from mock (types, label maps, pure helpers) ────────────
export type {
  MariageBooking,
  MariageStatus,
  MariageCeremony,
  MariageTotals,
} from './mockMariages';

export {
  STATUS_LABEL,
  STATUS_TONE,
  CEREMONY_LABEL,
  computeMariageTotals,
} from './mockMariages';

import type { MariageBooking } from './mockMariages';

// ── Collection ref helper ─────────────────────────────────────────────
const COL = 'mariages';

// ── Public API ────────────────────────────────────────────────────────

/**
 * Fetch all mariage bookings, ordered by creation date descending.
 * Returns [] when Firebase is not configured instead of throwing.
 */
export async function listMariages(): Promise<MariageBooking[]> {
  if (!db) return [];
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    // createdAt is stored as a serverTimestamp; normalise to ISO string
    // so the type contract (createdAt: string) is satisfied client-side.
    const createdAt =
      data.createdAt && typeof data.createdAt.toDate === 'function'
        ? (data.createdAt.toDate() as Date).toISOString().slice(0, 10)
        : typeof data.createdAt === 'string'
        ? data.createdAt
        : new Date().toISOString().slice(0, 10);
    return { ...data, id: d.id, createdAt } as MariageBooking;
  });
}

/**
 * Add a new booking.  Firestore generates the id; createdAt is set
 * server-side via serverTimestamp().  The returned value uses the
 * today ISO date string to satisfy the MariageBooking.createdAt: string
 * contract on the client.
 */
export async function addMariage(
  data: Omit<MariageBooking, 'id' | 'createdAt'>,
): Promise<MariageBooking> {
  if (!db) throw new Error('Firebase not configured');
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return {
    ...data,
    id: ref.id,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Patch an existing booking.  Only the supplied fields are written.
 */
export async function updateMariage(
  id: string,
  patch: Partial<Omit<MariageBooking, 'id'>>,
): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  // Cast through `any` to satisfy the overly-strict Firestore UpdateData
  // generic — our patch values are all plain scalars/strings/numbers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(doc(db, COL, id), patch as any);
}

/**
 * Permanently delete a booking document.
 */
export async function deleteMariage(id: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, COL, id));
}
