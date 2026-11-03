# Research: what a top music-event site does, and what I took from it

Scope: this file is public-safe. It describes **sound families** and design references only. It names no real artists, because `HANDOFF.md` keeps real names, likenesses, logos and tour data out of this public repo. The artist-by-artist notes live in a private file that ships with the concept bundle, not here.

## 1. The brief, reduced to requirements

Source: a community post proposing a monthly "listening party" for Montgomery, plus the brief given for this build. IDs are used across every other document.

| ID | Requirement |
| --- | --- |
| P1 | A listening party every month |
| P2 | One DJ is highlighted each month |
| P3 | People come to vibe and enjoy the DJ's set list |
| P4 | The DJ is free to be creative and try new things |
| P5 | It is not a club and not a party event: a social gathering |
| P6 | An intimate-sized venue |
| P7 | Light snacks and drinks available |
| P8 | Tickets bought in advance to get in |
| P9 | The location is revealed only to ticket buyers, no exceptions |
| B1 | One page; scroll animation funnels the visitor and promotes the experience |
| B2 | The hero is the star and the only section |
| B3 | Customizable to the DJ, their aesthetic and their set list |
| B4 | A link to a separate payment page |
| B5 | The payment page builds a customer card in the hero's aesthetic, with the location (Mirror Finish card as the reference) |
| B6 | A brand board versatile enough for weekly consistency yet unique per DJ |
| B7 | Five website concepts to send to a friend, and one live site |
| B8 | High-end craft: references, type, graphics, animation, detail |
| B9 | Audited against the UI/UX fundamentals |

## 2. References I actually opened

Verified, with what each one gave the build.

| Reference | What it showed | Used here |
| --- | --- | --- |
| [Awwwards: No Art](https://www.awwwards.com/sites/no-art), Site of the Day, 6 Aug 2026 | A music and art platform: loading sequence, microinteractions, GSAP, Webflow. Its **lowest score was developer accessibility (6.6)** | A short intro (about 1.2s), and accessibility treated as the place award-style sites lose points: static fallback, 12px floor, 44px targets, measured |
| [Awwwards: Music and Sound](https://www.awwwards.com/websites/music-sound/) | The 2026 field: artist and band identities, audio-led interaction, festival sites | Direction only. I could not read per-site technique from the listing |
| [Three.js sites in 2026](https://www.utsubo.com/blog/best-threejs-websites-2026) | Scroll-sequenced beats (entrance, hold, exit); **scroll as camera depth**; a full-viewport GLSL fragment shader behind clean type is the best impact for effort; meaningful HTML first; a lighter fallback on phones | One shader per skin behind real HTML text; scroll drives depth in the LED corridor and the rising sun; half-resolution canvas on phones; static layout without WebGL |
| 21st.dev: Hero Scrub, Admit One Ticket | Pin-based GSAP ScrollTrigger choreography that respects Reduce Motion; a ticket with a perforated stub, 3D tilt and glare | The pinned stage with a scrubbed master timeline; the ticket's perforation, pointer tilt and glare |
| Your repos: WD-AutoDetailing | The Mirror Finish tokens (void, ivory, one tempered gold) and the "Design B" customer card: image-led, fades to black, status dot, tabular prices, pill CTA, PNG export | The base skin uses the tokens verbatim; the card follows the same anatomy and exports a PNG |
| Your repos: spread-app | `FOUNDATIONAL_UX_PRINCIPLES.md`: seven fundamentals, ten laws, 390/820/1024/1440 checks, Reduce Motion | The audit structure and breakpoints |

Mentioned but not studied in depth: an electronic artist's site (Awwwards Developer Award and Site of the Day, 2 Sep 2026), a designer portfolio built around music and sound (9 Oct 2026), and an audio-plugin company site (15 Oct 2026). I did not extract their technique or fonts; I am not claiming to have copied them.

Weak sources, used only for direction: festival-site guides (balance high-impact visuals against load time so ticket buying is not slowed; a clear call to action above the fold) and 2026 trend roundups (oversized variable type, grain overlays, retro-futurist chrome, CSS scroll-driven animation). The roundups disagree on browser support for CSS scroll-driven animation, so the build uses GSAP ScrollTrigger and does not depend on it.

## 3. Techniques adopted and where they live

| Technique | Where | Why |
| --- | --- | --- |
| Pinned stage, scrubbed master timeline | `lr-hero.js` | The scroll is the funnel; nothing happens that the visitor did not scroll |
| The bottom "night" scrubber with a clock from doors to close | `.player` | Scroll depth and time-of-night become the same thing; chapters double as navigation |
| Shader motif per skin (raw WebGL1, no library) | `lr-shaders.js` | High impact for about 8 KB of code; the same uniform API for every skin |
| Text sits on a dimmed side, data sits on glass | shader `uSafe`, `.scrim`, `.specs`, `.set-viz` | Legibility is measured, not assumed (see UX-AUDIT.md) |
| Scroll-scrubbed word reveal | `.statement .w` | Reading speed becomes scroll speed |
| Energy arc that draws as you scroll | `arcSVG()` | A set is a journey, not a track list (P3, P4) |
| 3D-tilt ticket with glare and perforation | `.tk` | A tactile object at the end of the funnel |
| Location decrypt on confirm | `scramble()` in `lr-pay.js` | The peak moment of the flow (P9) |
| Grain overlay and vignette | `.grain`, `.vignette` | Film texture, no extra weight |
| Self-hosted variable fonts | `assets/fonts` | No third-party requests; one font file per skin |

## 4. Type

Constants (every edition): **Manrope** for body, **JetBrains Mono** for labels at 12px or larger. Variable (one per skin):

| Skin | Display face | Treatment | Reason |
| --- | --- | --- | --- |
| Quiet Spectra | Instrument Serif | Tight, mixed case | It is already the Mirror Finish display face |
| LED Stage | Big Shoulders Display | 900 weight, caps | Condensed and industrial; huge without eating the width |
| Golden Hour | Bodoni Moda italic | 800 weight, gold foil gradient | High contrast and luxury; the foil only ever sits on the name |
| Chrome Disco | Unbounded | 800 weight, caps, chrome gradient with a slow sheen | Wide and polished; body headings scale to 78% because it is so wide |
| Brass and Night | Fraunces italic | 300 weight, large | Soft, cinematic, a film title card |

## 5. Sound families

| Skin | Sound family | Room |
| --- | --- | --- |
| Quiet Spectra | Slow house, vinyl edits | A quiet field of marks |
| LED Stage | Progressive electro, long builds | A corridor of light |
| Golden Hour | Hip-hop, R&B, soul samples | A sunset and a toast |
| Chrome Disco | Disco edits, funk, French-touch house | Polished metal |
| Brass and Night | House, garage, afro-house, late set | A spotlight and a record |

## 6. What I could not verify

- The fonts and exact techniques of the reference sites are not published on their listings.
- Trend claims come from vendor blogs and conflict with each other; none is used as a fact.
- No real-device, screen-reader or 200% zoom testing has been done. See the open issues in UX-AUDIT.md.
