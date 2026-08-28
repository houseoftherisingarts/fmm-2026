// ─── Le Montpellois : la monnaie du site ─────────────────────────────
// Alex, 2026-08-28 : chacun commence avec 10 Montpellois, en gagne en
// gagnant des badges et en réclamant sa pièce du jour, et les dépense
// à la boutique ou au Souk. Le document vit sous bourses/{uid} et le
// CLIENT NE L'ÉCRIT JAMAIS : toutes les fonctions ci-dessous appellent
// une Cloud Function (patron httpsCallable de src/firebase/users.ts,
// région us-central1) qui seule touche le solde, avec la clé admin.
//
//   bourses/{uid}  { solde, gagne, depense, dernierQuotidien, albums, maj }
//
// Le code EXACT des fonctions serveur (à coller dans functions/index.js
// par Alex) est donné dans le rapport de livraison, pas ici.

import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, firebaseApp } from '../firebase';

/** Le pécule de départ, à la création de la bourse. */
export const SOLDE_DEPART = 10;
/** Ce que rapporte un badge gagné. */
export const GAIN_PAR_BADGE = 5;
/** Ce que rapporte la pièce du jour (reclamerQuotidien). */
export const GAIN_QUOTIDIEN = 1;
/** Le prix des skins de plateforme, gratuits pour un compte VIP
 *  (users.sansPub) — doit rester en phase avec le même nom de
 *  constante côté fonction serveur. */
// Le barème d'Alex (2026-08-28) : le bleu est offert, le vert vaut une
// pièce, le doré reste la parure la plus rare.
export const PRIX_SKIN: Record<'bleu' | 'vert' | 'dore', number> = { bleu: 0, vert: 1, dore: 5 };
/** Le prix d'un album, tant qu'Alex n'a pas fixé un prix par groupe. */
export const PRIX_ALBUM = 30;
/** Le prix d'une ambiance de la boutique (voir src/lib/ambiances.ts,
 *  celles marquées `gratuite: false`) — un seul palier pour l'instant,
 *  c'est un test (Alex, 2026-08-28). */
export const PRIX_AMBIANCE = 1;

// ── Les rangs de fortune (badges 'fortune' de badges.ts) ─────────────
// Alex, 2026-08-28 : posés sur le TOTAL GAGNÉ à vie (bourse.gagne),
// jamais sur le solde courant — dépenser ne doit jamais faire perdre
// un rang déjà mérité. Même forme que PALIERS_PARRAINAGE
// (parrainage.ts), pour que ParrainagePanel et un futur panneau de
// bourse se ressemblent.
export const RANGS_FORTUNE = [
  { seuil: 100,         badgeId: 'fortune-100',        nomFR: 'Bourse garnie',      nomEN: 'Full purse' },
  { seuil: 1000,        badgeId: 'fortune-1000',       nomFR: 'Coffre de marchand', nomEN: "Merchant's chest" },
  { seuil: 10000,       badgeId: 'fortune-10000',      nomFR: 'Trésor de seigneur', nomEN: "Lord's treasure" },
  { seuil: 100000,      badgeId: 'fortune-100000',     nomFR: 'Rançon de prince',   nomEN: "Prince's ransom" },
  { seuil: 1000000,     badgeId: 'fortune-1000000',    nomFR: 'Fortune royale',     nomEN: 'Royal fortune' },
  { seuil: 1000000000,  badgeId: 'fortune-1000000000', nomFR: 'Milliardaire musqué', nomEN: 'Musked billionaire' },
] as const;

/** Le rang atteint et le prochain, pour l'affichage (boutique, futur
 *  panneau de bourse) — le même calcul que la Cloud Function, en
 *  lecture seule côté client. */
export function rangFortune(gagne: number): {
  actuel: (typeof RANGS_FORTUNE)[number] | null;
  prochain: (typeof RANGS_FORTUNE)[number] | null;
} {
  let actuel: (typeof RANGS_FORTUNE)[number] | null = null;
  let prochain: (typeof RANGS_FORTUNE)[number] | null = null;
  for (const r of RANGS_FORTUNE) {
    if (gagne >= r.seuil) actuel = r;
    else { prochain = r; break; }
  }
  return { actuel, prochain };
}

