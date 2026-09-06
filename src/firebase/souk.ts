// ─── Le Souk · la foire usagée ───────────────────────────────────────
// Petite place de marché entre membres : chacun revend ses objets
// usagés (costumes, armes, artisanat…) et peut se créer, en option,
// une fiche de commerce non officielle (l'équivalent d'une page
// Facebook, jamais approuvée par le festival tant qu'elle n'est pas
// promue en kiosque). Storage : souk/{uid}/{id}-{n}.webp et
// commerces/{uid}/{n}.webp, même geste de redimensionnement que
// photosPubliques.ts (canevas → webp, côté navigateur, avant l'envoi).

import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot,
  query, serverTimestamp, setDoc, updateDoc, where, type Timestamp,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '../firebase';
import { versWebp } from './photosPubliques';
import {
  getVendorApp, upsertVendorApp, addUserFlag, CURRENT_YEAR,
  type VendorApp, type VendorStatus,
} from './applications';

export type CategorieObjet = 'costume' | 'arme' | 'artisanat' | 'livre' | 'decor' | 'autre';
/** Alex, 2026-08-28 : « il faudrait que la personne puisse offrir un
 *  service dans le souk ». Un genre à part, avec ses propres catégories. */
export type CategorieService = 'coup-de-main' | 'couture' | 'forge' | 'musique' | 'transport' | 'autre';
export type CategorieSouk = CategorieObjet | CategorieService;
export type GenreSouk = 'objet' | 'service';
export type StatutSouk = 'disponible' | 'reserve' | 'vendu';

export interface ObjetSouk {
  id: string;
  uid: string;
  nom: string;                // nom du vendeur, affiché sur la carte
  avatarUrl?: string;
  titre: string;
  description: string;
  /** Facultatif (Alex, 2026-08-28) : absent ou à zéro, avec prixMontpellois
   *  aussi absent ou à zéro, affiche l'étiquette « Gratuit, à donner ». */
  prix?: number;
  /** Prix en Montpellois, en plus du prix en dollars (Alex, 2026-08-28) :
   *  quand il est posé, un bouton « Acheter en Montpellois » paraît sur
   *  la carte, en plus de la messagerie. */
  prixMontpellois?: number;
  /** objet (défaut) ou service — Alex, 2026-08-28. */
  genre?: GenreSouk;
  categorie: CategorieSouk;
  photos: string[];
  chemins: string[];          // chemins Storage, pour la suppression
  statut: StatutSouk;
  /** Réservé au marché d'une guilde (contrat 6 sept 2026) : présent,
   *  l'annonce ne paraît que dans le Marché de cette guilde, jamais
   *  dans le Souk public. */
  guildeId?: string;
  /** Prix en pièces de la guilde (guildeId requis pour avoir un sens). */
  prixPieces?: number;
  creeLe: Timestamp | null;
  maj: Timestamp | null;
}

/** Rien à payer : ni dollars ni Montpellois (Alex, 2026-08-28). */
export const estGratuit = (o: Pick<ObjetSouk, 'prix' | 'prixMontpellois'>): boolean =>
  !o.prix && !o.prixMontpellois;

// ── Le Commerce : une fiche par membre (docId == uid) ───────────────
// Reprend les champs de base d'une page Facebook, plus toutes les
// questions du formulaire de kiosque (VendorQuestForm) SAUF celles qui
// concernent le kiosque physique lui-même (dimensions, électricité,
// emplacement, frais) : ces réponses-là restent propres à /marche/inscription.
export interface Commerce {
  uid: string;
  nom: string;
  description: string;
  categorie: string;
  site?: string;
  courriel?: string;
  telephone?: string;
  ville?: string;
  facebook?: string;
  instagram?: string;
  photos: string[];
  chemins: string[];
  // ── Champs Jesse (chapitres I, II, IV du formulaire marchand) ────
  contact?: string;
  hasParticipatedBefore?: boolean;
  teamSize?: string;
  familyVolunteerInterest?: boolean;
  logoUrl?: string;
  mainPhotoUrl?: string;
  regionOfOrigin?: string;
  firstTimeSource?: string;
  otherQuestions?: string;
  complet: boolean;           // fiche jugée assez remplie pour paraître dans la ruelle
  creeLe?: Timestamp;
  maj?: Timestamp;
}

const SOUK_COLL      = 'souk';
const SOUK_STORAGE   = 'souk';
const COMMERCE_COLL    = 'commerces';
const COMMERCE_STORAGE = 'commerces';
const MAX_SIDE = 1600;
export const MAX_PHOTOS_OBJET    = 4;
export const MAX_PHOTOS_COMMERCE = 6;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && Object.getPrototypeOf(v) === Object.prototype;

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    const v = obj[k];
    if (v === undefined) continue;
    out[k] = (isPlainObject(v) ? stripUndefined(v as Record<string, unknown>) : v) as T[keyof T];
  }
  return out;
}

