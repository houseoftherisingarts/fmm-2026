// Firestore-backed visibility flags for the /activites (Programmation)
// page sections. Single doc at siteFlags/programmation, sibling to the
// site-wide siteFlags/global doc (src/firebase/siteFlags.ts). Falls back
// gracefully when Firestore is unavailable so the public site keeps
// rendering.

import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface ProgFlags {
  bestiaire:        boolean;
  horaire:           boolean;
  banquet:           boolean;
  // Incidents à gérer côté organisation avant de rouvrir la section au
  // public (décision d'Alex, 2026-08-04).
  behourd:           boolean;
  // Le clan qui anime les ateliers jeunesse n'est pas confirmé.
  ateliersJeunesse:  boolean;
}

export const PROG_FLAGS_DEFAULTS: ProgFlags = {
  bestiaire:         true,
  horaire:           true,
  banquet:           true,
  behourd:           false,
  ateliersJeunesse:  false,
};

const progFlagsDoc = () => (db ? doc(db, 'siteFlags', 'programmation') : null);

// Returns an unsubscribe function. The callback receives the merged flags
// (defaults + Firestore overrides). If Firestore is offline or the doc
// doesn't exist yet, defaults are used.
export function watchProgFlags(cb: (flags: ProgFlags) => void): () => void {
  const ref = progFlagsDoc();
  if (!ref) { cb(PROG_FLAGS_DEFAULTS); return () => {}; }
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.exists() ? (snap.data() as Partial<ProgFlags>) : {};
      cb({ ...PROG_FLAGS_DEFAULTS, ...data });
    },
    () => cb(PROG_FLAGS_DEFAULTS),
  );
}

export async function setProgFlag<K extends keyof ProgFlags>(champ: K, valeur: ProgFlags[K]): Promise<void> {
  const ref = progFlagsDoc();
  if (!ref) throw new Error('Firestore not configured');
  await setDoc(ref, { [champ]: valeur, updatedAt: serverTimestamp() }, { merge: true });
}
