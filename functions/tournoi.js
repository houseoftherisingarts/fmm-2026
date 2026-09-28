/**
 * Le tournoi de hnefatafl (Alex, 2026-09-28) : à tenir le 7 mars 2027.
 *
 * Tout le déroulement vit ici, côté serveur, parce que les parties
 * d'un tournoi ne passent pas par un défi accepté : elles s'ouvrent
 * déjà en cours, entre deux personnes que le tirage a mises face à
 * face. Le navigateur ne fait que s'inscrire et jouer.
 *
 *   /tournois/{id}                    la fiche (nom, date, statut, ronde)
 *   /tournois/{id}/inscriptions/{uid} un document par personne inscrite
 *   /tournois/{id}/matchs/{id}        le tableau : ronde, ordre, joueurs,
 *                                     partie(s) jouée(s), vainqueur
 *   /taflParties/{id}                 la partie elle-même, celle que le
 *                                     jeu connaît déjà, avec `tournoiId`
 *
 * Le format est l'élimination directe. Le tirage remplit un tableau de
 * 2^n places; les places vides de la première ronde sont des exemptions
 * et la personne passe d'elle-même. Une nulle ne tranche rien : la
 * partie se rejoue, camps inversés, jusqu'à ce qu'un des deux gagne.
 *
 * Trois gestes :
 *   tournoiLancer      (équipe)  tire la première ronde
 *   tournoiPartieFinie (déclencheur) note le vainqueur, ouvre la ronde
 *                      suivante quand la ronde est complète
 *   tournoiTrancher    (équipe)  déclare un vainqueur à la main, pour une
 *                      personne absente le jour venu
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const { Timestamp } = require('firebase-admin/firestore');

// ── Le tableau (pur, testé par functions/test-tournoi.js) ─────────────

/** Mélange de Fisher-Yates, en place. */
function melanger(liste) {
  for (let i = liste.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [liste[i], liste[j]] = [liste[j], liste[i]];
  }
  return liste;
}

/** Le nombre de rondes d'un tableau à élimination directe. */
function nombreDeRondes(n) {
  return Math.max(1, Math.ceil(Math.log2(n)));
}

/**
 * Distribue les inscrits sur la première ronde. Rend une liste de
 * matchs { ordre, joueurs: [a, b|null] } : `b` nul est une exemption.
 * Les exemptions se répartissent sur des matchs différents, jamais deux
 * personnes exemptées face à face.
 */
function premiereRonde(inscrits) {
  const n = inscrits.length;
  const places = 2 ** nombreDeRondes(n);
  const nbMatchs = places / 2;
  const exemptions = places - n;
  const file = [...inscrits];
  const matchs = [];
  for (let ordre = 0; ordre < nbMatchs; ordre += 1) {
    const a = file.shift();
    // Les `exemptions` premiers matchs n'ont qu'un joueur.
    const b = ordre < exemptions ? null : file.shift();
    matchs.push({ ordre, joueurs: [a, b === undefined ? null : b] });
  }
  return matchs;
}

/** La ronde suivante : les vainqueurs de 2k et 2k+1 se rencontrent en k. */
/** Le tournoi entier tient dans une fenêtre (une semaine par défaut) :
 *  chaque ronde reçoit une part égale, et la ronde r doit être finie à
 *  debut + r * part. Rend une échéance (ms) par ronde. */
function echeancesRondes(debutMs, finMs, nbRondes) {
  const part = Math.max(0, finMs - debutMs) / nbRondes;
  return Array.from({ length: nbRondes }, (_, i) => Math.round(debutMs + (i + 1) * part));
}

function rondeSuivante(matchsFinis) {
  const tries = [...matchsFinis].sort((x, y) => x.ordre - y.ordre);
  const suite = [];
  for (let k = 0; k < tries.length / 2; k += 1) {
    suite.push({ ordre: k, joueurs: [tries[2 * k].gagnant, tries[2 * k + 1].gagnant] });
  }
  return suite;
}

