// ─── Regarder les jeux avant de dire que c'est fini ──────────────────
// Alex, 2026-09-01 : rien ne se déclare terminé sans avoir été vu. Ce
// script monte le serveur de développement, ouvre les cinq pages de
// jeux dans un navigateur local sans fenêtre, prend une capture au
// bureau et une au téléphone, et ramasse les erreurs de console.
//
//   node tools/jeux-capture.mjs
//
// Les captures tombent dans captures/jeux/. Aucun navigateur visible ne
// s'ouvre nulle part, et surtout pas sur la machine de quelqu'un
// d'autre : tout se passe dans le Chromium de Playwright, ici.

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 5199;
const BASE = `http://localhost:${PORT}`;
const PAGES = [
  ['jeux-en-ligne', '/jeux-en-ligne'],
  ['merelle', '/jeux/merelle'],
  ['renard', '/jeux/renard'],
  ['des', '/jeux/des'],
  ['hnefatafl', '/jeunesse/hnefatafl'],
];

const dossier = 'captures/jeux';
mkdirSync(dossier, { recursive: true });

const serveur = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
const pret = new Promise((resolve, reject) => {
  const minuteur = setTimeout(() => reject(new Error('le serveur ne répond pas')), 60_000);
  serveur.stdout.on('data', (d) => {
    if (String(d).includes('ready in') || String(d).includes('Local:')) {
      clearTimeout(minuteur);
      setTimeout(resolve, 1200);
    }
  });
});

try {
  await pret;
  const navigateur = await chromium.launch();
  const problemes = [];

  for (const [nom, chemin] of PAGES) {
    for (const [ecran, taille] of [['bureau', { width: 1440, height: 900 }], ['telephone', { width: 390, height: 844 }]]) {
      const contexte = await navigateur.newContext({ viewport: taille });
      const page = await contexte.newPage();
      page.on('console', (m) => {
        if (m.type() === 'error') problemes.push(`${nom} ${ecran} : ${m.text().slice(0, 200)}`);
      });
      page.on('pageerror', (e) => problemes.push(`${nom} ${ecran} : ${String(e).slice(0, 200)}`));
      await page.goto(`${BASE}${chemin}`, { waitUntil: 'networkidle', timeout: 45_000 }).catch(() => {});
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${dossier}/${nom}-${ecran}.png`, fullPage: ecran === 'bureau' });
      await contexte.close();
    }
    console.log(`vu : ${nom}`);
  }

  await navigateur.close();
  if (problemes.length === 0) console.log('\nAucune erreur de console.');
  else {
    console.log(`\n${problemes.length} erreurs de console :`);
    for (const p of [...new Set(problemes)].slice(0, 25)) console.log('  ' + p);
  }
} finally {
  serveur.kill('SIGTERM');
}
