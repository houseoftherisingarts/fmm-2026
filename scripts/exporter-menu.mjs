// Exporte src/content/menu2026.ts en JSON pour les panneaux et le menu
// imprimés (vault : 10_projects/fmm/06-communication/panneaux-4x8-bois).
// Le menu papier ne se recopie jamais à la main : il se régénère d'ici.
//
// Usage : node scripts/exporter-menu.mjs [cible.json]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cible = process.argv[2] ?? path.join(os.homedir(),
  'Documents/Onyx/10_projects/fmm/06-communication/panneaux-4x8-bois/menu2026.json');
const tmp = path.join(os.tmpdir(), `menu2026-${process.pid}.mjs`);
execFileSync('node_modules/.bin/esbuild',
  ['src/content/menu2026.ts', '--format=esm', `--outfile=${tmp}`, '--log-level=error']);
const { MENU, ABREUVOIR, BANQUET_MENU } = await import(tmp);
fs.writeFileSync(cible, JSON.stringify({ MENU, ABREUVOIR, BANQUET_MENU }, null, 1) + '\n');
fs.rmSync(tmp);
const plats = [...MENU, ABREUVOIR].reduce((n, c) => n + c.dishes.length, 0);
console.log(`écrit ${cible} · ${MENU.length + 1} sections · ${plats} plats`);
