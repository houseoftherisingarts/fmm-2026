// Vérification des campagnes programmées (aucun cadre de test installé).
//   node tools/campagnes-programmees-check.mjs
//
// ⚠️ RIEN NE PART D'ICI. Ce script ne touche ni Firestore, ni Zoho, ni
// une seule adresse. Il fait tourner les décisions de la minuterie sur
// des données inventées, et il ne charge que du code pur : ni
// firebase-admin, ni nodemailer, ni functions/index.js.
//
// Ce que le script protège, dans l'ordre de ce que ça coûterait :
//
//   1. LE DOUBLE ENVOI. Deux exécutions de la minuterie peuvent se
//      chevaucher. Une campagne déjà « en cours » doit se refuser
//      d'elle-même, et une campagne annulée ne doit JAMAIS partir,
//      même quand son heure est passée depuis longtemps.
//   2. LE FUSEAU. « Le 2 septembre à 9 h » veut dire 9 h à Montréal,
//      pas 9 h à Londres ni 9 h sur le portable qui a servi à
//      programmer. Le calcul est vérifié des deux côtés du changement
//      d'heure, et le script se rejoue depuis un fuseau lointain pour
//      prouver que la machine n'y change rien.
//   3. LA REPRISE. Un envoi interrompu repart d'où il s'était arrêté,
//      jamais du début.
//   4. LE JUMELAGE DU FILTRE. La minuterie et la page d'admin doivent
//      retenir exactement les mêmes personnes pour la même portée.
//
// Les personnes de ce fichier sont inventées.

import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const prog = require('../functions/programmation.js');

const dossier = mkdtempSync(join(tmpdir(), 'campagnes-prog-'));

async function bundler(entree, nom) {
  const sortie = join(dossier, nom);
  await build({
    entryPoints: [entree],
    bundle: true, format: 'esm', outfile: sortie, logLevel: 'warning',
    // Les modules tirent la configuration de Vite : hors du navigateur,
    // elle est vide et Firebase reste endormi.
    define: { 'import.meta.env': '{}' },
  });
  return import(sortie);
}

const H = await bundler('src/lib/heureMontreal.ts', 'heure.mjs');
const C = await bundler('src/firebase/campagnes.ts', 'campagnes.mjs');

let ko = 0;
const ok = (cond, msg) => { if (!cond) { console.log('KO', msg); ko += 1; } };
const egal = (a, b, msg) => ok(
  JSON.stringify(a) === JSON.stringify(b),
  `${msg}\n     attendu ${JSON.stringify(b)}\n     obtenu  ${JSON.stringify(a)}`,
);

const MINUTE = 60 * 1000;

// ─────────────────────────────────────────────────────────────────────
// 1 · L'heure de Montréal
// ─────────────────────────────────────────────────────────────────────

// Le 2 septembre, le Québec est à l'heure avancée, cinq heures de moins
// que Londres et quatre de moins que le temps universel. Neuf heures au
// village font donc treize heures en temps universel.
egal(
  H.instantDepuisMontreal('2026-09-02', '09:00').toISOString(),
  '2026-09-02T13:00:00.000Z',
  'le 2 septembre à 9 h part bien à 13 h UTC',
);

// En janvier, l'heure normale décale d'une heure de plus.
egal(
  H.instantDepuisMontreal('2026-01-15', '09:00').toISOString(),
  '2026-01-15T14:00:00.000Z',
  'le 15 janvier à 9 h part à 14 h UTC, une heure plus tard qu'
  + ' en septembre',
);

// Les deux dimanches où l'horloge saute. En 2026, elle avance le
// 8 mars et recule le 1er novembre.
egal(
  H.instantDepuisMontreal('2026-03-08', '09:00').toISOString(),
  '2026-03-08T13:00:00.000Z',
  'le matin du printemps, après le saut, l’heure avancée s’applique',
);
egal(
  H.instantDepuisMontreal('2026-11-01', '09:00').toISOString(),
  '2026-11-01T14:00:00.000Z',
  'le matin de l’automne, après le retour, l’heure normale s’applique',
);
// La veille au soir, l'ancien décalage tient encore.
egal(
  H.instantDepuisMontreal('2026-03-07', '23:00').toISOString(),
  '2026-03-08T04:00:00.000Z',
  'la veille du saut de mars, l’heure normale tient encore',
);

