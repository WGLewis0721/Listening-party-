# Listening Room

A monthly listening party for Montgomery, as a one-page, scroll-driven site. One pinned hero is the whole site: scrolling takes a visitor from "who is it?" to "how do I get in?" in five beats, ending on a ticket. A separate pay page builds the customer card, in the same skin, and unlocks the venue address.

- **Live site:** `site/` (Pages deploys it from `main`). A fictional DJ, Nova Vale, in the Quiet Spectra skin (Mirror Finish tokens).
- **Client review site:** `concepts/` (published at `/concepts/`). One page where a client previews all five concepts live, flips between skins with a switcher that keeps their scroll position, generates the customer card for any concept (or all five), and picks a favorite and a second choice. `concepts/review.html` is the full-screen version with the skin switcher.
- **Secure card flow:** hold seats, pay with Square, then unlock. The address never reaches the browser until 3 hours before doors, behind a hold-to-reveal and a live watermark; a rotating code and a door check mean a screenshot does not get anyone in. `design/SECURE-CARD-FLOW.md`, `site/door.html`, and the server in `server/`.
- **Design work:** `design/` has the brand boards, wireframes, requirements map, UX audit and research.
- **Tools:** `tools/` has the gallery and docs builders and the QA scripts.

Everything artist-related here is **fictional**. Replace the DJ, the set and the venue in `edition.js` before promoting a real night.

## How it works

One engine, one file per edition.

```
site/
  index.html        the hero (never edited)
  pay.html          checkout + customer card (never edited)
  edition.js        the only file edited each month: DJ, set, copy, palette, face, motif
  assets/           css, js (GSAP, ScrollTrigger, QR, shaders), self-hosted fonts
concepts/NN-name/   the same three files for each concept skin
concepts/index.html the client picker (previews, card generator, pick)
concepts/review.html all five skins in one hero, with the in-place skin switcher
```

To make a new month: copy a concept folder, edit `edition.js`, check the contrast rows on `design/brand-boards.html`, deploy. Details in `design/BRAND-SYSTEM.md`.

## Run it

```bash
python3 -m http.server 8800     # from the repo root
# live site:  http://localhost:8800/site/
# client site:  http://localhost:8800/concepts/        (full-screen switcher: /concepts/review.html)
# boards:     http://localhost:8800/design/brand-boards.html
```

No build step. Fonts, GSAP and the QR library are self-hosted, so there are no third-party requests.

## Status

- The checkout is **simulated**: nothing is charged and no card is collected. The Square server in `server/` is written and tested statically but not deployed. See `HANDOFF.md`.
- The page is `noindex` until you remove that meta tag.
- Quality checks (layout, text size, tap targets, scroll states, contrast over the live art, Reduce Motion, the pay flow) are scripted in `tools/qa/` and reported in `design/UX-AUDIT.md`. Real-device and screen-reader testing are not done yet.

Licenses: GSAP is free under its standard license; fonts are SIL OFL (Fontsource builds); `qrcode-generator` is MIT.

See `HANDOFF.md` for launch steps.
