// Captures de la section Animations et du formulaire public, en mode
// bypass (aucune base de données nécessaire).
//
//   VITE_ADMIN_DEV_BYPASS=true npx vite --port 5181
//   BASE=http://localhost:5181 OUT=captures/animations node scripts/qa/admin-shot-animations.mjs
//
// Ce que les captures servent à vérifier, à 1440 comme à 390 : rien ne
// déborde de l'écran, aucun bloc ne se retrouve centré dans du vide,
// aucun titre ne passe la deuxième ligne, et la console reste muette.

import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:5181';
const OUT = process.env.OUT || 'captures/animations';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ channel: 'chrome', headless: true });
const bilan = [];

for (const [w, h, tag] of [[1440, 900, '1440'], [390, 844, '390']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await c.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 200)));

  // ── L'admin ────────────────────────────────────────────────────────
  await p.goto(`${BASE}/admin/animations`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const porte = p.getByText('Super-Admin', { exact: true }).first();
  if (await porte.count()) { await porte.click().catch(() => {}); await p.waitForTimeout(2500); }
  if (!p.url().includes('/admin/animations')) {
    await p.goto(`${BASE}/admin/animations`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
  }
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/anim-${tag}-1-liste.png`, fullPage: false });
  await p.screenshot({ path: `${OUT}/anim-${tag}-1b-pleine.png`, fullPage: true });

  const texte = await p.evaluate(() => document.body.innerText);
  const deborde = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  // La première fiche, dépliée.
  const premiere = p.locator('button, [role="button"]').filter({ hasText: /Aslak|Hullsborg|AMQ/ }).first();
  if (await premiere.count()) {
    await premiere.scrollIntoViewIfNeeded().catch(() => {});
    await premiere.click().catch(() => {});
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/anim-${tag}-2-fiche.png`, fullPage: true });
  }

  // L'onglet des candidatures.
  const onglet = p.getByRole('button', { name: /Candidatures/i }).first();
  if (await onglet.count()) {
    await onglet.click().catch(() => {});
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/anim-${tag}-3-candidatures.png`, fullPage: true });
  }

  // ── Le formulaire public ───────────────────────────────────────────
  await p.goto(`${BASE}/animation/inscription`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${OUT}/form-${tag}-1-haut.png`, fullPage: false });
  await p.screenshot({ path: `${OUT}/form-${tag}-2-pleine.png`, fullPage: true });
  const debordeForm = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  // ── L'appel sur la page Activités ──────────────────────────────────
  await p.goto(`${BASE}/activites`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  const lien = p.locator('a[href*="animation/inscription"], a[href*="entertainment/registration"]').first();
  let appelVu = false;
  if (await lien.count()) {
    appelVu = true;
    await lien.scrollIntoViewIfNeeded().catch(() => {});
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/appel-${tag}-1.png`, fullPage: false });
  }

  bilan.push({
    tag,
    sectionChargee: /Animations/i.test(texte),
    fichesVues: ['Aslak', 'Hullsborg', 'AMQ'].filter((n) => texte.includes(n)),
    debordementAdmin: deborde,
    debordementFormulaire: debordeForm,
    appelSurActivites: appelVu,
    erreurs: errs.slice(0, 5),
  });
  await c.close();
}

await b.close();
console.log(JSON.stringify(bilan, null, 2));
