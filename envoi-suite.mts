import { MODELES_CAMPAGNE } from './src/content/campagnes.ts';
import { rendreCampagne } from './src/lib/courrielCampagne.ts';
import nodemailer from './functions/node_modules/nodemailer/lib/nodemailer.js';
import admin from './functions/node_modules/firebase-admin/lib/index.js';
import crypto from 'node:crypto';
import fs from 'node:fs';

admin.initializeApp({ projectId: 'festivalmedieval' });
const db = admin.firestore();
const CLE = process.env.CAMPAGNE_CLE!;
const norm = (c: string) => String(c || '').trim().toLowerCase();
const lienDesab = (c: string) =>
  `https://us-central1-festivalmedieval.cloudfunctions.net/desabonnement?e=${encodeURIComponent(norm(c))}&j=${crypto.createHmac('sha256', CLE).update(norm(c)).digest('hex').slice(0, 32)}`;

function incorporer(html: string) {
  const pieces: any[] = []; const vues = new Map<string, string>();
  const neuf = html.replace(/src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|gif))"/gi, (_t, url) => {
    let cid = vues.get(url);
    if (!cid) { cid = `img${vues.size}@fmm`; vues.set(url, cid);
      pieces.push({ path: url, cid, filename: url.split('/').pop() }); }
    return `src="cid:${cid}"`; });
  return { html: neuf, pieces };
}

const liste: Array<{ courriel: string; nom: string }> = JSON.parse(fs.readFileSync('/tmp/liste-ordre.json', 'utf8'));
const DEJA = 25;                       // les 25 premiers sont partis au premier essai
const reste = liste.slice(DEJA);

// Le registre : une fiche par destinataire, pour qu'un second passage
// ne puisse jamais écrire deux fois à la même personne.
const reg = db.collection('campagnesEnvois');
const faits = new Set<string>();
for (const d of (await reg.where('modele', '==', 'invitation-2026').where('statut', '==', 'envoye').get()).docs) {
  faits.add(d.data().courriel);
}
for (const p of liste.slice(0, DEJA)) {
  if (!faits.has(p.courriel)) {
    await reg.doc(`invitation-2026__${p.courriel}`).set({
      modele: 'invitation-2026', courriel: p.courriel, statut: 'envoye',
      le: admin.firestore.FieldValue.serverTimestamp(), note: 'premier passage',
    });
    faits.add(p.courriel);
  }
}

const m = MODELES_CAMPAGNE.find((x) => x.id === 'invitation-2026')!;
const r = rendreCampagne(m, 'FR');
const t = nodemailer.createTransport({
  host: 'smtp.zohocloud.ca', port: 465, secure: true, pool: true, maxConnections: 1,
  auth: { user: 'admin@festivalmedievaldemontpellier.org', pass: process.env.ZOHO_PW! },
});

console.log('à envoyer :', reste.filter((p) => !faits.has(p.courriel)).length);
let ok = 0, ko = 0;
for (const p of reste) {
  if (faits.has(p.courriel)) continue;
  const prenom = p.nom ? ` ${p.nom.split(/\s+/)[0]}` : '';
  const lien = lienDesab(p.courriel);
  const brut = r.html.split('{{nom}}').join(prenom).split('{{desabonnement}}').join(lien);
  const { html, pieces } = incorporer(brut);
  let envoye = false;
  for (let essai = 0; essai < 3 && !envoye; essai += 1) {
    try {
      await t.sendMail({
        from: 'Festival Médiéval de Montpellier <admin@festivalmedievaldemontpellier.org>',
        to: p.courriel, subject: r.sujet, html, attachments: pieces,
        text: r.texte.split('{{nom}}').join(prenom).split('{{desabonnement}}').join(lien),
        headers: { 'List-Unsubscribe': `<${lien}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      });
      envoye = true;
    } catch (e: any) {
      if (essai === 2) { ko += 1; console.log('ECHEC', p.courriel, e.message.slice(0, 60)); }
      else { console.log('pause 6 min après', p.courriel); await new Promise((x) => setTimeout(x, 360_000)); }
    }
  }
  if (envoye) {
    ok += 1;
    await reg.doc(`invitation-2026__${p.courriel}`).set({
      modele: 'invitation-2026', courriel: p.courriel, statut: 'envoye',
      le: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(ok, 'envoyé ·', p.courriel);
  }
  await new Promise((x) => setTimeout(x, 45_000));
}
console.log('FINI · envoyés', ok, '· échecs', ko);
