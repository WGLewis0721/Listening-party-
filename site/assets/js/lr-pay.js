/* Listening Room · pay page and live customer card: HOLD → PAY → UNLOCK.
   1  Hold   The server holds the seats for 30 minutes. The card appears LOCKED, with the buyer's name on it.
   2  Pay    Hand off to Square's hosted checkout. We never see card data.
   3  Card   Only Square's signed webhook marks the order paid. The card then shows the area, a rotating entry code and a timeline.
   4  Reveal The exact address is released by the server 3 hours before doors, behind a hold-to-reveal, under a live watermark.
   The browser never holds the address except for the 20 seconds after a reveal. This file talks to LR.api only:
   today that is the simulator (lr-api-mock.js); later the real server (server/). */
(function (g) {
  'use strict';
  var LR = g.LR, E = LR && LR.E, T = g.LRTicket;
  var A = (E && E.payment && E.payment.mode === 'live' && LR.apiLive) ? LR.apiLive : (LR && LR.api); if (!E || !A) return;
  var esc = LR.esc, ev = E.event, d = E.dj, s = E.series, root = document.getElementById('lr');
  var params = new URLSearchParams(location.search), embed = /[?&]embed=1/.test(location.search);
  var back = params.get('back');
  var homeHref = (back && /^(\.\.?\/)[\w\-.\/?=&%]*$/.test(back)) ? back : './' + (embed ? '?embed=1' : '');
  var SK = 'lr:pay:' + E.slug;
  var S = { rid: null, tok: null, v: null, qty: 2, revealing: null, polling: null, lastStep: null, lastPhase: null, busy: false };

  function save() { try { localStorage.setItem(SK, JSON.stringify({ rid: S.rid, tok: S.tok })); } catch (e) { } }
  function load() { try { var o = JSON.parse(localStorage.getItem(SK) || 'null'); if (o && o.rid) { S.rid = o.rid; S.tok = o.tok; } } catch (e) { } }
  function clear() { S.rid = S.tok = S.v = null; try { localStorage.removeItem(SK); } catch (e) { } }

  /* ───── markup ───── */
  function build() {
    var foot = '<dl class="tk-hold"><div><dt>Holder</dt><dd data-k="holder">Your name</dd></div><div><dt>Reference</dt><dd data-k="ref">LR-ED' + esc(s.edition) + '-······</dd></div><div><dt>Admit</dt><dd data-k="admit">2</dd></div></dl>';
    root.innerHTML = '' +
      '<a class="skip" href="#h">Skip to the steps</a>' +
      '<header class="bar pay-bar"><a class="brand" href="' + homeHref + '"><span class="brand-mark"></span><b>' + esc(s.name) + '</b><i>Ed. ' + esc(s.edition) + '</i></a><a class="pay-back" href="' + homeHref + '">&larr; ' + esc(d.name) + '</a></header>' +
      '<p class="demo-banner" role="note">Demo · simulated Square checkout · no card is collected · the address lives on a simulated server</p>' +
      '<main class="pay-stage"><canvas class="gl" aria-hidden="true"></canvas><div class="fx scrim" aria-hidden="true"></div><div class="fx grain" aria-hidden="true"></div><div class="fx vignette" aria-hidden="true"></div>' +
      '<div class="pay-grid"><section class="pay-form" aria-labelledby="h">' +
      '<p class="eyebrow" id="step"></p><h1 class="h2" id="h" tabindex="-1"></h1><p class="lede" id="lede"></p>' +
      /* 1 hold */
      '<form class="form" id="f" novalidate>' +
      '<div class="field"><span class="label" id="qlab">Seats</span><div class="step" role="group" aria-labelledby="qlab"><button type="button" id="dec" aria-label="Fewer seats">&minus;</button><output id="qty" aria-live="polite">2</output><button type="button" id="inc" aria-label="More seats">+</button></div></div>' +
      '<div class="field"><label for="f-name">Name on the card</label><input id="f-name" autocomplete="name" required placeholder="Your name" aria-describedby="e-name"><p class="err" id="e-name" role="alert"></p></div>' +
      '<div class="field"><label for="f-email">Email for your card link</label><input id="f-email" type="email" autocomplete="email" inputmode="email" required placeholder="you@email.com" aria-describedby="e-email"><p class="err" id="e-email" role="alert"></p></div>' +
      '<div class="sum"><div><span>Advance ticket × <i id="s-q" style="font-style:normal">2</i></span><b id="s-sub"></b></div><div><span>Fees</span><b>' + LR.money(ev.fee || 0) + '</b></div><div class="tot"><span>Total</span><b id="s-tot"></b></div></div>' +
      '<button class="btn btn--block" id="hold" type="submit"><span id="hold-t">Hold my seats</span>' + LR.icons.arrow + '</button>' +
      '<p class="fine">We hold your seats for 30 minutes. You pay on the next step, on Square’s secure page.</p></form>' +
      /* 2 pay */
      '<div class="panel" id="p-pay" hidden><p class="banner" id="declined" role="alert" hidden>Your payment didn’t go through. Your seats are still held, so you can try again.</p>' +
      '<div class="hold"><span>Seats held for</span><b id="holdleft">30:00</b></div>' +
      '<div class="sum" style="margin:0"><div><span id="pay-line"></span><b id="pay-sub"></b></div><div class="tot"><span>Total</span><b id="pay-tot"></b></div></div>' +
      '<button class="btn btn--block" id="pay" type="button"><span id="pay-t"></span>' + LR.icons.arrow + '</button>' +
      '<p class="fine">You will finish on Square’s page, then come straight back to this card. Nothing unlocks until Square confirms the payment.</p>' +
      '<button class="btn btn--ghost btn--block" id="rel" type="button">Release my seats</button></div>' +
      /* 3 wait */
      '<div class="panel" id="p-wait" hidden><div class="spin" aria-hidden="true"></div><h2>Confirming your payment with Square…</h2><p class="fine" id="wait-note">We unlock your card when Square’s confirmation arrives, not when your browser returns. This usually takes a few seconds.</p></div>' +
      /* 4 ticket */
      '<div class="panel" id="p-ticket" hidden><h2>What happens next</h2><ol class="tl" id="tl"></ol>' +
      '<div class="acts2"><button class="btn" id="save" type="button">Save card image</button><button class="btn btn--ghost" id="ics" type="button">Add to calendar</button></div>' +
      '<div class="card-prev" id="prev" hidden><img id="prev-img" alt="Your card as an image"><p class="fine">Press and hold the image (or right-click it) to save it. The image never contains the address.</p></div>' +
      '<p class="fine" id="status" role="status"></p>' +
      '<p class="fine">Your card is personal and tied to your name. The entry code refreshes every 30 seconds, so a screenshot will not get anyone in, and the door checks the name on the list.</p>' +
      '<button class="btn btn--ghost btn--block" id="copylink" type="button">Copy my private card link</button><button class="btn btn--ghost btn--block" id="again" type="button">Reserve another</button></div>' +
      /* expired */
      '<div class="panel" id="p-expired" hidden><h2 id="exp-h">Your hold ended</h2><p class="fine">The seats went back on sale. You can hold them again if any are left.</p><button class="btn btn--block" id="restart" type="button">Start again</button></div>' +
      '</section>' +
      '<aside class="pay-card" aria-label="Your card">' + LR.ticketHTML({ state: 'locked', foot: foot, qty: 2, seatsText: ev.capacity + ' total' }) + '</aside></div></main>' +
      '<div class="sq" id="sq" hidden role="dialog" aria-modal="true" aria-labelledby="sq-h"><div class="sq-box"><p class="sq-sim">Simulation · no card is collected</p><div class="sq-in"><h2 id="sq-h">Square-hosted checkout</h2>' +
      '<div class="row"><span id="sq-line"></span><b id="sq-tot"></b></div><p>In production this is Square’s own page. You would enter a card or use Apple Pay or Google Pay there, and we never see the details.</p>' +
      '<button class="btn btn--block" id="sq-ok" type="button">Simulate a successful payment</button><button class="btn alt btn--block" id="sq-no" type="button">Simulate a declined card</button><button class="btn alt btn--block" id="sq-x" type="button">Back to Listening Room</button></div></div></div>' +
      '<p class="sr" id="live" aria-live="polite"></p>' +
      '<footer class="foot"><span>' + esc(E.footer.left) + ' ' + esc(A.notice || '') + '</span><span>' + E.footer.right + '</span></footer>';
  }
  build();
  var $ = function (q, el) { return (el || root).querySelector(q); };
  var tk = $('.tk'), art = LR.mountArt($('.gl'), { E: E, fps: 30, prog: .55, safe: true });
  var plate = LR.mountArt($('.tk-plate canvas'), { E: E, fps: 24, prog: .6, seed: 7, timeOffset: 30, dprMax: 1.5, keep: true }), plateCanvas = $('.tk-plate canvas');
  LR.tilt(tk, 5); LR.magnet($('#hold'), .12);
  function k(n) { return tk.querySelector('[data-k="' + n + '"]'); }
  function say(t) { $('#live').textContent = t; }
  function note(t) { $('#status').textContent = t; }
  function first(n) { return (n || '').trim().split(/\s+/)[0] || 'friend'; }
  function panel(id) { ['f', 'p-pay', 'p-wait', 'p-ticket', 'p-expired'].forEach(function (x) { var el = $('#' + x); if (el) el.hidden = x !== id; }); }
  function head(step, h, lede) { $('#step').textContent = step; $('#h').textContent = h; $('#lede').textContent = lede || ''; $('#lede').hidden = !lede; }
  function nowMs() { return S.v ? S.v.serverNow + (Date.now() - S.v.fetchedAt) : Date.now(); }
  function total(q) { return q * ev.price + (ev.fee || 0) * q; }

  /* ───── step 1: hold ───── */
  function money() { $('#qty').textContent = S.qty; $('#s-q').textContent = S.qty; $('#s-sub').textContent = LR.money(ev.price * S.qty); $('#s-tot').textContent = LR.money(total(S.qty)); $('#dec').disabled = S.qty <= 1; $('#inc').disabled = S.qty >= (ev.maxQty || 4); k('qty').textContent = S.qty; k('sub').textContent = LR.money(ev.price * S.qty); k('admit').textContent = S.qty; }
  $('#dec').addEventListener('click', function () { if (S.qty > 1) { S.qty--; money(); } });
  $('#inc').addEventListener('click', function () { if (S.qty < (ev.maxQty || 4)) { S.qty++; money(); } });
  $('#f-name').addEventListener('input', function (e) { k('holder').textContent = e.target.value.trim() || 'Your name'; });
  $('#f').addEventListener('submit', async function (e) {
    e.preventDefault(); if (S.busy) return;
    var name = $('#f-name').value, email = $('#f-email').value, okN = name.trim().length >= 2, okE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    $('#f-name').setAttribute('aria-invalid', String(!okN)); $('#e-name').textContent = okN ? '' : 'Add the name for the card.';
    $('#f-email').setAttribute('aria-invalid', String(!okE)); $('#e-email').textContent = okE ? '' : 'Enter a valid email so we can send your card link.';
    if (!okN) { $('#f-name').focus(); return; } if (!okE) { $('#f-email').focus(); return; }
    S.busy = true; var b = $('#hold'); b.disabled = true; $('#hold-t').textContent = 'Holding your seats…';
    try { var r = await A.reserve({ E: E, name: name, email: email, qty: S.qty }); S.rid = r.rid; S.tok = r.token; save(); await refresh(); $('#h').focus({ preventScroll: true }); }
    catch (err) { $('#e-email').textContent = err.message || 'Something went wrong. Please try again.'; }
    S.busy = false; b.disabled = false; $('#hold-t').textContent = 'Hold my seats';
  });

  /* ───── step 2: pay ───── */
  $('#pay').addEventListener('click', async function () {
    var b = this; b.disabled = true;
    try { var o = await A.startCheckout(S.rid, S.tok); if (o && o.url) { g.location.href = o.url; return; } openSquare(o); } catch (err) { await refresh(); }
    b.disabled = false;
  });
  $('#rel').addEventListener('click', async function () { try { await A.release(S.rid, S.tok); } catch (e) { } clear(); showForm(); say('Your seats were released.'); });
  function openSquare(o) {
    var v = S.v; $('#sq-line').textContent = v.qty + ' × advance ticket · ' + d.name; $('#sq-tot').textContent = LR.money(v.total); $('#sq').hidden = false; $('#sq-ok').focus();
  }
  function closeSquare() { $('#sq').hidden = true; }
  $('#sq-ok').addEventListener('click', function () {
    closeSquare(); A.simulateSquare(S.rid, 'paid');                       // the "webhook" arrives about a second and a half later
    return refresh().then(function () { startPolling(); });
  });
  $('#sq-no').addEventListener('click', async function () { await A.simulateSquare(S.rid, 'declined'); closeSquare(); await refresh(); say('Your payment didn’t go through.'); });
  $('#sq-x').addEventListener('click', async function () { await A.simulateSquare(S.rid, 'cancelled'); closeSquare(); await refresh(); });
  g.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#sq').hidden) $('#sq-x').click(); });

  /* ───── step 3: waiting for the webhook ───── */
  function startPolling() {
    stopPolling(); var n = 0;
    S.polling = setInterval(async function () { n++; await refresh(true); if (!S.v || S.v.state !== 'pending' || n > 40) { stopPolling(); if (S.v && S.v.state === 'pending') $('#wait-note').textContent = 'This is taking longer than usual. You can close this page: your card link is emailed as soon as Square confirms.'; } }, 900);
  }
  function stopPolling() { if (S.polling) { clearInterval(S.polling); S.polling = null; } }

  /* ───── render from the server's view of the ticket ───── */
  var STATUS = { held: 'Held', pending: 'Confirming', expired: 'Expired', cancelled: 'Released', locked: 'Paid', ready: 'Ready', doors: 'Doors', in: 'Checked in', over: 'Ended' };
  function showForm() { S.v = null; tk.setAttribute('data-state', 'locked'); tk.setAttribute('data-phase', 'none'); resetCard(); head('Step 1 of 3 · Hold', 'Your seat for ' + d.name, 'Hold your seats for 30 minutes, then pay on Square’s secure page. Your card appears right away and unlocks the moment you’re paid.'); panel('f'); money(); }
  function resetCard() {
    k('state').textContent = 'Locked'; k('ref').textContent = 'LR-ED' + s.edition + '-······'; k('area').hidden = true; k('lockLabel').textContent = ev.venueLockedLabel; k('qr').innerHTML = ''; k('qrcap').textContent = ''; k('door').hidden = true; k('act').hidden = true; k('act').removeAttribute('data-key');
    tk.querySelector('.tk-loc').classList.remove('is-revealed');
    k('addr').innerHTML = '<span aria-hidden="true">' + esc(ev.venueDecoy) + '</span><span class="sr">' + esc(ev.venueLockedLabel) + '</span>';
  }
  function render(v) {
    S.v = v; var st = v.state, ph = v.phase;
    k('holder').textContent = v.name; k('qty').textContent = v.qty; k('sub').textContent = LR.money(ev.price * v.qty); k('admit').textContent = v.qty;
    var paid = st === 'paid';
    k('ref').textContent = paid ? v.ref : v.ref.slice(0, 8) + '······';
    tk.setAttribute('data-state', paid ? 'confirmed' : (st === 'pending' ? 'pending' : 'locked'));
    tk.setAttribute('data-phase', paid ? ph : st);
    k('state').textContent = paid ? STATUS[ph === 'in' ? 'in' : ph] : STATUS[st] || 'Locked';
    if (st === 'held') { head('Step 2 of 3 · Pay', 'Almost there, ' + first(v.name) + '.', 'Your seats are held and your card is waiting. Pay on Square to unlock it.'); panel('p-pay'); $('#pay-line').textContent = v.qty + ' × advance ticket'; $('#pay-sub').textContent = LR.money(ev.price * v.qty); $('#pay-tot').textContent = LR.money(v.total); $('#pay-t').textContent = 'Pay ' + LR.money(v.total) + ' with Square'; $('#declined').hidden = !v.declined; }
    else if (st === 'pending') { head('Step 2 of 3 · Pay', 'Confirming with Square…', ''); panel('p-wait'); }
    else if (st === 'expired' || st === 'cancelled') { head('Your hold ended', st === 'cancelled' ? 'Seats released.' : 'Time ran out.', ''); $('#exp-h').textContent = st === 'cancelled' ? 'You released your seats' : 'Your hold ended'; panel('p-expired'); resetCard(); }
    else if (paid) { head('Step 3 of 3 · Your card', 'You’re in, ' + first(v.name) + '.', ''); panel('p-ticket'); paintPaid(v); }
    paintHold();
  }
  function paintPaid(v) {
    var ph = v.phase, t = v.times, u = LR.fmtEvent(t.unlockAt, E), p = LR.fmtEvent(t.phraseAt, E), st = LR.fmtEvent(t.start, E);
    var area = k('area'); area.hidden = false; area.textContent = v.area || ev.venueArea;
    var act = k('act'), door = k('door');
    if (ph === 'locked') { k('lockLabel').textContent = 'Address ' + u.day + ' ' + u.time; act.hidden = true; }
    else if (ph === 'ready' || ph === 'doors') { k('lockLabel').textContent = S.revealing ? 'Revealed' : 'Ready'; if (!S.revealing) revealUI(v); }
    else if (ph === 'in') { k('lockLabel').textContent = 'Checked in'; act.hidden = true; }
    else { k('lockLabel').textContent = 'Event ended'; act.hidden = true; }
    if (v.doorPhrase && ph !== 'over') { door.hidden = false; door.innerHTML = '<span class="label">Door phrase · say it at the door</span><b>' + esc(v.doorPhrase) + '</b>'; } else door.hidden = true;
    if (ph === 'in') { k('state').textContent = 'Checked in ' + LR.fmtEvent(v.checkedInAt, E).time; }
    paintQR(v); paintTimeline(v, u, p, st);
  }
  function paintQR(v) { if (!v.qr) return; if (S.lastStep !== v.qrStep) { S.lastStep = v.qrStep; k('qr').innerHTML = LR.qrSVG(v.qr); } }
  function paintTimeline(v, u, p, st) {
    var ph = v.phase, idx = { locked: 1, ready: 2, doors: 3, in: 4, over: 4 }[ph] || 1, pa = LR.fmtEvent(v.paidAt || nowMs(), E);
    var items = [['Seats confirmed', 'Paid ' + pa.day + ' ' + pa.date + ', ' + pa.time], ['Address unlocks on this card', u.day + ' ' + u.date + ', ' + u.time + ' · 3 hours before doors'], ['Door phrase appears', p.time + ' · 30 minutes before doors'], ['Doors', st.time + ' · show the live code, we check your name']];
    $('#tl').innerHTML = items.map(function (it, i) { var cls = i < idx ? 'done' : (i === idx ? 'now' : ''); return '<li class="' + cls + '"><span class="dot" aria-hidden="true">' + (i < idx ? '✓' : i + 1) + '</span><div><b>' + it[0] + '</b><span data-i="' + i + '">' + it[1] + '</span></div></li>'; }).join('');
  }

  /* ───── live ticking: countdowns, rotating code, phase changes ───── */
  function paintHold() {
    if (!S.v) return; var v = S.v, n = nowMs();
    if (v.state === 'held' || v.state === 'pending') { var left = v.holdUntil - n; $('#holdleft').textContent = LR.fmtDur(left).replace(/^(\d+)m (\d+)s$/, function (_, m, x) { return (m < 10 ? '0' : '') + m + ':' + x; }); if (left > 0) k('state').textContent = 'Held ' + LR.fmtDur(left).replace('m ', ':').replace('s', ''); }
    if (v.state === 'paid') {
      var t = v.times, ph = v.phase;
      if (ph === 'locked') { k('lockLabel').textContent = 'Address in ' + LR.fmtDur(t.unlockAt - n); k('area').hidden = false; }
      var qs = T.qrStep(n), into = (n / 1000) % T.STEP_S; tk.style.setProperty('--qr-left', (1 - into / T.STEP_S).toFixed(3)); k('qrcap').textContent = 'Live code · refreshes in ' + Math.ceil(T.STEP_S - into) + 's';
      if (qs !== v.qrStep || (ph === 'locked' && n >= t.unlockAt) || (ph === 'ready' && n >= t.phraseAt) || (ph === 'doors' && n >= t.end)) { if (!S.refreshing) { S.refreshing = true; refresh(true).then(function () { S.refreshing = false; }); } }
    } else if ((v.state === 'held') && v.holdUntil <= n && !S.refreshing) { S.refreshing = true; refresh(true).then(function () { S.refreshing = false; }); }
  }
  setInterval(function () { paintHold(); tickReveal(); }, 1000);
  g.addEventListener('lr:clock', function () { refresh(true); });
  g.addEventListener('storage', function (e) { if (e.key === 'lr:mock:v1' && S.rid) refresh(true); });

  /* ───── step 4: hold-to-reveal, watermark, auto-hide ───── */
  function revealUI(v) {
    var act = k('act'); if (S.revealing) return; act.hidden = false;
    /* idempotent: the card refreshes every 30s (rotating code); never rebuild a button the buyer may be pressing */
    var key = v.revealsLeft + '|' + v.revealSeconds; if (act.getAttribute('data-key') === key && (act.querySelector('#rv') || act.querySelector('.lim'))) return; act.setAttribute('data-key', key);
    if (v.revealsLeft <= 0) { act.innerHTML = '<p class="fine lim">You have used all 3 reveals. Message the host if you need the address again.</p>'; return; }
    act.innerHTML = '<button class="reveal-btn" id="rv" type="button" aria-describedby="rv-help"><span>Hold to reveal the address</span></button>' +
      '<p class="fine" id="rv-help">Hold for one second. The address hides again after ' + v.revealSeconds + ' seconds or when you switch away. ' + v.revealsLeft + ' of 3 reveals left.</p>' +
      '<label class="tap"><input type="checkbox" id="tapmode"> Can’t hold? Reveal with a tap</label>';
    bindHold($('#rv'));
  }
  function bindHold(b) {
    var HOLD = 900, T0 = 0, raf = 0, fired = false, lastDown = 0, tap = $('#tapmode');
    function prog(p) { b.style.setProperty('--hold', (p * 100).toFixed(1) + '%'); b.setAttribute('data-held', p > .5 ? '1' : '0'); }
    function begin() { if (b.disabled || S.revealing || (tap && tap.checked)) return; fired = false; lastDown = Date.now(); T0 = performance.now(); (function loop() { var p = Math.min(1, (performance.now() - T0) / HOLD); prog(p); if (p >= 1) { if (!fired) { fired = true; doReveal(); } return; } raf = requestAnimationFrame(loop); })(); }
    function end() { cancelAnimationFrame(raf); if (!fired) prog(0); }
    b.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button !== 0) return; begin(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { b.addEventListener(n, end); });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    b.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); begin(); } });
    b.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') end(); });
    b.addEventListener('click', function () { if ((tap && tap.checked) || Date.now() - lastDown > 2500) doReveal(); });   // tap mode, or a screen reader activating the button
  }
  async function doReveal() {
    if (S.revealing) return; S.revealing = { pending: true }; var b = $('#rv'); if (b) b.disabled = true;
    try {
      var r = await A.reveal(S.rid, S.tok);
      if (!r.ok) { S.revealing = null; var why = { too_early: 'The address isn’t released yet.', limit: 'You have used all 3 reveals.', over: 'This event has ended.', unpaid: 'Payment isn’t confirmed yet.' }[r.reason] || 'The address isn’t available right now.'; say(why); note(why); await refresh(true); return; }
      showAddress(r);
    } catch (err) { S.revealing = null; await refresh(true); }
  }
  function showAddress(r) {
    var loc = tk.querySelector('.tk-loc'), act = k('act'); k('addr').textContent = r.address; loc.classList.add('is-revealed'); k('lockLabel').textContent = 'Revealed';
    S.revealing = { end: Date.now() + r.seconds * 1000, total: r.seconds, left: r.revealsLeft };
    act.hidden = false; act.innerHTML = '<div class="tk-live"><span id="lv-clock"></span><span id="lv-left"></span></div><div class="tk-bar"><i id="lv-bar"></i></div><p class="fine">Watermarked with your name and the time. It hides on its own, and when you switch away. ' + r.revealsLeft + ' of 3 reveals left.</p>';
    say('Address revealed. It hides in ' + r.seconds + ' seconds.'); tickReveal();
    requestAnimationFrame(function () { var bar = $('#lv-bar'); if (bar) bar.style.width = '100%'; });
  }
  function wm(text) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="250" height="84"><text x="125" y="46" text-anchor="middle" transform="rotate(-16 125 42)" font-family="ui-monospace,monospace" font-size="12" font-weight="700" fill="#ffffff" fill-opacity=".24">' + text.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text></svg>';
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
  }
  function tickReveal() {
    var r = S.revealing; if (!r || r.pending || !S.v) return;
    var left = Math.max(0, Math.ceil((r.end - Date.now()) / 1000)), n = nowMs(), f = LR.fmtEvent(n, E);
    var c = $('#lv-clock'), l = $('#lv-left'), bar = $('#lv-bar'); if (c) c.textContent = 'LIVE · ' + f.clock; if (l) l.textContent = 'Hides in ' + left + 's'; if (bar) bar.style.width = (left / r.total * 100).toFixed(1) + '%';
    k('wm').style.backgroundImage = wm(S.v.name + ' · ' + S.v.ref + ' · ' + f.clock);
    if (left <= 0) hideAddress('time');
  }
  function hideAddress(why) {
    if (!S.revealing || S.revealing.pending) return; S.revealing = null;
    var loc = tk.querySelector('.tk-loc'); loc.classList.remove('is-revealed'); k('wm').style.backgroundImage = 'none';
    k('addr').innerHTML = '<span aria-hidden="true">' + esc(ev.venueDecoy) + '</span><span class="sr">' + esc(ev.venueLockedLabel) + '</span>';
    say(why === 'away' ? 'Address hidden because you switched away.' : 'Address hidden.'); refresh(true);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) hideAddress('away'); });
  g.addEventListener('blur', function () { hideAddress('away'); });
  g.addEventListener('pagehide', function () { hideAddress('away'); });

  /* ───── exports: nothing here contains the address ───── */
  function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  $('#save').addEventListener('click', async function () {
    var b = this; b.disabled = true; note('Preparing your card…');
    try { if (plate) plate.redraw(); var blob = await LR.cardPNG({ E: E, name: S.v.name, qty: S.v.qty, ref: S.v.ref, plate: plateCanvas }); var img = $('#prev-img'); if (img.dataset.u) URL.revokeObjectURL(img.dataset.u); img.dataset.u = URL.createObjectURL(blob); img.src = img.dataset.u; $('#prev').hidden = false; download(blob, 'listening-room-' + S.v.ref.toLowerCase() + '.png'); note('Your card image is below. It shows your name and the area, never the address or the entry code.'); }
    catch (err) { note('Could not prepare the image. Take a screenshot of the card instead.'); }
    b.disabled = false;
  });
  $('#ics').addEventListener('click', function () {
    var v = S.v, z = function (iso) { return new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, ''); }, end = ev.start.slice(0, 11) + ev.end + ':00' + ev.start.slice(19);
    var link = location.origin + location.pathname;
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Listening Room//Demo//EN', 'BEGIN:VEVENT', 'UID:' + v.ref + '@listening-room', 'DTSTAMP:' + z(new Date().toISOString()), 'DTSTART:' + z(ev.start), 'DTEND:' + z(end),
      'SUMMARY:' + d.name + ' · ' + s.name, 'LOCATION:' + (ev.venueArea || '') + ' (address unlocks 3 hours before doors)', 'DESCRIPTION:Reference ' + v.ref + '\\nAdmit ' + v.qty + '\\nYour exact address unlocks on your private card 3 hours before doors.\\nDemo event', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    download(new Blob([ics], { type: 'text/calendar' }), 'listening-room.ics'); note('Calendar file sent. It holds the area only. If nothing downloaded, add it by hand: ' + LR.fmtEvent(Date.parse(ev.start), E).day + ' · ' + LR.time12(ev.doors) + ' · ' + (ev.venueArea || '') + '.');
  });
  $('#copylink').addEventListener('click', async function () {
    var url = location.origin + location.pathname + '?r=' + encodeURIComponent(S.rid) + '#k=' + encodeURIComponent(S.tok);
    try { await navigator.clipboard.writeText(url); note('Copied. Keep it private: anyone with this link can open your card.'); } catch (e) { note('Copy didn’t work here. This link opens your card, so keep it private.'); }
  });
  $('#again').addEventListener('click', function () { clear(); stopPolling(); showForm(); say('Start a new reservation.'); });
  $('#restart').addEventListener('click', function () { clear(); showForm(); });

  /* ───── data loop ───── */
  async function refresh(quiet) {
    if (!S.rid) return;
    try { var v = await A.ticket(S.rid, S.tok); render(v); }
    catch (err) { if (err.code === 'not_found' || err.code === 'forbidden') { clear(); showForm(); if (!quiet) $('#e-email').textContent = err.message; } }
  }

  /* ───── boot: magic link (?r=… #k=…), or resume, or a fresh form ───── */
  var hash = (location.hash.match(/k=([^&]+)/) || [])[1];
  if (params.get('r') && hash) { S.rid = params.get('r'); S.tok = decodeURIComponent(hash); save(); try { history.replaceState(null, '', location.pathname + (embed ? '?embed=1' : '')); } catch (e) { } } else load();
  money();
  if (S.rid) { refresh().then(function () { if (S.v && S.v.state === 'pending') startPolling(); }); } else showForm();
  $('#f').hidden = !!S.rid;
})(window);
