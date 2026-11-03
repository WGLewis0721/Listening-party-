# Requirements to UI/UX

Every requirement from the community post (P) and the brief (B), mapped to a concrete UI decision, where it lives, the UX principle behind it, and how it was checked. Principles come from the seven fundamentals and the laws of UX in `spread-app/docs/design/FOUNDATIONAL_UX_PRINCIPLES.md`.

| ID | Requirement | UI / UX decision | Where | Principle | Verified by |
| --- | --- | --- | --- | --- | --- |
| P1 | Every month | One `edition.js` per month; the frame never changes. The series carries an edition number ("Ed. 01") and month in the bar, eyebrow and ticket | `edition.js`, bar, ticket head | Unity, Repetition | Five editions render from one engine |
| P2 | One DJ highlighted | The DJ name is the hero: display face at 14 to 20vw, letters rise through a mask, then the name hands off to the bar so it never competes | Beat 1, `.name` | Balance, Emphasis | First paint at 1440 and 390 shows the name and one button |
| P3 | Come to vibe and enjoy the set | The sound is a single sentence whose words brighten as you read; the set is an **energy arc** with the clock, not a track list | Beats 2 and 3 | Hierarchy, Goal-gradient | Scroll-state assertions at 5 stops per skin |
| P4 | The DJ is free to be creative | The arc is data (`set[].energy`), so each DJ shapes their own curve; slot names are free text (acts, hours, anthems) | `edition.js` → `arcSVG()` | Tesler (complexity lives in config, not in the page) | Five different arcs and slot vocabularies |
| P5 | Not a club, a social gathering | The stat row says "60 seats, **0 dance floors**, 1 DJ" in three words; no bottle-service or party language; the copy voice is quiet | Beat 4 | Von Restorff, clarity of promise | Copy review across five skins |
| P6 | Intimate venue | Capacity is a number in the stats, the ticket meta and the closing line; an optional `seatsLeft` shows a real count only when wired to inventory | Beat 4, ticket meta | Miller (few chunks), honesty | `seatsLeft` is `null` on the live site, so no fake scarcity |
| P7 | Light snacks and drinks | Stated as plain chips and again in the closing assurances | Beat 4, Beat 5 | Proximity, clarity | Present in all five editions |
| P8 | Tickets in advance | One filled button, always one: the top-bar button until the last beat, then the ticket button. "Advance only, no door sales" sits next to it | Bar, ticket foot | Hick, Fitts, Emphasis | Exactly one primary button on the last beat in all five skins and four viewports |
| P9 | Location revealed only to buyers | Hold → Pay → Unlock. The address is not in the page, the config, the email or the exports; the server releases it only after Square confirms payment and only from 3 hours before doors, on a tap, for 45 seconds, under a live watermark. Views are capped and logged. The door needs a rotating code and the name on the list | `lr-pay.js`, `lr-api-*.js`, `server/` | Peak-End, Doherty, honesty about limits | `tools/qa/secure-flow.js` on all five skins at desktop and phone width; 30 SQL checks on PostgreSQL 16 | 
| B1 | One page, scroll funnels the visitor | Pinned stage, five beats, each answering the next question a visitor asks (Who? What does it sound like? What happens? Is this my room? How do I get in?) | `lr-hero.js`, `wireframes.html` funnel | Goal-gradient, Serial position | State assertions: only the right layers are visible at each stop |
| B2 | Hero is the star and only section | There is no second section; the only content below the pinned stage is a one-line honesty footer | `index.html` | Balance | Page structure check: one `h1`, one `main` |
| B3 | Customizable to DJ, aesthetic, set list | `edition.js`: DJ, five set slots with energy, copy, five colors, display face, title treatment, motif, ease | `edition.js` | Tesler | Five skins differ only in that file |
| B4 | Link to a separate payment page | Both buttons go to `pay.html`: hold seats, hand off to Square's hosted checkout, return to the same card. `payment.mode = 'live'` switches from the simulator to the Square server | `cta.pay`, `payment`, `server/` | Jakob (checkout looks like checkout) | Pay flow tests on three skins and phone width |
| B5 | Customer card in the hero's aesthetic, with the location | One card component (`LR.ticketHTML`) used on the hero and the pay page; same motif, face and palette; status dot, tabular totals, locked → unlocked location, QR, PNG export, calendar file | `lr-core.js`, `lr-pay.js` | Unity, Aesthetic-usability | Downloaded PNG and `.ics` verified in the pay flow test |
| B6 | Versatile yet consistent brand board | Frame vs skin: what never changes and what does, with guardrails (contrast, tap size, type floor) the skin must pass | `brand-boards.html`, `BRAND-SYSTEM.md` | Unity, Repetition | Boards render live from the same edition files |
| B7 | Five concepts, one live site; the client picks a favorite | Four concept skins plus the base; the base is the live site, on a fictional DJ. One client site shows all five with a **skin switcher that keeps the scroll position**, a **Generate customer card** button per concept and for all five, and a favorite, second choice and note | `concepts/index.html`, `concepts/review.html`, `site/` | Hick (one choice at a time), Goal-gradient (three labeled steps), Doherty (swap is instant, no reload) | Switcher test: 0 of 15 swaps lost position or layers; picker flow test; audit of both pages |
| B8 | High-end craft | Shader per skin, scrubbed choreography, variable display faces, grain, glare, perforation, intro under 2s | All | Aesthetic-usability | Visual review at 1440 and 390 |
| B9 | Audited against the fundamentals | Measured audit across five skins, four viewports, Reduce Motion and the pay page | `UX-AUDIT.md` | All seven fundamentals | See the audit |

| B10 | Usable by anyone, with no explanation, while the host is busy | One headline, one sentence and one button per screen; everything else under **More**. A single **Pay** button (the hold happens behind it). The address is one tap, with **Open in Maps** beside it. The entry code appears only at doors, at the top of the card. The door page is one huge **Scan a guest** button and a green, yellow or red answer, with find-by-name as the backup. Plain words throughout | `lr-pay.js`, `lr-door.js`, `lr.css` | Hick (few choices), Fitts (big targets, on the first phone screen), Jakob (looks like every checkout), Postel (forgiving: name search when a phone is dead) | `tools/qa/plain-words.js` (no jargon, 1 to 5 things to tap, reading grade 1 to 2), `tools/qa/door-camera.js` (fake camera reads a real QR), first-screen assertions at 390 by 664 |

## What the funnel looks like

| Scroll | Beat | The visitor's question | The answer |
| --- | --- | --- | --- |
| 0 to 12% | Arrive | Who is it? | Name, month, promise |
| 12 to 34% | Sound | What will it sound like? | One sentence, tempo, mood |
| 34 to 58% | Set | What happens that night? | The arc, the order, the clock |
| 58 to 82% | Room | Is this my kind of room? | 60 seats, 0 dance floors, snacks, a secret address |
| 82 to 100% | Ticket | How do I get in? | One ticket, one button |

## Requirements that need you

- **P8 and B4 in production:** deploy `server/` and connect Square (sandbox first). The checkout today is simulated.
- **P9 in production:** put the real address in the database, not in any file. Remove the simulator and the demo clock from the pay and door pages.
- **P6:** `seatsLeft` stays `null` (no fake scarcity). The server enforces the real capacity.
