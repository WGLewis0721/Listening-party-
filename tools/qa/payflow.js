// usage: node payflow.js <url> <outPrefix> <WxH>
const { chromium } = require('playwright');
(async () => {
  const [url, out, vp] = process.argv.slice(2); const [W, H] = vp.split('x').map(Number);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, acceptDownloads: true, hasTouch: W < 700, isMobile: W < 700 });
  const pg = await ctx.newPage(); const logs = [];
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => logs.push('pageerror: ' + e.message));
  await pg.goto(url, { waitUntil: 'load' }); await pg.waitForTimeout(1500);
  await pg.screenshot({ path: out + '-1-empty.png' });
  // validation path
  await pg.click('#go'); await pg.waitForTimeout(300);
  console.log('errors shown:', await pg.textContent('#e-name'), '|', await pg.textContent('#e-email'));
  await pg.fill('#f-name', 'Jordan Ellis'); await pg.fill('#f-email', 'jordan@example.com');
  await pg.click('#inc'); await pg.waitForTimeout(300);
  await pg.screenshot({ path: out + '-2-filled.png' });
  await pg.click('#go'); await pg.waitForTimeout(700);
  await pg.screenshot({ path: out + '-3-unlocking.png' });
  await pg.waitForTimeout(2600);
  await pg.screenshot({ path: out + '-4-confirmed.png' });
  console.log('state:', await pg.getAttribute('.tk', 'data-state'), '| addr:', await pg.textContent('.tk-addr'), '| total:', await pg.textContent('#s-tot'));
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 15000 }).catch(e => null), pg.click('#save')]);
  if (dl) { await dl.saveAs(out + '-card.png'); console.log('png download:', dl.suggestedFilename()); } else console.log('NO PNG DOWNLOAD');
  const [dl2] = await Promise.all([pg.waitForEvent('download', { timeout: 8000 }).catch(e => null), pg.click('#ics')]);
  if (dl2) { await dl2.saveAs(out + '.ics'); console.log('ics download:', dl2.suggestedFilename()); } else console.log('NO ICS DOWNLOAD');
  await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(1200);
  console.log('after reload state:', await pg.getAttribute('.tk', 'data-state'));
  console.log(logs.length ? logs.join('\n') : 'no console errors');
  await b.close();
})();
