# Listening Room: UX audit

Audited 3 Nov 2026 against the seven fundamentals and the laws of UX in `spread-app/docs/design/FOUNDATIONAL_UX_PRINCIPLES.md`, with the Mirror Finish tokens from `WD-AutoDetailing` as the base skin. Scope: five editions (the live base plus four concepts), each with a hero and a pay page.

**Method.** Headless Chromium, software WebGL, at 390, 820, 1024 and 1440 px wide, plus a Reduce Motion run. The scripts are in `tools/qa/`. Every number below came from a script, not from eyeballing a screenshot.

**Not tested.** Real iOS Safari and Android Chrome, VoiceOver, TalkBack, 200% zoom, and GPU performance on a mid-range phone. Software rendering says nothing about frame rate. These are the open issues at the bottom.

## Result summary

| Check | Result |
| --- | --- |
| Console errors or warnings | 0 on all pages |
| Third-party requests | 0 (fonts, GSAP and the QR library are self-hosted) |
| Horizontal overflow at 390, 820, 1024, 1440 | 0 px on every hero and pay page |
| Reduce Motion | Stacked static layout, all text at full opacity, 0 px overflow, no pinning |
| Scroll-state assertions (right layers visible at 5 stops) | Pass on all 5 skins and 4 viewports |
| Primary buttons visible on the last beat | Exactly 1 on every skin and viewport |
| Text under 12px | 0 |
| Tap targets under 44px | 0 (brand link, buttons, chapter ticks, stepper, inputs) |
| Form inputs | 16px, each with a `label`, errors announced with `role="alert"` |
| Page weight, hero (HTML, CSS, JS, fonts) | 271 to 330 KB per skin |
| Text over the live art, 150 text lines measured | 150 of 150 pass, tightest 5.8:1 |
| Flat token contrast (all pairs) | 7.7:1 or better, which is AAA everywhere |
| Pay flow (validate, reserve, unlock, PNG, calendar file, reload) | Pass on all 5 skins |
| Rewind stress test (scroll to the end and back, 30 jumps) | 0 failures |

## The seven fundamentals

| Fundamental | Result | Evidence |
| --- | --- | --- |
| Unity | Pass | One frame, one ticket component and one scrubber across five skins; only tokens, face, motif and ease change |
| Balance | Pass | The name is the first read; the art lives on the open side and the type column is dark by design (`uSafe`) |
| Hierarchy | Pass | Eyebrow, name, promise, then one beat at a time; one dominant action per state |
| Contrast | Pass, measured | Token pairs 7.7:1 or better; every text line over live art 5.8:1 or better (method below) |
| Emphasis | Pass | The top-bar button yields to the ticket button on the last beat; asserted, not assumed |
| Scale | Pass | 12px floor, 44px targets, 16px inputs, fluid display type with a per-skin heading scale for wide faces |
| Repetition | Pass | `LR.ticketHTML` renders the card on the hero, the pay page and the boards |

## Laws of UX

| Law | Result | Notes |
| --- | --- | --- |
| Hick | Pass | One filled button at a time; the pay form has three inputs |
| Jakob | Pass | Checkout looks like checkout; native scroll, no scroll hijacking; chapters are real buttons |
| Fitts | Pass | 48px buttons, full-width on phones in the thumb zone, 44px chapter ticks |
| Gestalt | Pass | Data on glass panels; set rows, stats and chips each form one visible group |
| Miller / chunking | Pass | Five beats, five set slots, three stats |
| Tesler | Pass | The complexity (arc, theme, motif) lives in `edition.js`, not in the visitor's path |
| Doherty | Pass, local only | Static files; the button responds immediately. The demo "processing" state is an honest 1.1s, labeled as a demo |
| Aesthetic-usability | Pass | Reduce Motion and no-WebGL both give a complete working page |
| Von Restorff / serial position | Pass | The ticket is the only filled object at the end of the funnel |
| Goal-gradient / Zeigarnik / Peak-end | Pass | The scrubber is visible progress; the pay card survives a reload; the unlock is the peak |

## Text over the art (how it was measured)

