// Sème la route d'affichage dans Firestore par l'API REST, avec les mêmes
// identifiants que src/firebase/affichage.ts (donc jamais de doublon avec
// le bouton « Charger la route » de l'admin). N'écrit que ce qui manque.
//   node tools/semer-affichage.mjs [--par "Alex"]
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const P = 'festivalmedieval';
const ANNEE = 2027;            // l'édition que la tournée prépare
const ANNEE_PRECEDENTE = 2026;
const B = `https://firestore.googleapis.com/v1/projects/${P}/databases/(default)/documents`;
const TOK = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
const H = { Authorization: `Bearer ${TOK}`, 'x-goog-user-project': P, 'Content-Type': 'application/json' };
const par = process.argv.includes('--par') ? process.argv[process.argv.indexOf('--par') + 1] : 'Alex';

const seed = JSON.parse(fs.readFileSync(new URL('../src/content/affichage-routes.json', import.meta.url), 'utf8'));
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const LIB = { 'termine': 'Affiche posée', 'en-cours': 'En chemin', 'non-commence': 'Pas commencé', 'bloque': 'Refus' };

const existants = new Set();
let pageToken = '';
do {
  const r = await fetch(`${B}/affichage?pageSize=300&mask.fieldPaths=nom${pageToken ? `&pageToken=${pageToken}` : ''}`, { headers: H }).then((x) => x.json());
  for (const d of r.documents ?? []) existants.add(d.name.split('/').pop());
  pageToken = r.nextPageToken ?? '';
} while (pageToken);

const v = (x) => x === null ? { nullValue: null } : typeof x === 'number' ? { integerValue: String(x) } : typeof x === 'boolean' ? { booleanValue: x } : { stringValue: x };
const now = new Date().toISOString();
const writes = [];
seed.forEach((g, i) => {
  const id = `${slug(g.n).slice(0, 44)}-${i}`;
  if (existants.has(id)) return;
  const fields = {
    route: v(g.r), nom: v(g.n), type: v(g.t), pertinence: v(g.p), note: v(g.note ?? ''),
    statut: v('a-faire'), porteur: v(''), annee: v(ANNEE),
    precedent: g.s
      ? { mapValue: { fields: { annee: v(ANNEE_PRECEDENTE), statut: v(LIB[g.s] ?? g.s), porteur: v(g.q ?? '') } } }
      : { nullValue: null },
    historique: { arrayValue: { values: [{ mapValue: { fields: { type: v('creation'), par: v(par), quand: { timestampValue: now } } } }] } },
    creeLe: { timestampValue: now }, modifieLe: { timestampValue: now },
  };
  writes.push({
    update: { name: `projects/${P}/databases/(default)/documents/affichage/${id}`, fields },
    currentDocument: { exists: false },
  });
});

for (let i = 0; i < writes.length; i += 200) {
  const r = await fetch(`${B}:commit`, { method: 'POST', headers: H, body: JSON.stringify({ writes: writes.slice(i, i + 200) }) }).then((x) => x.json());
  if (r.error) { console.error('commit refusé :', JSON.stringify(r.error).slice(0, 300)); process.exit(1); }
}
console.log(`${writes.length} commerces semés, ${existants.size} existaient déjà.`);
