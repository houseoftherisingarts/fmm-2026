import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-lesalondesinconnus/e50085bf-8d16-4293-8d45-058ceef713d9/scratchpad/shots';
const B='http://localhost:5210';
const CSS='.z-\\[120\\]{display:none!important}[role="status"][aria-live="polite"]{display:none!important}';
const b=await chromium.launch();
for (const [name,w,h] of [['mob',390,844],['desk',1440,900],['tablette',820,1180]]) {
  const ctx=await b.newContext({viewport:{width:w,height:h}});
  const p=await ctx.newPage();
  await p.goto(B+'/jeux/clan',{waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:CSS});
  await p.waitForTimeout(2200);
  const ref=p.getByText('Tout refuser',{exact:false}).first();
  if(await ref.count()) await ref.click({timeout:2000}).catch(()=>{});
  await p.waitForTimeout(8200);
  await p.getByText('Ouvrir le registre').first().click();
  await p.waitForTimeout(2500);
  await p.screenshot({path:`${OUT}/v5-groupe-${name}.png`});
  const mg = await p.evaluate(() => {
    const plan=document.querySelector('.grimoire-plan'); const pr=plan.getBoundingClientRect();
    const ch=[...plan.querySelectorAll('.grimoire-choix')];
    const bas=ch.length?Math.round(ch[ch.length-1].getBoundingClientRect().bottom):0;
    const haut=ch.length?Math.round(ch[0].getBoundingClientRect().top):0;
    return { filetH:Math.round(pr.top+pr.height*0.16), filetB:Math.round(pr.top+pr.height*0.729), premier:haut, dernier:bas };
  });
  console.log(name,'compagnies',JSON.stringify(mg));
  await p.locator('.grimoire-choix').first().click();
  await p.waitForTimeout(3200);
  await p.screenshot({path:`${OUT}/v5-q1-${name}.png`});
  const m = await p.evaluate(() => {
    const plan=document.querySelector('.grimoire-plan'); const pr=plan.getBoundingClientRect();
    const zd=[...plan.children].find(e=>e.getAttribute('style')?.includes('page-droite-x'));
    const zr=zd.getBoundingClientRect();
    const tous=[...plan.querySelectorAll('.grimoire-choix')].map(c=>c.getBoundingClientRect());
    const droiteMax=Math.max(...[...plan.querySelectorAll('.grimoire-choix span')].map(e=>e.getBoundingClientRect().right));
    return { filetH:Math.round(pr.top+pr.height*0.16), filetB:Math.round(pr.top+pr.height*0.729),
             filetG:Math.round(pr.left+pr.width*0.482), filetD:Math.round(pr.left+pr.width*0.823),
             zoneHaut:Math.round(zr.top), zoneBas:Math.round(zr.bottom),
             texteBas:Math.round(Math.max(...tous.map(r=>r.bottom))), texteDroite:Math.round(droiteMax) };
  });
  console.log(name,'question',JSON.stringify(m));
  await ctx.close();
}
await b.close();
