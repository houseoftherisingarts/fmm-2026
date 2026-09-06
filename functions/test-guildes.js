/**
 * Auto-vérification de functions/guildes.js. Aucun émulateur, aucun
 * cadre de test : un faux Firestore en mémoire, des assertions, et
 * `node functions/test-guildes.js` qui sort à zéro quand tout tient.
 *
 * Ce qui est vérifié : la courbe du taux, les 5 % de frais qui tombent
 * au trésor, le plafond de change du jour, le bonus d'entrée qui ne se
 * paie qu'une fois même si le déclencheur rejoue, et le virement qui
 * refuse quand la bourse est trop mince.
 */

const assert = require('assert');
const guildes = require('./guildes');

// ── Le faux Firestore ────────────────────────────────────────────────
const MAINTENANT = { sentinelle: 'serverTimestamp' };
const FieldValue = {
  serverTimestamp: () => MAINTENANT,
  increment: (n) => ({ increment: n }),
  arrayUnion: (...v) => ({ arrayUnion: v }),
  arrayRemove: (...v) => ({ arrayRemove: v }),
};

function faireDb() {
  const docs = new Map();
  let compteur = 0;

  const fondre = (avant, patch, fusion) => {
    const base = fusion ? { ...(avant || {}) } : {};
    for (const [cle, valeur] of Object.entries(patch)) {
      const ancien = base[cle];
      if (valeur === MAINTENANT) base[cle] = Date.now();
      else if (valeur && valeur.increment !== undefined) base[cle] = (ancien || 0) + valeur.increment;
      else if (valeur && valeur.arrayUnion) base[cle] = [...new Set([...(ancien || []), ...valeur.arrayUnion])];
      else if (valeur && valeur.arrayRemove) base[cle] = (ancien || []).filter((x) => !valeur.arrayRemove.includes(x));
      else if (fusion && valeur && typeof valeur === 'object' && !Array.isArray(valeur) && ancien && typeof ancien === 'object' && !Array.isArray(ancien)) base[cle] = { ...ancien, ...fondre(ancien, valeur, true) };
      else base[cle] = valeur;
    }
    return base;
  };

  const instantane = (chemin) => ({
    id: chemin.split('/').pop(),
    exists: docs.has(chemin),
    data: () => docs.get(chemin),
    get ref() { return refDoc(chemin); },
  });

  function refDoc(chemin) {
    return {
      id: chemin.split('/').pop(),
      path: chemin,
      get: async () => instantane(chemin),
      set: async (donnees, options) => { docs.set(chemin, fondre(docs.get(chemin), donnees, !!(options && options.merge))); },
      collection: (nom) => refCollection(`${chemin}/${nom}`),
    };
  }

  function refCollection(chemin) {
    const enfants = () => [...docs.keys()]
      .filter((k) => k.startsWith(`${chemin}/`) && !k.slice(chemin.length + 1).includes('/'))
      .map(instantane);
    const requete = {
      where: (champ, _op, valeur) => ({ ...requete, _filtre: (s) => s.data()[champ] === valeur }),
      orderBy: () => requete,
      limit: () => requete,
      get: async function get() { return { docs: enfants().filter(this._filtre || (() => true)) }; },
    };
    return { ...requete, doc: (id) => refDoc(`${chemin}/${id || `auto${++compteur}`}`) };
  }

  return {
    collection: refCollection,
    runTransaction: async (fn) => fn({
      get: (ref) => ref.get(),
      set: (ref, donnees, options) => { ref.set(donnees, options); },
    }),
    _docs: docs,
  };
}

// ── Les fausses bourses en Montpellois ───────────────────────────────
function faireMonnaie() {
  const bourses = new Map();
  const credits = [];
  const lire = (uid) => bourses.get(uid) || { solde: 0, cles: {} };
  return {
    bourses,
    credits,
    crediter: async (uid, montant, cle) => {
      const b = lire(uid);
      if (cle && b.cles[cle]) return null;
      if (cle) b.cles[cle] = true;
      b.solde += montant;
      bourses.set(uid, b);
      credits.push({ uid, montant, cle });
      return b.solde;
    },
    debiter: async (uid, montant) => {
      const b = lire(uid);
      if (b.solde < montant) throw new Error('Pas assez de Montpellois.');
      b.solde -= montant;
      bourses.set(uid, b);
      return b.solde;
    },
  };
}

const journeeFestival = (ms) => new Date(ms).toISOString().slice(0, 10);

function monter() {
  const db = faireDb();
  const monnaie = faireMonnaie();
  const h = guildes.handlers({ db, FieldValue, crediter: monnaie.crediter, debiter: monnaie.debiter, journeeFestival });
  return { db, monnaie, h };
}

// ── 1. La courbe du taux ─────────────────────────────────────────────
assert.strictEqual(guildes.calculerTaux(10), 0.5, '10 actifs valent 0,5');
assert.strictEqual(guildes.calculerTaux(40), 1, '40 actifs valent la parité');
assert.strictEqual(guildes.calculerTaux(160), 2, '160 actifs valent 2');
assert.strictEqual(guildes.calculerTaux(1000), 2, 'le taux plafonne à 2');
assert.strictEqual(guildes.calculerTaux(0), 0.5, 'le taux plancher est 0,5');

