// ─── Le rappel du banquet : messages privés et épingle du mur ────────
// Alex, 2026-09-21 : « envoie aussi dans les messages privés de tous
// sauf des admins et organisateurs, et pin un rappel au board ».
//
// Les fils privés se posent ici avec le SDK admin, exactement comme le
// premier temps de la Cloud Function `messagerieDeMasse` (voir
// functions/index.js) : même identifiant de fil, mêmes champs, même
// trace dans `envoisMasse`. Le second temps de la fonction, la lettre
// qui double chaque message, est laissé de côté à dessein : ZeptoMail
// n'est pas configuré, et douze cents lettres d'un coup par la boîte
// Zoho la feraient couper la semaine du festival. Le rappel par
// courriel part à part, aux clients de 2026, par
// tools/envoyer-rappel-banquet.mjs.
//
// Sont écartés : les adresses de l'équipe (COURRIELS_ADMIN), les rôles
// d'admin super, ca et organisateur (`adminRoles`) et les membres qui
// portent le rôle « administrateur » dans le registre. La cuisine et
// les bénévoles restent : ils mangent aussi.
//
//   node tools/rappel-banquet-messages.mjs --essai    (compte, n'écrit rien)
//   node tools/rappel-banquet-messages.mjs            (écrit les fils et l'épingle)

import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..');
const PROJET = 'festivalmedieval';
const essai = process.argv.includes('--essai');

// Le siège du fil : Alex, avec sa fiche, sa photo et sa coche. Le nom
// affiché reste celui du festival, comme pour tout envoi de groupe.
const EXPEDITEUR_UID = '2lqW0drD7IhdhAY4qKqUZU7bSZ22';
const FESTIVAL_NOM = 'Le Festival Médiéval de Montpellier';
const FESTIVAL_TEINTE = 38;
const FESTIVAL_PHOTO = '/fmm-logo-embossed-silver.webp';
const COURRIELS_ADMIN = [
  'admin@festivalmedievaldemontpellier.org',
  'alex@lesalondesinconnus.com',
  'houseoftherisingarts@gmail.com',
  'm.fournel11@gmail.com',
  'benevoles.medievalmontpellier@gmail.com',
];
const ROLES_ECARTES = new Set(['super', 'ca', 'organisateur']);
const MEMBRES_PAR_LOT = 200;

const TEXTE = `Un petit rappel pour la grande table : le Banquet du Prince William se tient le dimanche 27 septembre à treize heures, sur la scène du festival, tout de suite après la cérémonie de Freya. Il n’y a qu’un seul banquet de la fin de semaine, et si votre reçu porte encore l’ancien nom du repas, le Banquet de l’Équinoxe, vos places sont bien celles du dimanche.

Il reste encore des places parmi les cinquante, à 65 $ plus taxes pour les trois services. Elles se réservent sur le site du festival, à la page Nourriture : https://www.festivalmedievaldemontpellier.org/nourriture?banquet=1

Tout achat est définitif, sans annulation ni remboursement.`;

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

