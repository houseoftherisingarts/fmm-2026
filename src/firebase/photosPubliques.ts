// ─── Photos publiques · souvenirs envoyés par les membres ──────────
// Depuis leur espace compte, les membres téléversent leurs photos du
// festival. L'équipe les trie dans l'admin (section Photos reçues) et
// peut reprendre celles qui sont retenues pour les affiches, les pages
// du site et les éditions à venir. Le consentement est recueilli au
// moment de l'envoi et gardé sur chaque document.
//
// Collection Firestore `photosPubliques/{id}`. Fichier dans Storage
// sous `photos-publiques/{uid}/{id}.webp` : même geste que
// archivesPhotos.ts (redimensionnement côté navigateur avant l'envoi,
// pour ne pas faire exploser le stockage avec des photos de téléphone
// à 12 Mo).

import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot,
  query, serverTimestamp, setDoc, updateDoc, where,
  type Timestamp,
} from 'firebase/firestore';
import {
  deleteObject, getDownloadURL, ref, uploadBytesResumable,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import { db, storage } from '../firebase';
import { CURRENT_YEAR } from './applications';

export type StatutPhoto = 'attente' | 'retenue' | 'refusee';
// Alex, 2026-08-27 : la personne choisit à l'envoi si la photo paraît
// sur sa fiche publique ('publique') ou reste entre elle et l'équipe
// ('privee'). Le statut de l'équipe (retenue) est une autre chose : il
// dit si le festival reprend la photo, pas si les membres la voient.
export type VisibilitePhoto = 'publique' | 'privee';

export interface PhotoPublique {
  id: string;
  uid: string;
  nomMembre: string;
  url: string;
  chemin: string;            // chemin Storage, pour la suppression
  largeur: number;
  hauteur: number;
  poids: number;              // octets, après redimensionnement
  legende?: string;
  edition?: number;           // année du festival au moment de l'envoi
  statut: StatutPhoto;
  visibilite?: VisibilitePhoto;   // absent sur les envois d'avant le 27 août = privée
  /** Mise en vedette sur le profil (Alex, 2026-08-27). Suppose publique. */
  vedette?: boolean;
  consentement: true;
  consentementLe: Timestamp | null;
  envoyeeLe: Timestamp | null;
}

const COLL = 'photosPubliques';
const STORAGE_ROOT = 'photos-publiques';
const MAX_SIDE = 2400;

// Types acceptés au dépôt. HEIC/HEIF passe le filtre, mais seul un
// navigateur qui sait le décoder (Safari/iOS) pourra le redimensionner :
// les autres reçoivent un message clair au moment de l'envoi plutôt
// qu'une erreur technique.
export const TYPES_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const POIDS_MAX_ORIGINAL = 12 * 1024 * 1024; // 12 Mo, avant redimensionnement

export interface UploadHandle {
  promise: Promise<PhotoPublique>;
  cancel: () => void;
}

function toMillis(ts: Timestamp | null | undefined): number {
  return ts && typeof (ts as Timestamp).toMillis === 'function' ? (ts as Timestamp).toMillis() : 0;
}

// Redimensionne dans le navigateur (canevas) vers un blob webp, le côté
// le plus long borné à maxSide. Même geste que archivesPhotos.toWebp.
export async function versWebp(
  file: File, maxSide: number, quality: number,
): Promise<{ blob: Blob; largeur: number; hauteur: number }> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error('Ce format de photo n’a pas pu être lu par ce navigateur. Essayez un JPEG ou un PNG.');
  }
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const largeur = Math.round(bmp.width * scale);
  const hauteur = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = largeur; canvas.height = hauteur;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Le navigateur ne peut pas traiter cette image.');
  ctx.drawImage(bmp, 0, 0, largeur, hauteur);
  bmp.close?.();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encodage de l’image refusé.'))), 'image/webp', quality);
  });
  return { blob, largeur, hauteur };
}

/**
 * Téléverse une photo : redimensionnement côté navigateur, envoi dans
 * Storage avec suivi de progression, puis création du document
 * Firestore. Le consentement est recueilli AVANT l'appel (case à
 * cocher du panneau) : cette fonction se contente de l'horodater.
 */
