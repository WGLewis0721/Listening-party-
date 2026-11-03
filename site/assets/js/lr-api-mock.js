/* Listening Room · SIMULATED SERVER (prototype only).
   Everything in this file is the part that moves to the real server (Supabase edge functions + Square, see /server).
   In production none of it is shipped to the browser: the venue address, the signing secret and the seat database live there.
   The UI code never reads the address from anywhere except LR.api.reveal(), exactly as it will with the real server.
   The "database" is localStorage, so two tabs (a card and the door page) can talk to each other in the demo. */
(function (g) {
  'use strict';
  var LR = g.LR = g.LR || {}, T = g.LRTicket;
  if (!T) return;

  /* ───── server-side data (stand-in) ───── */
  var VENUE = { name: 'Montgomery Museum of Fine Arts', address: 'One Museum Drive, Montgomery, AL 36117' };
  var NOTICE = 'Demo venue: a real public place used as a stand-in. No event is scheduled there and it is not affiliated with Listening Room.';
  var SECRET = 'prototype-signing-secret';          // signs the rotating entry code
  var KEY = 'lr:mock:v1', OFF = 'lr:mock:offset';
  var HOLD_MIN = 30, MAX_REVEALS = 3, REVEAL_SECONDS = 20, LAT = [140, 320];

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || '{"r":{}}'); } catch (e) { return { r: {} }; } }
  function write(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { } }
  function now() { var o = 0; try { o = +localStorage.getItem(OFF) || 0; } catch (e) { } return Date.now() + o; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function lat() { return wait(LAT[0] + Math.random() * (LAT[1] - LAT[0])); }
  function rid() { var A = 'abcdefghjkmnpqrstvwxyz23456789', o = '', b = new Uint8Array(10); g.crypto.getRandomValues(b); for (var i = 0; i < 10; i++) o += A[b[i] % A.length]; return o; }
  function newRef(ed) { var A = 'ABCDEFGHJKMNPQRSTVWXYZ23456789', o = '', b = new Uint8Array(6); g.crypto.getRandomValues(b); for (var i = 0; i < 6; i++) o += A[b[i] % A.length]; return 'LR-ED' + ed + '-' + o; }
  function fail(code, message) { var e = new Error(message || code); e.code = code; return e; }

  function taken(d, slug) {
    var t = now(), n = 0;
    Object.keys(d.r).forEach(function (k) { var x = d.r[k]; if (x.slug !== slug) return; if (x.state === 'paid' || (x.state === 'held' || x.state === 'pending') && x.holdUntil > t) n += x.qty; });
    return n;
  }
  async function auth(d, id, token) {
    var x = d.r[id]; if (!x) throw fail('not_found', 'We could not find that reservation.');
    if (!token || !T.ctEq(await T.sha256Hex(token), x.tokenHash)) throw fail('forbidden', 'That link is not valid.');
    return x;
  }
  function effective(x) { return ((x.state === 'held' || x.state === 'pending') && x.holdUntil <= now()) ? 'expired' : x.state; }
  function times(x) { return T.eventTimes(x.ev, x.rel); }

  async function view(x) {
    var t = now(), st = effective(x), paid = st === 'paid', tm = times(x), ph = x.checkedInAt ? 'in' : (paid ? T.phaseOf(tm, t, true) : st);
    var v = { rid: x.rid, state: st, phase: ph, name: x.name, qty: x.qty, ref: x.ref, total: x.total, holdUntil: x.holdUntil, area: paid ? x.area : null, serverNow: t, fetchedAt: Date.now(),
      times: { start: tm.start, unlockAt: tm.unlockAt, phraseAt: tm.phraseAt, end: tm.end }, revealsLeft: Math.max(0, MAX_REVEALS - (x.reveals || 0)), revealSeconds: REVEAL_SECONDS, paidAt: x.paidAt || null, checkedInAt: x.checkedInAt || null, declined: !!x.declined };
    if (paid) {
      v.qr = await T.qrPayload(SECRET, x.ref, t);
      v.qrStep = T.qrStep(t);
      if (ph === 'doors' || ph === 'over' || ph === 'in') v.doorPhrase = await T.doorPhrase(SECRET, x.slug);
    }
    return v;                                   // note: never includes the address
  }

  var api = {
    mode: 'mock',
    notice: NOTICE,
    /* 1 · hold seats (server decrements inventory atomically; here, a simple count) */
    reserve: async function (o) {
      await lat();
      var E = o.E, name = String(o.name || '').trim(), email = String(o.email || '').trim(), qty = +o.qty || 1;
      if (name.length < 2) throw fail('invalid', 'Add the name for the card.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw fail('invalid', 'Enter a valid email so we can send your card link.');
      var d = read(), left = E.event.capacity - taken(d, E.slug);
      if (qty < 1 || qty > (E.event.maxQty || 4)) throw fail('invalid', 'Choose between 1 and ' + (E.event.maxQty || 4) + ' seats.');
      if (qty > left) throw fail('sold_out', left > 0 ? 'Only ' + left + ' seat' + (left > 1 ? 's' : '') + ' left.' : 'This night is sold out.');
      var id = rid(), token = T.newToken();
      d.r[id] = { rid: id, slug: E.slug, name: name, email: email, qty: qty, state: 'held', holdUntil: now() + HOLD_MIN * 60000, ref: newRef(E.series.edition), tokenHash: await T.sha256Hex(token), total: qty * E.event.price + (E.event.fee || 0) * qty,
        ev: { start: E.event.start, end: E.event.end }, rel: E.event.release || {}, area: E.event.venueArea || '', createdAt: now(), reveals: 0 };
      write(d);
      return { rid: id, token: token };
    },
    ticket: async function (id, token) { await lat(); var d = read(), x = await auth(d, id, token); return view(x); },
    /* 2 · create the hosted checkout (real: POST /v2/online-checkout/payment-links, returns payment_link.url) */
    startCheckout: async function (id, token) {
      await lat(); var d = read(), x = await auth(d, id, token);
      if (effective(x) !== 'held') throw fail('expired', 'Your hold has ended. Please start again.');
      x.state = 'pending'; x.declined = false; x.order = 'MOCK-ORDER-' + rid().toUpperCase(); write(d);
      return { orderId: x.order, total: x.total };
    },
    /* the simulated Square page + webhook. In production the browser leaves for Square and Square calls our server. */
    simulateSquare: async function (id, outcome) {
      var d = read(), x = d.r[id]; if (!x) return;
      if (outcome === 'paid') { await wait(1400); d = read(); x = d.r[id]; x.state = 'paid'; x.paidAt = now(); x.declined = false; write(d); }
      else if (outcome === 'declined') { x.state = 'held'; x.declined = true; write(d); }
      else { x.state = 'held'; write(d); }
    },
    release: async function (id, token) { await lat(); var d = read(), x = await auth(d, id, token); if (x.state !== 'paid') { x.state = 'cancelled'; write(d); } return { ok: true }; },
    /* 3 · the only way the address ever reaches a browser */
    reveal: async function (id, token) {
      await lat(); var d = read(), x = await auth(d, id, token), t = now();
      var phase = x.state === 'paid' ? T.phaseOf(times(x), t, true) : 'unpaid';
      var ok = T.canReveal({ paid: x.state === 'paid', phase: phase, revealCount: x.reveals || 0, max: MAX_REVEALS });
      if (!ok.ok) return { ok: false, reason: ok.reason, revealsLeft: Math.max(0, MAX_REVEALS - (x.reveals || 0)) };
      x.reveals = (x.reveals || 0) + 1; (x.revealLog = x.revealLog || []).push(t); write(d);
      return { ok: true, address: VENUE.name + ' · ' + VENUE.address, seconds: REVEAL_SECONDS, revealsLeft: Math.max(0, MAX_REVEALS - x.reveals) };
    },
    /* 4 · door (staff) */
    doorVerify: async function (payload) {
      await lat(); var r = await T.verifyQr(SECRET, payload, now(), 1);
      if (!r.ok) { var d0 = read(), found0 = r.ref && Object.keys(d0.r).map(function (k) { return d0.r[k]; }).filter(function (x) { return x.ref === r.ref; })[0]; return { ok: false, reason: r.reason, name: found0 ? found0.name : null }; }
      var d = read(), x = Object.keys(d.r).map(function (k) { return d.r[k]; }).filter(function (y) { return y.ref === r.ref; })[0];
      if (!x || x.state !== 'paid') return { ok: false, reason: x ? 'unpaid' : 'notfound' };
      if (x.checkedInAt) return { ok: false, reason: 'already', name: x.name, qty: x.qty, ref: x.ref, at: x.checkedInAt };
      x.checkedInAt = now(); write(d);
      return { ok: true, reason: 'ok', name: x.name, qty: x.qty, ref: x.ref, at: x.checkedInAt };
    },
    doorList: async function (slug) {
      var d = read(); return Object.keys(d.r).map(function (k) { return d.r[k]; }).filter(function (x) { return x.slug === slug && x.state === 'paid'; })
        .map(function (x) { return { name: x.name, qty: x.qty, ref: x.ref, checkedInAt: x.checkedInAt || null }; });
    },
    /* demo-only helpers: none of these exist on the real server */
    demo: {
      now: now,
      setOffset: function (ms) { try { localStorage.setItem(OFF, String(ms)); } catch (e) { } g.dispatchEvent(new Event('lr:clock')); },
      jumpTo: function (ms) { api.demo.setOffset(ms - Date.now()); },
      reset: function () { try { localStorage.removeItem(OFF); } catch (e) { } g.dispatchEvent(new Event('lr:clock')); },
      wipe: function () { try { localStorage.removeItem(KEY); localStorage.removeItem(OFF); } catch (e) { } g.dispatchEvent(new Event('lr:clock')); },
      latestPayload: async function (slug) {
        var d = read(), list = Object.keys(d.r).map(function (k) { return d.r[k]; }).filter(function (x) { return x.state === 'paid' && !x.seeded && (!slug || x.slug === slug); }).sort(function (a, b) { return (b.paidAt || 0) - (a.paidAt || 0); });
        return list[0] ? T.qrPayload(SECRET, list[0].ref, now()) : null;
      },
      seed: async function (E) {                       // a few fictional attendees so the door list is not empty
        var d = read(); if (Object.keys(d.r).some(function (k) { return d.r[k].seeded && d.r[k].slug === E.slug; })) return;
        [['Avery Chen', 2], ['Marcus Bell', 1], ['Priya Nair', 2], ['Devon Hart', 1], ['Sam Okafor', 2]].forEach(function (p) {
          var id = rid(); d.r[id] = { rid: id, slug: E.slug, name: p[0], email: 'demo@example.com', qty: p[1], state: 'paid', paidAt: 1, holdUntil: 0, ref: newRef(E.series.edition), tokenHash: 'x', total: 0, ev: { start: E.event.start, end: E.event.end }, rel: E.event.release || {}, area: E.event.venueArea || '', reveals: 0, seeded: true };
        }); write(d);
      },
      seededPayloads: async function (slug) {
        var d = read(); return Promise.all(Object.keys(d.r).map(function (k) { return d.r[k]; }).filter(function (x) { return x.seeded && x.slug === slug; }).map(async function (x) { return { name: x.name, payload: await T.qrPayload(SECRET, x.ref, now()) }; }));
      },
      address: function () { return VENUE.name + ' · ' + VENUE.address; }   // picker and boards only
    }
  };
  LR.api = api;
})(window);
