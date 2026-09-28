import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [w,h] of [[1440,900],[390,844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('https://www.festivalmedievaldemontpellier.org/programmation', { waitUntil: 'load' });
  await p.evaluate(() => sessionStorage.setItem('fmm_intro_seen','1'));
  await p.waitForTimeout(6000);
  const pop = p.getByText('Le festival veut vous entendre');
  console.log(w, 'popup', await pop.isVisible().catch(()=>false), 'scrollW', await p.evaluate(()=>document.documentElement.scrollWidth));
}
await b.close();
