// ─── Ta place dans le clan · le jeu de l'année de la Peste ──────────
// Le questionnaire se joue dans le navigateur (src/lib/placeClan.ts
// tranche le verdict). Ici vit tout ce qui touche aux autres : garder
// le résultat, composer une équipe parmi les gens du même groupe,
// fonder un clan et inviter ses membres, répondre à une invitation.
//
// Tout passe par des appels signés : la collection `placeClan` et la
// collection `placeClanInvitations` ne s'écrivent et ne se lisent que
// d'ici, avec le SDK admin. Aucune règle Firestore à ajouter.
//
// Même patron que functions/guildes.js : une fabrique qui reçoit du
// serveur ce dont elle a besoin (db, FieldValue, la liste des courriels
// de l'équipe) et rend les fonctions Cloud.

const { onCall, HttpsError } = require('firebase-functions/v2/https');

const REGION = 'us-central1';

const FONCTIONS = ['souverain', 'champion', 'eclaireur', 'sage', 'batisseur', 'soigneur', 'heraut'];
const ARCHETYPES = ['roi', 'guerrier', 'magicien', 'amant'];
const GROUPES = ['chevaliers', 'vikings', 'pirates', 'artisans', 'clerge', 'saltimbanques'];
const NB_QUESTIONS = 15;
const NB_REPONSES = 4;
const MAX_CANDIDATS = 400;

