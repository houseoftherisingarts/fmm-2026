// ─── Hébergeurs partenaires · formulaire public de la page Hébergement ──
// Un hébergeur (auberge, gîte, camping) laisse ses coordonnées, le lien
// de son établissement et ses photos AVANT d'aller au paiement Zeffy.
//
// On génère l'identifiant du document côté client, on téléverse d'abord
// les photos sous `hebergement-partenaires/{id}/{n}.{ext}`, puis un seul
// setDoc porte les URLs. La création reste ainsi publique et verrouillée
// sur une forme exacte (voir firestore.rules), sans mise à jour publique
// par-dessus. Personne n'est authentifié ici : l'hébergeur n'a pas de
// compte, ce que reflètent les règles Storage (création publique, images
// seulement, sous 8 Mo).

import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  getDownloadURL, ref, uploadBytesResumable, type UploadTaskSnapshot,
} from 'firebase/storage';
import { db, storage } from '../firebase';

export const MAX_BYTES  = 8 * 1024 * 1024; // 8 Mo, en accord avec storage.rules
export const MAX_PHOTOS = 6;

export interface HebergementSaisie {
  nom:       string;
  courriel:  string;
  telephone: string;
  lien:      string;
}

const extFromMime = (mime: string): string => {
  if (mime === 'image/png')  return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif')  return 'gif';
  if (mime === 'image/heic' || mime === 'image/heif') return 'heic';
  return 'jpg';
};

/**
 * Téléverse les photos puis crée le document Firestore. `onProgress`
 * reçoit une fraction 0..1 calculée sur le poids total des photos. Rejette
 * avec un message clair (déjà en français) si une photo est trop lourde,
 * n'est pas une image, ou si le service est indisponible.
 */
export async function soumettreHebergement(
  saisie: HebergementSaisie,
  photos: File[],
  onProgress?: (fraction: number) => void,
): Promise<void> {
  if (!db || !storage) throw new Error('Le service est indisponible pour le moment.');
  if (photos.length === 0)          throw new Error('Ajoutez au moins une photo.');
  if (photos.length > MAX_PHOTOS)   throw new Error('Six photos au maximum.');

  const database = db;
  const store    = storage;
  const id = doc(collection(database, 'hebergementsPartenaires')).id;

  const totalBytes = photos.reduce((s, f) => s + f.size, 0);
  let   doneBytes  = 0;
  const urls: string[] = [];

  for (let i = 0; i < photos.length; i++) {
    const file = photos[i];
    if (file.size > MAX_BYTES)         throw new Error('Une des photos dépasse 8 Mo.');
    if (!file.type.startsWith('image/')) throw new Error('Les fichiers doivent être des images.');

    const path = `hebergement-partenaires/${id}/${i}.${extFromMime(file.type)}`;
    const task = uploadBytesResumable(ref(store, path), file, { contentType: file.type });
    const base = doneBytes;
    await new Promise<void>((resolve, reject) => {
      task.on(
        'state_changed',
        (snap: UploadTaskSnapshot) =>
          onProgress?.(totalBytes ? (base + snap.bytesTransferred) / totalBytes : 0),
        reject,
        () => resolve(),
      );
    });
    doneBytes += file.size;
    urls.push(await getDownloadURL(task.snapshot.ref));
  }

  await setDoc(doc(database, 'hebergementsPartenaires', id), {
    nom:       saisie.nom.trim(),
    courriel:  saisie.courriel.trim(),
    telephone: saisie.telephone.trim(),
    lien:      saisie.lien.trim(),
    photos:    urls,
    statut:    'attente',
    creeLe:    serverTimestamp(),
  });
}
