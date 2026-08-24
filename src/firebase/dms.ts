// Les messages privés entre deux membres, un fil par paire.
// La clé du fil est la paire d'uid triée, donc deux personnes ne
// peuvent jamais se retrouver avec deux fils parallèles. Le fil porte
// ses propres métadonnées (le dernier mot, l'heure, les noms, les
// photos) pour que la boîte de réception tienne en une seule lecture.
//
//   /dms/{filId}                     ← le fil
//   /dms/{filId}/messages/{msgId}    ← les messages
//
//   filId = [a, b].sort().join('__')

import {
  collection, doc, addDoc, setDoc, query, orderBy, where,
  onSnapshot, serverTimestamp, increment, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { LONGUEUR_MAX } from './moderation';

export interface DMThread {
  id: string;
  participantUids: [string, string];
  participantNames: Record<string, string>;
  participantHues:  Record<string, number>;
  /** La photo de chacun, recopiée du registre pour que la boîte de
   *  réception n'ait pas à aller lire une fiche par conversation. */
  participantPhotos?: Record<string, string>;
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

/** Ouvre le fil, ou rafraîchit les noms et les photos s'il existe
 *  déjà. Une seule écriture fusionnée, sans lecture préalable : la
 *  règle Firestore refuse de lire un document absent, donc un `getDoc`
 *  ici échouait toujours à la première conversation et le fil ne
 *  naissait jamais (corrigé le 2026-08-23).
 *
 *  Le compteur de messages neufs n'est pas touché : l'ouverture d'un
 *  fil ne doit pas effacer ce que l'autre n'a pas encore lu. */
export async function ensureThread(
  meUid: string, meName: string, meHue: number, mePhoto: string | undefined,
  otherUid: string, otherName: string, otherHue: number, otherPhoto?: string,
): Promise<string> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  const id = threadId(meUid, otherUid);
  const photos: Record<string, string> = {};
  if (mePhoto)    photos[meUid]    = mePhoto;
  if (otherPhoto) photos[otherUid] = otherPhoto;
  await setDoc(doc(db, 'dms', id), {
    participantUids:  [meUid, otherUid].sort() as [string, string],
    participantNames: { [meUid]: meName, [otherUid]: otherName },
    participantHues:  { [meUid]: meHue,  [otherUid]: otherHue },
    ...(Object.keys(photos).length ? { participantPhotos: photos } : {}),
  }, { merge: true });
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
    (err) => { console.warn('[dms] lecture du fil', err); cb([]); },
  );
}

export async function sendDM(
  id: string,
  msg: Omit<DM, 'id' | 'createdAt'>,
  otherUid: string,
): Promise<void> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  const body = msg.body.trim().slice(0, LONGUEUR_MAX);
  if (!body) return;
  await addDoc(collection(db, 'dms', id, 'messages'), {
    ...msg,
    body,
    createdAt: serverTimestamp(),
  });
  // Le fil garde le dernier mot pour que la boîte de réception reste
  // légère. Les clés imbriquées passent par un objet : `setDoc` ne lit
  // pas les points comme des chemins de champ, contrairement à
  // `updateDoc`, donc l'ancienne écriture `unread.xyz` ne comptait
  // rien du tout (corrigé le 2026-08-23).
  await setDoc(doc(db, 'dms', id), {
    lastMessage:    body.slice(0, 140),
    lastMessageAt:  serverTimestamp(),
    lastSenderUid:  msg.senderUid,
    unread:         { [otherUid]: increment(1) },
  }, { merge: true });
}

export async function markThreadRead(id: string, uid: string): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'dms', id), { unread: { [uid]: 0 } }, { merge: true });
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
    (err) => { console.warn('[dms] lecture de la boîte', err); cb([]); },
  );
}