// ── 2. Les actifs ────────────────────────────────────────────────────
{
  const vieux = Date.now() - 40 * 86400000;
  const compte = guildes.compterActifs(
    { membres: ['a', 'b', 'c'] },
    { a: { vuLe: Date.now() }, b: { vuLe: vieux, maj: Date.now() }, c: { vuLe: vieux, maj: vieux } },
  );
  assert.strictEqual(compte, 2, 'la bourse sert de repli quand vuLe est vieux');
}

// ── 3. Le change : 5 % au trésor, plafond de 200 pièces par jour ─────
async function testChange() {
  const { db, monnaie, h } = monter();
  await db.collection('guildes').doc('g1').set({ nom: 'Clan Test', membres: ['u1'], admins: ['u1'], taux: 1, tresor: 0 });
  await db.collection('guildes').doc('g1').collection('bourses').doc('u1').set({ solde: 500, gagne: 500, depense: 0 });

  const r = await h.changer('u1', { guildeId: 'g1', sens: 'piecesVersM', montant: 100 });
  assert.strictEqual(r.soldePieces, 400, 'les 100 pièces sont parties');
  assert.strictEqual(r.soldeM, 95, '95 M au taux de 1 après les 5 % de frais');
  assert.strictEqual((await db.collection('guildes').doc('g1').get()).data().tresor, 5, '5 pièces au trésor');
  const bourse = (await db.collection('guildes').doc('g1').collection('bourses').doc('u1').get()).data();
  assert.strictEqual(bourse.changeCumul, 100, 'le cumul du jour compte les 100 pièces');

  await assert.rejects(
    () => h.changer('u1', { guildeId: 'g1', sens: 'piecesVersM', montant: 150 }),
    /Plafond de 200/,
    'le plafond du jour bloque le deuxième change',
  );
  assert.strictEqual((await db.collection('guildes').doc('g1').collection('bourses').doc('u1').get()).data().solde, 400, 'le refus ne touche pas la bourse');

  // Le sens inverse compte dans le même plafond.
  await monnaie.crediter('u1', 1000, null);
  const inverse = await h.changer('u1', { guildeId: 'g1', sens: 'mVersPieces', montant: 50 });
  assert.strictEqual(inverse.soldePieces, 450, '50 M donnent 50 pièces au taux de 1');
  await assert.rejects(
    () => h.changer('u1', { guildeId: 'g1', sens: 'mVersPieces', montant: 100 }),
    /Plafond de 200/,
    'le plafond vaut aussi dans le sens M vers pièces',
  );
}

// ── 4. Le bonus d'entrée ne se paie qu'une fois ──────────────────────
async function testEntreeIdempotente() {
  const { db, monnaie, h } = monter();
  await db.collection('guildes').doc('g1').set({ nom: 'Clan Test', membres: ['u1'], admins: ['u1'], taux: 1, tresor: 0 });
  const avant = { nom: 'Clan Test', membres: ['u1'] };
  const apres = { nom: 'Clan Test', membres: ['u1', 'u2'] };

  await h.entrees('g1', avant, apres);
  await h.entrees('g1', avant, apres);

  const paiements = monnaie.credits.filter((c) => c.cle === 'guilde-rejointe:g1:u2');
  assert.strictEqual(paiements.length, 1, 'un seul crédit de 10 M, même si le déclencheur rejoue');
  assert.strictEqual(monnaie.bourses.get('u2').solde, 10, 'la bourse en M ne reçoit les 10 M qu’une fois');
  const bourse = (await db.collection('guildes').doc('g1').collection('bourses').doc('u2').get()).data();
  assert.strictEqual(bourse.solde, 100, '100 pièces d’entrée, pas 200');
  assert.ok((await db.collection('guildes').doc('g1').collection('registre').doc('entree:u2').get()).exists, 'le registre garde la trace de l’entrée');
}

// ── 5. Le virement refuse quand la bourse est trop mince ─────────────
async function testVirement() {
  const { db, h } = monter();
  await db.collection('guildes').doc('g1').set({ nom: 'Clan Test', membres: ['u1', 'u2'], admins: ['u1'] });
  await db.collection('guildes').doc('g1').collection('bourses').doc('u1').set({ solde: 30, gagne: 30, depense: 0 });

  await assert.rejects(
    () => h.virement('u1', { guildeId: 'g1', aUid: 'u2', montant: 99999 }),
    /Pas assez de pièces/,
    'un virement plus gros que la bourse est refusé',
  );
  const ok = await h.virement('u1', { guildeId: 'g1', aUid: 'u2', montant: 20 });
  assert.strictEqual(ok.solde, 10, 'le virement passe et laisse 10 pièces');
  assert.strictEqual((await db.collection('guildes').doc('g1').collection('bourses').doc('u2').get()).data().solde, 20, 'le destinataire reçoit les 20 pièces');
}

