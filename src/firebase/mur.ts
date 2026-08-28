// ─── Le mur social ───────────────────────────────────────────────────
// Alex, 2026-08-27 : « un fil d'actualité, un peu comme sur Facebook ».
// Chaque membre poste un texte et, s'il veut, une photo. Le mur montre
// tout le monde en ordre chronologique, et les annonces du festival s'y
// glissent aussi (la redondance est voulue : tout le monde ne lit pas
// le babillard).
//
//   /mur/{postId} { uid, nom, avatarUrl?, avatarHue, texte, photoUrl?,
//                   photoChemin?, pour, contre, score, chaleur,
//                   nbCommentaires, epingle?, epingleLe?, partage?, creeLe }
//   Storage : mur/{uid}/{postId}.webp
//
// Alex, 2026-08-28 : voter, commenter et partager, à la façon de Reddit
// plutôt que de Facebook. LE CLIENT N'ÉCRIT JAMAIS UN COMPTEUR : il
// écrit seulement son propre vote, et une fonction serveur (Admin SDK,
// qui contourne les règles) recalcule pour/contre/score/chaleur à
// chaque vote — voir murVoteBillet, murVoteCommentaire et
// murCommentaireCompte dans functions/index.js.
//
//   mur/{postId}/votes/{voterUid}                    { valeur, nom, majLe }
//   mur/{postId}/commentaires/{cid}                  { uid, nom, texte, pour,
//                                                       contre, score, chaleur,
//                                                       creeLe, ... }
//   mur/{postId}/commentaires/{cid}/votes/{voterUid}  { valeur, nom, majLe }

import {
  collection, doc, setDoc, updateDoc, deleteDoc, getDocs, onSnapshot, query, orderBy, limit as fsLimit,
  where, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { versWebp } from './photosPubliques';

// Alex, 2026-08-27 : chaque billet porte un genre. « offre » (service,
// covoiturage, partage) et « demande » (garde de chien, coup de main)
// vont dans la colonne de droite; « billet » est tout le reste.
export type GenrePost = 'billet' | 'offre' | 'demande';

/** Ce que porte un billet qui rediffuse quelque chose d'autre sur le
 *  mur de son auteur : un billet, une page du site, ou un tirage de
 *  tarot capturé (Alex, 2026-08-28). */
export interface Partage {
  genre: 'billet' | 'page' | 'tarot';
  postId?: string;
  auteurNom?: string;
  extrait?: string;
  url?: string;
  titre?: string;
  imageUrl?: string;
}

export interface PostMur {
  id: string;
  uid: string;
  nom: string;
  avatarUrl?: string;
  avatarHue?: number;
  texte: string;
  genre?: GenrePost;
  photoUrl?: string;
  photoChemin?: string;
  /** Présent seulement sur un billet posté depuis le mur d'une guilde
   *  (Alex, 2026-08-27) — voir src/firebase/guildes.ts. */
  guildeId?: string;
  /** Porte le badge Admin · Modérateur. */
  moderateur?: boolean;
  /** La coche bleue vérifiée, recopiée depuis la fiche au moment de la
   *  publication (Alex, 2026-08-28). */
  verifie?: boolean;
  /** Le vote façon Reddit (Alex, 2026-08-28). Écrits UNIQUEMENT par les
   *  fonctions serveur — jamais directement par le client. */
  pour?: number;
  contre?: number;
  score?: number;
  chaleur?: number;
  nbCommentaires?: number;
  /** Mis de l'avant par l'équipe (mur général) ou l'admin de la guilde
   *  (mur de la guilde) — voir epinglerBillet(). */
  epingle?: boolean;
  epingleLe?: Timestamp | null;
  partage?: Partage;
  creeLe: Timestamp | null;
}

const COL = 'mur';
export const LONGUEUR_MAX_POST = 2000;
export const LONGUEUR_MAX_COMMENTAIRE = 1000;

// ── La chaleur : le ballon d'hélium ─────────────────────────────────
// Formule « hot » de Reddit, FIGÉE au moment de l'écriture : elle ne
// se recalcule jamais à partir de « maintenant », seulement à partir
// du score et de l'heure de création du billet. C'est ce qui fait
// qu'un billet neuf sans aucun vote flotte déjà au-dessus d'un vieux
// billet sans vote (le terme de temps grandit avec le calendrier, pas
// avec l'horloge courante), et que chaque vote le fait ensuite monter
// ou descendre par-dessus ce socle.
//
// DEMI_VIE = 45 000 secondes ≈ 12,5 heures : dix votes valent à peu
// près une demi-journée de fraîcheur. Alex peut l'ajuster ici (plus
// petit = les votes pèsent plus lourd face au temps qui passe).
export const DEMI_VIE_CHALEUR = 45_000;

/** Jumeau exact de la formule dans functions/index.js et dans
 *  tools/migrer-chaleur.mjs : si l'une des trois change, les deux
 *  autres doivent suivre. */
export function calculerChaleur(score: number, creeLeMs: number): number {
  const secondes = creeLeMs / 1000;
  return Math.log10(Math.max(Math.abs(score), 1)) * Math.sign(score) + secondes / DEMI_VIE_CHALEUR;
}

export async function publierSurLeMur(opts: {
  uid: string; nom: string; avatarUrl?: string; avatarHue?: number; texte: string; photo?: File;
  /** Billet d'un membre de l'équipe (badge Admin · Modérateur). */
  moderateur?: boolean;
  /** Recopié depuis la fiche : la coche bleue vérifiée. */
  verifie?: boolean;
  /** Poster sur le mur d'une guilde plutôt que sur le mur général. */
  guildeId?: string;
  genre?: GenrePost;
  /** Rediffuse un billet, une page ou un tirage de tarot. */
  partage?: Partage;
}): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const texte = opts.texte.trim().slice(0, LONGUEUR_MAX_POST);
  if (!texte && !opts.photo && !opts.partage) throw new Error('Rien à publier.');
  const id = doc(collection(db, COL)).id;
  let photoUrl: string | undefined; let photoChemin: string | undefined;
  if (opts.photo && storage) {
    const { blob } = await versWebp(opts.photo, 1600, 0.85);
    photoChemin = `mur/${opts.uid}/${id}.webp`;
    const r = ref(storage, photoChemin);
    await uploadBytes(r, blob, { contentType: 'image/webp' });
    photoUrl = await getDownloadURL(r);
  }
  await setDoc(doc(db, COL, id), {
    uid: opts.uid, nom: opts.nom,
    ...(opts.avatarUrl ? { avatarUrl: opts.avatarUrl } : {}),
    avatarHue: opts.avatarHue ?? 0,
    texte,
    genre: opts.genre || 'billet',
    ...(photoUrl ? { photoUrl, photoChemin } : {}),
    // null (et non absent) : la règle et la requête du mur général filtrent dessus.
    guildeId: opts.guildeId || null,
    ...(opts.moderateur ? { moderateur: true } : {}),
    ...(opts.verifie ? { verifie: true } : {}),
    ...(opts.partage ? { partage: opts.partage } : {}),
    // Le ballon d'hélium part vide : la fonction serveur seule le gonfle.
    pour: 0, contre: 0, score: 0, nbCommentaires: 0,
    chaleur: calculerChaleur(0, Date.now()),
    creeLe: serverTimestamp(),
  });
  return id;
}

