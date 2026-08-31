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
      { id: 'renard',       glyphe: '❖', nomFR: 'La basse-cour',   nomEN: 'The farmyard',
        texteFR: 'Vous avez joué au Renard et les Oies.', texteEN: 'You played Fox and Geese.' },
      { id: 'renard-victoire', glyphe: '✥', nomFR: 'Gardien du troupeau', nomEN: 'Keeper of the flock',
        texteFR: 'Le renard est coincé, ou le troupeau est éclairci : une partie gagnée contre l’ordinateur.', texteEN: 'The fox is pinned, or the flock is thinned: a game won against the computer.' },
      { id: 'merelle',      glyphe: '⚝', nomFR: 'Les moulins',     nomEN: 'The mills',
        texteFR: 'Vous avez joué à la mérelle.', texteEN: 'You played merels.' },
      { id: 'merelle-victoire', glyphe: '✤', nomFR: 'Maître des moulins', nomEN: 'Master of the mills',
        texteFR: 'Une partie de mérelle gagnée contre l’ordinateur.', texteEN: 'A game of merels won against the computer.' },
      { id: 'des',          glyphe: '⚄', nomFR: 'Beau menteur',   nomEN: 'Fine liar',
        texteFR: 'Vous avez gagné une manche aux dés du menteur.', texteEN: 'You won a round at liar’s dice.' },
      { id: 'defi-gagne',   glyphe: '♞', nomFR: 'Défi remporté',  nomEN: 'Challenge won',
        texteFR: 'Vous avez gagné un défi de tafl lancé contre vous ou par vous.', texteEN: 'You won a tafl challenge, thrown or received.' },
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
      { id: 'veteran',       glyphe: '⚜', nomFR: 'Vétéran du festival', nomEN: 'Festival veteran',
        texteFR: 'Vous étiez là au moins deux années.', texteEN: 'You were there at least two years.' },
      { id: 'membre',        glyphe: '♁', nomFR: 'Membre de la table', nomEN: 'Member of the table',
        texteFR: 'Vous avez créé votre compte du festival.', texteEN: 'You created your festival account.' },
      { id: 'photographe',   glyphe: '◎', nomFR: 'Photographe',     nomEN: 'Photographer',
        texteFR: 'Vous avez envoyé votre première photo du festival.', texteEN: 'You sent your first festival photo.' },
      { id: 'profil-complet', glyphe: '⚚', nomFR: 'Fiche au grand complet', nomEN: 'Complete record',
        texteFR: 'Nom, ville, description, portrait et bannière : votre fiche ne manque de rien.', texteEN: 'Name, town, description, portrait and banner: nothing missing from your record.' },
    ],
  },
  {
    id: 'reseau',
    nomFR: 'La cour du réseau', nomEN: 'The court of the network',
    prix: 'grand',
    badges: [
      { id: 'mur-premier',  glyphe: '✎', nomFR: 'Première parole', nomEN: 'First word',
        texteFR: 'Vous avez pris la parole sur le mur social.', texteEN: 'You spoke up on the social wall.' },
      { id: 'commentaire',  glyphe: '❝', nomFR: 'Beau parleur',    nomEN: 'Good talker',
        texteFR: 'Vous avez répondu sous le billet de quelqu’un.', texteEN: 'You answered under someone’s post.' },
      { id: 'guilde',       glyphe: '⚔', nomFR: 'Compagnon de guilde', nomEN: 'Guild companion',
        texteFR: 'Vous avez rejoint une guilde de l’Ordre.', texteEN: 'You joined a guild of the Order.' },
      { id: 'guilde-fondee', glyphe: '♜', nomFR: 'Fondateur de guilde', nomEN: 'Guild founder',
        texteFR: 'Vous avez fondé votre propre guilde.', texteEN: 'You founded your own guild.' },
      { id: 'souk',         glyphe: '⚖', nomFR: 'Marchand du souk', nomEN: 'Souk trader',
        texteFR: 'Vous avez mis un objet en vente au souk.', texteEN: 'You put an item up for sale at the souk.' },
      { id: 'souk-vendu',   glyphe: '⛃', nomFR: 'Objet vendu',      nomEN: 'Item sold',
        texteFR: 'Un objet mis en vente au souk a trouvé preneur.', texteEN: 'An item you listed at the souk found a buyer.' },
      { id: 'souk-donne',   glyphe: '❁', nomFR: 'Main généreuse',   nomEN: 'Generous hand',
        texteFR: 'Vous avez donné un objet au souk.', texteEN: 'You gave away an item at the souk.' },
      { id: 'commerce',     glyphe: '⌘', nomFR: 'Enseigne peinte',  nomEN: 'Painted sign',
        texteFR: 'Vous avez ouvert votre commerce dans la ruelle.', texteEN: 'You opened your business in the alley.' },
      { id: 'banniere',     glyphe: '⚑', nomFR: 'Porte-bannière',   nomEN: 'Banner bearer',
        texteFR: 'Vous avez déployé votre bannière sur votre profil.', texteEN: 'You raised your banner on your profile.' },
      { id: 'banniere-et-portrait', glyphe: '☖', nomFR: 'Blason complet', nomEN: 'Full coat of arms',
        texteFR: 'Votre bannière et votre portrait sont posés ensemble.', texteEN: 'Your banner and your portrait stand together.' },
      { id: 'parrain',      glyphe: '✚', nomFR: 'Parrain',          nomEN: 'Sponsor',
        texteFR: 'Quelqu’un est entré à la cour grâce à votre code.', texteEN: 'Someone joined the court with your code.' },
      { id: 'le-parrain',   glyphe: '♔', nomFR: 'Le Parrain',       nomEN: 'The Godfather',
        texteFR: 'Cinq personnes sont entrées grâce à vous.', texteEN: 'Five people joined thanks to you.' },
      { id: 'amitie-1',     glyphe: '☙', nomFR: 'Amitié nouée',     nomEN: 'Friendship struck',
        texteFR: 'Vous avez noué votre première amitié à la cour.', texteEN: 'You struck your first friendship at court.' },
      { id: 'amis-dix',     glyphe: '❧', nomFR: 'Cercle de dix',    nomEN: 'Circle of ten',
        texteFR: 'Dix amitiés nouées à la cour.', texteEN: 'Ten friendships struck at court.' },
    ],
  },
  {
    id: 'fortune',
    nomFR: 'La bourse du Montpellois', nomEN: 'The Montpellois purse',
    prix: 'grand',
    badges: [
      { id: 'paon',             glyphe: '❦', nomFR: 'Paon de la cour',   nomEN: 'Peacock of the court',
        texteFR: 'Votre bourse est ouverte à tous les regards. Que nul n’ignore votre fortune.', texteEN: 'Your purse is open for all to see. Let no one ignore your fortune.' },
      { id: 'premiere-depense', glyphe: '◈', nomFR: 'Premier écu dépensé', nomEN: 'First coin spent',
        texteFR: 'Vous avez dépensé votre premier Montpellois.', texteEN: 'You spent your first Montpellois.' },
      { id: 'premier-achat-boutique', glyphe: '⛁', nomFR: 'Premier achat',   nomEN: 'First purchase',
        texteFR: 'Vous avez acheté votre premier article à la boutique.', texteEN: 'You bought your first item at the shop.' },
      { id: 'audiophile',       glyphe: '♫', nomFR: 'Audiophile',       nomEN: 'Audiophile',
        texteFR: 'Cinq ambiances ou albums achetés pour votre profil.', texteEN: 'Five ambiences or albums bought for your profile.' },
      { id: 'collectionneur',   glyphe: '✦', nomFR: 'Collectionneur',   nomEN: 'Collector',
        texteFR: 'Dix badges réunis. Vingt Montpellois pour la peine.', texteEN: 'Ten badges gathered. Twenty Montpellois for your trouble.' },
      { id: 'quotidien-sept',   glyphe: '⌛', nomFR: 'Semaine fidèle',   nomEN: 'Faithful week',
        texteFR: 'Sept jours de suite à réclamer votre pièce du jour.', texteEN: 'Seven days in a row claiming your daily coin.' },
      { id: 'fortune-100',      glyphe: '❂', nomFR: 'Bourse garnie',   nomEN: 'Full purse',
        texteFR: 'Cent Montpellois gagnés.', texteEN: 'A hundred Montpellois earned.' },
      { id: 'fortune-1000',     glyphe: '❈', nomFR: 'Coffre de marchand', nomEN: 'Merchant’s chest',
        texteFR: 'Mille Montpellois gagnés.', texteEN: 'A thousand Montpellois earned.' },
      { id: 'fortune-10000',    glyphe: '✦', nomFR: 'Trésor de seigneur', nomEN: 'Lord’s treasure',
        texteFR: 'Dix mille Montpellois gagnés.', texteEN: 'Ten thousand Montpellois earned.' },
      { id: 'fortune-100000',   glyphe: '✧', nomFR: 'Rançon de prince',  nomEN: 'Prince’s ransom',
        texteFR: 'Cent mille Montpellois gagnés.', texteEN: 'A hundred thousand Montpellois earned.' },
      { id: 'fortune-1000000',  glyphe: '♛', nomFR: 'Fortune royale',   nomEN: 'Royal fortune',
        texteFR: 'Un million de Montpellois gagnés.', texteEN: 'A million Montpellois earned.' },
      { id: 'fortune-1000000000', glyphe: '☄', nomFR: 'Milliardaire musqué', nomEN: 'Musked billionaire',
        texteFR: 'Un milliard de Montpellois. Personne ne sait comment.', texteEN: 'A billion Montpellois. Nobody knows how.' },
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
