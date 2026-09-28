// Dépose les fiches de bilan (images) dans l'onglet Documents de la
// section Finances de la régie, par le même chemin que le bouton
// Téléverser : fichier dans Storage sous `finances/`, fiche dans
// `financeDocuments`. Alex, 2026-09-28 : « les images de nos rapports,
// sauf la cuisine, consigne-les bien dans admin ».
// Usage : node scripts/deposer-fiches-finances.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.resolve(ici, '..');
const PROJET = 'festivalmedieval';
const BUCKET = 'festivalmedieval.firebasestorage.app';
const BUREAU = path.join(homedir(), 'Desktop');

const FICHES = [
  { fichier: 'fmm-2026-bilan-organisateurs.png', name: 'Bilan pour les organisateurs · Édition 2026 (fiche)', year: 2026 },
  { fichier: 'fmm-2025-bilan-organisateurs.png', name: 'Bilan pour les organisateurs · Édition 2025 (fiche)', year: 2025 },
  { fichier: 'fmm-evolution-2021-2026.png', name: 'Évolution 2021-2026 · revenus hors subventions (fiche)', year: 2026 },
];

function preparerIdentifiants() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return true;
  const defaut = path.join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');
  if (existsSync(defaut)) return true;
  const dossier = path.join(homedir(), '.config', 'gcloud', 'legacy_credentials');
  if (existsSync(dossier)) {
    for (const compte of readdirSync(dossier)) {
      const adc = path.join(dossier, compte, 'adc.json');
      if (existsSync(adc)) { process.env.GOOGLE_APPLICATION_CREDENTIALS = adc; return true; }
    }
  }
  return false;
}

if (!preparerIdentifiants()) {
  console.error(`Aucun identifiant : gcloud auth application-default login --project ${PROJET}`);
  process.exit(1);
}
const admin = createRequire(path.join(racine, 'functions', 'package.json'))('firebase-admin');
admin.initializeApp({ projectId: PROJET, credential: admin.credential.applicationDefault(), storageBucket: BUCKET });
const db = admin.firestore();
const bucket = admin.storage().bucket();

const existants = new Map();
for (const d of (await db.collection('financeDocuments').get()).docs) existants.set(d.data().name, d);

for (const f of FICHES) {
  const local = path.join(BUREAU, f.fichier);
  const octets = readFileSync(local);
  const token = randomUUID();
  const chemin = `finances/${Date.now()}-${f.fichier}`;
  await bucket.file(chemin).save(octets, {
    contentType: 'image/png',
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(chemin)}?alt=media&token=${token}`;
  const payload = {
    name: f.name, category: 'Rapports', year: f.year, url, path: chemin,
    sizeKb: Math.round(statSync(local).size / 1024),
    uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  const ancien = existants.get(f.name);
  if (ancien) {
    const vieux = ancien.data().path;
    await ancien.ref.set(payload);
    if (vieux && vieux !== chemin) await bucket.file(vieux).delete({ ignoreNotFound: true });
    console.log('remplacé  ', f.name);
  } else {
    await db.collection('financeDocuments').add(payload);
    console.log('déposé    ', f.name);
  }
}
