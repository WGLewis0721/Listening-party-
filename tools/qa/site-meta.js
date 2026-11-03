// The traditional-website checks, run against a BUILT site (python3 tools/build_site.py, then serve _site/) or the live URL.
//   node tools/qa/site-meta.js http://localhost:8801        or       node tools/qa/site-meta.js https://wglewis0721.github.io/Listening-party-
// 1  every page loads with no console errors and no Content Security Policy violations
// 2  every page has a title, description, language, viewport, absolute canonical, share tags and icons; the robots rule matches the sitemap
// 3  the Content Security Policy is ENFORCED: an injected inline script and eval are blocked
// 4  sitemap.xml, robots.txt and security.txt are valid and every sitemap URL loads
const { chromium } = require('playwright');
const ORIGIN = (process.argv[2] || 'http://localhost:8801').replace(/\/$/, ''); let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const get = async (p) => { const r = await fetch(ORIGIN + p); return { status: r.status, text: await r.text() }; };
(async () => {
  const sm = await get('/sitemap.xml'), robots = await get('/robots.txt'), sec = await get('/.well-known/security.txt');
  ok(sm.status === 200 && /<urlset/.test(sm.text), 'sitemap.xml is served');
  const BASE = ((robots.text.match(/^Sitemap:\s*(\S+)\/sitemap\.xml/m) || [])[1] || ORIGIN).replace(/\/$/, '');
  const toLocal = (u) => ORIGIN + u.slice(BASE.length), locs = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  ok(locs.length >= 5 && locs.every(u => u.startsWith(BASE + '/')), locs.length + ' sitemap URLs, all under ' + BASE);
  ok(new Set(locs).size === locs.length, 'no duplicate URLs in the sitemap');
  ok(/^User-agent:/m.test(robots.text) && robots.text.includes(BASE + '/sitemap.xml'), 'robots.txt points at the sitemap');
  const exp = (sec.text.match(/^Expires:\s*(\S+)/m) || [])[1]; ok(sec.status === 200 && /^Contact:\s*\S+/m.test(sec.text) && exp && Date.parse(exp) > Date.now() + 30 * 864e5, 'security.txt has a contact and expires more than 30 days from now (' + exp + ')');
  for (const u of locs) { const r = await fetch(toLocal(u)); if (r.status !== 200) ok(false, 'sitemap URL loads: ' + u + ' → ' + r.status); }
  ok(true, 'every sitemap URL loads');

  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const extra = ['/pay.html', '/door.html', '/site/', '/site/pay.html', '/concepts/review.html', '/concepts/gallery.html', '/concepts/02-led-stage/', '/concepts/03-golden-hour/pay.html', '/concepts/05-brass-night/'];
  const pages = [...new Set([...locs.map(u => u.slice(BASE.length) || '/'), ...extra])];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, permissions: [] });
  for (const p of pages) {
    const pg = await ctx.newPage(), errs = [], viol = [], foreign = [];
    pg.on('request', rq => { const u = rq.url(); if (!/^(data:|blob:|about:)/.test(u) && new URL(u).origin !== new URL(ORIGIN).origin) foreign.push(u.slice(0, 80)); });
    pg.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.text().slice(0, 140)); }); pg.on('pageerror', e => errs.push('pageerror ' + e.message.slice(0, 120)));
    await pg.addInitScript(() => { window.__v = []; document.addEventListener('securitypolicyviolation', e => window.__v.push(e.violatedDirective + ' ' + e.blockedURI)); });
    const r = await pg.goto(ORIGIN + p, { waitUntil: 'load' }); await pg.waitForTimeout(p.includes('door') || p.includes('concepts/index') || p === '/concepts/' ? 2200 : 1800);
    const m = await pg.evaluate(() => { const q = (s, a) => { const e = document.querySelector(s); return e ? e.getAttribute(a) : null; }; return { v: window.__v, lang: document.documentElement.lang, title: document.title, desc: q('meta[name=description]', 'content'), vp: q('meta[name=viewport]', 'content'), canon: q('link[rel=canonical]', 'href'), robots: q('meta[name=robots]', 'content'), ogi: q('meta[property="og:image"]', 'content'), ogt: q('meta[property="og:title"]', 'content'), tw: q('meta[name="twitter:card"]', 'content'), icon: q('link[rel=icon]', 'href'), csp: q('meta[http-equiv="Content-Security-Policy"]', 'content'), ref: q('meta[name=referrer]', 'content') }; });
    const should = locs.includes(BASE + p) ? 'index' : 'noindex', gotIndex = !/noindex/.test(m.robots || '');
    const problems = []; if (r.status() !== 200) problems.push('status ' + r.status()); if (errs.length) problems.push('console: ' + errs[0]); if (m.v.length) problems.push('CSP violation: ' + m.v[0]); if (foreign.length) problems.push('request to another website: ' + foreign[0]);
    if (!m.lang) problems.push('no lang'); if (!m.title) problems.push('no title'); if (!m.desc || m.desc.length < 40) problems.push('thin description'); if (!/width=device-width/.test(m.vp || '')) problems.push('no viewport');
    if (!/^https?:\/\//.test(m.canon || '')) problems.push('canonical not absolute'); if (!/^https?:\/\/.+\.png$/.test(m.ogi || '') || !m.ogt || m.tw !== 'summary_large_image') problems.push('share tags incomplete'); if (!m.icon) problems.push('no icon');
    if (!m.csp || !/default-src 'self'/.test(m.csp) || /unsafe-eval/.test(m.csp) || /script-src[^;]*unsafe-inline/.test(m.csp)) problems.push('CSP missing or weak'); if (m.ref !== 'strict-origin-when-cross-origin') problems.push('no referrer policy');
    if ((should === 'index') !== gotIndex) problems.push('robots rule (' + m.robots + ') does not match the sitemap (' + should + ')');
    ok(!problems.length, p + (problems.length ? ': ' + problems.join('; ') : '')); await pg.close();
  }
  // a bad address, however deep, lands on the styled 404 page (a <base> bug once left it unstyled)
  { const pg4 = await ctx.newPage(), bad = []; pg4.on('response', r => { if (r.status() >= 400 && !/__no_such_page__/.test(r.url())) bad.push(r.status() + ' ' + r.url().slice(-50)); });
    const r = await pg4.goto(ORIGIN + '/concepts/__no_such_page__/deep/path', { waitUntil: 'load' }); await pg4.waitForTimeout(500);
    const h1 = await pg4.textContent('h1').catch(() => ''), font = await pg4.evaluate(() => document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')).fontFamily : '').catch(() => '');
    ok(r.status() === 404 && /not found/i.test(h1) && /Instrument Serif/.test(font) && !bad.length, 'a bad address ' + (r.status() === 404 ? 'returns 404 and ' : '(status ' + r.status() + ') ') + 'shows the styled 404 page, with its styles and fonts loaded' + (bad.length ? ' (failed: ' + bad[0] + ')' : '')); await pg4.close(); }
  // 3 · the policy is enforced, not just present
  const pg = await ctx.newPage(); await pg.goto(ORIGIN + '/', { waitUntil: 'load' }); await pg.waitForTimeout(1200);
  const inj = await pg.evaluate(() => new Promise(res => { let v = 0; document.addEventListener('securitypolicyviolation', () => v++); const s = document.createElement('script'); s.textContent = 'window.__pwn = 1'; document.body.appendChild(s); setTimeout(() => res({ ran: !!window.__pwn, v }), 300); }));
  ok(!inj.ran && inj.v > 0, 'an injected inline script is BLOCKED and reported (ran=' + inj.ran + ', violations=' + inj.v + ')');
  // eval must be probed from a script the PAGE loads: code run through the test tool's own channel is exempt from the policy and proves nothing
  await pg.route('**/__eval_probe.js', r => r.fulfill({ contentType: 'text/javascript', body: "try { new Function('return 1')(); window.__ev = 'ran'; } catch (e) { window.__ev = 'blocked'; }" }));
  const ev = await pg.evaluate(() => new Promise(res => { const s = document.createElement('script'); s.src = '__eval_probe.js'; s.onload = s.onerror = () => setTimeout(() => res(window.__ev), 100); document.body.appendChild(s); }));
  ok(ev === 'blocked', 'eval and new Function are blocked for the page\'s own scripts (' + ev + ')');
  const ext = await pg.evaluate(() => new Promise(res => { const s = document.createElement('script'); s.src = 'https://example.com/x.js'; let blocked = false; document.addEventListener('securitypolicyviolation', () => blocked = true); s.onerror = () => res(blocked); s.onload = () => res(false); document.body.appendChild(s); setTimeout(() => res(blocked), 1500); }));
  ok(ext, 'a script from another website is BLOCKED');
  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
