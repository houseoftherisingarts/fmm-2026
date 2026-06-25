// ─── Bug reports · Firestore CRUD + email notify ───────────────────
// Public "Signaler un bug" footer form writes here (create-only for
// visitors); admins read + manage them in the Bugs tab. On submit we
// also best-effort queue an email copy to the festival inbox via the
// `mail-out` Trigger-Email queue (sendEmail).
//
// Collection: `bugReports/{id}`. Flat, same shape as the other
// public-create inquiry collections (newsletter, contacts, behourd).

import {
  addDoc, collection, deleteDoc, doc, getDocs, orderBy, query,
  serverTimestamp, updateDoc, limit as fsLimit,
  type DocumentData, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { sendEmail } from './sendEmail';

// Where the email copy lands. This exact list is locked by the scoped
// `mail-out` Firestore rule that lets the public bug form queue this one
// email. Changing these addresses (or their order) means updating that
// rule too (firestore.rules → mail-out create lane).
const NOTIFY_TO = [
  'admin@festivalmedievaldemontpellier.org',
  'alex@lesalondesinconnus.com',
];

export type BugStatus   = 'nouveau' | 'en_cours' | 'resolu';
export type BugCategory =
  | 'affichage' | 'lien' | 'formulaire' | 'performance' | 'contenu' | 'autre';

export interface BugReportInput {
  category:    BugCategory;
  page:        string;        // where it happened (path or free text)
  description: string;        // what happened
  expected?:   string;        // what they expected instead
  email?:      string;        // optional contact for follow-up
  lang:        'FR' | 'EN';
  url?:        string;        // full URL at submit time
  userAgent?:  string;
  viewport?:   string;        // e.g. "390×844"
}

export interface BugReport extends BugReportInput {
  id:        string;
  status:    BugStatus;
  createdAt: unknown;
}

const COL = 'bugReports';

export const CATEGORY_LABELS: Record<BugCategory, { FR: string; EN: string }> = {
  affichage:   { FR: 'Affichage / mise en page', EN: 'Display / layout'     },
  lien:        { FR: 'Lien brisé',               EN: 'Broken link'          },
  formulaire:  { FR: 'Formulaire / bouton',      EN: 'Form / button'        },
  performance: { FR: 'Lenteur / chargement',     EN: 'Slowness / loading'   },
  contenu:     { FR: 'Texte / contenu',          EN: 'Text / content'       },
  autre:       { FR: 'Autre',                    EN: 'Other'                },
};

export const STATUS_LABELS: Record<BugStatus, { FR: string; EN: string }> = {
  nouveau:  { FR: 'Nouveau',  EN: 'New'         },
  en_cours: { FR: 'En cours', EN: 'In progress' },
  resolu:   { FR: 'Résolu',   EN: 'Resolved'    },
};

function fromSnap(snap: QueryDocumentSnapshot<DocumentData>): BugReport {
  const d = snap.data();
  return {
    id:          snap.id,
    category:    (d.category ?? 'autre') as BugCategory,
    page:        String(d.page ?? ''),
    description: String(d.description ?? ''),
    expected:    d.expected ? String(d.expected) : undefined,
    email:       d.email ? String(d.email) : undefined,
    lang:        d.lang === 'EN' ? 'EN' : 'FR',
    url:         d.url ? String(d.url) : undefined,
    userAgent:   d.userAgent ? String(d.userAgent) : undefined,
    viewport:    d.viewport ? String(d.viewport) : undefined,
    status:      (d.status ?? 'nouveau') as BugStatus,
    createdAt:   d.createdAt ?? null,
  };
}

// Public submit. Writes the report, then best-effort queues an email
// copy. The email never blocks (or fails) the submission; if the
// mail-out queue isn't writable for this visitor it just no-ops.
export async function addBugReport(input: BugReportInput): Promise<string | null> {
  if (!db) {
    console.info('[bugReports] Firebase not configured, skipped.');
    return null;
  }
  const ref = await addDoc(collection(db, COL), {
    category:    input.category,
    page:        input.page.trim(),
    description: input.description.trim(),
    ...(input.expected ? { expected: input.expected.trim() } : {}),
    ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
    lang:        input.lang,
    ...(input.url ? { url: input.url } : {}),
    ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    ...(input.viewport ? { viewport: input.viewport } : {}),
    status:      'nouveau' as BugStatus,
    createdAt:   serverTimestamp(),
  });
  void notifyByEmail(input, ref.id);
  return ref.id;
}

function notifyByEmail(input: BugReportInput, id: string): Promise<unknown> {
  const cat = CATEGORY_LABELS[input.category]?.FR ?? input.category;
  const lines = [
    `Catégorie : ${cat}`,
    `Page : ${input.page || '-'}`,
    `URL : ${input.url || '-'}`,
    '',
    'Description :',
    input.description || '-',
    ...(input.expected ? ['', 'Comportement attendu :', input.expected] : []),
    '',
    `Contact : ${input.email || 'non fourni'}`,
    `Appareil : ${input.viewport || '?'} · ${input.userAgent || '?'}`,
    '',
    `Réf : ${id}`,
  ];
  const html = `
    <div style="font-family:Georgia,serif;color:#1a1a1a;line-height:1.6">
      <h2 style="margin:0 0 4px">Nouveau signalement de bug</h2>
      <p style="margin:0 0 16px;color:#8a6a2a"><strong>${cat}</strong></p>
      <table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Page</td><td>${escapeHtml(input.page || '-')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">URL</td><td>${escapeHtml(input.url || '-')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">Description</td><td>${escapeHtml(input.description || '-').replace(/\n/g, '<br>')}</td></tr>
        ${input.expected ? `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">Attendu</td><td>${escapeHtml(input.expected).replace(/\n/g, '<br>')}</td></tr>` : ''}
        <tr><td style="padding:4px 12px 4px 0;color:#666">Contact</td><td>${escapeHtml(input.email || 'non fourni')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Appareil</td><td style="color:#999">${escapeHtml(input.viewport || '?')} · ${escapeHtml(input.userAgent || '?')}</td></tr>
      </table>
      <p style="margin:16px 0 0;color:#aaa;font-size:12px">Réf : ${id} · Consultable dans Admin → Bugs</p>
    </div>`;
  return sendEmail({
    to:      NOTIFY_TO,
    subject: `[Bug FMM] ${cat} · ${truncate(input.description, 60)}`,
    text:    lines.join('\n'),
    html,
    ...(input.email ? { replyTo: input.email.trim() } : {}),
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}
function truncate(s: string, n: number): string {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

// ─── Admin reads + management ──────────────────────────────────────

export async function listBugReports(max = 500): Promise<BugReport[]> {
  if (!db) return [];
  const snaps = await getDocs(query(
    collection(db, COL),
    orderBy('createdAt', 'desc'),
    fsLimit(max),
  ));
  return snaps.docs.map(fromSnap);
}

export async function setBugStatus(id: string, status: BugStatus): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, COL, id), { status });
}

export async function deleteBugReport(id: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, COL, id));
}
