/* Listening Room · LIVE API client (talks to the Supabase edge functions in /server). STATUS: written, untested against a deployed server.
   Same interface as lr-api-mock.js. Switch on with  payment: { provider: 'square', mode: 'live', apiBase: 'https://<project>.supabase.co/functions/v1' }  in edition.js. */
(function (g) {
  'use strict';
  var LR = g.LR, E = LR && LR.E; if (!E) return;
  var base = ((E.payment && E.payment.apiBase) || '').replace(/\/$/, '');
  async function post(fn, body, headers) {
    var r = await fetch(base + '/' + fn, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, headers || {}), body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) { var e = new Error((j.error && j.error.message) || 'Something went wrong. Please try again.'); e.code = (j.error && j.error.code) || 'server'; throw e; }
    return j;
  }
  function eventId() { return E.event.id || (E.slug + '-ed' + E.series.edition); }
  function doorHeaders() { return { 'x-door-key': (function () { try { return localStorage.getItem('lr:doorkey') || ''; } catch (e) { return ''; } })() }; }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { } }
  LR.apiLive = {
    mode: 'live', notice: '',
    reserve: async function (o) { var j = await post('reserve', { event: eventId(), name: o.name, email: o.email, qty: o.qty }); ss('lr:co:' + j.rid, j.checkoutUrl); return { rid: j.rid, token: j.token }; },
    ticket: function (rid, tok) { return post('ticket', { rid: rid, token: tok }); },
    startCheckout: async function (rid) { return { url: ss('lr:co:' + rid) }; },        // the page then leaves for Square; Square's signed webhook marks the order paid
    release: async function () { return { ok: true }; },                                // an unpaid hold simply expires after 30 minutes
    reveal: function (rid, tok) { return post('reveal', { rid: rid, token: tok }); },
    doorVerify: function (payload) { return post('door-verify', { payload: payload }, doorHeaders()); },
    doorManual: function (ref) { return post('door-verify', { ref: ref }, doorHeaders()); },       // staff picked the name from the list
    doorList: async function () { var j = await post('door-list', { event: eventId() }, doorHeaders()); return j.guests || []; }
  };
})(window);
