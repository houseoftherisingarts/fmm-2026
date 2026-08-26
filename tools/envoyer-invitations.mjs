// ─── Reprise de l'invitation 2026, au compte-gouttes ─────────────────
// Zoho a coupé l'envoi de masse à 25 lettres le 23 août (« unusual
// sending activity »). Cet outil reprend la même lettre, pour la même
// liste, une adresse à la fois, avec une pause entre chaque envoi, et
// s'arrête au premier refus du serveur plutôt que de s'entêter.
//
//   node tools/envoyer-invitations.mjs --essai      (compte, n'envoie rien)
//   node tools/envoyer-invitations.mjs              (envoie, écrit le registre)
//
// Ce qu'il réutilise tel quel : le rendu de la lettre (src/lib), les
// mêmes jetons signés que les fonctions (désabonnement, pixel), la
// même trace de campagne (les ouvertures se comptent au même endroit),
// et le registre `campagnesEnvois` qui empêche d'écrire deux fois à
// la même personne.
//
// Les secrets se lisent dans deux fichiers protégés du scratchpad, jamais
// dans le dépôt : `.zoho_pw` et `.campagne_cle`.

import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readdirSync, readFileSync, appendFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..');
const PROJET = 'festivalmedieval';
const ANNEE = 2026;
const MODELE = 'invitation-2026';
const TRACE = 'hPlnNfaKgnDnXn1Y1Z0Q'.slice(0, 0) || null;   // posée plus bas, lue dans Firestore
const ZOHO_EMAIL = 'admin@festivalmedievaldemontpellier.org';
const FROM = `Festival Médiéval de Montpellier <${ZOHO_EMAIL}>`;
const URL_DESABONNEMENT = 'https://us-central1-festivalmedieval.cloudfunctions.net/desabonnement';
const URL_PIXEL = 'https://us-central1-festivalmedieval.cloudfunctions.net/pixel';
const PAUSE_MS = 40_000;           // quarante secondes entre deux lettres
const SECRETS = process.env.SECRETS_DIR || '/private/tmp/claude-501/-Users-lesalondesinconnus/979da46e-318c-48e3-9bd0-c9a7f4234293/scratchpad';
const JOURNAL = path.join(SECRETS, 'envoi-invitations.log');

const essai = process.argv.includes('--essai');
const log = (m) => { const l = `${new Date().toISOString().slice(11, 19)} ${m}`; console.log(l); appendFileSync(JOURNAL, l + '\n'); };

// ── Les identifiants Firestore ──────────────────────────────────────
function preparerIdentifiants() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return true;
  const dossier = path.join(homedir(), '.config', 'gcloud', 'legacy_credentials');
  if (existsSync(dossier)) for (const c of readdirSync(dossier)) {
    const adc = path.join(dossier, c, 'adc.json');
    if (existsSync(adc)) { process.env.GOOGLE_APPLICATION_CREDENTIALS = adc; return true; }
  }
  return false;
}
if (!preparerIdentifiants()) { console.error('Aucun identifiant gcloud.'); process.exit(1); }

