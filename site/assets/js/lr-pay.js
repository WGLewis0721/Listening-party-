/* Listening Room · pay page and live customer card.
   What the buyer does: fill in a name and an email, tap Pay, pay on Square, get a card. That is all they ever have to learn.
   Behind that one button: the server holds the seats for 30 minutes, Square's signed webhook (not the browser) marks the order paid,
   the exact address is released by the server 3 hours before doors and shown on a tap, under a live watermark.
   Every screen shows ONE headline, ONE sentence and ONE obvious button; everything else lives under "More".
   The browser never holds the address except for the 45 seconds after a tap. This file talks to LR.api only:
   today that is the simulator (lr-api-mock.js); later the real server (server/). */
(function (g) {
  'use strict';
  var LR = g.LR, E = LR && LR.E, T = g.LRTicket;
  var A = (E && E.payment && E.payment.mode === 'live' && LR.apiLive) ? LR.apiLive : (LR && LR.api); if (!E || !A) return;
  var esc = LR.esc, ev = E.event, d = E.dj, s = E.series, root = document.getElementById('lr');
  var params = new URLSearchParams(location.search), embed = /[?&]embed=1/.test(location.search);
  var back = params.get('back');
  var homeHref = (back && /^(\.\.?\/)[\w\-.\/?=&%]*$/.test(back)) ? back : './' + (embed ? '?embed=1' : '');
  var about = (function () { try { return new URL('../../', document.currentScript.src).href.replace(/site\/$/, ''); } catch (e) { return './'; } })();     // the plain pages (privacy, terms…) live at the site root, whether this page is the root copy, /site/ or a concept
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
      '<p class="demo-banner" role="note">Demo · no real payment is taken</p>' +
      '<main class="pay-stage"><canvas class="gl" aria-hidden="true"></canvas><div class="fx scrim" aria-hidden="true"></div><div class="fx grain" aria-hidden="true"></div><div class="fx vignette" aria-hidden="true"></div>' +
      '<div class="pay-grid"><section class="pay-form" aria-labelledby="h">' +
      '<p class="eyebrow" id="step"></p><h1 class="h2" id="h" tabindex="-1"></h1><p class="lede" id="lede"></p>' +
      /* 1 · the form: one button */
      '<form class="form" id="f" novalidate>' +
      '<div class="seatrow"><div class="field"><span class="label" id="qlab">Seats</span><div class="step" role="group" aria-labelledby="qlab"><button type="button" id="dec" aria-label="Fewer seats">&minus;</button><output id="qty" aria-live="polite">2</output><button type="button" id="inc" aria-label="More seats">+</button></div></div><div class="sumline" aria-live="polite"><span class="label">Total</span><b id="s-tot"></b></div></div>' +
      '<div class="field"><label for="f-name">Your name</label><input id="f-name" autocomplete="name" required placeholder="First and last name" aria-describedby="e-name"><p class="err" id="e-name" role="alert"></p></div>' +
      '<div class="field"><label for="f-email">Your email</label><input id="f-email" type="email" autocomplete="email" inputmode="email" required placeholder="you@email.com" aria-describedby="e-email"><p class="err" id="e-email" role="alert"></p></div>' +
      '<button class="btn btn--block" id="go" type="submit"><span id="go-t">Pay</span>' + LR.icons.arrow + '</button>' +
      '<p class="fine">You pay on Square’s secure page, then come straight back here.</p></form>' +
      /* 2 · came back without paying */
      '<div class="panel" id="p-pay" hidden><p class="banner" id="declined" role="alert" hidden>That payment didn’t go through. Your seats are still saved, so you can try again.</p>' +
      '<div class="hold"><span>Seats saved for</span><b id="holdleft">30:00</b></div>' +
      '<button class="btn btn--block" id="pay" type="button"><span id="pay-t"></span>' + LR.icons.arrow + '</button>' +
      '<button class="linkbtn" id="rel" type="button">Cancel and give the seats back</button></div>' +
      /* 3 · waiting for Square */
      '<div class="panel" id="p-wait" hidden><div class="spin" aria-hidden="true"></div><h2>Checking your payment…</h2><p class="fine" id="wait-note">This takes a few seconds. Please keep this page open.</p></div>' +
      /* 4 · the card is ready */
      '<div class="panel" id="p-ticket" hidden><p class="next" id="next"></p>' +
      '<button class="btn btn--block" id="ics" type="button">Add to my calendar</button>' +
      '<div class="card-prev" id="prev" hidden><img id="prev-img" alt="Your card as an image"><p class="fine">Press and hold the picture to save it. It never shows the address.</p></div>' +
      '<p class="fine" id="status" role="status"></p>' +
      '<details class="more" id="more"><summary>More</summary><div class="more-in"><button class="btn btn--ghost btn--block" id="save" type="button">Save my card as a picture</button><button class="btn btn--ghost btn--block" id="copylink" type="button">Copy my card link</button><button class="btn btn--ghost btn--block" id="again" type="button">Get more seats</button></div></details></div>' +
      /* seats went back */
      '<div class="panel" id="p-expired" hidden><h2 id="exp-h">Those seats were given back</h2><p class="fine">If there are seats left, you can pick them again.</p><button class="btn btn--block" id="restart" type="button">Start over</button></div>' +
      '</section>' +
      '<aside class="pay-card" aria-label="Your card">' + LR.ticketHTML({ state: 'locked', foot: foot, qty: 2, seatsText: ev.capacity + ' total' }) + '</aside></div></main>' +
      '<div class="sq" id="sq" hidden role="dialog" aria-modal="true" aria-labelledby="sq-h"><div class="sq-box"><p class="sq-sim">Demo · pretend Square page</p><div class="sq-in"><h2 id="sq-h">Square checkout</h2>' +
      '<div class="row"><span id="sq-line"></span><b id="sq-tot"></b></div><p>The real one is Square’s own page: you pay with a card, Apple Pay or Google Pay. We never see your card.</p>' +
      '<button class="btn btn--block" id="sq-ok" type="button">Pay (demo)</button><button class="btn alt btn--block" id="sq-no" type="button">Card declined (demo)</button><button class="btn alt btn--block" id="sq-x" type="button">Go back</button></div></div></div>' +
      '<p class="sr" id="live" aria-live="polite"></p>' +
      '<footer class="foot"><span>' + esc(E.footer.left) + ' ' + esc(A.notice || '') + '</span><span>' + E.footer.right + '</span><nav class="foot-links" aria-label="About this site"><a href="' + about + 'privacy.html">Privacy</a> · <a href="' + about + 'terms.html">Terms</a> · <a href="' + about + 'accessibility.html">Accessibility</a> · <a href="' + about + 'sitemap.html">Site map</a></nav></footer>';
  }
  build();
  var $ = function (q, el) { return (el || root).querySelector(q); };
  var tk = $('.tk'), art = LR.mountArt($('.gl'), { E: E, fps: 30, prog: .55, safe: true });
  var plate = LR.mountArt($('.tk-plate canvas'), { E: E, fps: 24, prog: .6, seed: 7, timeOffset: 30, dprMax: 1.5, keep: true }), plateCanvas = $('.tk-plate canvas');
  LR.tilt(tk, 5); LR.magnet($('#go'), .12);
  function k(n) { return tk.querySelector('[data-k="' + n + '"]'); }
  function say(t) { $('#live').textContent = t; }
  function note(t) { $('#status').textContent = t; }
  function first(n) { return (n || '').trim().split(/\s+/)[0] || 'friend'; }
  function panel(id) {
    var changed = S.panel !== id; S.panel = id; $('.pay-grid').setAttribute('data-view', id);
    ['f', 'p-pay', 'p-wait', 'p-ticket', 'p-expired'].forEach(function (x) { var el = $('#' + x); if (el) el.hidden = x !== id; });
    if (changed) { try { g.scrollTo(0, 0); } catch (e) { } }                          // a new screen always starts at the top
  }
  function head(step, h, lede) { $('#step').textContent = step; $('#h').textContent = h; $('#lede').textContent = lede || ''; $('#lede').hidden = !lede; }
  function nowMs() { return S.v ? S.v.serverNow + (Date.now() - S.v.fetchedAt) : Date.now(); }
  function total(q) { return q * ev.price + (ev.fee || 0) * q; }
  function lead(min) { return min % 60 === 0 ? (min / 60) + (min === 60 ? ' hour' : ' hours') : min + ' minutes'; }
  var unlockLead = lead((ev.release && ev.release.unlockLeadMin) || 180);
  function seatsWord(n) { return n + (n === 1 ? ' seat' : ' seats'); }

  /* ───── the form: one button ───── */
  function money() { $('#qty').textContent = S.qty; $('#s-tot').textContent = LR.money(total(S.qty)); $('#go-t').textContent = 'Pay ' + LR.money(total(S.qty)); $('#dec').disabled = S.qty <= 1; $('#inc').disabled = S.qty >= (ev.maxQty || 4); k('qty').textContent = S.qty; k('sub').textContent = LR.money(ev.price * S.qty); k('admit').textContent = S.qty; }
  $('#dec').addEventListener('click', function () { if (S.qty > 1) { S.qty--; money(); } });
  $('#inc').addEventListener('click', function () { if (S.qty < (ev.maxQty || 4)) { S.qty++; money(); } });
  $('#f-name').addEventListener('input', function (e) { k('holder').textContent = e.target.value.trim() || 'Your name'; });
  $('#f').addEventListener('submit', async function (e) {
    e.preventDefault(); if (S.busy) return;
    var name = $('#f-name').value, email = $('#f-email').value, okN = name.trim().length >= 2, okE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    $('#f-name').setAttribute('aria-invalid', String(!okN)); $('#e-name').textContent = okN ? '' : 'Please type your name.';
    $('#f-email').setAttribute('aria-invalid', String(!okE)); $('#e-email').textContent = okE ? '' : 'Please check your email. We send your card there.';
    if (!okN) { $('#f-name').focus(); return; } if (!okE) { $('#f-email').focus(); return; }
    S.busy = true; var b = $('#go'); b.disabled = true; $('#go-t').textContent = 'One moment…';
    try { var r = await A.reserve({ E: E, name: name, email: email, qty: S.qty }); S.rid = r.rid; S.tok = r.token; save(); await goPay(); }
    catch (err) { $('#e-email').textContent = err.message || 'Something went wrong. Please try again.'; }
    S.busy = false; b.disabled = false; money();
  });

  /* ───── pay: the server holds the seats, then we hand off to Square ───── */
  async function goPay() {
    var o = await A.startCheckout(S.rid, S.tok);
    if (o && o.url) { g.location.href = o.url; return; }                 // real: off to Square's page
    await refresh(); openSquare(o);                                          // demo: the stand-in page
  }
  $('#pay').addEventListener('click', async function () {
    var b = this; b.disabled = true;
    try { await goPay(); } catch (err) { await refresh(); }
    b.disabled = false;
  });
  $('#rel').addEventListener('click', async function () { try { await A.release(S.rid, S.tok); } catch (e) { } clear(); showForm(); say('Your seats were given back.'); });
  function openSquare() {
    var v = S.v; if (!v) return; $('#sq-line').textContent = seatsWord(v.qty) + ' · ' + d.name; $('#sq-tot').textContent = LR.money(v.total); $('#sq').hidden = false; $('#sq-ok').focus();
  }
  function closeSquare() { $('#sq').hidden = true; }
  $('#sq-ok').addEventListener('click', function () {
    closeSquare(); A.simulateSquare(S.rid, 'paid');                       // the "webhook" arrives about a second and a half later
    return refresh().then(function () { startPolling(); });
  });
  $('#sq-no').addEventListener('click', async function () { await A.simulateSquare(S.rid, 'declined'); closeSquare(); await refresh(); say('Your payment didn’t go through.'); });
  $('#sq-x').addEventListener('click', async function () { await A.simulateSquare(S.rid, 'cancelled'); closeSquare(); await refresh(); });
  g.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#sq').hidden) $('#sq-x').click(); });

  /* ───── waiting for Square's confirmation ───── */
  function startPolling() {
    stopPolling(); var n = 0;
    S.polling = setInterval(async function () { n++; await refresh(true); if (!S.v || S.v.state !== 'pending' || n > 40) { stopPolling(); if (S.v && S.v.state === 'pending') $('#wait-note').textContent = 'Still working on it. You can close this page: we email your card as soon as the payment is confirmed.'; } }, 900);
  }
  function stopPolling() { if (S.polling) { clearInterval(S.polling); S.polling = null; } }

  /* ───── render from the server's view of the ticket ───── */
  var STATUS = { held: 'Not paid yet', pending: 'Checking', expired: 'Expired', cancelled: 'Cancelled', locked: 'Paid', ready: 'Ready', doors: 'Open now', in: 'Checked in', over: 'Ended' };
  function showForm() {
    S.v = null; tk.setAttribute('data-state', 'locked'); tk.setAttribute('data-phase', 'none'); resetCard();
    head(d.name + ' · ' + ev.dateLabel, 'Get your seats', 'Your card appears the moment you pay. The address arrives ' + unlockLead + ' before doors.'); panel('f'); $('#f').hidden = false; money();
  }
  function resetCard() {
    k('state').textContent = 'Locked'; k('ref').textContent = 'LR-ED' + s.edition + '-······'; k('area').hidden = true; k('lockLabel').textContent = ev.venueLockedLabel; k('qr').innerHTML = ''; k('qrcap').textContent = ''; k('door').hidden = true; k('act').hidden = true; k('act').removeAttribute('data-key');
    tk.querySelector('.tk-loc').classList.remove('is-revealed'); S.lastStep = null;
    k('addr').innerHTML = '<span aria-hidden="true">' + esc(ev.venueDecoy) + '</span><span class="sr">' + esc(ev.venueLockedLabel) + '</span>';
  }
  function render(v) {
    S.v = v; var st = v.state, ph = v.phase;
    k('holder').textContent = v.name; k('qty').textContent = v.qty; k('sub').textContent = LR.money(ev.price * v.qty); k('admit').textContent = v.qty;
    var paid = st === 'paid';
    k('ref').textContent = paid ? v.ref : v.ref.slice(0, 8) + '······';
    tk.setAttribute('data-state', paid ? 'confirmed' : (st === 'pending' ? 'pending' : 'locked'));
    tk.setAttribute('data-phase', paid ? ph : st);
    k('state').textContent = paid ? STATUS[ph] : STATUS[st] || 'Locked';
    $('#f').hidden = true;
    if (st === 'held') { head(d.name + ' · ' + ev.dateLabel, 'Finish paying, ' + first(v.name) + '.', seatsWord(v.qty) + (v.qty === 1 ? ' is' : ' are') + ' saved for you.'); panel('p-pay'); $('#pay-t').textContent = 'Pay ' + LR.money(v.total); $('#declined').hidden = !v.declined; }
    else if (st === 'pending') { head(d.name + ' · ' + ev.dateLabel, 'Almost there…', ''); panel('p-wait'); }
    else if (st === 'expired' || st === 'cancelled') { head(d.name + ' · ' + ev.dateLabel, 'Those seats were given back.', ''); $('#exp-h').textContent = st === 'cancelled' ? 'You cancelled' : 'Time ran out'; panel('p-expired'); resetCard(); $('#f').hidden = true; }
    else if (paid) { head('Seats confirmed · ' + seatsWord(v.qty), 'You’re in, ' + first(v.name) + '.', ''); panel('p-ticket'); paintPaid(v); }
    paintHold(); wake();
  }
  function paintPaid(v) {
    var ph = v.phase, t = v.times, u = LR.fmtEvent(t.unlockAt, E);
    var area = k('area'); area.hidden = false; area.textContent = v.area || ev.venueArea;
    var act = k('act'), nx = $('#next'), ics = $('#ics');
    ics.hidden = ph !== 'locked';
    if (ph === 'locked') { k('lockLabel').textContent = 'Shows ' + u.day + ' ' + u.time; act.hidden = true; nx.textContent = 'Your address will appear on this card on ' + u.day + ', ' + u.date + ' at ' + u.time + '.'; }
    else if (ph === 'ready') { k('lockLabel').textContent = S.revealing ? 'Showing' : 'Ready'; if (!S.revealing) revealUI(v); nx.textContent = 'Your address is ready. Tap “Show the address” on your card.'; }
    else if (ph === 'doors') { k('lockLabel').textContent = S.revealing ? 'Showing' : 'Ready'; if (!S.revealing) revealUI(v); nx.textContent = 'Doors are open. Show the code on your card to the person at the door.'; }
    else if (ph === 'in') { k('lockLabel').textContent = 'Checked in'; act.hidden = true; nx.textContent = 'You’re checked in at ' + LR.fmtEvent(v.checkedInAt, E).time + '. Enjoy the night.'; k('state').textContent = 'Checked in'; }
    else { k('lockLabel').textContent = 'Event ended'; act.hidden = true; nx.textContent = 'This night has ended. Thanks for coming.'; }
    k('door').hidden = true; paintQR(v);
  }
  function paintQR(v) { if (!v.qr || v.phase !== 'doors') { if (v.phase !== 'doors') { k('qr').innerHTML = ''; k('qrcap').textContent = ''; S.lastStep = null; } return; } if (S.lastStep !== v.qrStep) { S.lastStep = v.qrStep; k('qr').innerHTML = LR.qrSVG(v.qr); } k('qrcap').textContent = 'Show this at the door'; }

  /* ───── live ticking: countdowns, rotating code, phase changes ───── */
  function paintHold() {
    if (!S.v) return; var v = S.v, n = nowMs();
    if (v.state === 'held' || v.state === 'pending') { var left = v.holdUntil - n; var mm = Math.max(0, Math.floor(left / 60000)), ss = Math.max(0, Math.floor(left / 1000) % 60), clock = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss; $('#holdleft').textContent = clock; if (left > 0) k('state').textContent = 'Pay in ' + mm + ':' + (ss < 10 ? '0' : '') + ss; }
    if (v.state === 'paid') {
      var t = v.times, ph = v.phase;
      var qs = T.qrStep(n), into = (n / 1000) % T.STEP_S; tk.style.setProperty('--qr-left', (1 - into / T.STEP_S).toFixed(3));
      if (qs !== v.qrStep || (ph === 'locked' && n >= t.unlockAt) || (ph === 'ready' && n >= t.phraseAt) || (ph === 'doors' && n >= t.end)) { if (!S.refreshing) { S.refreshing = true; refresh(true).then(function () { S.refreshing = false; }); } }
    } else if ((v.state === 'held') && v.holdUntil <= n && !S.refreshing) { S.refreshing = true; refresh(true).then(function () { S.refreshing = false; }); }
  }
  setInterval(function () { paintHold(); tickReveal(); }, 1000);
  g.addEventListener('lr:clock', function () { refresh(true); });
  g.addEventListener('storage', function (e) { if (e.key === 'lr:mock:v1' && S.rid) refresh(true); });

  /* keep the screen awake at the door so the code never dims away while a guest waits in line */
  function wake() {
    try { if (navigator.wakeLock && S.v && S.v.phase === 'doors' && !document.hidden && !S.wl) navigator.wakeLock.request('screen').then(function (l) { S.wl = l; l.addEventListener('release', function () { S.wl = null; }); }).catch(function () { }); } catch (e) { }
  }

  /* ───── show the address: one tap, 45 seconds, watermarked ───── */
  function revealUI(v) {
    var act = k('act'); if (S.revealing) return; act.hidden = false;
    /* idempotent: the card refreshes every 30s (rotating code); never rebuild a button the buyer may be pressing */
    var key = v.revealsLeft + '|' + v.revealSeconds; if (act.getAttribute('data-key') === key && (act.querySelector('#rv') || act.querySelector('.lim'))) return; act.setAttribute('data-key', key);
    if (v.revealsLeft <= 0) { act.innerHTML = '<p class="fine lim">You’ve used all your views of the address. Ask the host and they’ll help.</p>'; return; }
    act.innerHTML = '<button class="reveal-btn" id="rv" type="button"><span>Show the address</span></button>' +
      '<p class="fine" id="rv-help">It shows for ' + v.revealSeconds + ' seconds, then hides. You can open it ' + v.revealsLeft + (v.revealsLeft === 1 ? ' more time.' : ' more times.') + '</p>';
    $('#rv').addEventListener('click', doReveal);
  }
  async function doReveal() {
    if (S.revealing) return; S.revealing = { pending: true }; var b = $('#rv'); if (b) b.disabled = true;
    try {
      var r = await A.reveal(S.rid, S.tok);
      if (!r.ok) { S.revealing = null; var why = { too_early: 'The address isn’t ready yet.', limit: 'You’ve used all your views of the address.', over: 'This night has ended.', unpaid: 'Your payment isn’t confirmed yet.' }[r.reason] || 'The address isn’t available right now.'; say(why); note(why); await refresh(true); return; }
      showAddress(r);
    } catch (err) { S.revealing = null; await refresh(true); }
  }
  function showAddress(r) {
    var loc = tk.querySelector('.tk-loc'), act = k('act'); k('addr').textContent = r.address; loc.classList.add('is-revealed'); k('lockLabel').textContent = 'Showing';
    S.revealing = { end: Date.now() + r.seconds * 1000, total: r.seconds, left: r.revealsLeft };
    var maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(r.address);
    act.hidden = false; act.innerHTML = '<a class="btn btn--block" id="maps" href="' + maps + '" target="_blank" rel="noopener">Open in Maps</a><div class="tk-live"><span id="lv-clock"></span><span id="lv-left"></span></div><div class="tk-bar"><i id="lv-bar"></i></div><p class="fine">Hides on its own. Your name and the time are printed over it. ' + (r.revealsLeft > 0 ? 'You can open it ' + r.revealsLeft + (r.revealsLeft === 1 ? ' more time.' : ' more times.') : 'That was your last view.') + '</p>';
    say('The address is showing. It hides in ' + r.seconds + ' seconds.'); tickReveal();
    requestAnimationFrame(function () { var bar = $('#lv-bar'); if (bar) bar.style.width = '100%'; });
  }
  function wm(text) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="250" height="84"><text x="125" y="46" text-anchor="middle" transform="rotate(-16 125 42)" font-family="ui-monospace,monospace" font-size="12" font-weight="700" fill="#ffffff" fill-opacity=".2">' + text.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text></svg>';
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
  }
  function tickReveal() {
    var r = S.revealing; if (!r || r.pending || !S.v) return;
    var left = Math.max(0, Math.ceil((r.end - Date.now()) / 1000)), n = nowMs(), f = LR.fmtEvent(n, E);
    var c = $('#lv-clock'), l = $('#lv-left'), bar = $('#lv-bar'); if (c) c.textContent = f.clock; if (l) l.textContent = 'Hides in ' + left + 's'; if (bar) bar.style.width = (left / r.total * 100).toFixed(1) + '%';
    k('wm').style.backgroundImage = wm(S.v.name + ' · ' + S.v.ref + ' · ' + f.clock);
    if (left <= 0) hideAddress('time');
  }
  function hideAddress(why) {
    if (!S.revealing || S.revealing.pending) return; S.revealing = null;
    var loc = tk.querySelector('.tk-loc'); loc.classList.remove('is-revealed'); k('wm').style.backgroundImage = 'none';
    k('addr').innerHTML = '<span aria-hidden="true">' + esc(ev.venueDecoy) + '</span><span class="sr">' + esc(ev.venueLockedLabel) + '</span>';
    say(why === 'away' ? 'The address is hidden because you left the page.' : 'The address is hidden.'); refresh(true);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) hideAddress('away'); else wake(); });
  g.addEventListener('blur', function () { hideAddress('away'); });
  g.addEventListener('pagehide', function () { hideAddress('away'); });

  /* ───── exports: nothing here contains the address ───── */
  function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  $('#save').addEventListener('click', async function () {
    var b = this; b.disabled = true; note('Making your picture…');
    try { if (plate) plate.redraw(); var blob = await LR.cardPNG({ E: E, name: S.v.name, qty: S.v.qty, ref: S.v.ref, plate: plateCanvas }); var img = $('#prev-img'); if (img.dataset.u) URL.revokeObjectURL(img.dataset.u); img.dataset.u = URL.createObjectURL(blob); img.src = img.dataset.u; $('#prev').hidden = false; download(blob, 'listening-room-' + S.v.ref.toLowerCase() + '.png'); note('Your picture is below. It shows your name and the area, never the address.'); }
    catch (err) { note('That didn’t work. Take a screenshot of your card instead.'); }
    b.disabled = false;
  });
  $('#ics').addEventListener('click', function () {
    var v = S.v, z = function (iso) { return new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, ''); }, end = ev.start.slice(0, 11) + ev.end + ':00' + ev.start.slice(19);
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Listening Room//Demo//EN', 'BEGIN:VEVENT', 'UID:' + v.ref + '@listening-room', 'DTSTAMP:' + z(new Date().toISOString()), 'DTSTART:' + z(ev.start), 'DTEND:' + z(end),
      'SUMMARY:' + d.name + ' · ' + s.name, 'LOCATION:' + (ev.venueArea || '') + ' (address on your card ' + unlockLead + ' before doors)', 'DESCRIPTION:Reference ' + v.ref + '\\nSeats ' + v.qty + '\\nYour exact address appears on your card ' + unlockLead + ' before doors.\\nDemo event', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    download(new Blob([ics], { type: 'text/calendar' }), 'listening-room.ics'); note('Done. If nothing downloaded, add it by hand: ' + LR.fmtEvent(Date.parse(ev.start), E).day + ' · doors ' + LR.time12(ev.doors) + ' · ' + (ev.venueArea || '') + '.');
  });
  $('#copylink').addEventListener('click', async function () {
    var url = location.origin + location.pathname + '?r=' + encodeURIComponent(S.rid) + '#k=' + encodeURIComponent(S.tok);
    try { await navigator.clipboard.writeText(url); note('Copied. Keep it private: anyone with this link can open your card.'); } catch (e) { note('Copy didn’t work here. This link opens your card, so keep it private.'); }
  });
  $('#again').addEventListener('click', function () { clear(); stopPolling(); showForm(); say('Pick seats for someone else.'); });
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
  $('#f').hidden = !!S.rid;
  if (S.rid) { refresh().then(function () { if (S.v && S.v.state === 'pending') startPolling(); }); } else showForm();
})(window);