// ── Photos : redimensionnement navigateur (versWebp), puis Storage ──
async function televerserPhotos(
  root: string, uid: string, prefixe: string, fichiers: File[],
): Promise<{ urls: string[]; chemins: string[] }> {
  if (!storage) throw new Error('Le stockage est indisponible pour le moment.');
  const s = storage;
  const urls: string[] = [];
  const chemins: string[] = [];
  let n = 0;
  for (const file of fichiers) {
    const { blob } = await versWebp(file, MAX_SIDE, 0.85);
    const chemin = `${root}/${uid}/${prefixe}${n}.webp`;
    n += 1;
    const task = uploadBytesResumable(ref(s, chemin), blob, { contentType: 'image/webp' });
    await new Promise<void>((resolve, reject) => {
      task.on('state_changed', undefined, reject, () => resolve());
    });
    urls.push(await getDownloadURL(task.snapshot.ref));
    chemins.push(chemin);
  }
  return { urls, chemins };
}

async function supprimerFichiers(chemins: string[]): Promise<void> {
  if (!storage || !chemins.length) return;
  await Promise.all(chemins.map(async (c) => {
    try { await deleteObject(ref(storage!, c)); } catch { /* déjà absent */ }
  }));
}

/** Téléverse les photos d'un objet mis en vente, sous souk/{uid}/{id}-{n}.webp. */
export function televerserPhotosObjet(id: string, uid: string, fichiers: File[]) {
  return televerserPhotos(SOUK_STORAGE, uid, `${id}-`, fichiers);
}

/** Téléverse des photos de commerce, sous commerces/{uid}/{n}.webp. */
export function televerserPhotosCommerce(uid: string, fichiers: File[]) {
  return televerserPhotos(COMMERCE_STORAGE, uid, `${Date.now()}-`, fichiers);
}

// ─── Objets (Le Souk) ────────────────────────────────────────────────

export async function creerObjetSouk(params: {
  uid: string; nom: string; avatarUrl?: string;
  titre: string; description: string; prix?: number; prixMontpellois?: number;
  genre?: GenreSouk; categorie: CategorieSouk;
  guildeId?: string; prixPieces?: number;
  fichiers: File[];
}): Promise<string> {
  if (!db) throw new Error('Firestore indisponible');
  const id = doc(collection(db, SOUK_COLL)).id;
  const { urls, chemins } = params.fichiers.length
    ? await televerserPhotosObjet(id, params.uid, params.fichiers.slice(0, MAX_PHOTOS_OBJET))
    : { urls: [], chemins: [] };
  const data = stripUndefined({
    uid: params.uid,
    nom: params.nom,
    avatarUrl: params.avatarUrl,
    titre: params.titre,
    description: params.description,
    // La règle Firestore exige encore `prix is number` à la création
    // (voir firestore.rules) : 0 tient lieu d'« aucun prix » en attendant
    // qu'elle tolère l'absence du champ (Alex, 2026-08-28).
    prix: params.prix ?? 0,
    prixMontpellois: params.prixMontpellois,
    genre: params.genre || 'objet',
    categorie: params.categorie,
    guildeId: params.guildeId,
    prixPieces: params.prixPieces,
    photos: urls,
    chemins,
    statut: 'disponible' as StatutSouk,
    creeLe: serverTimestamp(),
    maj: serverTimestamp(),
  });
  await setDoc(doc(db, SOUK_COLL, id), data);
  return id;
}

export async function majObjetSouk(
  id: string,
  patch: Partial<Pick<ObjetSouk, 'titre' | 'description' | 'prix' | 'prixMontpellois' | 'categorie' | 'statut' | 'guildeId' | 'prixPieces'>>,
): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  await updateDoc(doc(db, SOUK_COLL, id), { ...stripUndefined(patch), maj: serverTimestamp() });
}

export async function supprimerObjetSouk(id: string): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  const snap = await getDoc(doc(db, SOUK_COLL, id));
  const chemins = (snap.data() as ObjetSouk | undefined)?.chemins || [];
  await supprimerFichiers(chemins);
  await deleteDoc(doc(db, SOUK_COLL, id));
}

/** Les objets d'un membre, en direct (utilisé par MesObjets). */
export function suivreObjetsDe(uid: string, cb: (objets: ObjetSouk[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, SOUK_COLL), where('uid', '==', uid));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as ObjetSouk));
    rows.sort((a, b) => (b.creeLe?.toMillis?.() || 0) - (a.creeLe?.toMillis?.() || 0));
    cb(rows);
  }, () => cb([]));
}

/** Tout le Souk public, pour la page /souk (lecture ponctuelle). Les
 *  objets réservés à une guilde (guildeId posé) n'y paraissent jamais :
 *  filtre client, la requête reste inchangée pour éviter un index. */
export async function listerSouk(): Promise<ObjetSouk[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, SOUK_COLL));
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as object) } as ObjetSouk))
    .filter((o) => !o.guildeId);
  rows.sort((a, b) => (b.creeLe?.toMillis?.() || 0) - (a.creeLe?.toMillis?.() || 0));
  return rows;
}

