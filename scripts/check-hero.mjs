// Snapshot the new hero at 4 scroll positions to confirm what's rendering.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/lesalondesinconnus/Documents/websites/Krystine Main/node_modules/playwright');

const OUT = '/Users/lesalondesinconnus/Documents/Websites/FMM 2026/_wix-clone/hero-check';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`PAGE ERROR: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`); });

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(2500);

const totalH = await page.evaluate(() => document.body.scrollHeight);
console.log('page height:', totalH);

// 320vh sticky container at top → snapshot at 0, 25%, 50%, 75% of that section
const SNAPS = [0, 0.85, 1.70, 2.55].map((m) => Math.round(800 * m));
for (let i = 0; i < SNAPS.length; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), SNAPS[i]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `hero-${i}-y${SNAPS[i]}.png`), type: 'png' });
  console.log(`✓ snap ${i} at y=${SNAPS[i]}`);
}

if (errors.length) {
  console.log('\n— Runtime errors —');
  errors.forEach((e) => console.log('  ' + e));
} else {
  console.log('\nNo runtime errors.');
}

await browser.close();
