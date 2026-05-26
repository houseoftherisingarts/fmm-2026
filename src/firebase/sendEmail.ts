// ─── Outgoing email helper ─────────────────────────────────────────
// Front for the "Trigger Email from Firestore" Firebase Extension.
// Writing a doc to the `mail-out` collection makes the extension pick
// it up and send the email via the configured SMTP provider.
//
// ── ONE-TIME SETUP (Firebase console) ─────────────────────────────
//   1. console.firebase.google.com → festivalmedieval → Extensions
//   2. Install "Trigger Email from Firestore" (firebase/firestore-send-email)
//   3. SMTP connection URI — example for SendGrid:
//        smtps://apikey:<SENDGRID_API_KEY>@smtp.sendgrid.net:465
//   4. Email documents collection: mail-out
//   5. Default FROM address: admin@festivalmedievaldemontpellier.org
//   6. Default REPLY-TO: admin@festivalmedievaldemontpellier.org
//
// ── USAGE ─────────────────────────────────────────────────────────
//   import { sendEmail } from './firebase/sendEmail';
//   await sendEmail({
//     to:      'destinataire@example.com',
//     subject: 'Confirmation de votre inscription',
//     html:    '<p>Bonjour,</p><p>…</p>',
//   });
//
// Returns the queued doc id on success, or null if Firebase isn't
// configured / the write failed. Never throws — silent in dev mode.

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface SendEmailInput {
  to:        string | string[];
  subject:   string;
  text?:     string;
  html?:     string;
  cc?:       string | string[];
  bcc?:      string | string[];
  replyTo?:  string;
  /** Optional override of the extension-default FROM address. */
  from?:     string;
}

const QUEUE = 'mail-out';

export async function sendEmail(input: SendEmailInput): Promise<string | null> {
  if (!db) {
    console.info('[sendEmail] Firebase not configured — skipped.');
    return null;
  }
  try {
    const ref = await addDoc(collection(db, QUEUE), {
      to: input.to,
      ...(input.cc      ? { cc:      input.cc }      : {}),
      ...(input.bcc     ? { bcc:     input.bcc }     : {}),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(input.from    ? { from:    input.from }    : {}),
      message: {
        subject: input.subject,
        ...(input.text ? { text: input.text } : {}),
        ...(input.html ? { html: input.html } : {}),
      },
      queuedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    console.warn('[sendEmail] Failed to queue:', e);
    return null;
  }
}
