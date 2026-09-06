/**
 * La monnaie des guildes (contrat docs/CLAN-MONNAIE-CONTRAT.md, 6 sept 2026).
 *
 * Tout ce qui touche aux pièces d'une guilde vit ici. Le fichier ne
 * connaît le reste du serveur que par les quelques outils qu'index.js
 * lui passe à la fin (`crediter`, `debiter`, `db`, `FieldValue`,
 * `journeeFestival`), ce qui permet de le rejouer en mémoire dans
 * test-guildes.js sans émulateur.
 *
 * Deux monnaies se croisent : le Montpellois (M), qui vit dans
 * `bourses/{uid}` et n'est écrit que par crediter/debiter, et les
 * pièces de guilde, qui vivent dans `guildes/{id}/bourses/{uid}` et ne
 * valent que dans leur guilde. Le taux entre les deux suit le nombre
 * de membres actifs.
 */

const crypto = require('crypto');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');

const REGION = 'us-central1';
const DECLENCHEUR = { region: REGION, memory: '256MiB' };
const FRAIS_CHANGE = 0.05;
const PLAFOND_CHANGE_JOUR = 200;
const PIECES_ENTREE = 100;
const M_ENTREE = 10;
const JOURS_ACTIF = 30;
const HISTORIQUE_MAX = 30;
// Majuscules et chiffres sans O, 0, I ni 1 : un code lu sur un
// téléphone et recopié à la main ne se trompe pas de caractère.
const ALPHABET_CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Le taux du jour : Montpellois pour une pièce. 10 actifs donnent 0,5,
 *  40 la parité, 160 le maximum de 2. Jumelle de `tauxPour` côté client. */
function calculerTaux(nbActifs) {
  const brut = 0.5 * Math.sqrt((Number(nbActifs) || 0) / 10);
  return Math.round(Math.min(2, Math.max(0.5, brut)) * 1000) / 1000;
}

function enMillisecondes(valeur) {
  if (!valeur) return 0;
  if (typeof valeur === 'number') return valeur;
  if (typeof valeur.toMillis === 'function') return valeur.toMillis();
  if (valeur instanceof Date) return valeur.getTime();
  return 0;
}

/** Compte les membres vus depuis moins de 30 jours. `membresSnapshots`
 *  associe chaque uid à `{ vuLe, maj }` : la date de passage sur le
 *  site, et à défaut la dernière écriture de sa bourse de guilde. */
function compterActifs(guildeDoc, membresSnapshots, maintenant = Date.now()) {
  const limite = maintenant - JOURS_ACTIF * 86400000;
  let actifs = 0;
  for (const uid of (guildeDoc && guildeDoc.membres) || []) {
    const vu = membresSnapshots[uid] || {};
    if (Math.max(enMillisecondes(vu.vuLe), enMillisecondes(vu.maj)) >= limite) actifs += 1;
  }
  return actifs;
}

function nouveauCode() {
  let code = '';
  for (const octet of crypto.randomBytes(8)) code += ALPHABET_CODE[octet % ALPHABET_CODE.length];
  return code;
}

/** Dernier mot du nom + « Coin », sigle sur trois lettres, glyphe ◎. */
function monnaieParDefaut(nom) {
  const mots = String(nom || 'Guilde').trim().split(/\s+/);
  const dernier = mots[mots.length - 1] || 'Guilde';
  const lettres = (dernier.normalize('NFD').replace(/[^A-Za-z0-9]/g, '') || 'GLD').padEnd(3, 'X');
  return { nom: `${dernier} Coin`, sigle: lettres.slice(0, 3).toUpperCase(), glyphe: '◎' };
}

// ── L'agenda ICS ─────────────────────────────────────────────────────
const texteIcs = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

