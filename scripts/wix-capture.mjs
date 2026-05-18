// One-off capture: full-page screenshots + rendered HTML of every public
// page on the live Wix site at festivalmedievaldemontpellier.org. We
// reuse Krystine's already-installed Playwright + chromium so we don't
// add a heavy devDep to FMM. Output lands in `_wix-clone/`, gitignored.

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/lesalondesinconnus/Documents/websites/Krystine Main/node_modules/playwright');

const OUT = '/Users/lesalondesinconnus/Documents/Websites/FMM 2026/_wix-clone';

const PAGES = [
  ['00-accueil',      'https://www.festivalmedievaldemontpellier.org/'],
  ['01-billetterie',  'https://www.festivalmedievaldemontpellier.org/festival-medieval-de-montpellier'],
  ['02-marche',       'https://www.festivalmedievaldemontpellier.org/marche'],
  ['03-activites',    'https://www.festivalmedievaldemontpellier.org/activités'],
  ['04-nourriture',   'https://www.festivalmedievaldemontpellier.org/nourriture'],
  ['05-jeunesse',     'https://www.festivalmedievaldemontpellier.org/jeunesse'],
  ['06-musique',      'https://www.festivalmedievaldemontpellier.org/musique'],
  ['07-chevaux',      'https://www.festivalmedievaldemontpellier.org/chevaux'],
  ['08-apprendre',    'https://www.festivalmedievaldemontpellier.org/apprendre'],
  ['09-hebergement',  'https://www.festivalmedievaldemontpellier.org/hebergement'],
  ['10-partenaires',  'https://www.festivalmedievaldemontpellier.org/partenaires'],
  ['11-benevole',     'https://www.festivalmedievaldemontpellier.org/benevole'],
  ['12-histoire',     'https://www.festivalmedievaldemontpellier.org/histoire'],
  ['13-mariages',     'https://www.festivalmedievaldemontpellier.org/mariages'],
  ['14-groups',       'https://www.festivalmedievaldemontpellier.org/groups'],
];

await mkdir(path.join(OUT, 'desktop'), { recursive: true });
await mkdir(path.join(OUT, 'mobile'),  { recursive: true });
await mkdir(path.join(OUT, 'html'),    { recursive: true });

const browser = await chromium.launch();

async function captureAt(viewport, dirKey) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'fr-CA' });
  for (const [name, url] of PAGES) {
    const page = await ctx.newPage();
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Wix never reaches "networkidle" (it polls constantly). Wait for
      // the page to be visually settled by triggering scroll → wait,
      // which prompts lazy-image hydration, then give it a beat.
      try { await page.waitForLoadState('load', { timeout: 15000 }); } catch { /* okay */ }
      await page.evaluate(() => new Promise((r) => {
        let y = 0;
        const step = () => {
          y += window.innerHeight;
          window.scrollTo(0, y);
          if (y < document.body.scrollHeight) setTimeout(step, 250);
          else { window.scrollTo(0, 0); setTimeout(r, 800); }
        };
        step();
      }));
      await page.waitForTimeout(1200);
      const status = resp ? resp.status() : 0;
      await page.screenshot({
        path: path.join(OUT, dirKey, `${name}.png`),
        fullPage: true,
        type: 'png',
      });
      if (dirKey === 'desktop') {
        const html = await page.content();
        await writeFile(path.join(OUT, 'html', `${name}.html`), html, 'utf8');
      }
      console.log(`  ✓ [${dirKey}] ${name}  (${status})`);
    } catch (e) {
      console.log(`  ✗ [${dirKey}] ${name}: ${e.message}`);
    }
    await page.close();
  }
  await ctx.close();
}

console.log('→ desktop pass (1280×800)…');
await captureAt({ width: 1280, height: 800 }, 'desktop');

console.log('→ mobile pass (390×844)…');
await captureAt({ width: 390, height: 844 }, 'mobile');

await browser.close();
console.log('\nDone. Screenshots in:', OUT);
