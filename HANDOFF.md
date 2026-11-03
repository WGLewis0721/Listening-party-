# Handoff · Listening Room

## Status

- **Live page:** `site/`, deployed to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`. URL: `https://wglewis0721.github.io/Listening-party-/`.
- **Client review site:** `/concepts/` on the same URL (picker, card generator, skin switcher), plus `/design/` (boards, wireframes, requirements, audit). The workflow assembles `_site/` from `site/` (root), a second copy of `site/` (the concept pages reference `../site/assets`), `concepts/` and `design/*.html`. Everything published is fictional and `noindex`.
- **Artist:** Nova Vale, fictional. Venue "The Annex Room" and its address are placeholders.
- **Checkout:** a simulated Hold → Pay → Unlock flow with a stand-in for Square. No card is collected and nothing is charged. The real Square + Supabase server is written, type-checked and database-tested (27 SQL checks on PostgreSQL 16), but **never deployed and never run against Square**. See `design/SECURE-CARD-FLOW.md` and `server/README.md`.
- **Verified:** scripted checks on all five skins (see `design/UX-AUDIT.md`). **Not verified:** real phones, screen readers, 200% zoom, live payments.

## Before a real night

1. **Replace the content** in `site/edition.js`: DJ, tagline, statement, five set slots with `energy`, date, doors, price, capacity.
2. **Payments (Square).** Deploy `server/` and switch `payment.mode` to `'live'` (steps, secrets and the Square sandbox pass are in `design/SECURE-CARD-FLOW.md`). Verify Square's webhook signature scheme against their SDK helper in the sandbox first.
3. **The secret address.** It is no longer in `edition.js`. It lives in the database and the server releases it 3 hours before doors, behind a hold-to-reveal and a live watermark. The demo venue (a real museum used as a stand-in) lives only in `site/assets/js/lr-api-mock.js`: remove the mock and demo-clock script tags from `pay.html` and `door.html` before real tickets.
4. **Seats.** `seatsLeft` is `null`, so no count is shown. Wire it to real inventory or leave it off. Do not show a made-up number.
5. **Indexing.** Remove `<meta name="robots" content="noindex">` from `site/index.html` and `site/pay.html` when ready to be found.
6. **Check on a phone.** The pinned scroll over a collapsing mobile browser bar and WebGL frame rate on a mid-range phone are the two untested risks.

## The secure card flow

- `site/pay.html`: hold seats → simulated Square → card → hold-to-reveal. `site/door.html`: staff check-in (demo). Both talk to `LR.api`: the simulator today (`lr-api-mock.js`), the real server later (`lr-api-live.js`).
- `server/`: Supabase schema and five edge functions for Square. `node --test server/test/ticket-logic.test.js` and `python3 server/test/sql_test.py` (needs a scratch PostgreSQL).
- The demo has a **Demo clock** (bottom left) to jump to T-3h and doors. It is prototype-only.

## The client review site

- `concepts/index.html`: five live previews (laptop or phone), a skin switcher, **Generate customer card** per concept and for all five, a favorite, a second choice and a note, with Copy, Email and Share. Nothing is sent anywhere: the pick lives in the browser and in the message the client copies. Set `PICK_TO` at the top of the script to pre-address the "Email my pick" button (leave it empty in a public repo if you do not want your address published).
- `concepts/review.html?skin=N`: the real hero with a skin switcher (buttons, arrow keys, or 1 to 5). Switching swaps the edition in place via `LR.hero.mount()` / `destroy()` and keeps the scroll position, so skins compare at the same beat.
- `concepts/gallery.html`: the simple link gallery (`python3 tools/build_gallery.py repo`).

## Design artifacts (`design/`)

- `SECURE-CARD-FLOW.md`: the Hold → Pay → Unlock flow, the screenshot problem, what is tested, and the Square go-live steps.
- `brand-boards.html`: frame vs skin, five boards, live contrast, type, motion, locked and confirmed cards. Generated from the real edition files.
- `wireframes.html`: funnel map, desktop and phone beats, pay page, ticket anatomy (`python3 tools/make_wireframes.py` regenerates it).
- `REQUIREMENTS-MAP.md`: every requirement mapped to a UI decision and a UX law.
- `UX-AUDIT.md`: measured results, defects found and fixed, open issues.
- `RESEARCH.md`, `BRAND-SYSTEM.md`: references, techniques, type, and how to produce a new edition.
- `listening-room-canvas/`: the Quiet Spectra poster and its philosophy.
- The `.html` versions of the Markdown files come from `python3 tools/build_docs.py` (needs `pip install markdown`).

## Rules for future changes

- **Do not add real artists' names, likenesses, logos, album art or tour data to this repo.** It is public. The concept pages use fictional DJs for this reason.
- Do not commit anything that is not meant for public viewing.
- Keep the Pages assembly step in `pages.yml` in step with the folders the pages reference (`../site/assets`).
- Every edition must keep: one filled button at a time, 12px minimum labels, 44px tap targets, and text legible over the live art (`tools/qa/`).

## Notes on files already in the repo

- `03-dj-khalid-golden-hour.html`, `04-daft-punk-chrome.html`, `listening-party-concepts.zip` and `listening-party-concepts-full.zip` at the repo root are an earlier first pass, uploaded before this rebuild. They contain real artist names in their **filenames** (the page contents use fictional DJs), which the rule above forbids in this public repo, and the pages are superseded by `concepts/`. They are left in place. Delete them, or move them to a private location, when you are ready; they are not served by Pages.
- Because this repo is public, git history keeps those filenames even after deletion.

## Private bundle

The five concepts for your friend ship as a separate private bundle (a shareable page and a zip) that adds a "reference vibe" per concept and an `ARTIST-REFERENCES` note. That bundle names real artists and so must never be committed here.
