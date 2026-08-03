// Coffre à billets de l'espace client.
//
// Un festivalier qui achète sur Zeffy reçoit sa facture par courriel et
// la perd. Il peut la déposer ici pour la retrouver le jour venu, même
// sans réseau une fois qu'elle est ouverte.
//
// 🔒 Les fichiers vivent sous `billets/{uid}/` et non sous `users/{uid}/`
// parce que ce dernier est en lecture publique (avatars). Une facture
// porte un nom, un courriel et un achat : lecture réservée au
// propriétaire et aux admins (voir storage.rules).

import {
  ref, uploadBytes, getDownloadURL, listAll, deleteObject, getMetadata,
} from 'firebase/storage';
import { storage } from './config';

export interface Billet {
  /** Chemin complet dans le bucket, sert de clé de suppression. */
  path:     string;
  name:     string;
  url:      string;
  size:     number;
  /** ISO. Date de dépôt, fournie par le bucket. */
  uploaded: string;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic'];

export function billetError(file: File, lang: 'FR' | 'EN'): string | null {
  if (file.size > MAX_BYTES) {
    return lang === 'FR'
      ? 'Ce fichier dépasse 10 Mo.'
      : 'That file is over 10 MB.';
  }
  // Certains navigateurs ne typent pas les HEIC : on tolère l'extension.
  const okType = ACCEPTED.includes(file.type) || /\.(pdf|png|jpe?g|webp|heic)$/i.test(file.name);
  if (!okType) {
    return lang === 'FR'
      ? 'Format non accepté. Déposez un PDF ou une image.'
      : 'Unsupported format. Upload a PDF or an image.';
  }
  return null;
}

/** Nettoie le nom pour un chemin de bucket, en gardant l'extension. */
function safeName(raw: string): string {
  const cleaned = raw
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(-80);
  return `${Date.now()}-${cleaned}`;
}

export async function uploadBillet(uid: string, file: File): Promise<Billet> {
  const path = `billets/${uid}/${safeName(file.name)}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || 'application/octet-stream' });
  const [url, meta] = await Promise.all([getDownloadURL(r), getMetadata(r)]);
  return {
    path,
    name: file.name,
    url,
    size: file.size,
    uploaded: meta.timeCreated || new Date().toISOString(),
  };
}

export async function listBillets(uid: string): Promise<Billet[]> {
  const dir = ref(storage, `billets/${uid}`);
  let items;
  try {
    ({ items } = await listAll(dir));
  } catch {
    return [];   // dossier absent : le coffre est simplement vide
  }
  const rows = await Promise.all(items.map(async (it) => {
    const [url, meta] = await Promise.all([getDownloadURL(it), getMetadata(it)]);
    return {
      path: it.fullPath,
      // on remet le nom d'origine en retirant l'horodatage du préfixe
      name: it.name.replace(/^\d{10,}-/, ''),
      url,
      size: meta.size || 0,
      uploaded: meta.timeCreated || '',
    };
  }));
  return rows.sort((a, b) => b.uploaded.localeCompare(a.uploaded));
}

export async function deleteBillet(path: string): Promise<void> {
  await deleteObject(ref(storage, path));
}