function horodateIcs(valeur) {
  const ms = enMillisecondes(valeur);
  return new Date(ms || Date.now()).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** RFC 5545 : une ligne ne dépasse pas 75 octets, la suite reprend
 *  après un espace. */
function plier(ligne) {
  if (ligne.length <= 74) return ligne;
  const bouts = [ligne.slice(0, 74)];
  for (let i = 74; i < ligne.length; i += 73) bouts.push(` ${ligne.slice(i, i + 73)}`);
  return bouts.join('\r\n');
}

function handlers(deps) {
  const { db, FieldValue, crediter, debiter, journeeFestival } = deps;
  const SV = () => FieldValue.serverTimestamp();
  const gRef = (id) => db.collection('guildes').doc(id);
  const bRef = (id, uid) => gRef(id).collection('bourses').doc(uid);
  const registre = (id) => gRef(id).collection('registre');

  const bourseGuilde = (snap) => ({ solde: 0, gagne: 0, depense: 0, changeJour: null, changeCumul: 0, ...(snap.exists ? snap.data() : {}) });

  function exigeGuilde(snap) {
    if (!snap.exists) throw new HttpsError('not-found', 'Guilde inconnue.');
    return snap.data();
  }
  function exigeMembre(guilde, uid) {
    if (!(guilde.membres || []).includes(uid)) throw new HttpsError('permission-denied', 'Vous n’êtes pas de cette guilde.');
  }
  function exigeChef(guilde, uid) {
    if (!(guilde.admins || []).includes(uid)) throw new HttpsError('permission-denied', 'Réservé aux chefs.');
  }
  function entier(valeur) {
    const n = Math.floor(Number(valeur));
    if (!Number.isFinite(n) || n <= 0) throw new HttpsError('invalid-argument', 'Montant invalide.');
    return n;
  }
  const tauxDe = (g) => (typeof g.taux === 'number' ? g.taux : calculerTaux(g.nbActifs || 0));

  /** Les 100 pièces d'arrivée. L'identifiant du document de registre
   *  fait la garde : parti puis revenu, on ne les touche qu'une fois. */
  async function donnerPiecesEntree(guildeId, uid, type) {
    const rRef = registre(guildeId).doc(`entree:${uid}`);
    await db.runTransaction(async (tx) => {
      const [rSnap, bSnap] = await Promise.all([tx.get(rRef), tx.get(bRef(guildeId, uid))]);
      if (rSnap.exists) return;
      const b = bourseGuilde(bSnap);
      tx.set(bRef(guildeId, uid), { solde: b.solde + PIECES_ENTREE, gagne: b.gagne + PIECES_ENTREE, depense: b.depense, maj: SV() }, { merge: true });
      tx.set(rRef, { type, de: 'monnaie', a: uid, pieces: PIECES_ENTREE, creeLe: SV() });
    });
  }

  /** Recalcule le taux et le nombre d'actifs. N'écrit que si quelque
   *  chose bouge : la fiche est son propre déclencheur, et une écriture
   *  inutile tournerait en rond. */
  async function majTaux(guildeId, guilde) {
    const uids = guilde.membres || [];
    const vus = {};
    await Promise.all(uids.map(async (uid) => {
      const [m, b] = await Promise.all([db.collection('membres').doc(uid).get(), bRef(guildeId, uid).get()]);
      vus[uid] = { vuLe: m.exists ? m.data().vuLe : null, maj: b.exists ? b.data().maj : null };
    }));
    const nbActifs = compterActifs(guilde, vus);
    const taux = calculerTaux(nbActifs);
    if (guilde.taux === taux && guilde.nbActifs === nbActifs && guilde.nbMembres === uids.length) return null;
    const jour = journeeFestival(Date.now());
    const tauxHistorique = (guilde.tauxHistorique || [])
      .filter((e) => e && e.jour !== jour)
      .concat([{ jour, taux, nbActifs }])
      .slice(-HISTORIQUE_MAX);
    await gRef(guildeId).set({ taux, nbActifs, nbMembres: uids.length, tauxHistorique, maj: SV() }, { merge: true });
    return { taux, nbActifs };
  }

  // ── Déclencheurs ───────────────────────────────────────────────────
  async function fondation(guildeId, guilde) {
    const uid = guilde && guilde.creePar;
    if (!uid) return;
    const patch = {};
    if (!guilde.monnaie) patch.monnaie = monnaieParDefaut(guilde.nom);
    if (!guilde.codeInvitation) patch.codeInvitation = nouveauCode();
    if (typeof guilde.tresor !== 'number') patch.tresor = 0;
    if (typeof guilde.taux !== 'number') {
      patch.taux = calculerTaux(1);
      patch.nbActifs = 1;
      patch.tauxHistorique = [{ jour: journeeFestival(Date.now()), taux: patch.taux, nbActifs: 1 }];
    }
    if (Object.keys(patch).length) await gRef(guildeId).set(patch, { merge: true });
    await donnerPiecesEntree(guildeId, uid, 'fondation');
    // Le compteur monte même quand le bonus est refusé : c'est lui qui
    // ferme la porte à une deuxième fondation côté client.
    await db.collection('membres').doc(uid).set({ guildesFondees: FieldValue.increment(1), maj: SV() }, { merge: true });
    const bourse = await db.collection('bourses').doc(uid).get();
    const credites = (bourse.exists && bourse.data().badgesCredites) || {};
    if (Object.keys(credites).some((cle) => cle.startsWith('guilde-fondee:'))) return;
    await crediter(uid, M_ENTREE, `guilde-fondee:${guildeId}`);
  }

  async function entrees(guildeId, avant, apres) {
    const anciens = (avant && avant.membres) || [];
    const nouveaux = (apres && apres.membres) || [];
    if ([...anciens].sort().join('\u0000') === [...nouveaux].sort().join('\u0000')) return;
    for (const uid of nouveaux.filter((u) => !anciens.includes(u))) {
      await crediter(uid, M_ENTREE, `guilde-rejointe:${guildeId}:${uid}`);
      await donnerPiecesEntree(guildeId, uid, 'entree');
    }
    await majTaux(guildeId, apres);
  }

  async function compterOui(guildeId, evId, evenement) {
    if (!evenement) return;
    const nbOui = Object.values(evenement.rsvp || {}).filter((r) => r === 'oui').length;
    if (evenement.nbOui === nbOui) return;
    await gRef(guildeId).collection('evenements').doc(evId).set({ nbOui }, { merge: true });
  }

  async function recalculerTaux() {
    const snap = await db.collection('guildes').get();
    let touchees = 0;
    for (const d of snap.docs) if (await majTaux(d.id, d.data())) touchees += 1;
    return { guildes: snap.docs.length, touchees };
  }

  // ── Callables ──────────────────────────────────────────────────────
  async function rejoindreParCode(uid, data) {
    const code = String(data.code || '').trim().toUpperCase();
    if (code.length !== 8) throw new HttpsError('invalid-argument', 'Code invalide.');
    const trouve = await db.collection('guildes').where('codeInvitation', '==', code).limit(1).get();
    if (!trouve.docs.length) throw new HttpsError('not-found', 'Aucune guilde ne porte ce code.');
    const doc = trouve.docs[0];
    if (!(doc.data().membres || []).includes(uid)) {
      await doc.ref.set({ membres: FieldValue.arrayUnion(uid), demandes: FieldValue.arrayRemove(uid), maj: SV() }, { merge: true });
    }
    return { guildeId: doc.id };
  }

  async function nouveauCodeInvitation(uid, data) {
    const guildeId = String(data.guildeId || '');
    exigeChef(exigeGuilde(await gRef(guildeId).get()), uid);
    const code = nouveauCode();
    await gRef(guildeId).set({ codeInvitation: code, maj: SV() }, { merge: true });
    return { code };
  }

  async function changer(uid, data) {
    const guildeId = String(data.guildeId || '');
    const montant = entier(data.montant);
    const jour = journeeFestival(Date.now());

    if (data.sens === 'piecesVersM') {
      const r = await db.runTransaction(async (tx) => {
        const [gSnap, bSnap] = await Promise.all([tx.get(gRef(guildeId)), tx.get(bRef(guildeId, uid))]);
        const guilde = exigeGuilde(gSnap);
        exigeMembre(guilde, uid);
        const b = bourseGuilde(bSnap);
        if (b.solde < montant) throw new HttpsError('failed-precondition', 'Pas assez de pièces.');
        const cumul = (b.changeJour === jour ? b.changeCumul : 0) + montant;
        if (cumul > PLAFOND_CHANGE_JOUR) throw new HttpsError('failed-precondition', `Plafond de ${PLAFOND_CHANGE_JOUR} pièces par jour atteint.`);
        const taux = tauxDe(guilde);
        const frais = Math.round(montant * FRAIS_CHANGE);
        const gainM = Math.floor((montant - frais) * taux);
        if (gainM <= 0) throw new HttpsError('invalid-argument', 'Ce montant ne vaut aucun Montpellois.');
        tx.set(bRef(guildeId, uid), { solde: b.solde - montant, depense: b.depense + montant, changeJour: jour, changeCumul: cumul, maj: SV() }, { merge: true });
        tx.set(gRef(guildeId), { tresor: (guilde.tresor || 0) + frais, maj: SV() }, { merge: true });
        tx.set(registre(guildeId).doc(), { type: 'change', de: uid, a: 'monnaie', pieces: montant, montpellois: gainM, taux, creeLe: SV() });
        return { soldePieces: b.solde - montant, gainM, taux, frais };
      });
      let soldeM;
      try {
        soldeM = await crediter(uid, r.gainM, null);
      } catch (e) {
        // Les pièces sont déjà parties : on les remet plutôt que de les
        // laisser disparaître entre les deux monnaies.
        await db.runTransaction(async (tx) => {
          const [gSnap, bSnap] = await Promise.all([tx.get(gRef(guildeId)), tx.get(bRef(guildeId, uid))]);
          const b = bourseGuilde(bSnap);
          tx.set(bRef(guildeId, uid), { solde: b.solde + montant, depense: Math.max(0, b.depense - montant), changeCumul: Math.max(0, b.changeCumul - montant), maj: SV() }, { merge: true });
          tx.set(gRef(guildeId), { tresor: Math.max(0, ((gSnap.exists ? gSnap.data().tresor : 0) || 0) - r.frais) }, { merge: true });
        });
        throw e;
      }
      return { soldeM, soldePieces: r.soldePieces, taux: r.taux };
    }

    if (data.sens !== 'mVersPieces') throw new HttpsError('invalid-argument', 'Sens de change inconnu.');
    const guilde = exigeGuilde(await gRef(guildeId).get());
    exigeMembre(guilde, uid);
    const taux = tauxDe(guilde);
    const pieces = Math.floor(montant / taux);
    if (pieces <= 0) throw new HttpsError('invalid-argument', 'Ce montant ne vaut aucune pièce.');
    const soldeM = await debiter(uid, montant);
    let soldePieces;
    try {
      soldePieces = await db.runTransaction(async (tx) => {
        const b = bourseGuilde(await tx.get(bRef(guildeId, uid)));
        const cumul = (b.changeJour === jour ? b.changeCumul : 0) + pieces;
        if (cumul > PLAFOND_CHANGE_JOUR) throw new HttpsError('failed-precondition', `Plafond de ${PLAFOND_CHANGE_JOUR} pièces par jour atteint.`);
        tx.set(bRef(guildeId, uid), { solde: b.solde + pieces, gagne: b.gagne + pieces, changeJour: jour, changeCumul: cumul, maj: SV() }, { merge: true });
        tx.set(registre(guildeId).doc(), { type: 'change', de: 'monnaie', a: uid, pieces, montpellois: montant, taux, creeLe: SV() });
        return b.solde + pieces;
      });
    } catch (e) {
      await crediter(uid, montant, null);
      throw e;
    }
    return { soldeM, soldePieces, taux };
  }

  async function virement(uid, data) {
    const guildeId = String(data.guildeId || '');
    const aUid = String(data.aUid || '');
    const montant = entier(data.montant);
    const note = String(data.note || '').slice(0, 200);
    if (aUid === uid) throw new HttpsError('invalid-argument', 'Vous ne pouvez pas vous virer des pièces.');
    return db.runTransaction(async (tx) => {
      const [gSnap, deSnap, aSnap] = await Promise.all([tx.get(gRef(guildeId)), tx.get(bRef(guildeId, uid)), tx.get(bRef(guildeId, aUid))]);
      const guilde = exigeGuilde(gSnap);
      exigeMembre(guilde, uid);
      exigeMembre(guilde, aUid);
      const de = bourseGuilde(deSnap);
      const a = bourseGuilde(aSnap);
      if (de.solde < montant) throw new HttpsError('failed-precondition', 'Pas assez de pièces.');
      tx.set(bRef(guildeId, uid), { solde: de.solde - montant, depense: de.depense + montant, maj: SV() }, { merge: true });
      tx.set(bRef(guildeId, aUid), { solde: a.solde + montant, gagne: a.gagne + montant, maj: SV() }, { merge: true });
      tx.set(registre(guildeId).doc(), { type: 'virement', de: uid, a: aUid, pieces: montant, note, creeLe: SV() });
      return { solde: de.solde - montant };
    });
  }

  async function tresorVerser(uid, data) {
    const guildeId = String(data.guildeId || '');
    const aUid = String(data.aUid || '');
    const montant = entier(data.montant);
    const note = String(data.note || '').slice(0, 200);
    return db.runTransaction(async (tx) => {
      const [gSnap, aSnap] = await Promise.all([tx.get(gRef(guildeId)), tx.get(bRef(guildeId, aUid))]);
      const guilde = exigeGuilde(gSnap);
      exigeChef(guilde, uid);
      exigeMembre(guilde, aUid);
      const tresor = guilde.tresor || 0;
      if (tresor < montant) throw new HttpsError('failed-precondition', 'Le trésor est trop bas.');
      const a = bourseGuilde(aSnap);
      tx.set(gRef(guildeId), { tresor: tresor - montant, maj: SV() }, { merge: true });
      tx.set(bRef(guildeId, aUid), { solde: a.solde + montant, gagne: a.gagne + montant, maj: SV() }, { merge: true });
      tx.set(registre(guildeId).doc(), { type: 'tresor', de: 'tresor', a: aUid, pieces: montant, note, creeLe: SV() });
      return { tresor: tresor - montant };
    });
  }

  /** Le patron d'acheterAuSouk, en pièces de guilde. */
  async function acheterAuSouk(uid, data) {
    const objetId = String(data.objetId || '');
    const soukRef = db.collection('souk').doc(objetId);
    return db.runTransaction(async (tx) => {
      const objetSnap = await tx.get(soukRef);
      if (!objetSnap.exists) throw new HttpsError('not-found', 'Cet objet n’existe plus.');
      const objet = objetSnap.data();
      if (objet.statut !== 'disponible') throw new HttpsError('failed-precondition', 'Cet objet n’est plus disponible.');
      const guildeId = String(objet.guildeId || '');
      if (!guildeId) throw new HttpsError('failed-precondition', 'Cet objet ne se vend pas en pièces de guilde.');
      const prix = objet.prixPieces;
      if (!Number.isInteger(prix) || prix <= 0) throw new HttpsError('failed-precondition', 'Cet objet ne se vend pas en pièces de guilde.');
      if (objet.uid === uid) throw new HttpsError('failed-precondition', 'Vous ne pouvez pas vous acheter vous-même.');
      const [gSnap, acheteurSnap, vendeurSnap] = await Promise.all([tx.get(gRef(guildeId)), tx.get(bRef(guildeId, uid)), tx.get(bRef(guildeId, objet.uid))]);
      const guilde = exigeGuilde(gSnap);
      exigeMembre(guilde, uid);
      exigeMembre(guilde, objet.uid);
      const acheteur = bourseGuilde(acheteurSnap);
      const vendeur = bourseGuilde(vendeurSnap);
      if (acheteur.solde < prix) throw new HttpsError('failed-precondition', 'Pas assez de pièces.');
      tx.set(bRef(guildeId, uid), { solde: acheteur.solde - prix, depense: acheteur.depense + prix, maj: SV() }, { merge: true });
      tx.set(bRef(guildeId, objet.uid), { solde: vendeur.solde + prix, gagne: vendeur.gagne + prix, maj: SV() }, { merge: true });
      tx.set(soukRef, { statut: 'vendu', maj: SV() }, { merge: true });
      tx.set(registre(guildeId).doc(), { type: 'souk', de: uid, a: objet.uid, pieces: prix, note: String(objet.titre || '').slice(0, 200), creeLe: SV() });
      return { solde: acheteur.solde - prix, guildeId };
    });
  }

  async function rsvpPayant(uid, data) {
    const guildeId = String(data.guildeId || '');
    const evId = String(data.evId || '');
    const evRef = gRef(guildeId).collection('evenements').doc(evId);
    return db.runTransaction(async (tx) => {
      const [evSnap, gSnap, bSnap] = await Promise.all([tx.get(evRef), tx.get(gRef(guildeId)), tx.get(bRef(guildeId, uid))]);
      if (!evSnap.exists) throw new HttpsError('not-found', 'Cet événement n’existe plus.');
      const evenement = evSnap.data();
      const guilde = exigeGuilde(gSnap);
      exigeMembre(guilde, uid);
      const prix = evenement.prixPieces;
      if (!Number.isInteger(prix) || prix <= 0) throw new HttpsError('failed-precondition', 'Cet événement est gratuit.');
      if ((evenement.rsvp || {})[uid] === 'oui') throw new HttpsError('failed-precondition', 'Vous êtes déjà inscrit.');
      const b = bourseGuilde(bSnap);
      if (b.solde < prix) throw new HttpsError('failed-precondition', 'Pas assez de pièces.');
      tx.set(bRef(guildeId, uid), { solde: b.solde - prix, depense: b.depense + prix, maj: SV() }, { merge: true });
      tx.set(gRef(guildeId), { tresor: (guilde.tresor || 0) + prix, maj: SV() }, { merge: true });
      tx.set(evRef, { rsvp: { [uid]: 'oui' }, maj: SV() }, { merge: true });
      tx.set(registre(guildeId).doc(), { type: 'evenement', de: uid, a: 'tresor', pieces: prix, note: String(evenement.titre || '').slice(0, 200), creeLe: SV() });
      return { solde: b.solde - prix };
    });
  }

  async function rattacherFondateur(uid, data) {
    const guildeId = String(data.guildeId || '');
    const nom = String(data.nom || '').trim();
    const cible = String(data.uid || '');
    if (!nom || !cible) throw new HttpsError('invalid-argument', 'Nom ou compte manquant.');
    const guilde = exigeGuilde(await gRef(guildeId).get());
    exigeChef(guilde, uid);
    const liste = guilde.membresFondateurs || [];
    const index = liste.findIndex((f) => f && String(f.nom || '').trim() === nom);
    if (index < 0) throw new HttpsError('not-found', 'Ce fondateur n’est pas dans la liste.');
    const membresFondateurs = liste.map((f, i) => (i === index ? { ...f, uid: cible } : f));
    const patch = { membresFondateurs, maj: SV() };
    if (liste[index].chef) patch.admins = FieldValue.arrayUnion(cible);
    await gRef(guildeId).set(patch, { merge: true });
    return { rattache: cible };
  }

  async function ics(req, res) {
    const guildeId = String((req.query && req.query.guilde) || '');
    const cle = String((req.query && req.query.cle) || '');
    const snap = await gRef(guildeId).get();
    if (!snap.exists) { res.status(404).send('Guilde inconnue.'); return; }
    const guilde = snap.data();
    if (!guilde.codeInvitation || cle !== guilde.codeInvitation) { res.status(403).send('Clé invalide.'); return; }
    const depuis = new Date(Date.now() - 90 * 86400000);
    const evenements = await gRef(guildeId).collection('evenements').where('debut', '>=', depuis).orderBy('debut').get();
    const maintenant = horodateIcs(Date.now());
    const lignes = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FMM//Guildes//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      `X-WR-CALNAME:${texteIcs(guilde.nom || 'Guilde')}`,
    ];
    for (const d of evenements.docs) {
      const ev = d.data();
      const debut = enMillisecondes(ev.debut) || Date.now();
      lignes.push(
        'BEGIN:VEVENT',
        `UID:${d.id}@festivalmedievaldemontpellier.org`,
        `DTSTAMP:${maintenant}`,
        `DTSTART:${horodateIcs(debut)}`,
        `DTEND:${horodateIcs(enMillisecondes(ev.fin) || debut + 3600000)}`,
        `SUMMARY:${texteIcs(ev.titre)}`,
      );
      if (ev.description) lignes.push(`DESCRIPTION:${texteIcs(ev.description)}`);
      if (ev.lieu) lignes.push(`LOCATION:${texteIcs(ev.lieu)}`);
      lignes.push('END:VEVENT');
    }
    lignes.push('END:VCALENDAR');
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.status(200).send(`${lignes.map(plier).join('\r\n')}\r\n`);
  }

  return {
    fondation, entrees, compterOui, recalculerTaux, majTaux, donnerPiecesEntree,
    rejoindreParCode, nouveauCodeInvitation, changer, virement, tresorVerser,
    acheterAuSouk, rsvpPayant, rattacherFondateur, ics,
  };
}

