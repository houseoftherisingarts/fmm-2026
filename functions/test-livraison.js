/**
 * Test local du pilote « repas livrés au kiosque » (aucune clé réelle,
 * aucun appel réseau, aucun déploiement). Lancer :
 *
 *   cd functions && node test-livraison.js
 *
 * Ce que le test prouve :
 *   1. L'addition : 2 personnes × 3 jours × 50 $ font 300 $, plus
 *      15,00 $ de TPS et 29,93 $ de TVQ, donc 344,93 $.
 *   2. Une fiche payée par le webhook se marque une seule fois. Stripe
 *      rejoue ses événements, et le rejeu ne dédouble ni la fiche ni
 *      le compteur des places.
 *   3. Les dix places tiennent : la onzième réservation part sur la
 *      liste d'attente au lieu d'ouvrir une caisse.
 *   4. Une fiche non payée depuis plus d'une demi-heure rend sa place.
 *
 * Même ruse que test-stripe-webhook.js : `firebase-admin` est remplacé
 * par une Firestore en mémoire, et le reste du chemin est le VRAI code
 * de index.js. Stripe et nodemailer sont bouchés pour que rien ne sorte
 * de la machine.
 */

const assert = require('assert');
const Module = require('module');

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'festivalmedieval';
process.env.STRIPE_SECRET_KEY = 'sk_test_bidon_pour_le_test_local';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_bidon_pour_le_test_local';
process.env.ZOHO_APP_PASSWORD = 'motdepasse-bidon';

// ── Firestore en mémoire ─────────────────────────────────────────────
const donnees = new Map(); // 'collection/doc' -> objet
let compteurId = 0;

const horodate = () => { const t = Date.now(); return { toMillis: () => t }; };

function fusionner(cible, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && v.constructor === Object) cible[k] = fusionner({ ...(cible[k] || {}) }, v);
    else cible[k] = v;
  }
  return cible;
}

const snapDe = (chemin) => {
  const brut = donnees.get(chemin);
  return { id: chemin.split('/').pop(), exists: brut !== undefined, data: () => ({ ...(brut || {}) }) };
};

function refDe(chemin) {
  return {
    chemin,
    id: chemin.split('/').pop(),
    async get() { return snapDe(chemin); },
    async set(patch, options) {
      const avant = options && options.merge ? { ...(donnees.get(chemin) || {}) } : {};
      donnees.set(chemin, fusionner(avant, patch));
    },
    async delete() { donnees.delete(chemin); },
  };
}

const fichesDe = (nom) => [...donnees.entries()]
  .filter(([c]) => c.startsWith(`${nom}/`) && c.split('/').length === 2)
  .map(([c, v]) => ({ id: c.split('/').pop(), data: () => ({ ...v }) }));

const snapshotDe = (docs) => ({
  docs, empty: docs.length === 0, size: docs.length,
  forEach: (fn) => docs.forEach(fn),
});

function collectionDe(nom) {
  return {
    doc: (id) => refDe(`${nom}/${id}`),
    async add(obj) { const ref = refDe(`${nom}/auto${++compteurId}`); await ref.set(obj); return ref; },
    async get() { return snapshotDe(fichesDe(nom)); },
    where(champ, op, valeur) {
      assert.strictEqual(op, '==', 'le test ne couvre que l’égalité');
      const filtres = fichesDe(nom).filter((d) => d.data()[champ] === valeur);
      return { async get() { return snapshotDe(filtres); }, limit: () => ({ async get() { return snapshotDe(filtres.slice(0, 1)); } }) };
    },
  };
}

const fausseDb = {
  collection: collectionDe,
  doc: (chemin) => refDe(chemin),
  runTransaction: async (fn) => fn({
    get: async (ref) => snapDe(ref.chemin),
    set: (ref, patch, options) => { void ref.set(patch, options); },
  }),
};

const vraiFirestore = require('firebase-admin/firestore');
const fauxAdmin = {
  initializeApp: () => ({}),
  firestore: Object.assign(() => fausseDb, {
    FieldValue: { ...vraiFirestore.FieldValue, serverTimestamp: horodate, increment: vraiFirestore.FieldValue.increment },
  }),
  auth: () => ({ listUsers: async () => ({ users: [] }) }),
};

const vraiStripe = require('stripe');
const sessionsCreees = [];
const fauxStripe = (cle) => ({
  checkout: {
    sessions: {
      create: async (params) => {
        sessionsCreees.push(params);
        return { id: `cs_test_${sessionsCreees.length}`, url: 'https://checkout.stripe.test/session' };
      },
    },
  },
  webhooks: vraiStripe(cle).webhooks,
});

