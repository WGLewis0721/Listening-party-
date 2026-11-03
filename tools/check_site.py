#!/usr/bin/env python3
"""Static checks on the BUILT site (run after tools/build_site.py). The deploy workflow runs this and refuses to publish if it fails.

    python3 tools/check_site.py [_site]

It needs no browser (tools/qa/site-meta.js is the browser-side twin). Checks:
  * every page has a Content Security Policy, a canonical link, share tags and a robots rule
  * every inline script is covered by its SHA-256 hash in that page's policy, and there are no inline event handlers (onclick=…)
  * nothing loads from another website (script, stylesheet, image, frame, font, media)
  * every internal link and file reference points at a file that exists
  * every sitemap URL exists, nothing noindex is in the sitemap, security.txt has not expired
  * no real artist names in anything published (this repo's public rule: fictional DJs only)
Standard library only.
"""
import base64, datetime, hashlib, html, json, os, re, sys
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, '_site')
CFG = json.load(open(os.path.join(ROOT, 'tools', 'site-config.json')))
BASE = os.environ.get('SITE_URL', CFG['base_url']).rstrip('/')
NAMES = re.compile(r'deadmau5|mau5|khaled|khalid|daft ?punk|idris|elba|big driis|kalkbrenner|vasilyeva|gennifer|postell', re.I)
problems = []
def bad(where, msg): problems.append(f'{where}: {msg}')

class P(HTMLParser):
    def __init__(self): super().__init__(convert_charrefs=True); self.refs = []; self.ext = []; self.meta = {}; self.canon = None; self.base = None; self.events = []; self.inline = []; self._in = False; self._buf = ''; self._attrs = {}
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for k in a:
            if k.startswith('on'): self.events.append(f'{tag}[{k}]')
        if tag == 'base' and a.get('href'): self.base = a['href']
        if tag == 'meta':
            key = a.get('name') or a.get('property') or a.get('http-equiv')
            if key: self.meta[key.lower()] = a.get('content', '')
        if tag == 'link' and a.get('rel') == 'canonical': self.canon = a.get('href')
        if tag == 'script':
            if a.get('src'): self.refs.append((tag, a['src']))
            else: self._in = True; self._buf = ''; self._attrs = a
        if tag in ('a',) and a.get('href'): self.refs.append((tag, a['href']))
        elif tag in ('img', 'iframe', 'source', 'video', 'audio') and a.get('src'): self.refs.append((tag, a['src']))
        elif tag == 'link' and a.get('href') and a.get('rel') != 'canonical': self.refs.append((tag, a['href']))
    def handle_data(self, d):
        if self._in: self._buf += d
    def handle_endtag(self, tag):
        if tag == 'script' and self._in:
            self._in = False
            if not re.search(r'(json|template|text/plain)', self._attrs.get('type', '') or ''): self.inline.append(self._buf)

def rel_of(path): return os.path.relpath(path, OUT).replace(os.sep, '/')
pages = []
for d, _, fs in os.walk(OUT):
    for f in fs:
        if f.endswith('.html'): pages.append(os.path.join(d, f))
if not pages: bad('build', 'no pages found in ' + OUT)

