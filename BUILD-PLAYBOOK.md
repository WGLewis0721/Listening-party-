# Listening Room: build playbook and handoff recap

How this site was built, in the order it was built, with the decisions, the tools, the tests and the mistakes, so it can be rebuilt for a new night or a new client. Written 2026-11-15 from the full build conversation and the repo at commit `ee330d7`.

- **Live:** https://wglewis0721.github.io/Listening-party-/
- **Client picker (five looks):** `/concepts/` · **skin switcher:** `/concepts/review.html?skin=1`
- **Repo:** `WGLewis0721/Listening-party-`, built on branch `claude/listening-room-v2`, deployed from `main` by GitHub Pages
- **Everything public is fictional.** DJs are made up. The venue on the demo ticket is a real museum used as a stand-in.

## 0. What exists, and what is real

| Piece | Status |
| --- | --- |
| One-page, scroll-animated, hero-only promo site; five visual "skins"; one config file per night | Built, tested, live |
| Pay page + customer ticket card in the same look as the hero | Built, tested, live (checkout is **simulated**) |
| Client review site: five live previews, in-place skin switcher, card generator, "pick a favorite" | Built, tested, live |
| Secure card flow: server-gated address, rotating entry code, door tool with camera scan | Built and tested against a **simulator**; the real server is written but **never deployed or run against Square** |
| Website plumbing: sitemap, share previews, CSP, security files, plain pages, deploy gate | Built, tested, live |
| Day-of "email everyone a card" sender (if tickets are sold elsewhere) | **Not built** (design only, section 9) |
| Real devices, screen readers, real payments, email | **Not tested / not built** |

## 1. Two ways to use this document

**A. A new night or a new DJ on the same system (about 15 minutes of work).**
1. Copy `concepts/05-brass-night/` to a new folder (its `index.html` and `pay.html` never change).
2. Edit its `edition.js`: DJ, tagline, statement, five set slots with an `energy` from 0 to 1, date, doors, price, capacity.
3. Pick a motif (`spectra`, `tunnel`, `sunburst`, `mercury`, `spotlight`), a display face and five colors; open `design/brand-boards.html` and make every contrast row green.
4. Add the page to the `PAGES` list in `tools/qa/audit.js` and `tools/qa/artcontrast.js`.
5. Run the checks (section 5), then push to `main`.

**B. A new project from scratch with the same method.** Follow section 3 phase by phase. Each phase says what to make, which files it produced here, and how it was proven done.

## 2. Timeline of requests (what was asked, what it produced)

| # | Request (paraphrased) | Produced |
| --- | --- | --- |
| 1 | From a screenshot of a Facebook post (monthly listening party, one DJ, intimate venue, snacks, advance tickets, location hidden until purchase "no exceptions"): design a 1-page, scroll-animated, hero-only site, customizable per DJ; a payment page that creates a customer card in the hero's look; research; brand board; wireframes; requirement-to-UI map; UX audit; 5 concepts plus 1 live site | `site/`, `concepts/`, `design/*`, `tools/*`, Pages workflow |
| 2 | "Preview link and after-action report. Sound hype." | Live preview URL and a recap |
| 3 | Show the client all five concepts in one site, let them pick, with a button to generate each customer card | `concepts/index.html` (picker) |
| 4 | Add a skin switcher so the client sees all skins without extra steps | `concepts/review.html`, `LR.hero.mount()/destroy()` |
| 5 | How can the cards be handed out securely and discreetly? Screenshots can be shared. Pay first or card first? | `design/SECURE-CARD-FLOW.md`, server scaffold, secure card UI |
| 6 | Decisions: Square for now; public venue (any museum in Montgomery, as a stand-in); address released 3 hours before doors | Simulator, door page, SQL, edge functions |
| 7 | "Make sure it's simple for non-tech people; nobody has time to explain things at the door" | One-button pay, tap-to-show address, camera door page, plain-words tests |
| 8 | "Is it good enough to show the client?" | Honest verdict plus three pre-send tasks; client message draft |
| 9 | Facebook comment drafts; learn the group already sells through an event platform, so the site becomes the promo layer that links out; the day-of card goes out by email to everyone who paid | Positioning only (no code), section 9 |
| 10 | Goal clarified: skills portfolio to win paid website work. Build a site map, "traditional website accoutrements" and security scaffolding | `tools/build_site.py`, `tools/check_site.py`, plain pages, CSP, `SECURITY.md` |
| 11 | Link in the comment is not clickable; "where are the other styles?" | Diagnosis (our side is fine); link guidance |
| 12 | This recap | This file |

