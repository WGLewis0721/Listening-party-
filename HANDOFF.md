# Handoff · Listening Room

## Status

- **Live page:** `site/`, deployed to GitHub Pages by `.github/workflows/pages.yml` on every push to `main` (the workflow uploads only `site/`). URL: `https://wglewis0721.github.io/Listening-party-/`.
- **Artist:** Nova Vale, fictional. Venue "The Annex Room" and its address are placeholders.
- **Checkout:** demo. No card is collected and nothing is charged.
- **Verified:** scripted checks on all five skins (see `design/UX-AUDIT.md`). **Not verified:** real phones, screen readers, 200% zoom, live payments.

## Before a real night

1. **Replace the content** in `site/edition.js`: DJ, tagline, statement, five set slots with `energy`, date, doors, price, capacity.
2. **Payment.** Set `payment: { mode: 'link', url: '<your Stripe or Square payment link>' }`. The pay page then redirects with a reference and the buyer's email. This path is an **untested template**. You still need a webhook that confirms payment and emails the ticket.
3. **The secret address.** Everything in `edition.js` is readable by anyone. For a real night remove `venueAddress` from the file and have your server release it only after the payment webhook fires (for example in the ticket email, or from an endpoint the pay page calls after confirmation). Until then the "unlock" is a demonstration.
4. **Seats.** `seatsLeft` is `null`, so no count is shown. Wire it to real inventory or leave it off. Do not show a made-up number.
5. **Indexing.** Remove `<meta name="robots" content="noindex">` from `site/index.html` and `site/pay.html` when ready to be found.
6. **Check on a phone.** The pinned scroll over a collapsing mobile browser bar and WebGL frame rate on a mid-range phone are the two untested risks.

## Design artifacts (`design/`)

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
- Keep the Pages upload path at `site/`.
- Every edition must keep: one filled button at a time, 12px minimum labels, 44px tap targets, and text legible over the live art (`tools/qa/`).

## Notes on files already in the repo

- `03-dj-khalid-golden-hour.html`, `04-daft-punk-chrome.html`, `listening-party-concepts.zip` and `listening-party-concepts-full.zip` at the repo root are an earlier first pass, uploaded before this rebuild. They contain real artist names in their **filenames** (the page contents use fictional DJs), which the rule above forbids in this public repo, and the pages are superseded by `concepts/`. They are left in place. Delete them, or move them to a private location, when you are ready; they are not served by Pages.
- Because this repo is public, git history keeps those filenames even after deletion.

## Private bundle

The five concepts for your friend ship as a separate private bundle (a shareable page and a zip) that adds a "reference vibe" per concept and an `ARTIST-REFERENCES` note. That bundle names real artists and so must never be committed here.
