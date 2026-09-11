/**
 * Auto-vérification de functions/guildes.js. Aucun émulateur, aucun
 * cadre de test : un faux Firestore en mémoire, des assertions, et
 * `node functions/test-guildes.js` qui sort à zéro quand tout tient.
 *
 * Ce qui est vérifié : la courbe du taux, les 5 % de frais qui tombent
 * au trésor, le plafond de change du jour, le bonus d'entrée qui ne se
 * paie qu'une fois même si le déclencheur rejoue, et le virement qui
 * refuse quand la bourse est trop mince. Depuis l'addendum du 6
 * septembre : le miroir public qui ne laisse rien filtrer, et l'équipe
 * qui passe partout où un chef passe. Depuis l'addendum 2 : la deuxième
 * formule du cours et la part de trésor, le change croisé entre deux
 * guildes, le transfert de trésor à trésor, et le fondateur rattaché
 * par son courriel à la naissance de son compte.
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
      delete: async () => { docs.delete(chemin); },
      collection: (nom) => refCollection(`${chemin}/${nom}`),
    };
  }

  function refCollection(chemin) {
    const enfants = () => [...docs.keys()]
      .filter((k) => k.startsWith(`${chemin}/`) && !k.slice(chemin.length + 1).includes('/'))
      .map(instantane);
    const requete = {
      where: (champ, op, valeur) => ({ ...requete, _filtre: (s) => {
        const v = s.data()[champ];
        const n = (x) => (x instanceof Date ? x.getTime() : x);
        if (op === '>=') return n(v) >= n(valeur);
        if (op === '<=') return n(v) <= n(valeur);
        if (op === '>') return n(v) > n(valeur);
        if (op === '<') return n(v) < n(valeur);
        if (op === 'array-contains') return Array.isArray(v) && v.includes(valeur);
        return v === valeur;
      } }),
      // `this`, pas `requete` : sinon un `.where().limit()` perdrait son filtre.
      orderBy: function orderBy() { return this; },
      limit: function limit() { return this; },
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

/** `courriels` associe un uid à l'adresse que l'Admin SDK rendrait. */
function monter(courriels = {}) {
  const db = faireDb();
  const monnaie = faireMonnaie();
  const h = guildes.handlers({
    db, FieldValue, crediter: monnaie.crediter, debiter: monnaie.debiter, journeeFestival,
    lireCourriel: async (uid) => courriels[uid] || '',
  });
  return { db, monnaie, h };
}

// ── 1. La courbe du cours, deuxième version ──────────────────────────
assert.strictEqual(guildes.calculerTauxV2(10, 0), 0.5, '10 actifs sans trésor valent 0,5');
assert.strictEqual(guildes.calculerTauxV2(40, 0), 1, '40 actifs sans trésor valent la parité');
assert.strictEqual(guildes.calculerTauxV2(40, 1), 1.5, '40 actifs avec tout le trésor valent 1,5');
assert.strictEqual(guildes.calculerTauxV2(1000, 1), 3, 'le cours plafonne à 3');
assert.strictEqual(guildes.calculerTauxV2(0, 0), 0.5, 'le cours plancher est 0,5');
assert.strictEqual(guildes.calculerTauxV2(160, 0), 2, '160 actifs sans trésor valent 2, comme avant');
{
  const parts = guildes.repartirTresors([{ id: 'a', tresor: 100, taux: 1 }, { id: 'b', tresor: 100, taux: 2 }, { id: 'c', tresor: 0, taux: 3 }]);
  assert.deepStrictEqual(parts.a, { valeurTresorM: 100, partTresor: 0.3333 }, 'A vaut 100 M, un tiers du total');
  assert.deepStrictEqual(parts.b, { valeurTresorM: 200, partTresor: 0.6667 }, 'B vaut 200 M, deux tiers');
  assert.deepStrictEqual(parts.c, { valeurTresorM: 0, partTresor: 0 }, 'un trésor vide ne pèse rien');
  assert.deepStrictEqual(guildes.repartirTresors([{ id: 'a', tresor: 0, taux: 1 }]).a, { valeurTresorM: 0, partTresor: 0 }, 'somme nulle : part nulle, pas NaN');
  assert.deepStrictEqual(guildes.repartirTresors([]), {}, 'aucune guilde, aucune part');
}

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
  assert.strictEqual((await db.collection('guildes').doc('g1').collection('bourses').doc('u1').get()).data().solde, guildes.PIECES_ENTREE_CHEF, 'le fondateur, chef, touche le double des pièces d’entrée');
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

