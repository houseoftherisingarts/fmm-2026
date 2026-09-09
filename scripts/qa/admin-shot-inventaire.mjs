import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT;
const token = fs.readFileSync(process.env.JETON, 'utf8').trim();
const b = await chromium.launch({ channel: 'chrome', headless: true });
for (const [w, h, tag] of [[1440, 900, '1440'], [390, 844, '390']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('fmm.inventaire.visite', '1'); } catch {} });
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  await p.goto(`${BASE}/admin/inventaire`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const res = await p.evaluate(async (t) => {
    const src = await fetch('/src/firebase.ts').then((r) => r.text());
    const m = src.match(/"([^"]*firebase_auth\.js[^"]*)"/);
    const a = await import(m[1]);
    const { auth } = await import('/src/firebase.ts');
    const u = await a.signInWithCustomToken(auth, t);
    return 'signed in ' + u.user.uid;
  }, token);
  console.log(tag, res);
  await p.waitForTimeout(2000);
  await p.goto(`${BASE}/admin/inventaire`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(6000);
  const btn = p.getByRole('button', { name: 'Tout refuser' }); if (await btn.count()) await btn.first().click().catch(() => {});
  await p.waitForTimeout(500);
  for (let i = 0; i < 4; i++) {
    const closes = p.locator('button[aria-label*="ermer" i], button[aria-label*="lose" i]');
    if (await closes.count()) { await closes.first().click({ force: true }).catch(() => {}); await p.waitForTimeout(500); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  }
  for (let k = 0; k < 3; k++) {
    const entrer = p.getByRole('button', { name: /entrer/i }).first();
    if (!(await entrer.count())) break;
    await entrer.scrollIntoViewIfNeeded().catch(() => {});
    await p.waitForTimeout(600);
    await entrer.click().catch(async () => { await entrer.click({ force: true }).catch(() => {}); });
    await p.waitForTimeout(4000);
    if (!/Qui frappe/.test(await p.evaluate(() => document.body.innerText))) break;
  }
  if (!p.url().includes('/admin/inventaire')) { await p.goto(`${BASE}/admin/inventaire`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000); }
  await p.waitForTimeout(2500);
  const passer = p.getByRole('button', { name: /Passer/ }).first(); if (await passer.count()) { await passer.click(); await p.waitForTimeout(500); }
  const txt = await p.evaluate(() => document.body.innerText);
  console.log(tag, 'url', p.url(), '| objets visibles:', /Tout le container/.test(txt), '| CG1A:', /CG1A/.test(txt));
  await p.screenshot({ path: `${OUT}/inv-${tag}-1-haut.png` });
  // 3D
  const b3 = p.getByRole('button', { name: /^3D$/ }).first();
  if (await b3.count()) { await b3.click(); await p.waitForTimeout(3500); await p.screenshot({ path: `${OUT}/inv-${tag}-2-3d.png` }); }
  // Clic sur une case du plan : retour au plan, cliquer CG2A
  const bplan = p.getByRole('button', { name: /^Plan$/ }).first(); if (await bplan.count()) { await bplan.click(); await p.waitForTimeout(500); }
  const cell = p.locator('button[title^="CG2A"]').first();
  if (await cell.count()) { await cell.click(); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/inv-${tag}-3-filtre-cg2a.png` }); }
  // Formulaire de sortie sur le premier objet
  const cb = p.locator('input[type=checkbox][aria-label^="Sortir"]').first();
  if (await cb.count()) { await cb.scrollIntoViewIfNeeded(); await cb.click(); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/inv-${tag}-4-sortie.png` }); }
  // Liste plus bas
  await p.evaluate(() => window.scrollBy(0, 900)); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/inv-${tag}-5-liste.png` });
  // A à Z
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
  const az = p.getByRole('button', { name: /A à Z/ }).first();
  if (await az.count()) { await az.click(); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/inv-${tag}-6-alpha.png` }); }
  // Le fond : clic sur CF1
  const cf = p.locator('button[title^="CF1"]').first();
  if (await cf.count()) { await cf.click(); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/inv-${tag}-7-cf1.png` }); }
  console.log(tag, 'erreurs console:', errs.length, errs.slice(0, 3));
  await c.close();
}
await b.close();
