// ─── Le clavardage de la table ──────────────────────────────────────
// Alex, 2026-09-01 : « ajoutez un petit chatroom pour que les gens
// soient capables de se parler pendant qu'ils jouent. »
//
//   /taflParties/{id}/messages/{msgId}
//   /desParties/{id}/messages/{msgId}
//
// La sous-collection vit sous la partie, ce qui règle la question des
// droits sans rien inventer : celui qui peut lire la partie peut lire
// ce qui s'y dit, et personne d'autre. Les messages ne se corrigent
// pas et ne s'effacent pas, sauf par un administrateur.

import {
  collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type CollectionPartie = 'taflParties' | 'desParties';

export interface Salle {
  collection: CollectionPartie;
  partieId: string;
}

export interface MessageJeu {
  id: string;
  uid: string;
  nom: string;
  texte: string;
  at?: Timestamp | null;
}

/** Une ligne de clavardage tient en deux phrases. Au-delà, c'est une
 *  lettre, et la table n'est pas faite pour ça. */
export const LONGUEUR_MAX = 240;

/** Deux secondes entre deux messages : de quoi couper court à celui
 *  qui colle la même ligne trente fois pendant que l'autre réfléchit. */
const DELAI_MIN_MS = 2000;
const dernierEnvoi = new Map<string, number>();

export type Refus = 'ok' | 'vide' | 'trop-long' | 'trop-vite' | 'ferme';

export async function envoyerMessage(
  salle: Salle, uid: string, nom: string, texte: string,
): Promise<Refus> {
  if (!db) return 'ferme';
  const propre = texte.replace(/\s+/g, ' ').trim();
  if (propre.length === 0) return 'vide';
  if (propre.length > LONGUEUR_MAX) return 'trop-long';
  const cle = `${salle.collection}/${salle.partieId}/${uid}`;
  const avant = dernierEnvoi.get(cle) ?? 0;
  if (Date.now() - avant < DELAI_MIN_MS) return 'trop-vite';
  dernierEnvoi.set(cle, Date.now());
  await addDoc(collection(db, salle.collection, salle.partieId, 'messages'), {
    uid, nom, texte: propre, at: serverTimestamp(),
  });
  return 'ok';
}

/** Le fil de la table, en direct. Les cinquante dernières lignes
 *  suffisent : une partie de tafl dure une heure, pas une soirée. */
export function suivreMessages(
  salle: Salle, cb: (messages: MessageJeu[]) => void,
): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(
    collection(db, salle.collection, salle.partieId, 'messages'),
    orderBy('at', 'asc'),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as MessageJeu))),
    // Une règle qui refuse ne doit pas casser le plateau : le fil reste
    // vide et la partie continue.
    () => cb([]),
  );
}
