// Newsletter subscribers — Firestore CRUD. Owned by the admin
// Infolettre tab. The public site appends new addresses from the
// home + footer signup forms; this module is the read/write API
// for the admin list.
//
// Collection: `newsletter/{id}` — flat. Soft-delete via `unsubscribed`
// for compliance, plus a hard `deleteSub` for cleanup.

import {
  addDoc, collection, deleteDoc, doc, getDocs, orderBy, query,
  serverTimestamp, updateDoc, where, limit as fsLimit,
  type DocumentData, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface NewsletterSub {
  id: string;
  email: string;
  lang: 'FR' | 'EN';
  source: string;       // 'home' | 'footer' | 'compte' | …
  subscribedAt: unknown;
  unsubscribed?: boolean;
}

const COL = 'newsletter';

function fromSnap(snap: QueryDocumentSnapshot<DocumentData>): NewsletterSub {
  const d = snap.data();
  return {
    id: snap.id,
    email: String(d.email ?? ''),
    lang:  d.lang === 'EN' ? 'EN' : 'FR',
    source: String(d.source ?? ''),
    subscribedAt: d.subscribedAt ?? null,
    unsubscribed: d.unsubscribed === true,
  };
}

// Reads the full list with a sensible cap. The admin filters client-side
// for now — when subscriber counts get unwieldy we can paginate.
export async function listSubs(max = 1000): Promise<NewsletterSub[]> {
  if (!db) return [];
  const snaps = await getDocs(query(
    collection(db, COL),
    orderBy('subscribedAt', 'desc'),
    fsLimit(max),
  ));
  return snaps.docs.map(fromSnap);
}

// Count for stat tiles — runs the same listSubs read currently;
// when the collection grows we'll swap for an aggregate count().
export async function countActive(): Promise<number> {
  if (!db) return 0;
  const snaps = await getDocs(query(
    collection(db, COL),
    where('unsubscribed', '==', false),
    fsLimit(10000),
  ));
  return snaps.size;
}

export async function addSub(input: {
  email: string;
  lang: 'FR' | 'EN';
  source: string;
}): Promise<NewsletterSub> {
  if (!db) throw new Error('Firebase not configured');
  const ref = await addDoc(collection(db, COL), {
    email: input.email.trim().toLowerCase(),
    lang: input.lang,
    source: input.source,
    subscribedAt: serverTimestamp(),
    unsubscribed: false,
  });
  return {
    id: ref.id,
    email: input.email.trim().toLowerCase(),
    lang: input.lang,
    source: input.source,
    subscribedAt: new Date().toISOString(),
    unsubscribed: false,
  };
}

// Soft-delete: keeps the row, flips the flag. Use this from public
// "unsubscribe" links so we have a defensible audit trail.
export async function unsubscribeSub(id: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, COL, id), { unsubscribed: true });
}

// Hard-delete: admin "Supprimer cet abonné" action. Use this when the
// row is bogus (spam, typo) — not for normal unsubscribes.
export async function deleteSub(id: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, COL, id));
}
