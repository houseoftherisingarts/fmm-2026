import { MODELES_CAMPAGNE } from './src/content/campagnes.ts';
import { rendreCampagne } from './src/lib/courrielCampagne.ts';
import nodemailer from './functions/node_modules/nodemailer/lib/nodemailer.js';
import admin from './functions/node_modules/firebase-admin/lib/index.js';
import crypto from 'node:crypto';

admin.initializeApp({ projectId: 'festivalmedieval' });
const db = admin.firestore();
const CLE = process.env.CAMPAGNE_CLE!;
const norm = (c: string) => String(c || '').trim().toLowerCase();
const jeton = (c: string) => crypto.createHmac('sha256', CLE).update(norm(c)).digest('hex').slice(0, 32);
const lienDesab = (c: string) =>
  `https://us-central1-festivalmedieval.cloudfunctions.net/desabonnement?e=${encodeURIComponent(norm(c))}&j=${jeton(c)}`;

function incorporer(html: string) {
  const pieces: any[] = []; const vues = new Map<string, string>();
  const neuf = html.replace(/src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|gif))"/gi, (_t, url) => {
    let cid = vues.get(url);
    if (!cid) { cid = `img${vues.size}@fmm`; vues.set(url, cid);
      pieces.push({ path: url, cid, filename: url.split('/').pop() }); }
    return `src="cid:${cid}"`; });
  return { html: neuf, pieces };
}

const snap = await db.collection('clients').get();
const tous = snap.docs.map((d) => d.data() as any);
const en2026 = new Set(tous.filter((c) => c.annee === 2026).map((c) => norm(c.courriel)));
const desab = new Set((await db.collection('desabonnements').get()).docs.map((d) => d.id));
const cibles = new Map<string, { courriel: string; nom: string }>();
for (const c of tous) {
  const m = norm(c.courriel);
  if (!m || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) continue;
  if (c.annee === 2026 || en2026.has(m) || desab.has(m)) continue;
  if (!cibles.has(m)) cibles.set(m, { courriel: m, nom: String(c.nom || '').trim() });
}
const liste = [...cibles.values()];
console.log('destinataires :', liste.length);

const m = MODELES_CAMPAGNE.find((x) => x.id === 'invitation-2026')!;
const r = rendreCampagne(m, 'FR');
const t = nodemailer.createTransport({ host: 'smtp.zohocloud.ca', port: 465, secure: true,
  auth: { user: 'admin@festivalmedievaldemontpellier.org', pass: process.env.ZOHO_PW! } });

const trace = await db.collection('campagnes').add({
  modele: m.id, sujet: r.sujet, langue: 'FR', portee: 'Absents de 2026',
  destinataires: liste.length, envoyes: 0, echecs: 0,
  parQui: 'alex@lesalondesinconnus.com', statut: 'en cours',
  lanceLe: admin.firestore.FieldValue.serverTimestamp(),
});

let ok = 0, ko = 0;
for (const p of liste) {
  const prenom = p.nom ? ` ${p.nom.split(/\s+/)[0]}` : '';
  const lien = lienDesab(p.courriel);
  const brut = r.html.split('{{nom}}').join(prenom).split('{{desabonnement}}').join(lien);
  const { html, pieces } = incorporer(brut);
  try {
    await t.sendMail({
      from: 'Festival Médiéval de Montpellier <admin@festivalmedievaldemontpellier.org>',
      to: p.courriel, subject: r.sujet, html, attachments: pieces,
      text: r.texte.split('{{nom}}').join(prenom).split('{{desabonnement}}').join(lien),
      headers: { 'List-Unsubscribe': `<${lien}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
    ok += 1;
  } catch (e: any) { ko += 1; console.log('ECHEC', p.courriel, e.message); }
  if ((ok + ko) % 20 === 0) console.log(ok + ko, '/', liste.length);
  await new Promise((x) => setTimeout(x, 1300));
}
await trace.update({ envoyes: ok, echecs: ko, statut: 'envoyee',
  finiLe: admin.firestore.FieldValue.serverTimestamp() });
console.log('FINI · envoyés', ok, '· échecs', ko);
