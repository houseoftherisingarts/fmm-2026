import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/lesalondesinconnus/Documents/websites/Krystine Main/node_modules/playwright');

const OUT = '/Users/lesalondesinconnus/Documents/Websites/FMM 2026/_wix-clone/welcome-check';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGE: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE: ${m.text().slice(0, 200)}`); });

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
// Give 3D scene time to load + initial animations to settle.
await page.waitForTimeout(4000);
await page.screenshot({ path: path.join(OUT, 'desktop-1280.png'), type: 'png' });

// Mouse-parallax test — move mouse to corner so the camera tilts.
await page.mouse.move(200, 200);
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(OUT, 'desktop-1280-parallax.png'), type: 'png' });

await ctx.close();

// Mobile snapshot
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const mpage = await mctx.newPage();
await mpage.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
await mpage.waitForTimeout(4000);
await mpage.screenshot({ path: path.join(OUT, 'mobile-390.png'), type: 'png' });
await mctx.close();
await browser.close();

if (errors.length) console.log('— ERRORS —\n' + errors.join('\n'));
else console.log('No console errors.');