module.exports = (deps) => {
  const h = handlers(deps);
  const appel = (fn) => onCall({ region: REGION }, async (requete) => {
    const uid = requete.auth && requete.auth.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous d’abord.');
    return fn(uid, requete.data || {});
  });
  return {
    guildeFondation: onDocumentCreated({ document: 'guildes/{id}', ...DECLENCHEUR }, (e) => (e.data ? h.fondation(e.params.id, e.data.data()) : null)),
    guildeEntrees: onDocumentUpdated({ document: 'guildes/{id}', ...DECLENCHEUR }, (e) => h.entrees(e.params.id, e.data.before.data(), e.data.after.data())),
    guildeEvenementOui: onDocumentWritten({ document: 'guildes/{id}/evenements/{evId}', ...DECLENCHEUR }, (e) => h.compterOui(
      e.params.id, e.params.evId, e.data.after.exists ? e.data.after.data() : null,
    )),
    guildeRecalculerTaux: onSchedule({ region: REGION, schedule: '0 4 * * *', timeZone: 'America/Toronto', memory: '256MiB', retryCount: 0 }, () => h.recalculerTaux()),
    guildeIcs: onRequest({ region: REGION, memory: '256MiB' }, h.ics),
    guildeRejoindreParCode: appel(h.rejoindreParCode),
    guildeNouveauCode: appel(h.nouveauCodeInvitation),
    guildeChanger: appel(h.changer),
    guildeVirement: appel(h.virement),
    guildeTresorVerser: appel(h.tresorVerser),
    guildeAcheterAuSouk: appel(h.acheterAuSouk),
    guildeRsvpPayant: appel(h.rsvpPayant),
    guildeRattacherFondateur: appel(h.rattacherFondateur),
  };
};

// Pour test-guildes.js : les fonctions pures et les gestionnaires nus,
// sans l'enveloppe Cloud Functions.
module.exports.handlers = handlers;
module.exports.calculerTaux = calculerTaux;
module.exports.compterActifs = compterActifs;
module.exports.monnaieParDefaut = monnaieParDefaut;
module.exports.PLAFOND_CHANGE_JOUR = PLAFOND_CHANGE_JOUR;
module.exports.FRAIS_CHANGE = FRAIS_CHANGE;
