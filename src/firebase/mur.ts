// ─── Le mur social ───────────────────────────────────────────────────
// Alex, 2026-08-27 : « un fil d'actualité, un peu comme sur Facebook ».
// Chaque membre poste un texte et, s'il veut, une photo. Le mur montre
// tout le monde en ordre chronologique, et les annonces du festival s'y
// glissent aussi (la redondance est voulue : tout le monde ne lit pas
// le babillard).
//
//   /mur/{postId} { uid, nom, avatarUrl?, avatarHue, texte, photoUrl?,
//                   photoChemin?, creeLe }
//   Storage : mur/{uid}/{postId}.webp

import {
  collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, limit as fsLimit,
  where, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { versWebp } from './photosPubliques';

export interface PostMur {
  id: string;
  uid: string;
  nom: string;
  avatarUrl?: string;
  avatarHue?: number;
  texte: string;
  photoUrl?: string;
  photoChemin?: string;
  creeLe: Timestamp | null;
}

const COL = 'mur';
export const LONGUEUR_MAX_POST = 2000;

export async function publierSurLeMur(opts: {
  uid: string; nom: string; avatarUrl?: string; avatarHue?: number; texte: string; photo?: File;
}): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const texte = opts.texte.trim().slice(0, LONGUEUR_MAX_POST);
  if (!texte && !opts.photo) throw new Error('Rien à publier.');
  const id = doc(collection(db, COL)).id;
  let photoUrl: string | undefined; let photoChemin: string | undefined;
  if (opts.photo && storage) {
    const { blob } = await versWebp(opts.photo, 1600, 0.85);
    photoChemin = `mur/${opts.uid}/${id}.webp`;
    const r = ref(storage, photoChemin);
    await uploadBytes(r, blob, { contentType: 'image/webp' });
    photoUrl = await getDownloadURL(r);
  }
  await setDoc(doc(db, COL, id), {
    uid: opts.uid, nom: opts.nom,
    ...(opts.avatarUrl ? { avatarUrl: opts.avatarUrl } : {}),
    avatarHue: opts.avatarHue ?? 0,
    texte,
    ...(photoUrl ? { photoUrl, photoChemin } : {}),
    creeLe: serverTimestamp(),
  });
  return id;
}

export async function retirerDuMur(post: PostMur): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, COL, post.id));
  if (post.photoChemin && storage) await deleteObject(ref(storage, post.photoChemin)).catch(() => {});
}

const lire = (d: { id: string; data: () => Record<string, unknown> }): PostMur =>
  ({ id: d.id, ...(d.data() as Omit<PostMur, 'id'>) });

/** Tout le mur, les plus récents d'abord. */
export function suivreLeMur(cb: (posts: PostMur[]) => void, max = 100): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COL), orderBy('creeLe', 'desc'), fsLimit(max));
  return onSnapshot(q, (snap) => cb(snap.docs.map(lire)), () => cb([]));
}

/** Le fil d'une personne. */
export function suivreLeFilDe(uid: string, cb: (posts: PostMur[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COL), where('uid', '==', uid));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map(lire);
    rows.sort((a, b) => (b.creeLe?.toMillis?.() ?? 0) - (a.creeLe?.toMillis?.() ?? 0));
    cb(rows);
  }, () => cb([]));
}