## 3. The build process, phase by phase

### Phase 0: Intake and requirements
- Turn the source (a screenshot of a post) into a numbered requirement list **before** designing: P1 every month, P2 one DJ highlighted, P3 come to vibe, P4 DJ is free to be creative, P5 not a club, P6 intimate venue, P7 light snacks, P8 tickets in advance, P9 location only for buyers; B1-B10 for the build (one page, hero only, customizable, separate pay page, customer card, research, brand board, wireframes, five concepts, audit).
- Output: `design/REQUIREMENTS-MAP.md`. Every row maps a requirement to a UI decision and a UX law (Hick, Fitts, Jakob, Doherty, Peak-End, Postel) and names the test that proves it.
- Rule set early: **public repo, fictional DJs only**. Real-artist reference notes stay in a private bundle, never in the repo.

### Phase 1: Research (`design/RESEARCH.md`)
- Study top music and event sites for structure, type, motion, and detail; record what to take and what not to.
- Decisions that came out of it: one pinned hero with scroll-scrubbed beats; display type carries the personality; a scrubber that doubles as navigation; grain and glass panels for legibility.

### Phase 2: Brand system (`design/BRAND-SYSTEM.md`, `design/brand-boards.html`)
- **Frame (never changes) vs skin (changes per DJ).** The frame is why every month is the same quality; the skin is why each DJ feels unique.
- Frame: five beats (Arrive, Sound, Set, Room, Ticket) over about 520vh; bottom scrubber; exactly one filled button on screen; fixed ticket anatomy; 12-column grid; labels in JetBrains Mono at 12px or more; Reduce Motion becomes a stacked static page.
- Skin: motif shader, display face, palette `bg surface ink muted acc acc2 accOn`, motion feel (a GSAP ease), voice (slot names), grain.
- Guardrails every skin must pass: ink on void 7:1; muted 4.5:1; accent 4.5:1; on-accent 4.5:1; text over live art 4.5:1 (3:1 at 24px+); labels 12px+; tap targets 44px+.
- Five skins: Quiet Spectra (Nova Vale, `spectra`, Instrument Serif), LED Stage (Halogen Ghost, `tunnel`, Big Shoulders Display), Golden Hour (Amani Sol, `sunburst`, Bodoni Moda italic), Chrome Disco (Chrome Vector, `mercury`, Unbounded), Brass and Night (Marlowe Brass, `spotlight`, Fraunces italic).
- The boards are **generated from the real edition files**, so they cannot drift from the site.

### Phase 3: Wireframes (`design/wireframes.html`, `tools/make_wireframes.py`)
- Funnel map, desktop and phone beats, pay page, ticket anatomy. Generated by script so they can be regenerated.

### Phase 4: The engine (`site/`)
Stack: **vanilla JavaScript in IIFEs, no bundler, no framework.** GSAP and ScrollTrigger vendored locally. Raw WebGL1 fragment shaders. Fonts self-hosted as variable woff2. Zero third-party requests.

| File | Job |
| --- | --- |
| `site/edition.js` | The one file edited each night: DJ, set, event, copy, theme, payment mode |
| `assets/js/lr-core.js` | Shared helpers, theme application, ticket markup, QR, formatting |
| `assets/js/lr-hero.js` | The pinned, scroll-scrubbed hero. `LR.hero.mount(E, opts)` and `destroy()` so a skin can be swapped in place |
| `assets/js/lr-shaders.js` | The five motifs. Uniforms: `uRes uTime uProg uPtr uSeed uSafe uBg uInk uAcc uAcc2` |
| `assets/js/lr-pay.js` | Pay page and live customer card |
| `assets/js/lr-card.js` | Card renderer and the address-free PNG export |
| `assets/js/lr-ticket.js` | Shared logic (rotating code, schedule, reveal rules, Square signature, tokens). Byte-identical copy lives in `server/` |
| `assets/js/lr-api-mock.js` | The simulated server. The **only** file with the demo address and signing secret |
| `assets/js/lr-api-live.js` | Client for the real server (`payment.mode = 'live'`) |
| `assets/js/lr-door.js`, `site/door.html` | The door tool |
| `assets/js/lr-demo-clock.js` | Demo-only clock to jump to "address unlocks" and "doors" |
| `assets/css/lr.css`, `fonts.css`, `page.css` | Styles; `page.css` is for the plain pages |

