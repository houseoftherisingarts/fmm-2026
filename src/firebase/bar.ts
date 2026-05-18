// Bar inventory — Firestore-backed CRUD
// Collection: bar/{id}  (flat, one doc per SKU)
// Re-exports types and pure helpers from mockBar so existing imports keep working.

import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Re-exports from mock (types, constants, pure helpers) ───────────
export type {
  BarItem,
  BarCategory,
  BarFormat,
  BarTotals,
} from './mockBar';

export {
  CATEGORY_LABEL,
  FORMAT_LABEL,
  computeTotals,
} from './mockBar';

import type { BarItem } from './mockBar';

// ── Firestore collection reference ──────────────────────────────────
const COL = 'bar';

// Strip undefined values so Firestore doesn't reject the payload.
const stripUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
};

// Map a raw Firestore document payload → BarItem.
// We omit the internal `updatedAt` field from the returned shape so the
// section doesn't have to know about it.
function fromDoc(id: string, data: Record<string, unknown>): BarItem {
  const { updatedAt: _ignored, ...rest } = data;
  void _ignored;
  return { id, ...rest } as BarItem;
}

// ── Public API ──────────────────────────────────────────────────────

export async function listBarItems(): Promise<BarItem[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => fromDoc(d.id, d.data() as Record<string, unknown>));
}

export async function addBarItem(item: Omit<BarItem, 'id'>): Promise<BarItem> {
  if (!db) throw new Error('Firebase not configured');
  const payload = stripUndefined({
    ...(item as unknown as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
  const ref = await addDoc(collection(db, COL), payload);
  return { ...item, id: ref.id };
}

export async function updateBarItem(
  id: string,
  patch: Partial<Omit<BarItem, 'id'>>,
): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, COL, id), {
    ...stripUndefined(patch as unknown as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBarItem(id: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, COL, id));
}

// Concurrent-safe stock adjustment via Firestore transaction.
// Delta is clamped at 0 — stock never goes negative.
export async function adjustStock(id: string, delta: number): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, COL, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`Bar item ${id} not found`);
    const current = (snap.data() as { stock: number }).stock ?? 0;
    tx.update(ref, {
      stock: Math.max(0, current + delta),
      updatedAt: serverTimestamp(),
    });
  });
}
