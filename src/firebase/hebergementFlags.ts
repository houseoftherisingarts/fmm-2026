// Les deux textes libres de la section camping, tenus dans Firestore au
// document `siteFlags/hebergement`, voisin de `siteFlags/programmation`
// (src/firebase/programmationFlags.ts) et de `siteFlags/global`.
//
// Maïté coordonne les bénévoles et fixe l'heure à laquelle les campeurs
// entrent sur le terrain et celle à laquelle ils le quittent. Ces heures
// ne vivent nulle part ailleurs, elles changent d'une édition à l'autre,
// et elles ne se devinent pas. Elles s'écrivent donc depuis l'admin, et
// la page publique n'affiche la ligne que lorsque le champ porte un
// texte. Tant qu'ils sont vides, la section camping reste telle qu'elle
// était, sans ligne creuse ni heure inventée.

import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface HebergementFlags {
  /** Ce que Maïté a confirmé pour l'arrivée des campeurs. */
  campingArrivee: string;
  /** Ce que Maïté a confirmé pour le départ des campeurs. */
  campingDepart:  string;
}

export const HEBERGEMENT_FLAGS_DEFAULTS: HebergementFlags = {
  campingArrivee: '',
  campingDepart:  '',
};

const hebergementDoc = () => (db ? doc(db, 'siteFlags', 'hebergement') : null);

/** Écoute le document et rend la fonction de désabonnement. Firestore
 *  absent, hors ligne ou document jamais créé : les champs restent vides
 *  et la page publique continue de s'afficher. */
export function watchHebergementFlags(cb: (flags: HebergementFlags) => void): () => void {
  const ref = hebergementDoc();
  if (!ref) { cb(HEBERGEMENT_FLAGS_DEFAULTS); return () => {}; }
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.exists() ? (snap.data() as Partial<HebergementFlags>) : {};
      cb({
        campingArrivee: String(data.campingArrivee ?? '').trim(),
        campingDepart:  String(data.campingDepart  ?? '').trim(),
      });
    },
    () => cb(HEBERGEMENT_FLAGS_DEFAULTS),
  );
}

export async function setHebergementFlag<K extends keyof HebergementFlags>(
  champ: K,
  valeur: HebergementFlags[K],
): Promise<void> {
  const ref = hebergementDoc();
  if (!ref) throw new Error('Firestore not configured');
  await setDoc(ref, { [champ]: valeur, updatedAt: serverTimestamp() }, { merge: true });
}
