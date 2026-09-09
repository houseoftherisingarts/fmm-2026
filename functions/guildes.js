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
 * de membres actifs et le poids du trésor de la guilde parmi les autres.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
// Le déclencheur Auth n'existe qu'en v1, comme compteCree dans index.js.
const functionsV1 = require('firebase-functions/v1');

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

/** Le cours du jour, deuxième version (addendum 2, ordre 12) :
 *  Montpellois pour une pièce, tiré des actifs et de la part que le
 *  trésor de la guilde pèse dans la valeur de tous les trésors. Dix
 *  actifs sans trésor donnent 0,5; quarante la parité; quarante avec
 *  tout le trésor du site 1,5; le plafond est 3. Jumelle de `tauxPour`
 *  côté client. */
function calculerTauxV2(nbActifs, partTresor) {
  const brut = 0.5 * Math.sqrt((Number(nbActifs) || 0) / 10) * (1 + 0.5 * (Number(partTresor) || 0));
  return Math.round(Math.min(3, Math.max(0.5, brut)) * 1000) / 1000;
}

/** La valeur en M de chaque trésor au cours précédent, et la part de
 *  chacun dans le total (zéro partout quand tout est vide). Prend une
 *  liste de `{ id, tresor, taux }`, rend un objet par identifiant. */
function repartirTresors(liste) {
  const valeurs = liste.map((g) => ({ id: g.id, valeurTresorM: Math.round((Number(g.tresor) || 0) * (Number(g.taux) || 0) * 100) / 100 }));
  const total = valeurs.reduce((s, v) => s + v.valeurTresorM, 0);
  const parts = {};
  for (const v of valeurs) parts[v.id] = { valeurTresorM: v.valeurTresorM, partTresor: total > 0 ? Math.round((v.valeurTresorM / total) * 10000) / 10000 : 0 };
  return parts;
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

// ── L'équipe du festival ─────────────────────────────────────────────
// La liste vit dans config/equipe-admin.json, et scripts/sync-equipe.mjs
// la recopie partout avant chaque déploiement. Le déploiement n'envoie
// que le dossier functions/, où ce fichier n'existe pas : on lit alors
// la copie que le script a écrite dans index.js entre ses deux repères,
// qui part dans le même paquet. Les deux listes sont la même.
function lireEquipe() {
  try {
    const { equipe } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'equipe-admin.json'), 'utf8'));
    return equipe.map((m) => String(m.courriel || '').trim().toLowerCase()).filter(Boolean);
  } catch {
    const bloc = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8').split('// ÉQUIPE:DÉBUT')[1] || '';
    return [...bloc.split('// ÉQUIPE:FIN')[0].matchAll(/'([^']+)'/g)].map((m) => m[1].toLowerCase());
  }
}
const COURRIELS_EQUIPE = lireEquipe();

/** Dernier mot du nom + « Coin », sigle sur trois lettres, glyphe ◎. */
function monnaieParDefaut(nom) {
  const mots = String(nom || 'Guilde').trim().split(/\s+/);
  const dernier = mots[mots.length - 1] || 'Guilde';
  const lettres = (dernier.normalize('NFD').replace(/[^A-Za-z0-9]/g, '') || 'GLD').padEnd(3, 'X');
  return { nom: `${dernier} Coin`, sigle: lettres.slice(0, 3).toUpperCase(), glyphe: '◎' };
}

const sansVide = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** Ce que la fiche montre au monde, dans guildesPubliques/{id}. Rien
 *  qui ouvre une porte (code d'invitation, demandes, listes de membres
 *  et de chefs, bourses) n'y passe (addendum du 6 septembre, ordre 8).
 *  Le cours, les actifs et le trésor y passent depuis l'addendum 2
 *  (ordre 12) : le bureau de change les lit sans être de la guilde. */
