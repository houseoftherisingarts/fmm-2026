// ─── Les badges du festival ─────────────────────────────────────────
// Alex, 2026-08-23 : le site se collectionne. On gagne des badges en
// visitant, en jouant, en achetant, en s'engageant; les badges se
// rangent en collections; une collection complète donne un prix, et le
// site complet donne le gros lot.
//
// Les prix ne sont pas encore décidés : on annonce donc leur TAILLE
// (petit, moyen, grand) selon la difficulté, jamais leur contenu.
//
//   /badges/{uid}   { obtenus: { [badgeId]: Timestamp } }
//
// Quelqu'un qui n'est pas connecté gagne quand même : le badge dort
// dans le navigateur et se réclame à la première connexion.

import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type TaillePrix = 'petit' | 'moyen' | 'grand';

export interface Badge {
  id: string;
  nomFR: string; nomEN: string;
  texteFR: string; texteEN: string;
  /** Le glyphe de repli, si l'image ne charge pas. */
  glyphe: string;
}

export interface Collection {
  id: string;
  nomFR: string; nomEN: string;
  prix: TaillePrix;
  badges: Badge[];
}

export const COLLECTIONS: Collection[] = [
  {
    id: 'explorateur',
    nomFR: 'Les chemins du festival', nomEN: 'The festival paths',
    prix: 'petit',
    badges: [
      { id: 'visiteur',   glyphe: '⚑', nomFR: 'Visiteur averti',  nomEN: 'Wary visitor',
        texteFR: 'Vous avez poussé la porte du site.', texteEN: 'You pushed the door open.' },
      { id: 'programme',  glyphe: '☰', nomFR: 'Lecteur du programme', nomEN: 'Programme reader',
        texteFR: 'Vous avez lu la programmation en entier.', texteEN: 'You read the whole programme.' },
      { id: 'histoire',   glyphe: '✒', nomFR: 'Fouilleur d’archives', nomEN: 'Archive digger',
        texteFR: 'Vous êtes descendu dans la section Histoire.', texteEN: 'You went down into the History section.' },
      { id: 'marche',     glyphe: '⚖', nomFR: 'Flâneur du marché', nomEN: 'Market stroller',
        texteFR: 'Vous avez fait le tour des étals.', texteEN: 'You walked the stalls.' },
      { id: 'village',    glyphe: '☘', nomFR: 'Ami du village',    nomEN: 'Friend of the village',
        texteFR: 'Vous avez visité le village gustatif et la jeunesse.', texteEN: 'You visited the food village and the youth camp.' },
    ],
  },
  {
    id: 'joueur',
    nomFR: 'La table de jeux', nomEN: 'The games table',
    prix: 'moyen',
    badges: [
      { id: 'petit-joueur', glyphe: '⚀', nomFR: 'Petit joueur',   nomEN: 'Small player',
        texteFR: 'Vous avez joué à un des jeux du festival.', texteEN: 'You played one of the festival games.' },
      { id: 'joueur',       glyphe: '⚅', nomFR: 'Joueur',         nomEN: 'Player',
        texteFR: 'Vous avez joué à tous les jeux ouverts.', texteEN: 'You played every open game.' },
      { id: 'tafl',         glyphe: '♜', nomFR: 'Roi en fuite',   nomEN: 'King on the run',
        texteFR: 'Vous avez mené une partie de tafl jusqu’au bout.', texteEN: 'You saw a tafl game through.' },
      { id: 'tarot',        glyphe: '✶', nomFR: 'Croix celtique', nomEN: 'Celtic cross',
        texteFR: 'Vous avez tiré la croix celtique en entier.', texteEN: 'You laid the full Celtic cross.' },
      { id: 'des',          glyphe: '⚄', nomFR: 'Beau menteur',   nomEN: 'Fine liar',
        texteFR: 'Vous avez gagné une manche aux dés du menteur.', texteEN: 'You won a round at liar’s dice.' },
    ],
  },
  {
    id: 'table',
    nomFR: 'La table du seigneur', nomEN: 'The lord’s table',
    prix: 'moyen',
    badges: [
      { id: 'banquet',  glyphe: '♛', nomFR: 'Convive du banquet', nomEN: 'Banquet guest',
        texteFR: 'Vous avez réservé une place au banquet du Prince William.', texteEN: 'You booked a seat at the Prince William banquet.' },
      { id: 'livre',    glyphe: '✎', nomFR: 'Cuisinier de route', nomEN: 'Road cook',
        texteFR: 'Vous avez pris le livre de recettes du festival.', texteEN: 'You picked up the festival recipe book.' },
      { id: 'billets',  glyphe: '✦', nomFR: 'Porteur de billet',  nomEN: 'Ticket holder',
        texteFR: 'Vous avez pris vos billets pour l’édition.', texteEN: 'You got your tickets for the edition.' },
    ],
  },
  {
    id: 'maisonnee',
    nomFR: 'La maisonnée', nomEN: 'The household',
    prix: 'grand',
    badges: [
      { id: 'benevole',      glyphe: '✚', nomFR: 'Bénévole',        nomEN: 'Volunteer',
        texteFR: 'Vous avez offert vos bras au festival.', texteEN: 'You offered your arms to the festival.' },
      { id: 'kiosque',       glyphe: '⌂', nomFR: 'Tenancier de kiosque', nomEN: 'Stall keeper',
        texteFR: 'Vous avez demandé un kiosque au marché.', texteEN: 'You asked for a stall at the market.' },
      { id: 'commanditaire', glyphe: '❖', nomFR: 'Commanditaire',   nomEN: 'Sponsor',
        texteFR: 'Vous soutenez le festival de votre nom.', texteEN: 'You back the festival with your name.' },
      { id: 'membre',        glyphe: '♁', nomFR: 'Membre de la table', nomEN: 'Member of the table',
        texteFR: 'Vous avez créé votre compte du festival.', texteEN: 'You created your festival account.' },
      { id: 'photographe',   glyphe: '◎', nomFR: 'Photographe',     nomEN: 'Photographer',
        texteFR: 'Vous avez envoyé votre première photo du festival.', texteEN: 'You sent your first festival photo.' },
    ],
  },
  {
    id: 'babillard',
    nomFR: 'Le babillard', nomEN: 'The notice board',
    prix: 'moyen',
    badges: [
      { id: 'billet-1', glyphe: '❶', nomFR: 'Premier avis',  nomEN: 'First notice',
        texteFR: 'Vous avez accepté un premier avis du babillard.', texteEN: 'You accepted a first notice from the board.' },
      { id: 'billet-2', glyphe: '❷', nomFR: 'Deuxième avis', nomEN: 'Second notice',
        texteFR: 'Deux avis décrochés du babillard.', texteEN: 'Two notices taken off the board.' },
      { id: 'billet-3', glyphe: '❸', nomFR: 'Troisième avis', nomEN: 'Third notice',
        texteFR: 'Trois avis décrochés du babillard.', texteEN: 'Three notices taken off the board.' },
      { id: 'billet-4', glyphe: '❹', nomFR: 'Babillard vidé', nomEN: 'Board cleared',
        texteFR: 'Les quatre avis du babillard sont à vous.', texteEN: 'All four notices on the board are yours.' },
    ],
  },
];