/** Le Marché d'une guilde, en direct : les objets qui portent son
 *  guildeId, ni vendus (statut filtré côté client), les plus récents
 *  d'abord. */
export function suivreSoukDeGuilde(guildeId: string, cb: (objets: ObjetSouk[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, SOUK_COLL), where('guildeId', '==', guildeId));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as object) } as ObjetSouk))
      .filter((o) => o.statut !== 'vendu');
    rows.sort((a, b) => (b.creeLe?.toMillis?.() || 0) - (a.creeLe?.toMillis?.() || 0));
    cb(rows);
  }, () => cb([]));
}

// ─── Commerce ─────────────────────────────────────────────────────────

export async function getCommerce(uid: string): Promise<Commerce | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COMMERCE_COLL, uid));
  return snap.exists() ? (snap.data() as Commerce) : null;
}

/** Un membre a-t-il déjà une fiche de commerce ? (SoukDe l'utilise pour l'onglet.) */
export function suivreCommerce(uid: string, cb: (c: Commerce | null) => void): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(doc(db, COMMERCE_COLL, uid), (snap) => cb(snap.exists() ? (snap.data() as Commerce) : null), () => cb(null));
}

export async function upsertCommerce(commerce: Commerce): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  await setDoc(
    doc(db, COMMERCE_COLL, commerce.uid),
    { ...stripUndefined(commerce as unknown as Record<string, unknown>), maj: serverTimestamp(), creeLe: commerce.creeLe || serverTimestamp() },
    { merge: true },
  );
}

export async function deleteCommerce(uid: string): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  const existing = await getCommerce(uid);
  if (existing?.chemins?.length) await supprimerFichiers(existing.chemins);
  await deleteDoc(doc(db, COMMERCE_COLL, uid));
}

/** Commerces jugés complets, pour « Les commerces de la ruelle » (public + admin). */
export async function listerCommercesRuelle(): Promise<Commerce[]> {
  if (!db) return [];
  const q = query(collection(db, COMMERCE_COLL), where('complet', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Commerce);
}

/** Admin seulement : tous les commerces, complets ou non. */
export async function listerTousLesCommerces(): Promise<Commerce[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, COMMERCE_COLL));
  return snap.docs.map((d) => d.data() as Commerce);
}

// ── Bouton « Soumettre mon commerce comme kiosque » ──────────────────
// Recopie les champs du commerce dans une VendorApp et l'envoie via
// upsertVendorApp (statut 'pending' si aucun dossier n'existe déjà pour
// l'année visée). La cohorte courante étant complète, ceci vise
// toujours l'année suivante; le reste (kiosque physique) se complète
// ensuite sur /marche/inscription. Partagé entre CommerceDe.tsx (le
// membre) et CommercesSection.tsx (l'équipe, bouton « Promouvoir »).
export async function soumettreCommerceCommeKiosque(
  commerce: Commerce, email: string, displayName: string,
): Promise<number> {
  if (!db) throw new Error('Firestore indisponible');
  const year = CURRENT_YEAR + 1;
  const existing = await getVendorApp(commerce.uid, year);
  const socials = [commerce.facebook, commerce.instagram, commerce.site].filter(Boolean).join(' · ');
  const app: VendorApp = {
    uid: commerce.uid,
    email,
    displayName,
    kioskName: commerce.nom,
    contact: commerce.contact || displayName,
    category: commerce.categorie,
    products: commerce.description,
    hasInsurance: !!existing?.hasInsurance,
    needsElectricity: !!existing?.needsElectricity,
    needsWater: !!existing?.needsWater,
    spaceSize: existing?.spaceSize || '',
    websiteUrl: commerce.site,
    companyName: commerce.nom,
    description: commerce.description,
    socials: socials || existing?.socials || '',
    phone: commerce.telephone || existing?.phone,
    hasParticipatedBefore: commerce.hasParticipatedBefore ?? existing?.hasParticipatedBefore,
    teamSize: commerce.teamSize || existing?.teamSize,
    familyVolunteerInterest: commerce.familyVolunteerInterest ? 'Oui' : (existing?.familyVolunteerInterest || ''),
    logoUrl: commerce.logoUrl || existing?.logoUrl,
    mainPhotoUrl: commerce.mainPhotoUrl || commerce.photos?.[0] || existing?.mainPhotoUrl,
    regionOfOrigin: commerce.regionOfOrigin || commerce.ville || existing?.regionOfOrigin || '',
    firstTimeSource: commerce.firstTimeSource || existing?.firstTimeSource,
    otherQuestions: commerce.otherQuestions || existing?.otherQuestions,
    status: (existing?.status || 'pending') as VendorStatus,
    year,
    createdAt: existing?.createdAt,
  };
  await upsertVendorApp(app);
  await addUserFlag(commerce.uid, 'vendor').catch(() => {});
  return year;
}