// ── 9. Le miroir public ne laisse rien filtrer ──────────────────────
async function testMiroir() {
  const { db, h } = monter();
  const fiche = {
    nom: 'Vestrvegir Vikingar', forme: 'clan', slug: 'vestrvegirvikingarclan', description: 'Le clan du nord.',
    blason: 'https://x/blason.webp', banniereUrl: 'https://x/banniere.webp', nbMembres: 3,
    monnaie: { nom: 'Vikingar Coin', sigle: 'VIK', glyphe: '◎', imageUrl: 'https://x/monnaie.webp' },
    creePar: 'u1', admins: ['u1'], membres: ['u1', 'u2', 'u3'], demandes: ['u9'],
    codeInvitation: 'ABCDEFGH', taux: 1, tresor: 40, nbActifs: 3, tauxHistorique: [], membresFondateurs: [{ nom: 'Erik', chef: true }],
  };
  await h.miroir('g1', null, fiche);
  const miroir = (await db.collection('guildesPubliques').doc('g1').get()).data();
  assert.deepStrictEqual(miroir, {
    nom: 'Vestrvegir Vikingar', forme: 'clan', slug: 'vestrvegirvikingarclan', description: 'Le clan du nord.',
    blason: 'https://x/blason.webp', banniereUrl: 'https://x/banniere.webp', nbMembres: 3,
    monnaie: { nom: 'Vikingar Coin', sigle: 'VIK', glyphe: '◎', imageUrl: 'https://x/monnaie.webp' },
    taux: 1, nbActifs: 3, tresor: 40, tauxHistorique: [],
  }, 'le miroir porte exactement les champs publics, cours et trésor compris (addendum 2)');
  for (const cle of ['codeInvitation', 'demandes', 'admins', 'membres', 'creePar', 'membresFondateurs']) {
    assert.ok(!(cle in miroir), `${cle} ne passe jamais dans le miroir`);
  }
  assert.strictEqual(guildes.miroirPublic({ nom: 'Long', tauxHistorique: Array.from({ length: 45 }, (_, i) => ({ jour: String(i) })) }).tauxHistorique.length, 30, 'le miroir garde les 30 derniers points');
  // Un champ absent ne devient pas `undefined` (l'Admin SDK le refuserait).
  const mince = guildes.miroirPublic({ nom: 'Nu', membres: ['u1'] });
  assert.deepStrictEqual(mince, { nom: 'Nu' }, 'aucune clé indéfinie');
  // Une écriture privée ne change pas la face publique.
  assert.deepStrictEqual(guildes.miroirPublic({ ...fiche, codeInvitation: 'ZZZZZZZZ' }), guildes.miroirPublic(fiche), 'le code ne bouge pas le miroir');
  assert.notDeepStrictEqual(guildes.miroirPublic({ ...fiche, taux: 2 }), guildes.miroirPublic(fiche), 'le cours, lui, passe au miroir');
  await h.miroir('g1', fiche, null);
  assert.ok(!(await db.collection('guildesPubliques').doc('g1').get()).exists, 'le miroir part avec la fiche');
}

// ── 10. L'équipe passe partout où un chef passe ─────────────────────
async function testEquipe() {
  const equipe = guildes.COURRIELS_EQUIPE[0];
  assert.ok(equipe, 'la liste de l’équipe se lit au chargement');
  const { db, h } = monter({ u1: equipe, u2: 'quelqun@exemple.org', u3: 'autre@exemple.org' });
  await db.collection('membres').doc('u3').set({ nom: 'Maïté', roles: ['membre', 'administrateur'] });
  assert.strictEqual(await h.estEquipe('u1'), true, 'le courriel de config/equipe-admin.json fait l’équipe');
  assert.strictEqual(await h.estEquipe('u2'), false, 'un courriel ordinaire ne fait pas l’équipe');
  assert.strictEqual(await h.estEquipe('u3'), true, 'le rôle administrateur fait l’équipe');

  await db.collection('guildes').doc('g1').set({ nom: 'Clan Test', membres: ['u2', 'u4'], admins: ['u4'], codeInvitation: 'ABCDEFGH', tresor: 50 });
  await assert.rejects(() => h.nouveauCodeInvitation('u2', { guildeId: 'g1' }), /Réservé aux chefs/, 'un membre ordinaire ne régénère pas le code');
  const { code } = await h.nouveauCodeInvitation('u1', { guildeId: 'g1' });
  assert.strictEqual(code.length, 8, 'l’équipe régénère le code sans être chef');
  const verse = await h.tresorVerser('u3', { guildeId: 'g1', aUid: 'u2', montant: 20 });
  assert.strictEqual(verse.tresor, 30, 'l’équipe verse depuis le trésor sans être chef');
  const chef = await h.tresorVerser('u4', { guildeId: 'g1', aUid: 'u2', montant: 10 });
  assert.strictEqual(chef.tresor, 20, 'le chef verse toujours');
}

