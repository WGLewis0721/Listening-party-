# Handoff · Listening Room (Nova Vale)

## Status

- **Live page:** `site/index.html`, deployed to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`. The workflow uploads only `site/`, so `design/` and this file are not served.
- **Deploy:** the last run completed successfully. The URL is `https://wglewis0721.github.io/Listening-party-/`. Not yet checked from a browser on a phone.
- **Artist:** Nova Vale, fictional. Album title, bio, and listening-room copy are placeholders.

## Before launch

1. **Signup form.** `site/index.html` posts to `action="#"`. Wire it to an email service.
2. **Links.** Streaming and contact links are `#` placeholders.
3. **Search indexing.** The page has `<meta name="robots" content="noindex">`. Remove it when the page is ready to be found.
4. **Fonts.** Archivo and Space Mono load from Google Fonts. Check on a phone.
5. **Visibility.** The repo is public. Anything committed is readable by anyone, so keep private material out of it.

## Design artifacts (`design/`)

- `listening-party-concepts/01-listening-room-base.html`: base hero, Mirror Finish palette, scroll-driven ticket reveal.
- `listening-party-concepts/wireframes.html`: hero scroll states and the 390px mobile frame.
- `listening-party-concepts/UX-AUDIT.md`: checked against the seven fundamentals and Laws of UX.
- `listening-room-canvas/listening-room-ed01-poster.pdf` and `.png`: poster, Quiet Spectra direction.
- `listening-room-canvas/quiet-spectra-philosophy.md`: the design philosophy for the poster.

## Not in this repo

Four concept pages (electro, golden-hour, disco-funk, brass-and-night), the brand boards, and the build scripts are not committed. Their filenames and sound-family labels refer to real artists, and this repo is public. Keep them in a private location, or rename the concepts and regenerate before adding them here.

## Rules for future changes

- Do not add real artists' names, likenesses, logos, album art, or tour data to this repo.
- Do not commit anything that is not meant for public viewing.
- Keep the Pages upload path at `site/`.
