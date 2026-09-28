// ─── Les vitrines : la page d'un musicien ou d'un artisan sans site ──
// Alex, 2026-09-28 : « une page spéciale pour les musiciens et les
// artisans qui n'ont pas de site web, un profil qu'ils éditent eux-mêmes
// et dont ils partagent l'adresse à leurs amis ». Un document par
// vitrine, dont l'identifiant EST le slug de l'adresse publique
// (/vitrine/{slug}) : l'unicité vient de Firestore, sans registre à
// côté. Le propriétaire (uid) est le seul à écrire, l'équipe lit tout.
//
// Les fichiers vivent dans Storage sous vitrines/{slug}/ : photos en
// webp redimensionnées dans le navigateur (versWebp), pistes audio
// envoyées telles quelles (mp3, m4a, wav, ogg, flac, 30 Mo au plus).
//
// La boutique : la vitrine est gratuite; la boutique du festival est
// une place payante, à l'année, que la personne demande depuis son
// atelier et que l'équipe active depuis l'admin une fois le paiement
// reçu (lien Zeffy posé par l'admin). Prix dans PRIX_BOUTIQUE_ANNUEL.

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { versWebp } from './photosPubliques';

export type TypeVitrine = 'musique' | 'artisan';
export type StatutBoutique = 'aucune' | 'demandee' | 'active' | 'refusee';

/** Le prix d'une boutique sur le site du festival, pour un an, en dollars. */
export const PRIX_BOUTIQUE_ANNUEL = 120;

export const MAX_PHOTOS   = 12;
export const MAX_PISTES   = 12;
export const MAX_PRODUITS = 30;
export const MAX_AUDIO_OCTETS = 30 * 1024 * 1024;
export const TYPES_AUDIO = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/flac'];

export interface Fichier { url: string; chemin: string }
export interface Piste  { id: string; titre: string; url: string; chemin: string; duree?: number }
export interface Produit {
  id: string; nom: string; description?: string; prix?: number;
  photo?: Fichier;
  /** Le lien de commande propre au produit (Square, Stripe, Etsy…). */
  lien?: string;
}
export interface Liens {
  site?: string; instagram?: string; facebook?: string; youtube?: string;
  spotify?: string; bandcamp?: string; tiktok?: string; courriel?: string;
  /** Le lien de paiement général de la personne (boutique Square, lien Stripe). */
  square?: string; stripe?: string;
}
export interface Boutique {
  statut: StatutBoutique;
  demandeeLe?: Timestamp;
  activeeLe?: Timestamp;
  expireLe?: Timestamp;
  /** Le lien Zeffy que l'équipe pose pour encaisser l'année. */
  lienPaiement?: string;
  note?: string;
}
export interface Vitrine {
  slug: string;
  uid: string;
  type: TypeVitrine;
  nom: string;
  accroche?: string;
  bio?: string;
  ville?: string;
  banniere?: Fichier;
  avatar?: Fichier;
  photos: Fichier[];
  pistes: Piste[];
  produits: Produit[];
  liens: Liens;
  publie: boolean;
  boutique: Boutique;
  creeLe?: Timestamp;
  maj?: Timestamp;
}

const COLL = 'vitrines';
const STORAGE_ROOT = 'vitrines';

// ─── Slug ────────────────────────────────────────────────────────────

/** « Les Ménestrels du Lac » devient « les-menestrels-du-lac ». */
export function versSlug(texte: string): string {
  return texte
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export const SLUG_VALIDE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

/** Les adresses déjà prises par le site lui-même. */
const SLUGS_RESERVES = new Set(['atelier', 'admin', 'boutique', 'boutiques', 'nouvelle', 'en', 'fr', 'festival', 'fmm']);

export function slugLibreDeForme(slug: string): boolean {
  return SLUG_VALIDE.test(slug) && slug.length >= 3 && !SLUGS_RESERVES.has(slug);
}

export async function slugDisponible(slug: string): Promise<boolean> {
  if (!db) return false;
  const snap = await getDoc(doc(db, COLL, slug));
  return !snap.exists();
}

// ─── Lecture ─────────────────────────────────────────────────────────

export async function lireVitrine(slug: string): Promise<Vitrine | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COLL, slug));
  return snap.exists() ? (snap.data() as Vitrine) : null;
}

export function suivreVitrine(slug: string, cb: (v: Vitrine | null) => void): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(doc(db, COLL, slug), (s) => cb(s.exists() ? (s.data() as Vitrine) : null), () => cb(null));
}

/** Les vitrines d'une personne (une le plus souvent, parfois deux). */
export function suivreMesVitrines(uid: string, cb: (v: Vitrine[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COLL), where('uid', '==', uid));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => d.data() as Vitrine)), () => cb([]));
}

