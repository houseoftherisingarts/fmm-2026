// ─── Les cadeaux posés dans l'espace d'un membre ─────────────────────
// Alex, 2026-09-22 : « envoie le skin Hullsborg en cadeau à Tristan dans
// son espace client. La prochaine fois qu'il se connecte, je veux que ça
// lui fasse un genre de pop-up succès, comme pour les badges. »
//
// Le cadeau lui-même (le skin dans la bourse) est posé à la main dans
// Firestore par Alex; ce document ne porte que l'ANNONCE : qui, quoi,
// le mot d'Alex, et le bouton. Le membre ne peut y écrire que `vu`.
import {
  collection, doc, onSnapshot, query, updateDoc, where, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Cadeau {
  id: string;
  uid: string;
  /** Vignette du cadeau, servie depuis /public. */
  image?: string;
  titreFR: string;
  titreEN: string;
  texteFR: string;
  texteEN: string;
  /** Le mot personnel de celui qui offre, tel quel, dans sa langue. */
  message?: string;
  de?: string;
  /** Où mène le bouton, et ce qu'il dit. */
  lien?: string;
  boutonFR?: string;
  boutonEN?: string;
  vu: boolean;
  date?: Timestamp;
}

/** Suit les cadeaux pas encore vus du membre connecté. */
export function suivreMesCadeaux(uid: string, cb: (cadeaux: Cadeau[]) => void): () => void {
  if (!db) return () => {};
  // Une seule égalité : aucun index composé à déclarer. Le tri par `vu`
  // se fait ici, la liste d'une personne tient sur les doigts d'une main.
  const q = query(collection(db, 'cadeaux'), where('uid', '==', uid));
  return onSnapshot(q, (snap) => {
    const liste = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Cadeau, 'id'>) }))
      .filter((c) => !c.vu)
      .sort((a, b) => (a.date?.toMillis() ?? 0) - (b.date?.toMillis() ?? 0));
    cb(liste);
  }, () => cb([]));
}

export async function marquerCadeauVu(id: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'cadeaux', id), { vu: true });
}
