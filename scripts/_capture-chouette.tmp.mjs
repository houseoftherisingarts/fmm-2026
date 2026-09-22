// Capture du cul de chouette (et des dés), partie dressée, en aperçu de dev.
import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:5174';
const out = process.env.OUT || '.';
const jeu = process.env.JEU || 'chouette';
const browser = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist', '--use-angle=metal'] });
const erreurs = [];
setTimeout(() => { console.log(JSON.stringify({ erreurs: [...erreurs, 'délai global'] })); process.exit(2); }, 170000);
for (const [nom, w, h] of (process.env.SEUL ? [['desktop', 1440, 900]] : [['desktop', 1440, 900], ['mobile', 390, 844]])) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    for (const j of ['chouette', 'des']) localStorage.setItem(`fmm.tutoriel.${j}`, '1');
    localStorage.setItem('fmm.consentement.v2', JSON.stringify({ mesure: false, publicite: false, tiers: false, horodatage: new Date().toISOString(), version: '2026-09-02' }));
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => erreurs.push(`${nom}: ${String(e).slice(0, 200)}`));
  await page.goto(`${base}/jeux/${jeu}?apercu=1`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: /dresser la table|set the table|jouer|commencer/i }).first().click({ timeout: 15000 }).catch((e) => erreurs.push(`${nom}: départ ${e.message.slice(0, 80)}`));
  await page.waitForTimeout(5000);
  if (nom !== 'desktop') await page.evaluate(() => document.querySelector('canvas')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1500);
  try {
    if (nom !== 'desktop') throw new Error('CDP direct');
    await page.screenshot({ path: `${out}/${jeu}-${nom}.png`, timeout: 40000 });
  } catch {
    const cdp = await ctx.newCDPSession(page);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    (await import('node:fs')).writeFileSync(`${out}/${jeu}-${nom}.png`, Buffer.from(data, 'base64'));
  }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify({ erreurs }));
process.exit(0);
