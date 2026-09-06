// ─── La vitrine publique d'une guilde ────────────────────────────────
// Addendum du 6 septembre 2026, ordre 8. Un mur qui se lit sans compte,
// séparé du mur privé (mur.ts). Les membres y publient un texte, une
// photo, une vidéo (lien YouTube ou Vimeo, mp4 direct ou fichier) ou
// une formation (PDF ou lien, avec sa durée) :
//
//   guildes/{id}/vitrine/{postId} { type, titre?, texte, mediaUrl?, chemin?,
//                                    videoUrl?, fichierUrl?, duree?, uid, nom,
//                                    avatarUrl?, epingle?, creeLe, maj }
//   Storage : guildes/{id}/vitrine/{postId}.webp | .mp4 | .pdf
//
// La photo passe par versWebp comme partout ailleurs sur le site; la
// vidéo mp4 et le PDF partent tels quels, avec la progression, puisque
// c'est eux qui pèsent. La règle Firestore laisse l'auteur retoucher
// son titre et son texte, et réserve l'épingle aux chefs et à l'équipe.

import {
  collection, deleteDoc, doc, limit as fbLimit, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc, type Timestamp,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '../firebase';
import { versWebp } from './photosPubliques';

export type TypeVitrine = 'texte' | 'photo' | 'video' | 'formation';

/** Les mêmes bornes que firestore.rules et storage.rules. */
export const LONGUEUR_MAX_TEXTE = 5000;
export const LONGUEUR_MAX_TITRE = 160;
export const POIDS_MAX_VIDEO = 80 * 1024 * 1024;
export const POIDS_MAX_PDF = 20 * 1024 * 1024;

export interface BilletVitrine {
  id: string;
  type: TypeVitrine;
  titre?: string;
  texte: string;
  /** La photo, en webp. */
  mediaUrl?: string;
  /** Le chemin Storage du fichier déposé, pour la suppression. */
  chemin?: string;
  /** YouTube, Vimeo, mp4 direct, ou l'adresse du fichier déposé. */
  videoUrl?: string;
  /** Le PDF déposé, ou le lien de la formation. */
  fichierUrl?: string;
  duree?: string;
  uid: string;
  nom: string;
  avatarUrl?: string;
  epingle?: boolean;
  creeLe?: Timestamp | null;
  maj?: Timestamp | null;
}

export interface AuteurVitrine { uid: string; nom: string; avatarUrl?: string }

/** Ce que le composeur envoie. `lien` sert à la vidéo (YouTube, Vimeo
 *  ou mp4) et à la formation (une adresse externe au lieu du PDF). */
export interface BrouillonVitrine {
  type: TypeVitrine;
  titre?: string;
  texte: string;
  fichier?: File;
  lien?: string;
  duree?: string;
}

const COL = (guildeId: string) => collection(db!, 'guildes', guildeId, 'vitrine');

// ─── Les liens vidéo ─────────────────────────────────────────────────
const embedYoutube = (id: string | null | undefined): string | null =>
  id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;

/** L'adresse d'intégration d'une vidéo YouTube ou Vimeo, ou null si le
 *  lien n'en est pas un : un mp4 direct se lit dans <video>. Fonction
 *  pure, sans réseau. */
export function lienEmbed(url: string): string | null {
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  const hote = u.hostname.replace(/^(www|m)\./, '');
  if (hote === 'youtu.be') return embedYoutube(u.pathname.slice(1).split('/')[0]);
  if (hote === 'youtube.com' || hote === 'youtube-nocookie.com') {
    return embedYoutube(u.searchParams.get('v') || u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]);
  }
  if (hote === 'vimeo.com' || hote === 'player.vimeo.com') {
    const id = u.pathname.match(/\/(\d{6,})(?:\/|$)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

export const estLienMp4 = (url: string): boolean => /^https?:\/\/.+\.(mp4|webm)(\?.*)?$/i.test(url.trim());

// ─── Lire ────────────────────────────────────────────────────────────
const millis = (t: Timestamp | null | undefined): number => t?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;

/** La vitrine en direct : les épinglés d'abord, puis du plus récent au
 *  plus ancien. Un billet qui vient de partir n'a pas encore son
 *  horodatage du serveur et se range en tête, là où son auteur l'attend. */
export function suivreVitrine(
  guildeId: string, cb: (billets: BilletVitrine[]) => void, max = 60,
): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(COL(guildeId), orderBy('creeLe', 'desc'), fbLimit(max));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as BilletVitrine));
      rows.sort((a, b) => Number(!!b.epingle) - Number(!!a.epingle) || millis(b.creeLe) - millis(a.creeLe));
      cb(rows);
    },
    // Une règle qui refuse ne casse pas la page : la vitrine reste vide.
    () => cb([]),
  );
}

