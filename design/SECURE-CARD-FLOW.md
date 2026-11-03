# Secure card flow: Hold, Pay, Unlock

How a buyer gets a card, how the address stays secret, and what is real versus simulated today. Decisions: **Square** for payments, a **public venue**, and the address released **3 hours before doors**. The demo venue is the Montgomery Museum of Fine Arts, One Museum Drive, Montgomery, AL 36117, used purely as a stand-in. No event is scheduled there and it is not affiliated.

## The flow (what a guest sees)

```
1  Type a name and an email, tap "Pay $50.00"           one button; the server quietly holds the seats for 30 minutes
2  Pay on Square's page (card, Apple Pay, Google Pay)   we never see card data
3  Come back to a card that says "You're in"            Square's signed confirmation (not the browser) is what unlocks it
4  3 hours before doors the card shows "Show the address"   one tap, 45 seconds, watermarked, "Open in Maps" beside it
5  At doors the card puts one big code at the top       "Show this at the door"; the screen stays awake
```

Every screen has one headline, one sentence and one obvious button. Anything else (save a picture, copy my link, get more seats) sits under **More**. A guest who loses the tab is rescued by the email link and by the card remembering them on the same phone.

**Why not card first, then pay?** A card that already contains the address means the secret was out before any money moved. The card is shown first *visually* (it builds commitment) but stays locked until Square confirms.

## What a card shows, by state

| State | The one sentence | The one button | The server will give out |
| --- | --- | --- | --- |
| Reserve | "Pay now and your card is ready right away. The exact address appears on your card 3 hours before doors." | Pay $50.00 | Nothing secret |
| Not paid yet (came back) | "2 seats are saved for you." + a countdown | Pay $50.00 (and a small "Cancel") | Nothing secret |
| Checking | "Checking your payment…" | none | Nothing |
| Paid, before the release | "Your address will appear on this card on Thu, Nov 19 at 5:00 PM." | Add to my calendar | The area. Refuses the address |
| Ready (T-3h) | "Your address is ready. Tap “Show the address” on your card." | Show the address | The address, once per tap |
| Doors (T-30m) | "Doors are open. Show the code on your card to the person at the door." | none: the code is at the top of the card | The live code |
| Checked in | "You're checked in at 8:07 PM. Enjoy the night." | none | Nothing more |
| Expired or cancelled | "Those seats were given back." | Start over | Nothing |

## The screenshot problem

The web cannot block a screenshot or a photo of a screen. So the design makes a leak **late, traceable, short-lived and not enough to get in**.

| Defense | What it does | What it does not do |
| --- | --- | --- |
| Late release | The address exists on the card for hours, not weeks | A leak in that window still spreads |
| Server-gated | The address is never in the page, the JS, the email or the calendar file until the server says so | Cannot hide it from the person it is shown to |
| Tap to show, then hide | One tap shows it for 45 seconds, then it hides, also when you switch tabs or leave the page. 5 views. "Open in Maps" means nobody has to read or copy it | Does not stop a screenshot during the 45 seconds |
| Live watermark | Name, reference and a ticking clock tiled over the address | Does not stop sharing; it makes sharing attributable |
| Code only at the door | The entry code does not exist on the card until 30 minutes before doors, then it rotates every 30 seconds and works once | A screenshot of the address still shows the address |
| The door | Entry needs a valid live code **and** the guest's name on the screen | Knowing the address alone gets nobody in |
| Address-free exports | The saved card picture and the calendar file carry the area only | Buyers can still screenshot the live card |

A hold-to-reveal gesture was tried and removed: it had to be explained, and it added almost nothing against a screenshot, which is the real threat. The limit moved from 3 views of 20 seconds to 5 views of 45 seconds for the same reason: a guest who is lost and out of views is a call the host cannot take on the night. The host can raise or lower it per event (`events.max_reveals`).

**Policy matters as much as pixels.** For a 60-seat, friends-of-friends room, a traceable leak is the strongest deterrent. Say in the terms that cards are personal, that reveals are logged, and what happens on a leak.

## What is real and what is simulated

