// Firestore-backed site flags. Single source of truth at siteFlags/global.
// Falls back gracefully when Firestore is unavailable so the public site
// keeps rendering.

import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface SiteFlags {
  ticketingOpen:           boolean;
  banquetReservationsOpen: boolean;
  volunteerSignupOpen:     boolean;
  vendorApplicationsOpen:  boolean;
  showCountdown:           boolean;
  // Reveals the on-page knight placement editor on the orb home. Off by
  // default — admins flip it on from Paramètres to fine-tune the orb
  // overlay, then flip it back off. Editor is also gated by isAdmin
  // so a leaked flag flip doesn't expose dev controls to the public.
  knightPlacementEditor:   boolean;
}

export const SITE_FLAGS_DEFAULTS: SiteFlags = {
  ticketingOpen:           true,
  banquetReservationsOpen: false,
  volunteerSignupOpen:     true,
  vendorApplicationsOpen:  true,
  showCountdown:           true,
  knightPlacementEditor:   false,
};

const flagsDoc = () => (db ? doc(db, 'siteFlags', 'global') : null);

// Returns an unsubscribe function. The callback receives the merged flags
// (defaults + Firestore overrides). If Firestore is offline or the doc
// doesn't exist yet, defaults are used.
export function subscribeSiteFlags(cb: (flags: SiteFlags) => void): () => void {
  const ref = flagsDoc();
  if (!ref) { cb(SITE_FLAGS_DEFAULTS); return () => {}; }
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.exists() ? (snap.data() as Partial<SiteFlags>) : {};
      cb({ ...SITE_FLAGS_DEFAULTS, ...data });
    },
    () => cb(SITE_FLAGS_DEFAULTS),
  );
}

export async function setSiteFlag<K extends keyof SiteFlags>(key: K, value: SiteFlags[K]): Promise<void> {
  const ref = flagsDoc();
  if (!ref) throw new Error('Firestore not configured');
  await setDoc(ref, { [key]: value, updatedAt: serverTimestamp() }, { merge: true });
}
