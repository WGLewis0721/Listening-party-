# Server: Square checkout, seat holds, the address gate, the door

Supabase (Postgres + edge functions) behind the static site. Read `design/SECURE-CARD-FLOW.md` first: it explains the flow, the threat model and the go-live steps.

**Status: written and statically verified; never deployed and never run against Square.**

```
supabase/migrations/0001_init.sql        tables, row level security, hold_seats / mark_paid / record_reveal / check_in
supabase/functions/reserve               hold seats, create the Square payment link
supabase/functions/square-webhook        verify Square's signature, confirm the payment, mark paid, email the private link
supabase/functions/ticket                the card's public view (never the address)
supabase/functions/reveal                the address, only if paid AND past T-3h AND under the reveal cap
supabase/functions/door-verify           verify the rotating code, check the guest in once (staff key)
supabase/functions/_shared/              helpers; ticket-logic.js is a byte-identical copy of site/assets/js/lr-ticket.js
test/ticket-logic.test.js                node unit tests for the shared logic
test/sql_test.py                         runs the migration on real PostgreSQL and tests the money-adjacent rules, with concurrency
```

## What was verified, and how

| Check | Command | Result |
| --- | --- | --- |
| Shared logic (rotating code, schedule, reveal rules, Square signature, tokens, copy in sync) | `node --test server/test/ticket-logic.test.js` | 9 of 9 |
| SQL on real PostgreSQL 16 (capacity, 8-way race for 1 seat, expiry, idempotent payment, oversold flag, reveal cap under 6-way race, one check-in, anon cannot read or call anything) | `PGHOST=… PGPORT=… python3 server/test/sql_test.py` | 27 of 27 |
| Edge functions type-check | `deno check supabase/functions/<fn>/index.ts` | all 5 clean |

Not verified: a deployed function, a real Square sandbox call, email delivery. Do the sandbox pass before anything else.

## Keep the shared logic in sync

The browser prototype and the server run the same file. After editing `site/assets/js/lr-ticket.js`:

```bash
node tools/sync-server-logic.js && node --test server/test/ticket-logic.test.js
```

## Deploy

```bash
supabase link --project-ref <ref>
supabase db push
supabase secrets set SQUARE_ACCESS_TOKEN=… SQUARE_LOCATION_ID=… SQUARE_BASE=https://connect.squareupsandbox.com \
  SQUARE_WEBHOOK_SIGNATURE_KEY=… SQUARE_WEBHOOK_URL=https://<ref>.supabase.co/functions/v1/square-webhook \
  TOKEN_SECRET=$(openssl rand -hex 32) IP_SALT=$(openssl rand -hex 16) DOOR_KEY=… SITE_URL=https://… SITE_ORIGIN=https://…
supabase functions deploy reserve ticket reveal door-verify
supabase functions deploy square-webhook --no-verify-jwt     # Square cannot send a Supabase JWT; the signature is the auth
```
