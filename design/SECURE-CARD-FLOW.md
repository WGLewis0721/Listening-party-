# Secure card flow: Hold, Pay, Unlock

How a buyer gets a card, how the address stays secret, and what is real versus simulated today. Decisions: **Square** for payments, a **public venue**, and the address released **3 hours before doors**. The demo venue is the Montgomery Museum of Fine Arts, One Museum Drive, Montgomery, AL 36117, used purely as a stand-in. No event is scheduled there and it is not affiliated.

## The flow

```
1  Pick seats, name, email
2  The server holds the seats for 30 minutes. A card appears LOCKED, with the buyer's name on it.
3  "Pay with Square": hand off to Square's hosted checkout (we never touch card data)
4  Square's signed webhook, server to server, is the only thing that marks the order paid
5  The browser returns to the SAME card and asks the server. The card flips to Paid
6  An email carries a private link, never the address
7  3 hours before doors the server releases the address, behind a hold-to-reveal, under a live watermark
8  At doors: a door phrase appears, staff scan a rotating code and match the name
```

**Why not card first, then pay?** A card that already contains the address means the secret was out before any money moved. The card is shown first *visually* (it builds commitment) but stays locked until Square confirms.

## What a card shows, by state

| State | Card shows | The server will give out |
| --- | --- | --- |
| Held | Name, a 30-minute countdown, a locked address | Nothing secret |
| Confirming | "Confirming with Square", nothing unlocked | Nothing |
| Paid, before T-3h | The area, a rotating entry code, a countdown to the unlock | The area. Refuses `reveal` |
| Ready (T-3h) | A hold-to-reveal button, 3 reveals | The address, once per reveal |
| Doors (T-30m) | A door phrase, the live code | Door phrase |
| Checked in | "Checked in 8:07 PM" | Nothing more |
| Expired or released | The seats went back on sale | Nothing |

## The screenshot problem

The web cannot block a screenshot or a photo of a screen. So the design makes a leak **late, traceable, short-lived and not enough to get in**.

| Defense | What it does | What it does not do |
| --- | --- | --- |
| Late release | The address exists on the card for hours, not weeks | A leak in that window still spreads |
| Server-gated | The address is never in the page, the JS, the email or the calendar file until the server says so | Cannot hide it from the person it is shown to |
| Hold to reveal | Press and hold for 1s. Hides after 20s, when you switch tabs or when the page hides. 3 reveals | Does not stop a screenshot during the 20s |
| Live watermark | Name, reference and a ticking clock tiled over the address | Does not stop sharing; it makes sharing attributable |
| Rotating entry code | Changes every 30s, one use, bound to the name | A screenshot of the address still shows the address |
| The door | Entry needs a valid live code **and** the name on the list | Knowing the address alone gets nobody in |
| Door phrase | Appears at T-30m on the card only | Can still be passed along by a buyer |
| Address-free exports | The saved card image and the calendar file carry the area only | Buyers can still screenshot the live card |

**Policy matters as much as pixels.** For a 60-seat, friends-of-friends room, a traceable leak is the strongest deterrent. Say in the terms that cards are personal, that reveals are logged, and what happens on a leak.

## What is real and what is simulated

| Part | Status |
| --- | --- |
| Rotating code, release schedule, reveal rules, Square signature check, tokens | **Real and tested.** 9 unit tests in `server/test/ticket-logic.test.js`, shared by the browser prototype and the server |
| Hold, Pay, Unlock UI, hold-to-reveal, watermark, door page, exports | **Real UI, tested end to end.** 33 browser checks on three skins plus phone width, run repeatedly |
| The address never being in the page, the public config, the exports or the calendar file | **Tested.** Asserted before payment, while held, after payment, after hiding and after reload |
| Server refuses early, wrong-token and over-limit reveals even if the UI is bypassed | **Tested** against the simulator, and in SQL for the limit |
| Database: seat holds, no oversell, idempotent payments, late-payment refund flag, atomic reveal cap, one check-in | **Tested on real PostgreSQL 16**: 27 checks in `server/test/sql_test.py`, including 8 parallel buyers for 1 seat and 6 parallel reveals against a cap of 3 |
| Edge functions (reserve, square-webhook, ticket, reveal, door-verify) | **Written and type-checked** with Deno. Never deployed or run |
| Square payment link and webhook | **Written from Square's docs, not run** against a sandbox or live account |
| Email, camera scanning, real phones, screen readers | **Not built or not tested** |
| The checkout today | **Simulated.** The "Square" page is a stand-in; the simulator lives in `site/assets/js/lr-api-mock.js` and is the one file that holds the demo address and signing secret |

## Go live with Square (sandbox first)

1. **Square Developer Console:** create an application. In the sandbox note the **access token** and **location ID**.
2. **Supabase:** create a project. Run `server/supabase/migrations/0001_init.sql`, then insert your event (the commented example at the bottom). The real address goes in `venue_address`, nowhere else.
3. **Secrets:** set the values below with `supabase secrets set`. Never commit them or paste them into chat.
4. **Deploy:** `supabase functions deploy reserve ticket reveal door-verify` and `supabase functions deploy square-webhook --no-verify-jwt` (Square cannot send a Supabase JWT).
5. **Webhook:** in Square, add a subscription to `payment.updated` with the notification URL set exactly to `SQUARE_WEBHOOK_URL` (a trailing slash changes the signature). Copy its signature key into `SQUARE_WEBHOOK_SIGNATURE_KEY`.
6. **Site:** in `edition.js` set `payment: { provider: 'square', mode: 'live', apiBase: 'https://<project>.supabase.co/functions/v1' }`, and load the real address into the database.
7. **Test in the sandbox end to end**, including a declined card, a refresh mid-payment and a double webhook. Then switch `SQUARE_BASE` to production.

| Secret | What it is |
| --- | --- |
| `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID` | Square credentials. Sandbox first |
| `SQUARE_BASE` | `https://connect.squareupsandbox.com` or `https://connect.squareup.com` |
| `SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_WEBHOOK_URL` | From the Square webhook subscription |
| `TOKEN_SECRET` | Random 32+ bytes. Derives each buyer's private card link |
| `IP_SALT` | Random string. Hashes IPs in the reveal log |
| `DOOR_KEY` | The staff key for the door tool |
| `SITE_URL`, `SITE_ORIGIN` | Your published site, for redirects and CORS |
| `RESEND_API_KEY`, `MAIL_FROM` | Optional. Sends the private card link by email |

## Before real tickets

- **Verify Square's webhook signature scheme.** Square's own page does not spell out how the URL and body are combined. The code signs `notificationUrl + rawBody` as third-party guides describe. Confirm it against Square's SDK helper in the sandbox before relying on it.
- **Refunds and leaks:** write the policy. A payment that arrives after the hold lapsed and the seat was resold is flagged `paid_review` for a human refund.
- **Privacy:** reveals are logged with a salted IP hash. Say so in the terms.
- **Rate limits and abuse:** add rate limiting at the edge on `reserve` and `reveal`.
- **Accessibility:** hold-to-reveal has a keyboard path (hold Space or Enter), a "reveal with a tap" option and a screen-reader path. Test with a real screen reader.
- **Real devices:** the pinned scroll, the hold gesture and the watermark need phone testing.
- **Door:** camera scanning (`BarcodeDetector` or a JS decoder) is the next build. The verification it calls already exists.
- **Transfers:** "Send my seat" (bump `token_version`, rebind the name) turns sharing into a managed transfer instead of a leak.