module.exports = ({ db, FieldValue, COURRIELS_ADMIN }) => {
const SEMAINE_MS = 7 * 24 * 60 * 60 * 1000;
const fonctions = {};

function exigerEquipe(requete) {
  const courriel = requete.auth && requete.auth.token && requete.auth.token.email
    ? String(requete.auth.token.email).toLowerCase() : null;
  if (!courriel || !COURRIELS_ADMIN.includes(courriel)) {
    throw new HttpsError('permission-denied', 'Cette fonction est réservée à l’équipe.');
  }
}

// ── Les écritures ─────────────────────────────────────────────────────

/** Ouvre la partie de tafl d'un match. `inverse` échange les camps, pour
 *  rejouer une nulle. */
async function ouvrirPartie(tournoi, tournoiId, matchId, match, inverse) {
  const [a, b] = match.joueurs;
  const attaquant = inverse ? b : a;
  const defenseur = inverse ? a : b;
  const delaiMs = tournoi.delaiMs || null;
  const ref = await db.collection('taflParties').add({
    jeu: 'hnefatafl',
    tournoiId,
    matchId,
    ronde: match.ronde,
    joueurs: [a, b],
    noms: match.noms,
    camps: { attacker: attaquant, defender: defenseur },
    regleId: tournoi.regleId || 'copenhague',
    statut: 'encours',
    lancePar: a,
    coups: [],
    tour: 'attacker',
    gagnant: null,
    abandon: null,
    delaiMs,
    echeance: delaiMs ? Timestamp.fromMillis(Date.now() + delaiMs) : null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/** Écrit les matchs d'une ronde et ouvre leurs parties. Une exemption
 *  se ferme sur-le-champ. */
async function ecrireRonde(tournoiRef, tournoi, ronde, matchs, noms) {
  const matchsRef = tournoiRef.collection('matchs');
  for (const m of matchs) {
    const [a, b] = m.joueurs;
    const docRef = matchsRef.doc();
    const base = {
      ronde,
      ordre: m.ordre,
      joueurs: [a, b],
      noms: { [a]: noms[a] || '', ...(b ? { [b]: noms[b] || '' } : {}) },
      parties: [],
      gagnant: null,
      statut: 'encours',
      exempt: !b,
      echeance: (tournoi.echeances || [])[ronde - 1] || null,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (!b) {
      await docRef.set({ ...base, gagnant: a, statut: 'fini' });
      continue;
    }
    const partieId = await ouvrirPartie(tournoi, tournoiRef.id, docRef.id, { ...base, ronde }, false);
    await docRef.set({ ...base, parties: [partieId] });
  }
}

/** Si la ronde courante est complète, ouvre la suivante ou couronne. */
async function avancer(tournoiRef) {
  const snap = await tournoiRef.get();
  if (!snap.exists) return;
  const tournoi = snap.data();
  if (tournoi.statut !== 'encours') return;
  const ronde = tournoi.ronde;
  const matchsSnap = await tournoiRef.collection('matchs').where('ronde', '==', ronde).get();
  const matchs = matchsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (matchs.length === 0 || matchs.some((m) => m.statut !== 'fini')) return;

  if (ronde >= tournoi.nbRondes) {
    const finale = matchs[0];
    await tournoiRef.update({
      statut: 'fini',
      champion: { uid: finale.gagnant, nom: finale.noms[finale.gagnant] || '' },
      updatedAt: FieldValue.serverTimestamp(),
    });
    logger.info('[tournoi] terminé', { tournoi: tournoiRef.id, champion: finale.gagnant });
    return;
  }

  const noms = {};
  matchs.forEach((m) => Object.assign(noms, m.noms));
  const suivants = rondeSuivante(matchs);
  // La ronde s'incrémente d'abord : si l'écriture des matchs plantait à
  // mi-chemin, un second passage ne recréerait pas la ronde en double.
  await tournoiRef.update({ ronde: ronde + 1, updatedAt: FieldValue.serverTimestamp() });
  await ecrireRonde(tournoiRef, tournoi, ronde + 1, suivants, noms);
  // Une ronde entière d'exemptions n'arrive jamais après la première,
  // mais si tous les matchs sont déjà fermés, on enchaîne.
  await avancer(tournoiRef);
}

// ── Les trois gestes ──────────────────────────────────────────────────

fonctions.tournoiLancer = onCall({ region: 'us-central1' }, async (requete) => {
  exigerEquipe(requete);
  const tournoiId = String((requete.data || {}).tournoiId || '');
  if (!tournoiId) throw new HttpsError('invalid-argument', 'Quel tournoi ?');
  const tournoiRef = db.collection('tournois').doc(tournoiId);
  const snap = await tournoiRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Tournoi introuvable.');
  const tournoi = snap.data();
  if (tournoi.statut !== 'inscriptions') {
    throw new HttpsError('failed-precondition', 'Le tournoi doit être aux inscriptions pour être lancé.');
  }
  const inscritsSnap = await tournoiRef.collection('inscriptions').get();
  const inscrits = inscritsSnap.docs.map((d) => d.id);
  if (inscrits.length < 2) throw new HttpsError('failed-precondition', 'Il faut au moins deux personnes inscrites.');
  const noms = {};
  inscritsSnap.docs.forEach((d) => { noms[d.id] = String(d.data().nom || ''); });

  const nbRondes = nombreDeRondes(inscrits.length);
  // Une semaine pour tout le tournoi (Alex, 2026-09-28), à moins que la
  // fiche porte une autre date de fin déjà dans le futur.
  const maintenant = Date.now();
  const finMs = tournoi.dateFin && tournoi.dateFin.toMillis() > maintenant
    ? tournoi.dateFin.toMillis()
    : maintenant + SEMAINE_MS;
  const echeances = echeancesRondes(maintenant, finMs, nbRondes).map((ms) => Timestamp.fromMillis(ms));
  await tournoiRef.update({
    statut: 'encours',
    ronde: 1,
    nbRondes,
    nbInscrits: inscrits.length,
    dateFin: Timestamp.fromMillis(finMs),
    echeances,
    lanceLe: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await ecrireRonde(tournoiRef, { ...tournoi, echeances }, 1, premiereRonde(melanger(inscrits)), noms);
  await avancer(tournoiRef);
  logger.info('[tournoi] lancé', { tournoi: tournoiId, inscrits: inscrits.length, nbRondes });
  return { nbRondes, nbInscrits: inscrits.length };
});

fonctions.tournoiPartieFinie = onDocumentWritten(
  { document: 'taflParties/{id}', region: 'us-central1', memory: '256MiB' },
  async (event) => {
    const avant = event.data && event.data.before && event.data.before.exists ? event.data.before.data() : null;
    const apres = event.data && event.data.after && event.data.after.exists ? event.data.after.data() : null;
    if (!apres || !apres.tournoiId || apres.statut !== 'fini' || (avant && avant.statut === 'fini')) return;

    const tournoiRef = db.collection('tournois').doc(apres.tournoiId);
    const matchRef = tournoiRef.collection('matchs').doc(apres.matchId);
    const [tSnap, mSnap] = await Promise.all([tournoiRef.get(), matchRef.get()]);
    if (!tSnap.exists || !mSnap.exists) return;
    const match = mSnap.data();
    if (match.statut === 'fini') return;

    const vainqueur = apres.gagnant ? apres.camps[apres.gagnant] : null;
    if (!vainqueur) {
      // Une nulle : on rejoue, camps inversés par rapport à la partie
      // qui vient de finir.
      const inverse = apres.camps.attacker === match.joueurs[0];
      const partieId = await ouvrirPartie(tSnap.data(), tournoiRef.id, matchRef.id, match, inverse);
      await matchRef.update({ parties: FieldValue.arrayUnion(partieId) });
      logger.info('[tournoi] nulle, partie rejouée', { match: matchRef.id, partie: partieId });
      return;
    }

    await matchRef.update({ gagnant: vainqueur, statut: 'fini', finiLe: FieldValue.serverTimestamp() });
    await avancer(tournoiRef);
  },
);

fonctions.tournoiTrancher = onCall({ region: 'us-central1' }, async (requete) => {
  exigerEquipe(requete);
  const { tournoiId, matchId, gagnantUid } = requete.data || {};
  if (!tournoiId || !matchId || !gagnantUid) throw new HttpsError('invalid-argument', 'Tournoi, match et vainqueur sont requis.');
  const matchRef = db.collection('tournois').doc(String(tournoiId)).collection('matchs').doc(String(matchId));
  const mSnap = await matchRef.get();
  if (!mSnap.exists) throw new HttpsError('not-found', 'Match introuvable.');
  const match = mSnap.data();
  if (match.statut === 'fini') throw new HttpsError('failed-precondition', 'Ce match est déjà tranché.');
  if (!match.joueurs.includes(gagnantUid)) throw new HttpsError('invalid-argument', 'Cette personne ne joue pas ce match.');

  const partieId = match.parties[match.parties.length - 1];
  if (partieId) {
    const pRef = db.collection('taflParties').doc(partieId);
    const pSnap = await pRef.get();
    if (pSnap.exists && pSnap.data().statut !== 'fini') {
      const camps = pSnap.data().camps;
      const campGagnant = camps.attacker === gagnantUid ? 'attacker' : 'defender';
      // Fermer la partie fait tourner tournoiPartieFinie, qui note le
      // vainqueur et fait avancer la ronde : un seul chemin pour tous.
      await pRef.update({
        statut: 'fini',
        gagnant: campGagnant,
        abandon: match.joueurs.find((u) => u !== gagnantUid),
        forfait: true,
        echeance: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { ok: true };
    }
  }
  await matchRef.update({ gagnant: gagnantUid, statut: 'fini', finiLe: FieldValue.serverTimestamp() });
  await avancer(db.collection('tournois').doc(String(tournoiId)));
  return { ok: true };
});

/** Ferme une partie par forfait contre la personne dont c'est le tour.
 *  tournoiPartieFinie fait le reste (vainqueur du match, ronde suivante). */
async function forfaitDuTour(pRef, partie, raison) {
  const perdant = partie.camps[partie.tour];
  const campGagnant = partie.tour === 'attacker' ? 'defender' : 'attacker';
  await pRef.update({
    statut: 'fini',
    gagnant: campGagnant,
    abandon: perdant,
    forfait: true,
    echeance: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  logger.info('[tournoi] forfait', { partie: pRef.id, perdant, raison });
}

// Toutes les demi-heures : dans chaque tournoi en cours, une partie dont
// le minuteur du coup est écoulé, ou dont la ronde a dépassé son échéance,
// se perd par forfait pour la personne qui devait jouer (timeout =
// forfait, Alex, 2026-09-28). Le réclamer à la main dans le jeu reste
// possible, ceci passe derrière.
fonctions.tournoiMinuterie = onSchedule(
  { schedule: 'every 30 minutes', region: 'us-central1', timeZone: 'America/Toronto', memory: '256MiB' },
  async () => {
    const maintenant = Date.now();
    const tournois = await db.collection('tournois').where('statut', '==', 'encours').get();
    for (const t of tournois.docs) {
      const matchs = await t.ref.collection('matchs').where('statut', '==', 'encours').get();
      for (const m of matchs.docs) {
        const match = m.data();
        const partieId = match.parties && match.parties[match.parties.length - 1];
        if (!partieId) continue;
        const pRef = db.collection('taflParties').doc(partieId);
        const pSnap = await pRef.get();
        if (!pSnap.exists) continue;
        const partie = pSnap.data();
        if (partie.statut !== 'fini' && partie.echeance && partie.echeance.toMillis() < maintenant) {
          await forfaitDuTour(pRef, partie, 'minuteur du coup');
        } else if (partie.statut !== 'fini' && match.echeance && match.echeance.toMillis() < maintenant) {
          await forfaitDuTour(pRef, partie, 'échéance de la ronde');
        }
      }
    }
  },
);

return fonctions;
};

module.exports.tableau = { nombreDeRondes, premiereRonde, rondeSuivante, echeancesRondes };
