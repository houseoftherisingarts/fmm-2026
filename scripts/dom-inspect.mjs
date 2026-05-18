// Dump bounding boxes + computed styles of the showcase layout layers
// at a couple of scroll positions so we can see what's spilling.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/lesalondesinconnus/Documents/websites/Krystine Main/node_modules/playwright');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForTimeout(2500);

const dump = async (label, scrollY) => {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), scrollY);
  await page.waitForTimeout(500);
  const result = await page.evaluate(() => {
    const docH = document.body.scrollHeight;
    const vh = window.innerHeight;
    const get = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top: Math.round(r.top), bottom: Math.round(r.bottom),
        left: Math.round(r.left), right: Math.round(r.right),
        w: Math.round(r.width), h: Math.round(r.height),
        position: cs.position,
        display: cs.display,
        height: cs.height,
        overflow: `${cs.overflowX}/${cs.overflowY}`,
      };
    };
    return {
      docH, vh,
      scrollY: window.scrollY,
      hero:           get('main'),
      showcaseRoot:   get('#showcase'),
      fxFixedSec:     get('.fx-fixed-section'),
      fxFixed:        get('.fx-fixed'),
      fxGrid:         get('.fx-grid'),
      fxContent:      get('.fx-content'),
      fxCenter:       get('.fx-center'),
      fxFeaturedActive: get('.fx-featured.active'),
      fxFeaturedTitle:  get('.fx-featured.active .fx-featured-title'),
      fxFooter:       get('.fx-footer'),
      fxProgress:     get('.fx-progress'),
      fxBgsActive:    get('.fx-bg img'),
    };
  });
  console.log(`\n— ${label} (scrollY=${scrollY}, docH=${result.docH}, vh=${result.vh}) —`);
  for (const [k, v] of Object.entries(result)) {
    if (k === 'docH' || k === 'vh' || k === 'scrollY') continue;
    if (!v) { console.log(`  ${k.padEnd(18)} : (not found)`); continue; }
    const oob = v.bottom > result.vh || v.top < 0 ? '  ⚠ OOB' : '';
    console.log(`  ${k.padEnd(18)} : top=${String(v.top).padStart(5)} bot=${String(v.bottom).padStart(6)} h=${String(v.h).padStart(5)} pos=${v.position}${oob}`);
  }
};

await dump('At top',         0);
await dump('Welcome bottom', 800);
await dump('Showcase mid',   2400);
await dump('Showcase deep',  6400);

await browser.close();
