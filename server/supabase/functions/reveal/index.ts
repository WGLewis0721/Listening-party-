// POST { rid, token } → the address, only if paid AND past T-3h AND under the reveal cap. STATUS: written, untested live.
import { admin, authedTicket, effectiveState, ipHash, json, preflight, REVEAL_SECONDS, T, times } from "../_shared/util.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const b = await req.json().catch(() => ({})), sb = admin();
  const a = await authedTicket(sb, String(b.rid ?? ""), String(b.token ?? "")); if (a.error) return a.error;
  const { t, ev } = a, now = Date.now(), paid = effectiveState(t, now) === "paid";
  const phase = paid ? T.phaseOf(times(ev), now, true) : "unpaid";
  const gate = T.canReveal({ paid, phase, revealCount: t.reveal_count, max: ev.max_reveals });
  if (!gate.ok) return json({ ok: false, reason: gate.reason, revealsLeft: Math.max(0, ev.max_reveals - t.reveal_count) });
  const { data: n } = await sb.rpc("record_reveal", { p_ticket: t.id, p_ip_hash: await ipHash(req), p_ua: req.headers.get("user-agent") ?? "" });
  if (n == null) return json({ ok: false, reason: "limit", revealsLeft: 0 });                  // lost a race to the cap: the database decides
  return json({ ok: true, address: `${ev.venue_name} · ${ev.venue_address}`, seconds: REVEAL_SECONDS, revealsLeft: Math.max(0, ev.max_reveals - n) });
});
