// node audit.js  -> runs all checks against all editions, prints JSON summary
const { chromium } = require('playwright');
const BASE = process.env.LR_BASE || 'http://localhost:8800';
const PAGES = [
  ['01 Quiet Spectra', '/site/'], ['02 LED Stage', '/concepts/02-led-stage/'], ['03 Golden Hour', '/concepts/03-golden-hour/'],
  ['04 Chrome Disco', '/concepts/04-chrome-disco/'], ['05 Brass Night', '/concepts/05-brass-night/']];
const VPS = [[390, 844], [820, 1180], [1024, 768], [1440, 900]];
const isVis = `(e)=>{const c=getComputedStyle(e);return c.visibility!=='hidden'&&parseFloat(c.opacity)>0.05&&c.display!=='none'}`;
const out = {};
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [name, path] of PAGES) {
    const R = out[name] = { hero: {}, pay: {} };
    // ---------- HERO at each viewport
    for (const [W, H] of VPS) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: W < 700, isMobile: W < 700 });
      const pg = await ctx.newPage(); const logs = [], ext = [], sizes = []; let bytes = 0;
      pg.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(m.text()); });
      pg.on('pageerror', e => logs.push('pageerror ' + e.message));
      pg.on('request', r => { const u = new URL(r.url()); if (u.hostname !== 'localhost') ext.push(r.url()); });
      pg.on('response', async r => { try { const cl = r.headers()['content-length']; if (cl) bytes += +cl; } catch (e) { } });
      await pg.goto(BASE + path, { waitUntil: 'load' }); await pg.waitForTimeout(2300);
      const v = R.hero[W] = { errors: logs, external: ext, kb: Math.round(bytes / 1024) };
      v.overflowX = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      v.h1 = await pg.evaluate(() => document.querySelectorAll('h1').length);
      v.lang = await pg.evaluate(() => document.documentElement.lang); v.title = await pg.title();
      // state assertions by progress
      const mob = W < 900;
      const expect = { 0: ['.name'], 0.2: ['.b-sound'], 0.45: ['.b-set'], 0.66: mob ? ['.b-room'] : ['.b-room', '.ticket-wrap'], 1: ['.b-close', '.ticket-wrap'] };
      const ALL = ['.name', '.b-sound', '.b-set', '.b-room', '.b-close', '.ticket-wrap'];
      v.states = []; v.smallText = new Set(); v.smallTargets = new Set(); v.primary = null;
      for (const p of Object.keys(expect)) {
        await pg.evaluate(p => { const t = document.getElementById('track'); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * p); }, parseFloat(p));
        await pg.waitForTimeout(1700);
        const res = await pg.evaluate(({ ALL, isVis }) => { const f = eval(isVis); return ALL.map(s => [s, f(document.querySelector(s))]); }, { ALL, isVis });
        const bad = res.filter(([s, vis]) => vis !== expect[p].includes(s)).map(([s, vis]) => s + (vis ? ' visible' : ' hidden'));
        v.states.push({ p, ok: bad.length === 0, bad });
        // min text size + tap targets among visible things
        const m = await pg.evaluate(() => {
          const small = [], tiny = []; const w = document.createTreeWalker(document.querySelector('.stage'), NodeFilter.SHOW_TEXT);
          let n; while ((n = w.nextNode())) { const t = n.textContent.trim(); if (!t) continue; const e = n.parentElement; const c = getComputedStyle(e); if (c.visibility === 'hidden' || +c.opacity < .5 || c.display === 'none') continue;
            let a = e, hid = false; while (a && a.id !== 'stage') { const s = getComputedStyle(a); if (s.visibility === 'hidden' || +s.opacity < .05 || s.display === 'none') { hid = true; break; } a = a.parentElement; } if (hid) continue;
            const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || r.width === 0) continue;
            const fs = parseFloat(c.fontSize); if (fs < 12 && !e.closest('svg')) small.push(e.className + ':' + fs.toFixed(1) + ':' + t.slice(0, 18)); }
          document.querySelectorAll('a.btn,button,.pl-tick,.brand').forEach(e => { const c = getComputedStyle(e); let a = e, hid = false; while (a && a.id !== 'stage') { const s = getComputedStyle(a); if (s.visibility === 'hidden' || +s.opacity < .05 || s.display === 'none') { hid = true; break; } a = a.parentElement; } if (hid) return; const r = e.getBoundingClientRect(); if (r.width && (r.height < 44 || r.width < 44)) tiny.push((e.className || e.tagName) + ':' + Math.round(r.width) + 'x' + Math.round(r.height)); });
          const svgSmall = []; document.querySelectorAll('.arc .axis text').forEach(t => { const r = t.getBoundingClientRect(); const fs = parseFloat(getComputedStyle(t).fontSize) * (r.width / (t.getBBox().width || 1)); svgSmall.push(+fs.toFixed(1)); });
          return { small, tiny, svgMin: svgSmall.length ? Math.min(...svgSmall) : null };
        });
        m.small.forEach(s => v.smallText.add(s)); m.tiny.forEach(s => v.smallTargets.add(s)); if (m.svgMin != null) v.svgAxisMin = Math.min(v.svgAxisMin || 99, m.svgMin);
        if (p === '1') v.primary = await pg.evaluate(() => [...document.querySelectorAll('.btn')].filter(e => !e.classList.contains('btn--ghost')).filter(e => { const c = getComputedStyle(e); let a = e, ok = true; while (a && a !== document.body) { const s = getComputedStyle(a); if (s.visibility === 'hidden' || +s.opacity < .05 || s.display === 'none') { ok = false; break; } a = a.parentElement; } return ok; }).length);
      }
      v.smallText = [...v.smallText]; v.smallTargets = [...v.smallTargets];
      if (W === 1440) { // keyboard order
        await pg.evaluate(() => scrollTo(0, 0)); await pg.waitForTimeout(500);
        v.tab = []; for (let i = 0; i < 12; i++) { await pg.keyboard.press('Tab'); v.tab.push(await pg.evaluate(() => { const e = document.activeElement; const c = getComputedStyle(e); return (e.className || e.tagName).toString().split(' ')[0] + (c.outlineStyle !== 'none' ? '' : ' (NO OUTLINE)'); })); }
      }
      await ctx.close();
    }
    // ---------- reduced motion
    { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const pg = await ctx.newPage(); const logs = [];
      pg.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(m.text()); });
      await pg.goto(BASE + path, { waitUntil: 'load' }); await pg.waitForTimeout(1500);
      R.reduced = await pg.evaluate(() => ({ mode: document.getElementById('lr').dataset.mode, words: [...document.querySelectorAll('.statement .w')].every(w => +getComputedStyle(w).opacity === 1), rows: [...document.querySelectorAll('.set-row')].every(w => +getComputedStyle(w).opacity === 1), height: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth - innerWidth, pinned: getComputedStyle(document.querySelector('.stage')).position }));
      R.reduced.errors = logs; await ctx.close(); }
    // ---------- pay page
    for (const [W, H] of [[390, 844], [1440, 900]]) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: W < 700, isMobile: W < 700 }); const pg = await ctx.newPage(); const logs = [], ext = [];
      pg.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(m.text()); }); pg.on('pageerror', e => logs.push(e.message));
      pg.on('request', r => { const u = new URL(r.url()); if (u.hostname !== 'localhost') ext.push(r.url()); });
      await pg.goto(BASE + path + 'pay.html', { waitUntil: 'load' }); await pg.waitForTimeout(1800);
      R.pay[W] = await pg.evaluate(() => { const ins = [...document.querySelectorAll('input')]; const tiny = []; document.querySelectorAll('button,a.btn,input,.pay-back,.brand').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && (r.height < 44)) tiny.push((e.id || e.className || e.tagName) + ':' + Math.round(r.height)); });
        return { overflowX: document.documentElement.scrollWidth - innerWidth, h1: document.querySelectorAll('h1').length, inputFont: ins.map(i => parseFloat(getComputedStyle(i).fontSize)), labelled: ins.every(i => document.querySelector('label[for="' + i.id + '"]')), tinyTargets: tiny, banner: !!document.querySelector('.demo-banner') }; });
      R.pay[W].errors = logs; R.pay[W].external = ext; await ctx.close();
    }
  }
  await b.close();
  console.log(JSON.stringify(out, null, 1));
})();
