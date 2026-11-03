const { chromium } = require('playwright');
(async () => {
  const [url, out] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport:{width:1440,height:900} })).newPage(); const logs=[];
  pg.on('console', m => { if (['error','warning'].includes(m.type())) logs.push(m.type()+': '+m.text()); });
  pg.on('pageerror', e => logs.push('pageerror: '+e.message));
  await pg.goto(url,{waitUntil:'load'}); await pg.waitForTimeout(3500);
  await pg.evaluate(()=>{ window.__loads=0; document.getElementById('frame').addEventListener('load',()=>window.__loads++); document.getElementById('explore').scrollIntoView(); });
  const cur = () => pg.evaluate(()=>document.getElementById('frame').contentWindow.LRReview.current());
  const prog = () => pg.evaluate(()=>+document.getElementById('frame').contentWindow.LRReview.progress().toFixed(3));
  const sel = () => pg.evaluate(()=>[...document.querySelectorAll('.tab')].findIndex(t=>t.getAttribute('aria-selected')==='true'));
  // 1. scroll preview to the ticket beat, then change skin from every control
  await pg.evaluate(()=>{const w=document.getElementById('frame').contentWindow,t=w.document.getElementById('track');w.scrollTo(0,(t.offsetHeight-w.innerHeight)*0.7)}); await pg.waitForTimeout(1800);
  const p0 = await prog(); console.log('preview progress', p0, '| skin', await cur());
  await pg.click('#tab-3'); await pg.waitForTimeout(1500);
  console.log('tab 4 click  -> skin', await cur(), '| progress', await prog(), '| iframe reloads:', await pg.evaluate(()=>window.__loads));
  await pg.click('#sk-next'); await pg.waitForTimeout(1500);
  console.log('Next skin    -> skin', await cur(), '| tab selected', await sel(), '| progress', await prog(), '| reloads:', await pg.evaluate(()=>window.__loads));
  await pg.click('#sk-prev'); await pg.click('#sk-prev'); await pg.waitForTimeout(1500);
  console.log('Prev x2      -> skin', await cur(), '| tab selected', await sel());
  // 2. use the switcher INSIDE the preview; the picker's tabs must follow
  await pg.frameLocator('#frame').locator('#sw-next').click(); await pg.waitForTimeout(1500);
  console.log('in-preview next -> skin', await cur(), '| picker tab selected', await sel(), '| caption:', await pg.textContent('#c-name'));
  await pg.screenshot({path:out+'-1-explore.png'});
  // 3. device toggle keeps the position
  await pg.click('#d-phone'); await pg.waitForTimeout(2600);
  console.log('phone toggle -> progress', await prog(), '| skin', await cur(), '| reloads:', await pg.evaluate(()=>window.__loads));
  await pg.screenshot({path:out+'-2-phone.png'});
  await pg.click('#sk-next'); await pg.waitForTimeout(1500); console.log('phone next -> skin', await cur(), 'progress', await prog());
  await pg.click('#d-desk'); await pg.waitForTimeout(2600); console.log('back to laptop -> progress', await prog());
  // 4. open full screen link points at the review page with the right skin
  console.log('full screen href:', await pg.getAttribute('#open','href'));
  // 5. pay link inside preview returns to the review page
  console.log(logs.length?[...new Set(logs)].join('\n'):'no console errors');
  await b.close();
})();