export const TOUS_LES_BADGES: Badge[] = COLLECTIONS.flatMap((c) => c.badges);

/** Le sceau gravé de chaque badge, frappé pour le festival le 23 août
 *  2026 (bronze vieilli sur velours noir, une planche par collection). */
export const sceauDe = (id: string) => `/badges/${id}.webp`;

export const badgeParId = (id: string): Badge | undefined =>
  TOUS_LES_BADGES.find((b) => b.id === id);

export const collectionDuBadge = (id: string): Collection | undefined =>
  COLLECTIONS.find((c) => c.badges.some((b) => b.id === id));

const COL = 'badges';
const CLE_LOCALE = 'fmm-badges-en-attente';

// ── Ce qui dort dans le navigateur ──────────────────────────────────
export function badgesLocaux(): string[] {
  try {
    const brut = localStorage.getItem(CLE_LOCALE);
    return brut ? (JSON.parse(brut) as string[]) : [];
  } catch {
    return [];
  }
}

function poserLocal(id: string): boolean {
  const liste = badgesLocaux();
  if (liste.includes(id)) return false;
  try {
    localStorage.setItem(CLE_LOCALE, JSON.stringify([...liste, id]));
  } catch {
    return false;
  }
  return true;
}

function viderLocaux() {
  try { localStorage.removeItem(CLE_LOCALE); } catch { /* rien */ }
}

/**
 * Attribue un badge. Rend true seulement la PREMIÈRE fois, ce qui
 * permet à l'appelant de faire sonner la fanfare une seule fois.
 */
export async function gagner(id: string, uid?: string | null): Promise<boolean> {
  if (!badgeParId(id)) return false;
  if (!uid || !db) return poserLocal(id);
  const ref = doc(db, COL, uid);
  const snap = await getDoc(ref);
  const obtenus = (snap.exists() ? (snap.data().obtenus as Record<string, unknown>) : {}) || {};
  if (obtenus[id]) return false;
  await setDoc(ref, { obtenus: { ...obtenus, [id]: serverTimestamp() } }, { merge: true });
  return true;
}

/** À la connexion : ce qui a été gagné hors compte rejoint le compte. */
export async function reclamerLesLocaux(uid: string): Promise<string[]> {
  const liste = badgesLocaux();
  if (liste.length === 0) return [];
  const gagnes: string[] = [];
  for (const id of liste) {
    if (await gagner(id, uid)) gagnes.push(id);
  }
  viderLocaux();
  return gagnes;
}

export function suivreBadges(uid: string, cb: (ids: string[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    doc(db, COL, uid),
    (snap) => cb(snap.exists() ? Object.keys((snap.data().obtenus as object) || {}) : []),
    () => cb([]),
  );
}

// ─── La vitrine ──────────────────────────────────────────────────────
// Alex, 2026-08-27 : chacun choisit jusqu'à cinq badges à montrer en
// tête de sa fiche, ceux dont il est fier (photographe, bénévole...).
// Le champ `exposes` vit sur le même document que `obtenus`; la règle
// Firestore borne la liste à cinq.
export const MAX_EXPOSES = 5;

export async function definirExposes(uid: string, ids: string[]): Promise<void> {
  if (!db) return;
  const propres = Array.from(new Set(ids.filter((id) => badgeParId(id)))).slice(0, MAX_EXPOSES);
  await setDoc(doc(db, COL, uid), { exposes: propres }, { merge: true });
}

export function suivreExposes(uid: string, cb: (ids: string[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    doc(db, COL, uid),
    (snap) => cb(snap.exists() ? ((snap.data().exposes as string[]) || []) : []),
    () => cb([]),
  );
}

/** L'avancement, collection par collection. */
export function avancement(ids: string[]) {
  const parCollection = COLLECTIONS.map((c) => {
    const obtenus = c.badges.filter((b) => ids.includes(b.id)).length;
    return { collection: c, obtenus, total: c.badges.length, complete: obtenus === c.badges.length };
  });
  const total = TOUS_LES_BADGES.length;
  const obtenus = TOUS_LES_BADGES.filter((b) => ids.includes(b.id)).length;
  return { parCollection, obtenus, total, tout: obtenus === total };
}