Key techniques:
- **`uSafe`:** the shader dims the side of the canvas where type lives, so text contrast passes while the art stays vivid on the open side.
- **Config-driven:** swapping `edition.js` re-skins everything: copy, palette, fonts, motif, ease.
- **Static fallback:** under Reduce Motion the pinned stage becomes a stacked page; every animation stops.
- **No faked scarcity:** `seatsLeft` is `null`, so no seat count shows until it is real.

### Phase 5: Skins (`concepts/NN-*/edition.js`)
- Each concept folder holds an `edition.js` and an `index.html`/`pay.html` that load the shared `../../site/assets`. Only the edition differs.

### Phase 6: Verification (`tools/qa/`)
Verification was scripted, not eyeballed, because eyeballing missed bugs for several rounds. The bugs it found are in section 7; the full suite list is in section 8.
- `audit.js`: overflow, console errors, external requests, scroll-state assertions at five scroll stops, text under 12px, tap targets under 44px, keyboard order, Reduce Motion, pay page, door page.
- `artcontrast.js` + `art_contrast_report.py`: hide the UI at each scroll stop, screenshot the bare art, and measure contrast of every text line on the brightest 5% of the pixels behind it. Result: 150 of 150 lines pass, tightest 5.8:1.

### Phase 7: Deploy
- `.github/workflows/pages.yml`: on push to `main` -> `python3 tools/build_site.py _site` -> `python3 tools/check_site.py _site` -> upload artifact -> deploy.
- Root of the site is `site/`. A second copy lives at `/site/` because concept pages reference `../site/assets`. Plus `/concepts` and `/design/*.html`.

### Phase 8: Client review site
- `concepts/index.html`: five live previews (iframes, laptop or phone), a skin switcher synced by `postMessage`, "Generate customer card" per concept and for all five, favorite + second choice + note with Copy, Email and Share. Nothing is sent anywhere; the pick lives in the browser and the copied message. `PICK_TO` at the top of the script pre-addresses the email button (left empty in the public repo).
- `concepts/review.html?skin=N`: the real hero with a switcher (buttons, arrow keys, 1 to 5). It calls `LR.hero.mount()`/`destroy()` and preserves scroll progress, so skins compare at the same moment. Tested through 20 rapid swaps with no leaked canvases or scroll triggers.

