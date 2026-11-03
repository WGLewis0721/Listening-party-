# QA scripts

Automated checks used for `design/UX-AUDIT.md`. They run against a local server, so they work on any edition you add.

```bash
npm i playwright            # once; the browsers are installed separately (npx playwright install chromium)
python3 -m http.server 8800 # from the repo root, in another terminal
node tools/qa/audit.js > audit.json            # overflow, console, external requests, scroll-state assertions, text and tap-target sizes, keyboard order, Reduce Motion, pay page
mkdir cm && node tools/qa/artcontrast.js cm    # hides the UI at each scroll stop and screenshots the bare art behind the text
python3 tools/qa/art_contrast_report.py cm     # contrast of every text line over its real background (needs: pip install pillow)
node tools/qa/secure-flow.js http://localhost:8800/site/ shots/flow   # the whole guest journey and the door: pay, locked card, one-tap address, limit, exports, green/yellow/red at the door (VP=390x844 for a phone)
node tools/qa/plain-words.js http://localhost:8800/site/            # "does anyone have to explain this?": no jargon, few things to tap, reading grade, per screen
python3 tools/build_site.py && python3 tools/serve_site.py _site 8802 &   # serves the built site like GitHub Pages: under /Listening-party-/, with the real 404 page
node tools/qa/site-meta.js http://localhost:8802/Listening-party-   # every page's meta tags, CSP enforced, sitemap/robots/security.txt, no requests to other websites, a styled 404 at any depth
python3 tools/check_site.py                                         # static twin of the above (no browser); the deploy workflow runs it
node tools/qa/picker.js http://localhost:8801/concepts/ shots/pk    # the client picker: skin sync, phone toggle
node tools/qa/review.js "http://localhost:8801/concepts/review.html?skin=1" shots/rv 1440x900   # the skin switcher
node tools/qa/door-camera.js http://localhost:8800/site/            # the door camera, tested with a fake phone camera filming a real guest's QR (needs ffmpeg)
node tools/qa/shoot.js http://localhost:8800/site/ shots/hero 1440x900 0,0.2,0.45,0.7,1
```

To audit a new edition, add it to the `PAGES` list at the top of `audit.js` and `artcontrast.js`.

The scroll-state assertions exist because of a real bug: an intro tween and a scroll tween both drove the same opacity, so the Arrive text stayed visible during later beats. Visual review missed it for several rounds; the assertion catches it in one run.
