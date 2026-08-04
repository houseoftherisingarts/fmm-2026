// Groupes musicaux : la programmation gérée par Éric Pichette (Pitch).
// Distinct de `musicians` (candidatures reçues via le formulaire public) et
// de la collection Firestore `groupes` (demandes de visite de groupes
// scolaires/communautaires/corporatifs, GroupesPage.tsx) : d'où le nom de
// collection `groupesMusicaux` pour éviter toute collision. Un groupe est
// soit à l'affiche de l'année courante (avec sa journée), soit classé aux
// archives (avec son année). La page publique Musique lit cette collection
// en lecture seule (branchement fait par un autre agent).

import {
  collection, doc, getDocs, updateDoc, deleteDoc, setDoc,
  onSnapshot, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

export type GroupeStatut = 'affiche' | 'archive';
export type GroupeJour = 'vendredi' | 'samedi' | 'dimanche';

export interface GroupeMusical {
  id: string;
  nom: string;
  bioFR: string;
  bioEN: string;
  site?: string;
  photoUrl?: string;
  statut: GroupeStatut;
  /** Présent seulement quand statut === 'affiche'. */
  jour?: GroupeJour;
  /** Présent seulement quand statut === 'archive' (2022 à 2026). */
  annee?: number;
  ordre: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const COL = 'groupesMusicaux';

const JOUR_INDEX: Record<GroupeJour, number> = { vendredi: 0, samedi: 1, dimanche: 2 };

// Firestore rejects payloads containing `undefined` : drop those keys.
const stripUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
};

function fromSnap(id: string, data: Record<string, unknown>): GroupeMusical {
  return {
    id,
    nom: (data.nom as string) || '',
    bioFR: (data.bioFR as string) || '',
    bioEN: (data.bioEN as string) || '',
    site: (data.site as string) || undefined,
    photoUrl: (data.photoUrl as string) || undefined,
    statut: (data.statut as GroupeStatut) || 'archive',
    jour: (data.jour as GroupeJour) || undefined,
    annee: typeof data.annee === 'number' ? data.annee : undefined,
    ordre: typeof data.ordre === 'number' ? data.ordre : 0,
    createdAt: data.createdAt as Timestamp | undefined,
    updatedAt: data.updatedAt as Timestamp | undefined,
  };
}

// À l'affiche d'abord (dans l'ordre vendredi/samedi/dimanche), puis les
// archives par année décroissante. Dans chaque groupe : ordre croissant,
// puis nom.
function compareGroupes(a: GroupeMusical, b: GroupeMusical): number {
  if (a.statut !== b.statut) return a.statut === 'affiche' ? -1 : 1;
  if (a.statut === 'affiche') {
    const ai = a.jour ? JOUR_INDEX[a.jour] : 99;
    const bi = b.jour ? JOUR_INDEX[b.jour] : 99;
    if (ai !== bi) return ai - bi;
  } else {
    const ay = a.annee ?? 0;
    const by = b.annee ?? 0;
    if (ay !== by) return by - ay;
  }
  if (a.ordre !== b.ordre) return a.ordre - b.ordre;
  return a.nom.localeCompare(b.nom, 'fr');
}

// ── Reads ────────────────────────────────────────────────────────────

export async function listGroupes(): Promise<GroupeMusical[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  const groupes = snap.docs.map((d) => fromSnap(d.id, d.data() as Record<string, unknown>));
  return groupes.sort(compareGroupes);
}

// Écoute temps réel : Éric voit la liste bouger dès qu'un autre admin
// modifie un groupe. Erreur (permission refusée, etc.) → liste vide.
export function watchGroupes(cb: (groupes: GroupeMusical[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    collection(db, COL),
    (snap) => {
      const groupes = snap.docs.map((d) => fromSnap(d.id, d.data() as Record<string, unknown>));
      cb(groupes.sort(compareGroupes));
    },
    (err) => {
      console.warn('[groupesMusicaux] watchGroupes snapshot error:', err);
      cb([]);
    },
  );
}

// ── Mutations ────────────────────────────────────────────────────────

// Génère un id à l'avance : permet de téléverser la photo AVANT la
// création du document (le formulaire crée l'id, envoie la photo au
// chemin Storage correspondant, puis écrit le document avec son URL).
export function newGroupeId(): string {
  if (!db) return `local-${Date.now()}`;
  return doc(collection(db, COL)).id;
}

export interface GroupeInput {
  nom: string;
  bioFR: string;
  bioEN: string;
  site?: string;
  photoUrl?: string;
  statut: GroupeStatut;
  jour?: GroupeJour;
  annee?: number;
  ordre: number;
}

export async function createGroupe(id: string, input: GroupeInput): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await setDoc(doc(db, COL, id), stripUndefined({
    nom: input.nom.trim(),
    bioFR: input.bioFR.trim(),
    bioEN: input.bioEN.trim(),
    site: input.site?.trim() || undefined,
    photoUrl: input.photoUrl || undefined,
    statut: input.statut,
    jour: input.statut === 'affiche' ? input.jour : undefined,
    annee: input.statut === 'archive' ? input.annee : undefined,
    ordre: input.ordre,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
}

export async function updateGroupe(id: string, patch: Partial<GroupeInput>): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const data = stripUndefined({ ...patch, updatedAt: serverTimestamp() });
  // Le statut décide quel champ (jour/année) est pertinent : si le patch
  // change le statut, on efface explicitement le champ devenu inutile
  // (Firestore ne le fait pas tout seul, et stripUndefined l'aurait
  // laissé traîner de l'ancien état).
  if (patch.statut === 'affiche') data.annee = undefined;
  if (patch.statut === 'archive') data.jour = undefined;
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

export async function deleteGroupe(id: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, COL, id));
}

// ── Photo ────────────────────────────────────────────────────────────
// Redimensionnée DANS LE NAVIGATEUR avant l'envoi (même mécanique que
// AvatarUpload) : ratio conservé (pas de recadrage carré), largeur max
// 1280px, encodage webp qualité ~82.

const MAX_WIDTH = 1280;
const QUALITY = 0.82;

async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponible');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('encodage impossible'))),
      'image/webp',
      QUALITY,
    );
  });
}

export async function uploadGroupePhoto(id: string, file: File): Promise<string> {
  if (!storage) throw new Error('Firebase not configured');
  const blob = await toWebp(file);
  const r = ref(storage, `groupes/${id}/photo.webp`);
  await uploadBytes(r, blob, { contentType: 'image/webp' });
  // `?v=` force le navigateur à recharger : le chemin ne change pas d'un
  // envoi à l'autre, donc sans ça l'ancienne photo resterait affichée.
  return `${await getDownloadURL(r)}&v=${Date.now()}`;
}
