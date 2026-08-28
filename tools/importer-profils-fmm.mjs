// ─── Les profils du festival, depuis les exports ────────────────────
// Alex, 2026-08-28 : « il devrait y avoir plus de 1000 comptes ». Les
// deux exports Zeffy et les listes « Emails FMM » du dossier des
// téléchargements, réunis, dédoublonnés, versés en comptes et en fiches
// du registre de l'Ordre. Les carnets d'une autre organisation (Wix,
// liste AGA, contacts Google, invités du Salon) restent dehors.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const racine = '/Users/lesalondesinconnus/Documents/Websites/FMM 2026';
const TELECHARGEMENTS = path.join(homedir(), 'Downloads');
const FICHIERS = [
  'Zeffy-export-ContactsV2-1756918743217.csv',
  'Untitled spreadsheet - Export.csv',
  'Emails FMM - Sheet1.csv',
  'Emails FMM - Sheet1 (1).csv',
  'Emails FMM - Sheet1 (2).csv',
  'Emails FMM - Sheet1 (3).csv',
];

const defaut = path.join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !existsSync(defaut)) {
  const dossier = path.join(homedir(), '.config', 'gcloud', 'legacy_credentials');
  for (const c of readdirSync(dossier)) {
    const adc = path.join(dossier, c, 'adc.json');
    if (existsSync(adc)) { process.env.GOOGLE_APPLICATION_CREDENTIALS = adc; break; }
  }
}

const MAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const lignes = (texte) => texte.split(/\r?\n/).filter((l) => l.trim());

// Une ligne rend { courriel, nom } quand elle porte une adresse.
function lireLigne(ligne) {
  const cellules = ligne.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  const idx = cellules.findIndex((c) => MAIL.test(c));
  if (idx < 0) return null;
  const courriel = (cellules[idx].match(MAIL) || [])[0].toLowerCase();
  const nom = cellules.slice(0, idx).filter((c) => c && !MAIL.test(c)).join(' ').trim();
  return { courriel, nom };
}

const gens = new Map();
for (const nomFichier of FICHIERS) {
  const chemin = path.join(TELECHARGEMENTS, nomFichier);
  if (!existsSync(chemin)) { console.warn('absent :', nomFichier); continue; }
  let compte = 0;
  for (const ligne of lignes(readFileSync(chemin, 'utf8'))) {
    const r = lireLigne(ligne);
    if (!r) continue;
    const deja = gens.get(r.courriel);
    if (!deja || (!deja.nom && r.nom)) gens.set(r.courriel, { nom: r.nom || (deja && deja.nom) || '' });
    compte++;
  }
  console.log(`${nomFichier} : ${compte} lignes avec une adresse`);
}
console.log(`Total : ${gens.size} adresses distinctes.`);

if (process.argv.includes('--essai')) { console.log('Essai : rien n\'est écrit.'); process.exit(0); }

const require = createRequire(import.meta.url);
const admin = require(path.join(racine, 'functions/node_modules/firebase-admin'));
admin.initializeApp({ projectId: 'festivalmedieval' });
const db = admin.firestore();
const auth = admin.auth();

const teinte = (nom) => { let h = 0; for (const c of nom) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

let crees = 0, existants = 0, fiches = 0, erreurs = 0;
let lot = db.batch(), dansLot = 0;
const pousser = async () => { if (dansLot) { await lot.commit(); lot = db.batch(); dansLot = 0; } };

for (const [mail, { nom }] of gens) {
  let user;
  try { user = await auth.getUserByEmail(mail); existants++; }
  catch (e) {
    if (e && e.code === 'auth/user-not-found') {
      try { user = await auth.createUser({ email: mail, displayName: nom || undefined }); crees++; }
      catch (e2) { erreurs++; continue; }
    } else { erreurs++; continue; }
  }
  const uid = user.uid;
  const nomFinal = nom || user.displayName || mail.split('@')[0];
  lot.set(db.collection('users').doc(uid), {
    email: mail, displayName: nomFinal, origine: 'zeffy', importe: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  lot.set(db.collection('membres').doc(uid), {
    uid, nom: nomFinal, avatarHue: teinte(nomFinal),
    importe: true,
    tags: admin.firestore.FieldValue.arrayUnion('importé'),
    maj: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  fiches++; dansLot += 2;
  if (dansLot >= 400) { await pousser(); console.log(`… ${fiches} fiches`); }
}
await pousser();
console.log(`Terminé : ${crees} comptes créés, ${existants} déjà là, ${fiches} fiches, ${erreurs} refus.`);
process.exit(0);