const handlers = ({ db, FieldValue, COURRIELS_ADMIN }) => {
  const SV = () => FieldValue.serverTimestamp();
  const colResultats = () => db.collection('placeClan');
  const colInvitations = () => db.collection('placeClanInvitations');

  // ── Lecture des gens : pseudo, nom, couleur, photo ─────────────────
  async function fiches(uids) {
    const uniques = [...new Set(uids.filter(Boolean))];
    if (!uniques.length) return {};
    const refs = uniques.map((u) => db.collection('membres').doc(u));
    const snaps = await db.getAll(...refs);
    const out = {};
    snaps.forEach((s, i) => {
      const d = s.exists ? s.data() : {};
      out[uniques[i]] = {
        uid: uniques[i],
        nom: d.pseudo || d.nom || 'Quelqu’un de la troupe',
        avatarHue: typeof d.avatarHue === 'number' ? d.avatarHue : null,
        avatarUrl: d.avatarUrl || null,
      };
    });
    return out;
  }

  const lireMonResultat = async (uid) => {
    const s = await colResultats().doc(uid).get();
    return s.exists ? s.data() : null;
  };

  // ── Enregistrer un verdict ────────────────────────────────────────
  async function enregistrer(uid, data) {
    const groupe = String(data.groupe || '');
    const fonction = String(data.fonction || '');
    const seconde = String(data.seconde || '');
    const archetype = String(data.archetype || '');
    const reponses = Array.isArray(data.reponses) ? data.reponses.map(Number) : [];
    if (!GROUPES.includes(groupe)) throw new HttpsError('invalid-argument', 'Groupe inconnu.');
    if (!FONCTIONS.includes(fonction) || !FONCTIONS.includes(seconde)) throw new HttpsError('invalid-argument', 'Fonction inconnue.');
    if (!ARCHETYPES.includes(archetype)) throw new HttpsError('invalid-argument', 'Archétype inconnu.');
    if (reponses.length !== NB_QUESTIONS || reponses.some((r) => !Number.isInteger(r) || r < 0 || r >= NB_REPONSES)) {
      throw new HttpsError('invalid-argument', 'Le questionnaire est incomplet.');
    }
    const scores = {};
    for (const f of FONCTIONS) scores[f] = Math.max(0, Math.min(45, Number((data.scores || {})[f]) || 0));

    const avant = await lireMonResultat(uid);
    const memeGroupe = avant && avant.groupe === groupe;
    await colResultats().doc(uid).set({
      groupe, fonction, seconde, archetype, reponses, scores,
      // Changer de groupe efface l'équipe : elle n'a plus de sens ailleurs.
      equipe: memeGroupe ? (avant.equipe || null) : null,
      exclus: memeGroupe ? (avant.exclus || []) : [],
      clanId: avant ? (avant.clanId || null) : null,
      badge: avant && avant.badge === false ? false : true,
      faitLe: SV(),
      maj: SV(),
      creeLe: avant && avant.creeLe ? avant.creeLe : SV(),
    }, { merge: false });
    return { ok: true };
  }

  // ── Composer une équipe ────────────────────────────────────────────
  // Une personne par fonction, dans le même groupe. Une place sans
  // candidat direct se comble par quelqu'un dont c'est la seconde
  // fonction; sinon elle reste vide, et la page le dit.
  function composer(moi, candidats, exclus) {
    const pris = new Set([moi.uid]);
    const libres = candidats.filter((c) => c.uid !== moi.uid && !exclus.has(c.uid));
    const piocher = (liste) => {
      const dispo = liste.filter((c) => !pris.has(c.uid));
      if (!dispo.length) return null;
      const choix = dispo[Math.floor(Math.random() * dispo.length)];
      pris.add(choix.uid);
      return choix.uid;
    };
    return FONCTIONS.map((f) => {
      if (f === moi.fonction) return { fonction: f, uid: moi.uid, parDefaut: false };
      const direct = piocher(libres.filter((c) => c.fonction === f));
      if (direct) return { fonction: f, uid: direct, parDefaut: false };
      const second = piocher(libres.filter((c) => c.seconde === f));
      return { fonction: f, uid: second, parDefaut: second !== null };
    });
  }

  async function equipe(uid, data) {
    const moi = await lireMonResultat(uid);
    if (!moi) throw new HttpsError('failed-precondition', 'Faites d’abord le questionnaire.');
    const exclure = Array.isArray(data.exclure) ? data.exclure.map(String).slice(0, 50) : [];
    const exclus = new Set([...(moi.exclus || []), ...exclure]);
    const snap = await colResultats().where('groupe', '==', moi.groupe).limit(MAX_CANDIDATS).get();
    const candidats = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const places = composer({ uid, fonction: moi.fonction }, candidats, exclus);
    await colResultats().doc(uid).set({
      equipe: places, exclus: [...exclus], rerolls: FieldValue.increment(exclure.length ? 0 : 1), maj: SV(),
    }, { merge: true });
    const gens = await fiches(places.map((p) => p.uid));
    return { places: places.map((p) => ({ ...p, membre: p.uid ? gens[p.uid] : null })), nbCandidats: candidats.length - 1 };
  }

  // ── Lire : mon résultat, mon équipe, mes invitations ───────────────
  async function lire(uid) {
    const moi = await lireMonResultat(uid);
    const invSnap = await colInvitations().where('pour', '==', uid).where('statut', '==', 'demande').get();
    const invitations = invSnap.docs.map((d) => ({ id: d.id, ...d.data(), creeLe: null }));
    let places = null;
    if (moi && Array.isArray(moi.equipe)) {
      const gens = await fiches(moi.equipe.map((p) => p.uid));
      places = moi.equipe.map((p) => ({ ...p, membre: p.uid ? gens[p.uid] : null }));
    }
    const deQui = await fiches(invitations.map((i) => i.de));
    return {
      resultat: moi ? {
        groupe: moi.groupe, fonction: moi.fonction, seconde: moi.seconde, archetype: moi.archetype,
        scores: moi.scores, reponses: moi.reponses, clanId: moi.clanId || null,
        badge: moi.badge !== false,
      } : null,
      places,
      invitations: invitations.map((i) => ({ id: i.id, guildeId: i.guildeId, nomClan: i.nomClan, groupe: i.groupe, de: deQui[i.de] || null })),
    };
  }

  // ── Le profil d'une autre personne ─────────────────────────────────
  // Épingler le verdict sur sa fiche, ou le retirer. Le champ vit dans
  // le document du résultat : celui qui n'a pas joué n'a rien à épingler.
  async function badge(uid, data) {
    const voulu = data.afficher !== false;
    const doc = colResultats().doc(uid);
    const avant = await doc.get();
    if (!avant.exists) throw new HttpsError('failed-precondition', 'Faites le questionnaire d’abord.');
    await doc.set({ badge: voulu, maj: SV() }, { merge: true });
    return { ok: true, badge: voulu };
  }

  async function profil(_uid, data) {
    const cible = String(data.uid || '');
    if (!cible) throw new HttpsError('invalid-argument', 'Qui ?');
    const r = await lireMonResultat(cible);
    if (!r) return { resultat: null, places: null };
    let places = null;
    if (Array.isArray(r.equipe)) {
      const gens = await fiches(r.equipe.map((p) => p.uid));
      places = r.equipe.map((p) => ({ fonction: p.fonction, uid: p.uid, parDefaut: !!p.parDefaut, membre: p.uid ? gens[p.uid] : null }));
    }
    return {
      resultat: {
        groupe: r.groupe, fonction: r.fonction, seconde: r.seconde, archetype: r.archetype,
        clanId: r.clanId || null, badge: r.badge !== false,
      },
      places,
    };
  }

  // ── Fonder un clan et inviter l'équipe ─────────────────────────────
  const slugDe = (nom) => `${(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')}clan`.slice(0, 80);

  async function former(uid, data) {
    const moi = await lireMonResultat(uid);
    if (!moi || !Array.isArray(moi.equipe)) throw new HttpsError('failed-precondition', 'Composez d’abord une équipe.');
    if (moi.clanId) throw new HttpsError('already-exists', 'Votre clan existe déjà.');
    const nom = String(data.nom || '').trim().slice(0, 40);
    if (nom.length < 3) throw new HttpsError('invalid-argument', 'Le nom du clan est trop court.');
    const invites = moi.equipe.map((p) => p.uid).filter((u) => u && u !== uid);
    if (!invites.length) throw new HttpsError('failed-precondition', 'Personne à inviter pour l’instant.');

    let slug = slugDe(nom);
    if (slug.length < 7) slug = `${slug}${Math.random().toString(36).slice(2, 6)}`;
    for (let n = 2; n < 50; n++) {
      const pris = await db.collection('guildes').where('slug', '==', slug).limit(1).get();
      if (pris.empty) break;
      slug = `${slugDe(nom)}${n}`;
    }
    const ref = db.collection('guildes').doc();
    const description = `Clan formé par le jeu de l’année de la Peste, « Ta place dans le clan » : une personne par fonction, tirée parmi ${GROUPES.includes(moi.groupe) ? 'les ' + moi.groupe : 'le groupe'}.`;
    await ref.set({
      nom, description, slug, forme: 'clan',
      creePar: uid, admins: [uid], membres: [uid], demandes: [], nbMembres: 1,
      placeClan: { groupe: moi.groupe, invites },
      creeLe: SV(), maj: SV(),
    });
    const lot = db.batch();
    for (const pour of invites) {
      lot.set(colInvitations().doc(`${ref.id}__${pour}`), {
        guildeId: ref.id, nomClan: nom, groupe: moi.groupe, de: uid, pour,
        fonction: (moi.equipe.find((p) => p.uid === pour) || {}).fonction || null,
        statut: 'demande', creeLe: SV(), maj: SV(),
      });
    }
    lot.set(colResultats().doc(uid), { clanId: ref.id, maj: SV() }, { merge: true });
    await lot.commit();
    return { id: ref.id, slug, invites: invites.length };
  }

  async function repondre(uid, data) {
    const id = String(data.invitationId || '');
    const accepter = !!data.accepter;
    const ref = colInvitations().doc(id);
    const s = await ref.get();
    if (!s.exists || s.data().pour !== uid) throw new HttpsError('not-found', 'Invitation introuvable.');
    if (s.data().statut !== 'demande') throw new HttpsError('failed-precondition', 'Cette invitation a déjà reçu sa réponse.');
    const g = db.collection('guildes').doc(s.data().guildeId);
    await db.runTransaction(async (tx) => {
      const gs = await tx.get(g);
      if (!gs.exists) throw new HttpsError('not-found', 'Ce clan n’existe plus.');
      tx.update(ref, { statut: accepter ? 'acceptee' : 'refusee', maj: SV() });
      if (accepter) {
        const deja = (gs.data().membres || []).includes(uid);
        tx.update(g, { membres: FieldValue.arrayUnion(uid), nbMembres: deja ? gs.data().nbMembres : FieldValue.increment(1), maj: SV() });
        tx.set(colResultats().doc(uid), { clanId: g.id, maj: SV() }, { merge: true });
      }
    });
    return { ok: true, guildeId: g.id, slug: (await g.get()).data().slug || null };
  }

  // ── Les chiffres, pour l'admin ─────────────────────────────────────
  async function stats(uid, _data, requete) {
    const courriel = requete.auth && requete.auth.token && requete.auth.token.email ? String(requete.auth.token.email).toLowerCase() : null;
    if (!courriel || !COURRIELS_ADMIN.includes(courriel)) throw new HttpsError('permission-denied', 'Cette fonction est réservée à l’équipe.');
    const snap = await colResultats().get();
    const parGroupe = {}; const parFonction = {}; const croise = {}; const parArchetype = {};
    let clans = 0; let equipes = 0;
    snap.forEach((d) => {
      const r = d.data();
      parGroupe[r.groupe] = (parGroupe[r.groupe] || 0) + 1;
      parFonction[r.fonction] = (parFonction[r.fonction] || 0) + 1;
      parArchetype[r.archetype] = (parArchetype[r.archetype] || 0) + 1;
      croise[`${r.groupe}.${r.fonction}`] = (croise[`${r.groupe}.${r.fonction}`] || 0) + 1;
      if (r.clanId) clans += 1;
      if (Array.isArray(r.equipe)) equipes += 1;
    });
    const inv = await colInvitations().get();
    const invitations = { total: inv.size, acceptees: 0, refusees: 0, enAttente: 0 };
    inv.forEach((d) => {
      const st = d.data().statut;
      if (st === 'acceptee') invitations.acceptees += 1; else if (st === 'refusee') invitations.refusees += 1; else invitations.enAttente += 1;
    });
    return { total: snap.size, parGroupe, parFonction, parArchetype, croise, clans, equipes, invitations };
  }

  return { enregistrer, equipe, lire, profil, former, repondre, stats, badge };
};

module.exports = (deps) => {
  const h = handlers(deps);
  const appel = (fn) => onCall({ region: REGION }, async (requete) => {
    const uid = requete.auth && requete.auth.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous d’abord.');
    return fn(uid, requete.data || {}, requete);
  });
  return {
    placeClanEnregistrer: appel(h.enregistrer),
    placeClanEquipe: appel(h.equipe),
    placeClanLire: appel(h.lire),
    placeClanProfil: appel(h.profil),
    placeClanFormer: appel(h.former),
    placeClanRepondre: appel(h.repondre),
    placeClanStats: appel(h.stats),
    placeClanBadge: appel(h.badge),
  };
};
module.exports.handlers = handlers;
