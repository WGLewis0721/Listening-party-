// Square → us. The ONLY thing that marks an order paid. STATUS: written, untested against live Square.
// Set the Square webhook subscription URL to exactly SQUARE_WEBHOOK_URL (trailing slash matters) and subscribe to payment.updated.
import { admin, env, T, tokenFor } from "../_shared/util.ts";
import { getPayment } from "../_shared/square.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const raw = await req.text();                                          // the exact bytes: never re-serialise before verifying
  const ok = await T.squareSignatureOk(env("SQUARE_WEBHOOK_SIGNATURE_KEY"), env("SQUARE_WEBHOOK_URL"), raw, req.headers.get("x-square-hmacsha256-signature"));
  if (!ok) return new Response("bad signature", { status: 403 });
  const evt = JSON.parse(raw), payment = evt?.data?.object?.payment;
  const sb = admin();
  // Square has no replay protection: dedupe on event_id, and make the state change idempotent too.
  const { error: dup } = await sb.from("webhook_events").insert({ event_id: evt.event_id });
  if (dup) return new Response("ok (duplicate)", { status: 200 });
  if (evt.type !== "payment.updated" || !payment || payment.status !== "COMPLETED") return new Response("ok (ignored)", { status: 200 });
  const real = await getPayment(payment.id);                              // confirm with Square, do not trust the body alone
  if (real.status !== "COMPLETED") return new Response("ok (not complete)", { status: 200 });
  const { data: t } = await sb.from("tickets").select("id, qty, token_version, email, events(price_cents)").eq("square_order_id", real.order_id).maybeSingle();
  // deno-lint-ignore no-explicit-any
  const expect = t ? t.qty * (t as any).events.price_cents : -1;
  if (!t || real.amount_money.amount !== expect || real.amount_money.currency !== "USD") return new Response("ok (amount mismatch, flagged)", { status: 200 });
  const { data: result } = await sb.rpc("mark_paid", { p_order: real.order_id, p_payment: real.id });
  if (result === "paid") await emailCard(t.email, `${env("SITE_URL")}/pay.html?r=${t.id}#k=${await tokenFor(t.id, t.token_version)}`);
  return new Response("ok", { status: 200 });
});

/** Email carries a private link only, never the address (mail gets forwarded, indexed and synced). Uses Resend; swap for any provider. */
async function emailCard(to: string, link: string) {
  if (!env("RESEND_API_KEY")) return;
  await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Authorization": "Bearer " + env("RESEND_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({ from: env("MAIL_FROM"), to, subject: "Your Listening Room card", text: `You're in.\n\nYour private card: ${link}\n\nThe exact address unlocks on the card 3 hours before doors. Please don't share this link: it opens your card.` }) });
}
