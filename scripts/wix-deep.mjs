// Deep capture of the Wix BILLETTERIE page (the real homepage):
//   1. Scroll-position snapshots every ~720px so I can read parallax /
//      reveal progressions like a flipbook.
//   2. Computed-CSS dump for the first ~80 page-content elements
//      (skipping nav/footer chrome).
//   3. Asset URL list (every img src, srcset, background-image, video).
//   4. Keyframe rules from same-origin stylesheets.

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/lesalondesinconnus/Documents/websites/Krystine Main/node_modules/playwright');

const URL = 'https://www.festivalmedievaldemontpellier.org/festival-medieval-de-montpellier';
const OUT = '/Users/lesalondesinconnus/Documents/Websites/FMM 2026/_wix-clone/deep';

await mkdir(path.join(OUT, 'scroll'), { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'fr-CA' });
const page = await ctx.newPage();

console.log('→ navigating…');
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
try { await page.waitForLoadState('load', { timeout: 15000 }); } catch {}
await page.waitForTimeout(2000);

const totalH = await page.evaluate(() => document.body.scrollHeight);
console.log(`→ page height: ${totalH}px`);
const STEP = 720;
for (let y = 0, i = 0; y < totalH; y += STEP, i++) {
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y);
  await page.waitForTimeout(700);
  const file = path.join(OUT, 'scroll', `s${String(i).padStart(2, '0')}-y${y}.png`);
  await page.screenshot({ path: file, type: 'png' });
  console.log(`  ✓ snap ${i} at y=${y}`);
}

console.log('→ computed-CSS dump…');
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

const styleDump = await page.evaluate(() => {
  const nodes = Array.from(document.querySelectorAll(
    'main *, section, [class*="hero"], img, h1, h2, h3, button, a[href]'
  ))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 40 && r.height > 20 && r.top + window.scrollY < 6000;
    })
    .slice(0, 80);

  return nodes.map((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      className: typeof el.className === 'string' ? el.className.slice(0, 120) : undefined,
      box: {
        x: Math.round(r.left), y: Math.round(r.top + window.scrollY),
        w: Math.round(r.width), h: Math.round(r.height),
      },
      position: cs.position,
      zIndex: cs.zIndex,
      transform: cs.transform === 'none' ? undefined : cs.transform,
      transition: cs.transitionProperty === 'all' && cs.transitionDuration === '0s'
        ? undefined : `${cs.transitionProperty} ${cs.transitionDuration} ${cs.transitionTimingFunction}`,
      animation: cs.animationName === 'none' ? undefined
        : `${cs.animationName} ${cs.animationDuration} ${cs.animationTimingFunction} ${cs.animationIterationCount}`,
      filter: cs.filter === 'none' ? undefined : cs.filter,
      backdropFilter: cs.backdropFilter && cs.backdropFilter !== 'none' ? cs.backdropFilter : undefined,
      mixBlendMode: cs.mixBlendMode === 'normal' ? undefined : cs.mixBlendMode,
      borderRadius: cs.borderRadius,
      backgroundImage: cs.backgroundImage === 'none' ? undefined : cs.backgroundImage.slice(0, 200),
      boxShadow: cs.boxShadow === 'none' ? undefined : cs.boxShadow.slice(0, 200),
      opacity: cs.opacity === '1' ? undefined : cs.opacity,
    };
  });
});

await writeFile(path.join(OUT, 'computed-styles.json'), JSON.stringify(styleDump, null, 2), 'utf8');
console.log(`  ✓ ${styleDump.length} elements dumped → computed-styles.json`);

console.log('→ asset URLs…');
const assets = await page.evaluate(() => {
  const out = new Set();
  document.querySelectorAll('img').forEach((i) => i.src && out.add(i.src));
  document.querySelectorAll('source').forEach((s) => s.srcset && s.srcset.split(',').forEach((u) => out.add(u.trim().split(' ')[0])));
  document.querySelectorAll('*').forEach((el) => {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') {
      const m = bg.matchAll(/url\("?([^")]+)"?\)/g);
      for (const x of m) out.add(x[1]);
    }
  });
  document.querySelectorAll('video, source[type^="video"]').forEach((v) => {
    if (v.src) out.add(v.src);
    if (v.poster) out.add(v.poster);
  });
  return Array.from(out);
});
await writeFile(path.join(OUT, 'assets.txt'), assets.join('\n'), 'utf8');
console.log(`  ✓ ${assets.length} unique asset URLs → assets.txt`);

console.log('→ keyframe rules…');
const keyframes = await page.evaluate(() => {
  const out = [];
  for (const ss of Array.from(document.styleSheets)) {
    try {
      for (const r of Array.from(ss.cssRules || [])) {
        if (r.constructor.name === 'CSSKeyframesRule') {
          out.push({ name: r.name, css: r.cssText.slice(0, 800) });
        }
      }
    } catch {}
  }
  return out;
});
await writeFile(path.join(OUT, 'keyframes.json'), JSON.stringify(keyframes, null, 2), 'utf8');
console.log(`  ✓ ${keyframes.length} keyframes → keyframes.json`);

await browser.close();
console.log(`\nDone. Output in ${OUT}`);