/** Les boutiques actives et publiées, pour la page /boutiques. */
export async function listerBoutiquesActives(): Promise<Vitrine[]> {
  if (!db) return [];
  const q = query(collection(db, COLL), where('publie', '==', true), where('boutique.statut', '==', 'active'));
  const s = await getDocs(q);
  return s.docs.map((d) => d.data() as Vitrine).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/** Toutes les vitrines, pour l'admin. */
export async function listerVitrines(): Promise<Vitrine[]> {
  if (!db) return [];
  const s = await getDocs(collection(db, COLL));
  return s.docs.map((d) => d.data() as Vitrine).sort((a, b) => (b.maj?.toMillis?.() ?? 0) - (a.maj?.toMillis?.() ?? 0));
}

// ─── Écriture ────────────────────────────────────────────────────────

export async function creerVitrine(params: { slug: string; uid: string; type: TypeVitrine; nom: string }): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  if (!slugLibreDeForme(params.slug)) throw new Error('Cette adresse ne convient pas.');
  if (!(await slugDisponible(params.slug))) throw new Error('Cette adresse est déjà prise.');
  const data: Vitrine = {
    slug: params.slug, uid: params.uid, type: params.type, nom: params.nom.trim(),
    photos: [], pistes: [], produits: [], liens: {},
    publie: false,
    boutique: { statut: 'aucune' },
  };
  await setDoc(doc(db, COLL, params.slug), { ...data, creeLe: serverTimestamp(), maj: serverTimestamp() });
}

/** Un ou plusieurs champs de la vitrine, hors boutique (voir demanderBoutique). */
export async function majVitrine(slug: string, champs: Partial<Omit<Vitrine, 'slug' | 'uid' | 'boutique' | 'creeLe' | 'maj'>>): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  const propre: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(champs)) if (v !== undefined) propre[k] = v;
  await updateDoc(doc(db, COLL, slug), { ...propre, maj: serverTimestamp() });
}

export async function demanderBoutique(slug: string): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  await updateDoc(doc(db, COLL, slug), {
    boutique: { statut: 'demandee', demandeeLe: serverTimestamp() },
    maj: serverTimestamp(),
  });
}

/** L'équipe seulement : le statut de la boutique, son lien de paiement, sa note. */
export async function majBoutiqueAdmin(slug: string, boutique: Boutique): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  const propre: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(boutique)) if (v !== undefined && v !== '') propre[k] = v;
  await updateDoc(doc(db, COLL, slug), { boutique: propre, maj: serverTimestamp() });
}

export async function supprimerVitrine(v: Vitrine): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  const chemins = [
    v.banniere?.chemin, v.avatar?.chemin,
    ...v.photos.map((p) => p.chemin),
    ...v.pistes.map((p) => p.chemin),
    ...v.produits.map((p) => p.photo?.chemin),
  ].filter((c): c is string => Boolean(c));
  await supprimerFichiers(chemins);
  await deleteDoc(doc(db, COLL, v.slug));
}

// ─── Fichiers ────────────────────────────────────────────────────────

export async function supprimerFichiers(chemins: string[]): Promise<void> {
  if (!storage || !chemins.length) return;
  const s = storage;
  await Promise.all(chemins.map(async (c) => {
    try { await deleteObject(ref(s, c)); } catch { /* déjà absent */ }
  }));
}

async function envoyer(chemin: string, blob: Blob, contentType: string, onProgress?: (f: number) => void): Promise<Fichier> {
  if (!storage) throw new Error('Le stockage est indisponible pour le moment.');
  const task = uploadBytesResumable(ref(storage, chemin), blob, { contentType });
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', (snap) => onProgress?.(snap.bytesTransferred / Math.max(1, snap.totalBytes)), reject, () => resolve());
  });
  return { url: await getDownloadURL(task.snapshot.ref), chemin };
}

/** Une photo (bannière, avatar, galerie, produit) : webp bornée à maxSide. */
export async function televerserPhotoVitrine(
  slug: string, nom: string, file: File, maxSide = 1920, onProgress?: (f: number) => void,
): Promise<Fichier> {
  const { blob } = await versWebp(file, maxSide, 0.85);
  return envoyer(`${STORAGE_ROOT}/${slug}/${nom}-${Date.now()}.webp`, blob, 'image/webp', onProgress);
}

/** Une piste audio, envoyée telle quelle. */
export async function televerserPiste(slug: string, file: File, onProgress?: (f: number) => void): Promise<Fichier> {
  if (file.size > MAX_AUDIO_OCTETS) throw new Error('La piste dépasse 30 Mo.');
  const type = file.type || 'audio/mpeg';
  if (!TYPES_AUDIO.includes(type)) throw new Error('Format accepté : mp3, m4a, wav, ogg ou flac.');
  const ext = (file.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '');
  return envoyer(`${STORAGE_ROOT}/${slug}/piste-${Date.now()}.${ext}`, file, type, onProgress);
}

/** La durée d'un fichier audio, lue dans le navigateur, en secondes. */
export function dureeAudio(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(a.duration) ? Math.round(a.duration) : undefined); };
    a.onerror = () => { URL.revokeObjectURL(url); resolve(undefined); };
    a.src = url;
  });
}

export function formatDuree(s?: number): string {
  if (!s) return '';
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function nouvelId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** L'adresse publique complète, à partager. */
export function urlPublique(slug: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://festivalmedievaldemontpellier.org';
  return `${base}/vitrine/${slug}`;
}
