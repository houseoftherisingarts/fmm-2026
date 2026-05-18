// Typed Firestore CRUD for musician/band applications. Mirrors the
// vendor pattern in applications.ts — one doc per (uid, year) so a
// band can have multi-year history. Owned by Pitch / Eric Pichette
// in the admin CRM (Musique tab).
//
// Path: musicians/{uid}/years/{year}
// Collection-group queries scan all years for the admin list.

import {
  doc, getDoc, setDoc, getDocs, query, updateDoc,
  serverTimestamp, collectionGroup, onSnapshot, where,
  limit as fsLimit, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { CURRENT_YEAR, type AppStatus } from './applications';

export type MusicianStatus = AppStatus | 'waitlist';

// ── Form vocabulary ────────────────────────────────────────────────
export type StagePref     = 'small' | 'medium' | 'main' | 'roving' | 'fire-circle';
export type SetLength     = '15-30' | '30-45' | '45-60' | '60-90' | '90+';
export type PowerNeed     = 'none' | 'phone-charge' | 'one-circuit' | 'multiple-circuits' | 'three-phase';
export type SoundProvided = 'fully-acoustic' | 'we-bring-pa' | 'need-fmm-pa' | 'partial';
export type PerformerCount = 'solo' | 'duo' | 'trio' | '4-5' | '6-8' | '9+';
export type DayAvailability = 'vendredi' | 'samedi' | 'dimanche';
export type LightingNeed  = 'daylight-ok' | 'basic-stage-light' | 'theatrical' | 'fire-only';
export type Genre         = 'folk' | 'medieval' | 'celtic' | 'baroque' | 'nordic-viking'
                          | 'balfolk' | 'ballad' | 'oriental' | 'pagan-trance' | 'other';

export interface MusicianApp {
  uid:    string;
  email:  string;
  year:   number;
  status: MusicianStatus;

  // ── Contact / band identity ──────────────────────────────────────
  bandName:        string;
  contactName:     string;          // primary contact (booker)
  contactRole?:    string;          // "manager", "leader", "agent" — free text
  phone:           string;
  altEmail?:       string;
  website?:        string;          // any URL (band site, Bandcamp, Linktree)
  spotify?:        string;
  socials?:        string;          // free-form: IG / FB / TikTok handles

  // ── Programme blurb ──────────────────────────────────────────────
  shortBio:        string;          // 1-2 paragraphs for the public lineup
  genres:          Genre[];
  genresOther?:    string;          // when "other" is checked
  performerCount:  PerformerCount;
  performerCountOther?: string;     // free text if "9+"
  performerNames?: string;          // optional roster

  // ── Performance preferences ──────────────────────────────────────
  daysAvailable:   DayAvailability[];
  preferredStage:  StagePref;
  preferredStageOther?: string;     // when undecided / negotiable
  setLength:       SetLength;
  numberOfSets:    number;          // 1, 2, 3...
  willingToRove?:  boolean;         // strolling between stages
  willingToCollab?:boolean;         // jam with other bands
  fireSafeRepertoire?: boolean;     // OK to play around fire circle

  // ── Technical needs ──────────────────────────────────────────────
  soundProvided:   SoundProvided;
  inputList?:      string;          // free-form: "4 mics, 2 DIs, 1 in-ear cue..."
  monitorsNeeded?: number;          // count
  ownsBackline?:   boolean;
  backlineNotes?:  string;          // "we bring drum kit", "need bass cab"
  powerNeed:       PowerNeed;
  powerNotes?:     string;          // specific gear watts, generator OK?
  lightingNeed:    LightingNeed;
  weatherDependent?: boolean;       // acoustic instruments that hate rain

  // ── Logistics ────────────────────────────────────────────────────
  travelingFrom:   string;          // city / region
  needsLodging?:   boolean;
  needsMeals?:     boolean;
  vehicleCount?:   number;
  loadInWindow?:   string;          // "we can arrive 14h-16h Friday"
  accessibilityNeeds?: string;      // mobility, hearing, etc.

  // ── Money / contracts ────────────────────────────────────────────
  feeExpectation?: string;          // free text — let Pitch read context
  hasContract?:    boolean;
  contractNotes?:  string;
  invoiceEntity?:  string;          // company / sole prop name on invoice

  // ── Open-ended ───────────────────────────────────────────────────
  whyFMM?:         string;          // what draws you here
  specialRequests?:string;          // anything else Pitch should know

  // ── Admin-set ────────────────────────────────────────────────────
  adminNotes?:     string;
  refusalReasons?: string;

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Drop undefined keys before writing (Firestore rejects them).
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && Object.getPrototypeOf(v) === Object.prototype;
const stripUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    const v = obj[k];
    if (v === undefined) continue;
    if (isPlainObject(v)) out[k] = stripUndefined(v) as T[keyof T];
    else                  out[k] = v as T[keyof T];
  }
  return out;
};

const musicianYearDoc = (uid: string, year: number) =>
  doc(db!, 'musicians', uid, 'years', String(year));

export async function getMusicianApp(uid: string, year: number = CURRENT_YEAR): Promise<MusicianApp | null> {
  if (!db) return null;
  const snap = await getDoc(musicianYearDoc(uid, year));
  return snap.exists() ? (snap.data() as MusicianApp) : null;
}

export async function upsertMusicianApp(app: MusicianApp): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await setDoc(
    musicianYearDoc(app.uid, app.year),
    {
      ...stripUndefined(app as unknown as Record<string, unknown>),
      updatedAt: serverTimestamp(),
      createdAt: app.createdAt || serverTimestamp(),
    },
    { merge: true },
  );
}

export async function listMusicians(pageSize = 500): Promise<MusicianApp[]> {
  if (!db) return [];
  const q = query(
    collectionGroup(db, 'years'),
    where('bandName', '!=', ''),
    fsLimit(pageSize),
  );
  // ↑ filter by `bandName` so we only get musician docs (vendor docs in the
  // same collection-group don't have that field). orderBy can't follow a
  // != filter on the same field without a composite index, so we sort
  // client-side after fetch.
  const snap = await getDocs(q);
  const rows = snap.docs
    .map((d) => d.data() as MusicianApp)
    .filter((r) => typeof r.bandName === 'string');
  rows.sort((a, b) => {
    const ta = (a.createdAt as Timestamp | undefined)?.toMillis?.() ?? 0;
    const tb = (b.createdAt as Timestamp | undefined)?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return rows;
}

export async function setMusicianStatus(uid: string, year: number, status: MusicianStatus, adminNotes?: string): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await updateDoc(musicianYearDoc(uid, year), {
    status,
    ...(adminNotes !== undefined ? { adminNotes } : {}),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeAcceptedMusicians(
  year: number,
  cb: (rows: MusicianApp[]) => void,
): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(
    collectionGroup(db, 'years'),
    where('year',   '==', year),
    where('status', '==', 'accepted'),
    where('bandName', '!=', ''),
    fsLimit(200),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as MusicianApp)),
    (err)  => { console.warn('[musicians] subscribe failed', err); cb([]); },
  );
}