const req = createRequire(path.join(racine, 'functions', 'package.json'));
const admin = req('firebase-admin');
admin.initializeApp({ projectId: PROJET, credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const { FieldValue } = admin.firestore;
const normaliser = (c) => String(c || '').trim().toLowerCase();
const filId = (a, b) => [a, b].sort().join('__');

// ── Qui est écarté ──────────────────────────────────────────────────
const [snapMembres, snapUsers, snapRoles] = await Promise.all([
  db.collection('membres').get(), db.collection('users').get(), db.collection('adminRoles').get(),
]);
const uidParCourriel = new Map();
for (const d of snapUsers.docs) { const e = normaliser((d.data() || {}).email); if (e) uidParCourriel.set(e, d.id); }
const ecartes = new Set([EXPEDITEUR_UID]);
const raisons = [];
for (const e of COURRIELS_ADMIN) {
  const uid = uidParCourriel.get(e);
  if (uid) { ecartes.add(uid); raisons.push(`${e} (équipe)`); }
  else try { const u = await admin.auth().getUserByEmail(e); ecartes.add(u.uid); raisons.push(`${e} (équipe, auth)`); } catch { /* pas de compte */ }
}
for (const d of snapRoles.docs) {
  const r = d.data() || {};
  if (!ROLES_ECARTES.has(r.role)) continue;
  const uid = r.uid || uidParCourriel.get(normaliser(r.email));
  if (uid) { ecartes.add(uid); raisons.push(`${r.email} (${r.role})`); }
  else raisons.push(`${r.email} (${r.role}, sans compte, rien à écarter)`);
}
const membres = snapMembres.docs.map((d) => ({ uid: d.id, ...d.data() }));
for (const m of membres) if ((m.roles || []).includes('administrateur')) { ecartes.add(m.uid); raisons.push(`${m.nom} (administrateur du registre)`); }
const vises = membres.filter((m) => m.uid && !ecartes.has(m.uid));
console.log(`membres : ${membres.length} · écartés : ${membres.length - vises.length} · visés : ${vises.length}`);
for (const r of raisons) console.log('  écarté :', r);

// La fiche d'Alex pour le billet épinglé.
const ficheAlex = (await db.collection('membres').doc(EXPEDITEUR_UID).get()).data() || {};
const dejaEpingle = await db.collection('mur').where('epingle', '==', true).where('guildeId', '==', null).get();
console.log(`billets déjà épinglés sur le mur : ${dejaEpingle.size}`);

if (essai) { console.log('Essai : rien n’a été écrit.'); process.exit(0); }

// ── La trace, ouverte avant le premier lot ──────────────────────────
const trace = db.collection('envoisMasse').doc();
await trace.set({
  parUid: EXPEDITEUR_UID, parNom: String(ficheAlex.nom || 'Alex'), parCourriel: 'houseoftherisingarts@gmail.com',
  cible: 'Tous les membres, sauf l’équipe et les organisateurs', portee: 'selection', voix: 'festival',
  texte: TEXTE, destinataires: vises.length, faits: 0,
  lettresPrevues: 0, lettres: 0, lettresEchouees: 0, sansLettre: vises.length,
  note: 'Rappel du banquet posé par tools/rappel-banquet-messages.mjs, sans lettre : la lettre part à part aux clients de 2026.',
  statut: 'en cours', envoyeLe: FieldValue.serverTimestamp(),
});

// ── Les fils, par lots de deux cents ────────────────────────────────
let faits = 0;
for (let i = 0; i < vises.length; i += MEMBRES_PAR_LOT) {
  const lot = db.batch();
  for (const m of vises.slice(i, i + MEMBRES_PAR_LOT)) {
    const fil = db.collection('dms').doc(filId(EXPEDITEUR_UID, m.uid));
    const nom = String(m.nom || '').trim() || 'Membre';
    const photos = { [EXPEDITEUR_UID]: FESTIVAL_PHOTO };
    if (m.avatarUrl) photos[m.uid] = String(m.avatarUrl);
    lot.set(fil, {
      participantUids:  [EXPEDITEUR_UID, m.uid].sort(),
      participantNames: { [EXPEDITEUR_UID]: FESTIVAL_NOM, [m.uid]: nom },
      participantHues:  { [EXPEDITEUR_UID]: FESTIVAL_TEINTE, [m.uid]: Number(m.avatarHue) || 0 },
      participantPhotos: photos,
      lastMessage: TEXTE.slice(0, 140),
      lastMessageAt: FieldValue.serverTimestamp(),
      lastSenderUid: EXPEDITEUR_UID,
      unread: { [m.uid]: FieldValue.increment(1) },
      annonce: true,
    }, { merge: true });
    lot.set(fil.collection('messages').doc(), {
      senderUid: EXPEDITEUR_UID, senderName: FESTIVAL_NOM, body: TEXTE,
      createdAt: FieldValue.serverTimestamp(), envoiId: trace.id,
    });
  }
  await lot.commit();
  faits += Math.min(MEMBRES_PAR_LOT, vises.length - i);
  await trace.update({ faits });
  console.log(`fils posés : ${faits}/${vises.length}`);
}
await trace.update({ statut: 'terminé' });

// ── L'épingle sur le mur général ────────────────────────────────────
// Même forme qu'un billet publié depuis le site (publierSurLeMur), au
// nom d'Alex avec le badge de l'équipe, épinglé dès sa naissance.
const billet = db.collection('mur').doc();
await billet.set({
  uid: EXPEDITEUR_UID, nom: String(ficheAlex.nom || 'Alex T. St-Laurent'),
  ...(ficheAlex.avatarUrl ? { avatarUrl: ficheAlex.avatarUrl } : {}),
  avatarHue: Number(ficheAlex.avatarHue) || 0,
  texte: TEXTE, genre: 'billet', guildeId: null,
  moderateur: true, ...(ficheAlex.verifie ? { verifie: true } : {}),
  pour: 0, contre: 0, score: 0, nbCommentaires: 0, chaleur: 0,
  epingle: true, epingleLe: FieldValue.serverTimestamp(),
  creeLe: FieldValue.serverTimestamp(),
});
console.log(`épinglé sur le mur : ${billet.id} · trace envoisMasse : ${trace.id}`);
process.exit(0);
