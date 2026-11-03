# Security policy

This repository is a portfolio piece: a website for a monthly DJ listening party, built with a made-up DJ. Today it has no accounts, no database and takes no payments. The Square and Supabase server in `server/` is written but **not deployed**.

## Reporting a problem

- Use GitHub's private reporting if it is switched on for this repository (Security tab, **Report a vulnerability**).
- If not, open an issue titled "Security" **without** the exploit details and ask for a private way to send them.
- Please never paste real secrets, tokens or personal data into an issue.

## In scope

- The published site: https://wglewis0721.github.io/Listening-party-/
- The code in this repository and its build and deploy workflow.

## Out of scope

GitHub's own platform, social engineering, and denial-of-service testing.

## What to expect

A best-effort reply. There is no bounty. Only the `main` branch is maintained.

## How the site is protected today

- A Content Security Policy on every page (inline scripts are allowed only by their SHA-256 hash; no third-party scripts, fonts or trackers).
- A referrer policy, no cookies, no analytics, and no third-party requests.
- The build (`tools/build_site.py`) and its checks (`tools/qa/site-meta.js`) fail if a page loses its policy or a script is added without being hashed.
- GitHub Pages cannot send HTTP security headers. `tools/hosting/_headers` holds the full set (HSTS, `frame-ancestors`, `Permissions-Policy`) for a host that can.
