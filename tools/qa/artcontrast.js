// For each skin+viewport+stop: record text rects/colors, hide UI, screenshot bare art, dump JSON for PIL.
const { chromium } = require('playwright'); const fs = require('fs');
const PAGES = [['01', '/site/'], ['02', '/concepts/02-led-stage/'], ['03', '/concepts/03-golden-hour/'], ['04', '/concepts/04-chrome-disco/'], ['05', '/concepts/05-brass-night/']];
const STOPS = { 0: ['.tagline', '.name-wrap .eyebrow'], 0.28: ['.statement'], 0.54: ['.set-row.on b', '.set-row.on span'], 0.7: ['.stat span', '.lock-note span'], 1: ['.close-copy .h2', '.assure li'] };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const meta = [];
  for (const [id, path] of PAGES) for (const [W, H] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: W < 700, isMobile: W < 700 }); const pg = await ctx.newPage();
    await pg.goto((process.env.LR_BASE || 'http://localhost:8800') + path, { waitUntil: 'load' }); await pg.waitForTimeout(2300);
    for (const p of Object.keys(STOPS)) {
      await pg.evaluate(p => { const t = document.getElementById('track'); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * p); }, parseFloat(p)); await pg.waitForTimeout(1800);
      const items = await pg.evaluate((sels) => { const out = []; sels.forEach(s => document.querySelectorAll(s).forEach(e => { let a = e, ok = true; while (a && a.id !== 'stage') { const c = getComputedStyle(a); if (c.visibility === 'hidden' || +c.opacity < .95 || c.display === 'none') { ok = false; break; } a = a.parentElement; } if (!ok) return; const rg = document.createRange(); rg.selectNodeContents(e); const r = rg.getBoundingClientRect(); if (r.width < 4 || r.bottom < 0 || r.top > innerHeight) return; const c = getComputedStyle(e); out.push({ sel: s, x: r.left, y: r.top, w: r.width, h: r.height, color: c.color, fs: parseFloat(c.fontSize), txt: e.textContent.trim().slice(0, 24) }); })); return out; }, STOPS[p]);
      await pg.addStyleTag({ content: '.stage>.beat,.stage>.name-wrap,.stage>.ticket-wrap,.stage>.bar,.stage>.player,.stage>.cue{visibility:hidden!important}' });
      await pg.waitForTimeout(200);
      const f = `${process.argv[2]}/${id}-${W}-${String(Math.round(p * 100))}.png`; await pg.screenshot({ path: f });
      meta.push({ id, W, p, f, items });
      await pg.evaluate(() => { const s = [...document.querySelectorAll('style')].pop(); s.remove(); });
    }
    await ctx.close();
  }
  fs.writeFileSync(process.argv[2] + '/meta.json', JSON.stringify(meta)); await b.close(); console.log('ok', meta.length);
})();
