# Listening Room: UX audit

Audited against the seven design fundamentals and the Laws of UX checks in `docs/design/FOUNDATIONAL_UX_PRINCIPLES.md` (spread-app repo), and the Mirror Finish tokens in `site/src/styles/tokens.css` (WD-AutoDetailing repo). Scope: five hero-only pages in `listening-party-concepts/`. Checks were run in headless Chromium at 1440x900 and 390x844. Real-device, screen-reader and Reduce Motion tests have not been done yet.

## Fixed in this pass

- Mobile 390x844: the headline collided with the top bar and the ticket was clipped at the bottom. Fixed by top-aligning the stage, shortening the top bar to one label, and hiding the vibe line, the footnote and the Doors row on phones. Verified visually on concept 04 and concept 01 before the fix; concepts 02, 03 and 05 are not yet re-checked at 390px.

## Results by fundamental

| Fundamental | Result | Notes |
| --- | --- | --- |
| Unity | Pass | Same layout, ticket structure and copy order on all five. Only tokens, fonts, motif and motion change. |
| Balance | Pass | The DJ name and CTA are the first things read on desktop. |
| Hierarchy | Pass | One primary action. The eyebrow, name, vibe, setlist, CTA order is fixed. |
| Contrast | Pass | All five palettes pass WCAG AA for ink, muted text, accent text and button label, both on the background and on the ticket surface. Accent-on-surface is also above 6.4:1. |
| Emphasis | Pass with risk | One filled CTA per page. The ticket is a second visual focus on desktop, but it is faded until scrolled. |
| Scale | Risk | Mono labels are 11px uppercase on the ticket. They pass contrast but are small. Target: 12px minimum. CTA is 48px tall, meeting the tap target. |
| Repetition | Pass | The ticket and copy blocks reuse one component across the five concepts. |

## Laws of UX

- **Hick's Law:** one filled CTA, no secondary actions. Pass.
- **Fitts's Law:** CTA is 48px tall and full-width on phones. Pass, pending device test.
- **Doherty Threshold:** the page is static HTML with no network dependency for the CTA, so it responds immediately. Fonts load from Google Fonts; a fallback serif or sans is set.
- **Aesthetic-Usability:** the page still works with motion off. Reduced-motion turns off all animation and shows the final ticket state, verified in code, not yet in a browser.
- **Peak-End:** the scroll ends on the completed ticket, but there is no action next to it. Open issue, see below.
- **Goal-gradient:** the scroll itself is the progress signal. Pass.

## Open issues (not fixed in this pass)

1. **No action at the end of the scroll.** The funnel ends on the ticket, and the only CTA is above it. Add a "Get advance tickets" button in the ticket footer. Highest priority.
2. **Doors row hidden on phones.** Doors time is useful at the decision point. The trade-off was made for fit at 390px; the fix is a shorter ticket art block.
3. **Locked location is blurred text.** It is visually clear that it is locked, and the label says "Unlocks at checkout". Screen readers will read the placeholder text. Consider `aria-label` on the locked element.
4. **Device and assistive testing not done.** Still needed: iOS Safari, Android Chrome, VoiceOver, TalkBack, Reduce Motion on a device, zoom to 200%.
5. **Payment page and ticket generation not built.** The payment URL is a placeholder, and the ticket shows "Awaiting payment" as a preview only.

## Motion safety

Sweep runs at 4.5s, pulse at 1.6s, spin at 22s, drift at 16s. None flash, so there is no flicker risk. All are disabled under `prefers-reduced-motion`.