/** Publie un billet qui rediffuse quelque chose sur le fil de la
 *  personne connectée — un billet d'un autre membre, une page du site,
 *  ou un tirage de tarot capturé en image (Alex, 2026-08-28). */
export async function partagerSurMonFil(opts: {
  uid: string; nom: string; avatarUrl?: string; avatarHue?: number; texte: string; photo?: File; partage: Partage;
}): Promise<string> {
  return publierSurLeMur(opts);
}

export async function retirerDuMur(post: PostMur): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, COL, post.id));
  if (post.photoChemin && storage) await deleteObject(ref(storage, post.photoChemin)).catch(() => {});
}

/** Épingle ou décroche un billet en tête de son fil — l'équipe sur le
 *  mur général, l'admin de la guilde sur le mur de sa guilde (voir
 *  firestore.rules, seule mise à jour permise sur un billet). */
export async function epinglerBillet(post: PostMur, epingle: boolean): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, post.id), { epingle, epingleLe: epingle ? serverTimestamp() : null });
}

const lire = (d: { id: string; data: () => Record<string, unknown> }): PostMur =>
  ({ id: d.id, ...(d.data() as Omit<PostMur, 'id'>) });

/** Les plus chauds d'abord, sauf les épinglés qui montent en tête,
 *  groupés entre eux par date d'épinglage décroissante — le reste
 *  garde l'ordre reçu (déjà trié par chaleur, voir parChaleur). */
function avecEpingles<T extends { epingle?: boolean; epingleLe?: Timestamp | null }>(lignes: T[]): T[] {
  const epingles = lignes.filter((l) => l.epingle)
    .sort((a, b) => (b.epingleLe?.toMillis?.() ?? 0) - (a.epingleLe?.toMillis?.() ?? 0));
  const reste = lignes.filter((l) => !l.epingle);
  return [...epingles, ...reste];
}

const parChaleur = <T extends { chaleur?: number }>(a: T, b: T) => (b.chaleur ?? 0) - (a.chaleur ?? 0);

/** Tout le mur, du plus chaud au plus froid (le ballon d'hélium — voir
 *  calculerChaleur), les épinglés en tête. Les billets d'une guilde
 *  n'y paraissent pas, ils restent sur leur propre mur. */