Flat color tables cannot prove legibility over moving shader art. So for each of 10 skin-and-viewport combinations at 5 scroll stops, the script records the exact box of every text line (using DOM ranges, not element boxes), hides the interface, screenshots the bare art, and takes the **brightest 5% of pixels** under each line as the worst-case background. That is deliberately harsher than an average.

| Skin | 390 px, tightest | 1440 px, tightest |
| --- | --- | --- |
| 01 Quiet Spectra | 8.0 : 1 | 8.4 : 1 |
| 02 LED Stage | 6.7 : 1 | 7.6 : 1 |
| 03 Golden Hour | 5.8 : 1 | 10.2 : 1 |
| 04 Chrome Disco | 8.5 : 1 | 8.8 : 1 |
| 05 Brass and Night | 8.6 : 1 | 8.6 : 1 |

Targets: 4.5 : 1 body, 3 : 1 at 24px or larger. The halo `text-shadow` on body copy is not counted, so real legibility is a little better than these figures.

## Flat token contrast (void, surface, ink, muted, accent)

| Skin | ink / void | muted / void | accent / void | on-accent / accent | ink / surface | muted / surface | accent / surface |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 Quiet Spectra | 18.2 | 9.5 | 8.4 | 8.4 | 16.9 | 8.8 | 7.7 |
| 02 LED Stage | 19.3 | 8.3 | 14.4 | 13.7 | 18.1 | 7.8 | 13.6 |
| 03 Golden Hour | 17.7 | 10.5 | 10.6 | 10.3 | 16.5 | 9.8 | 9.9 |
| 04 Chrome Disco | 18.5 | 8.8 | 15.9 | 15.6 | 17.1 | 8.2 | 14.7 |
| 05 Brass and Night | 17.0 | 9.6 | 8.6 | 8.0 | 15.8 | 8.9 | 7.9 |

## What the audit found, and what was done

These are the defects, in the order they were found. Several were found by the measurement and not by looking.

| # | Defect | Fix |
| --- | --- | --- |
| 1 | Phone top bar wrapped ("LISTENING / ROOM", "Reserve · / $25") | Single-line brand, hidden edition tag, no-wrap buttons |
| 2 | Arc axis labels rendered at 6 to 9.6px (SVG text scaled down) | Axis labels are real 12px HTML, not SVG text |
| 3 | Gold chart line lost against the gold sun | Chart and spec list sit on a blurred glass panel on every skin |
| 4 | **Arrive text stayed visible during later beats.** An intro tween and the scroll tween both drove the same opacity | Intro for those elements is CSS, never GSAP; the scroll-state assertion was added so this class of bug cannot return unnoticed |
| 5 | 10.5 to 11.5px labels in 9 places | Every label is 12px or larger |
| 6 | Brand link only 22 to 26px tall | 44px minimum |
| 7 | Reduce Motion layout overflowed by 25 to 46px (negative margins on the title lines) | Clipped in static mode |
| 8 | 13 text lines under contrast over the art; worst 1.1:1 (Golden Hour tagline on the sun on phones) | Shader-side text-safe dim on the type side, sun scaled to the screen width, sun moved off the type column, spotlight kept off the type column, brighter tagline and labels, halo shadow |
| 9 | Chrome title and tagline dissolved into equally bright metal | Metal darkened on the type side, bright on the open side |
| 10 | Wide faces broke the layout on phones ("HALOGEN" split mid-word, "Amani" and "CHROME" clipped, stats colliding) | Per-skin phone title sizes; a heading scale of 0.78 for the wide Unbounded face |
| 11 | Empty glass panel visible before its rows faded in | The panel fades with its rows |
| 12 | Exported card PNG was truncated (QR and reference cut off) | The canvas is sized to its content |
| 13 | Sticky pay-page bar was transparent, so content collided with it | Opaque blurred bar |
| 14 | **Two bugs in my own tooling:** text boxes measured at block width (full container) and `color-mix()` colors parsed as black | Measured with DOM ranges; parser handles `color(srgb …)`. Without these the audit reported false failures |
| 15 | One scroll-state failure in a full run | Not reproducible: 0 failures in 30 rewinds when run alone. It happened while two audits were sharing the CPU, and is recorded here as a timing artifact, not a fix |

## The client review site (picker and skin switcher)