// ── 11. Le cours de toutes les guildes, ensemble ────────────────────
async function testRecalculTous() {
  const { db, h } = monter();
  await db.collection('guildes').doc('a').set({ nom: 'A', membres: ['u1'], taux: 0.5, tresor: 100 });
  await db.collection('guildes').doc('b').set({ nom: 'B', membres: ['u2'], taux: 0.5, tresor: 50 });
  await db.collection('membres').doc('u1').set({ vuLe: Date.now() });

  assert.strictEqual((await h.recalculerTousLesTaux()).touchees, 2, 'les deux fiches reçoivent leur part de trésor');
  let a = (await db.collection('guildes').doc('a').get()).data();
  let b = (await db.collection('guildes').doc('b').get()).data();
  assert.strictEqual(a.valeurTresorM, 50, '100 pièces à 0,5 valent 50 M');
  assert.strictEqual(b.valeurTresorM, 25, '50 pièces à 0,5 valent 25 M');
  assert.strictEqual(a.partTresor, 0.6667, 'A pèse deux tiers');
  assert.strictEqual(b.partTresor, 0.3333, 'B pèse un tiers');
  assert.strictEqual(a.nbActifs, 1, 'u1 vu aujourd’hui compte');
  assert.strictEqual(b.nbActifs, 0, 'u2 jamais vu ne compte pas');
  assert.strictEqual(a.nbMembres, 1, 'nbMembres suit la liste');
  assert.strictEqual(a.taux, guildes.calculerTauxV2(1, 0.6667), 'le cours suit la formule v2');
  assert.strictEqual(a.tauxHistorique[a.tauxHistorique.length - 1].partTresor, 0.6667, 'l’historique garde la part');
  assert.strictEqual((await h.recalculerTousLesTaux()).touchees, 0, 'rien ne bouge, rien ne s’écrit');

  // Un trésor qui bouge relance le calcul par le déclencheur de la fiche.
  await db.collection('guildes').doc('a').set({ tresor: 400 }, { merge: true });
  await h.entrees('a', { membres: ['u1'], tresor: 100 }, { membres: ['u1'], tresor: 400 });
  a = (await db.collection('guildes').doc('a').get()).data();
  b = (await db.collection('guildes').doc('b').get()).data();
  assert.strictEqual(a.valeurTresorM, 200, 'le nouveau trésor est compté');
  assert.strictEqual(a.partTresor, 0.8889, 'A pèse désormais huit neuvièmes');
  assert.strictEqual(b.partTresor, 0.1111, 'B suit, sans avoir bougé');
  const miroir = guildes.miroirPublic(a);
  assert.strictEqual(miroir.partTresor, 0.8889, 'le miroir porte la part');
  assert.strictEqual(miroir.tresor, 400, 'le miroir porte le trésor');
}

