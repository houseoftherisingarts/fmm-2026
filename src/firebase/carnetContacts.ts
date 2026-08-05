// Carnet de contacts — Firestore CRUD + Firebase Storage (portraits).
// Admin only (voir firestore.rules / storage.rules).
//
// ⚠️ Données sensibles : l'allégeance (allié / neutre / adversaire) et
// les notes portent un jugement sur des personnes réelles (élus,
// partenaires, fournisseurs…). Ne jamais les exposer hors de l'admin
// authentifiée — aucune lecture publique n'existe ni ne doit exister
// pour la collection `carnetContacts` ou le chemin Storage
// `carnet-contacts/`.
//
// Collection distincte de `contacts` (déjà prise par le formulaire
// public "Nous contacter" du site, voir firestore.rules).

import {
  collection, doc, addDoc, getDocs, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

export type ContactRole =
  | 'organisateur' | 'benevole' | 'fournisseur' | 'partenaire' | 'elu' | 'media' | 'artiste' | 'autre';

export const ROLE_LABEL: Record<ContactRole, string> = {
  organisateur: 'Organisateur',
  benevole: 'Bénévole',
  fournisseur: 'Fournisseur',
  partenaire: 'Partenaire',
  elu: 'Élu·e',
  media: 'Média',
  artiste: 'Artiste',
  autre: 'Autre',
};

export const ROLE_ORDER: ContactRole[] = [
  'organisateur', 'elu', 'partenaire', 'fournisseur', 'media', 'artiste', 'benevole', 'autre',
];

// Allégeance — donnée sensible (voir avertissement en tête de fichier).
export type Allegiance = 'allie' | 'neutre' | 'adversaire';

export const ALLEGIANCE_LABEL: Record<Allegiance, string> = {
  allie: 'Allié',
  neutre: 'Neutre',
  adversaire: 'Adversaire',
};

export const ALLEGIANCE_ORDER: Allegiance[] = ['allie', 'neutre', 'adversaire'];

export interface Contact {
  id: string;
  name: string;
  role: ContactRole;
  allegiance: Allegiance;
  fonction: string;       // fonction dans la vraie vie (ex. « Maire de Montpellier »)
  organisation: string;
  email: string;
  phone: string;
  notes: string;
  lastContactAt: string;  // date ISO (yyyy-mm-dd), vide si jamais renseignée
  photoUrl: string;
  photoPath: string;      // chemin Storage — vide si aucun portrait
  archived: boolean;
  order: number;
}

const stripUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
};

const COL = 'carnetContacts';
const STORAGE_ROOT = 'carnet-contacts';

export async function listContacts(): Promise<Contact[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Contact, 'id'>) }));
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function addContact(c: Omit<Contact, 'id'>): Promise<Contact> {
  if (!db) throw new Error('Firebase non configuré');
  const ref2 = await addDoc(collection(db, COL), { ...c, updatedAt: serverTimestamp() });
  return { ...c, id: ref2.id };
}

export async function updateContact(id: string, patch: Partial<Omit<Contact, 'id'>>): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await updateDoc(doc(db, COL, id), { ...stripUndefined(patch), updatedAt: serverTimestamp() });
}

// Archivage seulement — jamais de suppression franche (décision Alex :
// on garde la trace même d'un contact devenu inactif ou d'un
// adversaire qui ne l'est plus).
export async function setContactArchived(id: string, archived: boolean): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await updateDoc(doc(db, COL, id), { archived, updatedAt: serverTimestamp() });
}

// Recadre en carré et encode en webp, comme AvatarUpload — évite
// d'envoyer une photo de téléphone de plusieurs Mo pour une vignette.
const SIDE = 512;
async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = SIDE; canvas.height = SIDE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponible');
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIDE, SIDE);
  bitmap.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encodage impossible'))), 'image/webp', 0.86);
  });
}

// Téléverse le portrait sous un chemin admin-only (jamais public — voir
// storage.rules). Retourne l'URL + le chemin à ranger sur le contact.
export async function uploadContactPhoto(file: File): Promise<{ url: string; path: string }> {
  if (!storage) throw new Error('Firebase Storage non configuré');
  const blob = await toSquareWebp(file);
  const path = `${STORAGE_ROOT}/${Date.now()}.webp`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: 'image/webp' });
  const url = await getDownloadURL(storageRef);
  return { url, path };
}