// Minuit ne bascule pas au lendemain. Le piège est réel : un lecteur
// d'horloge mal réglé rend « 24 » plutôt que « 00 », et une campagne
// de minuit partirait un jour trop tard.
egal(
  H.instantDepuisMontreal('2026-09-02', '00:00').toISOString(),
  '2026-09-02T04:00:00.000Z',
  'minuit reste le 2 septembre, jamais le 3',
);

// Le chemin du retour rend exactement ce qui a été demandé.
for (const [jour, heure] of [
  ['2026-09-02', '09:00'], ['2026-01-15', '17:30'],
  ['2026-11-01', '09:00'], ['2026-12-31', '23:45'],
]) {
  egal(
    H.montrealDepuisInstant(H.instantDepuisMontreal(jour, heure)),
    { date: jour, heure },
    `l’aller-retour garde ${jour} à ${heure}`,
  );
}

ok(H.FUSEAU_FESTIVAL === 'America/Montreal', 'le fuseau du festival est celui de Montréal');
ok(
  H.FUSEAU_FESTIVAL === prog.FUSEAU_FESTIVAL,
  'le navigateur et la minuterie parlent du même fuseau',
);

// ─────────────────────────────────────────────────────────────────────
// 2 · Le verrou : jamais deux fois la même lettre
// ─────────────────────────────────────────────────────────────────────

const MAINTENANT = Date.parse('2026-09-02T13:05:00.000Z');
const HIER = MAINTENANT - 24 * 60 * MINUTE;
const DEMAIN = MAINTENANT + 24 * 60 * MINUTE;

const campagne = (extra) => ({ statut: 'prevue', envoiPrevuLe: HIER, ...extra });

ok(prog.estAPrendre(campagne(), MAINTENANT).prendre,
  'une campagne prévue dont l’heure est passée se prend');

ok(!prog.estAPrendre(campagne({ envoiPrevuLe: DEMAIN }), MAINTENANT).prendre,
  'une campagne prévue pour demain attend son tour');

// LE CAS QUI COMPTE LE PLUS. Une campagne déjà en cours d'envoi ne se
// reprend pas : la reprendre, c'est écrire deux fois aux mêmes gens.
{
  const enCours = campagne({ statut: 'en cours', demarreeLe: MAINTENANT - 2 * MINUTE });
  const verdict = prog.estAPrendre(enCours, MAINTENANT);
  ok(!verdict.prendre, 'une campagne en cours depuis deux minutes ne repart pas');
  ok(verdict.raison === 'déjà en cours', 'et le journal dit pourquoi');
}
{
  // Même chose une seconde après le départ, le pire moment.
  const enCours = campagne({ statut: 'en cours', demarreeLe: MAINTENANT - 1000 });
  ok(!prog.estAPrendre(enCours, MAINTENANT).prendre,
    'une campagne partie il y a une seconde ne repart pas non plus');
}
{
  // Et jusqu'à la dernière minute avant l'expiration du verrou.
  const presque = campagne({ statut: 'en cours', demarreeLe: MAINTENANT - (prog.VERROU_MS - 1000) });
  ok(!prog.estAPrendre(presque, MAINTENANT).prendre,
    'le verrou tient jusqu’à sa dernière seconde');
}

