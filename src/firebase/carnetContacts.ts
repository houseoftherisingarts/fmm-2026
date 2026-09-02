// Carnet de contacts : Firestore CRUD + Firebase Storage (portraits).
// Admin only (voir firestore.rules / storage.rules).
//
// Depuis le 2026-09-02, cette collection porte aussi le BOTTIN des
// ressources du festival : la municipalité, les services publics, les
// fournisseurs, les urgences. Une seule collection pour les deux, parce
// qu'une fiche de bottin et une fiche de carnet portent exactement les
// mêmes champs et que séparer les deux obligerait à chercher un numéro
// à deux endroits pendant le festival. Ce qui distingue une ressource
// d'une relation, c'est sa famille (le champ `role`) et son drapeau
// d'urgence.
//
// Les champs venus du bottin sont nommés en français, comme le reste du
// code récent du dépôt. Les anciens champs gardent leur nom anglais :
// les renommer n'apporterait rien et toucherait toute la section.
//
// ⚠️ Données sensibles : l'allégeance (allié / neutre / adversaire) et
// les notes portent un jugement sur des personnes réelles (élus,
// partenaires, fournisseurs…). Ne jamais les exposer hors de l'admin
// authentifiée : aucune lecture publique n'existe ni ne doit exister
// pour la collection `carnetContacts` ou le chemin Storage
// `carnet-contacts/`.
//
// Collection distincte de `contacts` (déjà prise par le formulaire
// public "Nous contacter" du site, voir firestore.rules).

import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

// La famille d'une fiche. Elle sert de rangement au bottin autant que
// de rôle au carnet : « service-public » est arrivé avec le bottin pour
// tenir la municipalité, la MRC, la Sûreté, les pompiers et les
// ministères, que personne n'aurait su ranger sous les autres.
export type ContactRole =
  | 'organisateur' | 'benevole' | 'fournisseur' | 'partenaire' | 'elu'
  | 'service-public' | 'media' | 'artiste' | 'autre';

export const ROLE_LABEL: Record<ContactRole, string> = {
  organisateur: 'Équipe d\u2019organisation',
  benevole: 'Bénévole',
  fournisseur: 'Fournisseur',
  partenaire: 'Partenaire',
  elu: 'Élu·e',
  'service-public': 'Municipalité et services publics',
  media: 'Média',
  artiste: 'Artiste',
  autre: 'Autre',
};

// L'ordre d'affichage du bottin : ce qu'on cherche le plus souvent en
// premier. Les urgences ne figurent pas ici, elles ont leur bandeau.
export const ROLE_ORDER: ContactRole[] = [
  'service-public', 'organisateur', 'elu', 'partenaire', 'fournisseur', 'media', 'artiste', 'benevole', 'autre',
];

// Allégeance : donnée sensible (voir avertissement en tête de fichier).
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

  // ── Le bottin ──────────────────────────────────────────────────
  adresse: string;        // adresse civique, pour aller frapper à la porte
  urgence: boolean;       // épingle la fiche au bandeau d'urgence du haut
  verifieLe: string;      // date ISO (yyyy-mm-dd) de la dernière vérification
  source: string;         // d'où viennent ces coordonnées (URL ou document)

  photoUrl: string;
  photoPath: string;      // chemin Storage : vide si aucun portrait
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

// Une fiche écrite avant le bottin n'a pas les nouveaux champs, et une
// fiche versée par tools/bottin-seed.mjs peut en laisser un vide quand
// la donnée n'a pas pu être vérifiée. La lecture comble les trous pour
// que l'écran n'ait jamais à se demander si une valeur existe.
function normaliser(id: string, brut: Partial<Contact>): Contact {
  return {
    id,
    name: brut.name ?? '',
    role: brut.role ?? 'autre',
    allegiance: brut.allegiance ?? 'neutre',
    fonction: brut.fonction ?? '',
    organisation: brut.organisation ?? '',
    email: brut.email ?? '',
    phone: brut.phone ?? '',
    notes: brut.notes ?? '',
    lastContactAt: brut.lastContactAt ?? '',
    adresse: brut.adresse ?? '',
    urgence: brut.urgence === true,
    verifieLe: brut.verifieLe ?? '',
    source: brut.source ?? '',
    photoUrl: brut.photoUrl ?? '',
    photoPath: brut.photoPath ?? '',
    archived: brut.archived === true,
    order: typeof brut.order === 'number' ? brut.order : 0,
  };
}

export async function listContacts(): Promise<Contact[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  const rows = snap.docs.map((d) => normaliser(d.id, d.data() as Partial<Contact>));
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

// ── Composer d'un doigt, pendant le festival ────────────────────────
// Un numéro se saisit comme on le lit : « 819 428-1280 », « 1 800 555
// 1212 », « 819 427-6262 poste 221 ». Le lien de composition ne garde
// que les chiffres, ajoute l'indicatif de pays quand il en manque un, et
// range le poste derrière la virgule d'attente que les téléphones
// comprennent. Un numéro d'urgence court comme le 911 passe tel quel.
export function lienTel(numero: string): string {
  if (!numero) return '';
  const [avant, apres] = numero.split(/poste|ext\.?|#/i);
  const chiffres = (avant ?? '').replace(/\D/g, '');
  if (!chiffres) return '';
  const poste = (apres ?? '').replace(/\D/g, '');
  let principal: string;
  if (chiffres.length === 10) principal = `+1${chiffres}`;
  else if (chiffres.length === 11 && chiffres.startsWith('1')) principal = `+${chiffres}`;
  else principal = chiffres;
  return `tel:${principal}${poste ? `,${poste}` : ''}`;
}

export function lienCourriel(adresseCourriel: string): string {
  return adresseCourriel ? `mailto:${adresseCourriel.trim()}` : '';
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

// Archivage seulement : jamais de suppression franche (décision Alex :
// on garde la trace même d'un contact devenu inactif ou d'un
// adversaire qui ne l'est plus).
export async function setContactArchived(id: string, archived: boolean): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await updateDoc(doc(db, COL, id), { archived, updatedAt: serverTimestamp() });
}

// La suppression franche, réservée au bottin. L'archivage reste le geste
// normal pour une personne : on garde la trace de quelqu'un devenu
// inactif. Une fiche de ressource fausse ou en double, elle, n'a aucune
// raison de survivre à sa correction, et la laisser traîner archivée
// ferait douter du numéro juste.
export async function supprimerContact(id: string): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await deleteDoc(doc(db, COL, id));
}

// Recadre en carré et encode en webp, comme AvatarUpload. Évite
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

// Téléverse le portrait sous un chemin admin-only (jamais public, voir
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