export interface Bourse {
  solde: number;
  gagne: number;
  depense: number;
  dernierQuotidien?: Timestamp | null;
  /** Les groupes musicaux dont l'album a été acheté (voir Musique du
   *  profil) : leurs pistes deviennent des ambiances possibles. */
  albums?: string[];
  /** La bourse est ouverte aux regards des autres membres (Alex, 2026-08-28). */
  publique?: boolean;
  maj?: unknown;
}

const COLLECTION = 'bourses';

/** Le solde en direct, ou une bourse vide tant que le premier geste
 *  (réclamation, achat, badge…) ne l'a pas créée côté serveur. */
export function suivreMaBourse(uid: string, cb: (b: Bourse) => void): () => void {
  if (!db) { cb({ solde: 0, gagne: 0, depense: 0, albums: [] }); return () => {}; }
  return onSnapshot(
    doc(db, COLLECTION, uid),
    (snap) => cb(snap.exists() ? (snap.data() as Bourse) : { solde: 0, gagne: 0, depense: 0, albums: [] }),
    () => cb({ solde: 0, gagne: 0, depense: 0, albums: [] }),
  );
}

function appeler<TIn extends object, TOut>(nom: string) {
  return async (data: TIn): Promise<TOut> => {
    if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
    const fn = httpsCallable<TIn, TOut>(getFunctions(firebaseApp, 'us-central1'), nom);
    const { data: reponse } = await fn(data);
    return reponse;
  };
}

/** Réclame la pièce du jour. Refuse (failed-precondition) si déjà pris
 *  aujourd'hui — l'appelant affiche l'erreur telle quelle. */
export const reclamerQuotidien = () => appeler<Record<string, never>, { solde: number }>('reclamerQuotidien')({});

/** Achète un cosmétique de boutique : un objet du catalogue
 *  (source: 'boutique', voir objets.ts) ou un skin de plateforme
 *  ('skin_bleu', 'skin_vert' ou 'skin_dore'). */
export const acheterCosmetique = (objetId: string) =>
  appeler<{ objetId: string }, { solde: number }>('acheterCosmetique')({ objetId });

/** Achète un objet du Souk en Montpellois : débite l'acheteur, crédite
 *  le vendeur, marque l'objet vendu, ouvre le fil de messagerie. */
export const acheterAuSouk = (objetSoukId: string) =>
  appeler<{ objetSoukId: string }, { solde: number; filId: string }>('acheterAuSouk')({ objetSoukId });

/** Achète l'album d'un groupe musical (voir groupesMusicaux.ts). Le
 *  chemin est prêt mais rien ne l'appelle encore : les albums sont
 *  affichés « à venir » tant qu'Alex n'ouvre pas la vente. */
export const acheterAlbum = (groupeId: string) =>
  appeler<{ groupeId: string }, { solde: number }>('acheterAlbum')({ groupeId });


/** La bourse s'ouvre ou se referme aux regards des autres membres
 *  (Alex, 2026-08-28). Le badge du paon vient avec l'ouverture. */
export async function basculerBoursePublique(publique: boolean): Promise<{ publique: boolean }> {
  if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
  const appeler = httpsCallable<{ publique: boolean }, { publique: boolean }>(
    getFunctions(firebaseApp, 'us-central1'), 'boursePubliqueBascule',
  );
  const { data } = await appeler({ publique });
  return data;
}

/** La bourse de quelqu'un d'autre, quand elle est ouverte. */
export function suivreBourseDe(uid: string, cb: (bourse: { solde: number; gagne: number; publique?: boolean } | null) => void): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(doc(db, COLLECTION, uid),
    (snap) => cb(snap.exists() ? (snap.data() as { solde: number; gagne: number; publique?: boolean }) : null),
    () => cb(null));
}
