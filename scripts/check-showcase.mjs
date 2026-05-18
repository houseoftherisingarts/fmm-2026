import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/lesalondesinconnus/Documents/websites/Krystine Main/node_modules/playwright');

const OUT = '/Users/lesalondesinconnus/Documents/Websites/FMM 2026/_wix-clone/showcase-check';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGE: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE: ${m.text().slice(0, 200)}`); });

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForTimeout(3000);

// Smooth scroll so ScrollTrigger.onUpdate fires continuously and the
// one-step section transitions actually have time to play out (instant
// scrolls were skipping intermediate sections).
const SNAPS = [0, 800, 1600, 2400, 3200, 4000];
for (let i = 0; i < SNAPS.length; i++) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), SNAPS[i]);
  await page.waitForTimeout(2200); // smooth scroll + animation settle
  await page.screenshot({ path: path.join(OUT, `s${i}-y${SNAPS[i]}.png`), type: 'png' });
  console.log(`✓ snap ${i} at y=${SNAPS[i]}`);
}

if (errors.length) console.log('— ERRORS —\n' + errors.join('\n'));
else console.log('No errors.');
await browser.close();
