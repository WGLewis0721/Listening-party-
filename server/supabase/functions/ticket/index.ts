// POST { rid, token } → the card's public view: state, phase, area, rotating entry code. NEVER the address. STATUS: written, untested live.
import { admin, authedTicket, effectiveState, fail, json, preflight, REVEAL_SECONDS, T, times } from "../_shared/util.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const b = await req.json().catch(() => ({})), sb = admin();
  const a = await authedTicket(sb, String(b.rid ?? ""), String(b.token ?? "")); if (a.error) return a.error;
  const { t, ev } = a, now = Date.now(), st = effectiveState(t, now), paid = st === "paid", tm = times(ev);
  const phase = t.checked_in_at ? "in" : paid ? T.phaseOf(tm, now, true) : st;
  const v: Record<string, unknown> = { rid: t.id, state: st, phase, name: t.name, qty: t.qty, ref: t.ref, total: t.qty * ev.price_cents / 100, holdUntil: Date.parse(t.hold_until),
    area: paid ? ev.venue_area : null, serverNow: now, fetchedAt: Date.now(), times: tm, revealsLeft: Math.max(0, ev.max_reveals - t.reveal_count), revealSeconds: REVEAL_SECONDS, paidAt: t.paid_at ? Date.parse(t.paid_at) : null, checkedInAt: t.checked_in_at ? Date.parse(t.checked_in_at) : null };
  if (paid) { v.qr = await T.qrPayload(ev.qr_secret, t.ref, now); v.qrStep = T.qrStep(now); }
  return json(v);
});
