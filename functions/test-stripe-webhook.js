/**
 * Test local du webhook `stripeMontpellois` (aucune clé réelle, aucun
 * appel réseau, aucun déploiement). Lancer :
 *
 *   cd functions && node test-stripe-webhook.js
 *
 * Ce que le test prouve :
 *   1. Un événement checkout.session.completed SIGNÉ (signature bâtie
 *      par stripe.webhooks.generateTestHeaderString avec un secret de
 *      test) crédite la bourse du bon nombre de Montpellois.
 *   2. Le REJEU du même événement, que Stripe pratique, ne crédite pas
 *      une seconde fois : la clé `stripe_<session>` posée dans
 *      `bourses/{uid}.badgesCredites` bloque le second passage.
 *   3. Une signature invalide est refusée avec un 400 et n'écrit rien.
 *   4. Une session non réglée (payment_status ≠ 'paid') n'écrit rien.
 *
 * La machine d'Alex n'a pas de runtime Java, donc l'émulateur Firestore
 * ne démarre pas ici : le module `firebase-admin` est remplacé par une
 * bourse en mémoire (transactions, get, set avec merge). Tout le reste
 * du chemin est le VRAI code de index.js — la vérification de
 * signature de Stripe, le webhook, et la fonction `crediter`.
 */

const assert = require('assert');
const Module = require('module');

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'festivalmedieval';
process.env.STRIPE_SECRET_KEY = 'sk_test_bidon_pour_le_test_local';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_bidon_pour_le_test_local';

// ── La fausse Firestore, juste assez pour crediter() et poserBadge() ──
const donnees = new Map(); // 'collection/doc' -> objet

function fusionner(cible, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && v.constructor === Object) {
      cible[k] = fusionner({ ...(cible[k] || {}) }, v);
    } else {
      cible[k] = v;
    }
  }
  return cible;
}

function refDe(chemin) {
  return {
    chemin,
    async get() { return snapDe(chemin); },
    async set(patch, options) {
      const avant = options && options.merge ? { ...(donnees.get(chemin) || {}) } : {};
      donnees.set(chemin, fusionner(avant, patch));
    },
    async update(patch) {
      const avant = { ...(donnees.get(chemin) || {}) };
      for (const [k, v] of Object.entries(patch)) {
        const bouts = k.split('.');
        let noeud = avant;
        while (bouts.length > 1) { const b = bouts.shift(); noeud[b] = { ...(noeud[b] || {}) }; noeud = noeud[b]; }
        noeud[bouts[0]] = v;
      }
      donnees.set(chemin, avant);
    },
  };
}

function snapDe(chemin) {
  const brut = donnees.get(chemin);
  return { exists: brut !== undefined, data: () => ({ ...(brut || {}) }) };
}

const fausseDb = {
  collection: (nom) => ({ doc: (id) => refDe(`${nom}/${id}`) }),
  doc: (chemin) => refDe(chemin),
  batch: () => {
    const gestes = [];
    return {
      set: (ref, patch, options) => gestes.push(() => ref.set(patch, options)),
      commit: async () => { for (const g of gestes) await g(); },
    };
  },
  // Aucun parallélisme dans ce test : la transaction s'exécute d'un trait.
  runTransaction: async (fn) => fn({
    get: async (ref) => snapDe(ref.chemin),
    set: (ref, patch, options) => { void ref.set(patch, options); },
  }),
};

const vraiFirestore = require('firebase-admin/firestore');
const fauxAdmin = {
  initializeApp: () => ({}),
  firestore: Object.assign(() => fausseDb, { FieldValue: vraiFirestore.FieldValue }),
  auth: () => ({ listUsers: async () => ({ users: [] }) }),
};

const vraiLoad = Module._load;
Module._load = function (nom, ...reste) {
  if (nom === 'firebase-admin') return fauxAdmin;
  return vraiLoad.call(this, nom, ...reste);
};

const fonctions = require('./index.js');
Module._load = vraiLoad;

const stripe = require('stripe')('sk_test_bidon_pour_le_test_local');

// ── Les faux req / res ───────────────────────────────────────────────
function requete(charge, signature) {
  const brut = Buffer.from(charge, 'utf8');
  const entetes = { 'stripe-signature': signature, 'content-type': 'application/json' };
  return {
    method: 'POST',
    rawBody: brut,
    body: JSON.parse(charge),
    headers: entetes,
    get: (n) => entetes[String(n).toLowerCase()],
  };
}