// L'ENVERS. Une exécution qui est morte sans rien dire doit finir par
// libérer la campagne, sinon la lettre ne part jamais.
{
  const abandonnee = campagne({
    statut: 'en cours',
    demarreeLe: MAINTENANT - (prog.VERROU_MS + MINUTE),
    reprisA: 'marguerite@exemple.com',
  });
  const verdict = prog.estAPrendre(abandonnee, MAINTENANT);
  ok(verdict.prendre, 'une campagne abandonnée depuis plus de vingt minutes se reprend');
  ok(verdict.reprisA === 'marguerite@exemple.com',
    'et elle repart d’où le tour précédent s’était arrêté');
}
{
  const relachee = campagne({ statut: 'en cours', demarreeLe: null, reprisA: 'anne@exemple.com' });
  const verdict = prog.estAPrendre(relachee, MAINTENANT);
  ok(verdict.prendre, 'une campagne dont le verrou a été relâché repart au tour suivant');
  ok(verdict.reprisA === 'anne@exemple.com', 'avec son curseur de reprise');
}

// L'AUTRE CAS QUI COMPTE. Une campagne annulée ne part jamais, quelle
// que soit l'heure et quel que soit le reste du document. C'est le seul
// geste qu'Alex a pour rattraper une lettre avant qu'elle sorte.
for (const extra of [
  {}, { demarreeLe: null }, { envoiPrevuLe: HIER - 90 * 24 * 60 * MINUTE }, { reprisA: 'x@exemple.com' },
]) {
  const verdict = prog.estAPrendre(campagne({ statut: 'annulee', ...extra }), MAINTENANT);
  ok(!verdict.prendre, `une campagne annulée ne part jamais (${JSON.stringify(extra)})`);
  ok(verdict.raison === 'campagne annulée', 'et le refus le dit franchement');
}

ok(!prog.estAPrendre(campagne({ statut: 'envoyee' }), MAINTENANT).prendre,
  'une campagne déjà envoyée ne repart pas');
ok(!prog.estAPrendre(campagne({ statut: 'echouee' }), MAINTENANT).prendre,
  'une campagne en échec attend une décision humaine');
ok(!prog.estAPrendre(campagne({ statut: 'brouillon' }), MAINTENANT).prendre,
  'un état inconnu ferme la porte plutôt que de deviner');
ok(!prog.estAPrendre(campagne({ envoiPrevuLe: null }), MAINTENANT).prendre,
  'une campagne sans heure d’envoi ne part pas');
ok(!prog.estAPrendre(null, MAINTENANT).prendre, 'un document vide ne part pas');

// Les Timestamp de Firestore et les Date se lisent comme les nombres.
ok(prog.estAPrendre({ statut: 'prevue', envoiPrevuLe: new Date(HIER) }, MAINTENANT).prendre,
  'une Date se lit comme un instant');
ok(prog.estAPrendre({ statut: 'prevue', envoiPrevuLe: { toMillis: () => HIER } }, MAINTENANT).prendre,
  'un Timestamp de Firestore se lit comme un instant');

// ─────────────────────────────────────────────────────────────────────
// 3 · Le choix des campagnes dues
// ─────────────────────────────────────────────────────────────────────

const paquet = [
  { id: 'demain',   data: campagne({ envoiPrevuLe: DEMAIN }) },
  { id: 'vieille',  data: campagne({ envoiPrevuLe: HIER - 60 * MINUTE }) },
  { id: 'annulee',  data: campagne({ statut: 'annulee' }) },
  { id: 'recente',  data: campagne({ envoiPrevuLe: HIER }) },
  { id: 'occupee',  data: campagne({ statut: 'en cours', demarreeLe: MAINTENANT - MINUTE }) },
  { id: 'envoyee',  data: campagne({ statut: 'envoyee' }) },
  { id: 'reprise',  data: campagne({ statut: 'en cours', demarreeLe: HIER, envoiPrevuLe: HIER - 30 * MINUTE }) },
];

egal(
  prog.campagnesDues(paquet, MAINTENANT).map((c) => c.id),
  ['vieille', 'reprise', 'recente'],
  'seules les campagnes dues sont retenues, la plus vieille d’abord',
);

egal(prog.campagnesDues([], MAINTENANT).map((c) => c.id), [],
  'un paquet vide ne retient rien');

