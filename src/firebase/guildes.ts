// ─── Les guildes ───────────────────────────────────────────────────
// Alex, 2026-08-27 : des sous-groupes que n'importe quel membre de
// l'Ordre peut fonder, comme les groupes Facebook. Le fondateur en
// devient l'unique admin; les autres demandent à joindre, et l'admin
// de la guilde accepte ou refuse. L'équipe du festival garde la main
// pour modifier ou détruire n'importe quelle guilde depuis l'espace
// admin.
//
//   /guildes/{id} { nom, description, blason?, creePar, admins: string[],
//                    membres: string[], demandes: string[], nbMembres,
//                    creeLe, maj }
//
// Storage : guildes/{id}/blason.webp, guildes/{id}/banniere.webp et,
// depuis le 6 septembre 2026, guildes/{id}/monnaie.webp (la pièce).

import {
  collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot,
  query, orderBy, where, limit, arrayUnion, arrayRemove, increment, serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref as refStockage, uploadBytes, getDownloadURL } from 'firebase/storage';
import { versWebp } from './photosPubliques';

// Alex, 2026-08-28 : « ils peuvent choisir si c'est une guilde, un clan
// ou d'autres formulations; c'est la même chose, seulement tagué
// différemment ». Les vikings fonderont des clans, les chevaliers des
// guildes, et le reste suit.
export type FormeGuilde = 'guilde' | 'clan' | 'compagnie' | 'confrerie' | 'troupe' | 'maisonnee' | 'ordre';

export const FORMES_GUILDE: Array<{ id: FormeGuilde; FR: string; EN: string; articleFR: string }> = [
  { id: 'guilde',    FR: 'Guilde',     EN: 'Guild',       articleFR: 'une' },
  { id: 'clan',      FR: 'Clan',       EN: 'Clan',        articleFR: 'un'  },
  { id: 'compagnie', FR: 'Compagnie',  EN: 'Company',     articleFR: 'une' },
  { id: 'confrerie', FR: 'Confrérie',  EN: 'Brotherhood', articleFR: 'une' },
  { id: 'troupe',    FR: 'Troupe',     EN: 'Troupe',      articleFR: 'une' },
  { id: 'maisonnee', FR: 'Maisonnée',  EN: 'Household',   articleFR: 'une' },
  { id: 'ordre',     FR: 'Ordre',      EN: 'Order',       articleFR: 'un'  },
];

/** Le mot que cette guilde s'est donné, dans la langue de la page. */
export const motDeLaForme = (forme: FormeGuilde | undefined, lang: 'FR' | 'EN'): string => {
  const f = FORMES_GUILDE.find((x) => x.id === (forme || 'guilde')) || FORMES_GUILDE[0];
  return lang === 'FR' ? f.FR : f.EN;
};

// Le titre que porte celui qui mène le groupe. Un clan a son jarl, une
// confrérie son prieur, et la même personne s'appelle « Maître » dans
// une guilde (contrat CLAN-MONNAIE-CONTRAT.md, 6 septembre 2026).
const MOTS_DU_CHEF: Record<FormeGuilde, { FR: string; EN: string }> = {
  guilde:    { FR: 'Maître',         EN: 'Master' },
  clan:      { FR: 'Jarl',           EN: 'Jarl' },
  compagnie: { FR: 'Capitaine',      EN: 'Captain' },
  confrerie: { FR: 'Prieur',         EN: 'Prior' },
  troupe:    { FR: 'Chef de troupe', EN: 'Troupe leader' },
  maisonnee: { FR: 'Seigneur',       EN: 'Lord' },
  ordre:     { FR: 'Grand Maître',   EN: 'Grand Master' },
};

export const motDuChef = (forme: FormeGuilde | undefined, lang: 'FR' | 'EN'): string =>
  MOTS_DU_CHEF[forme || 'guilde'][lang];

/** La monnaie interne d'une guilde. Elle ne vaut que dans la guilde. */
export interface MonnaieGuilde {
  nom: string;
  /** Deux à quatre lettres, en majuscules. */
  sigle: string;
  /** Un emoji ou un caractère; le serveur pose ◎ par défaut. */
  glyphe: string;
  /** La pièce dessinée (guildes/{id}/monnaie.webp). Sans elle, la pièce
   *  par défaut du site; le glyphe ne sert plus que de repli. */
  imageUrl?: string;
}

/** La pièce que portent les guildes qui n'ont pas encore la leur. */
export const PIECE_DEFAUT = '/guildes/piece-defaut.webp';

export const imageMonnaie = (g: Pick<Guilde, 'monnaie'>): string =>
  g.monnaie?.imageUrl || PIECE_DEFAUT;

