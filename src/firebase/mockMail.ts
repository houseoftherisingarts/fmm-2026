// In-memory mock for the internal mail service. Used in DEV_BYPASS so
// the admin Mail tab and the public contact form work offline. Seeded
// with two realistic public messages and one transferred message.

import type { MailMessage, MailRecipient } from './mail';

let NEXT_ID = 1000;
const newId = () => `mock-mail-${++NEXT_ID}`;

function recipientMatch(message: MailMessage, recipient: MailRecipient): boolean {
  if (recipient.type !== message.recipient.type) return false;
  if (recipient.type === 'department' && message.recipient.type === 'department') {
    return recipient.departmentId === message.recipient.departmentId;
  }
  if (recipient.type === 'admin' && message.recipient.type === 'admin') {
    return recipient.adminEmail.toLowerCase() === message.recipient.adminEmail.toLowerCase();
  }
  return false;
}

const STORE: MailMessage[] = [
  {
    id: 'mock-mail-1',
    threadId: 'mock-mail-1',
    kind: 'incoming',
    recipient: { type: 'department', departmentId: 'kiosques' },
    fromEmail: 'forge.de.lhydromel@example.com',
    fromName: 'Aldebaran le Forgeron',
    fromAdmin: false,
    subject: 'Demande de kiosque 2026',
    body:
      'Bonjour Jesse,\n\n' +
      'Je suis forgeron itinérant et j’aimerais réserver un kiosque pour l’édition 2026. J’apporte mon enclume.\n\n' +
      'Cordialement,\nAldebaran',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
  {
    id: 'mock-mail-2',
    threadId: 'mock-mail-2',
    kind: 'incoming',
    recipient: { type: 'department', departmentId: 'programmation' },
    fromEmail: 'troupe.skarazula@example.com',
    fromName: 'Skarazula',
    fromAdmin: false,
    subject: 'Disponibilités samedi soir',
    body:
      'Allô Tristan,\n\nNous serions ravis de revenir au festival. Le créneau du samedi 21h vous convient toujours ?\n\nMerci !\nSkarazula',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'mock-mail-3',
    threadId: 'mock-mail-3',
    kind: 'incoming',
    recipient: { type: 'department', departmentId: 'benevoles' },
    fromEmail: 'martin.dube@example.com',
    fromName: 'Martin Dubé',
    fromAdmin: false,
    subject: 'Bénévole pour l’accueil',
    body: 'Bonjour Maité, j’aimerais m’inscrire pour aider à l’accueil. Disponible samedi et dimanche. Merci !',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'mock-mail-4',
    threadId: 'mock-mail-2',
    kind: 'transfer',
    recipient: { type: 'admin', adminEmail: 'tristan@example.com' },
    fromEmail: 'dev@local',
    fromName: 'Dev (bypass)',
    fromAdmin: true,
    fromAdminUid: 'mock-super-uid',
    transferredFrom: { adminUid: 'mock-super-uid', adminEmail: 'dev@local' },
    subject: 'Disponibilités samedi soir',
    body: 'Tristan, je te passe ça — tu es plus au courant des créneaux scène.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  },
];

const LISTENERS = new Set<{ recipient: MailRecipient; cb: (items: MailMessage[]) => void }>();

function notify(): void {
  for (const { recipient, cb } of LISTENERS) {
    cb(STORE.filter((m) => recipientMatch(m, recipient)).sort(byDateDesc));
  }
}

function byDateDesc(a: MailMessage, b: MailMessage): number {
  const as = typeof a.createdAt === 'string' ? a.createdAt : '';
  const bs = typeof b.createdAt === 'string' ? b.createdAt : '';
  return bs.localeCompare(as);
}

export async function mockListInbox(recipient: MailRecipient): Promise<MailMessage[]> {
  return STORE.filter((m) => recipientMatch(m, recipient)).sort(byDateDesc);
}

export function mockWatchInbox(
  recipient: MailRecipient,
  cb: (items: MailMessage[]) => void,
): () => void {
  const entry = { recipient, cb };
  LISTENERS.add(entry);
  cb(STORE.filter((m) => recipientMatch(m, recipient)).sort(byDateDesc));
  return () => { LISTENERS.delete(entry); };
}

export async function mockSendMessage(args: {
  recipient: MailRecipient;
  fromEmail: string;
  fromName:  string;
  subject:   string;
  body:      string;
}): Promise<string> {
  const id = newId();
  STORE.push({
    id,
    threadId: id,
    kind: 'incoming',
    recipient: args.recipient,
    fromEmail: args.fromEmail,
    fromName: args.fromName,
    fromAdmin: false,
    subject: args.subject,
    body: args.body,
    read: false,
    createdAt: new Date().toISOString(),
  });
  notify();
  return id;
}

export async function mockReplyToMessage(args: {
  threadId:    string;
  recipient:   MailRecipient;
  fromEmail:   string;
  fromName:    string;
  fromAdminUid: string;
  subject:     string;
  body:        string;
}): Promise<string> {
  const id = newId();
  STORE.push({
    id,
    threadId: args.threadId,
    kind: 'reply',
    recipient: args.recipient,
    fromEmail: args.fromEmail,
    fromName: args.fromName,
    fromAdmin: true,
    fromAdminUid: args.fromAdminUid,
    subject: args.subject,
    body: args.body,
    read: false,
    createdAt: new Date().toISOString(),
  });
  notify();
  return id;
}

export async function mockTransferMessage(args: {
  threadId:    string;
  recipient:   MailRecipient;
  fromEmail:   string;
  fromName:    string;
  fromAdminUid: string;
  subject:     string;
  body:        string;
}): Promise<string> {
  const id = newId();
  STORE.push({
    id,
    threadId: args.threadId,
    kind: 'transfer',
    recipient: args.recipient,
    fromEmail: args.fromEmail,
    fromName: args.fromName,
    fromAdmin: true,
    fromAdminUid: args.fromAdminUid,
    transferredFrom: { adminUid: args.fromAdminUid, adminEmail: args.fromEmail },
    subject: args.subject,
    body: args.body,
    read: false,
    createdAt: new Date().toISOString(),
  });
  notify();
  return id;
}

export async function mockMarkRead(messageId: string, read: boolean = true): Promise<void> {
  const m = STORE.find((x) => x.id === messageId);
  if (m) m.read = read;
  notify();
}
