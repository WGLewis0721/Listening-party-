// Run: node --test server/test/
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const T = require('../../site/assets/js/lr-ticket.js');
const SECRET = 'test-secret', REF = 'LR-ED01-K7M2QX';
const EV = { start: '2026-11-19T20:00:00-06:00', end: '23:00' };

test('rotating code: round trip, and the step changes every 30 seconds', async () => {
  const now = Date.UTC(2026, 10, 19, 22, 0, 5);
  const p = await T.qrPayload(SECRET, REF, now);
  assert.match(p, /^LR1\.LR-ED01-K7M2QX\.\d+\.[A-Z2-7]{8}$/);
  assert.equal((await T.verifyQr(SECRET, p, now)).ok, true);
  assert.notEqual(await T.qrPayload(SECRET, REF, now + 31000), p);
});
test('rotating code: a screenshot dies after about a minute', async () => {
  const now = Date.UTC(2026, 10, 19, 22, 0, 0), p = await T.qrPayload(SECRET, REF, now);
  assert.equal((await T.verifyQr(SECRET, p, now + 29000)).ok, true);
  assert.equal((await T.verifyQr(SECRET, p, now + 59000)).ok, true);     // one step of skew
  const late = await T.verifyQr(SECRET, p, now + 95000);
  assert.deepEqual([late.ok, late.reason], [false, 'expired']);
});
test('rotating code: forged, tampered and malformed codes are rejected', async () => {
  const now = Date.UTC(2026, 10, 19, 22, 0, 0), p = await T.qrPayload(SECRET, REF, now);
  assert.equal((await T.verifyQr('other-secret', p, now)).reason, 'forged');
  assert.equal((await T.verifyQr(SECRET, p.replace(REF, 'LR-ED01-AAAAAA'), now)).reason, 'forged');
  for (const bad of ['', 'hello', 'LR1.x.1.AAAAAAAA', null]) assert.equal((await T.verifyQr(SECRET, bad, now)).reason, 'format');
});
test('release schedule: locked until T-3h, ready, doors phrase at T-30m, over after the end', () => {
  const t = T.eventTimes(EV, { unlockLeadMin: 180, doorPhraseLeadMin: 30 }), start = Date.parse(EV.start);
  assert.equal(t.unlockAt, start - 3 * 3600e3);
  assert.equal(t.phraseAt, start - 30 * 60e3);
  assert.equal(t.end, Date.parse('2026-11-19T23:00:00-06:00'));
  assert.equal(T.phaseOf(t, t.unlockAt - 1, true), 'locked');
  assert.equal(T.phaseOf(t, t.unlockAt, true), 'ready');
  assert.equal(T.phaseOf(t, t.phraseAt, true), 'doors');
  assert.equal(T.phaseOf(t, t.end, true), 'over');
  assert.equal(T.phaseOf(t, t.unlockAt + 1, false), 'unpaid');
});
test('reveal rules: unpaid, too early, limit and over are all refused', () => {
  const ok = (o) => T.canReveal(Object.assign({ paid: true, phase: 'ready', revealCount: 0, max: 3 }, o));
  assert.equal(ok({}).ok, true);
  assert.equal(ok({ paid: false }).reason, 'unpaid');
  assert.equal(ok({ phase: 'locked' }).reason, 'too_early');
  assert.equal(ok({ phase: 'over' }).reason, 'over');
  assert.equal(ok({ revealCount: 3 }).reason, 'limit');
  assert.equal(ok({ phase: 'doors', revealCount: 2 }).ok, true);
});
test('Square signature: matches an independent HMAC, and any change breaks it', async () => {
  const key = 'sig-key', url = 'https://example.supabase.co/functions/v1/square-webhook', body = '{"type":"payment.updated","data":{"id":"abc"}}';
  const want = crypto.createHmac('sha256', key).update(url + body).digest('base64');
  assert.equal(await T.squareSignature(key, url, body), want);
  assert.equal(await T.squareSignatureOk(key, url, body, want), true);
  assert.equal(await T.squareSignatureOk(key, url, body + ' ', want), false);        // re-serialised body
  assert.equal(await T.squareSignatureOk(key, url + '/', body, want), false);        // trailing slash
  assert.equal(await T.squareSignatureOk('wrong', url, body, want), false);
  assert.equal(await T.squareSignatureOk(key, url, body, ''), false);
});
test('tokens and door phrase', async () => {
  const a = T.newToken(), b = T.newToken(); assert.notEqual(a, b); assert.match(a, /^[A-Za-z0-9_-]{22}$/);
  assert.match(await T.sha256Hex('x'), /^[0-9a-f]{64}$/);
  const p = await T.doorPhrase(SECRET, 'ed01'); assert.match(p, /^[a-z]+ [a-z]+$/); assert.equal(p, await T.doorPhrase(SECRET, 'ed01'));
  assert.notEqual(p, await T.doorPhrase(SECRET, 'ed02'));
});

test('card token: stable per ticket and version, different otherwise, revocable', async () => {
  const a = await T.macToken('srv', 'ticket-1', 0);
  assert.equal(a, await T.macToken('srv', 'ticket-1', 0));
  assert.notEqual(a, await T.macToken('srv', 'ticket-2', 0));
  assert.notEqual(a, await T.macToken('srv', 'ticket-1', 1));      // bumping the version revokes the old link
  assert.notEqual(a, await T.macToken('other', 'ticket-1', 0));
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
});

test('the server copy of the logic is byte-identical to the one the browser prototype runs', () => {
  const fs = require('node:fs');
  assert.equal(fs.readFileSync(__dirname + '/../supabase/functions/_shared/ticket-logic.js', 'utf8'), fs.readFileSync(__dirname + '/../../site/assets/js/lr-ticket.js', 'utf8'),
    'run: node tools/sync-server-logic.js');
});