// ─── Écrire ──────────────────────────────────────────────────────────
async function televerser(
  chemin: string, donnees: Blob, contentType: string, onProgress?: (fraction: number) => void,
): Promise<string> {
  const tache = uploadBytesResumable(ref(storage!, chemin), donnees, { contentType });
  await new Promise<void>((resolve, reject) => {
    tache.on(
      'state_changed',
      (s) => onProgress?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0),
      reject,
      resolve,
    );
  });
  return getDownloadURL(tache.snapshot.ref);
}

/** Publie un billet et rend son identifiant. Les messages d'erreur
 *  sont ceux que le composeur affiche tels quels. */
export async function publier(
  guildeId: string, auteur: AuteurVitrine, b: BrouillonVitrine, onProgress?: (fraction: number) => void,
): Promise<string> {
  if (!db || !storage) throw new Error('Le stockage est indisponible pour le moment.');
  const texte = b.texte.trim().slice(0, LONGUEUR_MAX_TEXTE);
  const titre = (b.titre || '').trim().slice(0, LONGUEUR_MAX_TITRE);
  const lien = (b.lien || '').trim();
  const id = doc(COL(guildeId)).id;
  const dossier = `guildes/${guildeId}/vitrine/${id}`;

  const ligne: Record<string, unknown> = {
    type: b.type, texte, uid: auteur.uid, nom: (auteur.nom || '?').slice(0, 80),
    creeLe: serverTimestamp(), maj: serverTimestamp(),
  };
  if (titre) ligne.titre = titre;
  if (auteur.avatarUrl) ligne.avatarUrl = auteur.avatarUrl;
  if (b.duree?.trim()) ligne.duree = b.duree.trim().slice(0, 40);

  if (b.type === 'photo') {
    if (!b.fichier) throw new Error('Choisissez une photo.');
    const { blob } = await versWebp(b.fichier, 1800, 0.85);
    ligne.chemin = `${dossier}.webp`;
    ligne.mediaUrl = await televerser(`${dossier}.webp`, blob, 'image/webp', onProgress);
  } else if (b.type === 'video') {
    if (b.fichier) {
      if (b.fichier.size >= POIDS_MAX_VIDEO) throw new Error('La vidéo dépasse 80 Mo.');
      ligne.chemin = `${dossier}.mp4`;
      ligne.videoUrl = await televerser(`${dossier}.mp4`, b.fichier, 'video/mp4', onProgress);
    } else if (lienEmbed(lien) || estLienMp4(lien)) {
      ligne.videoUrl = lien;
    } else {
      throw new Error('Collez un lien YouTube, Vimeo ou mp4, ou choisissez un fichier mp4.');
    }
  } else if (b.type === 'formation') {
    if (b.fichier) {
      if (b.fichier.size >= POIDS_MAX_PDF) throw new Error('Le PDF dépasse 20 Mo.');
      ligne.chemin = `${dossier}.pdf`;
      ligne.fichierUrl = await televerser(`${dossier}.pdf`, b.fichier, 'application/pdf', onProgress);
    } else if (/^https?:\/\//i.test(lien)) {
      ligne.fichierUrl = lien;
    } else {
      throw new Error('Déposez un PDF ou collez le lien de la formation.');
    }
  } else if (!texte) {
    throw new Error('Écrivez quelque chose.');
  }

  await setDoc(doc(COL(guildeId), id), ligne);
  return id;
}

/** L'auteur retouche son titre et son texte; la règle ne lui laisse
 *  rien d'autre. */
export async function modifier(
  guildeId: string, postId: string, patch: { titre?: string; texte: string },
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(COL(guildeId), postId), {
    texte: patch.texte.trim().slice(0, LONGUEUR_MAX_TEXTE),
    maj: serverTimestamp(),
    ...(patch.titre !== undefined ? { titre: patch.titre.trim().slice(0, LONGUEUR_MAX_TITRE) } : {}),
  });
}

/** Retire le billet, et le fichier qu'il avait déposé dans Storage. */
export async function supprimer(guildeId: string, billet: Pick<BilletVitrine, 'id' | 'chemin'>): Promise<void> {
  if (!db) return;
  if (billet.chemin && storage) {
    // Le fichier peut déjà avoir disparu : on efface le billet quand même.
    try { await deleteObject(ref(storage, billet.chemin)); } catch { /* déjà absent */ }
  }
  await deleteDoc(doc(COL(guildeId), billet.id));
}

/** Chef ou équipe seulement (firestore.rules). */
export async function epingler(guildeId: string, postId: string, epingle: boolean): Promise<void> {
  if (!db) return;
  await updateDoc(doc(COL(guildeId), postId), { epingle, maj: serverTimestamp() });
}
