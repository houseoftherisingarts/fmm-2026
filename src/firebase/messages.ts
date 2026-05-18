// Person ↔ admin messaging.
// Single thread per person — not year-bound, since the conversation
// outlives the application cycle. Threads are namespaced by `kind`:
//   • vendor   → vendors/{uid}/messages/{autoId}
//   • benevole → benevoles/{uid}/messages/{autoId}

import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type ThreadKind  = 'vendor' | 'benevole';
export type MessageRole = 'vendor' | 'benevole' | 'admin';

/** Message variant — `chat` is the default conversational message;
    `invitation` is a branded, structured invitation rendered as a card
    in the recipient's client space (sent yearly by Jesse). */
export type MessageKind = 'chat' | 'invitation';

/** Structured payload attached to invitation messages. Plain chat
    messages don't set this. */
export interface InvitationMeta {
  /** Cohort year this invitation targets (e.g. 2027). */
  year:      number;
  /** Display title shown at the top of the invitation card. */
  title:     string;
  /** Optional eyebrow text shown above the title. */
  eyebrow?:  string;
  /** Optional CTA label — pairs with `ctaHref`. */
  ctaLabel?: string;
  /** Optional CTA target URL (typically the apply form for that year). */
  ctaHref?:  string;
  /** Optional signature line — defaults to the sender's name. */
  signedBy?: string;
}

export interface VendorMessage {
  id?: string;
  senderUid:  string;
  senderRole: MessageRole;
  senderName: string;
  body:       string;
  /** Defaults to `chat` when absent. Set to `invitation` for branded
      yearly invitations. */
  kind?:      MessageKind;
  /** Present only when `kind === 'invitation'`. */
  meta?:      InvitationMeta;
  createdAt?: Timestamp;
}

const ROOT: Record<ThreadKind, string> = {
  vendor:   'vendors',
  benevole: 'benevoles',
};

const threadCol = (kind: ThreadKind, uid: string) =>
  db ? collection(db, ROOT[kind], uid, 'messages') : null;

// Realtime subscription. Returns the unsubscribe fn (no-op if Firestore
// isn't configured or the uid is a mock-uid).
export function subscribeMessages(
  uid: string,
  cb: (msgs: VendorMessage[]) => void,
  kind: ThreadKind = 'vendor',
): () => void {
  if (!db || uid.startsWith('mock-')) { cb([]); return () => {}; }
  const col = threadCol(kind, uid);
  if (!col) { cb([]); return () => {}; }
  const q = query(col, orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VendorMessage, 'id'>) }))),
    (err) => { console.warn('[messages] subscribe failed', err); cb([]); },
  );
}

export async function sendMessage(
  uid: string,
  msg: Omit<VendorMessage, 'id' | 'createdAt'>,
  kind: ThreadKind = 'vendor',
): Promise<void> {
  if (uid.startsWith('mock-')) {
    console.info('[messages] mock uid — write skipped');
    return;
  }
  const col = threadCol(kind, uid);
  if (!col) throw new Error('Firestore not configured');
  if (!msg.body.trim()) return;
  await addDoc(col, { ...msg, createdAt: serverTimestamp() });
}

/**
 * Fan-out an `invitation`-kind message to many recipients at once.
 * Returns the per-recipient result so the caller can show which sends
 * succeeded vs. failed. Mock UIDs (admin previews / seed data) are
 * skipped with a soft success.
 */
export interface InvitationSendResult {
  uid:      string;
  ok:       boolean;
  error?:   string;
  skipped?: boolean;
}
export async function sendInvitations(
  recipients: { uid: string }[],
  msg: Omit<VendorMessage, 'id' | 'createdAt' | 'kind'> & { meta: InvitationMeta },
  kind: ThreadKind = 'vendor',
): Promise<InvitationSendResult[]> {
  const results: InvitationSendResult[] = [];
  for (const r of recipients) {
    try {
      if (r.uid.startsWith('mock-')) {
        results.push({ uid: r.uid, ok: true, skipped: true });
        continue;
      }
      await sendMessage(r.uid, { ...msg, kind: 'invitation' }, kind);
      results.push({ uid: r.uid, ok: true });
    } catch (err) {
      results.push({
        uid: r.uid,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}
