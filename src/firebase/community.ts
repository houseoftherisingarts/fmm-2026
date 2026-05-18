// Bénévole community wall — shared space for the volunteer team + admins.
// Channels:
//   • 'open'        → visible to every accepted bénévole + admins
//   • 'team-{id}'   → only members of that team + admins
//
// Posts live at /posts/{postId} with channel + kind. Comments and
// reactions are subcollections. Rideshare is a `kind` so it gets a
// special composer/card without forking the data model.

import {
  collection, doc, addDoc, deleteDoc, query, where, orderBy, limit, onSnapshot,
  serverTimestamp, setDoc, getDoc, runTransaction, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type ChannelId   = string;          // 'open' | 'team-bar' | …
export type PostKind    = 'post' | 'rideshare-offer' | 'rideshare-request' | 'announcement';
export type ReactionKey = 'like' | 'heart' | 'star' | 'laugh';

export interface RideshareMeta {
  from?:      string;     // "Montréal", "Gatineau"
  to?:        string;     // "Montpellier (FMM)"
  when?:      string;     // ISO datetime or human-readable "Vendredi 15h"
  seats?:     number;     // offer: seats available; request: seats needed
  price?:     number;     // suggested contribution per seat (CAD)
  contact?:   string;     // phone or note
  direction?: 'aller' | 'retour' | 'aller-retour';
}

export interface Post {
  id?:           string;
  channel:       ChannelId;
  kind:          PostKind;
  authorUid:     string;
  authorName:    string;
  authorAvatarHue?: number;   // 0-360, deterministic from name
  body:          string;
  meta?:         RideshareMeta;
  imageUrls?:    string[];    // optional attachments (future)
  reactionCount?: number;
  commentCount?:  number;
  rideshareSubscribers?: string[];  // uids who subscribed to a rideshare
  pinned?:       boolean;
  createdAt?:    Timestamp;
  updatedAt?:    Timestamp;
}

export interface Comment {
  id?:        string;
  authorUid:  string;
  authorName: string;
  authorAvatarHue?: number;
  body:       string;
  createdAt?: Timestamp;
}

const postsCol = () => (db ? collection(db, 'posts') : null);

// Real-time channel feed (newest first).
export function subscribeChannelFeed(
  channel: ChannelId,
  cb: (posts: Post[]) => void,
  max: number = 100,
): () => void {
  const col = postsCol();
  if (!col) { cb([]); return () => {}; }
  const q = query(col, where('channel', '==', channel), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Post, 'id'>) }))),
    (err) => { console.warn('[community] subscribeChannelFeed', err); cb([]); },
  );
}

export async function createPost(p: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'reactionCount' | 'commentCount'>): Promise<string> {
  const col = postsCol();
  if (!col) throw new Error('Firestore not configured');
  const ref = await addDoc(col, {
    ...p,
    reactionCount: 0,
    commentCount:  0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deletePost(postId: string): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await deleteDoc(doc(db, 'posts', postId));
}

// ── Comments ──────────────────────────────────────────────────────
export function subscribeComments(postId: string, cb: (cs: Comment[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const col = collection(db, 'posts', postId, 'comments');
  const q = query(col, orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Comment, 'id'>) }))),
    (err) => { console.warn('[community] subscribeComments', err); cb([]); },
  );
}

export async function addComment(postId: string, c: Omit<Comment, 'id' | 'createdAt'>): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  const col = collection(db, 'posts', postId, 'comments');
  await runTransaction(db, async (tx) => {
    const postRef = doc(db!, 'posts', postId);
    const ps = await tx.get(postRef);
    const prev = (ps.exists() ? (ps.data().commentCount as number) : 0) || 0;
    const newRef = doc(col);
    tx.set(newRef, { ...c, createdAt: serverTimestamp() });
    tx.update(postRef, { commentCount: prev + 1, updatedAt: serverTimestamp() });
  });
}

// ── Reactions (one per uid per post) ──────────────────────────────
export async function setReaction(postId: string, uid: string, type: ReactionKey | null): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  const ref  = doc(db, 'posts', postId, 'reactions', uid);
  const post = doc(db, 'posts', postId);
  await runTransaction(db, async (tx) => {
    const cur = await tx.get(ref);
    const ps  = await tx.get(post);
    const prevCount = (ps.exists() ? (ps.data().reactionCount as number) : 0) || 0;
    if (type === null) {
      if (cur.exists()) {
        tx.delete(ref);
        tx.update(post, { reactionCount: Math.max(0, prevCount - 1) });
      }
    } else {
      if (!cur.exists()) {
        tx.set(ref, { type, createdAt: serverTimestamp() });
        tx.update(post, { reactionCount: prevCount + 1 });
      } else {
        tx.set(ref, { type, createdAt: serverTimestamp() }, { merge: true });
      }
    }
  });
}

export async function getMyReaction(postId: string, uid: string): Promise<ReactionKey | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'posts', postId, 'reactions', uid));
  return snap.exists() ? (snap.data().type as ReactionKey) : null;
}

// ── Rideshare subscribe / unsubscribe ─────────────────────────────
export async function toggleRideshareSubscription(postId: string, uid: string, name: string): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  const sub = doc(db, 'posts', postId, 'subscribers', uid);
  const cur = await getDoc(sub);
  if (cur.exists()) {
    await deleteDoc(sub);
  } else {
    await setDoc(sub, { uid, name, createdAt: serverTimestamp() });
  }
}

export function subscribeRideshareSubs(postId: string, cb: (subs: { uid: string; name: string }[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const col = collection(db, 'posts', postId, 'subscribers');
  return onSnapshot(
    query(col, orderBy('createdAt', 'asc')),
    (snap) => cb(snap.docs.map((d) => d.data() as { uid: string; name: string })),
    (err) => { console.warn('[community] rideshare subs', err); cb([]); },
  );
}

// Compute the channel id for a team — keeps the convention in one place.
export const teamChannelId = (teamId: string): ChannelId => `team-${teamId}`;
