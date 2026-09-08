// Capture d'une section de l'admin FMM avec le vrai compte d'Alex (jeton signé par IAM, voir admin-jeton.mjs).
// Vite doit tourner : npx vite --port 5199 --strictPort. Ferme le bandeau Loi 25 et les pop-ups sans rien réclamer, passe la porte CA.
//   JETON=/tmp/jeton-fmm.txt node scripts/qa/admin-shot.mjs /admin/benevoles scripts/qa/shots/admin-benevoles   (ONLY=1 pour le 390 seul)
import { chromium } from 'playwright';
import fs from 'node:fs';
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const [,, route = '/admin/benevoles', prefixe = 'scripts/qa/shots/admin-benevoles'] = process.argv;
const BASE = process.env.BASE || 'http://localhost:5199';
const token = fs.readFileSync(process.env.JETON, 'utf8').trim();
const b = await chromium.launch({ channel: 'chrome', headless: true });
for (const [w, h, tag] of (process.env.ONLY ? [[390, 844, '390']] : [[1440, 900, '1440'], [390, 844, '390']])) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await c.newPage();
  p.on('response', (r) => { if (r.status() >= 400 && r.url().includes('googleapis')) console.log(`[${tag}] ${r.status()} ${r.url().slice(0, 120)}`); });
  await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const res = await p.evaluate(async (t) => {
    const src = await fetch('/src/firebase.ts').then((r) => r.text());
    const m = src.match(/"([^"]*firebase_auth\.js[^"]*)"/);
    if (!m) return 'no firebase_auth url';
    const a = await import(m[1]);
    const { auth } = await import('/src/firebase.ts');
    const u = await a.signInWithCustomToken(auth, t);
    return 'signed in ' + u.user.uid;
  }, token);
  console.log(tag, res);
  await p.waitForTimeout(2500);
  await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(6000);
  for (const t of ['Tout refuser']) { const btn = p.getByRole('button', { name: t }); if (await btn.count()) await btn.first().click().catch(()=>{}); }
  await p.waitForTimeout(600);
  for (let i = 0; i < 4; i++) {
    const closes = p.locator('button[aria-label*="ermer" i], button[aria-label*="lose" i]');
    if (await closes.count()) { await closes.first().click({ force: true }).catch(()=>{}); await p.waitForTimeout(600); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  }
  for (let k = 0; k < 3; k++) {
    const entrer = p.getByRole('button', { name: /entrer/i }).first();
    if (!(await entrer.count())) break;
    await entrer.scrollIntoViewIfNeeded().catch(()=>{});
    await p.waitForTimeout(800);
    await entrer.click().catch(async () => { await entrer.click({ force: true }).catch(()=>{}); });
    await p.waitForTimeout(5000);
    const t = await p.evaluate(() => document.body.innerText);
    console.log(tag, 'après Entrer', k, 'porte encore là:', /Qui frappe/.test(t));
    if (!/Qui frappe/.test(t)) { await p.screenshot({ path: `${prefixe}-${tag}-apres-entrer.png` }); require('node:fs').writeFileSync(`${prefixe}-${tag}-apres-entrer.txt`, t); break; }
  }
  if (!/Liste d.attente 2027/i.test(await p.evaluate(() => document.body.innerText))) {
    const nav = p.getByText(/^Bénévoles$/).first();
    if (await nav.count()) { await nav.click().catch(()=>{}); await p.waitForTimeout(5000); }
  }
  console.log(tag, 'url', p.url());
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${prefixe}-${tag}.png` });
  const txt = await p.evaluate(() => document.body.innerText);
  console.log(tag, 'complete-banner:', /Équipe 2026 complète/i.test(txt), '| bouton:', /Rouvrir le recrutement|Déclarer l.équipe complète/i.exec(txt)?.[0], '| filtre:', /Liste d.attente 2027/i.test(txt));
  await c.close();
}
await b.close();
