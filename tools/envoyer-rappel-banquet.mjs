// ─── Le rappel du banquet, au compte-gouttes ─────────────────────────
// Alex, 2026-09-21 : « envoie le courriel de rappel ». La lettre est le
// modèle `rappel-banquet` de src/content/campagnes.ts, rendue par le
// même code que la page d'admin, et elle part à tous les clients de
// 2026 (billets, camping, kiosques), une adresse à la fois.
//
// Pourquoi pas la Cloud Function `envoyerCampagne` : ZeptoMail n'est
// toujours pas configuré, tout sort par la boîte Zoho, et Zoho a coupé
// l'envoi de masse à 25 lettres le 23 août (« unusual sending
// activity »). La même boîte porte les liens de connexion et les
// confirmations de place du site : la bloquer la semaine du festival
// n'est pas une option. Une lettre toutes les vingt secondes, arrêt au
// premier refus, registre `campagnesEnvois` pour ne jamais écrire deux
// fois à la même personne.
//
//   node tools/envoyer-rappel-banquet.mjs --essai          (compte, n'envoie rien)
//   ESSAI_VERS=adresse node tools/envoyer-rappel-banquet.mjs   (un exemplaire complet)
//   node tools/envoyer-rappel-banquet.mjs                  (envoie, écrit le registre)
//   EXCLURE=fichier                                        (une adresse par ligne, jamais écrite)
//
// Les secrets se lisent dans deux fichiers protégés du scratchpad
// (SECRETS_DIR), jamais dans le dépôt : `.zoho_pw` et `.campagne_cle`,
// tirés de `firebase functions:secrets:access`.

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
// MODELE=rappel-banquet-erratum SEULEMENT_DE=rappel-banquet : l'erratum,
// aux seules adresses qui ont reçu la première version.
const MODELE = process.env.MODELE || 'rappel-banquet';
const SEULEMENT_DE = process.env.SEULEMENT_DE || '';
const LANGUE = 'FR';
const ZOHO_EMAIL = 'admin@festivalmedievaldemontpellier.org';
const FROM = `Festival Médiéval de Montpellier <${ZOHO_EMAIL}>`;
const URL_DESABONNEMENT = 'https://us-central1-festivalmedieval.cloudfunctions.net/desabonnement';
const URL_PIXEL = 'https://us-central1-festivalmedieval.cloudfunctions.net/pixel';
const PAUSE_MS = Number(process.env.PAUSE_MS || 20_000);
const SECRETS = process.env.SECRETS_DIR;
if (!SECRETS) { console.error('SECRETS_DIR manque.'); process.exit(1); }
const JOURNAL = path.join(SECRETS, 'envoi-rappel-banquet.log');

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
admin.initializeApp({ projectId: PROJET, credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const normaliser = (c) => String(c || '').trim().toLowerCase();

// ── La lettre, rendue par le même code que la page d'admin ──────────
const dossierSortie = mkdtempSync(path.join(tmpdir(), 'lettre-'));
async function charger(entree, nom) {
  const sortie = path.join(dossierSortie, nom);
  await build({ entryPoints: [entree], bundle: true, format: 'esm', outfile: sortie, logLevel: 'warning', define: { 'import.meta.env': '{}' } });
  return import(sortie);
}
const lib = await charger(path.join(racine, 'src', 'lib', 'courrielCampagne.ts'), 'lettre.mjs');
const contenu = await charger(path.join(racine, 'src', 'content', 'campagnes.ts'), 'campagnes.mjs');
const modele = (contenu.MODELES_CAMPAGNE || []).find((m) => m.id === MODELE);
if (!modele) { console.error('Modèle introuvable :', MODELE); process.exit(1); }
const { sujet, html, texte } = lib.rendreCampagne(modele, LANGUE);
if (!html.includes('{{desabonnement}}') || !texte.includes('{{desabonnement}}')) {
  console.error('La lettre n’a pas de lien de désabonnement : on n’envoie pas.'); process.exit(1);
}

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
// Les images voyagent en pièces jointes (cid) : Zoho les laisse passer
// mieux que les URL distantes, comme la première vague l'a montré.
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

// ── Les destinataires : tous les clients de 2026 ────────────────────
const [snapClients, snapDesabo, snapRegistre, snapSource] = await Promise.all([
  db.collection('clients').where('annee', '==', ANNEE).get(),
  db.collection('desabonnements').get(),
  db.collection('campagnesEnvois').where('modele', '==', MODELE).get(),
  SEULEMENT_DE ? db.collection('campagnesEnvois').where('modele', '==', SEULEMENT_DE).get() : null,
]);
const source = snapSource ? new Set(snapSource.docs.map((d) => normaliser((d.data() || {}).courriel))) : null;
const desabonnes = new Set(snapDesabo.docs.map((d) => normaliser(d.id)));
const dejaEcrits = new Set(snapRegistre.docs.map((d) => normaliser((d.data() || {}).courriel)).filter(Boolean));
const parAdresse = new Map();
for (const d of snapClients.docs) {
  const c = d.data();
  const courriel = normaliser(c.courriel);
  if (!courriel || !courriel.includes('@') || c.statut === 'annule') continue;
  if (!parAdresse.get(courriel)) parAdresse.set(courriel, String(c.nom || '').trim());
}
// Alex, 2026-09-21 : « ignore aussi les gens qui ont déjà acheté le
// banquet ». Leurs adresses viennent des paiements Square et vivent
// dans un fichier du scratchpad (EXCLURE), jamais dans le dépôt.
const exclus = new Set(process.env.EXCLURE
  ? readFileSync(process.env.EXCLURE, 'utf8').split('\n').map(normaliser).filter(Boolean)
  : []);
const liste = [...parAdresse].map(([courriel, nom]) => ({ courriel, nom }))
  .filter((p) => !source || source.has(p.courriel));
if (source && liste.length !== source.size) { console.error(`La source compte ${source.size} adresses, la liste ${liste.length} : on ne devine pas.`); process.exit(1); }
const restants = liste.filter((p) => !dejaEcrits.has(p.courriel) && !desabonnes.has(p.courriel) && !exclus.has(p.courriel));
log(`clients 2026 : ${snapClients.size} fiches · ${liste.length} adresses · déjà écrits : ${dejaEcrits.size} · désabonnés : ${desabonnes.size} · acheteurs du banquet écartés : ${liste.filter((p) => exclus.has(p.courriel)).length} · à envoyer : ${restants.length}`);

const pw = () => readFileSync(path.join(SECRETS, '.zoho_pw'), 'utf8').trim();
const ouvrir = () => nodemailer.createTransport({ host: 'smtp.zohocloud.ca', port: 465, secure: true, auth: { user: ZOHO_EMAIL, pass: pw() } });

// `ESSAI_VERS=adresse` : un exemplaire complet, rien d'écrit au registre.
if (process.env.ESSAI_VERS) {
  const t = ouvrir();
  const lien = lienDesabonnement(process.env.ESSAI_VERS);
  const corps = incorporerImages(personnaliser(html, 'Alex', lien, true));
  try {
    const r = await t.sendMail({ from: FROM, to: process.env.ESSAI_VERS, subject: `[Essai] ${sujet}`,
      text: personnaliser(texte, 'Alex', lien, false),
      html: poserPixel(corps.html, null, process.env.ESSAI_VERS),
      attachments: corps.pieces,
      headers: { 'List-Unsubscribe': `<${lien}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
    log(`ESSAI OK : ${r.response}`);
  } catch (err) { log(`ESSAI REFUS : ${String(err && err.message).replace(/<[^>]*>/g, '').slice(0, 300)}`); }
  t.close(); process.exit(0);
}
if (essai) { log('Essai : rien n’a été envoyé.'); process.exit(0); }
if (!restants.length) { log('Personne à qui écrire.'); process.exit(0); }

// ── La trace de campagne, la même que celle de l'admin ─────────────
// Une seule par modèle : une reprise après un arrêt retrouve la sienne.
let trace = (await db.collection('campagnes').where('modele', '==', MODELE).limit(1).get()).docs[0];
if (!trace) {
  const ref = db.collection('campagnes').doc();
  await ref.set({
    parNom: 'Alex T. St-Laurent', parCourriel: 'houseoftherisingarts@gmail.com',
    modele: MODELE, modeleNom: modele.nom, langue: LANGUE,
    cible: SEULEMENT_DE ? `Les personnes qui ont reçu « ${SEULEMENT_DE} »` : `Tous les clients de ${ANNEE} (billets, camping, kiosques), sauf les acheteurs du banquet`,
    sujet, destinataires: liste.length, envoyes: 0, echecs: 0,
    desabonnesIgnores: liste.length - restants.length - 0,
    statut: 'en cours', note: 'envoi au compte-gouttes depuis tools/envoyer-rappel-banquet.mjs',
    envoyeLe: admin.firestore.FieldValue.serverTimestamp(),
  });
  trace = await ref.get();
}
const campagneId = trace.id;

// ── L'envoi, une lettre à la fois ───────────────────────────────────
const transport = ouvrir();
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
      modele: MODELE, courriel: p.courriel, statut: 'envoye', note: 'compte-gouttes', le: admin.firestore.FieldValue.serverTimestamp(),
    });
    await trace.ref.update({ envoyes: admin.firestore.FieldValue.increment(1) });
    log(`envoyé ${envoyes}/${restants.length} → ${p.courriel.replace(/^(..).*@/, '$1…@')}`);
  } catch (err) {
    log(`REFUS après ${envoyes} : ${String(err && err.message).slice(0, 160)}`);
    await trace.ref.update({ statut: 'échoué', erreur: String(err && err.message).slice(0, 300) });
    transport.close();
    process.exit(2);
  }
  if (envoyes < restants.length) await dormir(PAUSE_MS);
}
await trace.ref.update({ statut: 'terminé' });
transport.close();
log(`Terminé : ${envoyes} lettres.`);
process.exit(0);