/** Ce que le serveur pose à la fondation quand personne n'a nommé la
 *  monnaie : dernier mot du nom + « Coin », trois lettres, ◎. Sert de
 *  repli client pour les groupes fondés avant le 6 septembre 2026. */
export function monnaieParDefaut(nom: string): MonnaieGuilde {
  const dernier = (nom || '').trim().split(/\s+/).pop() || 'Guilde';
  return { nom: `${dernier} Coin`, sigle: dernier.slice(0, 3).toUpperCase(), glyphe: '◎' };
}

/** Un jour du cours de la monnaie, tel que le serveur l'archive. */
export interface PointTaux {
  jour: string;
  taux: number;
  nbActifs: number;
}

/** Un fondateur annoncé qui n'a pas encore de compte sur le site. */
export interface FondateurAttendu {
  nom: string;
  chef: boolean;
  uid?: string;
}

export interface Guilde {
  id: string;
  nom: string;
  description: string;
  /** Le mot choisi à la fondation; absent veut dire « guilde ». */
  forme?: FormeGuilde;
  /** L'adresse du groupe : festivalmedievaldemontpellier.org/{slug}. */
  slug?: string;
  blason?: string;
  /** La bannière large de la guilde (guildes/{id}/banniere.webp). */
  banniereUrl?: string;
  creePar: string;
  admins: string[];
  membres: string[];
  demandes: string[];
  nbMembres: number;
  /** Les chefs la renomment; le serveur la pose à la fondation. */
  monnaie?: MonnaieGuilde;
  /** Ce que vaut une pièce en Montpellois. Serveur seulement. */
  taux?: number;
  nbActifs?: number;
  tauxHistorique?: PointTaux[];
  /** Les pièces du trésor commun. Serveur seulement. */
  tresor?: number;
  /** Huit caractères, posés par le serveur. Serveur seulement. */
  codeInvitation?: string;
  membresFondateurs?: FondateurAttendu[];
  creeLe: Timestamp | null;
  maj: Timestamp | null;
}

/** Le nom de la monnaie dans la langue de la page. Le serveur pose
 *  « Vikingar Coin »; en français la même monnaie se lit « Pièce
 *  Vikingar », sans qu'il faille garder deux champs. */
export function nomMonnaie(g: Pick<Guilde, 'nom' | 'monnaie'>, lang: 'FR' | 'EN'): string {
  const nom = g.monnaie?.nom || `${(g.nom || '').trim().split(/\s+/).pop() || 'Guilde'} Coin`;
  if (lang === 'FR' && / Coin$/.test(nom)) return `Pièce ${nom.slice(0, -5)}`;
  return nom;
}

/** Un montant de pièces, avec le glyphe de la guilde. */
export function formatPieces(n: number, g: Pick<Guilde, 'monnaie'>): string {
  return `${Math.round(n)} ${g.monnaie?.glyphe || '◎'}`;
}