indexable = set()
for path in sorted(pages):
    rel = rel_of(path); raw = open(path, encoding='utf-8').read(); p = P(); p.feed(raw)
    csp = p.meta.get('content-security-policy', '')
    if not csp: bad(rel, 'no Content Security Policy'); 
    else:
        if re.search(r"script-src[^;]*'unsafe-(inline|eval)'", csp): bad(rel, "script-src allows 'unsafe-inline' or 'unsafe-eval'")
        for s in p.inline:
            h = "'sha256-" + base64.b64encode(hashlib.sha256(s.encode('utf-8')).digest()).decode() + "'"
            if h not in csp: bad(rel, 'an inline script is not covered by the policy (rebuild with tools/build_site.py)')
    if p.events: bad(rel, 'inline event handlers are blocked by the policy: ' + ', '.join(p.events[:3]))
    if not p.canon or not p.canon.startswith('http'): bad(rel, 'missing absolute canonical link')
    for k in ('og:title', 'og:description', 'og:image', 'og:url', 'twitter:card', 'description', 'robots', 'referrer'):
        if not p.meta.get(k): bad(rel, 'missing meta ' + k)
    if 'noindex' not in p.meta.get('robots', ''): indexable.add(p.canon)
    here = os.path.dirname(path)
    for tag, ref in p.refs:
        r = ref.strip()
        if not r or r.startswith(('#', 'mailto:', 'tel:', 'javascript:', 'data:', 'blob:')): continue
        u = urlparse(r)
        if u.scheme in ('http', 'https') or r.startswith('//'):
            if tag != 'a' and not (tag == 'link' and False): bad(rel, f'<{tag}> loads from another website: {r[:70]}')
            continue
        target = unquote(u.path)
        if p.base and rel == '404.html':                                   # the 404 page resolves from the project root
            bp = urlparse(p.base).path; full = os.path.join(OUT, target.lstrip('/')) if not target.startswith('/') else os.path.join(OUT, target[len(bp):] if target.startswith(bp) else target.lstrip('/'))
        else: full = os.path.join(OUT, target.lstrip('/')) if target.startswith('/') else os.path.normpath(os.path.join(here, target)) if target else path
        if os.path.isdir(full): full = os.path.join(full, 'index.html')
        if target and not os.path.exists(full): bad(rel, f'broken link <{tag}> {r}')
    if NAMES.search(raw): bad(rel, 'contains a real artist name (public repo rule: fictional DJs only)')

# the text files too (scripts, styles, data) for the artist-name rule
for d, _, fs in os.walk(OUT):
    for f in fs:
        if f.endswith(('.js', '.css', '.json', '.xml', '.txt', '.webmanifest')) and 'vendor' not in d:
            if NAMES.search(open(os.path.join(d, f), encoding='utf-8', errors='ignore').read()): bad(rel_of(os.path.join(d, f)), 'contains a real artist name')

# sitemap, robots, security.txt
sm = os.path.join(OUT, 'sitemap.xml')
if not os.path.exists(sm): bad('sitemap.xml', 'missing')
else:
    locs = re.findall(r'<loc>([^<]+)</loc>', open(sm).read())
    for u in locs:
        if not u.startswith(BASE + '/'): bad('sitemap.xml', 'URL outside the base: ' + u); continue
        local = os.path.join(OUT, u[len(BASE) + 1:]); local = os.path.join(local, 'index.html') if u.endswith('/') or not u[len(BASE) + 1:] else local
        if not os.path.exists(local): bad('sitemap.xml', 'URL has no page: ' + u)
        if u not in indexable: bad('sitemap.xml', 'lists a noindex or non-canonical page: ' + u)
    for u in indexable:
        if u not in locs: bad('sitemap.xml', 'indexable page missing from the sitemap: ' + u)
rb = os.path.join(OUT, 'robots.txt')
if not os.path.exists(rb) or (BASE + '/sitemap.xml') not in open(rb).read(): bad('robots.txt', 'missing or does not point at the sitemap')
for sp in ('.well-known/security.txt', 'security.txt'):
    f = os.path.join(OUT, sp)
    if not os.path.exists(f): bad(sp, 'missing'); continue
    t = open(f).read(); m = re.search(r'^Expires:\s*(\S+)', t, re.M)
    if not re.search(r'^Contact:\s*\S+', t, re.M) or not m: bad(sp, 'needs Contact and Expires'); continue
    if datetime.datetime.fromisoformat(m.group(1).replace('Z', '+00:00')) < datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30): bad(sp, 'expires within 30 days')

if problems:
    print('FAILED: ' + str(len(problems)) + ' problem(s) in ' + OUT)
    for x in problems[:60]: print('  - ' + x)
    sys.exit(1)
print(f'site checks passed: {len(pages)} pages, {len(indexable)} indexable, no inline-script, external-load, broken-link or artist-name problems')
