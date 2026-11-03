// POST { payload } with header x-door-key → verifies the rotating code and checks the guest in once. STATUS: written, untested live.
import { admin, env, fail, json, preflight, T } from "../_shared/util.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (!env("DOOR_KEY") || !T.ctEq(req.headers.get("x-door-key") ?? "", env("DOOR_KEY"))) return fail("forbidden", "Staff key required.", 403);
  const b = await req.json().catch(() => ({})), payload = String(b.payload ?? "").trim(), sb = admin();
  const m = /^LR1\.(LR-ED\d{2}-[A-Z0-9]{6})\./.exec(payload); if (!m) return json({ ok: false, reason: "format" });
  const { data: t } = await sb.from("tickets").select("ref, name, qty, state, events(qr_secret)").eq("ref", m[1]).maybeSingle();
  if (!t) return json({ ok: false, reason: "notfound" });
  // deno-lint-ignore no-explicit-any
  const v = await T.verifyQr((t as any).events.qr_secret, payload, Date.now(), 1);
  if (!v.ok) return json({ ok: false, reason: v.reason, name: t.name });
  const { data } = await sb.rpc("check_in", { p_ref: t.ref }); const r = Array.isArray(data) ? data[0] : data;
  if (r.result === "ok") return json({ ok: true, reason: "ok", name: r.name, qty: r.qty, ref: t.ref, at: Date.parse(r.at) });
  if (r.result === "already") return json({ ok: false, reason: "already", name: r.name, qty: r.qty, ref: t.ref, at: Date.parse(r.at) });
  return json({ ok: false, reason: "unpaid" });
});