// ─────────────────────────────────────────────────────────────────────
// 4 · Les destinataires, et la reprise
// ─────────────────────────────────────────────────────────────────────

const REGISTRE = [
  { courriel: 'anne@exemple.com',       nom: 'Anne',       annee: 2024, categorie: 'billets',  statut: 'confirme' },
  { courriel: 'bernard@exemple.com',    nom: 'Bernard',    annee: 2024, categorie: 'kiosques', statut: 'confirme' },
  { courriel: 'clothilde@exemple.com',  nom: 'Clothilde',  annee: 2025, categorie: 'billets',  statut: 'confirme' },
  { courriel: 'anne@exemple.com',       nom: 'Anne',       annee: 2026, categorie: 'camping',  statut: 'confirme' },
  { courriel: 'didier@exemple.com',     nom: 'Didier',     annee: 2026, categorie: 'billets',  statut: 'annule' },
  { courriel: 'didier@exemple.com',     nom: 'Didier',     annee: 2024, categorie: 'billets',  statut: 'confirme' },
  { courriel: 'eloise@exemple.com',     nom: '',           annee: 2025, categorie: 'mecenes',  statut: 'confirme' },
];

const COMPTES = new Map([['clothilde@exemple.com', 'uid-clothilde']]);
const ANNEE = 2026;

const portee = (extra) => ({
  mode: 'filtre', annees: [], categories: [],
  sansAchatCetteAnnee: false, sansCompte: false, courriels: [],
  ...extra,
});

/** Le même travail, du côté de la page d'admin. C'est ce jumelage qui
 *  garantit que la lettre programmée touche exactement les gens qu'Alex
 *  a vus à l'écran quand il l'a programmée. */
function cotePage(p) {
  if (p.mode === 'coches') return null;
  const retenus = C.appliquerFiltre(REGISTRE, p, COMPTES);
  return C.destinatairesDepuis(retenus)
    .map((d) => ({ courriel: d.courriel, nom: d.nom }))
    .sort((a, b) => (a.courriel < b.courriel ? -1 : a.courriel > b.courriel ? 1 : 0));
}

const cotesEgaux = (p, quoi) => {
  const minuterie = prog.destinatairesDuFiltre(REGISTRE, COMPTES, p, ANNEE);
  const page = cotePage(p);
  if (page) egal(minuterie, page, `la minuterie et la page retiennent les mêmes gens (${quoi})`);
  return minuterie;
};

// Tout le registre, dédoublonné, trié par adresse.
egal(
  cotesEgaux(portee(), 'tout le registre').map((d) => d.courriel),
  ['anne@exemple.com', 'bernard@exemple.com', 'clothilde@exemple.com', 'didier@exemple.com', 'eloise@exemple.com'],
  'tout le registre, une seule ligne par adresse, trié',
);

// Anne a une fiche en 2024 et une en 2026 : le nom se garde une fois.
egal(
  cotesEgaux(portee(), 'les noms').find((d) => d.courriel === 'eloise@exemple.com'),
  { courriel: 'eloise@exemple.com', nom: '' },
  'une fiche sans nom reste sans nom plutôt que d’en inventer un',
);

egal(
  cotesEgaux(portee({ annees: [2025] }), 'par année').map((d) => d.courriel),
  ['clothilde@exemple.com', 'eloise@exemple.com'],
  'le filtre par année retient les bonnes personnes',
);

egal(
  cotesEgaux(portee({ categories: ['kiosques'] }), 'par catégorie').map((d) => d.courriel),
  ['bernard@exemple.com'],
  'le filtre par catégorie retient les bonnes personnes',
);

// Le filtre de l'invitation. Anne est revenue en 2026, alors elle sort.
// Didier a une fiche 2026 ANNULÉE : il n'est pas revenu, il reste.
egal(
  cotesEgaux(portee({ sansAchatCetteAnnee: true }), 'sans achat cette année').map((d) => d.courriel),
  ['bernard@exemple.com', 'clothilde@exemple.com', 'didier@exemple.com', 'eloise@exemple.com'],
  'une commande annulée ne compte pas comme un retour au festival',
);