// ─── L'adresse du groupe ─────────────────────────────────────────────
// Alex, 6 septembre 2026 : « all under /groupnameclan ». Le nom perd
// ses accents, ses espaces et sa ponctuation, puis la forme se colle au
// bout : « Vestrvegir Vikingar » fondé en clan donne
// vestrvegirvikingarclan.
export function slugDeGuilde(nom: string, forme: FormeGuilde | undefined): string {
  const base = (nom || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return `${base}${forme || 'guilde'}`.slice(0, 80);
}

/** Les adresses que le site s'est déjà réservées : le premier segment
 *  de chaque route de App.tsx, plus les slugs des piliers. Une guilde
 *  qui en prendrait une éclipserait une page du festival.
 *
 *  À TENIR À JOUR avec App.tsx : toute nouvelle route de premier niveau
 *  s'ajoute ici le jour où elle est ajoutée là-bas. La liste se
 *  reconstruit en une commande :
 *    grep -o 'path="/[^"]*"' src/App.tsx | sed 's|path="/||;s|".*||' | cut -d/ -f1 | sort -u
 */
export const SLUGS_RESERVES: readonly string[] = [
  'accueil', 'activites', 'admin', 'alliance', 'apprendre', 'archives',
  'babillard', 'backuppage', 'banquet', 'benevole', 'benevoles', 'billets',
  'boissons', 'boutique', 'chantier', 'chevaux', 'commanditaires',
  'communaute', 'compte', 'contact', 'defi', 'en', 'espace-benevole',
  'festival-medieval-de-montpellier', 'groupe', 'groupes', 'guildes',
  'hebergement', 'histoire', 'horaire', 'jeunesse', 'jeux', 'jeux-en-ligne',
  'labo-titre', 'marche', 'mariages', 'messages', 'mur', 'musique',
  'nourriture', 'ordre', 'partenaires', 'partenaires-2027', 'petite-monnaie',
  'politique-de-confidentialite', 'press-kit', 'presse', 'presskit', 'profil',
  'propositioncatest', 'ressources', 'signer-cuisine', 'souk', 'videos',
  'william',
];

export const SLUG_MIN = 3;
export const SLUG_MAX = 80;

/** Vrai si l'adresse est libre. `sauf` laisse un chef réenregistrer la
 *  sienne sans se cogner à lui-même. */
export async function slugDisponible(slug: string, sauf?: string): Promise<boolean> {
  if (!db) return false;
  if (!new RegExp(`^[a-z0-9-]{${SLUG_MIN},${SLUG_MAX}}$`).test(slug)) return false;
  if (SLUGS_RESERVES.includes(slug)) return false;
  const snap = await getDocs(query(collection(db, COL), where('slug', '==', slug)));
  return snap.docs.every((d) => d.id === sauf);
}

export async function lireGuildeParSlug(slug: string): Promise<Guilde | null> {
  if (!db) return null;
  const snap = await getDocs(query(collection(db, COL), where('slug', '==', slug), limit(1)));
  return snap.empty ? null : lire(snap.docs[0]);
}

// ─── La marque de passage ────────────────────────────────────────────
// Le taux d'une guilde suit le nombre de ses membres actifs, et un
// membre est actif s'il s'est montré dans les trente derniers jours.
// Une écriture par jour et par navigateur suffit à le dire.
const CLE_VU = 'fmm:vuLe';

export async function marquerVuAujourdhui(uid: string): Promise<void> {
  if (!db) return;
  const jour = new Date().toISOString().slice(0, 10);
  try {
    if (window.localStorage.getItem(CLE_VU) === jour) return;
  } catch { /* navigation privée : on écrit, tant pis pour l'économie */ }
  await setDoc(doc(db, 'membres', uid), { vuLe: serverTimestamp() }, { merge: true });
  try { window.localStorage.setItem(CLE_VU, jour); } catch { /* idem */ }
}

const COL = 'guildes';
export const LONGUEUR_NOM_MIN = 2;
export const LONGUEUR_NOM_MAX = 60;
export const LONGUEUR_DESCRIPTION_MAX = 1000;

const lire = (d: { id: string; data: () => Record<string, unknown> }): Guilde =>
  ({ id: d.id, ...(d.data() as Omit<Guilde, 'id'>) });

export async function creerGuilde(opts: { uid: string; nom: string; description: string; forme?: FormeGuilde }): Promise<{ id: string; slug: string }> {
  if (!db) throw new Error('Firestore non configuré');
  const nom = opts.nom.trim().slice(0, LONGUEUR_NOM_MAX);
  if (nom.length < LONGUEUR_NOM_MIN) throw new Error('Le nom de la guilde est trop court.');
  const description = opts.description.trim().slice(0, LONGUEUR_DESCRIPTION_MAX);
  // L'adresse se vérifie avant l'écriture : deux groupes au même nom
  // se voleraient la page l'un à l'autre.
  const slug = slugDeGuilde(nom, opts.forme);
  if (!(await slugDisponible(slug))) {
    throw new Error('Cette adresse est déjà prise. Changez un mot du nom.');
  }
  const id = doc(collection(db, COL)).id;
  await setDoc(doc(db, COL, id), {
    nom, description, slug,
    forme: opts.forme || 'guilde',
    creePar: opts.uid,
    admins: [opts.uid],
    membres: [opts.uid],
    demandes: [],
    nbMembres: 1,
    creeLe: serverTimestamp(),
    maj: serverTimestamp(),
  });
  return { id, slug };
}

/** Toutes les guildes, les plus peuplées d'abord. */
export function suivreGuildes(cb: (guildes: Guilde[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COL), orderBy('nbMembres', 'desc'), orderBy('nom'));
  return onSnapshot(q, (snap) => cb(snap.docs.map(lire)), () => cb([]));
}

export async function lireGuilde(id: string): Promise<Guilde | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? lire(snap) : null;
}

export function suivreGuilde(id: string, cb: (g: Guilde | null) => void): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(doc(db, COL, id), (snap) => cb(snap.exists() ? lire(snap) : null), () => cb(null));
}

/** Demander à joindre : on s'ajoute soi-même à la file d'attente. */
export async function demanderAdhesion(id: string, uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, id), { demandes: arrayUnion(uid), maj: serverTimestamp() });
}

/** Retirer sa propre demande. */
export async function retirerDemande(id: string, uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, id), { demandes: arrayRemove(uid), maj: serverTimestamp() });
}

/** L'admin de la guilde accepte une demande : elle passe à la liste des membres. */
export async function accepterMembre(id: string, uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, id), {
    demandes: arrayRemove(uid),
    membres: arrayUnion(uid),
    nbMembres: increment(1),
    maj: serverTimestamp(),
  });
}

