// ─── Le salon d'une guilde ───────────────────────────────────────────
// Contrat CLAN-MONNAIE-CONTRAT.md, 6 septembre 2026. Le fil de parole
// du groupe, sous la guilde elle-même :
//
//   guildes/{id}/clavardage/{msgId} { uid, nom, avatarUrl?, texte, creeLe }
//
// Même patron que src/firebase/clavardage.ts (la table de jeu) : le
// message ne se corrige pas, il se retire. La règle Firestore laisse
// écrire les membres, et laisse effacer l'auteur ou un chef.

import {
  collection, addDoc, deleteDoc, doc, query, orderBy, limit as fbLimit,
  onSnapshot, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

/** Cinq cents caractères, comme la règle Firestore. Au-delà, ce n'est
 *  plus une réplique, c'est une lettre, et le mur est fait pour ça. */
export const LONGUEUR_MAX = 500;

/** Deux secondes entre deux messages, pour couper court à celui qui
 *  colle la même ligne trente fois. Le compteur vit dans la page :
 *  il freine la maladresse, pas la malveillance. */
const DELAI_MIN_MS = 2000;
const dernierEnvoi = new Map<string, number>();

export interface MessageSalon {
  id: string;
  uid: string;
  nom: string;
  avatarUrl?: string;
  texte: string;
  creeLe?: Timestamp | null;
}

export interface AuteurSalon {
  uid: string;
  nom: string;
  avatarUrl?: string;
}

export type Refus = 'ok' | 'vide' | 'trop-long' | 'trop-vite' | 'ferme';

export async function envoyer(
  guildeId: string, auteur: AuteurSalon, texte: string,
): Promise<Refus> {
  if (!db) return 'ferme';
  const propre = texte.replace(/\s+/g, ' ').trim();
  if (propre.length === 0) return 'vide';
  if (propre.length > LONGUEUR_MAX) return 'trop-long';
  const cle = `${guildeId}/${auteur.uid}`;
  if (Date.now() - (dernierEnvoi.get(cle) ?? 0) < DELAI_MIN_MS) return 'trop-vite';
  dernierEnvoi.set(cle, Date.now());
  // La règle refuse un nom vide; le refus arriverait au membre sous la
  // forme d'un « le salon est fermé » incompréhensible.
  const ligne: Record<string, unknown> = {
    uid: auteur.uid,
    nom: (auteur.nom || '?').slice(0, 60),
    texte: propre,
    creeLe: serverTimestamp(),
  };
  if (auteur.avatarUrl) ligne.avatarUrl = auteur.avatarUrl;
  await addDoc(collection(db, 'guildes', guildeId, 'clavardage'), ligne);
  return 'ok';
}

/** Le fil du salon, en direct, le plus ancien en haut. La requête
 *  descend du plus récent pour que la centième ligne soit la dernière
 *  écrite et non la première : c'est la fin de la conversation qui
 *  intéresse, pas son début. */
export function suivre(
  guildeId: string, cb: (messages: MessageSalon[]) => void, max = 100,
): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(
    collection(db, 'guildes', guildeId, 'clavardage'),
    orderBy('creeLe', 'desc'),
    fbLimit(max),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as MessageSalon));
      // Un message qui vient de partir n'a pas encore son horodatage du
      // serveur : il se range à la fin, là où son auteur l'attend.
      rows.sort((a, b) => (a.creeLe?.toMillis?.() ?? Infinity) - (b.creeLe?.toMillis?.() ?? Infinity));
      cb(rows);
    },
    // Une règle qui refuse ne doit pas casser la page : le fil reste
    // vide et le reste du groupe continue de se lire.
    () => cb([]),
  );
}

export async function supprimer(guildeId: string, msgId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, 'guildes', guildeId, 'clavardage', msgId));
}