// ── 12. Le change croisé : A vers M moins 5 %, puis M vers B ────────
async function testChangeCroise() {
  const { db, h } = monter();
  await db.collection('guildes').doc('a').set({ nom: 'Clan A', membres: ['u1'], admins: ['u1'], taux: 1, tresor: 0 });
  await db.collection('guildes').doc('b').set({ nom: 'Clan B', membres: ['u1', 'u2'], admins: ['u2'], taux: 0.5, tresor: 0 });
  await db.collection('guildes').doc('c').set({ nom: 'Clan C', membres: ['u2'], admins: ['u2'], taux: 1, tresor: 0 });
  await db.collection('guildes').doc('d').set({ nom: 'Clan D', membres: ['u1'], admins: ['u1'], taux: 3, tresor: 0 });
  await db.collection('guildes').doc('a').collection('bourses').doc('u1').set({ solde: 500, gagne: 500, depense: 0 });

  const r = await h.changerCroise('u1', { deGuildeId: 'a', versGuildeId: 'b', montant: 100 });
  assert.strictEqual(r.montpellois, 95, '100 pièces A moins 5 % font 95 M au cours de 1');
  assert.strictEqual(r.piecesRecues, 190, '95 M font 190 pièces B au cours de 0,5');
  assert.strictEqual(r.soldePiecesDe, 400, 'les 100 pièces A sont parties');
  assert.strictEqual(r.soldePiecesVers, 190, 'la bourse B naît avec 190 pièces');
  assert.strictEqual(r.tauxDe, 1); assert.strictEqual(r.tauxVers, 0.5);
  assert.strictEqual((await db.collection('guildes').doc('a').get()).data().tresor, 5, 'les frais tombent au trésor de A');
  assert.strictEqual((await db.collection('guildes').doc('b').get()).data().tresor, 0, 'B ne prend rien');
  const bourseA = (await db.collection('guildes').doc('a').collection('bourses').doc('u1').get()).data();
  const bourseB = (await db.collection('guildes').doc('b').collection('bourses').doc('u1').get()).data();
  assert.strictEqual(bourseA.solde, 400); assert.strictEqual(bourseA.changeCumul, 100, 'le plafond se compte côté A');
  assert.strictEqual(bourseB.solde, 190); assert.strictEqual(bourseB.gagne, 190);
  const regA = (await db.collection('guildes').doc('a').collection('registre').get()).docs.map((d) => d.data());
  const regB = (await db.collection('guildes').doc('b').collection('registre').get()).docs.map((d) => d.data());
  assert.strictEqual(regA.length, 1); assert.strictEqual(regB.length, 1);
  assert.deepStrictEqual([regA[0].type, regA[0].de, regA[0].a, regA[0].pieces, regA[0].montpellois, regA[0].autreGuildeId, regA[0].autreGuildeNom], ['change', 'u1', 'monnaie', 100, 95, 'b', 'Clan B'], 'le registre de A dit ce qui est sorti et vers où');
  assert.deepStrictEqual([regB[0].type, regB[0].de, regB[0].a, regB[0].pieces, regB[0].montpellois, regB[0].autreGuildeId], ['change', 'monnaie', 'u1', 190, 95, 'a'], 'le registre de B dit ce qui est entré et d’où');

  await assert.rejects(() => h.changerCroise('u1', { deGuildeId: 'a', versGuildeId: 'b', montant: 150 }), /Plafond de 200/, 'le plafond du jour vaut pour le change croisé');
  await assert.rejects(() => h.changerCroise('u1', { deGuildeId: 'a', versGuildeId: 'c', montant: 10 }), /pas de cette guilde/, 'il faut être membre de B');
  await assert.rejects(() => h.changerCroise('u1', { deGuildeId: 'a', versGuildeId: 'a', montant: 10 }), /deux guildes/, 'A et B doivent différer');
  await assert.rejects(() => h.changerCroise('u1', { deGuildeId: 'a', versGuildeId: 'd', montant: 1 }), /aucune pièce/, '1 M au cours de 3 ne fait aucune pièce : refusé');
  assert.strictEqual((await db.collection('guildes').doc('a').collection('bourses').doc('u1').get()).data().solde, 400, 'les refus ne touchent pas la bourse');
}

