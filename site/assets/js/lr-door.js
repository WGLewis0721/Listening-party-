/* Listening Room · the door. Built for a volunteer who has never seen it and has ten seconds.
   1  Tap SCAN, point the phone at the guest's code. The screen answers in one word and one colour.
        green  = let them in        yellow = they are already in        red = do not let them in (old picture, not valid)
   2  No phone, dead battery, no signal? Find the name in the list and tap Let in (asks once: "Yes, let in").
   The camera stays open between guests, so the whole job is: aim, look at the colour, wave them through.
   Talks to LR.api only: the simulator today (lr-api-mock.js), the real server later (lr-api-live.js). */
(function (g) {
  'use strict';
  var LR = g.LR, E = LR && LR.E;
  var A = (E && E.payment && E.payment.mode === 'live' && LR.apiLive) ? LR.apiLive : (LR && LR.api); if (!E || !A) return;
  var esc = LR.esc, root = document.getElementById('lr'), LIVE = !A.demo, KEYNAME = 'lr:doorkey';
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { } return null; }

  /* The staff link carries the key once (door.html#key=…). The phone remembers it and the key leaves the address bar. */
  if (LIVE) { var m = location.hash.match(/key=([^&]+)/); if (m) { store(KEYNAME, decodeURIComponent(m[1])); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } } }
  var needsKey = LIVE && !store(KEYNAME);

  var camIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  root.innerHTML = '<main class="dw"><header class="dh"><div><p class="cnt">Door</p><h1>' + esc(E.dj.name) + '</h1></div><p class="count"><b id="c-in">0</b>of <span id="c-all">0</span> in</p></header>' +
    (needsKey ? '<div class="setup"><h2>This phone isn’t set up yet</h2><p>Open the door link the host sent you. You only need to do that once.</p></div>' : '') +
    '<button class="scan" id="scan" type="button">' + camIcon + 'Scan a guest</button>' +
    '<section class="find" aria-label="Find a guest by name"><label for="q">No phone? Find the name</label><input id="q" type="search" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Start typing a name"><ul class="gl-list" id="list"></ul></section>' +
    (LIVE ? '' : '<details class="demo"><summary>Demo tools (not part of the real thing)</summary><div class="row"><button class="btn btn--ghost" id="sim" type="button">Pretend to scan the card I just bought</button><button class="btn btn--ghost" id="sim2" type="button">Pretend to scan someone from the list</button></div></details>') +
    '</main>' +
    '<div class="cam" id="cam" hidden role="dialog" aria-modal="true" aria-label="Scanner"><video id="vid" playsinline muted></video><div class="reticle" aria-hidden="true"></div><p class="hint" id="hint">Point the camera at the guest’s code</p><button class="done" id="done" type="button">Done scanning</button></div>' +
    '<div class="ov" id="ov" hidden role="alertdialog" aria-live="assertive" aria-labelledby="ov-h"><div class="ov-in"><p class="ov-k" id="ov-k"></p><h2 id="ov-h"></h2><p id="ov-p"></p><div class="ov-b" id="ov-b"></div></div></div>';
  var $ = function (q) { return root.querySelector(q); };
  var S = { guests: [], q: '', ovTimer: 0, cam: null };

  /* ───── the guest list ───── */
  function timeOf(ms) { return LR.fmtEvent(ms, E).time; }
  function paintList() {
    var tin = 0, tall = 0, q = S.q.trim().toLowerCase();
    S.guests.forEach(function (x) { tall += x.qty; if (x.checkedInAt) tin += x.qty; });
    $('#c-in').textContent = tin; $('#c-all').textContent = tall;
    var rows = S.guests.filter(function (x) { return !q || x.name.toLowerCase().indexOf(q) >= 0; }).sort(function (a, b) { return (!!a.checkedInAt - !!b.checkedInAt) || a.name.localeCompare(b.name); });
    $('#list').innerHTML = rows.length ? rows.map(function (x) {
      return '<li><div><b>' + esc(x.name) + '</b><small>' + x.qty + (x.qty === 1 ? ' person' : ' people') + '</small></div>' +
        (x.checkedInAt ? '<span class="in">In · ' + esc(timeOf(x.checkedInAt)) + '</span>' : '<button class="go" type="button" data-ref="' + esc(x.ref) + '" data-name="' + esc(x.name) + '" data-qty="' + x.qty + '">Let in</button>') + '</li>';
    }).join('') : '<li class="empty">' + (q ? 'No one by that name.' : (needsKey ? '' : 'No paid guests yet.')) + '</li>';
  }
  async function loadList() { if (needsKey) { paintList(); return; } try { var l = await A.doorList(E.slug), sig = JSON.stringify(l); if (sig === S.sig) return; S.sig = sig; S.guests = l; } catch (e) { } paintList(); }       // repaint only when something changed, so a tap never lands on a row that just moved
  $('#q').addEventListener('input', function (e) { S.q = e.target.value; paintList(); });
  $('#list').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.go'); if (!b) return;
    var name = b.getAttribute('data-name'), ref = b.getAttribute('data-ref'), qty = +b.getAttribute('data-qty');
    overlay('ask', 'Is this them?', name, qty + (qty === 1 ? ' person' : ' people') + '. Check their name or ID.', [
      { t: 'Yes, let them in', f: async function () { var r = await A.doorManual(ref); await answer(r); } }, { t: 'Cancel', alt: true, f: function () { hideOv(); } }]);
  });

  /* ───── the answer: one word, one colour ───── */
  function beep(ok) {
    try { if (navigator.vibrate) navigator.vibrate(ok ? 90 : [160, 80, 160]); } catch (e) { }
    try { var C = g.AudioContext || g.webkitAudioContext; if (!C) return; var c = S.audio || (S.audio = new C()), o = c.createOscillator(), v = c.createGain(); o.frequency.value = ok ? 880 : 200; v.gain.value = .12; o.connect(v); v.connect(c.destination); o.start(); o.stop(c.currentTime + (ok ? .12 : .35)); } catch (e) { }
  }
  function hideOv() { clearTimeout(S.ovTimer); $('#ov').hidden = true; if (S.cam) { S.cam.busy = false; S.cam.lastAt = Date.now(); } }
  function overlay(cls, kicker, big, small, buttons, autoMs) {
    clearTimeout(S.ovTimer); var ov = $('#ov'); ov.className = 'ov ' + cls; $('#ov-k').textContent = kicker; $('#ov-h').textContent = big; $('#ov-p').textContent = small || '';
    var bb = $('#ov-b'); bb.innerHTML = ''; (buttons || []).forEach(function (x) { var b = document.createElement('button'); b.type = 'button'; b.textContent = x.t; if (x.alt) b.className = 'alt'; b.addEventListener('click', function () { x.f(); }); bb.appendChild(b); });
    ov.hidden = false; var first = bb.querySelector('button'); if (first) first.focus();
    if (autoMs) S.ovTimer = setTimeout(hideOv, autoMs);
  }
  async function answer(r) {
    var next = [{ t: 'Next guest', f: hideOv }];
    if (r.ok) { beep(true); overlay('ok', 'Let in', r.name, r.qty + (r.qty === 1 ? ' person' : ' people') + (r.via === 'name' ? ' · checked in by name' : ''), next, 2600); }
    else if (r.reason === 'already') { beep(false); overlay('warn', 'Already in', r.name, 'Checked in at ' + timeOf(r.at) + '. Don’t let them in twice.', next); }
    else if (r.reason === 'expired') { beep(false); overlay('bad', 'Old picture', r.name || 'Not a live code', 'Ask them to open their card again. A screenshot won’t work.', next); }
    else if (r.reason === 'forbidden') { beep(false); overlay('bad', 'This phone isn’t set up', 'Ask the host', 'Open the door link the host sent you.', next); }
    else { beep(false); overlay('bad', 'Not valid', 'Don’t let them in yet', 'Check their name in the list below.', next); }
    await loadList();
  }
  async function verify(payload) {
    try { return await A.doorVerify(payload); }
    catch (e) { return { ok: false, reason: (e && e.code === 'forbidden') ? 'forbidden' : 'error' }; }
  }

  /* ───── the camera ───── */
  function decoder() {
    if ('BarcodeDetector' in g) { try { var bd = new g.BarcodeDetector({ formats: ['qr_code'] }); return function (v) { return bd.detect(v).then(function (r) { return r[0] ? r[0].rawValue : null; }); }; } catch (e) { } }
    if (g.jsQR) {
      var c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
      return function (v) { var w = v.videoWidth, h = v.videoHeight; if (!w) return Promise.resolve(null); var k = Math.min(1, 720 / w); c.width = Math.round(w * k); c.height = Math.round(h * k); x.drawImage(v, 0, 0, c.width, c.height); var im = x.getImageData(0, 0, c.width, c.height), r = g.jsQR(im.data, c.width, c.height, { inversionAttempts: 'dontInvert' }); return Promise.resolve(r ? r.data : null); };
    }
    return null;
  }
  async function openCam() {
    var cam = $('#cam'), vid = $('#vid'), hint = $('#hint'); hint.textContent = 'Point the camera at the guest’s code';
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { overlay('bad', 'No camera here', 'Use the name list', 'This browser can’t open the camera. Find the guest’s name instead.', [{ t: 'OK', f: hideOv }]); return; }
    var dec = decoder(); if (!dec) { overlay('bad', 'No scanner here', 'Use the name list', 'Find the guest’s name instead.', [{ t: 'OK', f: hideOv }]); return; }
    try { var stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }); }
    catch (e) {
      if (e && e.name === 'NotFoundError') overlay('bad', 'No camera found', 'Use the name list', 'This device has no camera we can use. Find the guest’s name instead.', [{ t: 'OK', f: hideOv }]);
      else overlay('bad', 'Camera is off', 'Allow the camera', 'When your phone asks, tap Allow. Or use the name list.', [{ t: 'OK', f: hideOv }]);
      return;
    }
    vid.srcObject = stream; cam.hidden = false; try { await vid.play(); } catch (e) { }
    var C = S.cam = { stream: stream, on: true, busy: false, last: '', lastAt: 0, t: 0, working: false, dec: dec };
    (function tick() {
      if (!C.on) return;
      if (!C.busy && !C.working && vid.readyState >= 2) {
        C.working = true;
        C.dec(vid).then(function (txt) { C.working = false; if (txt && C.on && !C.busy) onCode(C, txt); }).catch(function () { C.working = false; });
      }
      C.t = setTimeout(tick, 140);
    })();
  }
  async function onCode(C, txt) {
    txt = String(txt).trim();
    if (txt === C.last && Date.now() - C.lastAt < 8000) return;           // the guest is still holding the same code up: do not answer twice
    if (!/^LR1\./.test(txt)) { if (Date.now() - (C.warnAt || 0) > 4000) { C.warnAt = Date.now(); $('#hint').textContent = 'That isn’t a Listening Room code'; } return; }
    C.busy = true; C.last = txt; C.lastAt = Date.now(); await answer(await verify(txt));
  }
  function closeCam() {
    var C = S.cam; S.cam = null; if (C) { C.on = false; clearTimeout(C.t); try { C.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { } }
    $('#cam').hidden = true; $('#vid').srcObject = null; hideOv();
  }
  $('#scan').addEventListener('click', openCam);
  $('#done').addEventListener('click', closeCam);
  g.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!$('#ov').hidden) hideOv(); else if (S.cam) closeCam(); } });

  /* ───── demo tools: stand-ins for the camera and for other guests ───── */
  if (!LIVE) {
    $('#sim').addEventListener('click', async function () { var p = await A.demo.latestPayload(E.slug); if (!p) return overlay('bad', 'No card yet', 'Buy a seat first', 'Reserve and pay on the card page, then come back.', [{ t: 'OK', f: hideOv }]); answer(await verify(p)); });
    $('#sim2').addEventListener('click', async function () { var l = await A.demo.seededPayloads(E.slug), p = l[Math.floor(Math.random() * l.length)]; if (p) answer(await verify(p.payload)); });
    g.addEventListener('storage', function (e) { if (e.key === 'lr:mock:v1') loadList(); });
    g.addEventListener('lr:clock', loadList);
    A.demo.seed(E).then(loadList);
  } else loadList();
  setInterval(function () { if (!S.cam || !S.cam.busy) loadList(); }, 10000);          // other volunteers' check-ins show up here too
})(window);
