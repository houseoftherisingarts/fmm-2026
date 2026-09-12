// Capture du Cul de chouette en cours de partie, aux deux largeurs.
//   npx vite --port 5199   puis   node scripts/qa/chouette-shot.mjs <prefixe>
import { chromium } from 'playwright';
const [,, prefixe = 'scripts/qa/shots/chouette'] = process.argv;
const BASE = process.env.BASE || 'http://localhost:5199';
const b = await chromium.launch();
const erreurs = [];
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 1 });
  await c.addInitScript(() => { try { localStorage.setItem('fmm.tutoriel.chouette', '1'); } catch {} });
  const p = await c.newPage();
  p.on('console', (m) => { if (m.type() === 'error') erreurs.push(`[${tag}] console: ${m.text().slice(0, 200)}`); });
  p.on('pageerror', (e) => erreurs.push(`[${tag}] page: ${String(e).slice(0, 200)}`));
  await p.goto(`${BASE}/jeux/chouette?apercu=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(7000);
  // La visite guidée s'ouvre d'elle-même la première fois : on la ferme.
  const refuser = p.locator('button:has-text("Tout refuser")').first();
  if (await refuser.count()) { await refuser.click({ force: true, timeout: 5000 }).catch(() => {}); await p.waitForTimeout(500); }
  const quitter = p.locator('button:has-text("Quitter")').first();
  if (await quitter.count()) { await quitter.click({ force: true, timeout: 5000 }).catch(() => {}); await p.waitForTimeout(600); }
  await p.screenshot({ path: `${prefixe}-${tag}-1-table.jpg`, fullPage: false, quality: 72 });
  const dresser = p.locator('button:has-text("Dresser la table")').first();
  if (await dresser.count()) { await dresser.scrollIntoViewIfNeeded(); await dresser.dispatchEvent('click'); await p.waitForTimeout(1200); }
  const continuer = p.locator('button:has-text("Continuer")').first();
  if (await continuer.count()) { await continuer.click({ force: true, timeout: 5000 }); await p.waitForTimeout(800); }
  await p.screenshot({ path: `${prefixe}-${tag}-2-dressee.jpg`, fullPage: false, quality: 72 });
  const lancer = p.locator('button:has-text("Lancer les dés")').first();
  if (await lancer.count()) { await lancer.dispatchEvent('click'); await p.waitForTimeout(4600); }
  await p.screenshot({ path: `${prefixe}-${tag}-3-lance.jpg`, fullPage: false, quality: 72 });
  await p.waitForTimeout(9000);
  await p.screenshot({ path: `${prefixe}-${tag}-4-suite.jpg`, fullPage: false, quality: 72 });
  const deborde = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (deborde) erreurs.push(`[${tag}] debordement horizontal`);
  console.log(`ok ${prefixe}-${tag}`);
  await c.close();
}
await b.close();
if (erreurs.length) console.log('ERREURS:\n' + [...new Set(erreurs)].join('\n'));
