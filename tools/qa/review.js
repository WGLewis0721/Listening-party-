const { chromium } = require('playwright');
(async () => {
  const [url, out, vp] = process.argv.slice(2); const [W, H] = vp.split('x').map(Number);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport:{width:W,height:H}, hasTouch:W<700, isMobile:W<700 });
  const pg = await ctx.newPage(); const logs=[];
  pg.on('console', m => { if (['error','warning'].includes(m.type())) logs.push(m.type()+': '+m.text()); });
  pg.on('pageerror', e => logs.push('pageerror: '+e.message));
  await pg.goto(url,{waitUntil:'load'}); await pg.waitForTimeout(2600);
  await pg.screenshot({path:out+'-0-start.png'});
  const prog = () => pg.evaluate(()=>+LRReview.progress().toFixed(3));
  const themeOf = () => pg.evaluate(()=>document.documentElement.getAttribute('data-theme'));
  const ALL=['.name','.b-sound','.b-set','.b-room','.b-close','.ticket-wrap'];
  const layers = () => pg.evaluate(ALL=>ALL.filter(s=>{const e=document.querySelector(s),c=getComputedStyle(e);return c.visibility!=='hidden'&&+c.opacity>.05}),ALL);
  // go to the ticket beat, then cycle all five with the button and check progress + layers survive each swap
  await pg.evaluate(()=>{const t=document.getElementById('track');scrollTo(0,t.offsetTop+(t.offsetHeight-innerHeight)*(innerWidth<900?0.66:0.7))}); await pg.waitForTimeout(1800);
  const p0 = await prog(); console.log('start progress', p0, 'theme', await themeOf(), 'layers', JSON.stringify(await layers()));
  let bad=0;
  for (let n=1;n<=5;n++) {
    await pg.click('#sw-next'); await pg.waitForTimeout(1500);
    const p = await prog(), th = await themeOf(), ly = await layers();
    const okp = Math.abs(p-p0) < 0.04;
    const want = W<900 ? ['.b-room'] : ['.b-room','.ticket-wrap'];
    const okl = JSON.stringify(ly)===JSON.stringify(want);
    if(!okp||!okl) bad++;
    console.log(`swap ${n}: theme=${th} progress=${p} ${okp?'kept':'LOST'} layers=${okl?'ok':JSON.stringify(ly)}`);
    await pg.screenshot({path:`${out}-s${n}.png`});
  }
  // keyboard
  await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(900); const a = await themeOf();
  await pg.keyboard.press('3'); await pg.waitForTimeout(900); const c = await themeOf();
  console.log('keyboard: ArrowLeft ->', a, '| key 3 ->', c, '| url', await pg.evaluate(()=>location.search));
  // churn: many swaps to look for GL-context warnings / leaks
  for (let i=0;i<20;i++){ await pg.click('#sw-next'); await pg.waitForTimeout(260); }
  await pg.waitForTimeout(1200);
  const canv = await pg.evaluate(()=>document.querySelectorAll('canvas').length);
  console.log('after 20 rapid swaps: canvases in DOM =', canv, '| scroll triggers alive =', await pg.evaluate(()=>ScrollTrigger.getAll().length), '| swap failures:', bad);
  const ov = await pg.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  console.log('overflowX', ov, logs.length?'\n'+[...new Set(logs)].slice(0,6).join('\n'):'| no console errors');
  await b.close();
})();