function miroirPublic(g) {
  const m = g.monnaie || {};
  return sansVide({
    nom: g.nom, forme: g.forme, slug: g.slug, description: g.description,
    blason: g.blason, banniereUrl: g.banniereUrl, nbMembres: g.nbMembres,
    monnaie: g.monnaie ? sansVide({ nom: m.nom, sigle: m.sigle, glyphe: m.glyphe, imageUrl: m.imageUrl }) : undefined,
    taux: g.taux, nbActifs: g.nbActifs, tresor: g.tresor, valeurTresorM: g.valeurTresorM, partTresor: g.partTresor,
    tauxHistorique: Array.isArray(g.tauxHistorique) ? g.tauxHistorique.slice(-HISTORIQUE_MAX) : undefined,
  });
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
  // Le courriel du compte, par l'Admin SDK; test-guildes.js le remplace.
  const lireCourriel = deps.lireCourriel
    || ((uid) => require('firebase-admin').auth().getUser(uid).then((u) => u.email || ''));

  /** L'équipe du festival : courriel dans config/equipe-admin.json, ou
   *  `administrateur` dans membres/{uid}.roles. Elle fait tout ce qu'un
   *  chef fait (addendum du 6 septembre, ordre 5). */
  async function estEquipe(uid) {
    const courriel = await lireCourriel(uid).catch(() => '');
    if (COURRIELS_EQUIPE.includes(String(courriel).trim().toLowerCase())) return true;
    const m = await db.collection('membres').doc(uid).get();
    return Boolean(m.exists && (m.data().roles || []).includes('administrateur'));
  }
  async function exigeChefOuEquipe(guilde, uid) {
    if ((guilde.admins || []).includes(uid) || await estEquipe(uid)) return;
    throw new HttpsError('permission-denied', 'Réservé aux chefs.');
  }
  function entier(valeur) {
    const n = Math.floor(Number(valeur));
    if (!Number.isFinite(n) || n <= 0) throw new HttpsError('invalid-argument', 'Montant invalide.');
    return n;
  }
  const tauxDe = (g) => (typeof g.taux === 'number' ? g.taux : calculerTauxV2(g.nbActifs || 0, g.partTresor || 0));

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

  async function compterActifsDe(guildeId, guilde) {
    const vus = {};
    await Promise.all((guilde.membres || []).map(async (uid) => {
      const [m, b] = await Promise.all([db.collection('membres').doc(uid).get(), bRef(guildeId, uid).get()]);
      vus[uid] = { vuLe: m.exists ? m.data().vuLe : null, maj: b.exists ? b.data().maj : null };
    }));
    return compterActifs(guilde, vus);
  }

  /** Le cours de toutes les guildes, ensemble (addendum 2, ordre 12) :
   *  la part de trésor de chacune dépend de la valeur des autres, donc
   *  aucune ne se recalcule seule. N'écrit que les fiches qui bougent :
   *  la fiche est son propre déclencheur, et une écriture inutile
   *  tournerait en rond. */
  // ponytail: relit toutes les guildes et tous leurs membres à chaque
  // appel; un compteur d'actifs tenu par déclencheur si les guildes se
  // comptent par centaines.
  async function recalculerTousLesTaux() {
    const snap = await db.collection('guildes').get();
    const fiches = snap.docs.map((d) => ({ id: d.id, g: d.data() }));
    const actifs = {};
    await Promise.all(fiches.map(async ({ id, g }) => { actifs[id] = await compterActifsDe(id, g); }));
    const parts = repartirTresors(fiches.map(({ id, g }) => ({ id, tresor: g.tresor || 0, taux: tauxDe(g) })));
    const jour = journeeFestival(Date.now());
    let touchees = 0;
    for (const { id, g } of fiches) {
      const { valeurTresorM, partTresor } = parts[id];
      const nbActifs = actifs[id];
      const nbMembres = (g.membres || []).length;
      const taux = calculerTauxV2(nbActifs, partTresor);
      if (g.taux === taux && g.nbActifs === nbActifs && g.nbMembres === nbMembres
          && g.partTresor === partTresor && g.valeurTresorM === valeurTresorM) continue;
      const tauxHistorique = (g.tauxHistorique || [])
        .filter((e) => e && e.jour !== jour)
        .concat([{ jour, taux, nbActifs, partTresor }])
        .slice(-HISTORIQUE_MAX);
      await gRef(id).set({ taux, nbActifs, nbMembres, partTresor, valeurTresorM, tauxHistorique, maj: SV() }, { merge: true });
      touchees += 1;
    }
    return { guildes: fiches.length, touchees };
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
      patch.taux = calculerTauxV2(1, 0);
      patch.nbActifs = 1;
      patch.partTresor = 0;
      patch.valeurTresorM = 0;
      patch.tauxHistorique = [{ jour: journeeFestival(Date.now()), taux: patch.taux, nbActifs: 1, partTresor: 0 }];
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

  /** Sur chaque mise à jour de la fiche : les nouveaux membres touchent
   *  leurs bonus, puis le cours de toutes les guildes se refait dès que
   *  la liste des membres ou le trésor a bougé (addendum 2, ordre 12).
   *  Passer par le déclencheur plutôt que par chaque callable couvre
   *  tous les mouvements de trésor d'un seul endroit. */
  async function entrees(guildeId, avant, apres) {
    const anciens = (avant && avant.membres) || [];
    const nouveaux = (apres && apres.membres) || [];
    const membresBouges = [...anciens].sort().join('\u0000') !== [...nouveaux].sort().join('\u0000');
    for (const uid of membresBouges ? nouveaux.filter((u) => !anciens.includes(u)) : []) {
      await crediter(uid, M_ENTREE, `guilde-rejointe:${guildeId}:${uid}`);
      await donnerPiecesEntree(guildeId, uid, 'entree');
    }
    if (membresBouges || ((avant && avant.tresor) || 0) !== ((apres && apres.tresor) || 0)) await recalculerTousLesTaux();
  }

  async function compterOui(guildeId, evId, evenement) {
    if (!evenement) return;
    const nbOui = Object.values(evenement.rsvp || {}).filter((r) => r === 'oui').length;
    if (evenement.nbOui === nbOui) return;
    await gRef(guildeId).collection('evenements').doc(evId).set({ nbOui }, { merge: true });
  }

  /** Le miroir public, réécrit à chaque écriture de la fiche et effacé
   *  avec elle. N'écrit que si la face publique a bougé : la fiche se
   *  réécrit souvent pour son taux, et le miroir n'a pas à suivre. */
  async function miroir(guildeId, avant, apres) {
    const ref = db.collection('guildesPubliques').doc(guildeId);
    if (!apres) { await ref.delete(); return; }
    const neuf = miroirPublic(apres);
    if (avant && JSON.stringify(miroirPublic(avant)) === JSON.stringify(neuf)) return;
    await ref.set(neuf);
  }

  /** Un compte qui naît avec le courriel d'un fondateur attendu prend
   *  sa place (addendum 2, ordre 9) : uid sur la ligne, entrée dans
   *  membres[] (le déclencheur d'entrée paie les bonus) et dans admins[]
   *  si la ligne dit chef. Rejouable : une ligne déjà rattachée à ce
   *  compte ne bouge plus. Rend les guildes touchées. */
  // ponytail: balaie toutes les guildes, Firestore ne filtre pas dans un
  // tableau de maps; un champ fondateursCourriels[] indexé si les guildes
  // se comptent par centaines.
  async function fondateurParCourriel(uid, courriel) {
    const mail = String(courriel || '').trim().toLowerCase();
    if (!uid || !mail) return [];
    const memeCourriel = (f) => f && String(f.courriel || '').trim().toLowerCase() === mail;
    const snap = await db.collection('guildes').get();
    const touchees = [];
    for (const d of snap.docs) {
      const lignes = d.data().membresFondateurs || [];
      if (!lignes.some((f) => memeCourriel(f) && f.uid !== uid)) continue;
      const membresFondateurs = lignes.map((f) => (memeCourriel(f) ? { ...f, uid } : f));
      const patch = { membresFondateurs, membres: FieldValue.arrayUnion(uid), maj: SV() };
      if (membresFondateurs.some((f) => f.uid === uid && f.chef === true)) patch.admins = FieldValue.arrayUnion(uid);
      await d.ref.set(patch, { merge: true });
      touchees.push(d.id);
    }
    return touchees;
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
    await exigeChefOuEquipe(exigeGuilde(await gRef(guildeId).get()), uid);
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
        const frais = Math.ceil(montant * FRAIS_CHANGE);
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
      await exigeChefOuEquipe(guilde, uid);
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

  /** Mes pièces d'une guilde contre celles d'une autre (addendum 2,
   *  ordre 11) : A vers M au cours de A, 5 % de frais en pièces A au
   *  trésor de A, puis M vers B au cours de B. Le Montpellois ne fait
   *  que passer, alors les deux bourses bougent dans une seule
   *  transaction. Le plafond du jour se compte du côté de A. */
  async function changerCroise(uid, data) {
    const deId = String(data.deGuildeId || '');
    const versId = String(data.versGuildeId || '');
    const montant = entier(data.montant);
    if (!deId || !versId || deId === versId) throw new HttpsError('invalid-argument', 'Choisissez deux guildes différentes.');
    const jour = journeeFestival(Date.now());
    return db.runTransaction(async (tx) => {
      const [deSnap, versSnap, bDeSnap, bVersSnap] = await Promise.all([
        tx.get(gRef(deId)), tx.get(gRef(versId)), tx.get(bRef(deId, uid)), tx.get(bRef(versId, uid)),
      ]);
      const de = exigeGuilde(deSnap);
      const vers = exigeGuilde(versSnap);
      exigeMembre(de, uid);
      exigeMembre(vers, uid);
      const bDe = bourseGuilde(bDeSnap);
      const bVers = bourseGuilde(bVersSnap);
      if (bDe.solde < montant) throw new HttpsError('failed-precondition', 'Pas assez de pièces.');
      const cumul = (bDe.changeJour === jour ? bDe.changeCumul : 0) + montant;
      if (cumul > PLAFOND_CHANGE_JOUR) throw new HttpsError('failed-precondition', `Plafond de ${PLAFOND_CHANGE_JOUR} pièces par jour atteint.`);
      const coursDe = tauxDe(de);
      const coursVers = tauxDe(vers);
      const frais = Math.ceil(montant * FRAIS_CHANGE);
      const montpellois = Math.floor((montant - frais) * coursDe);
      const pieces = Math.floor(montpellois / coursVers);
      if (pieces <= 0) throw new HttpsError('invalid-argument', 'Ce montant ne vaut aucune pièce là-bas.');
      tx.set(bRef(deId, uid), { solde: bDe.solde - montant, depense: bDe.depense + montant, changeJour: jour, changeCumul: cumul, maj: SV() }, { merge: true });
      tx.set(gRef(deId), { tresor: (de.tresor || 0) + frais, maj: SV() }, { merge: true });
      tx.set(bRef(versId, uid), { solde: bVers.solde + pieces, gagne: bVers.gagne + pieces, maj: SV() }, { merge: true });
      tx.set(registre(deId).doc(), { type: 'change', de: uid, a: 'monnaie', pieces: montant, montpellois, taux: coursDe, autreGuildeId: versId, autreGuildeNom: vers.nom || '', creeLe: SV() });
      tx.set(registre(versId).doc(), { type: 'change', de: 'monnaie', a: uid, pieces, montpellois, taux: coursVers, autreGuildeId: deId, autreGuildeNom: de.nom || '', creeLe: SV() });
      return { soldePiecesDe: bDe.solde - montant, soldePiecesVers: bVers.solde + pieces, piecesRecues: pieces, montpellois, tauxDe: coursDe, tauxVers: coursVers };
    });
  }

  /** Une fortune de trésor à trésor (addendum 2, ordre 11) : chef ou
   *  équipe de la guilde qui donne, conversion aux deux cours, sans
   *  frais, une ligne `transfert` dans chaque registre. */
  async function tresorTransferer(uid, data) {
    const deId = String(data.deGuildeId || '');
    const versId = String(data.versGuildeId || '');
    const montant = entier(data.montant);
    const note = String(data.note || '').slice(0, 200);
    if (!deId || !versId || deId === versId) throw new HttpsError('invalid-argument', 'Choisissez deux guildes différentes.');
    return db.runTransaction(async (tx) => {
      const [deSnap, versSnap] = await Promise.all([tx.get(gRef(deId)), tx.get(gRef(versId))]);
      const de = exigeGuilde(deSnap);
      const vers = exigeGuilde(versSnap);
      await exigeChefOuEquipe(de, uid);
      const tresor = de.tresor || 0;
      if (tresor < montant) throw new HttpsError('failed-precondition', 'Le trésor est trop bas.');
      const coursDe = tauxDe(de);
      const coursVers = tauxDe(vers);
      const montpellois = Math.floor(montant * coursDe);
      const pieces = Math.floor(montpellois / coursVers);
      if (pieces <= 0) throw new HttpsError('invalid-argument', 'Ce montant ne vaut aucune pièce là-bas.');
      tx.set(gRef(deId), { tresor: tresor - montant, maj: SV() }, { merge: true });
      tx.set(gRef(versId), { tresor: (vers.tresor || 0) + pieces, maj: SV() }, { merge: true });
      tx.set(registre(deId).doc(), { type: 'transfert', de: 'tresor', a: 'monnaie', pieces: montant, montpellois, taux: coursDe, note, autreGuildeId: versId, autreGuildeNom: vers.nom || '', creeLe: SV() });
      tx.set(registre(versId).doc(), { type: 'transfert', de: 'monnaie', a: 'tresor', pieces, montpellois, taux: coursVers, note, autreGuildeId: deId, autreGuildeNom: de.nom || '', creeLe: SV() });
      return { tresorDe: tresor - montant, tresorVers: (vers.tresor || 0) + pieces, pieces, montpellois, tauxDe: coursDe, tauxVers: coursVers };
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
    await exigeChefOuEquipe(guilde, uid);
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
    fondation, entrees, compterOui, miroir, estEquipe, recalculerTousLesTaux, fondateurParCourriel, donnerPiecesEntree,
    rejoindreParCode, nouveauCodeInvitation, changer, changerCroise, virement, tresorVerser, tresorTransferer,
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
    guildeMiroir: onDocumentWritten({ document: 'guildes/{id}', ...DECLENCHEUR }, (e) => h.miroir(
      e.params.id, e.data.before.exists ? e.data.before.data() : null, e.data.after.exists ? e.data.after.data() : null,
    )),
    guildeEvenementOui: onDocumentWritten({ document: 'guildes/{id}/evenements/{evId}', ...DECLENCHEUR }, (e) => h.compterOui(
      e.params.id, e.params.evId, e.data.after.exists ? e.data.after.data() : null,
    )),
    guildeFondateurCourriel: functionsV1.region(REGION).auth.user().onCreate((user) => h.fondateurParCourriel(user.uid, user.email)),
    guildeRecalculerTaux: onSchedule({ region: REGION, schedule: '0 4 * * *', timeZone: 'America/Toronto', memory: '256MiB', retryCount: 0 }, () => h.recalculerTousLesTaux()),
    guildeIcs: onRequest({ region: REGION, memory: '256MiB' }, h.ics),
    guildeRejoindreParCode: appel(h.rejoindreParCode),
    guildeNouveauCode: appel(h.nouveauCodeInvitation),
    guildeChanger: appel(h.changer),
    guildeChangerCroise: appel(h.changerCroise),
    guildeVirement: appel(h.virement),
    guildeTresorVerser: appel(h.tresorVerser),
    guildeTresorTransferer: appel(h.tresorTransferer),
    guildeAcheterAuSouk: appel(h.acheterAuSouk),
    guildeRsvpPayant: appel(h.rsvpPayant),
    guildeRattacherFondateur: appel(h.rattacherFondateur),
  };
};

// Pour test-guildes.js : les fonctions pures et les gestionnaires nus,
// sans l'enveloppe Cloud Functions.
module.exports.handlers = handlers;
module.exports.calculerTauxV2 = calculerTauxV2;
module.exports.repartirTresors = repartirTresors;
module.exports.compterActifs = compterActifs;
module.exports.monnaieParDefaut = monnaieParDefaut;
module.exports.miroirPublic = miroirPublic;
module.exports.COURRIELS_EQUIPE = COURRIELS_EQUIPE;
module.exports.PLAFOND_CHANGE_JOUR = PLAFOND_CHANGE_JOUR;
module.exports.FRAIS_CHANGE = FRAIS_CHANGE;
