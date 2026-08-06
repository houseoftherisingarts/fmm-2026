// Archives photos de la page Histoire: collection Firestore pilotable
// depuis l'admin (section Photos) : activer/désactiver, réordonner,
// téléverser. La page publique lit la collection et retombe sur les
// manifestes statiques (src/content/histoireArchives.ts) si elle est
// vide ou inaccessible, pour que la galerie ne casse jamais.
//
// Deux familles de docs :
//  - photos statiques du pipeline : { file } servi depuis
//    /histoire/archives/<photographe>/ (ou /wix/histoire/ pour Océane);
//  - photos téléversées par l'admin : { src, thumb } = URLs Storage
//    (archives-uploads/<photographe>/...), `file` garde le nom.

import {
  collection, doc, getDocs, writeBatch, updateDoc, setDoc, deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

export type PhotographerKey = 'lena' | 'alex' | 'oceane' | 'lievre';

export interface ArchivePhoto {
  id: string;
  photographer: PhotographerKey;
  file: string;
  active: boolean;
  order: number;
  src?: string;    // seulement pour les téléversements Storage
  thumb?: string;  // idem
}

export const PHOTOGRAPHER_META: Record<PhotographerKey, { label: string; base: string }> = {
  lena:   { label: 'Lena Photos et Aventures', base: '/histoire/archives/lena/' },
  alex:   { label: 'Alex T. St-Laurent',       base: '/histoire/archives/alex/' },
  oceane: { label: 'Océane Leclair',           base: '/wix/histoire/' },
  lievre: { label: 'Clair du Lièvre',          base: '/histoire/archives/lievre/' },
};

export const PHOTOGRAPHER_ORDER: PhotographerKey[] = ['lena', 'alex', 'oceane', 'lievre'];

const COLL = 'archivesPhotos';

// Vignette d'un doc : URL Storage si téléversé, sinon chemin statique
// (les dossiers du pipeline ont un sous-dossier thumb/, la sélection
// Wix d'Océane est servie telle quelle).
export function photoThumb(p: ArchivePhoto): string {
  if (p.thumb) return p.thumb;
  const base = PHOTOGRAPHER_META[p.photographer].base;
  return base.includes('/archives/') ? `${base}thumb/${p.file}` : `${base}${p.file}`;
}

export function photoFull(p: ArchivePhoto): string {
  if (p.src) return p.src;
  return `${PHOTOGRAPHER_META[p.photographer].base}${p.file}`;
}

// Toutes les photos, triées par ordre. [] si Firestore indisponible.
export async function fetchArchivePhotos(): Promise<ArchivePhoto[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, COLL));
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ArchivePhoto, 'id'>) }));
  return rows.sort((a, b) => a.order - b.order);
}

export async function setPhotoActive(id: string, active: boolean): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  await updateDoc(doc(db, COLL, id), { active });
}

export async function deletePhoto(p: ArchivePhoto): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  if (!p.src) throw new Error('Seules les photos téléversées peuvent être supprimées; désactivez plutôt.');
  await deleteDoc(doc(db, COLL, p.id));
}

// Réordonner un groupe : on réécrit `order` en séquence (pas de
// fractions, lisible dans la console).
export async function savePhotoOrder(photos: ArchivePhoto[]): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  const database = db;
  const batch = writeBatch(database);
  photos.forEach((p, i) => batch.update(doc(database, COLL, p.id), { order: (i + 1) * 10 }));
  await batch.commit();
}

// Redimensionne une image côté client vers un blob webp.
async function toWebp(fileOrBitmap: File | ImageBitmap, maxW: number, quality: number): Promise<Blob> {
  const bmp = fileOrBitmap instanceof ImageBitmap ? fileOrBitmap : await createImageBitmap(fileOrBitmap);
  const scale = Math.min(1, maxW / bmp.width);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encodage webp refusé'))), 'image/webp', quality);
  });
}

// Téléverse une photo (pleine taille 1920 + vignette 640) et crée le doc.
export async function uploadArchivePhoto(
  photographer: PhotographerKey, file: File, order: number,
): Promise<ArchivePhoto> {
  if (!db || !storage) throw new Error('Firebase indisponible');
  const bmp = await createImageBitmap(file);
  const [full, thumb] = await Promise.all([toWebp(bmp, 1920, 0.82), toWebp(bmp, 640, 0.8)]);
  const stem = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60);
  const name = `${Date.now()}-${stem}.webp`;
  const fullRef  = ref(storage, `archives-uploads/${photographer}/${name}`);
  const thumbRef = ref(storage, `archives-uploads/${photographer}/thumb/${name}`);
  await Promise.all([
    uploadBytes(fullRef, full,  { contentType: 'image/webp' }),
    uploadBytes(thumbRef, thumb, { contentType: 'image/webp' }),
  ]);
  const [src, thumbUrl] = await Promise.all([getDownloadURL(fullRef), getDownloadURL(thumbRef)]);
  const id = `${photographer}__${name.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
  const data = { photographer, file: name, active: true, order, src, thumb: thumbUrl };
  await setDoc(doc(db, COLL, id), data);
  return { id, ...data };
}
