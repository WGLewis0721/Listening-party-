#!/usr/bin/env python3
"""Builds the concept gallery page.
  python3 tools/build_gallery.py repo              -> concepts/gallery.html (public-safe link gallery; the picker is concepts/index.html)
  python3 tools/build_gallery.py bundle OUT [refs] -> OUT/index.html        (flat bundle root; optional private refs.json adds 'reference vibe' chips)"""
import json, html, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
mode = sys.argv[1] if len(sys.argv) > 1 else 'repo'
refs = {}
if mode in ('bundle', 'bundle-concepts') and len(sys.argv) > 3:
    refs = json.load(open(sys.argv[3]))
P = dict(S='site/', C='concepts/', D='design/') if mode == 'bundle' else dict(S='../site/', C='', D='../design/')

CARDS = [
    dict(id='quiet-spectra', n='01', folder=None, name='Quiet Spectra', dj='Nova Vale', fam='Slow house · vinyl edits', motif='Dot field + metal playhead', font='Instrument Serif', acc='#c8a45c', swatches=['#0b0b0c', '#f8f6f1', '#c8a45c'],
         line='Restraint. A field of small marks around one axis. This is the live site.', live=True),
    dict(id='led-stage', n='02', folder='02-led-stage', name='LED Stage', dj='Halogen Ghost', fam='Progressive electro · long builds', motif='LED corridor, scroll = depth', font='Big Shoulders Display', acc='#2cf2e0', swatches=['#04050a', '#eafcff', '#2cf2e0', '#ff3d8b'],
         line='Cold light, warm bass. You travel down a corridor that pulses on a slow beat.'),
    dict(id='golden-hour', n='03', folder='03-golden-hour', name='Golden Hour', dj='Amani Sol', fam='Hip-hop · R&B · soul', motif='Sun rises as you scroll', font='Bodoni Moda', acc='#f0b93a', swatches=['#06120e', '#fff6e2', '#f0b93a', '#ff6a3d'],
         line='Warm and affirming. Foil type over a Miami-style horizon; the room sings back, softly.'),
    dict(id='chrome-disco', n='04', folder='04-chrome-disco', name='Chrome Disco', dj='Chrome Vector', fam='Disco · funk · French touch', motif='Liquid mercury, dark behind type', font='Unbounded', acc='#dfe5ee', swatches=['#07070a', '#f4f5f8', '#dfe5ee', '#ff9d2e'],
         line='Hand-built, played like a machine. Polished metal with one amber hit.'),
    dict(id='brass-night', n='05', folder='05-brass-night', name='Brass and Night', dj='Marlowe Brass', fam='House · garage · afro-house', motif='Spotlight narrows to your ticket', font='Fraunces', acc='#d4a24e', swatches=['#0a0912', '#f6eddc', '#d4a24e', '#8f1d2c'],
         line='A late set cut like a film: Overture, Second act, Credits.'),
]

def card(c):
    base = (P['S'] if c['folder'] is None else P['C'] + c['folder'] + '/')
    hero_url, pay_url = base, base + 'pay.html'
    key = {'quiet-spectra': '01-quiet-spectra'}.get(c['id'], c['folder'])
    t = P['C'] + 'thumbs/' + key
    ref = refs.get(c['id'])
    refchip = f'<p class="ref"><b>Reference vibe</b> {html.escape(ref["artist"])}</p>' if ref else ''
    sw = ''.join(f'<i style="background:{s}"></i>' for s in c['swatches'])
    live = '<span class="live">Live site</span>' if c.get('live') else ''
    return f'''<article class="card" style="--a:{c['acc']}">
  <a class="shot" href="{hero_url}" aria-label="Open concept {c['n']}, {html.escape(c['name'])}">
    <img src="{t}-hero.jpg" alt="Hero of concept {c['n']}: {html.escape(c['dj'])}, {html.escape(c['motif'])}" loading="lazy" width="1000" height="625">
    <img class="alt" src="{t}-card.jpg" alt="" loading="lazy" width="1000" height="625">
    <span class="num">{c['n']}</span>{live}<span class="hint">Hover: the unlocked customer card</span>
  </a>
  <div class="meta">
    <div class="top"><h2>{html.escape(c['name'])}</h2><span class="sw" aria-hidden="true">{sw}</span></div>
    <p class="fam">{html.escape(c['dj'])} · {html.escape(c['fam'])}</p>
    <p class="line">{html.escape(c['line'])}</p>
    <ul class="chips"><li>{html.escape(c['motif'])}</li><li>{html.escape(c['font'])}</li></ul>
    {refchip}
    <div class="acts"><a class="btn" href="{hero_url}">Open the hero</a><a class="btn ghost" href="{pay_url}">Pay page + card</a></div>
  </div>
</article>'''

