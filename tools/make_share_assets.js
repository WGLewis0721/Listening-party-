// Regenerates the icons and the social-share images in site/.   node tools/make_share_assets.js   (needs the repo served at http://localhost:8800 and Playwright)
//   favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png, icon-512-maskable.png   from the brand mark
//   og-listening-room.png   1200x630, the real hero of the live edition
//   og-concepts.png         1200x630, a collage of the five looks
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://localhost:8800', OUT = path.join(__dirname, '..', 'site');
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const mark = (pad, bg, rx) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${rx}" fill="${bg}"/><g transform="translate(32 32) scale(${1 - pad}) translate(-32 -32)"><circle cx="32" cy="32" r="21" fill="none" stroke="#c8a45c" stroke-width="3.5"/><circle cx="32" cy="32" r="10" fill="#c8a45c"/></g></svg>`;
(async () => {
  const b = await chromium.launch({ args: ARGS });
  // ---- icons
  const icon = async (file, size, svg) => { const p = await b.newPage({ viewport: { width: size, height: size } }); await p.setContent(`<body style="margin:0;background:#0b0b0c">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`); await p.screenshot({ path: path.join(OUT, file), omitBackground: false }); await p.close(); };
  await icon('icon-192.png', 192, mark(0, '#0b0b0c', 14)); await icon('icon-512.png', 512, mark(0, '#0b0b0c', 14));
  await icon('icon-512-maskable.png', 512, mark(0.28, '#0b0b0c', 0)); await icon('apple-touch-icon.png', 180, mark(0.08, '#0b0b0c', 0));
  for (const s of [16, 32, 48]) await icon('.fav-' + s + '.png', s, mark(0, '#0b0b0c', 14));   // temp renders; the .ico is assembled from them (Pillow): see the python one-liner in tools/README.md
  // ---- the live hero, as a link preview
  const hero = async (url, w, h, file, wait = 4200) => { const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(wait); const buf = await p.screenshot({ path: file ? path.join(OUT, file) : undefined }); await ctx.close(); return buf; };
  await hero(BASE + '/site/', 1200, 630, 'og-listening-room.png');
  // ---- the five looks
  const big = await hero(BASE + '/site/', 720, 630), urls = ['/concepts/02-led-stage/', '/concepts/03-golden-hour/', '/concepts/04-chrome-disco/', '/concepts/05-brass-night/'];
  const tiles = []; for (const u of urls) tiles.push(await hero(BASE + u, 480, 630));
  const img = (buf) => 'data:image/png;base64,' + buf.toString('base64');
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(`<body style="margin:0;width:1200px;height:630px;background:#0b0b0c;display:grid;grid-template-columns:720px 480px;gap:0;overflow:hidden">
    <img src="${img(big)}" style="width:720px;height:630px;display:block">
    <div style="display:grid;grid-template-columns:240px 240px;grid-template-rows:315px 315px">${tiles.map(t => `<img src="${img(t)}" style="width:240px;height:315px;object-fit:cover;object-position:left top;display:block">`).join('')}</div></body>`);
  await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, 'og-concepts.png') }); await b.close();
})();
