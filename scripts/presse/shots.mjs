// Captures de contrôle de /presse et /en/press (desktop + mobile),
// plus la visionneuse ouverte et une tuile passée en version QR.
//   npx vite --port 5221 --strictPort
//   node scripts/presse/shots.mjs <dossier-de-sortie>
// Le défilement passe par la molette : Lenis pilote le scroll, un
// scrollIntoView ne bouge rien.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = process.argv[2] || '/tmp/fmm-presse-shots';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5221';
const VIEWS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const ROUTES = [
  { name: 'presse', url: `${BASE}/presse` },
  { name: 'press-en', url: `${BASE}/en/press` },
];

const descendre = async (page, tours = 26) => {
  for (let i = 0; i < tours; i += 1) {
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(140);
  }
  await page.waitForTimeout(900);
  await page.evaluate(() =>
    Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null)))),
  );
};

const browser = await chromium.launch();
for (const v of VIEWS) {
  for (const r of ROUTES) {
    const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
    const errs = [];
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(r.url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('img[src^="/presse/thumbs/"]', { timeout: 15000 });
    await descendre(page);
    const manquantes = await page.evaluate(() =>
      [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
    );
    await page.screenshot({ path: path.join(OUT, `${r.name}-${v.name}.png`), fullPage: true, animations: 'disabled', timeout: 90000 });
    console.log(`${r.name}-${v.name} · images manquantes: ${manquantes.length} · erreurs console: ${errs.length}`);
    if (manquantes.length) console.log('   ', manquantes.slice(0, 5).join('\n    '));
    if (errs.length) console.log('   ', errs.slice(0, 5).join('\n    '));
    await page.close();
  }
}

// ── La visionneuse et la bascule QR, en desktop ────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/presse`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('img[src^="/presse/thumbs/"]', { timeout: 15000 });
  await descendre(page, 6);

  // Un clic sur la troisième image ouvre la visionneuse.
  await page.locator('button[aria-label^="Agrandir"]').nth(2).click();
  await page.waitForSelector('[role="dialog"] img', { timeout: 10000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'loupe-desktop.png'), animations: 'disabled' });

  // La flèche droite avance d'une image, Échap referme.
  await page.locator('button[aria-label="Image suivante"]').click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, 'loupe-suivante.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  const fermee = (await page.locator('[aria-label="Image en plein écran"]').count()) === 0;

  // La bascule « Version QR » de la première carte.
  const bascule = page.locator('button[title]:has-text("Version QR")').first();
  await bascule.scrollIntoViewIfNeeded();
  await bascule.click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, 'version-qr.png'), animations: 'disabled' });
  const srcQR = await page.locator('img[src*="-qr.webp"]').first().getAttribute('src');
  console.log(`loupe fermée par Échap: ${fermee} · vignette QR: ${srcQR} · erreurs: ${errs.length}`);
  if (errs.length) console.log('   ', errs.slice(0, 5).join('\n    '));
  await page.close();
}

await browser.close();
