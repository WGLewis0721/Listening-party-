/* Listening Room · core helpers shared by the hero page and the pay page.
   Reads window.LR_EDITION (see edition.js). Nothing here touches the network. */
(function (g) {
  'use strict';
  var LR = g.LR = g.LR || {};
  var E = g.LR_EDITION;
  LR.E = E;
  LR.reduce = !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches);
  LR.coarse = !!(g.matchMedia && g.matchMedia('(pointer: coarse)').matches);

  LR.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  LR.mins = function (hhmm) { var p = String(hhmm).split(':'); return (+p[0]) * 60 + (+p[1]); };
  LR.time12 = function (hhmm) { var p = String(hhmm).split(':'), h = +p[0], ap = h >= 12 && h < 24 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + p[1] + ' ' + ap; };
  LR.clock = function (m) { m = Math.round(m); var h = Math.floor(m / 60) % 24, mm = m % 60; var ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return { t: h + ':' + (mm < 10 ? '0' : '') + mm, ap: ap }; };
  LR.evOffsetMin = function (Ed) { var m = /([+-])(\d\d):(\d\d)$/.exec((Ed || E).event.start); return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) : 0; };
  /* event-local wall time from an epoch (the event's own zone, not the viewer's) */
  LR.fmtEvent = function (ms, Ed) {
    var d = new Date(ms + LR.evOffsetMin(Ed) * 60000), D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var h = d.getUTCHours(), mi = d.getUTCMinutes(), se = d.getUTCSeconds(), ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return { day: D[d.getUTCDay()], date: M[d.getUTCMonth()] + ' ' + d.getUTCDate(), time: h + ':' + p2(mi) + ' ' + ap, clock: h + ':' + p2(mi) + ':' + p2(se) + ' ' + ap };
  };
  LR.fmtDur = function (ms) {
    ms = Math.max(0, ms); var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60, p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    if (d) return d + 'd ' + h + 'h'; if (h) return h + 'h ' + p2(m) + 'm'; return m + 'm ' + p2(x) + 's';
  };
  LR.money = function (n) { return '$' + Number(n).toFixed(2); };
  LR.clamp = function (v, a, b) { return Math.min(b == null ? 1 : b, Math.max(a == null ? 0 : a, v)); };

  LR.icons = {
    arrow: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lock: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M7 9V6.5a3 3 0 016 0V9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  LR.themeVars = function (Ed) {
    var t = Ed.theme, k = t.tokens, ti = t.title || {}, v = {
      '--bg': k.bg, '--surface': k.surface, '--ink': k.ink, '--muted': k.muted, '--acc': k.acc, '--acc2': k.acc2 || k.acc, '--acc-on': k.accOn,
      '--display': t.font.stack, '--h-scale': t.font.hScale || 1, '--h-weight': t.font.hWeight || 400, '--h-style': t.font.hStyle || 'normal',
      '--name-lh': ti.lh || .86, '--name-track': ti.track || '-.02em', '--name-weight': ti.weight || 400, '--name-style': ti.style || 'normal', '--name-transform': ti.transform || 'none',
      '--grain': t.grain == null ? .07 : t.grain
    };
    if (ti.size) v['--ns-d'] = ti.size; if (ti.sizeM) v['--ns-m'] = ti.sizeM; if (ti.fill) v['--name-fill'] = ti.fill;
    return v;
  };
  LR.applyTheme = function (Ed) {
    Ed = Ed || E; if (!Ed) return;
    var r = document.documentElement.style, v = LR.themeVars(Ed);
    ['--ns-d', '--ns-m', '--name-fill'].forEach(function (n) { r.removeProperty(n); });   // optional per skin: never inherit the previous skin's
    Object.keys(v).forEach(function (n) { r.setProperty(n, v[n]); });
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', Ed.theme.tokens.bg);
    document.title = Ed.dj.name + ' · ' + Ed.series.name + ' · Ed. ' + Ed.series.edition + ' · ' + Ed.series.city;
    document.documentElement.setAttribute('data-theme', Ed.theme.id || 'custom');
  };

  LR.qrSVG = function (text) {
    if (!g.qrcode) return '';
    var qr = g.qrcode(0, 'M'); qr.addData(text); qr.make();
    var n = qr.getModuleCount(), p = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) p += 'M' + c + ' ' + r + 'h1v1h-1z';
    return '<svg viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" aria-hidden="true"><path d="' + p + '" fill="#0b0b0c"/></svg>';
  };
  LR.dateLine = function () { var ev = E.event; return ev.dateLabel + ' · ' + LR.time12(ev.doors); };

  /* ticket anatomy: plate · head · over · title · sub · meta · lines · location · QR · perforation · foot
     o.state: locked | pending | confirmed   o.foot: html for the foot slot   o.holder / o.qty / o.ref optional */
  LR.ticketHTML = function (o) {
    o = o || {}; var E = o.E || LR.E, ev = E.event, d = E.dj, s = E.series, qty = o.qty || 1;
    var stateLabel = { locked: 'Locked', pending: 'Awaiting payment', confirmed: 'Confirmed' }[o.state || 'locked'];
    return '' +
      '<article class="tk" data-state="' + (o.state || 'locked') + '" aria-label="' + LR.esc(d.name) + ' ticket">' +
      '<div class="tk-plate"><canvas aria-hidden="true"></canvas></div>' +
      '<div class="tk-head"><span>' + LR.esc(s.name) + ' · Ed. ' + LR.esc(s.edition) + '</span><span class="tk-state" data-k="state">' + stateLabel + '</span></div>' +
      '<div class="tk-in">' +
      '<p class="tk-over">Featured DJ · ' + LR.esc(s.month) + '</p>' +
      '<h2 class="tk-title">' + LR.esc(d.name) + '</h2>' +
      '<p class="tk-sub">' + LR.esc(d.tagline) + '</p>' +
      '<dl class="tk-meta"><div><dt>Date</dt><dd>' + LR.esc(ev.dateLabel) + '</dd></div><div><dt>Doors</dt><dd>' + LR.time12(ev.doors) + '</dd></div><div><dt>Seats</dt><dd data-k="seats">' + (o.seatsText || (ev.capacity + ' total')) + '</dd></div></dl>' +
      '<ul class="tk-lines"><li><span>Advance ticket × <i style="font-style:normal" data-k="qty">' + qty + '</i></span><b data-k="sub">' + LR.money(ev.price * qty) + '</b></li><li><span>Fees</span><b>' + LR.money(ev.fee || 0) + '</b></li></ul>' +
      '<div class="tk-loc" data-k="loc"><p class="label"><span>Location</span><em data-k="lockLabel">' + LR.esc(ev.venueLockedLabel) + '</em></p>' +
      '<p class="tk-area" data-k="area" hidden></p>' +
      '<p class="tk-addr" data-k="addr"><span aria-hidden="true">' + LR.esc(ev.venueDecoy) + '</span><span class="sr">' + LR.esc(ev.venueLockedLabel) + '</span></p>' +
      '<div class="tk-act" data-k="act" hidden></div><div class="tk-wm" data-k="wm" aria-hidden="true"></div></div>' +
      '<div class="tk-door" data-k="door" hidden></div>' +
      '<div class="tk-qrwrap"><div class="tk-qr" data-k="qr" role="img" aria-label="Entry code"></div><p class="tk-qrcap" data-k="qrcap"></p></div>' +
      '<div class="tk-perf"></div>' +
      '<div class="tk-foot" data-k="foot">' + (o.foot || '') + '</div>' +
      (o.note ? '<p class="tk-note">' + o.note + '</p>' : '') +
      '</div><span class="tk-glare" aria-hidden="true"></span><span class="tk-sweep" aria-hidden="true"></span></article>';
  };

  /* pointer tilt + glare. Desktop only; scroll drives the tilt on touch. */
  LR.tilt = function (el, max) {
    if (LR.reduce || LR.coarse || !el) return;
    max = max || 7;
    el.addEventListener('pointermove', function (e) {
      var b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
      el.style.setProperty('--ty', ((x - .5) * max * 2).toFixed(2) + 'deg');
      el.style.setProperty('--tx', ((.5 - y) * max * 2).toFixed(2) + 'deg');
      el.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    });
    el.addEventListener('pointerleave', function () { el.style.setProperty('--tx', '0deg'); el.style.setProperty('--ty', '0deg'); });
  };

  /* magnetic pull on primary buttons (desktop, fine pointer) */
  LR.magnet = function (btn, pull) {
    if (LR.reduce || LR.coarse || !btn) return;
    pull = pull || .22;
    btn.addEventListener('pointermove', function (e) {
      var b = btn.getBoundingClientRect();
      btn.style.setProperty('--bx', ((e.clientX - b.left - b.width / 2) * pull).toFixed(1) + 'px');
      btn.style.setProperty('--by', ((e.clientY - b.top - b.height / 2) * pull).toFixed(1) + 'px');
    });
    btn.addEventListener('pointerleave', function () { btn.style.setProperty('--bx', '0px'); btn.style.setProperty('--by', '0px'); });
  };

  /* mounts the skin's motif onto a canvas (stage background or ticket plate) */
  LR.mountArt = function (canvas, o) {
    o = o || {}; var E = o.E || LR.E;
    if (!g.LRShaders || !canvas) return null;
    var c = g.LRShaders.mount(canvas, E.theme.shader, {
      keep: !!o.keep,
      tokens: { bg: E.theme.tokens.bg, ink: E.theme.tokens.ink, acc: E.theme.tokens.acc, acc2: E.theme.tokens.acc2 || E.theme.tokens.acc },
      dprMax: o.dprMax || 1.5, fps: o.fps || 60, seed: o.seed || (E.theme.seed || 0), prog: o.prog || 0,
      still: LR.reduce || !!o.still, timeOffset: o.timeOffset || 0, scale: o.scale, safe: !!o.safe
    });
    if (!c) canvas.parentNode.setAttribute('data-gl', '0');
    return c;
  };

  if (!g.LR_NO_THEME) LR.applyTheme();
})(window);