function reponse() {
  const r = { code: 0, corps: null };
  r.status = (c) => { r.code = c; return r; };
  r.send = (b) => { r.corps = b; return r; };
  r.json = (b) => { r.corps = b; return r; };
  r.set = () => r;
  r.setHeader = () => r;
  r.on = () => r;
  return r;
}

function evenement(sessionId, packId, uid, statut = 'paid') {
  return JSON.stringify({
    id: `evt_${sessionId}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { id: sessionId, object: 'checkout.session', payment_status: statut, amount_total: 500, currency: 'cad', metadata: { uid, packId } } },
  });
}

async function appeler(charge, secretDeSignature = process.env.STRIPE_WEBHOOK_SECRET) {
  const signature = stripe.webhooks.generateTestHeaderString({ payload: charge, secret: secretDeSignature });
  const res = reponse();
  await fonctions.stripeMontpellois(requete(charge, signature), res);
  return res;
}

const bourse = (uid) => donnees.get(`bourses/${uid}`) || null;

(async () => {
  const UID = 'compte-de-test';

  // 1. Le premier passage crédite.
  const charge = evenement('cs_test_A1', 'p100', UID);
  let res = await appeler(charge);
  assert.strictEqual(res.code, 200, `attendu 200, reçu ${res.code} (${res.corps})`);
  assert.strictEqual(res.corps, 'crédité');
  assert.strictEqual(bourse(UID).solde, 110, 'solde = 10 de départ + 100 achetés');
  assert.strictEqual(bourse(UID).gagne, 110);
  assert.strictEqual(bourse(UID).badgesCredites.stripe_cs_test_A1, true, 'la clé d’idempotence est posée');
  console.log('✓ paiement signé : bourse à', bourse(UID).solde, 'Montpellois');

  // 2. Le rejeu du MÊME événement ne repaie pas.
  res = await appeler(charge);
  assert.strictEqual(res.code, 200);
  assert.strictEqual(res.corps, 'déjà crédité');
  assert.strictEqual(bourse(UID).solde, 110, 'le rejeu de Stripe ne crédite pas deux fois');
  console.log('✓ rejeu du même paiement : bourse toujours à', bourse(UID).solde);

  // 3. Une AUTRE session crédite bel et bien (la clé porte la session).
  res = await appeler(evenement('cs_test_B2', 'p500', UID));
  assert.strictEqual(res.corps, 'crédité');
  assert.strictEqual(bourse(UID).solde, 610, '110 + 500 du lot p500');
  console.log('✓ seconde session, lot p500 : bourse à', bourse(UID).solde);

  // 4. Signature invalide : 400, rien n'est écrit.
  res = await appeler(evenement('cs_test_C3', 'p300', UID), 'whsec_un_autre_secret');
  assert.strictEqual(res.code, 400, 'une signature étrangère doit être refusée');
  assert.strictEqual(bourse(UID).solde, 610, 'aucune écriture sur signature invalide');
  console.log('✓ signature invalide : 400, bourse intacte à', bourse(UID).solde);

  // 5. Session non réglée : 200, rien n'est écrit.
  res = await appeler(evenement('cs_test_D4', 'p300', UID, 'unpaid'));
  assert.strictEqual(res.code, 200);
  assert.strictEqual(res.corps, 'paiement non réglé');
  assert.strictEqual(bourse(UID).solde, 610);
  console.log('✓ session non réglée : rien de crédité, bourse à', bourse(UID).solde);

  // 6. Un lot inconnu ne crédite rien.
  res = await appeler(evenement('cs_test_E5', 'p9999', UID));
  assert.strictEqual(res.corps, 'rien à créditer');
  assert.strictEqual(bourse(UID).solde, 610);
  console.log('✓ lot inconnu : rien de crédité');

  // Le rang de fortune s'est posé au passage, comme pour un badge gagné.
  assert.ok(donnees.get(`badges/${UID}`).obtenus['fortune-100'], 'le rang « Bourse garnie » est posé');
  console.log('✓ rang de fortune « fortune-100 » posé par crediter');

  console.log('\nTous les tests du webhook Stripe passent.');
})().catch((e) => { console.error('ÉCHEC :', e); process.exit(1); });
