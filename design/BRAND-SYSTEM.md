# Listening Room brand system

One **frame** that never changes, and one **skin** that changes for every DJ. The frame is what makes every edition the same quality. The skin is what makes it theirs. The live boards (`brand-boards.html`) are generated from the real edition files, so they cannot drift from the site.

## Frame (identical every edition)

| Part | Rule |
| --- | --- |
| Structure | One pinned hero, five beats: Arrive, Sound, Set, Room, Ticket, over about 520vh of scroll |
| Scrubber | A bottom bar: chapter ticks (also navigation) and a clock that runs from doors to close |
| Primary action | Exactly one filled button on screen: the top bar's until the last beat, then the ticket's |
| Ticket | Plate, head, overline, title, tagline, meta, lines, location, QR, perforation, foot, always in that order |
| Type roles | Display = skin; body = Manrope; labels = JetBrains Mono, 12px or larger |
| Grid | 12 columns, 5vw margins; data sits on a blurred glass panel so any motif stays legible |
| Motion | Scroll-scrubbed; intro under 2 seconds; nothing flashes; Reduce Motion becomes a stacked static page |
| Secret address | A decoy blurs on the hero; the real address decrypts on the pay-page card after payment |
| Copy order | Eyebrow, name, tagline, statement, set, room, closing |

## Skin (changes per DJ, all in `edition.js`)

| Part | Choices today | Notes |
| --- | --- | --- |
| Motif | `spectra`, `tunnel`, `sunburst`, `mercury`, `spotlight` | A new motif is a fragment shader using the same uniforms (`uRes uTime uProg uPtr uSeed uSafe uBg uInk uAcc uAcc2`) |
| Display face | Instrument Serif, Big Shoulders Display, Bodoni Moda, Unbounded, Fraunces | Plus a title treatment: case, weight, style, an optional foil or chrome gradient, a heading scale |
| Palette | `bg surface ink muted acc acc2 accOn` | Must pass the guardrails below |
| Motion feel | `ease`, intro stagger | A GSAP ease name, for example `expo.out` (slow) or `power4.out` (hard) |
| Voice | Tagline, statement, slot names | A film has acts, a funk night has hours |
| Texture | `grain` | 0.05 (clean) to 0.08 (cinematic) |

## Guardrails (every skin must pass)

| Pair | Minimum |
| --- | --- |
| Ink on void | 7 : 1 |
| Muted on void | 4.5 : 1 |
| Accent on void | 4.5 : 1 |
| On-accent on accent | 4.5 : 1 |
| Text over the live art | 4.5 : 1 body, 3 : 1 at 24px or larger, measured on the brightest 5% of the pixels behind each line |
| Label size | 12px or larger |
| Tap target | 44px or larger |

The text-over-art rule is why the shaders take a `uSafe` flag: on the stage canvas the side where type lives is dimmed inside the shader, and the art lives on the open side. Ticket plates leave it off.

## The five skins

| Skin | Persona (fictional) | Motif | Display face | Palette (void / ink / accent / signal) | Ease |
| --- | --- | --- | --- | --- | --- |
| 01 Quiet Spectra | Nova Vale | `spectra` | Instrument Serif | `#0b0b0c` `#f8f6f1` `#c8a45c` `#e2c07a` | `expo.out` |
| 02 LED Stage | Halogen Ghost | `tunnel` | Big Shoulders Display | `#04050a` `#eafcff` `#2cf2e0` `#ff3d8b` | `power4.out` |
| 03 Golden Hour | Amani Sol | `sunburst` | Bodoni Moda italic | `#06120e` `#fff6e2` `#f0b93a` `#ff6a3d` | `expo.out` |
| 04 Chrome Disco | Chrome Vector | `mercury` | Unbounded | `#07070a` `#f4f5f8` `#dfe5ee` `#ff9d2e` | `power4.out` |
| 05 Brass and Night | Marlowe Brass | `spotlight` | Fraunces italic | `#0a0912` `#f6eddc` `#d4a24e` `#8f1d2c` | `power3.out` |

## Producing a new edition (about fifteen minutes once the copy exists)

1. Copy `concepts/05-brass-night/` to a new folder and rename it. (`index.html` and `pay.html` never change.)
2. In `edition.js`, set the DJ, the tagline, the statement, and five set slots with an `energy` from 0 to 1.
3. Pick a motif, a display face and five colors. Open `brand-boards.html` and check every contrast row is green.
4. Set `event` (date, doors, price, capacity) and `payment`.
5. Screenshot at 390 and 1440 wide. Run `tools/qa/` (see its README) and make the pay flow once.
6. Deploy.

## Payment and the secret address

- Payments are **Square**. The browser holds seats, hands off to Square's hosted checkout, and only Square's signed webhook marks an order paid.
- `payment.mode = 'demo'` (default) runs the simulator in the browser so the experience can be reviewed. `'live'` with `apiBase` talks to the Supabase functions in `server/`.
- The venue address is **not in `edition.js`**. Only the neighborhood (`venueArea`) is public. The address lives in the database and is released from `release.unlockLeadMin` (default 180 minutes) before doors.
- See `SECURE-CARD-FLOW.md` for the flow, the threat model, what is tested and the go-live steps.
