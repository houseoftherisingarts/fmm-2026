// Direct messages between two community members (Messenger-clone).
// One thread per pair, keyed by sorted uid pair so we never create
// duplicates. Threads carry their own metadata (lastMessage,
// lastMessageAt, participantUids) so the inbox query is cheap.
//
//   /dms/{threadId}                     ← thread doc
//   /dms/{threadId}/messages/{msgId}    ← messages
//
//   threadId = [a, b].sort().join('__')

import {
  collection, doc, addDoc, getDoc, setDoc, query, orderBy, where,
  onSnapshot, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface DMThread {
  id: string;
  participantUids: [string, string];
  participantNames: Record<string, string>;
  participantHues:  Record<string, number>;
  lastMessage?:     string;
  lastMessageAt?:   Timestamp;
  lastSenderUid?:   string;
  unread?:          Record<string, number>;
}

export interface DM {
  id?:        string;
  senderUid:  string;
  senderName: string;
  body:       string;
  createdAt?: Timestamp;
}

export const threadId = (a: string, b: string): string =>
  [a, b].sort().join('__');

export async function ensureThread(
  meUid: string, meName: string, meHue: number,
  otherUid: string, otherName: string, otherHue: number,
): Promise<string> {
  if (!db) throw new Error('Firestore not configured');
  const id = threadId(meUid, otherUid);
  const ref = doc(db, 'dms', id);
  const cur = await getDoc(ref);
  if (!cur.exists()) {
    const sorted = [meUid, otherUid].sort() as [string, string];
    await setDoc(ref, {
      participantUids:  sorted,
      participantNames: { [meUid]: meName, [otherUid]: otherName },
      participantHues:  { [meUid]: meHue,  [otherUid]: otherHue },
      unread:           { [meUid]: 0,      [otherUid]: 0 },
    });
  }
  return id;
}

export function subscribeDMThread(
  id: string,
  cb: (msgs: DM[]) => void,
): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, 'dms', id, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DM, 'id'>) }))),
    (err) => { console.warn('[dms] thread subscribe', err); cb([]); },
  );
}

export async function sendDM(
  id: string,
  msg: Omit<DM, 'id' | 'createdAt'>,
  otherUid: string,
): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  if (!msg.body.trim()) return;
  await addDoc(collection(db, 'dms', id, 'messages'), {
    ...msg,
    createdAt: serverTimestamp(),
  });
  // Update thread metadata so inbox queries stay light.
  await setDoc(doc(db, 'dms', id), {
    lastMessage:    msg.body.slice(0, 140),
    lastMessageAt:  serverTimestamp(),
    lastSenderUid:  msg.senderUid,
    [`unread.${otherUid}`]: 1,  // simple bump; mark-as-read clears it
  }, { merge: true });
}

export async function markThreadRead(id: string, uid: string): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'dms', id), {
    [`unread.${uid}`]: 0,
  }, { merge: true });
}

export function subscribeInbox(
  uid: string,
  cb: (threads: DMThread[]) => void,
): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(
    collection(db, 'dms'),
    where('participantUids', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DMThread, 'id'>) }))),
    (err) => { console.warn('[dms] inbox subscribe', err); cb([]); },
  );
}
