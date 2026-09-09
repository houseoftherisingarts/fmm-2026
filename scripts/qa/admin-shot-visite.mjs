// Captures de la visite guidée de l'inventaire (dev sur 5199, jeton IAM comme admin-shot.mjs).
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT;
const token = fs.readFileSync(process.env.JETON, 'utf8').trim();
const b = await chromium.launch({ channel: 'chrome', headless: true });
for (const [w, h, tag] of [[1440, 900, '1440'], [390, 844, '390']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.goto(`${BASE}/admin/inventaire`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.evaluate(async (t) => {
    const src = await fetch('/src/firebase.ts').then((r) => r.text());
    const a = await import(src.match(/"([^"]*firebase_auth\.js[^"]*)"/)[1]);
    const { auth } = await import('/src/firebase.ts');
    await a.signInWithCustomToken(auth, t);
  }, token);
  await p.waitForTimeout(2000);
  await p.goto(`${BASE}/admin/inventaire`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(6000);
  const btn = p.getByRole('button', { name: 'Tout refuser' }); if (await btn.count()) await btn.first().click().catch(() => {});
  for (let i = 0; i < 4; i++) {
    const closes = p.locator('button[aria-label*="ermer" i], button[aria-label*="lose" i]');
    if (await closes.count()) { await closes.first().click({ force: true }).catch(() => {}); await p.waitForTimeout(400); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  }
  for (let k = 0; k < 3; k++) {
    const entrer = p.getByRole('button', { name: /entrer/i }).first();
    if (!(await entrer.count())) break;
    await entrer.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(500);
    await entrer.click().catch(async () => { await entrer.click({ force: true }).catch(() => {}); });
    await p.waitForTimeout(4000);
    if (!/Qui frappe/.test(await p.evaluate(() => document.body.innerText))) break;
  }
  if (!p.url().includes('/admin/inventaire')) { await p.goto(`${BASE}/admin/inventaire`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000); }
  await p.waitForTimeout(3000);
  // La visite part d'elle-même (localStorage neuf dans ce contexte)
  const auto = await p.getByText(/Visite guidée · 1 \//).count();
  console.log(tag, 'visite auto lancée :', auto > 0);
  if (!auto) { await p.getByRole('button', { name: /Visite guidée/ }).first().click(); await p.waitForTimeout(1500); }
  await p.waitForTimeout(1200);
  for (let s = 1; s <= 9; s++) {
    await p.screenshot({ path: `${OUT}/visite-${tag}-${s}.png` });
    const suivant = p.getByRole('button', { name: /^Suivant/ });
    if (!(await suivant.count())) break;
    await suivant.first().click(); await p.waitForTimeout(1400);
  }
  const t = await p.evaluate(() => document.body.innerText);
  console.log(tag, 'dernière étape atteinte :', /Terminer/.test(t), '| titre :', (t.match(/Visite guidée · \d \/ \d\n(.+)/) || [])[1]);
  await c.close();
}
await b.close();
