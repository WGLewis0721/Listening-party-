// "Does anyone have to explain this?"  A guard against the app drifting back to jargon and clutter.
//   node tools/qa/plain-words.js [baseUrl]
// For every screen a guest or a volunteer sees it checks: no technical words, a small number of things to tap, the reading grade of the sentences,
// and that the one thing to do is on the first screen of a phone. Demo-only furniture (banner, fake Square page, demo clock, demo tools) is ignored.
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8800/site/'; let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const JARGON = /webhook|token|payload|reveal|simulat|hold to|confirming|released|\bheld\b|checkout url|hmac|endpoint|api\b|json|server|database|rotating|decrypt|watermark|qr\b|\bref\b/i;
function grade(text) {                                       // Flesch-Kincaid grade, rough but steady
  const sents = text.split(/[.!?]+\s/).map(x => x.trim()).filter(x => x.split(/\s+/).length > 1); if (!sents.length) return 0;
  const words = text.match(/[A-Za-z’']+/g) || []; const syl = w => Math.max(1, (w.toLowerCase().replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g) || []).length);
  const S = words.reduce((a, w) => a + syl(w), 0); return 0.39 * (words.length / sents.length) + 11.8 * (S / words.length) - 15.59;
}
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); let pg = await ctx.newPage();
  const snap = (name, scope, budget) => pg.evaluate(({ scope }) => {
    const skip = '.demo-banner,#sq,#dc,.dclock,.demo,#dc-btn,.skip,header.bar,footer,.tk-plate,.sr,[hidden],canvas,script,style';
    const root = document.querySelector(scope), vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest(skip.replace(/,\.sr/, '')); };
    const ctl = [...root.querySelectorAll('button,a[href],input,summary,select,textarea')].filter(e => vis(e) && !e.closest('details:not([open]) .more-in') && !e.closest('.gl-list') && !e.closest('.tk') );
    const txt = [...root.querySelectorAll('h1,h2,p,label,button,summary,small,li,span,b,dd,dt')].filter(e => vis(e) && !e.closest('.tk') && ![...e.children].some(c => c.matches('h1,h2,p,label,button,summary,small,li,b,dd,dt'))).map(e => e.textContent.trim()).filter(Boolean);
    return { ctl: ctl.map(e => (e.id || e.tagName.toLowerCase()) + ':' + (e.textContent || e.placeholder || '').trim().slice(0, 22)), text: txt.join('. ') };
  }, { scope }).then(r => {
    const jar = r.text.match(JARGON); const g = grade(r.text);
    ok(!jar, name + ': no technical words' + (jar ? ' (found "' + jar[0] + '")' : ''));
    ok(r.ctl.length <= budget, name + ': ' + r.ctl.length + ' things to tap (budget ' + budget + '): ' + r.ctl.join(' | '));
    ok(g <= 8, name + ': reading grade ' + g.toFixed(1) + ' (must be 8 or lower)');
  });
  await pg.goto(BASE + 'pay.html', { waitUntil: 'load' }); await pg.waitForTimeout(1500);
  await snap('Reserve screen', '.pay-form', 6);
  await pg.fill('#f-name', 'Jordan Ellis'); await pg.fill('#f-email', 'jordan@example.com'); await pg.click('#go'); await pg.waitForSelector('#sq:not([hidden])'); await pg.click('#sq-x'); await pg.waitForSelector('#p-pay:not([hidden])');
  await snap('Finish paying screen', '.pay-form', 3);
  await pg.click('#pay'); await pg.waitForSelector('#sq:not([hidden])'); await pg.click('#sq-ok'); await pg.waitForSelector('#p-ticket:not([hidden])', { timeout: 12000 }); await pg.waitForTimeout(500);
  await snap('Paid, waiting for the address', '.pay-form', 3);
  await pg.click('#dc-btn'); await pg.click('[data-j=unlock]'); await pg.waitForSelector('#rv'); await pg.click('#dc-btn'); await pg.waitForTimeout(400);
  await snap('Address ready', '.pay-form', 3);
  const card = () => pg.evaluate(() => [...document.querySelectorAll('.tk-act p,.tk-act a,.tk-act button,[data-k=lockLabel],[data-k=qrcap]')].filter(e => e.getBoundingClientRect().width > 0).map(e => e.textContent.trim()).join('. '));
  const cardText = await card(); ok(!JARGON.test(cardText), 'Address ready (on the card): no technical words — "' + cardText.slice(0, 90) + '…"');
  await pg.click('#rv'); await pg.waitForSelector('#maps'); const shown = await card(); ok(!JARGON.test(shown.replace(/watermark/gi, '')), 'Address showing (on the card): no technical words — "' + shown.slice(0, 90) + '…"');
  await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const dp = await ctx.newPage(); await dp.goto(BASE + 'door.html', { waitUntil: 'load' }); await dp.waitForTimeout(1500); pg = dp;
  await snap('Door screen', '.dw', 3);
  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