egal(
  cotesEgaux(portee({ sansCompte: true }), 'sans compte').map((d) => d.courriel),
  ['anne@exemple.com', 'bernard@exemple.com', 'didier@exemple.com', 'eloise@exemple.com'],
  'le filtre « pas encore de compte » écarte celle qui en a un',
);

// Les personnes cochées à la main.
{
  const coches = prog.destinatairesDuFiltre(REGISTRE, COMPTES, portee({
    mode: 'coches',
    courriels: ['Clothilde@Exemple.com ', 'anne@exemple.com', 'clothilde@exemple.com', 'inconnu@exemple.com'],
  }), ANNEE);
  egal(
    coches,
    [
      { courriel: 'anne@exemple.com', nom: 'Anne' },
      { courriel: 'clothilde@exemple.com', nom: 'Clothilde' },
      { courriel: 'inconnu@exemple.com', nom: '' },
    ],
    'les adresses cochées se rangent, se dédoublonnent et gardent leur ordre alphabétique',
  );
}

// La reprise. Le curseur écarte tout ce qui est déjà parti, et rien de plus.
{
  const tous = prog.destinatairesDuFiltre(REGISTRE, COMPTES, portee(), ANNEE);
  egal(
    prog.resteAFaire(tous, 'bernard@exemple.com').map((d) => d.courriel),
    ['clothilde@exemple.com', 'didier@exemple.com', 'eloise@exemple.com'],
    'la reprise repart après la dernière adresse traitée',
  );
  egal(prog.resteAFaire(tous, '').length, tous.length,
    'sans curseur, la campagne part du début');
  egal(prog.resteAFaire(tous, 'zzz@exemple.com').length, 0,
    'un curseur au-delà de la liste ne renvoie plus personne');
  // Le registre a bougé entre les deux tours : quelqu'un s'est inscrit
  // avant le curseur. La reprise doit quand même l'écarter, sans quoi
  // les gens du début recevraient la lettre une deuxième fois.
  const avecNouvelle = [...tous, { courriel: 'ariane@exemple.com', nom: 'Ariane' }]
    .sort((a, b) => (a.courriel < b.courriel ? -1 : 1));
  egal(
    prog.resteAFaire(avecNouvelle, 'bernard@exemple.com').map((d) => d.courriel),
    ['clothilde@exemple.com', 'didier@exemple.com', 'eloise@exemple.com'],
    'une inscription arrivée entre deux tours ne fait pas repartir le début de la liste',
  );
}

// ─────────────────────────────────────────────────────────────────────
// Le fuseau de la machine ne doit rien changer
// ─────────────────────────────────────────────────────────────────────
// Alex ne travaille pas toujours depuis le Québec. Le calcul de l'heure
// s'appuie sur le fuseau nommé, jamais sur l'horloge locale, et la
// preuve tient à rejouer tout ce fichier depuis l'autre bout du monde.

if (!process.env.FMM_VERIF_FUSEAU) {
  const ici = fileURLToPath(import.meta.url);
  for (const fuseau of ['Australia/Sydney', 'Europe/London', 'UTC']) {
    try {
      execFileSync(process.execPath, [ici], {
        env: { ...process.env, TZ: fuseau, FMM_VERIF_FUSEAU: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      ko += 1;
      console.log(`KO les vérifications échouent depuis ${fuseau}`);
      console.log(String(err.stdout || '') + String(err.stderr || ''));
    }
  }
}

if (ko === 0) {
  const ou = process.env.FMM_VERIF_FUSEAU ? ` (depuis ${process.env.TZ})` : ' (et depuis trois autres fuseaux)';
  console.log(`OK campagnes programmées${ou}`);
} else {
  console.log(`\n${ko} vérification(s) en échec.`);
  process.exit(1);
}