const requireFonctions = createRequire(path.join(racine, 'functions', 'package.json'));
const admin = requireFonctions('firebase-admin');
const nodemailer = requireFonctions('nodemailer');
const prog = requireFonctions(path.join(racine, 'functions', 'programmation.js'));
admin.initializeApp({ projectId: PROJET, credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const normaliser = (c) => String(c || '').trim().toLowerCase();

// ── La lettre, rendue par le même code que la page d'admin ──────────
const sortie = path.join(mkdtempSync(path.join(tmpdir(), 'lettre-')), 'lettre.mjs');
await build({
  entryPoints: [path.join(racine, 'src', 'lib', 'courrielCampagne.ts')],
  bundle: true, format: 'esm', outfile: sortie, logLevel: 'warning',
  define: { 'import.meta.env': '{}' },
});
const lib = await import(sortie);
const contenu = await build({
  entryPoints: [path.join(racine, 'src', 'content', 'campagnes.ts')],
  bundle: true, format: 'esm', outfile: sortie.replace('lettre.mjs', 'campagnes.mjs'), logLevel: 'warning',
  define: { 'import.meta.env': '{}' },
}).then(() => import(sortie.replace('lettre.mjs', 'campagnes.mjs')));
const modeles = contenu.CAMPAGNES || contenu.default || Object.values(contenu).find(Array.isArray);
const modele = modeles.find((m) => m.id === MODELE);
if (!modele) { console.error('Modèle introuvable :', MODELE); process.exit(1); }
const { sujet, html, texte } = lib.rendreCampagne(modele, 'FR');

// ── Les jetons signés, identiques aux fonctions ─────────────────────
const cle = readFileSync(path.join(SECRETS, '.campagne_cle'), 'utf8').trim();
const hmac = (s) => crypto.createHmac('sha256', cle).update(s).digest('hex').slice(0, 32);
const lienDesabonnement = (c) => `${URL_DESABONNEMENT}?e=${encodeURIComponent(normaliser(c))}&j=${hmac(normaliser(c))}`;
const echapper = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const personnaliser = (g, nom, lien, pourHtml) => {
  const propre = String(nom || '').trim().slice(0, 60);
  const morceau = propre ? ` ${pourHtml ? echapper(propre) : propre}` : '';
  return g.split('{{nom}}').join(morceau).split('{{desabonnement}}').join(lien);
};
const incorporerImages = (h) => {
  const pieces = []; const vues = new Map();
  const neuf = h.replace(/src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|gif))"/gi, (tout, url) => {
    let cid = vues.get(url);
    if (!cid) { cid = `img${vues.size}@fmm`; vues.set(url, cid); pieces.push({ path: url, cid, filename: url.split('/').pop() }); }
    return `src="cid:${cid}"`;
  });
  return { html: neuf, pieces };
};
const poserPixel = (h, campagneId, courriel) => {
  if (!campagneId || !h.includes('{{pixel}}')) return h.split('{{pixel}}').join('');
  const a = normaliser(courriel);
  const url = `${URL_PIXEL}?c=${encodeURIComponent(campagneId)}&e=${encodeURIComponent(a)}&j=${hmac(`${campagneId}|${a}`)}`;
  const balise = `<div style="line-height:1px;font-size:1px;"><img src="${echapper(url)}" width="1" height="1" alt="" border="0" style="width:1px;height:1px;display:block;border:0;outline:none;" /></div>`;
  return h.split('{{pixel}}').join(balise);
};

// ── Les destinataires : même règle que la première vague ────────────
const [snapClients, snapUsers, snapDesabo, snapRegistre, snapTraces] = await Promise.all([
  db.collection('clients').get(), db.collection('users').get(),
  db.collection('desabonnements').get(), db.collection('campagnesEnvois').get(),
  db.collection('campagnes').where('modele', '==', MODELE).get(),
]);
const clients = snapClients.docs.map((d) => d.data());
const comptes = new Set(snapUsers.docs.map((d) => normaliser((d.data() || {}).email)).filter(Boolean));
const desabonnes = new Set(snapDesabo.docs.map((d) => normaliser(d.id)));
const dejaEcrits = new Set(snapRegistre.docs.map((d) => normaliser((d.data() || {}).courriel)).filter(Boolean));
const trace = snapTraces.docs[0];
const campagneId = trace ? trace.id : null;

const variantes = {
  'sans achat 2026': { sansAchatCetteAnnee: true },
  'sans achat 2026 · sans compte': { sansAchatCetteAnnee: true, sansCompte: true },
  'tout le registre': {},
};
let liste = null; let regle = '';
for (const [nom, portee] of Object.entries(variantes)) {
  const l = prog.destinatairesDuFiltre(clients, comptes, portee, ANNEE);
  log(`règle « ${nom} » : ${l.length} adresses`);
  if (!liste && l.length === 126) { liste = l; regle = nom; }
}
if (!liste) { console.error('Aucune règle ne redonne les 126 de la première vague : on ne devine pas.'); process.exit(1); }
const restants = liste.filter((p) => !dejaEcrits.has(p.courriel) && !desabonnes.has(p.courriel));
log(`règle retenue : ${regle} · déjà écrits : ${dejaEcrits.size} · désabonnés : ${desabonnes.size} · à envoyer : ${restants.length} · trace : ${campagneId || 'aucune'}`);

