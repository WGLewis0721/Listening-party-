// POST { payload } or { ref } with header x-door-key.
//   { payload }: the guest's live code (from the camera). Verifies the rotating code, then checks the guest in once.
//   { ref }:     staff picked the name from the list (guest's phone is dead, no signal). Checks in once; logged as 'name'.
// STATUS: written, untested live.
import { admin, env, fail, json, preflight, T } from "../_shared/util.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (!env("DOOR_KEY") || !T.ctEq(req.headers.get("x-door-key") ?? "", env("DOOR_KEY"))) return fail("forbidden", "Staff key required.", 403);
  const b = await req.json().catch(() => ({})), sb = admin();
  let ref = "", via = "scan";
  if (b.ref) {                                                    // picked from the list
    ref = String(b.ref).trim(); via = "name";
    if (!/^LR-ED\d{2}-[A-Z0-9]{6}$/.test(ref)) return json({ ok: false, reason: "format" });
  } else {                                                        // scanned
    const payload = String(b.payload ?? "").trim(), m = /^LR1\.(LR-ED\d{2}-[A-Z0-9]{6})\./.exec(payload); if (!m) return json({ ok: false, reason: "format" });
    const { data: t } = await sb.from("tickets").select("ref, name, qty, state, events(qr_secret)").eq("ref", m[1]).maybeSingle();
    if (!t) return json({ ok: false, reason: "notfound" });
    // deno-lint-ignore no-explicit-any
    const v = await T.verifyQr((t as any).events.qr_secret, payload, Date.now(), 1);
    if (!v.ok) return json({ ok: false, reason: v.reason, name: t.name });
    ref = t.ref;
  }
  const { data } = await sb.rpc("check_in", { p_ref: ref, p_via: via }); const r = Array.isArray(data) ? data[0] : data;
  if (r?.result === "ok") return json({ ok: true, reason: "ok", name: r.name, qty: r.qty, ref, at: Date.parse(r.at), via });
  if (r?.result === "already") return json({ ok: false, reason: "already", name: r.name, qty: r.qty, ref, at: Date.parse(r.at) });
  return json({ ok: false, reason: via === "name" ? "notfound" : "unpaid" });
});
