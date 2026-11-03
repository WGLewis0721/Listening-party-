/* Listening Room · pay page + customer card.
   DEMO CHECKOUT: no card is collected and nothing is charged. The card, the unlock moment and the exports are real;
   the payment step is a stand-in. See HANDOFF.md for wiring Stripe/Square (payment.mode = 'link').
   SECURITY: in production the venue address must be returned by your server only after payment is confirmed. */
(function (g) {
  'use strict';
  var LR = g.LR, E = LR && LR.E; if (!E) return;
  var esc = LR.esc, ev = E.event, d = E.dj, s = E.series, pay = E.payment || { mode: 'demo' };
  var root = document.getElementById('lr');
  var KEY = 'lr:' + E.slug;
  var maxQty = Math.min(ev.maxQty || 4, typeof ev.seatsLeft === 'number' ? ev.seatsLeft : 99);
  var S = { qty: 1, name: '', email: '', ref: '', status: 'locked' };
  var params = new URLSearchParams(location.search);

  function save() { try { sessionStorage.setItem(KEY, JSON.stringify({ qty: S.qty, name: S.name, ref: S.ref, status: S.status })); } catch (e) { } }
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function makeRef() {
    var A = 'ABCDEFGHJKMNPQRSTVWXYZ23456789', out = '', b = new Uint8Array(6);
    (g.crypto || g.msCrypto).getRandomValues(b); for (var i = 0; i < 6; i++) out += A[b[i] % A.length];
    return 'LR-ED' + s.edition + '-' + out;
  }
  var homeHref = './';

  function build() {
    var foot = '<dl class="tk-hold"><div><dt>Holder</dt><dd data-k="holder">Your name</dd></div><div><dt>Reference</dt><dd data-k="ref">LR-ED' + esc(s.edition) + '-······</dd></div><div><dt>Admit</dt><dd data-k="admit">1</dd></div></dl>';
    var arrow = LR.icons.arrow;
    root.innerHTML = '' +
      '<a class="skip" href="#f-name">Skip to form</a>' +
      '<header class="bar pay-bar"><a class="brand" href="' + homeHref + '"><span class="brand-mark"></span><b>' + esc(s.name) + '</b><i>Ed. ' + esc(s.edition) + '</i></a><a class="pay-back" href="' + homeHref + '">&larr; ' + esc(d.name) + '</a></header>' +
      '<p class="demo-banner" role="note">Demo checkout · nothing is charged · no card is collected</p>' +
      '<main class="pay-stage"><canvas class="gl" aria-hidden="true"></canvas><div class="fx scrim" aria-hidden="true"></div><div class="fx grain" aria-hidden="true"></div><div class="fx vignette" aria-hidden="true"></div>' +
      '<div class="pay-grid">' +
      '<section class="pay-form" aria-labelledby="h">' +
      '<p class="eyebrow" id="step">Reserve · Step 1 of 2</p>' +
      '<h1 class="h2" id="h" tabindex="-1">Your seat for ' + esc(d.name) + '</h1>' +
      '<p class="lede" id="lede">One advance ticket unlocks the address and puts your name on the card. No door sales.</p>' +
      '<form class="form" id="f" novalidate>' +
      '<div class="field"><span class="label" id="qlab">Seats</span><div class="step" role="group" aria-labelledby="qlab"><button type="button" id="dec" aria-label="Fewer seats">&minus;</button><output id="qty" aria-live="polite">1</output><button type="button" id="inc" aria-label="More seats">+</button></div></div>' +
      '<div class="field"><label for="f-name">Name on the card</label><input id="f-name" name="name" autocomplete="name" required placeholder="Your name" aria-describedby="e-name"><p class="err" id="e-name" role="alert"></p></div>' +
      '<div class="field"><label for="f-email">Email for your ticket</label><input id="f-email" name="email" type="email" autocomplete="email" inputmode="email" required placeholder="you@email.com" aria-describedby="e-email"><p class="err" id="e-email" role="alert"></p></div>' +
      '<div class="sum"><div><span>Advance ticket × <i id="s-q" style="font-style:normal">1</i></span><b id="s-sub">' + LR.money(ev.price) + '</b></div><div><span>Fees</span><b>' + LR.money(ev.fee || 0) + '</b></div><div class="tot"><span>Total</span><b id="s-tot">' + LR.money(ev.price + (ev.fee || 0)) + '</b></div></div>' +
      '<button class="btn btn--block" id="go" type="submit"><span id="go-t">' + (pay.mode === 'link' ? 'Continue to secure payment' : 'Complete demo reservation') + '</span>' + arrow + '</button>' +
      '<p class="fine">' + (pay.mode === 'link' ? 'You will pay on a secure page. Your address is released after payment is confirmed.' : 'Demo only: nothing is charged and no card is collected. To go live, connect Stripe or Square (see HANDOFF.md).') + '</p>' +
      '</form>' +
      '<div class="done" id="done" hidden><h2 id="done-h" tabindex="-1">You’re in.</h2><p class="lede" id="done-p"></p><div class="acts"><button class="btn" id="save" type="button">Save card (PNG)</button><button class="btn btn--ghost" id="ics" type="button">Add to calendar</button><button class="btn btn--ghost" id="share" type="button">Share</button></div><p class="fine" id="status" role="status"></p><p class="fine"><a href="' + homeHref + '">Back to ' + esc(d.name) + '</a></p></div>' +
      '</section>' +
      '<aside class="pay-card" aria-label="Your card">' + LR.ticketHTML({ state: 'locked', foot: foot, seatsText: ev.capacity + ' total' }) + '</aside>' +
      '</div></main>' +
      '<p class="sr" id="live" aria-live="assertive"></p>' +
      '<footer class="foot"><span>' + esc(E.footer.left) + '</span><span>' + E.footer.right + '</span></footer>';
  }

  build();
  var $ = function (q) { return root.querySelector(q); };
  var tk = $('.tk'), art = LR.mountArt($('.gl'), { fps: 30, prog: .55, safe: true });
  var plate = LR.mountArt($('.tk-plate canvas'), { fps: 24, prog: .6, seed: 7, timeOffset: 30, dprMax: 1.5, keep: true });
  var plateCanvas = $('.tk-plate canvas');
  LR.tilt(tk, 5); LR.magnet($('#go'), .12);

  function k(name) { return tk.querySelector('[data-k="' + name + '"]'); }
  function setState(st) {
    S.status = st; tk.setAttribute('data-state', st);
    k('state').textContent = { locked: 'Locked', pending: 'Processing', confirmed: 'Confirmed' }[st];
  }
  function render() {
    var total = ev.price * S.qty;
    $('#qty').textContent = S.qty; $('#s-q').textContent = S.qty; $('#s-sub').textContent = LR.money(total); $('#s-tot').textContent = LR.money(total + (ev.fee || 0));
    k('qty').textContent = S.qty; k('sub').textContent = LR.money(total); k('admit').textContent = S.qty;
    k('holder').textContent = S.name.trim() || 'Your name';
    $('#dec').disabled = S.qty <= 1; $('#inc').disabled = S.qty >= maxQty;
  }

  $('#dec').addEventListener('click', function () { if (S.qty > 1) { S.qty--; render(); } });
  $('#inc').addEventListener('click', function () { if (S.qty < maxQty) { S.qty++; render(); } });
  $('#f-name').addEventListener('input', function (e) { S.name = e.target.value; render(); });
  $('#f-email').addEventListener('input', function (e) { S.email = e.target.value; });

  var qrSVG = LR.qrSVG;
  function payload() { return 'LR|' + E.slug + '|' + S.ref + '|' + S.qty; }
  function addrText() { return ev.venueName + ' · ' + ev.venueAddress; }

  function scramble(el, text, ms, done) {
    if (LR.reduce) { el.textContent = text; done && done(); return; }
    var G = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789', t0 = performance.now();
    (function frame(now) {
      var n = Math.min(1, (now - t0) / ms), keep = Math.floor(n * text.length), out = text.slice(0, keep);
      for (var i = keep; i < text.length; i++) out += /[\s,·.]/.test(text[i]) ? text[i] : G[(Math.random() * G.length) | 0];
      el.textContent = out;
      if (n < 1) g.requestAnimationFrame(frame); else { el.textContent = text; done && done(); }
    })(t0);
  }

  function confirmed(instant) {
    setState('confirmed');
    k('ref').textContent = S.ref; k('holder').textContent = S.name.trim() || 'Guest';
    k('lockLabel').textContent = 'Unlocked';
    k('qr').innerHTML = qrSVG(payload());
    var el = k('addr'); tk.classList.add('is-unlocking');
    if (instant) el.textContent = addrText(); else scramble(el, addrText(), 1100);
    $('#f').hidden = true; $('#done').hidden = false;
    $('#step').textContent = 'Confirmed · Step 2 of 2';
    $('#h').textContent = 'You’re in, ' + (S.name.trim().split(/\s+/)[0] || 'friend') + '.';
    $('#lede').hidden = true;
    $('#done-h').hidden = true;
    $('#done-p').textContent = 'Your card is on the right and the address is unlocked. Demo only: in production this card is also emailed to ' + (S.email || 'you') + '.';
    $('#live').textContent = 'Reservation confirmed. Address unlocked: ' + addrText();
    save();
    if (!instant) { $('#h').focus({ preventScroll: true }); if (g.innerWidth < 900) tk.scrollIntoView({ behavior: LR.reduce ? 'auto' : 'smooth', block: 'center' }); }
  }

  function validate() {
    var ok = true, nm = $('#f-name'), em = $('#f-email');
    var okN = S.name.trim().length >= 2, okE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(S.email.trim());
    nm.setAttribute('aria-invalid', okN ? 'false' : 'true'); $('#e-name').textContent = okN ? '' : 'Add the name for the card.';
    em.setAttribute('aria-invalid', okE ? 'false' : 'true'); $('#e-email').textContent = okE ? '' : 'Enter a valid email so we can send the ticket.';
    if (!okN) { nm.focus(); ok = false; } else if (!okE) { em.focus(); ok = false; }
    return ok;
  }

  $('#f').addEventListener('submit', function (e) {
    e.preventDefault(); if (!validate()) return;
    S.ref = makeRef();
    if (pay.mode === 'link' && pay.url) {
      save(); g.location.href = pay.url + (pay.url.indexOf('?') < 0 ? '?' : '&') + 'client_reference_id=' + encodeURIComponent(S.ref) + '&prefilled_email=' + encodeURIComponent(S.email.trim());
      return;
    }
    var go = $('#go'); go.disabled = true; $('#go-t').textContent = 'Processing demo payment…'; setState('pending');
    setTimeout(function () { confirmed(false); }, LR.reduce ? 150 : 1100);
  });

  /* ───── exports ───── */
  function wrap(ctx, text, maxW) { var w = text.split(/\s+/), lines = [], l = ''; w.forEach(function (x) { var c = l ? l + ' ' + x : x; if (l && ctx.measureText(c).width > maxW) { lines.push(l); l = x; } else l = c; }); if (l) lines.push(l); return lines; }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  async function renderPNG() {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var cs = getComputedStyle(document.documentElement), tok = function (n, f) { return cs.getPropertyValue(n).trim() || f; };
    var C = { bg: tok('--bg', '#000'), sf: tok('--surface', '#111'), ink: tok('--ink', '#fff'), mu: tok('--muted', '#aaa'), ac: tok('--acc', '#c8a45c'), on: tok('--acc-on', '#000') };
    var W = 1000, P = 64, DISP = E.theme.font.stack, MONO = "'JetBrains Mono Variable',ui-monospace,monospace", BODY = "'Manrope Variable',system-ui,sans-serif";
    var up = (E.theme.title && E.theme.title.transform === 'uppercase'), lines = d.lines || [d.name];
    var tw = E.theme.title || {}, tfs = Math.min(150, 1700 / Math.max.apply(null, lines.map(function (l) { return l.length; })) * (up ? .95 : 1.25));
    var H = 2100, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var x = cv.getContext('2d');
    x.fillStyle = C.sf; x.fillRect(0, 0, W, H);
    // plate
    if (plate) plate.redraw();
    var PH = 420; try { x.drawImage(plateCanvas, 0, 0, W, PH); } catch (err) { x.fillStyle = C.bg; x.fillRect(0, 0, W, PH); }
    var gr = x.createLinearGradient(0, 0, 0, PH); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(.45, 'rgba(0,0,0,0)'); gr.addColorStop(1, C.sf); x.fillStyle = gr; x.fillRect(0, 0, W, PH);
    x.textBaseline = 'alphabetic';
    x.font = '700 22px ' + MONO; x.fillStyle = C.ink; x.fillText((s.name + ' · Ed. ' + s.edition).toUpperCase(), P, 70);
    x.textAlign = 'right'; x.fillStyle = '#5ee08f'; x.fillText('● CONFIRMED', W - P, 70); x.textAlign = 'left';
    var y = 480; x.font = '700 22px ' + MONO; x.fillStyle = C.ac; x.fillText(('Featured DJ · ' + s.month).toUpperCase(), P, y); y += 28;
    x.fillStyle = C.ink; x.font = (tw.style === 'italic' ? 'italic ' : '') + (tw.weight || 400) + ' ' + tfs + 'px ' + DISP;
    lines.forEach(function (l) { y += tfs * (tw.lh || .9) + 6; x.fillText(up ? l.toUpperCase() : l, P, y); });
    y += 40; x.font = '500 28px ' + BODY; x.fillStyle = C.mu; wrap(x, d.tagline, W - 2 * P).forEach(function (l) { x.fillText(l, P, y); y += 40; });
    y += 20; x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 2; x.beginPath(); x.moveTo(P, y); x.lineTo(W - P, y); x.stroke(); y += 50;
    [['DATE', ev.dateLabel], ['DOORS', LR.time12(ev.doors)], ['ADMIT', String(S.qty)]].forEach(function (c, i) { var cx = P + i * 290; x.font = '600 20px ' + MONO; x.fillStyle = C.mu; x.fillText(c[0], cx, y); x.font = '700 32px ' + BODY; x.fillStyle = C.ink; x.fillText(c[1], cx, y + 44); });
    y += 100; x.beginPath(); x.moveTo(P, y); x.lineTo(W - P, y); x.stroke(); y += 50;
    x.font = '600 20px ' + MONO; x.fillStyle = C.mu; x.fillText('HOLDER', P, y); x.fillText('REFERENCE', P + 480, y);
    x.font = '700 34px ' + BODY; x.fillStyle = C.ink; x.fillText(S.name.trim() || 'Guest', P, y + 48); x.font = '700 34px ' + MONO; x.fillText(S.ref, P + 480, y + 48); y += 120;
    rr(x, P, y, W - 2 * P, 190, 24); x.fillStyle = 'rgba(255,255,255,.06)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.16)'; x.stroke();
    x.font = '600 20px ' + MONO; x.fillStyle = C.mu; x.fillText('LOCATION', P + 32, y + 48); x.fillStyle = '#5ee08f'; x.textAlign = 'right'; x.fillText('UNLOCKED', W - P - 32, y + 48); x.textAlign = 'left';
    x.font = '700 32px ' + BODY; x.fillStyle = C.ink; wrap(x, addrText(), W - 2 * P - 64).slice(0, 3).forEach(function (l, i) { x.fillText(l, P + 32, y + 100 + i * 42); }); y += 240;
    // QR
    if (g.qrcode) { var qr = g.qrcode(0, 'M'); qr.addData(payload()); qr.make(); var n = qr.getModuleCount(), cell = Math.floor(280 / n), sz = cell * n, qx = (W - sz) / 2;
      rr(x, qx - 24, y - 24, sz + 48, sz + 48, 20); x.fillStyle = '#fff'; x.fill(); x.fillStyle = '#0b0b0c';
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) x.fillRect(qx + c * cell, y + r * cell, cell, cell); y += sz + 70; }
    x.textAlign = 'center'; x.font = '600 20px ' + MONO; x.fillStyle = C.mu; x.fillText('SHOW AT THE DOOR · ' + S.ref, W / 2, y); y += 40;
    x.fillText('DEMO CARD · FICTIONAL EVENT · NOT A REAL TICKET', W / 2, y);
    var fin = document.createElement('canvas'); fin.width = W; fin.height = Math.min(H, y + 64); fin.getContext('2d').drawImage(cv, 0, 0);
    return new Promise(function (res) { fin.toBlob(res, 'image/png'); });
  }
  function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function note(t) { $('#status').textContent = t; }

  $('#save').addEventListener('click', async function () {
    var b = this; b.disabled = true; note('Preparing your card…');
    try { var blob = await renderPNG(); download(blob, 'listening-room-' + S.ref.toLowerCase() + '.png'); note('Card saved. It includes the address, so share it carefully.'); } catch (err) { note('Could not prepare the card. Take a screenshot instead.'); }
    b.disabled = false;
  });
  $('#ics').addEventListener('click', function () {
    var z = function (iso) { return new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, ''); };
    var end = ev.start.slice(0, 11) + ev.end + ':00' + ev.start.slice(19);
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Listening Room//Demo//EN', 'BEGIN:VEVENT', 'UID:' + S.ref + '@listening-room', 'DTSTAMP:' + z(new Date().toISOString()), 'DTSTART:' + z(ev.start), 'DTEND:' + z(end),
      'SUMMARY:' + d.name + ' · ' + s.name, 'LOCATION:' + addrText().replace(/,/g, '\\,'), 'DESCRIPTION:Reference ' + S.ref + '\\nAdmit ' + S.qty + '\\nDemo event', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    download(new Blob([ics], { type: 'text/calendar' }), 'listening-room.ics'); note('Calendar file saved.');
  });
  $('#share').addEventListener('click', async function () {
    var url = location.href.split('?')[0].replace(/pay\.html$/, ''), text = 'I’m going to ' + d.name + ' at ' + s.name + ' · ' + ev.dateLabel + ' · ' + s.city;
    try { if (navigator.share) { await navigator.share({ title: s.name, text: text, url: url }); } else { await navigator.clipboard.writeText(text + ' ' + url); note('Link copied. The address is not included.'); } } catch (err) { /* user cancelled */ }
  });

  /* resume after reload (Zeigarnik / peak-end: the card should still be there) */
  render();
  var saved = load();
  if (saved && saved.status === 'confirmed' && saved.ref) { S.qty = saved.qty || 1; S.name = saved.name || ''; S.ref = saved.ref; $('#f-name').value = S.name; render(); confirmed(true); }
  else if (pay.mode === 'link' && params.get('paid') === '1' && saved && saved.ref) {
    S.qty = saved.qty; S.name = saved.name; S.ref = saved.ref; render(); setState('pending'); k('ref').textContent = S.ref; $('#f').hidden = true; $('#done').hidden = false;
    $('#h').textContent = 'Payment received.'; $('#lede').hidden = true; $('#done-h').hidden = true; $('#step').textContent = 'Step 2 of 2';
    $('#done-p').textContent = 'We are confirming your payment. Your address and ticket are emailed once it clears. The address stays locked on this page until then.'; $('.acts').hidden = true;
  }
})(window);