| Check | Result |
| --- | --- |
| Skin switcher keeps the scroll position | Progress held at exactly 0.70 (laptop) and 0.66 (phone) through all five skins, 0 of 10 swaps lost position or layers |
| Switcher controls | Buttons, arrow keys and keys 1 to 5 all work; the picker's tabs, Prev/Next buttons and the in-preview switcher stay in sync with no reload |
| Churn | 20 rapid swaps: 2 canvases in the DOM, 1 scroll trigger alive, no WebGL-context warnings |
| Device toggle (laptop or phone) | Position is read before the layout resizes, so it carries over |
| Card generation | One card or all five; unlock, QR, PNG preview and save; a name and seat count carry across |
| Pick | Favorite, second choice and note persist across a reload; Copy, Email and Share build the same message |
| Both pages at 390, 820, 1024, 1440 | 0 px overflow, 0 text under 12px, 0 tap targets under 44px, 0 third-party requests, 0 console warnings |
| Reduce Motion | The switcher works in the static layout |

Defects found on the way: the device toggle read progress after the resize and drifted (0.70 to 0.84), and the shader's new `destroy()` plus a manual `loseContext()` double-freed the GL context and logged warnings. Both fixed.

## The secure card flow (Hold, Pay, Unlock)

| Check | Result |
| --- | --- |
| 33 end-to-end browser checks, repeated three times, on the base skin | All pass each time |
| Same flow on two more skins, and at 390px wide | All pass |
| The address is absent from the page before payment, while held, after payment (before T-3h), after the tab hides, after the reveals are used, and after a reload | Asserted at each point |
| The address is absent from the public edition config, the saved card image and the calendar file | Asserted (the image's drawn text is captured and checked) |
| The server refuses an early reveal, a wrong token and a 4th reveal even when the UI is bypassed | Pass |
| A quick tap does not reveal; a one-second hold does; hiding the tab removes the address from the DOM | Pass |
| Door: admits the paid name, refuses a second scan, refuses a code 5 minutes old, refuses a made-up code; the card flips to Checked in by itself | Pass |
| SQL on PostgreSQL 16: 8 parallel buyers for 1 seat, expiry, idempotent payment, resold-seat refund flag, 6 parallel reveals against a cap of 3, one check-in, anon cannot read or call anything | 27 of 27 |
| Shared logic (rotating code, schedule, reveal rules, Square signature, tokens) | 9 of 9 |
| Edge functions | Type-check clean with Deno; never deployed |

Defects found on the way: the 30-second code refresh rebuilt the hold-to-reveal button and would have cancelled a hold in progress (now idempotent); the demo's "scan the latest card" picked a seeded guest because of the jumped clock (simulator fix); and the status chip wrapped the card header at 390px (shorter labels).

## Motion safety

Nothing flashes. The fastest repeating motion is the final button's 2.2s pulse ring (0.45 Hz). The LED rings travel at about 0.5 Hz, the foil sheen takes 7s, the dust and dots drift. Under Reduce Motion every animation stops, the shaders render one still frame, and the page becomes a stacked static layout.

## Open issues (not done)

1. **Real devices.** iOS Safari and Android Chrome, especially the collapsing browser bar over the pinned stage and WebGL frame rate on a mid-range phone. The canvas is half resolution on phones and pauses off-screen, but this is unmeasured.
2. **Assistive technology.** VoiceOver and TalkBack have not been run. Chapter changes are not announced to screen readers, and the decoy address has a spoken alternative but this is untested.
3. **200% zoom and `prefers-contrast`** are untested.
4. **Keyboard reach.** The ticket button is hidden until the last beat, so a keyboard user reaches it with the "Skip to reserve" link or the Ticket chapter. This is deliberate and works, but is worth a real user test.
5. **Payment.** Simulated. The Square server is written, type-checked and database-tested but never run against Square: do a sandbox pass and verify the webhook signature scheme with Square's SDK helper. The address is no longer in any file; it must be loaded into the database.
7. **Hold-to-reveal on real devices and with a screen reader** is untested. There is a keyboard path, a tap option and a screen-reader path.
6. **Fabricated scarcity.** `seatsLeft` is `null`, so no count is shown. Wire it to real inventory or leave it off.