// ── 6. La fondation pose la monnaie, le code et le trésor ────────────
async function testFondation() {
  const { db, monnaie, h } = monter();
  const guilde = { nom: 'Vestrvegir Vikingar', creePar: 'u1', membres: ['u1'], admins: ['u1'] };
  await db.collection('guildes').doc('g1').set(guilde);
  await h.fondation('g1', guilde);

  const pose = (await db.collection('guildes').doc('g1').get()).data();
  assert.strictEqual(pose.monnaie.nom, 'Vikingar Coin', 'la monnaie prend le dernier mot du nom');
  assert.strictEqual(pose.monnaie.sigle, 'VIK', 'le sigle tient sur trois lettres');
  assert.strictEqual(pose.monnaie.glyphe, '◎', 'le glyphe par défaut');
  assert.strictEqual(pose.codeInvitation.length, 8, 'le code d’invitation fait 8 caractères');
  assert.ok(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(pose.codeInvitation), 'ni O, ni 0, ni I, ni 1 dans le code');
  assert.strictEqual(pose.tresor, 0, 'le trésor part à zéro');
  assert.strictEqual(monnaie.bourses.get('u1').solde, 10, '10 M au fondateur');
  assert.strictEqual((await db.collection('guildes').doc('g1').collection('bourses').doc('u1').get()).data().solde, 100, '100 pièces au fondateur');
  assert.strictEqual((await db.collection('membres').doc('u1').get()).data().guildesFondees, 1, 'le compteur de fondations monte');

  // Une deuxième guilde ne repaie pas le bonus en Montpellois.
  await db.collection('bourses').doc('u1').set({ badgesCredites: { 'guilde-fondee:g1': true } });
  const seconde = { nom: 'Autre Clan', creePar: 'u1', membres: ['u1'], admins: ['u1'] };
  await db.collection('guildes').doc('g2').set(seconde);
  await h.fondation('g2', seconde);
  assert.strictEqual(monnaie.bourses.get('u1').solde, 10, 'pas de deuxième bonus de fondation');
}

// ── 7. Le compteur de « oui » des événements ─────────────────────────
async function testNbOui() {
  const { db, h } = monter();
  await db.collection('guildes').doc('g1').collection('evenements').doc('e1').set({ titre: 'Feu', rsvp: { a: 'oui', b: 'non', c: 'oui' }, nbOui: 0 });
  const ev = (await db.collection('guildes').doc('g1').collection('evenements').doc('e1').get()).data();
  await h.compterOui('g1', 'e1', ev);
  assert.strictEqual((await db.collection('guildes').doc('g1').collection('evenements').doc('e1').get()).data().nbOui, 2, 'deux « oui » comptés');
}

// ── 8. L'agenda ICS : la clé protège, le format tient ────────────────
async function testIcs() {
  const { db, h } = monter();
  await db.collection('guildes').doc('g1').set({ nom: 'Clan Test', codeInvitation: 'ABCDEFGH' });
  await db.collection('guildes').doc('g1').collection('evenements').doc('e1').set({ titre: 'Feu; de joie', debut: Date.now(), fin: Date.now() + 3600000, lieu: 'Le Bosquet' });
  const faireRes = () => {
    const res = { code: 0, entetes: {}, corps: '' };
    res.status = (c) => { res.code = c; return res; };
    res.set = (k, v) => { res.entetes[k] = v; return res; };
    res.send = (c) => { res.corps = c; return res; };
    return res;
  };

  const refus = faireRes();
  await h.ics({ query: { guilde: 'g1', cle: 'MAUVAIS1' } }, refus);
  assert.strictEqual(refus.code, 403, 'une mauvaise clé ne donne pas l’agenda');

  const ok = faireRes();
  await h.ics({ query: { guilde: 'g1', cle: 'ABCDEFGH' } }, ok);
  assert.strictEqual(ok.code, 200, 'la bonne clé rend l’agenda');
  assert.match(ok.entetes['Content-Type'], /text\/calendar/, 'le type est text/calendar');
  assert.match(ok.entetes['Cache-Control'], /max-age=300/, 'cinq minutes de cache');
  assert.ok(ok.corps.startsWith('BEGIN:VCALENDAR\r\n'), 'les lignes sont séparées par CRLF');
  assert.ok(ok.corps.includes('X-WR-CALNAME:Clan Test'), 'le nom de la guilde nomme l’agenda');
  assert.ok(ok.corps.includes('UID:e1@festivalmedievaldemontpellier.org'), 'chaque événement porte son UID');
  assert.ok(ok.corps.includes('SUMMARY:Feu\\; de joie'), 'le point-virgule est échappé');
  assert.ok(/DTSTART:\d{8}T\d{6}Z/.test(ok.corps), 'DTSTART est en UTC');
}

(async () => {
  await testChange();
  await testEntreeIdempotente();
  await testVirement();
  await testFondation();
  await testNbOui();
  await testIcs();
  console.log('taux, actifs, frais et plafond de change, entrée idempotente, virement, fondation, nbOui, ICS : tout tient.');
  console.log('functions/test-guildes.js : OK');
})().catch((e) => {
  console.error('ÉCHEC :', e && e.message);
  process.exit(1);
});