// ── 13. Le transfert de trésor à trésor ─────────────────────────────
async function testTresorTransferer() {
  const { db, h } = monter();
  await db.collection('guildes').doc('a').set({ nom: 'Clan A', membres: ['u1', 'u2'], admins: ['u1'], taux: 1, tresor: 100 });
  await db.collection('guildes').doc('b').set({ nom: 'Clan B', membres: ['u3'], admins: ['u3'], taux: 0.5, tresor: 10 });

  await assert.rejects(() => h.tresorTransferer('u2', { deGuildeId: 'a', versGuildeId: 'b', montant: 50 }), /Réservé aux chefs/, 'un membre ordinaire ne vide pas le trésor');
  const r = await h.tresorTransferer('u1', { deGuildeId: 'a', versGuildeId: 'b', montant: 50, note: 'Pour le feu' });
  assert.strictEqual(r.montpellois, 50, '50 pièces A valent 50 M, sans frais');
  assert.strictEqual(r.pieces, 100, '50 M valent 100 pièces B');
  assert.strictEqual(r.tresorDe, 50); assert.strictEqual(r.tresorVers, 110);
  assert.strictEqual((await db.collection('guildes').doc('a').get()).data().tresor, 50);
  assert.strictEqual((await db.collection('guildes').doc('b').get()).data().tresor, 110);
  const regA = (await db.collection('guildes').doc('a').collection('registre').get()).docs.map((d) => d.data());
  const regB = (await db.collection('guildes').doc('b').collection('registre').get()).docs.map((d) => d.data());
  assert.deepStrictEqual([regA[0].type, regA[0].de, regA[0].a, regA[0].pieces, regA[0].note, regA[0].autreGuildeId], ['transfert', 'tresor', 'monnaie', 50, 'Pour le feu', 'b'], 'A inscrit la sortie');
  assert.deepStrictEqual([regB[0].type, regB[0].de, regB[0].a, regB[0].pieces, regB[0].note, regB[0].autreGuildeId], ['transfert', 'monnaie', 'tresor', 100, 'Pour le feu', 'a'], 'B inscrit l’entrée');
  await assert.rejects(() => h.tresorTransferer('u1', { deGuildeId: 'a', versGuildeId: 'b', montant: 999 }), /trop bas/, 'on ne transfère pas plus que le trésor');
  await assert.rejects(() => h.tresorTransferer('u1', { deGuildeId: 'a', versGuildeId: 'a', montant: 1 }), /deux guildes/, 'A et B doivent différer');
}

// ── 14. Le fondateur rattaché par son courriel, une seule fois ──────
async function testFondateurCourriel() {
  const { db, h } = monter();
  await db.collection('guildes').doc('g1').set({
    nom: 'Clan Test', membres: ['u1'], admins: ['u1'],
    membresFondateurs: [
      { nom: 'Ariane', chef: true, courriel: 'ariane@exemple.org' },
      { nom: 'Camille', chef: false, courriel: 'camille@exemple.org' },
      { nom: 'Erik', chef: true },
    ],
  });
  await db.collection('guildes').doc('g2').set({ nom: 'Autre', membres: ['u5'], admins: ['u5'] });

  assert.deepStrictEqual(await h.fondateurParCourriel('u9', ' Ariane@Exemple.org '), ['g1'], 'la casse et les espaces du courriel ne comptent pas');
  let g = (await db.collection('guildes').doc('g1').get()).data();
  assert.deepStrictEqual(g.membres, ['u1', 'u9'], 'Ariane entre dans les membres');
  assert.deepStrictEqual(g.admins, ['u1', 'u9'], 'Ariane est chef, elle entre dans les admins');
  assert.strictEqual(g.membresFondateurs[0].uid, 'u9', 'sa ligne porte son uid');
  assert.strictEqual(g.membresFondateurs[1].uid, undefined, 'la ligne de Camille ne bouge pas');
  assert.strictEqual(g.membresFondateurs[2].uid, undefined, 'la ligne sans courriel ne bouge pas');

  assert.deepStrictEqual(await h.fondateurParCourriel('u9', 'ariane@exemple.org'), [], 'rejoué, rien ne bouge');
  g = (await db.collection('guildes').doc('g1').get()).data();
  assert.deepStrictEqual(g.membres, ['u1', 'u9']); assert.deepStrictEqual(g.admins, ['u1', 'u9']);

  await h.fondateurParCourriel('u8', 'camille@exemple.org');
  g = (await db.collection('guildes').doc('g1').get()).data();
  assert.deepStrictEqual(g.membres, ['u1', 'u9', 'u8'], 'Camille entre dans les membres');
  assert.deepStrictEqual(g.admins, ['u1', 'u9'], 'Camille n’est pas chef');
  assert.strictEqual(g.membresFondateurs[1].uid, 'u8');

  assert.deepStrictEqual(await h.fondateurParCourriel('u7', 'personne@exemple.org'), [], 'un courriel inconnu ne touche rien');
  assert.deepStrictEqual(await h.fondateurParCourriel('u6', ''), [], 'un compte sans courriel ne touche rien');
  assert.deepStrictEqual((await db.collection('guildes').doc('g2').get()).data().membres, ['u5'], 'les autres guildes restent intactes');
}

