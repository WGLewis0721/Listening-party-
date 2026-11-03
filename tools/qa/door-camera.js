// The door's camera, tested with a FAKE phone camera that films a real guest's QR code.
//   node tools/qa/door-camera.js [baseUrl]      needs: ffmpeg, playwright (Chromium)
// 1  buy a seat, jump to doors, draw that guest's live QR as a picture, turn the picture into a fake camera feed
// 2  open the door page in a browser whose "camera" is that feed, tap Scan, expect GREEN with the guest's name (decoded by jsQR)
// 3  the guest keeps holding the phone up: the door must NOT flash a second answer
// 4  with no camera at all: the page says so in plain words and the name list still works
// Chromium on Linux has no BarcodeDetector, so this exercises the jsQR path (the one older iPhones use). Phones with BarcodeDetector take the other branch.
const { chromium } = require('playwright'); const { execFileSync } = require('child_process'); const fs = require('fs'), os = require('os'), path = require('path');
const BASE = process.argv[2] || 'http://localhost:8800/site/'; let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lr-cam-')), png = path.join(dir, 'qr.png'), y4m = path.join(dir, 'qr.y4m');
  // 1 · a paid guest at doors, and a picture of their live code
  const b1 = await chromium.launch({ args: ARGS }); const ctx1 = await b1.newContext({ viewport: { width: 390, height: 844 } }); const pg = await ctx1.newPage();
  await pg.goto(BASE + 'pay.html', { waitUntil: 'load' }); await pg.waitForTimeout(1500);
  await pg.fill('#f-name', 'Camille Okoye'); await pg.fill('#f-email', 'camille@example.com'); await pg.click('#go'); await pg.waitForSelector('#sq:not([hidden])'); await pg.click('#sq-ok'); await pg.waitForSelector('#p-ticket:not([hidden])', { timeout: 12000 });
  await pg.click('#dc-btn'); await pg.click('[data-j=doors]'); await pg.waitForSelector('[data-k=qr] svg', { timeout: 6000 });
  const payload = await pg.evaluate(() => LR.api.demo.latestPayload(LR_EDITION.slug));
  await pg.evaluate((p) => { const d = document.createElement('div'); d.id = '__qr'; d.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#fff;padding:40px;width:480px;height:480px'; d.innerHTML = LR.qrSVG(p); d.firstElementChild.style.cssText = 'width:100%;height:100%'; document.body.appendChild(d); }, payload);
  await pg.locator('#__qr').screenshot({ path: png });
  const state = await ctx1.storageState(); await b1.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', png, '-t', '3', '-r', '10', '-vf', 'scale=480:480,pad=640:480:80:0:white', '-pix_fmt', 'yuv420p', y4m]);
  ok(fs.statSync(y4m).size > 1e5, 'built a fake camera feed from the guest\'s live code');

  // 2 · the door phone, whose camera sees that code
  const b2 = await chromium.launch({ args: [...ARGS, '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=' + y4m] });
  const ctx2 = await b2.newContext({ viewport: { width: 390, height: 844 }, storageState: state, permissions: ['camera'] }); const dp = await ctx2.newPage(); const logs = [];
  dp.on('pageerror', e => logs.push(e.message)); dp.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
  await dp.goto(BASE + 'door.html', { waitUntil: 'load' }); await dp.waitForTimeout(1200);
  ok(!(await dp.evaluate(() => 'BarcodeDetector' in window)) || true, 'scanner path: ' + (await dp.evaluate(() => 'BarcodeDetector' in window ? 'BarcodeDetector' : 'jsQR')));
  await dp.click('#scan'); await dp.waitForSelector('#cam:not([hidden])', { timeout: 5000 }); ok(true, 'tapping Scan opens the camera full screen');
  await dp.waitForSelector('#ov.ok', { timeout: 15000 }); ok(/Camille Okoye/.test(await dp.textContent('#ov-h')), 'the camera reads the code and the screen turns GREEN with the guest\'s name: ' + (await dp.textContent('#ov-h')));
  await dp.screenshot({ path: path.join(dir, 'green.png') });
  // 3 · the guest still holds the phone up: no second flash for a while
  await dp.waitForSelector('#ov', { state: 'hidden', timeout: 6000 }); ok(true, 'the green screen clears itself, so the volunteer never has to tap');
  let again = false; try { await dp.waitForSelector('#ov:not([hidden])', { timeout: 5000 }); again = true; } catch (e) { }
  ok(!again, 'the same code held up for 5 more seconds does not trigger a confusing second answer');
  ok(await dp.evaluate(() => !document.querySelector('#cam').hidden), 'the camera stays open, ready for the next guest');
  await dp.click('#done'); ok(await dp.evaluate(() => document.querySelector('#cam').hidden && !document.querySelector('#vid').srcObject), 'Done closes the camera and releases it');
  ok(/In ·/.test(await dp.textContent('#list')), 'the list shows Camille as In');
  ok(logs.length === 0, 'no console errors' + (logs.length ? ': ' + logs[0] : '')); await b2.close();

  // 4 · no camera at all
  const b3 = await chromium.launch({ args: ARGS }); const ctx3 = await b3.newContext({ viewport: { width: 390, height: 844 }, storageState: state }); const np = await ctx3.newPage();
  await np.goto(BASE + 'door.html', { waitUntil: 'load' }); await np.waitForTimeout(1200); await np.click('#scan'); await np.waitForSelector('#ov.bad', { timeout: 8000 });
  ok(/camera|name/i.test(await np.textContent('#ov-p')), 'with no camera it says so in plain words: "' + (await np.textContent('#ov-k')) + ' · ' + (await np.textContent('#ov-p')) + '"');
  await np.click('#ov-b button'); ok(await np.evaluate(() => document.querySelector('#ov').hidden && document.querySelectorAll('.go,.in').length > 0), 'the name list still works');
  await b3.close();
  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
