// POST { event, name, email, qty } → holds the seats and returns a Square checkout URL. STATUS: written, untested live.
import { admin, env, fail, json, newRef, preflight, tokenFor, T } from "../_shared/util.ts";
import { createPaymentLink } from "../_shared/square.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== "POST") return fail("method", "POST only", 405);
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim().slice(0, 80), email = String(b.email ?? "").trim().slice(0, 120), qty = Number(b.qty), eventId = String(b.event ?? "");
  if (name.length < 2) return fail("invalid", "Add the name for the card.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("invalid", "Enter a valid email so we can send your card link.");
  if (!Number.isInteger(qty)) return fail("invalid", "Choose how many seats.");
  const sb = admin(), ref = newRef();
  const { data: id, error } = await sb.rpc("hold_seats", { p_event: eventId, p_name: name, p_email: email, p_qty: qty, p_ref: ref, p_hold_min: 30 });
  if (error) { const m = error.message || ""; return m.includes("sold_out") ? fail("sold_out", "Not enough seats are left.", 409) : m.includes("bad_qty") ? fail("invalid", "That is too many seats for one order.") : fail("server", "Could not hold your seats.", 500); }
  const { data: ev } = await sb.from("events").select("price_cents").eq("id", eventId).single();
  try {
    const link = await createPaymentLink({ ticketId: id, ref, qty, unitCents: ev!.price_cents, email, redirectUrl: `${env("SITE_URL")}/pay.html?r=${id}` });
    await sb.from("tickets").update({ square_order_id: link.orderId, state: "pending" }).eq("id", id);
    return json({ rid: id, token: await tokenFor(id, 0), checkoutUrl: link.url });
  } catch (_e) { await sb.from("tickets").update({ state: "cancelled" }).eq("id", id); return fail("payments", "We could not start checkout. Please try again.", 502); }
});