// ── 13. La porte « Revendiquer votre profil » ────────────────────────
async function testRevendiquer() {
  const { db, h } = monter({ u9: 'ariane@exemple.org', u8: 'camille@exemple.org', u7: 'personne@exemple.org', u3: 'quelquun@exemple.org' });
  await db.collection('guildes').doc('g1').set({
    nom: 'Vestrvegir Vikingar', forme: 'clan', slug: 'vestrvegirvikingarclan', codeInvitation: 'CMMX3V5H',
    creePar: 'u1', admins: ['u1'], membres: ['u1'], demandes: ['u7'],
    membresFondateurs: [
      { nom: 'Ariane', chef: true, courriel: 'ariane@exemple.org' },
      { nom: 'Camille', chef: false, courriel: 'camille@exemple.org' },
      { nom: 'Papyrus', chef: false },
    ],
  });

  // L'aperçu se lit sans compte et ne laisse pas filtrer un courriel entier.
  const apercu = await h.apercuParCode({ code: 'cmmx3v5h' });
  assert.strictEqual(apercu.guildeId, 'g1'); assert.strictEqual(apercu.forme, 'clan');
  assert.deepStrictEqual(apercu.fondateurs[0], { nom: 'Ariane', chef: true, pris: false, indice: 'a•••@exemple.org' });
  assert.deepStrictEqual(apercu.fondateurs[2], { nom: 'Papyrus', chef: false, pris: false });
  assert.ok(!JSON.stringify(apercu).includes('ariane@'), 'le courriel complet ne sort jamais');
  await assert.rejects(h.apercuParCode({ code: 'ZZZZZZZZ' }), /Aucune guilde/, 'un code inconnu ne mène à rien');

  // Ariane se connecte avec son courriel : sa ligne la reconnaît, elle devient chef.
  let r = await h.revendiquerProfil('u9', { code: 'CMMX3V5H', seulementCourriel: true });
  assert.strictEqual(r.cas, 'fondateur'); assert.strictEqual(r.nom, 'Ariane'); assert.strictEqual(r.slug, 'vestrvegirvikingarclan');
  let g = (await db.collection('guildes').doc('g1').get()).data();
  assert.deepStrictEqual(g.membres, ['u1', 'u9']); assert.deepStrictEqual(g.admins, ['u1', 'u9']);
  assert.strictEqual(g.membresFondateurs[0].uid, 'u9');
  r = await h.revendiquerProfil('u9', { code: 'CMMX3V5H' });
  assert.strictEqual(r.cas, 'deja', 'rejoué, la ligne est déjà la sienne');

  // Quelqu'un d'autre pointe la ligne de Camille : refusé avec l'indice.
  await assert.rejects(h.revendiquerProfil('u7', { code: 'CMMX3V5H', nom: 'Camille' }), /c•••@exemple\.org/, 'le mauvais courriel reçoit l’indice');
  g = (await db.collection('guildes').doc('g1').get()).data();
  assert.strictEqual(g.membresFondateurs[1].uid, undefined, 'la ligne de Camille ne bouge pas');
  assert.deepStrictEqual(g.membres, ['u1', 'u9'], 'le refus ne fait entrer personne');

  // Le premier passage sans ligne à soi ne fait qu'observer.
  r = await h.revendiquerProfil('u7', { code: 'CMMX3V5H', seulementCourriel: true });
  assert.strictEqual(r.cas, 'aucun'); assert.strictEqual(r.membre, false);
  assert.deepStrictEqual((await db.collection('guildes').doc('g1').get()).data().membres, ['u1', 'u9']);

  // Papyrus n'a pas de courriel sur sa ligne : celui qui la revendique y laisse le sien.
  r = await h.revendiquerProfil('u3', { code: 'CMMX3V5H', nom: 'Papyrus' });
  assert.strictEqual(r.cas, 'fondateur');
  g = (await db.collection('guildes').doc('g1').get()).data();
  assert.strictEqual(g.membresFondateurs[2].uid, 'u3'); assert.strictEqual(g.membresFondateurs[2].courriel, 'quelquun@exemple.org');
  assert.deepStrictEqual(g.admins, ['u1', 'u9'], 'pas chef, pas admin');
  await assert.rejects(h.revendiquerProfil('u7', { code: 'CMMX3V5H', nom: 'Papyrus' }), /déjà été revendiqué/);
  await assert.rejects(h.revendiquerProfil('u7', { code: 'CMMX3V5H', nom: 'Inconnu' }), /pas sur la liste/);

  // Sans nom et sans ligne : simple membre, et sa demande en attente s'efface.
  r = await h.revendiquerProfil('u7', { code: 'CMMX3V5H' });
  assert.strictEqual(r.cas, 'membre');
  g = (await db.collection('guildes').doc('g1').get()).data();
  assert.deepStrictEqual(g.membres, ['u1', 'u9', 'u3', 'u7']); assert.deepStrictEqual(g.demandes, []);
}

