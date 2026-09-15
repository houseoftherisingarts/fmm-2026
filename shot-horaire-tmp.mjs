import { chromium } from 'playwright';
const url = 'https://www.festivalmedievaldemontpellier.org/programmation';
const b = await chromium.launch();
for (const [name, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForTimeout(9000);
  await p.evaluate(() => document.getElementById('horaire')?.scrollIntoView({ block: 'start' }));
  await p.waitForTimeout(2500);
  const txt = await p.evaluate(() => document.getElementById('horaire')?.innerText?.slice(0, 2600) ?? 'PAS DE SECTION');
  console.log('=====', name, '=====');
  console.log(txt);
  await p.screenshot({ path: `/tmp/horaire-${name}.png` });
  await p.close();
}
await b.close();
