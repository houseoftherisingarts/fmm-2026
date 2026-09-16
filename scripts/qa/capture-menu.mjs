// Capture du menu du village (/nourriture) à 1440 et 390, guildes ouvertes.
// Prérequis : npx vite preview --port 4178 --strictPort

import { chromium, webkit } from 'playwright';
const out = [];
for (const [nom, moteur, vw, vh] of [['1440', chromium, 1440, 900], ['390', chromium, 390, 844]]) {
  const b = await moteur.launch();
  const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  await p.goto('http://localhost:4178/nourriture', { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(5000);
  // ouvrir toutes les guildes repliées
  const n = await p.evaluate(() => {
    const bs = [...document.querySelectorAll('article.fmm-menu-card > button[aria-expanded="false"]')];
    bs.forEach((b) => b.click()); return bs.length;
  });
  await p.waitForTimeout(1500);
  // fermer la fenêtre des témoins et le badge, qui masquent le menu
  await p.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /tout refuser/i.test(b.textContent || ''))?.click();
    document.querySelector('button[aria-label*="ermer"], button[aria-label*="lose"]')?.click();
  });
  await p.waitForTimeout(800);
  // descendre pas à pas pour allumer les Reveal, dont l'abreuvoir
  for (let y = 0; y < 14000; y += 500) { await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(120); }
  await p.waitForTimeout(800);
  const grille = p.locator('article.fmm-menu-card').first();
  await grille.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
  const zone = p.locator('section', { has: p.locator('article.fmm-menu-card') }).first();
  await zone.screenshot({ path: `/tmp/fmm-menu-${nom}.png` });
  const txt = await zone.innerText();
  out.push([nom, n, /Olla gitana/.test(txt), /12 \$/.test(txt), /courageux|cent ans|Langue de porc|Pizza déjeuner/i.test(txt), /Dégustation William J. Walter/.test(txt), /Beurre aux herbes inclus/.test(txt)]);
  await b.close();
}
console.log('taille guildes ouvertes olla prix12 restesRetirés dégustation beurreInclus');
for (const o of out) console.log(o.join(' '));
