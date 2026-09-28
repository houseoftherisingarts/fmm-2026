import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [n,w,h] of [['d',1440,900],['m',390,844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.addInitScript(() => { try { localStorage.setItem('fmm.annonce.sondage-retour-2026','1'); sessionStorage.setItem('fmm_intro_seen','1'); } catch {} });
  await p.goto('http://localhost:4179/page-qui-nexiste-pas', { waitUntil: 'load' });
  await p.waitForTimeout(3500);
  await p.getByText('Sur le sentier perdu').scrollIntoViewIfNeeded();
  console.log(n, 'scrollW', await p.evaluate(()=>document.documentElement.scrollWidth));
  await p.screenshot({ path: '/private/tmp/claude-501/-Users-lesalondesinconnus/2b3aaf8e-ace2-4c63-9291-c148cd3ce38b/scratchpad/'+n+'-404.png' });
}
await b.close();