export async function refuserMembre(id: string, uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, id), { demandes: arrayRemove(uid), maj: serverTimestamp() });
}

/** Un chef (ou l'équipe) renvoie un membre : il sort des membres et
 *  des chefs d'un coup. Jamais soi-même, jamais le fondateur (addendum
 *  du 6 septembre 2026, ordre 7; la règle Firestore refuse aussi). */
export async function retirerMembre(g: Pick<Guilde, 'id' | 'creePar'>, uid: string, parUid: string): Promise<void> {
  if (!db) return;
  if (uid === parUid) throw new Error('Pour partir, passez par « Quitter ».');
  if (uid === g.creePar) throw new Error('Le fondateur ne se renvoie pas.');
  await updateDoc(doc(db, COL, g.id), {
    membres: arrayRemove(uid),
    admins: arrayRemove(uid),
    nbMembres: increment(-1),
    maj: serverTimestamp(),
  });
}

/** Un chef en nomme un autre parmi les membres. */
export async function nommerChef(id: string, uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, id), { admins: arrayUnion(uid), maj: serverTimestamp() });
}

/** Un chef rend son titre à un autre chef, qui reste membre. */
export async function retirerChef(id: string, uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, id), { admins: arrayRemove(uid), maj: serverTimestamp() });
}

/** Quitter une guilde : on se retire soi-même des membres (et des
 *  admins, si on en était). */
export async function quitterGuilde(id: string, uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, id), {
    membres: arrayRemove(uid),
    admins: arrayRemove(uid),
    nbMembres: increment(-1),
    maj: serverTimestamp(),
  });
}

/** Réservé à l'équipe ou à un admin de la guilde (voir firestore.rules).
 *
 *  Les champs autres que le nom et la description ne partaient pas :
 *  `changerBlason` et `changerBanniereGuilde` posaient l'image dans le
 *  stockage, puis n'écrivaient que `maj`, et le portrait de la guilde
 *  restait vide. Même chose pour la forme choisie dans le panneau
 *  d'édition. La boucle ci-dessous répare les trois d'un coup. */
export async function modifierGuilde(id: string, patch: {
  nom?: string; description?: string; blason?: string; banniereUrl?: string;
  forme?: FormeGuilde; slug?: string; monnaie?: MonnaieGuilde;
  membresFondateurs?: FondateurAttendu[];
}): Promise<void> {
  if (!db) return;
  const data: Record<string, unknown> = { maj: serverTimestamp() };
  if (patch.nom !== undefined) data.nom = patch.nom.trim().slice(0, LONGUEUR_NOM_MAX);
  if (patch.description !== undefined) data.description = patch.description.trim().slice(0, LONGUEUR_DESCRIPTION_MAX);
  for (const cle of ['forme', 'blason', 'banniereUrl', 'slug', 'monnaie', 'membresFondateurs'] as const) {
    if (patch[cle] !== undefined) data[cle] = patch[cle];
  }
  await updateDoc(doc(db, COL, id), data as never);
}

/** Réservé à l'équipe ou à un admin de la guilde. */
export async function supprimerGuilde(id: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, COL, id));
}

/** Les guildes dont uid est membre. */
export async function listerMesGuildes(uid: string): Promise<Guilde[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, COL), where('membres', 'array-contains', uid)));
  return snap.docs.map(lire);
}

/** L'admin de la guilde (ou l'équipe) change le blason : la photo est
 *  redimensionnée côté navigateur et rangée sous guildes/{id}/blason.webp
 *  (Alex, 2026-08-28 : « changer la photo de guilde »). */
/** La bannière large de la guilde, posée par un de ses admins. */
export async function changerBanniereGuilde(id: string, fichier: File): Promise<string> {
  if (!db || !storage) throw new Error('Le stockage est indisponible pour le moment.');
  const { blob } = await versWebp(fichier, 1800, 0.85);
  const r = refStockage(storage, `guildes/${id}/banniere.webp`);
  await uploadBytes(r, blob, { contentType: 'image/webp' });
  const url = `${await getDownloadURL(r)}&v=${Date.now()}`;
  await modifierGuilde(id, { banniereUrl: url });
  return url;
}

export async function changerBlason(id: string, fichier: File): Promise<string> {
  if (!db || !storage) throw new Error('Le stockage est indisponible pour le moment.');
  const { blob } = await versWebp(fichier, 1200, 0.85);
  const r = refStockage(storage, `guildes/${id}/blason.webp`);
  await uploadBytes(r, blob, { contentType: 'image/webp' });
  const url = `${await getDownloadURL(r)}&v=${Date.now()}`;
  await modifierGuilde(id, { blason: url });
  return url;
}
