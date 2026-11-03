// End-to-end test of the whole guest journey and the door, against the simulator.
//   node tools/qa/secure-flow.js [baseUrl] [shotsPrefix]        e.g. http://localhost:8800/site/   VP=390x844 for a phone, SKIP_DOOR=1 for concept skins
// Checks: one click from the form to payment, a locked card until paid, the address never in the page before it is released, one tap shows it,
// the watermark, the limit, the QR only at the door (and at the top of the card), exports without the address, the door's colours, check-in by name.
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8800/site/', OUT = process.argv[3] || '/tmp/secure';
const ADDR = /Museum Drive|Fine Arts/;
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const [VW, VH] = (process.env.VP || '1440x900').split('x').map(Number); const phone = VW < 700;
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, acceptDownloads: true });
  const pg = await ctx.newPage(); const logs = [];
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => logs.push('pageerror: ' + e.message));
  const dom = () => pg.evaluate(() => document.documentElement.outerHTML);
  const away = async () => { await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await pg.waitForTimeout(600); await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); }); };
  const inView = async (sel) => pg.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width > 0; }, sel);

  await pg.goto(BASE + 'pay.html', { waitUntil: 'load' }); await pg.waitForTimeout(1800);
  ok(!ADDR.test(await dom()), 'address is not in the page before anything happens');
  ok(!ADDR.test(await pg.evaluate(() => JSON.stringify(window.LR_EDITION))), 'address is not in the public edition config');
  if (phone) ok(await inView('#go'), 'on a phone (with the browser bars showing) the Pay button is on the first screen, no scrolling');
  // validation speaks plainly
  await pg.click('#go'); await pg.waitForTimeout(300);
  ok(/type your name/i.test(await pg.textContent('#e-name')), 'an empty form says what to do: "' + (await pg.textContent('#e-name')) + '"');
  // 1 · one click from a filled form to the payment page
  await pg.fill('#f-name', 'Jordan Ellis'); await pg.fill('#f-email', 'jordan@example.com');
  ok(/^Pay \$/.test(await pg.textContent('#go')), 'the button says what it costs: "' + (await pg.textContent('#go')).trim() + '"');
  await pg.click('#go'); await pg.waitForSelector('#sq:not([hidden])', { timeout: 8000 });
  ok(true, 'one click on Pay goes straight to the payment page (no separate "hold" step)');
  ok(!ADDR.test(await dom()), 'address is not in the page while paying');
  await pg.screenshot({ path: OUT + '-1-square.png' });
  // 2 · a declined card keeps the seats saved
  await pg.click('#sq-no'); await pg.waitForSelector('#p-pay:not([hidden])'); ok(!(await pg.$eval('#declined', e => e.hidden)), 'a declined card shows a plain message and keeps the seats');
  ok(/^(29|30):\d\d$/.test(await pg.textContent('#holdleft')), 'seats stay saved with a countdown: ' + await pg.textContent('#holdleft'));
  ok(await pg.getAttribute('.tk', 'data-state') === 'locked', 'the card stays LOCKED until the payment is confirmed');
  ok(!ADDR.test(await dom()), 'address is not in the page while only saved');
  await pg.screenshot({ path: OUT + '-2-saved.png' });
  // 3 · pay for real (simulated): the card unlocks only after the webhook
  await pg.click('#pay'); await pg.waitForSelector('#sq:not([hidden])'); await pg.click('#sq-ok'); await pg.waitForSelector('#p-wait:not([hidden])', { timeout: 5000 });
  ok(await pg.getAttribute('.tk', 'data-state') === 'pending', 'the card waits (pending) until the payment is confirmed, even after the redirect');
  await pg.waitForSelector('#p-ticket:not([hidden])', { timeout: 12000 });
  ok(await pg.getAttribute('.tk', 'data-state') === 'confirmed', 'the card is CONFIRMED after the webhook');
  ok(/Blount Cultural Park/.test(await pg.textContent('[data-k=area]')), 'the area is shown: ' + await pg.textContent('[data-k=area]'));
  ok(/will appear on this card/.test(await pg.textContent('#next')), 'one plain sentence says what happens next: "' + (await pg.textContent('#next')).trim() + '"');
  ok(await pg.evaluate(() => !document.querySelector('[data-k=qr] svg')), 'no entry code is shown before doors (nothing to screenshot early)');
  ok(!ADDR.test(await dom()), 'address is still not in the page after payment (before it is released)');
  if (phone) { await pg.evaluate(() => scrollTo(0, 0)); ok(await inView('[data-k=lockLabel]'), 'on a phone the card, with PAID and when the address shows, is on the first screen after paying'); }
  await pg.screenshot({ path: OUT + '-3-paid.png' });
  // 4 · the server, not the UI, refuses early or forged reveals
  const early = await pg.evaluate(async () => { const o = JSON.parse(localStorage.getItem('lr:pay:' + LR_EDITION.slug)); return LR.api.reveal(o.rid, o.tok); });
  ok(early.ok === false && early.reason === 'too_early', 'server refuses a reveal before the release time (' + early.reason + ') even if the UI is bypassed');
  const bad = await pg.evaluate(async () => { const o = JSON.parse(localStorage.getItem('lr:pay:' + LR_EDITION.slug)); try { await LR.api.reveal(o.rid, 'wrong-token'); return 'allowed'; } catch (e) { return e.code; } });
  ok(bad === 'forbidden', 'server refuses a wrong token (' + bad + ')');
  // 5 · release time: one tap shows the address
  await pg.click('#dc-btn'); await pg.click('[data-j=unlock]'); await pg.waitForSelector('#rv', { timeout: 6000 }); await pg.click('#dc-btn'); await pg.waitForTimeout(400);
  ok(/Show the address/.test(await pg.textContent('#rv')), 'the button says what it does: "' + (await pg.textContent('#rv')).trim() + '"');
  ok(await pg.evaluate(() => document.querySelector('#ics').hidden), 'only one big button competes for attention now (calendar is hidden)');
  if (phone) { await pg.evaluate(() => scrollTo(0, 0)); ok(await inView('#rv'), 'on a phone the Show button is on the first screen'); }
  await pg.screenshot({ path: OUT + '-4-ready.png' });
  await pg.click('#rv'); await pg.waitForSelector('#maps', { timeout: 6000 }); await pg.waitForTimeout(500);
  ok(ADDR.test(await pg.textContent('[data-k=addr]')), 'one tap shows the address: ' + (await pg.textContent('[data-k=addr]')).slice(0, 60));
  ok(await pg.evaluate(() => getComputedStyle(document.querySelector('[data-k=wm]')).backgroundImage.includes('svg')), 'a live watermark is printed over the address');
  ok(/Fine%20Arts/.test(await pg.getAttribute('#maps', 'href')), 'Open in Maps is one tap away, so nobody has to copy an address');
  await pg.screenshot({ path: OUT + '-5-shown.png' });
  await away();
  ok(!ADDR.test(await dom()) && !/maps\/search/.test(await dom()), 'address and Maps link are removed from the page when the person switches away');
  // 6 · the limit (5), enforced by the server
  for (let i = 0; i < 4; i++) { await pg.waitForSelector('#rv', { timeout: 6000 }); await pg.click('#rv'); await pg.waitForSelector('#maps', { timeout: 6000 }); await pg.waitForTimeout(300); await away(); }
  await pg.waitForTimeout(800);
  const lim = await pg.evaluate(async () => { const o = JSON.parse(localStorage.getItem('lr:pay:' + LR_EDITION.slug)); return LR.api.reveal(o.rid, o.tok); });
  ok(lim.ok === false && lim.reason === 'limit', 'a 6th view is refused by the server (' + lim.reason + ')');
  ok(/Ask the host/.test(await pg.textContent('[data-k=act]')), 'the card says who to ask: "' + (await pg.textContent('[data-k=act]')).trim().slice(0, 70) + '"');
  ok(!ADDR.test(await dom()), 'address is not left in the page after the views');
  // 7 · doors: the code moves to the top of the card, and there is no extra phrase to explain
  await pg.click('#dc-btn'); await pg.click('[data-j=doors]'); await pg.waitForSelector('[data-k=qr] svg', { timeout: 6000 }); await pg.click('#dc-btn'); await pg.waitForTimeout(500);
  await pg.evaluate(() => scrollTo(0, 0)); await pg.waitForTimeout(300);
  ok(/Show this at the door/.test(await pg.textContent('[data-k=qrcap]')), 'the code says what to do with it: "' + (await pg.textContent('[data-k=qrcap]')).trim() + '"');
  ok(await pg.evaluate(() => document.querySelector('[data-k=door]').hidden), 'no extra door phrase to explain');
  const qrTop = await pg.evaluate(() => document.querySelector('[data-k=qr]').getBoundingClientRect().top);
  ok(qrTop < (phone ? 420 : 520), 'at the door the code is at the top of the card (' + Math.round(qrTop) + 'px down)');
  if (phone) ok(await inView('[data-k=qr]'), 'on a phone the whole code is on the first screen');
  await pg.screenshot({ path: OUT + '-6-doors.png' });
  // 8 · exports never contain the address (they live under More)
  await pg.evaluate(() => { document.querySelector('#more').open = true; window.__t = []; const f = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { window.__t.push(String(t)); return f.apply(this, arguments); }; });
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 15000 }).catch(() => null), pg.click('#save')]); await pg.waitForTimeout(1500);
  const texts = await pg.evaluate(() => window.__t); ok(!!dl, 'the card picture downloads'); ok(texts.some(t => /Blount Cultural Park/.test(t)) && !texts.some(t => ADDR.test(t)), 'the picture shows the area and never the address');
  await pg.evaluate(() => { document.querySelector('#ics').hidden = false; });
  const [dl2] = await Promise.all([pg.waitForEvent('download', { timeout: 8000 }).catch(() => null), pg.click('#ics')]);
  if (dl2) { const ics = require('fs').readFileSync(await dl2.path(), 'utf8'); ok(!ADDR.test(ics) && /LOCATION:Blount/.test(ics), 'the calendar file holds the area only'); } else ok(false, 'the calendar file downloads');
  if (!process.env.SKIP_DOOR) {
    // 9 · the door (same browser storage = same simulated server). Colours, not codes.
    const dp = await ctx.newPage(); await dp.setViewportSize({ width: VW, height: VH }); await dp.goto(BASE + 'door.html', { waitUntil: 'load' }); await dp.waitForTimeout(1500);
    ok(await dp.evaluate(() => { const e = document.querySelector('#scan'); const r = e.getBoundingClientRect(); return r.height >= 90 && r.bottom < innerHeight; }), 'the door page opens on one huge Scan button, no scrolling');
    await dp.click('summary'); await dp.click('#sim'); await dp.waitForSelector('#ov.ok', { timeout: 6000 });
    ok(/Jordan Ellis/.test(await dp.textContent('#ov-h')) && /Let in/i.test(await dp.textContent('#ov-k')), 'GREEN: let in, with the guest\'s name');
    await dp.screenshot({ path: OUT + '-7-green.png' }); await dp.click('#ov-b button'); await dp.waitForTimeout(300);
    await dp.click('#sim'); await dp.waitForSelector('#ov.warn', { timeout: 6000 }); ok(/Already in/i.test(await dp.textContent('#ov-k')), 'YELLOW: a second scan says already in');
    await dp.click('#ov-b button');
    const stale = await dp.evaluate(async () => { const p = await LR.api.demo.latestPayload(LR_EDITION.slug); LR.api.demo.setOffset(LR.api.demo.now() - Date.now() + 5 * 60000); const r = await LR.api.doorVerify(p); LR.api.demo.setOffset(LR.api.demo.now() - Date.now() - 5 * 60000); return r.reason; });
    ok(stale === 'expired', 'RED: a code from 5 minutes ago is refused (' + stale + '): screenshots expire');
    const forged = await dp.evaluate(() => LR.api.doorVerify('LR1.LR-ED01-AAAAAA.' + LRTicket.qrStep(LR.api.demo.now()) + '.AAAAAAAA').then(r => r.reason)); ok(['forged', 'notfound'].includes(forged), 'RED: a made-up code with the right time is refused (' + forged + ')');
    // 10 · no phone? find the name, confirm once
    await dp.fill('#q', 'pri'); await dp.click('.go'); await dp.waitForSelector('#ov.ask'); ok(/Priya Nair/.test(await dp.textContent('#ov-h')), 'find by name asks once: "Is this them?"');
    await dp.screenshot({ path: OUT + '-8-ask.png' }); await dp.click('#ov-b button:not(.alt)'); await dp.waitForSelector('#ov.ok', { timeout: 6000 }); ok(/by name/.test(await dp.textContent('#ov-p')), 'checked in by name, and it says so');
    await dp.click('#ov-b button'); await dp.waitForTimeout(300); ok(/In ·/.test(await dp.textContent('#list')), 'the list now shows them as In');
    const dup = await dp.evaluate(async () => { const l = await LR.api.doorList(LR_EDITION.slug); const x = l.find(y => /Priya/.test(y.name)); return LR.api.doorManual(x.ref).then(r => r.reason); }); ok(dup === 'already', 'a second tap on the same name is refused (' + dup + ')');
    await dp.screenshot({ path: OUT + '-9-list.png' });
    // 11 · the card notices the check-in
    await pg.bringToFront(); await pg.waitForTimeout(2500);
    ok(/Checked in/.test(await pg.textContent('[data-k=state]')), 'the guest\'s card flips to "Checked in" by itself');
  }
  // 12 · reload resumes the same card
  await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(2000);
  ok(await pg.getAttribute('.tk', 'data-state') === 'confirmed', 'reload resumes the card (state kept on the server)');
  ok(!ADDR.test(await dom()), 'address is not in the page after a reload');
  ok(await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'no horizontal overflow');
  console.log(logs.length ? 'CONSOLE:\n' + [...new Set(logs)].slice(0, 6).join('\n') : 'no console errors');
  console.log(fails ? ('\n' + fails + ' FAILED') : '\nALL PASSED');
  await b.close(); process.exit(fails ? 1 : 0);
})();
