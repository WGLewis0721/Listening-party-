/* Listening Room · DEMO CLOCK (prototype only; not part of the real product).
   Lets a reviewer jump the simulated server's clock so the staged address release can be seen without waiting for it. */
(function (g) {
  'use strict';
  var LR = g.LR, E = LR && LR.E, A = LR && LR.api, T = g.LRTicket;
  if (!E || !A || !A.demo || !T) return;
  var sc = T.eventTimes(E.event, E.event.release);
  var wrap = document.createElement('div'); wrap.className = 'dclock';
  wrap.innerHTML = '<button type="button" id="dc-btn" aria-expanded="false" aria-controls="dc-box">Demo clock</button>' +
    '<div class="box" id="dc-box" hidden role="group" aria-label="Demo clock">' +
    '<p>Prototype only. Jump the simulated server clock to see the staged release. The real site has no such control.</p>' +
    '<div class="now" id="dc-now" aria-live="off"></div><p id="dc-ev"></p>' +
    '<button type="button" data-j="unlock">Jump: address unlocks (3h before doors)</button>' +
    '<button type="button" data-j="phrase">Jump: door phrase appears (30m before)</button>' +
    '<button type="button" data-j="doors">Jump: doors open</button>' +
    '<button type="button" data-j="hour">Forward one hour</button>' +
    '<button type="button" data-j="real">Back to real time</button>' +
    '<button type="button" data-j="wipe">Wipe all demo data</button></div>';
  document.body.appendChild(wrap);
  var btn = wrap.querySelector('#dc-btn'), box = wrap.querySelector('#dc-box'), now = wrap.querySelector('#dc-now');
  function paint() { var n = A.demo.now(), f = LR.fmtEvent(n, E), s = LR.fmtEvent(sc.start, E); now.textContent = f.day + ' ' + f.date + ' · ' + f.clock; wrap.querySelector('#dc-ev').textContent = 'The night: ' + s.day + ' ' + s.date + ', doors ' + s.time + '.'; }
  btn.addEventListener('click', function () { var o = box.hidden; box.hidden = !o; btn.setAttribute('aria-expanded', String(o)); paint(); });
  box.addEventListener('click', function (e) {
    var j = e.target.getAttribute && e.target.getAttribute('data-j'); if (!j) return;
    if (j === 'unlock') A.demo.jumpTo(sc.unlockAt + 2000);
    else if (j === 'phrase') A.demo.jumpTo(sc.phraseAt + 2000);
    else if (j === 'doors') A.demo.jumpTo(sc.start + 1000);
    else if (j === 'hour') A.demo.setOffset((A.demo.now() - Date.now()) + 3600000);
    else if (j === 'real') A.demo.reset();
    else if (j === 'wipe') { A.demo.wipe(); try { Object.keys(localStorage).filter(function (k) { return /^lr:pay:/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (x) { } location.reload(); }
    paint();
  });
  g.addEventListener('lr:clock', paint); setInterval(function () { if (!box.hidden) paint(); }, 1000);
  g.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) { box.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); } });
})(window);
