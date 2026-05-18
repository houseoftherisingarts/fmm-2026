// ─── Internal mail service ──────────────────────────────────────────
// Public `/contact` form writes a doc into `mail/`; admins read those
// docs back in the Mail tab. Replies + transfers are also stored as
// `mail/` docs so each thread is a flat list of messages with the
// same `threadId`.
//
// Recipients are either a SHARED department mailbox (e.g. "kiosques")
// — visible to every admin who can access the Mail tab — or a SPECIFIC
// admin's PERSONAL mailbox (referenced by email, the same key the
// adminRoles collection uses). Transfers move a message into another
// admin's personal box without losing the original audit trail.

import {
  collection, doc, addDoc, getDocs, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, updateDoc, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type MailRecipient =
  | { type: 'department'; departmentId: string }
  | { type: 'admin';      adminEmail:   string };   // lowercased

export type MailKind = 'incoming' | 'reply' | 'transfer';

export interface MailMessage {
  id?:           string;
  /** Stable handle that groups a conversation. Initial public message
   *  uses its own id; replies + transfers reference it. */
  threadId:      string;
  kind:          MailKind;
  recipient:     MailRecipient;
  fromEmail:     string;
  fromName:      string;
  /** True iff `fromEmail` is an admin acting from inside the dashboard
   *  (sender uid in `fromAdminUid`). False for public contact-form
   *  submissions. */
  fromAdmin:     boolean;
  fromAdminUid?: string;
  subject:       string;
  body:          string;
  /** When kind === 'transfer', who passed it on. */
  transferredFrom?: { adminUid: string; adminEmail: string };
  read:          boolean;
  createdAt:     Timestamp | unknown;
}

const COL = 'mail';

// ─── List queries ──────────────────────────────────────────────────
// Each mailbox is just a filter on the recipient field. Listening with
// onSnapshot keeps the admin UI live as new mail lands.

function recipientMatchesQueryFields(recipient: MailRecipient) {
  return recipient.type === 'department'
    ? { recipientType: 'department', recipientId: recipient.departmentId }
    : { recipientType: 'admin',      recipientId: recipient.adminEmail.toLowerCase() };
}

export function watchInbox(
  recipient: MailRecipient,
  cb: (items: MailMessage[]) => void,
): () => void {
  if (!db) { cb([]); return () => {}; }
  const { recipientType, recipientId } = recipientMatchesQueryFields(recipient);
  const q = query(
    collection(db, COL),
    where('recipientType', '==', recipientType),
    where('recipientId',   '==', recipientId),
    orderBy('createdAt', 'desc'),
    limit(200),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: MailMessage[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as MailMessage) }));
      cb(items);
    },
    (err) => {
      console.warn('[mail] watchInbox error:', err);
      cb([]);
    },
  );
}

export async function listInbox(recipient: MailRecipient): Promise<MailMessage[]> {
  if (!db) return [];
  const { recipientType, recipientId } = recipientMatchesQueryFields(recipient);
  const q = query(
    collection(db, COL),
    where('recipientType', '==', recipientType),
    where('recipientId',   '==', recipientId),
    orderBy('createdAt', 'desc'),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as MailMessage) }));
}

// ─── Send / reply / transfer ───────────────────────────────────────

interface SendArgs {
  recipient: MailRecipient;
  fromEmail: string;
  fromName:  string;
  subject:   string;
  body:      string;
}

export async function sendMessage(args: SendArgs): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  const { recipientType, recipientId } = recipientMatchesQueryFields(args.recipient);
  const ref = await addDoc(collection(db, COL), {
    threadId:      '',   // patched below — see updateDoc
    kind:          'incoming' as MailKind,
    recipient:     args.recipient,
    recipientType,
    recipientId,
    fromEmail:     args.fromEmail,
    fromName:      args.fromName,
    fromAdmin:     false,
    subject:       args.subject,
    body:          args.body,
    read:          false,
    createdAt:     serverTimestamp(),
  });
  // Use the doc id as the threadId so future replies/transfers can
  // hang off this same conversation.
  await updateDoc(ref, { threadId: ref.id });
  return ref.id;
}

interface AdminMessageArgs {
  threadId:   string;
  recipient:  MailRecipient;
  fromEmail:  string;        // admin email
  fromName:   string;        // admin display name
  fromAdminUid: string;
  subject:    string;
  body:       string;
}

export async function replyToMessage(args: AdminMessageArgs): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  const { recipientType, recipientId } = recipientMatchesQueryFields(args.recipient);
  const ref = await addDoc(collection(db, COL), {
    threadId:      args.threadId,
    kind:          'reply' as MailKind,
    recipient:     args.recipient,
    recipientType,
    recipientId,
    fromEmail:     args.fromEmail,
    fromName:      args.fromName,
    fromAdmin:     true,
    fromAdminUid:  args.fromAdminUid,
    subject:       args.subject,
    body:          args.body,
    read:          false,
    createdAt:     serverTimestamp(),
  });
  return ref.id;
}

export async function transferMessage(args: AdminMessageArgs): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  const { recipientType, recipientId } = recipientMatchesQueryFields(args.recipient);
  const ref = await addDoc(collection(db, COL), {
    threadId:      args.threadId,
    kind:          'transfer' as MailKind,
    recipient:     args.recipient,
    recipientType,
    recipientId,
    fromEmail:     args.fromEmail,
    fromName:      args.fromName,
    fromAdmin:     true,
    fromAdminUid:  args.fromAdminUid,
    subject:       args.subject,
    body:          args.body,
    transferredFrom: { adminUid: args.fromAdminUid, adminEmail: args.fromEmail },
    read:          false,
    createdAt:     serverTimestamp(),
  });
  return ref.id;
}

export async function markRead(messageId: string, read: boolean = true): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, messageId), { read });
}
