// ─── Le Drive du festival, versé dans Obsidian ──────────────────────
// Alex, 2026-09-02 : « copie tout ce que tu es capable de copier en .md
// dans une série de notes Obsidian under floki ».
//
//   node tools/drive-export.mjs
//
// Ce qui se copie vraiment : les documents Google en markdown, les
// feuilles Google en tableau, les .docx par textutil. Le reste (images,
// vidéos, PDF) reçoit une note de renvoi avec son lien, parce qu'un
// fichier binaire ne devient pas du texte par magie et qu'une note qui
// ment est pire qu'une note absente.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';

const racine = '/Users/lesalondesinconnus/Documents/Websites/FMM 2026';
const COFFRE = '/Users/lesalondesinconnus/Documents/Onyx/Floki';
const requireF = createRequire(path.join(racine, 'functions', 'package.json'));
const { OAuth2Client } = requireF('google-auth-library');

const env = Object.fromEntries(readFileSync(path.join(racine, '.env.local'), 'utf8').split('\n')
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const c = new OAuth2Client({ clientId: env.FMM_DRIVE_CLIENT_ID, clientSecret: env.FMM_DRIVE_CLIENT_SECRET });
c.setCredentials(JSON.parse(readFileSync(path.join(racine, '.drive-token.json'), 'utf8')));

const DOC = 'application/vnd.google-apps.document';
const FEUILLE = 'application/vnd.google-apps.spreadsheet';
const DIAPO = 'application/vnd.google-apps.presentation';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Un nom de fichier qui survit à Obsidian et au disque. */
const propre = (s) => s.replace(/[\/\\:*?"<>|#^\[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'sans-titre';

async function exporter(id, mime) {
  const u = `https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=${encodeURIComponent(mime)}`;
  const r = await c.request({ url: u, responseType: 'text' });
  return typeof r.data === 'string' ? r.data : String(r.data);
}

async function telecharger(id) {
  const r = await c.request({ url: `https://www.googleapis.com/drive/v3/files/${id}?alt=media`, responseType: 'arraybuffer' });
  return Buffer.from(r.data);
}

const tout = JSON.parse(readFileSync(path.join(racine, 'docs', 'drive-inventaire.json'), 'utf8'));
const fichiers = tout.filter((f) => !f.dossier);
let copies = 0; let renvois = 0; let ratees = 0;

for (const f of fichiers) {
  const dossier = path.join(COFFRE, path.dirname(f.chemin).split('/').filter(Boolean).map(propre).join('/'));
  mkdirSync(dossier, { recursive: true });
  const note = path.join(dossier, `${propre(f.nom)}.md`);
  if (existsSync(note)) { copies++; continue; }

  const entete = [
    '---',
    `titre: ${JSON.stringify(f.nom)}`,
    'source: Google Drive du Festival Médiéval',
    `chemin_drive: ${JSON.stringify(f.chemin)}`,
    `id_drive: ${f.id}`,
    `type: ${f.type}`,
    `modifie: ${f.modifie}`,
    `lien: ${f.lien}`,
    'tags: [floki, drive-fmm]',
    '---',
    '',
    `# ${f.nom}`,
    '',
  ].join('\n');

  try {
    let corps;
    if (f.type === DOC) corps = await exporter(f.id, 'text/markdown');
    else if (f.type === FEUILLE) {
      const csv = await exporter(f.id, 'text/csv');
      const lignes = csv.split('\n').filter((l) => l.trim()).slice(0, 400);
      corps = ['> Première feuille seulement. Le classeur complet vit dans le Drive.', '', '```csv', ...lignes, '```'].join('\n');
    } else if (f.type === DIAPO) corps = await exporter(f.id, 'text/plain');
    else if (f.type === DOCX) {
      const tmp = `/tmp/floki-${f.id}.docx`;
      writeFileSync(tmp, await telecharger(f.id));
      corps = execFileSync('textutil', ['-convert', 'txt', '-stdout', tmp], { encoding: 'utf8', maxBuffer: 64e6 });
    } else {
      corps = `> Ce fichier est un ${f.type}. Son contenu ne se met pas en texte : la note sert de renvoi, et le fichier reste dans le Drive.`;
      renvois++;
    }
    writeFileSync(note, entete + corps + '\n');
    copies++;
  } catch (e) {
    writeFileSync(note, `${entete}> La copie a échoué : ${String(e).slice(0, 200)}\n`);
    ratees++;
  }
  if ((copies + ratees) % 25 === 0) process.stderr.write(`\r${copies} notes écrites, ${ratees} échecs…`);
}
process.stderr.write('\n');
console.log(`${copies} notes dans ${COFFRE}, dont ${renvois} renvois sans texte. ${ratees} échecs.`);