const vraiLoad = Module._load;
Module._load = function (nom, ...reste) {
  if (nom === 'firebase-admin') return fauxAdmin;
  if (nom === 'stripe') return fauxStripe;
  if (nom === 'nodemailer') return { createTransport: () => ({ sendMail: async () => ({}) }) };
  return vraiLoad.call(this, nom, ...reste);
};
const fonctions = require('./index.js');
Module._load = vraiLoad;

// ── Les faux req / res du webhook ────────────────────────────────────
const stripeReel = vraiStripe('sk_test_bidon_pour_le_test_local');

function requete(charge) {
  const brut = Buffer.from(charge, 'utf8');
  const signature = stripeReel.webhooks.generateTestHeaderString({
    payload: charge, secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  const entetes = { 'stripe-signature': signature };
  return { method: 'POST', rawBody: brut, body: JSON.parse(charge), headers: entetes, get: (n) => entetes[String(n).toLowerCase()] };
}

function reponse() {
  const r = { code: 0, corps: null };
  r.status = (c) => { r.code = c; return r; };
  r.send = (b) => { r.corps = b; return r; };
  return r;
}

const demande = (extra = {}) => ({
  kiosque: 'Les Artisans du Test', contact: 'Camille Roy',
  courriel: `camille${Math.random().toString(36).slice(2, 8)}@exemple.ca`,
  telephone: '514 555 0199', personnes: 2, jours: ['ven', 'sam', 'dim'],
  restrictions: '', ...extra,
});

const appeler = (data) => fonctions.reserverLivraisonKiosque.run({ data, auth: null, rawRequest: {} });

(async () => {
  // 1 · L'addition
  const r1 = await appeler(demande());
  assert.ok(r1.url, 'la caisse doit rendre une adresse');
  const params = sessionsCreees[0];
  assert.strictEqual(params.line_items[0].quantity, 6, '2 personnes × 3 jours');
  assert.strictEqual(params.line_items[0].price_data.unit_amount, 5000);
  assert.strictEqual(params.line_items[1].price_data.unit_amount, 1500, 'TPS de 15,00 $');
  assert.strictEqual(params.line_items[2].price_data.unit_amount, 2993, 'TVQ de 29,93 $');
  assert.strictEqual(params.metadata.programme, 'livraison-kiosque');
  console.log('1 · l’addition tient : 300,00 $ + 15,00 $ + 29,93 $ = 344,93 $');

  // 2 · Le webhook encaisse une fois, le rejeu ne compte pas double
  const reservationId = params.metadata.reservationId;
  const charge = JSON.stringify({
    id: 'evt_test_1', type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', payment_status: 'paid', amount_total: 34493, metadata: { entite: 'fmm', programme: 'livraison-kiosque', reservationId } } },
  });
  const res1 = reponse(); await fonctions.stripeMontpellois(requete(charge), res1);
  assert.strictEqual(res1.code, 200);
  assert.strictEqual(res1.corps, 'encaissé');
  assert.strictEqual(donnees.get(`livraisonsKiosque/${reservationId}`).statut, 'paye');
  assert.strictEqual(donnees.get('siteFlags/livraisonKiosque').pris, 1);

  const res2 = reponse(); await fonctions.stripeMontpellois(requete(charge), res2);
  assert.strictEqual(res2.corps, 'déjà encaissé', 'le rejeu de Stripe ne doit rien redoubler');
  assert.strictEqual(donnees.get('siteFlags/livraisonKiosque').pris, 1);
  console.log('2 · le rejeu de Stripe ne dédouble ni la fiche ni le compteur');

  // 3 · Les dix places tiennent
  for (let i = 0; i < 9; i += 1) {
    const r = await appeler(demande());
    assert.ok(r.url, `la place ${i + 2} doit encore s’ouvrir`);
  }
  const onzieme = await appeler(demande());
  assert.deepStrictEqual(onzieme, { complet: true }, 'la onzième doit trouver porte close');
  const surListe = await appeler(demande({ liste: true }));
  assert.deepStrictEqual(surListe, { enAttente: true }, 'et pouvoir rejoindre la liste');
  console.log('3 · les dix places tiennent, la onzième part sur la liste');

  // 4 · Une caisse ouverte depuis plus d'une demi-heure rend sa place
  for (const [chemin, fiche] of donnees) {
    if (chemin.startsWith('livraisonsKiosque/') && fiche.statut === 'en-attente') {
      const vieux = Date.now() - 31 * 60 * 1000;
      donnees.set(chemin, { ...fiche, creeLe: { toMillis: () => vieux } });
    }
  }
  const apresExpiration = await appeler(demande());
  assert.ok(apresExpiration.url, 'une caisse abandonnée ne doit pas bloquer la place');
  console.log('4 · une caisse abandonnée depuis 31 minutes rend sa place');

  console.log('\nTout passe.');
})().catch((e) => { console.error('\nÉCHEC :', e && e.message ? e.message : e); process.exit(1); });
