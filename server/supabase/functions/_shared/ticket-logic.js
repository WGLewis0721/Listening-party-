/* Listening Room · ticket logic shared by the in-browser prototype and the real server.
   Pure functions on Web Crypto: the same file runs in browsers, Deno (Supabase edge functions) and Node (tests).
   Nothing here knows the venue address. That lives only on the server (or, in the prototype, in lr-api-mock.js). */
(function (g) {
  'use strict';
  var enc = new TextEncoder(), B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', STEP_S = 30;
  var subtle = g.crypto && g.crypto.subtle;

  async function hmacBytes(secret, msg) {
    var k = await subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await subtle.sign('HMAC', k, enc.encode(msg)));
  }
  function b32(bytes, n) { var out = '', bits = 0, val = 0; for (var i = 0; i < bytes.length; i++) { val = (val << 8) | bytes[i]; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } return out.slice(0, n); }
  function b64(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); }
  function b64url(bytes) { return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function ctEq(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

  /* ───── rotating entry code ─────
     LR1.<ref>.<step>.<code>: step = 30-second counter, code = HMAC(secret, ref + step). A screenshot stops scanning in about a minute. */
  function qrStep(nowMs) { return Math.floor(nowMs / 1000 / STEP_S); }
  async function qrCode(secret, ref, step) { return b32(await hmacBytes(secret, 'qr|' + ref + '|' + step), 8); }
  async function qrPayload(secret, ref, nowMs) { var s = qrStep(nowMs); return 'LR1.' + ref + '.' + s + '.' + (await qrCode(secret, ref, s)); }
  async function verifyQr(secret, payload, nowMs, skew) {
    var m = /^LR1\.(LR-ED\d{2}-[A-Z0-9]{6})\.(\d{1,12})\.([A-Z2-7]{8})$/.exec(String(payload || '').trim());
    if (!m) return { ok: false, reason: 'format' };
    var step = +m[2], sk = skew == null ? 1 : skew;
    if (Math.abs(qrStep(nowMs) - step) > sk) return { ok: false, reason: 'expired', ref: m[1] };
    if (!ctEq(await qrCode(secret, m[1], step), m[3])) return { ok: false, reason: 'forged' };
    return { ok: true, ref: m[1], step: step };
  }

  /* ───── release schedule ─────
     locked  = paid, address not due yet · ready = address released (T-3h by default) · doors = door phrase visible (T-30m) · over = after the event */
  function eventTimes(ev, rel) {
    rel = rel || {};
    var start = Date.parse(ev.start), end = Date.parse(ev.start.slice(0, 11) + ev.end + ':00' + ev.start.slice(19));
    return { start: start, end: end, unlockAt: start - (rel.unlockLeadMin == null ? 180 : rel.unlockLeadMin) * 60000, phraseAt: start - (rel.doorPhraseLeadMin == null ? 30 : rel.doorPhraseLeadMin) * 60000 };
  }
  function phaseOf(t, nowMs, paid) {
    if (!paid) return 'unpaid';
    if (nowMs >= t.end) return 'over';
    if (nowMs >= t.phraseAt) return 'doors';
    if (nowMs >= t.unlockAt) return 'ready';
    return 'locked';
  }
  function canReveal(p) {
    if (!p.paid) return { ok: false, reason: 'unpaid' };
    if (p.phase === 'locked') return { ok: false, reason: 'too_early' };
    if (p.phase === 'over') return { ok: false, reason: 'over' };
    if ((p.revealCount || 0) >= (p.max || 3)) return { ok: false, reason: 'limit' };
    return { ok: true };
  }

  /* ───── tokens and door phrase ───── */
  function newToken() { var b = new Uint8Array(16); g.crypto.getRandomValues(b); return b64url(b); }
  async function sha256Hex(s) { var h = new Uint8Array(await subtle.digest('SHA-256', enc.encode(s))), o = ''; for (var i = 0; i < h.length; i++) o += (h[i] < 16 ? '0' : '') + h[i].toString(16); return o; }
  /* a buyer's card token = HMAC(serverSecret, ticketId:version). The server can re-issue the magic link any time without storing the raw token;
     bump the version to revoke it (for a transfer or a leak). */
  async function macToken(secret, ticketId, version) { return b64url(await hmacBytes(secret, 'tok|' + ticketId + ':' + (version || 0))); }
  var WORDS = ['amber', 'velvet', 'harbor', 'copper', 'lantern', 'static', 'marble', 'cedar', 'ember', 'quartz', 'willow', 'saffron', 'cobalt', 'meadow', 'ivory', 'thunder', 'juniper', 'indigo', 'canyon', 'pewter', 'garnet', 'monsoon', 'sparrow', 'tallow', 'orchid', 'granite', 'driftwood', 'mercury', 'paprika', 'hollow', 'zephyr', 'cinder'];
  async function doorPhrase(secret, eventId) { var h = await hmacBytes(secret, 'door|' + eventId); return WORDS[h[0] % WORDS.length] + ' ' + WORDS[h[1] % WORDS.length]; }

  /* ───── Square webhook ─────
     header x-square-hmacsha256-signature = base64( HMAC-SHA256( signatureKey, notificationUrl + rawBody ) ).
     The URL must match the subscription's URL exactly. Square's own page does not spell out the concatenation order,
     so confirm against Square's SDK helper before going live. There is no timestamp, so handle events idempotently. */
  async function squareSignature(key, url, rawBody) { return b64(await hmacBytes(key, String(url) + String(rawBody))); }
  async function squareSignatureOk(key, url, rawBody, header) { if (!header) return false; return ctEq(await squareSignature(key, url, rawBody), header); }

  var api = { STEP_S: STEP_S, qrStep: qrStep, qrPayload: qrPayload, verifyQr: verifyQr, eventTimes: eventTimes, phaseOf: phaseOf, canReveal: canReveal, newToken: newToken, macToken: macToken, sha256Hex: sha256Hex, doorPhrase: doorPhrase, squareSignature: squareSignature, squareSignatureOk: squareSignatureOk, ctEq: ctEq };
  g.LRTicket = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
