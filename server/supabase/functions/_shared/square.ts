// Square Online Checkout: payment links + payment lookup. STATUS: written from Square's docs, NOT tested against a live or sandbox account.
// Docs: POST /v2/online-checkout/payment-links  → payment_link.url, payment_link.order_id
import { env } from "./util.ts";

const base = () => env("SQUARE_BASE", "https://connect.squareupsandbox.com");        // production: https://connect.squareup.com
const headers = () => ({ "Authorization": "Bearer " + env("SQUARE_ACCESS_TOKEN"), "Square-Version": env("SQUARE_VERSION", "2026-09-16"), "Content-Type": "application/json" });

export async function createPaymentLink(o: { ticketId: string; ref: string; qty: number; unitCents: number; email: string; redirectUrl: string }) {
  const res = await fetch(base() + "/v2/online-checkout/payment-links", {
    method: "POST", headers: headers(),
    body: JSON.stringify({
      idempotency_key: o.ticketId,                                                    // a retry returns the same link
      quick_pay: { name: `Listening Room · ${o.qty} seat${o.qty > 1 ? "s" : ""}`, price_money: { amount: o.qty * o.unitCents, currency: "USD" }, location_id: env("SQUARE_LOCATION_ID") },
      checkout_options: { redirect_url: o.redirectUrl },
      pre_populated_data: { buyer_email: o.email },
      payment_note: o.ref,
    }),
  });
  const j = await res.json();
  if (!res.ok || !j.payment_link) throw new Error("square_create_failed: " + JSON.stringify(j.errors ?? j));
  return { url: j.payment_link.url as string, orderId: j.payment_link.order_id as string };
}

/** Belt and braces: never trust the webhook body alone. Ask Square for the payment and check it is COMPLETED. */
export async function getPayment(paymentId: string) {
  const res = await fetch(base() + "/v2/payments/" + encodeURIComponent(paymentId), { headers: headers() });
  const j = await res.json(); if (!res.ok) throw new Error("square_get_payment_failed");
  return j.payment as { id: string; status: string; order_id: string; amount_money: { amount: number; currency: string } };
}
