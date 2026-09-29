#!/usr/bin/env node
// Donne le dos de carte de la hird de Hullsborg (tarot, id `hullsborg`)
// à toutes les personnes déjà membres du groupe (Alex, 2026-09-28 :
// « donne-le aux membres hullsborg »). Idempotent : arrayUnion. Les
// membres qui arrivent après le prennent à la boutique, où il leur est
// offert (functions/index.js, acheterCosmetique).
//   node scripts/donner-dos-hullsborg.mjs
import path from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJET = 'festivalmedieval';
const DOS = 'hullsborg';
const SLUG_HULLSBORG = /^(troupe)?(hirdhafn)?hull?sborg(guilde|clan|compagnie|confrerie|troupe|maisonnee|ordre)?$/;

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const defaut = path.join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');
  if (existsSync(defaut)) process.env.GOOGLE_APPLICATION_CREDENTIALS = defaut;
  else {
    const dossier = path.join(homedir(), '.config', 'gcloud', 'legacy_credentials');
    for (const compte of existsSync(dossier) ? readdirSync(dossier) : []) {
      const adc = path.join(dossier, compte, 'adc.json');
      if (existsSync(adc)) { process.env.GOOGLE_APPLICATION_CREDENTIALS = adc; break; }
    }
  }
}
const admin = createRequire(path.join(racine, 'functions', 'package.json'))('firebase-admin');
admin.initializeApp({ projectId: PROJET, credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const guildes = await db.collection('guildes').get();
const membres = new Set();
for (const g of guildes.docs) {
  if (g.id === 'hullsborg' || SLUG_HULLSBORG.test(String(g.data().slug || ''))) (g.data().membres || []).forEach((u) => membres.add(u));
}
console.log(`membres de la hird : ${membres.size}`);
for (const uid of membres) {
  await db.collection('bourses').doc(uid).set(
    { dosTarot: admin.firestore.FieldValue.arrayUnion(DOS), maj: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true },
  );
  console.log(`  ${uid} : dos ${DOS} donné`);
}