// ── 14. Le Jarl entre avec le double, et la présence du jour paie dix ──
async function testPiecesJarlEtPresence() {
  const { db, h } = monter();
  const g = db.collection('guildes').doc('g1');
  await g.set({ nom: 'Clan', creePar: 'u1', admins: ['u1'], membres: ['u1'], tresor: 0 });
  await h.fondation('g1', (await g.get()).data());
  assert.strictEqual((await g.collection('bourses').doc('u1').get()).data().solde, guildes.PIECES_ENTREE_CHEF, 'le fondateur, chef, touche le double');

  const avant = (await g.get()).data();
  await g.set({ membres: ['u1', 'u2', 'u3'], admins: ['u1', 'u3'] }, { merge: true });
  await h.entrees('g1', avant, (await g.get()).data());
  assert.strictEqual((await g.collection('bourses').doc('u2').get()).data().solde, guildes.PIECES_ENTREE, 'un membre touche l’entrée simple');
  assert.strictEqual((await g.collection('bourses').doc('u3').get()).data().solde, guildes.PIECES_ENTREE_CHEF, 'un chef qui entre touche le double');

  const t0 = Date.UTC(2026, 8, 11, 15, 0, 0);
  assert.deepStrictEqual(await h.presenceDuJour('u2', null, { vuLe: t0 }), ['g1'], 'la première marque du jour paie');
  assert.strictEqual((await g.collection('bourses').doc('u2').get()).data().solde, guildes.PIECES_ENTREE + guildes.PIECES_JOUR);
  assert.deepStrictEqual(await h.presenceDuJour('u2', { vuLe: t0 }, { vuLe: t0 + 3600000 }), [], 'le même jour ne paie plus');
  assert.deepStrictEqual(await h.presenceDuJour('u2', { vuLe: t0 + 3600000 }, { vuLe: t0 + 3600000, maj: 1 }), [], 'une autre écriture de la fiche ne paie pas');
  assert.deepStrictEqual(await h.presenceDuJour('u2', { vuLe: t0 }, { vuLe: t0 + 86400000 }), ['g1'], 'le lendemain paie de nouveau');
  assert.strictEqual((await g.collection('bourses').doc('u2').get()).data().solde, guildes.PIECES_ENTREE + 2 * guildes.PIECES_JOUR);
  assert.deepStrictEqual(await h.presenceDuJour('u9', null, { vuLe: t0 }), [], 'qui n’est d’aucune guilde ne touche rien');
}

(async () => {
  await testChange();
  await testEntreeIdempotente();
  await testVirement();
  await testFondation();
  await testNbOui();
  await testIcs();
  await testMiroir();
  await testEquipe();
  await testRecalculTous();
  await testChangeCroise();
  await testTresorTransferer();
  await testFondateurCourriel();
  await testRevendiquer();
  await testPiecesJarlEtPresence();
  console.log('cours v2, actifs, frais et plafond de change, entrée idempotente, virement, fondation, nbOui, ICS, miroir public, équipe, recalcul de toutes les guildes, change croisé, transfert de trésor, fondateur par courriel, porte de revendication, double du Jarl et présence du jour : tout tient.');
  console.log('functions/test-guildes.js : OK');
})().catch((e) => {
  console.error('ÉCHEC :', e && e.message);
  process.exit(1);
});
