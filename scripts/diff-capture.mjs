// Side-by-side capture: our localhost home + the live Wix billetterie
// at the same viewport. Drops PNGs into _wix-clone/diff/ for review.

import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/lesalondesinconnus/Documents/websites/Krystine Main/node_modules/playwright');

const OUT = '/Users/lesalondesinconnus/Documents/Websites/FMM 2026/_wix-clone/diff';
await mkdir(OUT, { recursive: true });

const targets = [
  ['ours-home',     'http://localhost:3000/',                                                                'domcontentloaded'],
  ['wix-home',      'https://www.festivalmedievaldemontpellier.org/festival-medieval-de-montpellier',        'domcontentloaded'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'fr-CA' });

for (const [name, url, wait] of targets) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: wait, timeout: 30000 });
    try { await page.waitForLoadState('load', { timeout: 12000 }); } catch {}
    // Scroll to trigger lazy images / framer-motion reveals.
    await page.evaluate(() => new Promise((r) => {
      let y = 0; const step = () => {
        y += window.innerHeight;
        window.scrollTo(0, y);
        if (y < document.body.scrollHeight) setTimeout(step, 200);
        else { window.scrollTo(0, 0); setTimeout(r, 1000); }
      }; step();
    }));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `${name}-full.png`), fullPage: true });
    console.log(`✓ ${name}`);
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
  }
  await page.close();
}

await browser.close();
console.log(`\nDone. Output in ${OUT}`);
