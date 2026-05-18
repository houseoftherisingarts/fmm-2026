// Typed Firestore CRUD for user-bound application records.
// One bénévole doc per uid; one vendor doc per (uid, year) — vendors
// live at vendors/{uid}/years/{year} so a merchant can have history.

import {
  collection, doc, getDoc, setDoc, getDocs, query, orderBy, updateDoc,
  serverTimestamp, collectionGroup, onSnapshot, where, limit as fsLimit,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type AppStatus    = 'pending' | 'accepted' | 'rejected';
export type VendorStatus = AppStatus | 'waitlist';

export const CURRENT_YEAR = 2026;

// Firestore rejects setDoc payloads containing `undefined` values. Optional
// fields on our app/profile shapes are routinely undefined for fresh records,
// so we drop those keys before writing. (Set { merge: true } means dropping
// the key is a no-op on the doc — it doesn't clear existing values.)
//
// Recursively strips so nested objects (e.g. stationPreferences) don't sneak
// undefined values into the payload. Plain arrays + Firestore Timestamps
// (FieldValue) are passed through unchanged.
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && Object.getPrototypeOf(v) === Object.prototype;

const stripUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    const v = obj[k];
    if (v === undefined) continue;
    if (isPlainObject(v)) {
      out[k] = stripUndefined(v) as T[keyof T];
    } else {
      out[k] = v as T[keyof T];
    }
  }
  return out;
};

