// Social-media post requests + schedule. One collection: socialPosts/{autoId}.
// The lifecycle is: requested → scheduled → posted (or rejected).
// "posted" posts surface in the Mediatheque under "Déjà publié".

import {
  addDoc, collection, doc, getDocs, query, orderBy, updateDoc, deleteDoc,
  serverTimestamp, onSnapshot, where, limit as fsLimit, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type SocialPlatform = 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'linkedin' | 'youtube';
export type SocialStatus   = 'requested' | 'scheduled' | 'posted' | 'rejected';

export interface SocialPost {
  id?:           string;
  // ── Request fields ────────────────────────────────────────────────
  title:         string;
  message:       string;            // body / caption
  platforms:     SocialPlatform[];
  imageUrl?:     string;            // optional cover / hero
  link?:         string;            // optional URL to push (ticket, page)
  hashtags?:     string;            // free-text "#fmm2026 #medieval"
  // ── Authorship ────────────────────────────────────────────────────
  requestedBy:   string;            // displayName of the asker
  requestedByEmail?: string;
  // ── Scheduling ────────────────────────────────────────────────────
  suggestedDate?:string;            // ISO date the requester would love
  scheduledDate?:string;            // ISO date Léna actually scheduled
  postedDate?:   string;            // ISO date the post went live
  // ── State ─────────────────────────────────────────────────────────
  status:        SocialStatus;
  adminNotes?:   string;            // Léna's notes
  postedUrls?:   { platform: SocialPlatform; url: string }[];
  // ── Audit ────────────────────────────────────────────────────────
  createdAt?:    Timestamp;
  updatedAt?:    Timestamp;
}

const COLLECTION = 'socialPosts';

const stripUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] === undefined) continue;
    out[k] = obj[k];
  }
  return out;
};

export async function createSocialPost(p: SocialPost): Promise<string> {
  if (!db) throw new Error('Firestore not configured');
  const ref = await addDoc(collection(db, COLLECTION), {
    ...stripUndefined(p as unknown as Record<string, unknown>),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSocialPost(id: string, patch: Partial<SocialPost>): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await updateDoc(doc(db, COLLECTION, id), {
    ...stripUndefined(patch as unknown as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSocialPost(id: string): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function listSocialPosts(pageSize = 500): Promise<SocialPost[]> {
  if (!db) return [];
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), fsLimit(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SocialPost) }));
}

/** Real-time stream — drives the admin section's live list. */
export function subscribeSocialPosts(cb: (rows: SocialPost[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), fsLimit(500));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as SocialPost) }))),
    (err)  => { console.warn('[socialPosts] subscribe failed', err); cb([]); },
  );
}

/** Streams only "posted" entries — feeds Mediatheque → Déjà publié. */
export function subscribePostedSocialPosts(cb: (rows: SocialPost[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'posted'),
    orderBy('postedDate', 'desc'),
    fsLimit(200),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as SocialPost) }))),
    (err)  => { console.warn('[socialPosts] posted-subscribe failed', err); cb([]); },
  );
}