### Phase 9: Secure card flow (`design/SECURE-CARD-FLOW.md`, `server/`)
The problem: the location is secret, but a screenshot of a card can be shared. **A screenshot cannot be blocked on the web**, so the design makes a leak late, traceable, short-lived and not enough to get in.
- Flow: pay on Square -> only Square's **signed webhook** (not the browser) marks the order paid -> the card shows the area -> 3 hours before doors the server releases the address -> at doors a rotating code appears -> staff scan it and match the name.
- Why not card-first-then-pay: a card that already holds the address means the secret was out before money moved.
- Server (`server/supabase/`): Postgres with row level security and **no policies** (the browser's roles can read and call nothing); `SECURITY DEFINER` functions `hold_seats`, `mark_paid`, `record_reveal`, `check_in` granted only to `service_role`; six Deno edge functions (`reserve`, `square-webhook`, `ticket`, `reveal`, `door-verify`, `door-list`).
- Rotating code format `LR1.<ref>.<step>.<code8>`, HMAC, 30-second step, one step of skew allowed, one use (the database allows one check-in per ticket).
- Idempotent payments, a `paid_review` state for a payment that arrives after the seat was resold, an atomic cap on address views, salted IP hash in the reveal log.
- **Shared logic:** `site/assets/js/lr-ticket.js` is copied byte-for-byte to `server/supabase/functions/_shared/ticket-logic.js` by `node tools/sync-server-logic.js`; a test asserts they are equal. The browser prototype and the server run the same code.
- Simulator (`lr-api-mock.js`) uses `localStorage` as its "database" so a card tab and the door tab can talk in the demo.

### Phase 10: The simplification pass
Request: usable by anyone, with no explanation. What changed and why:

| Before | After | Why |
| --- | --- | --- |
| Separate "Hold" and "Pay" steps | One **Pay $50.00** button; the hold happens behind it | Fewer decisions (Hick) |
| Press-and-hold to reveal, plus a "can't hold?" checkbox | One tap on **Show the address**, with **Open in Maps** beside it | The gesture had to be explained and added almost nothing against a screenshot |
| 3 reveals of 20 seconds | 5 views of 45 seconds (per-event `max_reveals`) | A lost guest who is out of views is a call the host cannot take on the night |
| Four-step timeline, five buttons | One sentence, one button; the rest under **More** | One thing per screen |
| Entry code shown from the moment of payment | Appears only at doors, at the top of the card; screen kept awake | Nothing to screenshot early; the code is the point at the door |
| "Door phrase" | Removed (also from the shared logic and the server) | Extra concept to explain; dead code |
| Door page with a "paste a code" box | One huge **Scan a guest** button; full-screen green / yellow / red; camera stays open between guests; find-by-name backup with one confirmation, logged as `name` | A volunteer has ten seconds |
| Pay button 822-865px down an 844px screen | Seats and total on one row, no eyebrow, shorter lede: Pay at **560px on a 664px screen** on every skin | A real phone browser has about 664px of window |

The door camera uses `BarcodeDetector` when present and a vendored `jsQR` otherwise. The staff link is `door.html#key=<DOOR_KEY>`; the key is saved on the phone and removed from the address bar.

### Phase 11: Website plumbing (`tools/build_site.py`, `tools/check_site.py`, `tools/site-config.json`)
Done **at build time** so source pages stay clean and the rules live in one place. Standard library only.
- `build_site.py`: assemble `_site/`; generate `sitemap.html`; inject into every page a **Content Security Policy** (inline scripts allowed only by their SHA-256 hash, computed automatically), a referrer policy, description, canonical link, Open Graph and Twitter tags, icons, manifest, and the robots rule; then write `sitemap.xml`, `robots.txt`, `security.txt` (also at `/.well-known/`).
- `site-config.json`: base URL, contact, share image, `connect_src_extra` (add an API host here when going live), and per-page `index`, `description`, `og_title`, `image`. Indexable today: home, `/concepts/`, the design documents, the plain pages. Not indexable: checkout, door, the `/site/` copy, the single concept pages.
- `check_site.py` (the deploy gate): fails on a missing CSP, an inline script not covered by it, inline event handlers, anything loading from another website, broken links, a sitemap that disagrees with the noindex rules, `security.txt` close to expiry, or a real artist name in any published file. Each failure mode was proven with a deliberately broken copy.
- Plain pages in `site/`: `privacy.html`, `terms.html`, `accessibility.html`, `404.html`, written to match what the site actually does (the browser storage keys are listed; the accessibility page says what was and was not tested). Drafts, not lawyer-reviewed.
- Share assets: `node tools/make_share_assets.js` renders the favicon, app icons and two 1200x630 images (the live hero; a collage of the five looks) from the running site.
- Also: `SECURITY.md`, Dependabot for the workflow, `tools/hosting/_headers` (the full header set for a host that can send them), `tools/serve_site.py` (serves `_site` like GitHub Pages: under `/Listening-party-/`, with the real 404 page at any depth).

### Phase 12: Distribution
- Client message: link to `/concepts/`, three steps, what is demo, what to send back. Tell them the yellow Demo clock button jumps time.
- Public comment: lead with the offer, say plainly it is a demo, link a page that shows the range (the switcher: `/concepts/review.html?skin=1`).
- Link tips: end the URL in a slash (a trailing hyphen defeats link detection); put it on its own line; post a new comment rather than editing; test the same link in Messenger to tell a group/post restriction from an address problem; Instagram comments never link. Facebook caches previews: use its Sharing Debugger and "Scrape Again" after any change to the share tags.

## 4. Tooling setup (to repeat the build)

| Need | How it was done |
| --- | --- |
| Browser automation | Node 22 and Playwright with Chromium. Here it was installed globally (`npm i -g playwright`) and the scripts were run with `NODE_PATH=$(npm root -g)`; a local `npm i playwright` works too. Launch flags for WebGL on a server: `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` |
| Local server | `python3 -m http.server 8800` from the repo root; for the built site `python3 tools/serve_site.py _site 8802` |
| Build and checks | Python 3, standard library only. `pip install markdown` for `tools/build_docs.py`; `pip install pillow` for the contrast report and the `.ico` |
| Camera test | `ffmpeg` turns a QR picture into a fake camera feed; Chromium flags `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream --use-file-for-fake-video-capture=<file>.y4m` |
| SQL tests | PostgreSQL 16. Scratch cluster: `su postgres -c "initdb -D /tmp/lrpg/data -A trust"` then `pg_ctl ... -o '-p 5544 -k /tmp/lrpg' start`; run with `PGHOST=/tmp/lrpg PGPORT=5544 PGUSER=postgres python3 server/test/sql_test.py` |
| Edge function type-check | `npm i deno`, then from `server/`: `node_modules/.bin/deno check supabase/functions/<fn>/index.ts` |
| Hosting | GitHub Pages with the workflow above (no custom domain yet) |

## 5. Command cheat sheet

```bash
# serve the source tree and run the app checks
python3 -m http.server 8800
node tools/qa/audit.js > audit.json                       # LR_BASE=http://localhost:8801 to point it at the built site
node tools/qa/secure-flow.js http://localhost:8800/site/ shots/flow    # VP=390x664 for a phone; SKIP_DOOR=1 for concept skins
node tools/qa/plain-words.js http://localhost:8800/site/
node tools/qa/door-camera.js http://localhost:8800/site/               # needs ffmpeg
node tools/qa/picker.js http://localhost:8800/concepts/ shots/pk
node tools/qa/review.js "http://localhost:8800/concepts/review.html?skin=1" shots/rv 1440x900

# build and check the published site
python3 tools/build_site.py && python3 tools/check_site.py
python3 tools/serve_site.py _site 8802 &
node tools/qa/site-meta.js http://localhost:8802/Listening-party-

# server logic
node tools/sync-server-logic.js && node --test server/test/ticket-logic.test.js
python3 server/test/sql_test.py                           # needs the scratch PostgreSQL above

# regenerate generated assets
python3 tools/build_docs.py                               # design/*.md -> *.html
python3 tools/make_wireframes.py
node tools/make_share_assets.js                           # needs the repo served at http://localhost:8800 (or BASE=...); writes icons and og-*.png into site/
```

`make_share_assets.js` leaves three temporary files (`site/.fav-16.png`, `.fav-32.png`, `.fav-48.png`). Turn them into `favicon.ico` and delete them, otherwise they get published:

```bash
python3 - <<'PY'
from PIL import Image; import os
d = 'site'
imgs = [Image.open(f'{d}/.fav-{s}.png').convert('RGBA') for s in (16, 32, 48)]
imgs[2].save(f'{d}/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)], append_images=imgs[:2])
for s in (16, 32, 48): os.remove(f'{d}/.fav-{s}.png')
PY
```

## 6. Decisions log

| Decision | Reason | Cost |
| --- | --- | --- |
| Static site on GitHub Pages, vanilla JS, no bundler | Zero build step for the app; deploys on push; nothing to maintain | No server features until a server exists |
| Frame vs skin, everything per night in one `edition.js` | Consistent quality, unique feel, 15-minute new edition | Skins are limited to what the frame allows |
| Address never in a public file; server releases it at T-3h | Anything in the page can be copied | Needs a server before real tickets |
| A screenshot cannot be blocked, so make leaks late, traceable and not enough to enter | Honest threat model | A leak in the 45-second window still spreads |
| Square for payments (user's choice) | Hosted checkout, no card data on our side | Webhook signature scheme still to verify in the sandbox |
| Demo venue is a real public museum, disclosed | Looks real without inventing a fake address | Must be removed before real tickets |
| Shared logic file used by both browser and server | Prototype and production cannot drift | A sync step and an equality test |
| Plumbing injected at build time with hashed inline scripts | Strict CSP without refactoring every page | Adding an external script is blocked on purpose |
| Index home, picker and docs; noindex checkout, door, duplicates | A sitemap implies "findable"; demo tools should not be | Reversible per page in `site-config.json` |
| If tickets stay on an existing platform, the site promotes and links out | Simpler; the site does not need to take payments | The built checkout, card and door tools become optional |

## 7. Bugs and lessons (what to avoid)

| What went wrong | Fix |
| --- | --- |
| Intro tween and scroll tween drove the same property, so "Arrive" text stayed visible in later beats. Visual review missed it for several rounds | Intro for extras moved to a CSS animation; **scroll-state assertions** at each stop in `audit.js` |
| Text over the live art failed contrast | `uSafe` dimming in the shader; measure real pixels with the UI hidden (`artcontrast.js`); fix the checker's own bugs (block-width rects, `color(srgb)` parsing) |
| Mobile: bar wrapped, tiny axis labels, clipped names, empty panel | Per-skin phone sizes, HTML axis labels, heading scale |
| Static (Reduce Motion) mode overflowed sideways | `overflow-x: clip` |
| Card PNG truncated; downloads inert in sandboxed viewers | Show the image inline with "press and hold to save" plus manual calendar instructions |
| Device toggle drifted scroll progress | Read progress **before** resize |
| Reveal button was rebuilt by the 30-second code refresh and cancelled a press | Idempotent UI keyed on a `data-key` |
| Demo "scan the latest card" picked a seeded guest | Exclude seeded guests |
| Pay button below the fold on real phones | Compact form; test at 390 by **664**, not 844 |
| Scroll cue overlapped the headline and tagline on many window sizes (e.g. 1366 by 650); found only by rendering the 1200 by 630 share image | The cue measures itself and hides when it would touch text; 1366 by 650 is now an audit viewport |
| Pay footer (including the "demo venue" notice) was painted **under** fixed background art | `z-index` on `.pay > .foot`; test with `elementFromPoint`. Full-page screenshots had hidden this because fixed layers lay out differently |
| 404 page unstyled on deep addresses | `<base>` must come **before** the first relative URL; `serve_site.py` plus a deep-404 test |
| Test tools gave false confidence | CDP `evaluate` is exempt from CSP, so probe `eval` from a script the page loads; a "forged code" test needs the current time step or it is rejected as expired; live URLs sit under a sub-path, so use relative probe URLs |
| CPU contention made one scroll assertion flaky | Run the full audit alone |
| `pkill -f` killed the agent's own shell | Kill by PID |
| Real artist names ended up in a public repo (filenames in an early upload) | Fictional-only rule, a name scan in `check_site.py`, and clean-up (section 10) |
| GitHub Pages cannot send headers; `robots.txt` and `security.txt` are ignored on a `/repo/` path | Meta CSP (no `frame-ancestors`), a ready `_headers` file, and a custom domain recommendation |

**Method lesson:** every defect that mattered was found by a script or a rendered image, not by looking at the page. Write the assertion when you find the bug, and keep it.

## 8. Test inventory

| Suite | Covers | Result at last run |
| --- | --- | --- |
| `server/test/ticket-logic.test.js` | rotating code, schedule, reveal rules, Square signature, tokens, shared-file equality | 9 of 9 |
| `server/test/sql_test.py` (PostgreSQL 16) | no oversell, 8 parallel buyers for 1 seat, expiry, idempotent payment, resold-seat flag, 6 parallel views against a cap of 5, one check-in by scan or by name, anon cannot read or call anything | 30 of 30 |
| `deno check` | six edge functions | clean |
| `tools/qa/secure-flow.js` | one-click pay, locked card, address absent from page/config/exports, one-tap show, watermark, limit, code only at doors, footer on top, green/yellow/red at the door, find-by-name | about 45 checks; desktop, 390 by 664, and all five skins |
| `tools/qa/plain-words.js` | no technical words, 1 to 5 things to tap, reading grade 1 to 2, per screen | pass |
| `tools/qa/door-camera.js` | fake camera filming a real QR: green with the name, no double flash, camera released, graceful no-camera | pass (jsQR path) |
| `tools/qa/site-meta.js` | every page's meta, CSP enforced (injected script, `eval`, foreign script blocked), no requests to other sites, sitemap/robots/security.txt, styled 404 | pass, local and live |
| `tools/check_site.py` | static twin, the deploy gate; negative tests proved | pass |
| `tools/qa/picker.js`, `review.js` | picker sync, phone toggle, 20 rapid skin swaps | pass |
| `tools/qa/audit.js` | 5 skins by 5 viewports (390, 820, 1024, 1366x650, 1440), pay at 390 and 1440, door at 390 and 1024, Reduce Motion | clean |

## 9. Direction taken after the build (not yet built)

The group the demo was shown to already sells tickets through an event-ticketing platform. The agreed shape:
- The site is the **marketing layer**: a page per night, tailored to the DJ's look, with a "Get tickets" button that links to wherever sales are handled.
- On the day, everyone who paid gets a **digital card** by email: export the guest list (names and emails) from the ticketing platform, BCC everyone about 3 hours before doors, attach the card image and put the address as plain text under it. Email only; no texting. **Not built.** If it is, the card is one image per night in the DJ's look.
- Unconfirmed and worth checking first: whether the platform lets organizers export the guest list, whether it offers Apple Wallet tickets, and how it checks people in at the door.

## 10. Open items and go-live checklist

1. **Real phones:** the pinned scroll over a collapsing browser bar, WebGL frame rate, the door camera in a dim doorway, and the `BarcodeDetector` path. Only desktop Chromium and a fake camera were used.
2. **Screen readers** (VoiceOver, TalkBack) and 200% zoom: untested.
3. **Real payments (only if the site sells tickets):** Square sandbox pass; verify the webhook signature order against Square's SDK helper; deploy Supabase; set `payment.mode = 'live'` and the API host in `connect_src_extra`; remove `lr-api-mock.js` and `lr-demo-clock.js` from `pay.html` and `door.html`.
4. **"Get tickets" link:** point the hero button at the real ticket page when it exists. Today it says "Reserve" and goes to the demo checkout.
5. **Custom domain** (also makes `robots.txt` and `security.txt` effective), submit `sitemap.xml` in Search Console, add a real contact address to the privacy page and `security.txt` (today: the GitHub issues page).
6. **Repo hygiene:** `03-dj-khalid-golden-hour.html`, `04-daft-punk-chrome.html` and two `listening-party-concepts*.zip` files at the repo root are an earlier upload with real artist names. They are not published, but the repo is public. Delete or move them.
7. Share image for `review.html` is the hero, not the five-looks collage (a one-line change in `site-config.json` plus a title).
8. Plain pages are drafts, not legal advice.
9. The private concept bundle (a zip of the first-pass concepts, kept outside the repo) is out of date. Rebuild it with `python3 tools/build_gallery.py bundle <out_dir>` (optionally a private `refs.json` as a third argument) if it is still wanted.

## Appendix: commit history

| Commit | What |
| --- | --- |
| `603db57`, `3aa8cb2`, `ba20c9a` | First pass (single Nova Vale page, early docs, an upload) |
| `868385b` | Rebuild: scroll-funnel hero engine, pay page with customer card, five skins |
| `569af3b` | Card and calendar exports that work in sandboxed viewers |
| `e5b30e9` | Client review site: picker, skin switcher, card generator |
| `8bd5e82` | Secure card flow: server-gated address, simulator, server scaffold, SQL and unit tests |
| `5280eb1` | Simplification: one-step pay, tap-to-show, camera door, plain-words tests |
| `a74ede5` | Share tags, icons, sitemap, CSP via the build script; scroll-cue fix |
| `bb8f79d` | Plain pages, deploy gate, pay footer fix |
| `ee330d7` | 404 base-tag fix, Pages-like local server |