export function suivreLeMur(cb: (posts: PostMur[]) => void, max = 100): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COL), where('guildeId', '==', null), orderBy('chaleur', 'desc'), fsLimit(max));
  return onSnapshot(q, (snap) => cb(avecEpingles(snap.docs.map(lire).filter((p) => !p.guildeId))), () => cb([]));
}

/** Le mur d'une seule guilde. */
export function suivreLeMurDeGuilde(guildeId: string, cb: (posts: PostMur[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COL), where('guildeId', '==', guildeId));
  return onSnapshot(q, (snap) => cb(avecEpingles(snap.docs.map(lire).sort(parChaleur))), () => cb([]));
}

/** Le fil d'une personne. */
export function suivreLeFilDe(uid: string, cb: (posts: PostMur[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COL), where('uid', '==', uid), where('guildeId', '==', null));
  return onSnapshot(q, (snap) => cb(avecEpingles(snap.docs.map(lire).sort(parChaleur))), () => cb([]));
}

// ── Voter sur un billet ─────────────────────────────────────────────

/** 1 = pour, -1 = contre, 0 = retire le vote. */
export async function voter(postId: string, uid: string, nom: string, valeur: 1 | -1 | 0): Promise<void> {
  if (!db) return;
  const r = doc(db, COL, postId, 'votes', uid);
  if (valeur === 0) { await deleteDoc(r); return; }
  await setDoc(r, { valeur, nom, majLe: serverTimestamp() });
}

export function suivreMonVote(postId: string, uid: string, cb: (valeur: 1 | -1 | 0) => void): () => void {
  if (!db) { cb(0); return () => {}; }
  return onSnapshot(doc(db, COL, postId, 'votes', uid), (snap) => {
    const v = snap.data()?.valeur;
    cb(v === 1 || v === -1 ? v : 0);
  }, () => cb(0));
}

/** Qui a voté pour ou contre, pour la bulle au survol : jusqu'à vingt
 *  noms, chargés à la demande. */
export async function listerVotes(postId: string, valeur: 1 | -1): Promise<string[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, COL, postId, 'votes'), where('valeur', '==', valeur), fsLimit(20)));
  return snap.docs.map((d) => (d.data().nom as string) || '?');
}

// ── Les commentaires ─────────────────────────────────────────────────

export interface CommentaireMur {
  id: string;
  uid: string;
  nom: string;
  avatarUrl?: string;
  avatarHue?: number;
  texte: string;
  verifie?: boolean;
  pour?: number;
  contre?: number;
  score?: number;
  chaleur?: number;
  creeLe: Timestamp | null;
}

const lireCommentaire = (d: { id: string; data: () => Record<string, unknown> }): CommentaireMur =>
  ({ id: d.id, ...(d.data() as Omit<CommentaireMur, 'id'>) });

export async function publierCommentaire(postId: string, opts: {
  uid: string; nom: string; avatarUrl?: string; avatarHue?: number; texte: string; verifie?: boolean;
}): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const texte = opts.texte.trim().slice(0, LONGUEUR_MAX_COMMENTAIRE);
  if (!texte) throw new Error('Rien à publier.');
  const id = doc(collection(db, COL, postId, 'commentaires')).id;
  await setDoc(doc(db, COL, postId, 'commentaires', id), {
    uid: opts.uid, nom: opts.nom,
    ...(opts.avatarUrl ? { avatarUrl: opts.avatarUrl } : {}),
    avatarHue: opts.avatarHue ?? 0,
    texte,
    ...(opts.verifie ? { verifie: true } : {}),
    pour: 0, contre: 0, score: 0,
    chaleur: calculerChaleur(0, Date.now()),
    creeLe: serverTimestamp(),
  });
  return id;
}

/** Triés par chaleur décroissante, côté client (pas d'index de plus). */
export function suivreCommentaires(postId: string, cb: (commentaires: CommentaireMur[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(collection(db, COL, postId, 'commentaires'), (snap) => {
    cb(snap.docs.map(lireCommentaire).sort(parChaleur));
  }, () => cb([]));
}

export async function retirerCommentaire(postId: string, cid: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, COL, postId, 'commentaires', cid));
}

export async function voterCommentaire(postId: string, cid: string, uid: string, nom: string, valeur: 1 | -1 | 0): Promise<void> {
  if (!db) return;
  const r = doc(db, COL, postId, 'commentaires', cid, 'votes', uid);
  if (valeur === 0) { await deleteDoc(r); return; }
  await setDoc(r, { valeur, nom, majLe: serverTimestamp() });
}

export function suivreMonVoteCommentaire(postId: string, cid: string, uid: string, cb: (valeur: 1 | -1 | 0) => void): () => void {
  if (!db) { cb(0); return () => {}; }
  return onSnapshot(doc(db, COL, postId, 'commentaires', cid, 'votes', uid), (snap) => {
    const v = snap.data()?.valeur;
    cb(v === 1 || v === -1 ? v : 0);
  }, () => cb(0));
}