// `ESSAI_VERS=adresse` : un seul exemplaire complet, à cette adresse, pour
// vérifier ce que le serveur accepte (rien d'écrit au registre).
if (process.env.ESSAI_VERS) {
  const pwE = readFileSync(path.join(SECRETS, '.zoho_pw'), 'utf8').trim();
  const tE = nodemailer.createTransport({ host: 'smtp.zohocloud.ca', port: 465, secure: true, auth: { user: ZOHO_EMAIL, pass: pwE } });
  const lienE = lienDesabonnement(process.env.ESSAI_VERS);
  const corpsE = incorporerImages(personnaliser(html, 'Alex', lienE, true));
  const sansImages = process.env.SANS_IMAGES === '1';
  try {
    const r = await tE.sendMail({ from: FROM, to: process.env.ESSAI_VERS, subject: `[Essai] ${sujet}`,
      text: personnaliser(texte, 'Alex', lienE, false),
      html: sansImages ? personnaliser(html, 'Alex', lienE, true).split('{{pixel}}').join('') : poserPixel(corpsE.html, campagneId, process.env.ESSAI_VERS),
      attachments: sansImages ? [] : corpsE.pieces,
      headers: { 'List-Unsubscribe': `<${lienE}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
    log(`ESSAI OK (${sansImages ? 'sans images' : 'complet'}) : ${r.response}`);
  } catch (err) { log(`ESSAI REFUS (${sansImages ? 'sans images' : 'complet'}) : ${String(err && err.message).replace(/<[^>]*>/g, '').slice(0, 300)}`); }
  tE.close(); process.exit(0);
}
// `EXPORT=dossier` : la liste des restants (CSV) et la lettre rendue (HTML),
// pour un envoi par un autre service. Le fichier CSV porte des données
// personnelles : il vit dans un dossier protégé, jamais dans le dépôt.
if (process.env.EXPORT) {
  const { writeFileSync } = await import('node:fs');
  const dossier = process.env.EXPORT;
  const csv = ['Email Address,First Name', ...restants.map((p) => `${p.courriel},"${String(p.nom || '').replace(/"/g, '')}"`)].join('\n');
  writeFileSync(path.join(dossier, 'invitation-restants.csv'), csv);
  // Sans pixel ni lien signé : Campaigns pose les siens.
  const htmlC = html.split('{{pixel}}').join('').split('{{nom}}').join('').split('{{desabonnement}}').join('$[UNSUBSCRIBE]$');
  writeFileSync(path.join(dossier, 'invitation-2026.html'), htmlC);
  writeFileSync(path.join(dossier, 'invitation-2026.sujet.txt'), sujet);
  log(`EXPORT : ${restants.length} adresses et la lettre dans ${dossier}`);
  process.exit(0);
}
if (essai) { log('Essai : rien n’a été envoyé.'); process.exit(0); }
if (!campagneId) { console.error('Pas de trace de campagne : on n’envoie pas sans elle.'); process.exit(1); }

// ── L'envoi, une lettre à la fois ───────────────────────────────────
const pw = readFileSync(path.join(SECRETS, '.zoho_pw'), 'utf8').trim();
const transport = nodemailer.createTransport({ host: 'smtp.zohocloud.ca', port: 465, secure: true, auth: { user: ZOHO_EMAIL, pass: pw } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let envoyes = 0;
for (const p of restants) {
  const lien = lienDesabonnement(p.courriel);
  const corps = incorporerImages(personnaliser(html, p.nom, lien, true));
  try {
    await transport.sendMail({
      from: FROM, to: p.courriel, subject: sujet,
      text: personnaliser(texte, p.nom, lien, false),
      html: poserPixel(corps.html, campagneId, p.courriel),
      attachments: corps.pieces,
      headers: { 'List-Unsubscribe': `<${lien}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
    envoyes += 1;
    await db.collection('campagnesEnvois').doc(`${MODELE}:${p.courriel}`).set({
      modele: MODELE, courriel: p.courriel, statut: 'envoye', note: 'reprise au compte-gouttes', le: admin.firestore.FieldValue.serverTimestamp(),
    });
    await trace.ref.update({ envoyes: admin.firestore.FieldValue.increment(1) });
    log(`envoyé ${envoyes}/${restants.length} → ${p.courriel.replace(/^(..).*@/, '$1…@')}`);
  } catch (err) {
    log(`REFUS après ${envoyes} : ${String(err && err.message).slice(0, 160)}`);
    transport.close();
    process.exit(2);
  }
  await dormir(PAUSE_MS);
}
transport.close();
log(`Terminé : ${envoyes} lettres envoyées, ${restants.length - envoyes} restantes.`);
process.exit(0);
