// ─── Festival schedule — Firestore CRUD ─────────────────────────────
// One doc per year at `schedule/{year}` holding an ordered array of
// days, each with its own items. The admin Horaire section writes to
// this doc; ActivitesPage subscribes to it for the public site.
//
// We keep the doc shape simple (a single document, no subcollection)
// so admins can write the entire schedule in one transaction — easy
// to reason about, easy to roll back.

import {
  doc, getDoc, setDoc, onSnapshot, serverTimestamp,
  type DocumentSnapshot, type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface ScheduleItem {
  time:  string;   // "17h00" or "17h00–18h30"
  label: string;
  where: string;
}

export interface ScheduleDay {
  id:     string;       // "vendredi" | "samedi" | "dimanche" (stable handle)
  dateFR: string;       // "Vendredi 25 septembre"
  dateEN: string;       // "Friday September 25"
  items:  ScheduleItem[];
}

export interface ScheduleDoc {
  year:        number;
  days:        ScheduleDay[];
  updatedAt:   unknown;     // serverTimestamp on read
  updatedBy?:  string;      // uid of the admin who last saved
  updatedByEmail?: string;
}

export const CURRENT_SCHEDULE_YEAR = 2026;

const COL = 'schedule';
const docId = (year: number) => String(year);

function fromSnap(snap: DocumentSnapshot<DocumentData>): ScheduleDoc | null {
  if (!snap.exists()) return null;
  return snap.data() as ScheduleDoc;
}

export async function getSchedule(year: number = CURRENT_SCHEDULE_YEAR): Promise<ScheduleDoc | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COL, docId(year)));
  return fromSnap(snap);
}

// Live listener — public site uses this so a save in the admin shows
// up on /activites instantly (no rebuild, no F5).
export function watchSchedule(
  year: number,
  cb: (schedule: ScheduleDoc | null) => void,
): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(
    doc(db, COL, docId(year)),
    (snap) => cb(fromSnap(snap)),
    (err) => {
      console.warn('[schedule] watch error:', err);
      cb(null);
    },
  );
}

export async function setSchedule(
  days: ScheduleDay[],
  meta: { uid: string; email: string; year?: number },
): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const year = meta.year ?? CURRENT_SCHEDULE_YEAR;
  await setDoc(doc(db, COL, docId(year)), {
    year,
    days,
    updatedAt: serverTimestamp(),
    updatedBy: meta.uid,
    updatedByEmail: meta.email,
  }, { merge: true });
}

// ─── Bulk-text parser ───────────────────────────────────────────────
// Accepts a textarea where each non-empty line describes one event.
// Supported separators (any combination): pipe `|`, em-dash `—`,
// en-dash `–`, double-dash `--`, or " - " (space-dash-space). Order:
// TIME ⟨sep⟩ LABEL ⟨sep⟩ WHERE. Examples that all parse identically:
//   17h00 | Ouverture des portes | Site
//   17h00 — Ouverture des portes — Site
//   17h00 - Ouverture des portes - Site
// Lines starting with `#` are treated as comments and skipped.

const SEP_RE = /\s*[|—–]\s*|\s+-\s+|\s*--\s*/;

export function parseScheduleBlock(text: string): ScheduleItem[] {
  const out: ScheduleItem[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(SEP_RE).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue; // need at least time + label
    const [time, label, where] = [
      parts[0] ?? '',
      parts[1] ?? '',
      parts.slice(2).join(' · ') || '',   // glue any extra parts as the location
    ];
    out.push({ time, label, where });
  }
  return out;
}

// Inverse of parseScheduleBlock — used to seed the textarea from the
// stored items so admins see the same shape they pasted.
export function formatScheduleBlock(items: ScheduleItem[]): string {
  return items.map((it) => [it.time, it.label, it.where].filter(Boolean).join(' | ')).join('\n');
}
