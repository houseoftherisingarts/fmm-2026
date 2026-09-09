// Sème l'inventaire de départ du container dans Firestore par l'API REST
// (même identifiants que src/firebase/inventaire.ts, donc le bouton
// « Charger l'inventaire » de l'admin ne fera jamais de doublon).
// Écrit seulement ce qui n'existe pas encore.
//   node tools/semer-inventaire.mjs [--par "Alex"]
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const P = 'festivalmedieval';
const B = `https://firestore.googleapis.com/v1/projects/${P}/databases/(default)/documents`;
const TOK = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
const H = { Authorization: `Bearer ${TOK}`, 'x-goog-user-project': P, 'Content-Type': 'application/json' };
const par = process.argv.includes('--par') ? process.argv[process.argv.indexOf('--par') + 1] : 'Alex';

const seed = JSON.parse(fs.readFileSync(new URL('../src/content/inventaire-container.json', import.meta.url), 'utf8'));
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lireCode = (code) => {
  const m = /^(CG|CF|CD)([1-4])?([A-D])?$/.exec(code);
  return { section: m[1], niveau: m[2] ? Number(m[2]) : null, profondeur: m[3] ?? null };
};

const existants = new Set();
let pageToken = '';
do {
  const r = await fetch(`${B}/inventaire?pageSize=300&mask.fieldPaths=nom${pageToken ? `&pageToken=${pageToken}` : ''}`, { headers: H }).then((x) => x.json());
  for (const d of r.documents ?? []) existants.add(d.name.split('/').pop());
  pageToken = r.nextPageToken ?? '';
} while (pageToken);

const v = (x) => x === null ? { nullValue: null } : typeof x === 'number' ? { integerValue: String(x) } : typeof x === 'boolean' ? { booleanValue: x } : { stringValue: x };
const now = new Date().toISOString();
const writes = [];
seed.forEach((g, i) => {
  const id = `${g.e.toLowerCase()}-${slug(g.n).slice(0, 40)}-${i}`;
  if (existants.has(id)) return;
  const e = lireCode(g.e);
  writes.push({
    update: {
      name: `${B.replace('https://firestore.googleapis.com/v1/', '')}/inventaire/${id}`,
      fields: {
        nom: v(g.n), categorie: v(g.c), quantite: v(g.q), detail: v(g.d), aVerifier: v(g.v === true),
        section: v(e.section), niveau: v(e.niveau), profondeur: v(e.profondeur),
        statut: v('range'), sorti: { nullValue: null },
        historique: { arrayValue: { values: [{ mapValue: { fields: { type: v('creation'), par: v(par), quand: { timestampValue: now } } } }] } },
        creeLe: { timestampValue: now }, modifieLe: { timestampValue: now },
      },
    },
    currentDocument: { exists: false },
  });
});

for (let i = 0; i < writes.length; i += 200) {
  const r = await fetch(`${B}:commit`, { method: 'POST', headers: H, body: JSON.stringify({ writes: writes.slice(i, i + 200) }) }).then((x) => x.json());
  if (r.error) { console.error('commit refusé :', JSON.stringify(r.error).slice(0, 300)); process.exit(1); }
}
console.log(`${writes.length} objets semés, ${existants.size} existaient déjà.`);
