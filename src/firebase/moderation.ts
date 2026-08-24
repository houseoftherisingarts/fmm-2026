// ─── La tenue de la place ────────────────────────────────────────────
// Alex, 2026-08-23 : le festival accueille des mineurs, et une salle
// commune sans porte de sortie est une mauvaise idée. Chacun peut donc
// faire taire quelqu'un et signaler un message à l'équipe.
//
//   /blocages/{uid}       { uids: [...] }   la liste de la personne
//   /signalements/{id}    un message rapporté à l'équipe
//
// Le blocage ne porte pas le même poids des deux côtés. Dans les
// messages privés il vaut vraiment : la règle Firestore va lire la
// liste du destinataire avant d'accepter l'envoi, et le message ne
// part pas. Dans le salon public il ne peut être qu'un silence de mon
// côté, puisque personne ne retire la parole à un autre devant tout le
// monde. Cela regarde l'équipe, et c'est à cela que sert le
// signalement.

import {
  addDoc, arrayRemove, arrayUnion, collection, doc, onSnapshot,
  serverTimestamp, setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

/** La longueur d'un message, ici comme dans firestore.rules. Les deux
 *  chiffres doivent rester égaux : la règle est la seule qui compte. */
export const LONGUEUR_MAX = 2000;

// ── Le garde-fou contre l'envoi en rafale ───────────────────────────
// Un délai minimum entre deux messages d'une même conversation. Il
// tient dans l'onglet ouvert et ne survit pas à un rechargement.
//
// ponytail: garde-fou de navigateur, la console le contourne. Le vrai
// plafond vit dans firestore.rules (2000 caractères, l'expéditeur est
// forcément soi-même) et dans le signalement. Le jour où quelqu'un
// inonde vraiment la salle, la limite se déplace dans une Cloud
// Function qui compte les messages par minute.
const DELAI_MIN = 1500;
const dernierEnvoi = new Map<string, number>();

/** Vrai si le message précédent est trop récent. Marque l'instant
 *  quand il laisse passer. */
export function tropVite(cle: string): boolean {
  const maintenant = Date.now();
  const avant = dernierEnvoi.get(cle) ?? 0;
  if (maintenant - avant < DELAI_MIN) return true;
  dernierEnvoi.set(cle, maintenant);
  return false;
}

// ── Les gens qu'on ne veut plus entendre ────────────────────────────
const BLOCAGES = 'blocages';

/** La liste des personnes bloquées, en direct. */
export function suivreBlocages(uid: string, cb: (uids: string[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    doc(db, BLOCAGES, uid),
    (snap) => cb((snap.data()?.uids as string[]) || []),
    () => cb([]),
  );
}

export async function bloquer(moi: string, autre: string): Promise<void> {
  if (!db || moi === autre) return;
  await setDoc(doc(db, BLOCAGES, moi), { uids: arrayUnion(autre) }, { merge: true });
}

export async function debloquer(moi: string, autre: string): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, BLOCAGES, moi), { uids: arrayRemove(autre) }, { merge: true });
}

// ── Les signalements ────────────────────────────────────────────────
export type LieuSignale = 'salon' | 'prive';

export interface Signalement {
  /** Qui signale. La règle Firestore refuse tout autre nom. */
  parUid: string;
  parNom: string;
  /** La personne visée, et ce qu'elle a écrit, recopié tel quel pour
   *  que l'équipe puisse juger même si le message disparaît ensuite. */
  contreUid: string;
  contreNom: string;
  texte: string;
  lieu: LieuSignale;
  /** L'endroit exact : l'identifiant du mot, ou celui du fil privé. */
  reference: string;
}

export async function signaler(s: Signalement): Promise<void> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  await addDoc(collection(db, 'signalements'), {
    ...s,
    texte: s.texte.slice(0, LONGUEUR_MAX),
    signaleLe: serverTimestamp(),
    traite: false,
  });
}
