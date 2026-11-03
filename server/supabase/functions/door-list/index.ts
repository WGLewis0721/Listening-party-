// POST { event } with header x-door-key → the paid guest list for the door: name, seats, reference, checked-in time.
// Names only (no emails, no address). STATUS: written, untested live.
import { admin, env, fail, json, preflight, T } from "../_shared/util.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (!env("DOOR_KEY") || !T.ctEq(req.headers.get("x-door-key") ?? "", env("DOOR_KEY"))) return fail("forbidden", "Staff key required.", 403);
  const b = await req.json().catch(() => ({})), event = String(b.event ?? "");
  if (!event) return fail("invalid", "Missing event.");
  const { data, error } = await admin().from("tickets").select("name, qty, ref, checked_in_at").eq("event_id", event).eq("state", "paid").order("name");
  if (error) return fail("server", "Could not load the list.", 500);
  return json({ guests: (data ?? []).map((t) => ({ name: t.name, qty: t.qty, ref: t.ref, checkedInAt: t.checked_in_at ? Date.parse(t.checked_in_at) : null })) });
});
