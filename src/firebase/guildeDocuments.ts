// ─── Les dossiers et documents d'une guilde ──────────────────────────
// Addendum 2 du 6 septembre 2026, ordres 13 et 14. Deux choses qui se
// complètent : l'espace Drive que le groupe possède déjà (le lien d'un
// dossier partagé, montré en iframe), et les documents déposés ici
// même, rangés par dossier à nom libre :
//
//   guildes/{id}/documents/{docId} { titre, dossier, fichierUrl, chemin,
//                                    contentType, taille, uid, nom, creeLe }
//   Storage : guildes/{id}/documents/{docId}.{ext}
//
// Le fichier part tel quel, avec sa progression, comme la vidéo de la
// vitrine (guildeVitrine.ts). Le type envoyé à Storage se déduit de
// l'extension et non du navigateur, qui laisse souvent un .md sans
// type : la règle Storage compare au même tableau.

import {
  collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc,
  type Timestamp,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '../firebase';

export const DOSSIER_DEFAUT = 'Général';
export const LONGUEUR_MAX_DOSSIER = 40;
export const LONGUEUR_MAX_TITRE = 120;
/** La même borne que storage.rules. */
export const POIDS_MAX_DOCUMENT = 25 * 1024 * 1024;

/** Extension vers type MIME. Ce tableau fait foi des deux côtés. */
export const TYPES_DOCUMENT: Record<string, string> = {
  pdf: 'application/pdf',
  webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', md: 'text/markdown', zip: 'application/zip',
};

/** Ce que l'<input type="file"> accepte. */
export const ACCEPT_DOCUMENTS = Object.keys(TYPES_DOCUMENT).map((e) => `.${e}`).join(',');

export interface DocumentGuilde {
  id: string;
  titre: string;
  /** Le nom du dossier, libre; « Général » à défaut. */
  dossier: string;
  fichierUrl: string;
  /** Le chemin Storage, pour la suppression. */
  chemin: string;
  contentType: string;
  /** En octets. */
  taille: number;
  uid: string;
  nom: string;
  creeLe?: Timestamp | null;
}

export interface AuteurDocument { uid: string; nom: string }

const COL = (guildeId: string) => collection(db!, 'guildes', guildeId, 'documents');

export const extensionDe = (nomFichier: string): string =>
  nomFichier.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';

/** Un nom de dossier propre : espaces repliés, borné, jamais vide. */
export const normaliserDossier = (d: string): string =>
  d.trim().replace(/\s+/g, ' ').slice(0, LONGUEUR_MAX_DOSSIER) || DOSSIER_DEFAUT;

// ─── Lire ────────────────────────────────────────────────────────────
const millis = (t: Timestamp | null | undefined): number => t?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;

/** Les documents en direct : le dossier « Général » d'abord, les autres
 *  par ordre alphabétique, et dans chacun du plus récent au plus ancien.
 *  Le tri se fait ici plutôt que par deux orderBy, pour ne pas exiger
 *  d'index composé. Un dépôt qui vient de partir n'a pas encore son
 *  horodatage et se range en tête. */
export function suivreDocuments(guildeId: string, cb: (docs: DocumentGuilde[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(COL(guildeId), orderBy('creeLe', 'desc'));
  const rang = (d: string) => (d === DOSSIER_DEFAUT ? '' : d);
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as DocumentGuilde));
      rows.sort((a, b) => rang(a.dossier).localeCompare(rang(b.dossier), 'fr') || millis(b.creeLe) - millis(a.creeLe));
      cb(rows);
    },
    () => cb([]),
  );
}

// ─── Écrire ──────────────────────────────────────────────────────────
/** Dépose un fichier dans un dossier et rend l'identifiant du document.
 *  Les messages d'erreur sont ceux que le panneau affiche tels quels. */
export async function televerser(
  guildeId: string, auteur: AuteurDocument, fichier: File, dossier: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  if (!db || !storage) throw new Error('Le stockage est indisponible pour le moment.');
  const ext = extensionDe(fichier.name);
  const contentType = TYPES_DOCUMENT[ext];
  if (!contentType) throw new Error('Ce genre de fichier ne passe pas. Déposez un PDF, une image, un document Office, un texte ou un zip.');
  if (fichier.size >= POIDS_MAX_DOCUMENT) throw new Error('Le fichier dépasse 25 Mo.');

  const id = doc(COL(guildeId)).id;
  const chemin = `guildes/${guildeId}/documents/${id}.${ext}`;
  const tache = uploadBytesResumable(ref(storage, chemin), fichier, { contentType });
  await new Promise<void>((resolve, reject) => {
    tache.on(
      'state_changed',
      (s) => onProgress?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0),
      reject,
      resolve,
    );
  });
  const fichierUrl = await getDownloadURL(tache.snapshot.ref);

  await setDoc(doc(COL(guildeId), id), {
    titre: fichier.name.replace(/\.[a-z0-9]+$/i, '').trim().slice(0, LONGUEUR_MAX_TITRE) || fichier.name,
    dossier: normaliserDossier(dossier),
    fichierUrl, chemin, contentType, taille: fichier.size,
    uid: auteur.uid, nom: (auteur.nom || '?').slice(0, 80),
    creeLe: serverTimestamp(),
  });
  return id;
}

/** Retire le document, et son fichier dans Storage. */
export async function supprimer(guildeId: string, d: Pick<DocumentGuilde, 'id' | 'chemin'>): Promise<void> {
  if (!db) return;
  if (d.chemin && storage) {
    // Le fichier peut déjà avoir disparu : on efface la fiche quand même.
    try { await deleteObject(ref(storage, d.chemin)); } catch { /* déjà absent */ }
  }
  await deleteDoc(doc(COL(guildeId), d.id));
}

// ─── L'espace Drive commun ───────────────────────────────────────────
/** L'identifiant d'un dossier Drive, ou null si le lien n'en est pas
 *  un. Accepte /folders/{id} (avec ou sans /u/0/), ?id= et open?id=.
 *  Fonction pure, sans réseau. */
export function idDossierDrive(url: string): string | null {
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  if (u.protocol !== 'https:' || u.hostname !== 'drive.google.com') return null;
  const id = u.pathname.match(/\/folders\/([\w-]+)/)?.[1] || u.searchParams.get('id');
  return id && /^[\w-]{10,}$/.test(id) ? id : null;
}

export const lienEmbedDrive = (id: string): string => `https://drive.google.com/embeddedfolderview?id=${id}#list`;

/** L'adresse propre du dossier, celle qu'on enregistre et qu'on ouvre. */
export const lienDossierDrive = (id: string): string => `https://drive.google.com/drive/folders/${id}`;