// Promise.race-based timeout so a hung Firestore write surfaces as an
// error instead of leaving the UI stuck on "submitting" forever.
const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race<T>([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${ms / 1000}s`)), ms)),
  ]);

// Roles a person can hold simultaneously in their FMM client space.
// Multiple flags are normal — a vendor may also be a benevole and a
// performer. Flags are tagged automatically by the relevant flow
// (vendor form sets 'vendor', benevole form sets 'benevole', etc.)
// and admins can also toggle them in the CRM.
export type UserFlag = 'vendor' | 'participant' | 'benevole' | 'organizer' | 'performer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  lang?: 'FR' | 'EN';
  flags?: UserFlag[];
  // ── Public-facing profile bits (visible to other bénévoles) ────
  pronouns?:    string;
  bio?:         string;             // short personal blurb
  avatarHue?:   number;             // 0-360, falls back to deterministic hash
  avatarUrl?:   string;             // optional override (Storage url)
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ── Bénévole form vocab (mirrors the public Google Form) ──────────
export type BenevoleDay        = 'vendredi' | 'samedi' | 'dimanche' | 'incertain';
export type BenevoleStation    = 'bar' | 'accueil' | 'securite' | 'camping' | 'entretien' | 'stationnement';
export type BenevoleStationPref = 1 | 2 | 3 | 'learn-more';   // 1=primary, 2=fallback, 3=no, learn-more=needs info
export type BenevoleHeardFrom  = 'reseaux' | 'site' | 'bouche-a-oreille' | 'affiche' | 'autre';
export type BenevolePronouns   = 'il' | 'elle' | 'iel' | 'prefer-not' | 'autre';
export type BenevoleAgeRange   = 'lt18' | '18-25' | '25-40' | '40-60' | '60+';
export type BenevoleYesNoMaybe = 'oui' | 'non' | 'incertain';
export type BenevolePriorFMM   = 'one' | 'multiple' | 'never';
export type BenevoleTShirt     = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | 'autre';
export type BenevoleTeamRole   = 'leader' | 'member';

export interface BenevoleApp {
  uid: string;
  email: string;
  displayName: string;
  prenom: string;
  nom: string;
  telephone: string;
  message: string;                      // free-text "why volunteer" + comments
  status: AppStatus;
  adminNotes?: string;
  year: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;

  // ── Google-form fields (page 1: recrutement) ────────────────────
  daysAvailable?: BenevoleDay[];
  stationPreferences?: Partial<Record<BenevoleStation, BenevoleStationPref>>;
  heardFrom?: BenevoleHeardFrom;
  heardFromOther?: string;              // free-text when heardFrom = 'autre'

  // ── Google-form fields (page 2: infos perso) ────────────────────
  pronouns?: BenevolePronouns;
  pronounsOther?: string;
  ageRange?: BenevoleAgeRange;
  minorGuardianPresent?: BenevoleYesNoMaybe;   // only relevant if ageRange='lt18'
  tShirtSize?: BenevoleTShirt;
  tShirtSizeOther?: string;
  allergies?: string;
  dietaryNotes?: string;
  needsCamping?: BenevoleYesNoMaybe;
  priorVolunteerFMM?: BenevolePriorFMM;
  priorVolunteerOther?: boolean;        // volunteered for other festivals?
  otherComments?: string;               // questions / partages

  // ── Team assignment (admin-set) ─────────────────────────────────
  teamId?: string;
  teamRole?: BenevoleTeamRole;

  // ── Post-acceptance documents (unlock when status='accepted') ──
  // Décharge parentale required for under-18 volunteers; the contrat
  // is required for every accepted bénévole. Both are signed inside
  // the bénévole space and timestamped here.
  dechargeParentaleSigned?:   boolean;
  dechargeParentaleSignedAt?: Timestamp;
  dechargeParentaleParentName?:  string;   // signing parent's full name
  dechargeParentaleParentPhone?: string;

  contratBenevoleSigned?:    boolean;
  contratBenevoleSignedAt?:  Timestamp;
  contratBenevoleSignatureName?: string;   // typed signature

  // ── Optional showcase / admin-curated fields ────────────────────
  city?: string;
  languages?: ('FR' | 'EN' | 'ES' | 'AR' | 'DE' | 'IT')[];
  skills?: string[];                    // libre — "soudure", "premiers soins", "service bar"
  certifications?: string[];            // "RCR", "Permis classe 5"
  preferredStations?: string[];         // legacy free-text; new flow uses stationPreferences
  availability?: Partial<Record<'jeudi' | 'vendredi' | 'samedi' | 'dimanche' | 'lundi', string>>;
  emergencyContact?: { name: string; phone: string; relation?: string };
  transport?: 'voiture' | 'covoiturage' | 'transport_collectif' | 'aucun';
  pastYears?: number[];                 // années de bénévolat précédentes
  hoursLogged?: number;                 // heures cumulées historiques
  assignedShifts?: Array<{ day: string; start: string; end: string; station: string }>;
  badges?: string[];                    // "5+ ans", "Lead", "Premiers soins"
  socials?: { instagram?: string; facebook?: string; website?: string };
}

export type VendorKioskAppearance = 'moderne' | 'medievale' | 'decore' | 'incertain';
// 'oui'   = needs electricity to operate
// 'non'   = no electricity needed at all
// 'phone' = no, but would like to charge a phone occasionally
export type VendorElectricityNeed = 'oui' | 'non' | 'phone';

// Public-facing classification used by /marche to bucket vendors into
// three bands. `premium` is the gold-rim pavilion (internally "VIP"
// but never shown that way to the public), `marche` is the regular
// kiosk grid, `digital` is the online-only boutique. Only Jesse + admins
// see the tier label — vendors don't pick their own tier.
export type VendorTier = 'premium' | 'marche' | 'digital';

export interface VendorRefusalReasons {
  presets: string[];
  customText?: string;
  sentAt?: Timestamp;
}

export interface VendorChecklistItem {
  id: string;
  label: string;
  checkedByClient: boolean;
  checkedAt?: Timestamp;
}

export interface VendorApp {
  uid: string;
  email: string;
  displayName: string;
  kioskName: string;
  contact: string;
  category: string;        // e.g. "Cuir", "Bijoux", "Forge", "Restauration"…
  products: string;        // free-text description
  hasInsurance: boolean;
  needsElectricity: boolean;
  needsWater: boolean;
  spaceSize: string;       // e.g. "10x10", "10x20"
  websiteUrl?: string;
  status: VendorStatus;
  adminNotes?: string;
  year: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;

  // ── Google Form 2026 fields ──────────────────────────────────────
  companyName?: string;                      // nom de compagnie / entreprise
  description?: string;                      // métier / artisanat / produit
  socials?: string;                          // site / IG / FB / etc.
  logoUrl?: string;                          // transparent PNG, used on online kiosk
  mainPhotoUrl?: string;                     // hero photo for the online kiosk
  hasParticipatedBefore?: boolean;           // déjà exposant chez nous?
  phone?: string;                            // numéro téléphone
  teamSize?: string;                         // combien dans la partie
  familyVolunteerInterest?: string;          // qq'un de l'équipe veut être bénévole?
  kioskAppearance?: VendorKioskAppearance;   // moderne / médiévale / décoré / incertain
  kioskDimensions?: string;                  // dimensions en pieds carrés
  electricityNeed?: VendorElectricityNeed;   // aucun / léger / important
  wantsCampingSpot?: boolean;                // place pour tente / camping?
  regionOfOrigin?: string;                   // région / village
  firstTimeSource?: string;                  // si 1re inscription, comment nous avez-vous connus
  otherQuestions?: string;                   // autres questions / infos

  // ── Admin-curated display fields (drive the public /marche page) ──
  // `tier` decides which band the vendor shows up in. Admins (Jesse)
  // change this from the CRM Marchands tab — it has no client-facing
  // form. Defaults to 'marche' when unset.
  tier?:        VendorTier;
  featured?:    boolean;                     // pin to top of its band
  bioFR?:       string;                      // long FR description shown on /marche
  bioEN?:       string;                      // long EN description shown on /marche
  heroImage?:   string;                      // /public path used by /marche
  publicHref?:  string;                      // external link from the public card
  promoCode?:   string;                      // for digital boutique reveal

  // ── Post-acceptance ("merchant prep") ────────────────────────────
  paymentLink?: string;                      // Zeffy URL set by admin
  paymentStatus?: 'unpaid' | 'paid';
  paidAt?: Timestamp;
  fridayArrivalTime?: string;                // e.g. "14:30"
  campingTentSize?: string;                  // e.g. "3m x 3m"
  campingNeeds?: string;                     // free-text camping needs
  documentReadConfirmed?: boolean;           // "I really read the doc" checkbox
  checklist?: VendorChecklistItem[];

  // ── Refusal ──────────────────────────────────────────────────────
  refusalReasons?: VendorRefusalReasons;
}

// ── Profile ────────────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function upsertUserProfile(p: UserProfile): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await setDoc(
    doc(db, 'users', p.uid),
    { ...stripUndefined(p as unknown as Record<string, unknown>), updatedAt: serverTimestamp(), createdAt: p.createdAt || serverTimestamp() },
    { merge: true },
  );
}

// Add a flag to the user profile if it isn't already present. Idempotent:
// re-submitting the vendor form a second time won't create duplicates.
export async function addUserFlag(uid: string, flag: UserFlag): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const current = (snap.exists() ? (snap.data() as UserProfile).flags : undefined) || [];
  if (current.includes(flag)) return;
  await setDoc(
    ref,
    { flags: [...current, flag], updatedAt: serverTimestamp() },
    { merge: true },
  );
}

// ── Bénévole ───────────────────────────────────────────────────────
export async function getBenevoleApp(uid: string): Promise<BenevoleApp | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'benevoles', uid));
  return snap.exists() ? (snap.data() as BenevoleApp) : null;
}

export async function upsertBenevoleApp(app: BenevoleApp): Promise<void> {
  if (!db) throw new Error('Firestore not configured — vérifiez .env.local');
  const payload = {
    ...stripUndefined(app as unknown as Record<string, unknown>),
    updatedAt: serverTimestamp(),
    createdAt: app.createdAt || serverTimestamp(),
  };
  // 20s timeout: if the write doesn't resolve by then it's stuck (offline,
  // permission denied silently, or Firestore SDK hung) — surface it as an
  // error instead of hanging the UI. The local cache may still settle later.
  try {
    await withTimeout(
      setDoc(doc(db, 'benevoles', app.uid), payload, { merge: true }),
      20_000,
      'upsertBenevoleApp',
    );
  } catch (err) {
    console.error('[upsertBenevoleApp] write failed', { uid: app.uid, err });
    throw err;
  }
}

// Capped read — passes through `pageSize` so callers can shrink the
// window. We don't yet expose cursor-based pagination because the admin
// list view still renders everything client-side, but the limit alone
// kills the unbounded-read bill as the collection grows.
export async function listBenevoles(pageSize = 500): Promise<BenevoleApp[]> {
  if (!db) return [];
  const q = query(
    collection(db, 'benevoles'),
    orderBy('createdAt', 'desc'),
    fsLimit(pageSize),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as BenevoleApp);
}

export async function setBenevoleStatus(uid: string, status: AppStatus, adminNotes?: string): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await updateDoc(doc(db, 'benevoles', uid), {
    status,
    ...(adminNotes !== undefined ? { adminNotes } : {}),
    updatedAt: serverTimestamp(),
  });
}

// Assign / unassign a bénévole on a team. Pass teamId=null to unassign.
export async function setBenevoleTeam(
  uid: string,
  teamId: string | null,
  role: BenevoleTeamRole | null,
): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await updateDoc(doc(db, 'benevoles', uid), {
    teamId:   teamId ?? null,
    teamRole: role   ?? null,
    updatedAt: serverTimestamp(),
  });
}

// ── Vendor ─────────────────────────────────────────────────────────
// Path: vendors/{uid}/years/{year}.  One application doc per merchant per year.
// `listVendors` uses a collectionGroup query across all years.
const vendorYearDoc = (uid: string, year: number) =>
  doc(db!, 'vendors', uid, 'years', String(year));

export async function getVendorApp(uid: string, year: number = CURRENT_YEAR): Promise<VendorApp | null> {
  if (!db) return null;
  const snap = await getDoc(vendorYearDoc(uid, year));
  return snap.exists() ? (snap.data() as VendorApp) : null;
}

export async function upsertVendorApp(app: VendorApp): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await setDoc(
    vendorYearDoc(app.uid, app.year),
    { ...stripUndefined(app as unknown as Record<string, unknown>), updatedAt: serverTimestamp(), createdAt: app.createdAt || serverTimestamp() },
    { merge: true },
  );
}

export async function listVendors(pageSize = 500): Promise<VendorApp[]> {
  if (!db) return [];
  const q = query(
    collectionGroup(db, 'years'),
    orderBy('createdAt', 'desc'),
    fsLimit(pageSize),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as VendorApp);
}

export async function setVendorStatus(uid: string, year: number, status: VendorStatus, adminNotes?: string): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await updateDoc(vendorYearDoc(uid, year), {
    status,
    ...(adminNotes !== undefined ? { adminNotes } : {}),
    updatedAt: serverTimestamp(),
  });
}

// Re-invite a known merchant for a new year by copying last year's answers
// and resetting status/year-specific fields. Pre-fills the form for them
// when they sign in — they review and resubmit.
export async function reinviteVendor(uid: string, fromYear: number, toYear: number): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  const prev = await getVendorApp(uid, fromYear);
  if (!prev) throw new Error(`No vendor record for ${uid} in ${fromYear}`);
  const fresh: VendorApp = {
    ...prev,
    year:                  toYear,
    status:                'pending',
    adminNotes:            undefined,
    paymentLink:           undefined,
    paymentStatus:         'unpaid',
    paidAt:                undefined,
    fridayArrivalTime:     undefined,
    documentReadConfirmed: false,
    checklist:             undefined,
    refusalReasons:        undefined,
    createdAt:             undefined,
    updatedAt:             undefined,
  };
  await setDoc(vendorYearDoc(uid, toYear), {
    ...fresh,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Real-time subscription to accepted vendors for a given year. Used by
// the public approved-vendors list under the registration form so the
// page updates without a reload as Jesse accepts new applications.
export function subscribeAcceptedVendors(
  year: number,
  cb: (rows: VendorApp[]) => void,
): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(
    collectionGroup(db, 'years'),
    where('year', '==', year),
    where('status', '==', 'accepted'),
    fsLimit(200),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as VendorApp)),
    (err) => { console.warn('[vendors] subscribe failed', err); cb([]); },
  );
}
