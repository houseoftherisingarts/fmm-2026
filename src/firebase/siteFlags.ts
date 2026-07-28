// Firestore-backed site flags. Single source of truth at siteFlags/global.
// Falls back gracefully when Firestore is unavailable so the public site
// keeps rendering.

import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { PillarKey } from '../content';

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
  // ── Per-page publication ──────────────────────────────────────────
  // The public teaser (site bientôt disponible) is simply the state where
  // NO page is published. Flip a page on from the admin (Paramètres →
  // Publication des pages) and it appears in the main orb menu + its route
  // opens, live, with no redeploy. Everything else stays behind the teaser.
  // In `VITE_SITE_MODE=live` (local dev) every page is shown regardless,
  // so you can build an unpublished page without exposing it publicly.
  pubActivites:            boolean;
  pubMarche:               boolean;
  pubHistoire:             boolean;
  pubMariages:             boolean;
  pubHebergement:          boolean;
  pubPartenaires:          boolean;
  pubBenevole:             boolean;
  pubPetiteMonnaie:        boolean;
}

export const SITE_FLAGS_DEFAULTS: SiteFlags = {
  ticketingOpen:           true,
  banquetReservationsOpen: false,
  volunteerSignupOpen:     true,
  vendorApplicationsOpen:  true,
  showCountdown:           true,
  knightPlacementEditor:   false,
  // All pages start unpublished → the public sees the teaser until each is
  // flipped on one by one.
  pubActivites:            false,
  pubMarche:               false,
  pubHistoire:             false,
  pubMariages:             false,
  pubHebergement:          false,
  pubPartenaires:          false,
  pubBenevole:             false,
};

// Maps each top-level pillar to its publication flag + a human label for the
// admin toggle. Absorbed pillars (nourriture, musique, jeunesse, apprendre,
// groupes) redirect to a primary and have no flag of their own.
export const PILLAR_PUBLISH_FLAGS: { key: PillarKey; flag: keyof SiteFlags; label: string }[] = [
  { key: 'activites',   flag: 'pubActivites',   label: 'Programmation' },
  { key: 'marche',      flag: 'pubMarche',      label: 'Le Village' },
  { key: 'histoire',    flag: 'pubHistoire',    label: 'Histoire & Apprendre' },
  { key: 'mariages',    flag: 'pubMariages',    label: 'Mariages & Groupes' },
  { key: 'hebergement', flag: 'pubHebergement', label: 'Camping & Hébergement' },
  { key: 'partenaires', flag: 'pubPartenaires', label: 'Nos Partenaires' },
  { key: 'benevole',    flag: 'pubBenevole',    label: 'Devenir Bénévole' },
];

const PUBLISH_FLAG_BY_KEY = Object.fromEntries(
  PILLAR_PUBLISH_FLAGS.map((p) => [p.key, p.flag]),
) as Partial<Record<PillarKey, keyof SiteFlags>>;

// The set of publication flag keys, handy for filtering them out of the
// generic flag list in the admin (they get their own labeled panel).
export const PUBLISH_FLAG_KEYS: ReadonlySet<string> = new Set(
  PILLAR_PUBLISH_FLAGS.map((p) => p.flag),
);

/** True when this pillar's page has been published to the public. */
export function isPillarPublished(flags: SiteFlags, key: PillarKey): boolean {
  const f = PUBLISH_FLAG_BY_KEY[key];
  return f ? !!flags[f] : false;
}

/**
 * Whether a pillar should be visible/reachable right now. `previewAll` (set
 * from VITE_SITE_MODE=live, local dev) shows every page so unpublished pages
 * can be built without exposing them; otherwise visibility follows the flag.
 */
export function isPillarVisible(flags: SiteFlags, key: PillarKey, previewAll: boolean): boolean {
  return previewAll || isPillarPublished(flags, key);
}

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