export function televerserPhoto(
  file: File,
  uid: string,
  nomMembre: string,
  legende?: string,
  onProgress?: (fraction: number) => void,
  visibilite: VisibilitePhoto = 'privee',
): UploadHandle {
  if (!db || !storage) {
    return { promise: Promise.reject(new Error('Le stockage est indisponible pour le moment.')), cancel: () => {} };
  }
  const database = db;
  const storageRef = storage;
  const id = doc(collection(database, COLL)).id;
  const chemin = `${STORAGE_ROOT}/${uid}/${id}.webp`;

  let annulee = false;
  let annulerEnvoi = () => { annulee = true; };

  const promise = (async (): Promise<PhotoPublique> => {
    const { blob, largeur, hauteur } = await versWebp(file, MAX_SIDE, 0.85);
    if (annulee) throw new Error('Envoi annulé.');
    const task = uploadBytesResumable(ref(storageRef, chemin), blob, { contentType: 'image/webp' });
    annulerEnvoi = () => task.cancel();
    await new Promise<void>((resolve, reject) => {
      task.on(
        'state_changed',
        (snap: UploadTaskSnapshot) => onProgress?.(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0),
        reject,
        () => resolve(),
      );
    });
    const url = await getDownloadURL(task.snapshot.ref);
    const data = {
      uid, nomMembre, url, chemin, largeur, hauteur, poids: blob.size,
      ...(legende ? { legende } : {}),
      edition: CURRENT_YEAR,
      statut: 'attente' as StatutPhoto,
      visibilite,
      consentement: true as const,
      consentementLe: serverTimestamp(),
      envoyeeLe: serverTimestamp(),
    };
    await setDoc(doc(database, COLL, id), data);
    return { id, ...data } as unknown as PhotoPublique;
  })();

  return { promise, cancel: () => annulerEnvoi() };
}

/** Les photos d'un membre, en direct, les plus récentes en premier. */
export function suivreMesPhotos(uid: string, cb: (photos: PhotoPublique[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COLL), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as PhotoPublique));
      rows.sort((a, b) => toMillis(b.envoyeeLe) - toMillis(a.envoyeeLe));
      cb(rows);
    },
    // Une règle qui refuse ou un index manquant ne doit pas casser
    // l'espace client : on rend une liste vide.
    () => cb([]),
  );
}

/** Le propriétaire change la visibilité d'une de ses photos. */
export async function changerVisibilite(id: string, visibilite: VisibilitePhoto): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COLL, id), { visibilite });
}

/** Le propriétaire met une photo en vedette sur son profil (ou l'en retire). */
export async function changerVedette(id: string, vedette: boolean): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COLL, id), vedette ? { vedette: true, visibilite: 'publique' } : { vedette: false });
}

/** Les photos en vedette d'un membre, pour la colonne de son profil. */
export function suivrePhotosVedette(uid: string, cb: (photos: PhotoPublique[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COLL), where('uid', '==', uid), where('vedette', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as PhotoPublique));
      rows.sort((a, b) => toMillis(b.envoyeeLe) - toMillis(a.envoyeeLe));
      cb(rows);
    },
    () => cb([]),
  );
}

/** Les photos qu'un membre a rendues publiques, pour sa fiche. */
export function suivrePhotosPubliquesDe(uid: string, cb: (photos: PhotoPublique[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COLL), where('uid', '==', uid), where('visibilite', '==', 'publique'));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as PhotoPublique));
      rows.sort((a, b) => toMillis(b.envoyeeLe) - toMillis(a.envoyeeLe));
      cb(rows);
    },
    () => cb([]),
  );
}

/** Toutes les photos (admin), filtrées par statut si fourni. */
export async function listerToutesLesPhotos(statut?: StatutPhoto): Promise<PhotoPublique[]> {
  if (!db) return [];
  const q = statut ? query(collection(db, COLL), where('statut', '==', statut)) : collection(db, COLL);
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as PhotoPublique));
  rows.sort((a, b) => toMillis(b.envoyeeLe) - toMillis(a.envoyeeLe));
  return rows;
}

export async function changerStatut(id: string, statut: StatutPhoto): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  await updateDoc(doc(db, COLL, id), { statut });
}

export async function supprimerPhoto(id: string): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  const snap = await getDoc(doc(db, COLL, id));
  const chemin = (snap.data() as PhotoPublique | undefined)?.chemin;
  if (chemin && storage) {
    // Le fichier peut déjà avoir disparu du stockage : tant pis, on
    // continue quand même à effacer le document.
    try { await deleteObject(ref(storage, chemin)); } catch { /* déjà absent */ }
  }
  await deleteDoc(doc(db, COLL, id));
}
