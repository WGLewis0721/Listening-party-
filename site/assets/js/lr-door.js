/* Listening Room · door check-in (staff tool, demo).
   Real flow: the staff phone scans the guest's live QR with its camera and calls the server's door-verify function.
   Here the "camera" is a text box and the server is the simulator, but the verification (signed, rotating, one use) is the real logic. */
(function (g) {
  'use strict';
  var LR = g.LR, E = LR && LR.E, T = g.LRTicket;
  var A = (E && E.payment && E.payment.mode === 'live' && LR.apiLive) ? LR.apiLive : (LR && LR.api); if (!E || !A) return;
  var esc = LR.esc, root = document.getElementById('lr');
  root.innerHTML = '<main class="dw"><header class="dh"><div><p class="cnt">Staff · Door check-in · demo</p><h1>' + esc(E.dj.name) + ' · ' + esc(E.series.name) + '</h1></div><p class="cnt">Checked in <b id="c-in">0</b> of <b id="c-all">0</b> guests</p></header>' +
    '<section class="box" aria-labelledby="sc"><div class="row"><div class="fld"><label for="code" id="sc">Scan or paste a code</label><input id="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="LR1.LR-ED01-XXXXXX.…"></div>' +
    '<button class="btn" id="go" type="button">Check in</button></div>' +
    '<div class="row" style="margin-top:12px"><button class="btn btn--ghost" id="sim" type="button">Simulate a scan of the latest card</button><button class="btn btn--ghost" id="sim2" type="button">Simulate a scan of a guest on the list</button></div>' +
    '<p class="note">A code is only good for about a minute, works once, and must match a paid name. A screenshot of a card does not get anyone in. In production the phone camera does the scanning.</p></section>' +
    '<div id="res" role="status" aria-live="assertive"><h2>Ready</h2><p>Scan a guest’s live code.</p></div>' +
    '<section class="box"><table><thead><tr><th>Name</th><th>Seats</th><th>Status</th></tr></thead><tbody id="list"></tbody></table></section></main>';
  var $ = function (q) { return root.querySelector(q); };
  function show(cls, h, p) { var r = $('#res'); r.className = cls; r.innerHTML = '<h2>' + esc(h) + '</h2><p>' + esc(p) + '</p>'; }
  async function list() {
    var l = await A.doorList(E.slug), tin = 0, tall = 0;
    $('#list').innerHTML = l.map(function (x) { tall += x.qty; if (x.checkedInAt) tin += x.qty; return '<tr><td>' + esc(x.name) + '</td><td>' + x.qty + '</td><td class="' + (x.checkedInAt ? 'in' : 'out') + '">' + (x.checkedInAt ? 'In · ' + LR.fmtEvent(x.checkedInAt, E).time : 'Not arrived') + '</td></tr>'; }).join('') || '<tr><td colspan="3" class="out">No paid guests yet.</td></tr>';
    $('#c-in').textContent = tin; $('#c-all').textContent = tall;
  }
  async function check(payload) {
    show('', 'Checking…', ''); var r = await A.doorVerify(payload);
    if (r.ok) show('ok', 'ADMIT ' + r.qty, r.name + ' · ' + r.ref);
    else if (r.reason === 'already') show('warn', 'ALREADY IN', r.name + ' checked in at ' + LR.fmtEvent(r.at, E).time + '. Do not admit again.');
    else if (r.reason === 'expired') show('bad', 'CODE EXPIRED', (r.name ? r.name + ': ' : '') + 'Ask them to open their live card. This looks like an old screenshot.');
    else if (r.reason === 'forged' || r.reason === 'format') show('bad', 'NOT A VALID CODE', 'Do not admit. Check the name against the list.');
    else show('bad', 'NOT ON THE LIST', 'No paid ticket matches this code.');
    await list(); $('#code').value = ''; $('#code').focus();
  }
  $('#go').addEventListener('click', function () { if ($('#code').value.trim()) check($('#code').value); });
  $('#code').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#go').click(); });
  $('#sim').addEventListener('click', async function () { var p = await A.demo.latestPayload(E.slug); if (!p) return show('bad', 'NO CARD YET', 'Reserve and pay on the card page first, then scan it here.'); $('#code').value = p; check(p); });
  $('#sim2').addEventListener('click', async function () { var l = await A.demo.seededPayloads(E.slug), p = l[Math.floor(Math.random() * l.length)]; if (p) { $('#code').value = p.payload; check(p.payload); } });
  g.addEventListener('storage', function (e) { if (e.key === 'lr:mock:v1') list(); });
  g.addEventListener('lr:clock', list);
  if (!A.demo) { $('#sim').hidden = true; $('#sim2').hidden = true; var kk = document.createElement('div'); kk.className = 'fld'; kk.style.marginTop = '12px'; kk.innerHTML = '<label for="key">Staff key</label><input id="key" type="password" autocomplete="off">'; $('#go').parentNode.parentNode.appendChild(kk); $('#key').addEventListener('input', function (e) { try { sessionStorage.setItem('lr:doorkey', e.target.value); } catch (x) { } }); list(); } else A.demo.seed(E).then(list);
})(window);
