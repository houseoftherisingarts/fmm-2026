// Capture de l'onglet Bénévoles filtré sur la liste d'attente, et lecture
// du rail selon le rôle. Vite doit tourner : npx vite --port 5199 --strictPort.
//   JETON=/tmp/jeton.txt CHIP=1 node scripts/qa/admin-shot-attente.mjs /admin/benevoles scripts/qa/shots/attente
import { chromium } from 'playwright';
import fs from 'node:fs';
const [,, route = '/admin/benevoles', prefixe = 'scripts/qa/shots/attente'] = process.argv;
const BASE = process.env.BASE || 'http://localhost:5199';
const token = fs.readFileSync(process.env.JETON, 'utf8').trim();
const b = await chromium.launch({ channel: 'chrome', headless: true });
for (const [w, h, tag] of (process.env.ONLY ? [[1440, 900, '1440']] : [[1440, 900, '1440'], [390, 844, '390']])) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.evaluate(async (t) => {
    const src = await fetch('/src/firebase.ts').then((r) => r.text());
    const m = src.match(/"([^"]*firebase_auth\.js[^"]*)"/);
    const a = await import(m[1]);
    const { auth } = await import('/src/firebase.ts');
    await a.signInWithCustomToken(auth, t);
  }, token);
  await p.waitForTimeout(2500);
  await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(6000);
  for (const t of ['Tout refuser']) { const btn = p.getByRole('button', { name: t }); if (await btn.count()) await btn.first().click().catch(()=>{}); }
  await p.waitForTimeout(600);
  for (let i = 0; i < 3; i++) {
    const closes = p.locator('button[aria-label*="ermer" i], button[aria-label*="lose" i]');
    if (await closes.count()) { await closes.first().click({ force: true }).catch(()=>{}); await p.waitForTimeout(500); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  }
  for (let k = 0; k < 3; k++) {
    const entrer = p.getByRole('button', { name: /entrer/i }).first();
    if (!(await entrer.count())) break;
    await entrer.click({ force: true }).catch(()=>{});
    await p.waitForTimeout(4500);
  }
  if (process.env.CHIP) {
    const chip = p.getByRole('button', { name: /Liste d.attente/i }).first();
    if (await chip.count()) { await chip.click({ force: true }).catch(()=>{}); await p.waitForTimeout(1500); }
    else console.log(tag, 'chip liste d’attente introuvable');
  }
  await p.screenshot({ path: `${prefixe}-${tag}.png` });
  // Le rail se lit dans le DOM, jamais par une expression régulière sur
  // toute la page : le mot « bar » vit aussi dans les fiches de bénévoles
  // et faisait passer pour ouverte une porte qui était bien fermée.
  const nav = await p.evaluate(() => [...document.querySelectorAll('aside a, aside button')]
    .map((n) => n.innerText.trim().split('\n')[0]).filter(Boolean));
  const cuisine = nav.filter((n) => /^(BAR|INVENTAIRE|TÂCHES DU VILLAGE|REPAS AUX KIOSQUES)$/i.test(n));
  const txt = await p.evaluate(() => document.body.innerText);
  console.log(tag, '| sections Cuisine dans le rail:', cuisine.length ? cuisine.join(', ') : 'aucune',
              '| rôle:', /(CA \(CONSEIL|SUPER-ADMIN|CUISINE|ORGANISATEUR)/i.exec(txt)?.[0] || '?',
              '| cartes visibles:', (txt.match(/PROFIL/g) || []).length);
  await c.close();
}
await b.close();
