// usage: node shoot.js <url> <outPrefix> <WxH> <p1,p2,...> [reduced]
const { chromium } = require('playwright');
(async () => {
  const [url, out, vp, stops, reduced] = process.argv.slice(2);
  const [W, H] = vp.split('x').map(Number);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: W < 700, isMobile: W < 700 });
  const pg = await ctx.newPage();
  const logs = [];
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => logs.push('pageerror: ' + e.message));
  pg.on('requestfailed', r => logs.push('reqfail: ' + r.url()));
  await pg.goto(url, { waitUntil: 'load' });
  await pg.waitForTimeout(2200);
  const mode = await pg.evaluate(() => document.getElementById('lr') && document.getElementById('lr').getAttribute('data-mode'));
  const gl = await pg.evaluate(() => { const s = document.getElementById('stage'); return s ? s.getAttribute('data-gl') : 'n/a'; });
  console.log('mode=' + mode + ' gl=' + gl);
  for (const p of stops.split(',')) {
    await pg.evaluate((p) => { const t = document.getElementById('track'); if (!t) return; const max = t.offsetHeight - innerHeight; scrollTo(0, t.offsetTop + max * p); }, parseFloat(p));
    await pg.waitForTimeout(1500);
    await pg.screenshot({ path: `${out}-${String(Math.round(p * 100)).padStart(3, '0')}.png` });
  }
  if (reduced) await pg.screenshot({ path: `${out}-full.png`, fullPage: true });
  console.log(logs.length ? logs.join('\n') : 'no console errors');
  await b.close();
})();