| Part | Status |
| --- | --- |
| Rotating code, release schedule, reveal rules, Square signature check, tokens | **Real and tested.** 9 unit tests in `server/test/ticket-logic.test.js`, shared by the browser prototype and the server |
| Pay, locked card, tap to show, watermark, door page, exports | **Real UI, tested end to end.** `tools/qa/secure-flow.js`: about 45 browser checks, on desktop, a phone width and other skins |
| Door camera | **Tested with a fake phone camera** filming a real guest's QR (`tools/qa/door-camera.js`): reads it, turns green, does not double-flash, closes cleanly, and degrades to the name list. Chromium has no built-in QR detector, so this covers the jsQR path (older iPhones); newer phones use the built-in detector, which is untested here |
| "Does anyone have to explain this?" | **Checked by a script** (`tools/qa/plain-words.js`): every screen has 1 to 5 things to tap, no technical words, reading grade about 1 to 2, and the one action is on a phone's first screen |
| The address never being in the page, the public config, the exports or the calendar file | **Tested.** Asserted before payment, while held, after payment, after hiding and after reload |
| Server refuses early, wrong-token and over-limit reveals even if the UI is bypassed | **Tested** against the simulator, and in SQL for the limit |
| Database: seat holds, no oversell, idempotent payments, late-payment refund flag, atomic reveal cap, one check-in | **Tested on real PostgreSQL 16**: 30 checks in `server/test/sql_test.py`, including 8 parallel buyers for 1 seat, 6 parallel reveals against a cap of 5, and one check-in per ticket whether scanned or picked by name |
| Edge functions (reserve, square-webhook, ticket, reveal, door-verify, door-list) | **Written and type-checked** with Deno. Never deployed or run |
| Square payment link and webhook | **Written from Square's docs, not run** against a sandbox or live account |
| Email, real phones, screen readers, the built-in QR detector path | **Not built or not tested** |
| The checkout today | **Simulated.** The "Square" page is a stand-in; the simulator lives in `site/assets/js/lr-api-mock.js` and is the one file that holds the demo address and signing secret |

## Go live with Square (sandbox first)

1. **Square Developer Console:** create an application. In the sandbox note the **access token** and **location ID**.
2. **Supabase:** create a project. Run `server/supabase/migrations/0001_init.sql`, then insert your event (the commented example at the bottom). The real address goes in `venue_address`, nowhere else.
3. **Secrets:** set the values below with `supabase secrets set`. Never commit them or paste them into chat.
4. **Deploy:** `supabase functions deploy reserve ticket reveal door-verify door-list` and `supabase functions deploy square-webhook --no-verify-jwt` (Square cannot send a Supabase JWT).
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

## Running the night (for the host)

You do not need to train anyone. This is the whole briefing.

**Guests** need nothing from you. If someone is lost: "Open the link in your email, tap Show the address, then Open in Maps."

**Door volunteers** (read this out loud once, 15 seconds):

1. Open the door link on your phone. (You do this once; the phone remembers it.)
2. Tap the big **Scan a guest** button and point the phone at the guest's screen.
3. **Green** with a name: let them in. **Yellow**: they are already in. **Red**: do not let them in yet; look the name up in the list below.
4. No phone or dead battery? Type part of their name, tap **Let in**, check their name or ID, tap **Yes, let them in**.

The door link is `door.html#key=<DOOR_KEY>` on your site. Send it to each volunteer by text. The key leaves the address bar as soon as the page opens, and it stays on that phone only. To cut someone off, change `DOOR_KEY` and send the new link to the others.

Anyone checked in by name is logged as such (`checked_in_via = 'name'`), so you can see afterwards who was let in by hand.

## Before real tickets

- **Verify Square's webhook signature scheme.** Square's own page does not spell out how the URL and body are combined. The code signs `notificationUrl + rawBody` as third-party guides describe. Confirm it against Square's SDK helper in the sandbox before relying on it.
- **Refunds and leaks:** write the policy. A payment that arrives after the hold lapsed and the seat was resold is flagged `paid_review` for a human refund.
- **Privacy:** reveals are logged with a salted IP hash. Say so in the terms.
- **Rate limits and abuse:** add rate limiting at the edge on `reserve` and `reveal`.
- **Accessibility:** the address and door screens are plain buttons with live announcements. Test with a real screen reader.
- **Real devices:** the pinned scroll, the hold gesture and the watermark need phone testing.
- **Door on a real phone:** the camera path is tested with a fake feed. Try it once on an iPhone and an Android in the dark, in a doorway, before the night.
- **Transfers:** "Send my seat" (bump `token_version`, rebind the name) turns sharing into a managed transfer instead of a leak.
