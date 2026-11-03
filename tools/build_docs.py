#!/usr/bin/env python3
"""Renders design/*.md into styled design/*.html (linked from the concept gallery).
Needs: pip install markdown.   Usage: python3 tools/build_docs.py [design_dir] [assets_prefix]"""
import os, re, sys, markdown

HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(HERE, '..', 'design')
A = sys.argv[2] if len(sys.argv) > 2 else '../site/assets/'
DOCS = ['RESEARCH', 'BRAND-SYSTEM', 'REQUIREMENTS-MAP', 'UX-AUDIT', 'SECURE-CARD-FLOW', 'ARTIST-REFERENCES']

TPL = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>{title} · Listening Room</title><link rel="stylesheet" href="{A}css/fonts.css">
<style>
:root{{--bg:#09090a;--ink:#f1eee7;--mu:#b5b0a4;--line:rgba(255,255,255,.14);--gold:#c8a45c}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.65 'Manrope Variable',system-ui,sans-serif;-webkit-font-smoothing:antialiased}}
.wrap{{max-width:1080px;margin:0 auto;padding:clamp(28px,6vw,72px) clamp(20px,4vw,48px) 96px}}
nav{{font:600 12px/1 'JetBrains Mono Variable',monospace;letter-spacing:.14em;text-transform:uppercase}}nav a{{color:var(--gold);text-decoration:none;display:inline-flex;min-height:44px;align-items:center}}
h1{{margin:18px 0 22px;font:400 clamp(2.4rem,6vw,4.6rem)/1 'Instrument Serif',Georgia,serif;letter-spacing:-.02em}}
h2{{margin:2.4em 0 .6em;font:400 clamp(1.6rem,3vw,2.3rem)/1.1 'Instrument Serif',Georgia,serif;padding-top:.6em;border-top:1px solid var(--line)}}
p,li{{color:#d9d5ca;max-width:78ch}}strong{{color:#fff}}a{{color:var(--gold)}}code{{font:500 .88em 'JetBrains Mono Variable',monospace;background:rgba(255,255,255,.08);padding:.1em .4em;border-radius:6px}}
pre{{overflow:auto;padding:16px;border-radius:12px;background:#111113;box-shadow:inset 0 0 0 1px var(--line)}}pre code{{background:none;padding:0}}
.tw{{overflow-x:auto;margin:1em 0;border-radius:14px;box-shadow:inset 0 0 0 1px var(--line)}}
table{{border-collapse:collapse;width:100%;min-width:640px;font-size:.92rem}}th,td{{padding:11px 14px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}}
th{{font:700 12px/1.3 'JetBrains Mono Variable',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);background:rgba(255,255,255,.03);white-space:nowrap}}tr:last-child td{{border-bottom:0}}
td:first-child{{white-space:nowrap}}
</style></head><body><div class="wrap"><nav><a href="{back}">&larr; All concepts</a></nav>{body}</div></body></html>'''

for name in DOCS:
    src = os.path.join(D, name + '.md')
    if not os.path.exists(src):
        continue
    md = open(src).read()
    title = (re.search(r'^# (.+)$', md, re.M) or [None, name])[1]
    body = markdown.markdown(md, extensions=['tables', 'fenced_code'])
    body = body.replace('<table>', '<div class="tw"><table>').replace('</table>', '</table></div>')
    back = '../concepts/index.html' if A.startswith('../') else 'index.html'
    open(os.path.join(D, name + '.html'), 'w').write(TPL.format(title=title, body=body, A=A, back=back))
    print('wrote', name + '.html')