extra = f'<li><a href="{P["D"]}ARTIST-REFERENCES.html"><b>Artist references · private</b><span>The reference vibe behind each concept, with sources and how far to trust them.</span></a></li>' if refs else ''
page = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Listening Room · five concepts</title>
<link rel="stylesheet" href="{P['S']}assets/css/fonts.css">
<style>
:root{{color-scheme:dark;--bg:#09090a;--ink:#f4f1ea;--mu:#b5b0a4;--line:rgba(255,255,255,.14);--gold:#c8a45c;--mono:'JetBrains Mono Variable',ui-monospace,monospace;--body:'Manrope Variable',system-ui,sans-serif;--ease:cubic-bezier(.2,.7,.2,1)}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.55 var(--body);-webkit-font-smoothing:antialiased}}
a{{color:inherit}}:focus-visible{{outline:2px solid var(--gold);outline-offset:3px;border-radius:8px}}
.wrap{{max-width:1320px;margin:0 auto;padding:0 clamp(20px,4vw,64px)}}
header{{padding:clamp(56px,10vw,140px) 0 clamp(28px,4vw,56px)}}
.kick{{font:700 12px/1.3 var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}}
h1{{margin:14px 0 0;font:400 clamp(3rem,9vw,8.5rem)/.9 'Instrument Serif',Georgia,serif;letter-spacing:-.03em}}
.lede{{max-width:62ch;margin:26px 0 0;color:var(--mu);font-size:clamp(1.05rem,1.5vw,1.25rem)}}
.note{{margin:18px 0 0;font:500 12px/1.6 var(--mono);letter-spacing:.06em;color:var(--mu)}}
.steps{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:34px 0 0;padding:0;list-style:none}}
.steps li{{padding:16px 18px;border-radius:16px;box-shadow:inset 0 0 0 1px var(--line);color:var(--mu);font-size:.95rem}}
.steps b{{display:block;color:var(--ink);margin-bottom:2px}}
.grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(20px,3vw,44px);padding:clamp(28px,4vw,56px) 0}}
.card{{display:flex;flex-direction:column;gap:18px}}
.card:first-child{{grid-column:1/-1}}.card:first-child .shot{{aspect-ratio:21/9}}
.shot{{position:relative;display:block;aspect-ratio:16/10;border-radius:22px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--line),0 30px 80px -30px #000;background:#000;isolation:isolate}}
.shot img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:opacity .6s var(--ease),transform 1.2s var(--ease)}}
.shot .alt{{opacity:0}}.shot:hover .alt,.shot:focus-visible .alt{{opacity:1}}.shot:hover img{{transform:scale(1.025)}}
.num{{position:absolute;left:18px;bottom:16px;z-index:2;font:700 12px/1 var(--mono);letter-spacing:.14em;padding:8px 10px;border-radius:999px;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);color:var(--a)}}
.live{{position:absolute;right:18px;bottom:16px;z-index:2;font:700 12px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;padding:8px 12px;border-radius:999px;background:var(--a);color:#0b0b0c}}
.hint{{position:absolute;left:50%;transform:translateX(-50%);bottom:16px;white-space:nowrap;z-index:2;font:600 12px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;padding:8px 10px;border-radius:999px;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);color:var(--ink);opacity:0;transition:opacity .4s}}
.shot:hover .hint,.shot:focus-visible .hint{{opacity:1}}
.top{{display:flex;justify-content:space-between;align-items:center;gap:16px}}
h2{{margin:0;font:400 clamp(1.8rem,3vw,2.6rem)/1 'Instrument Serif',Georgia,serif}}
.sw{{display:flex;gap:6px}}.sw i{{width:18px;height:18px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}}
.fam{{margin:6px 0 0;font:600 12px/1.4 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--a)}}
.line{{margin:8px 0 0;color:var(--mu);max-width:56ch}}
.chips{{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}}
.chips li{{padding:7px 12px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--line);font-size:.85rem;color:var(--mu)}}
.ref{{margin:12px 0 0;padding:10px 14px;border-radius:12px;border:1px dashed var(--line);font-size:.9rem;color:var(--ink)}}.ref b{{font:700 12px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--a);margin-right:8px}}
.acts{{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}}
.btn{{display:inline-flex;align-items:center;min-height:48px;padding:0 24px;border-radius:999px;background:var(--a);color:#0b0b0c;font-weight:700;text-decoration:none;transition:transform .25s var(--ease),filter .2s}}
.btn:hover{{transform:translateY(-2px);filter:brightness(1.08)}}.btn.ghost{{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}}
.docs{{padding:clamp(28px,4vw,56px) 0 clamp(56px,8vw,120px);border-top:1px solid var(--line)}}
.docs h2{{margin-bottom:18px}}
.dl{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:0;padding:0;list-style:none}}
.dl a{{display:block;height:100%;padding:18px 20px;border-radius:18px;box-shadow:inset 0 0 0 1px var(--line);text-decoration:none;transition:box-shadow .25s,transform .25s var(--ease)}}
.dl a:hover{{box-shadow:inset 0 0 0 1px var(--gold);transform:translateY(-2px)}}
.dl b{{display:block;font-size:1.05rem}}.dl span{{display:block;margin-top:4px;color:var(--mu);font-size:.9rem}}
footer{{padding:28px 0 48px;border-top:1px solid var(--line);font:500 12px/1.7 var(--mono);letter-spacing:.05em;color:var(--mu)}}
@media(max-width:900px){{.grid{{grid-template-columns:1fr}}.dl{{grid-template-columns:1fr 1fr}}.steps{{grid-template-columns:1fr}}}}
@media(max-width:520px){{.dl{{grid-template-columns:1fr}}}}
@media(prefers-reduced-motion:reduce){{*{{transition:none!important}}}}
</style>
</head>
<body>
<header><div class="wrap">
  <p class="kick">Listening Room · Montgomery, AL · concept set</p>
  <h1>Five skins.<br>One room.</h1>
  <p class="lede">A monthly listening party has to feel new every time and trustworthy every time. These are the same hero, the same scroll funnel and the same ticket, dressed five different ways for five different DJs. Open one, scroll it, then reserve a seat to watch the address unlock on the customer card.</p>
  <ol class="steps"><li><b>1 · Scroll the hero</b>Arrive, Sound, Set, Room, Ticket. The bar at the bottom is the evening itself.</li><li><b>2 · Press Reserve</b>It opens the pay page, which carries the same skin and builds the customer card live.</li><li><b>3 · Complete the demo</b>The location decrypts, the QR appears, and you can save the card or add it to a calendar.</li></ol>
  <p class="note">Concept comps. Every DJ and venue shown is fictional, the checkout is a demo, and nothing is for sale. Best on a laptop or phone with WebGL.</p>
</div></header>
<main class="wrap"><div class="grid">
{''.join(card(c) for c in CARDS)}
</div></main>
<section class="docs"><div class="wrap">
  <h2>The thinking behind them</h2>
  <ul class="dl">
    <li><a href="{P['D']}brand-boards.html"><b>Brand boards</b><span>The frame vs the skin, palettes with live contrast, type, motion, locked and confirmed cards.</span></a></li>
    <li><a href="{P['D']}wireframes.html"><b>Wireframes</b><span>The funnel, five desktop and phone beats, pay page, ticket anatomy, with requirement pins.</span></a></li>
    <li><a href="{P['D']}REQUIREMENTS-MAP.html"><b>Requirements to UX</b><span>Every ask from the community post and your brief, mapped to a UI decision and a UX law.</span></a></li>
    <li><a href="{P['D']}UX-AUDIT.html"><b>UX audit</b><span>Seven fundamentals and the laws of UX, measured on all five skins, with what failed and how it was fixed.</span></a></li>
    <li><a href="{P['D']}RESEARCH.html"><b>Research</b><span>The design references, the techniques, the type choices, and what I could and could not verify.</span></a></li>
    <li><a href="{P['D']}SECURE-CARD-FLOW.html"><b>Secure card flow</b><span>Hold, pay with Square, unlock: how the address stays secret, what a screenshot can and cannot do, and what is tested.</span></a></li>
    <li><a href="{P['D']}BRAND-SYSTEM.html"><b>Brand system</b><span>How a promoter produces a new edition in about fifteen minutes without breaking quality.</span></a></li>
    {extra}
  </ul>
</div></section>
<footer><div class="wrap">Listening Room · concept set · fonts are self-hosted (Instrument Serif, Big Shoulders Display, Bodoni Moda, Unbounded, Fraunces, Manrope, JetBrains Mono) · motion by GSAP</div></footer>
</body>
</html>
'''
if mode == 'repo':
    out = os.path.join(ROOT, 'concepts', 'gallery.html')   # concepts/index.html is the client picker (hand-written)
elif mode == 'bundle-concepts':
    out = os.path.join(sys.argv[2], 'concepts', 'index.html')
else:
    out = os.path.join(sys.argv[2], 'index.html')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w').write(page)
print('wrote', os.path.abspath(out), len(page), 'bytes')
