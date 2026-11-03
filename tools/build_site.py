#!/usr/bin/env python3
"""Assembles the published site (_site/) and adds the traditional website plumbing to every page.

    python3 tools/build_site.py [out_dir]          default out_dir = _site;  SITE_URL=https://example.com overrides base_url (use it for a custom domain)

What it does, in order
  1  Assemble   site/ is the root, a second copy lives at /site/ (the concept pages reference ../site/assets), plus /concepts and /design/*.html
  2  Generate   sitemap.html (the human site map)
  3  Inject     into every page's <head>: a Content Security Policy (inline scripts are allowed by their SHA-256 hash, so nothing else can run),
                a referrer policy, a description, a canonical link, Open Graph + Twitter share tags, icons, the manifest, and the robots rule
  4  Emit       sitemap.xml, robots.txt, .well-known/security.txt

Why at build time: the source pages stay clean, the rules live in one place (tools/site-config.json) and the output is the same on every deploy.
Standard library only, so the Pages workflow needs nothing installed.

Honest limits (GitHub Pages)
  * It cannot send HTTP headers, so the CSP and referrer policy go in <meta> tags. Meta CSP cannot set frame-ancestors; tools/hosting/_headers has the full
    header set for a host that can (Netlify, Cloudflare Pages).
  * A project site lives under /<repo>/. Crawlers only read robots.txt and security.txt at the root of a host, so on this URL they are written but ignored.
    The per-page robots <meta> and the sitemap (submit it in Search Console) are what work. On a custom domain all of it works.
"""
import base64, datetime, hashlib, html, json, os, re, shutil, subprocess, sys
from urllib.parse import urlparse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CFG = json.load(open(os.path.join(ROOT, 'tools', 'site-config.json')))
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, '_site')
BASE = os.environ.get('SITE_URL', CFG['base_url']).rstrip('/')
BASE_PATH = urlparse(BASE).path.rstrip('/')
TODAY = datetime.date.today()
PAGES = CFG['pages']

def e(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')      # attribute-safe; apostrophes stay readable

# ───────── 1 · assemble ─────────
def assemble():
    if os.path.isdir(OUT): shutil.rmtree(OUT)
    ign = shutil.ignore_patterns('.DS_Store')
    shutil.copytree(os.path.join(ROOT, 'site'), OUT, ignore=ign)
    shutil.copytree(os.path.join(ROOT, 'site'), os.path.join(OUT, 'site'), ignore=ign)
    for f in ('404.html', 'privacy.html', 'terms.html', 'accessibility.html'):          # the plain pages live once, at the root
        if os.path.exists(os.path.join(OUT, 'site', f)): os.remove(os.path.join(OUT, 'site', f))
    shutil.copytree(os.path.join(ROOT, 'concepts'), os.path.join(OUT, 'concepts'), ignore=ign)
    os.makedirs(os.path.join(OUT, 'design'), exist_ok=True)
    for f in os.listdir(os.path.join(ROOT, 'design')):
        if f.endswith('.html'): shutil.copy(os.path.join(ROOT, 'design', f), os.path.join(OUT, 'design', f))

def url_of(rel):
    u = '/' + rel.replace(os.sep, '/')
    if u.endswith('/index.html'): u = u[:-len('index.html')]
    return u

def html_files():
    for d, _, fs in os.walk(OUT):
        for f in fs:
            if f.endswith('.html'): yield os.path.relpath(os.path.join(d, f), OUT)

def canonical_of(url):                       # the /site/ copy points at the root page
    if url == '/site/': return '/'
    if url.startswith('/site/'): return url[len('/site'):]
    return url

def source_of(url):                          # for lastmod
    u = canonical_of(url)
    if u.startswith('/concepts/') or u.startswith('/design/'): return u[1:] + ('index.html' if u.endswith('/') else '')
    return 'site/' + ('index.html' if u == '/' else u[1:])

def lastmod(url):
    try:
        d = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', source_of(url)], cwd=ROOT, capture_output=True, text=True, timeout=20).stdout.strip()
        if re.match(r'^\d{4}-\d\d-\d\d$', d): return d
    except Exception: pass
    return TODAY.isoformat()

def title_of(path):
    m = re.search(r'<title>(.*?)</title>', open(path, encoding='utf-8').read(), re.S)
    return html.unescape(m.group(1).strip()) if m else os.path.basename(path)

# ───────── 2 · the human site map ─────────
def make_sitemap_html():
    groups = [('The site', ['/', '/pay.html']), ('Client review', ['/concepts/', '/concepts/review.html', '/concepts/gallery.html']),
              ('Design documents', [u for u in PAGES if u.startswith('/design/')]), ('About this site', ['/privacy.html', '/terms.html', '/accessibility.html'])]
    body = ''
    for name, urls in groups:
        li = ''
        for u in urls:
            p = os.path.join(OUT, u[1:] + ('index.html' if u.endswith('/') else '')) if u != '/' else os.path.join(OUT, 'index.html')
            if not os.path.exists(p): continue
            rel = ('.' + u) if u != '/' else './'
            li += f'<li><a href="{e(rel)}">{e(title_of(p))}</a></li>'
        if li: body += f'<h2>{e(name)}</h2><ul>{li}</ul>'
    page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site map · {e(CFG['site_name'])}</title>
<link rel="stylesheet" href="assets/css/fonts.css"><link rel="stylesheet" href="assets/css/page.css"></head><body><main class="pg"><p class="crumb"><a href="./">&larr; {e(CFG['site_name'])}</a></p><h1>Site map</h1>
<p class="lede">Every page on this demo site. The machine-readable version is <a href="sitemap.xml">sitemap.xml</a>.</p>{body}</main></body></html>'''
    open(os.path.join(OUT, 'sitemap.html'), 'w', encoding='utf-8').write(page)

# ───────── 3 · inject ─────────
STRIP = [r'<meta\s+name="robots"[^>]*>', r'<meta\s+property="og:[^"]*"[^>]*>', r'<meta\s+name="twitter:[^"]*"[^>]*>', r'<link\s+rel="canonical"[^>]*>',
         r'<meta\s+http-equiv="Content-Security-Policy"[^>]*>', r'<meta\s+name="referrer"[^>]*>', r'<link\s+rel="(?:icon|apple-touch-icon|manifest)"[^>]*>', r'<!-- lr-meta:start -->.*?<!-- lr-meta:end -->']

def csp_for(doc):
    hashes = []
    for m in re.finditer(r'<script(?![^>]*\bsrc\s*=)([^>]*)>(.*?)</script>', doc, re.S | re.I):
        if re.search(r'type\s*=\s*["\'](?!module|text/javascript|application/javascript)', m.group(1)): continue      # data blocks are not executed
        hashes.append("'sha256-" + base64.b64encode(hashlib.sha256(m.group(2).encode('utf-8')).digest()).decode() + "'")
    connect = ' '.join(["'self'"] + CFG.get('connect_src_extra', []))
    return '; '.join(["default-src 'self'", "script-src 'self' " + ' '.join(sorted(set(hashes))), "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
                      "font-src 'self'", f"connect-src {connect}", "media-src 'self' blob:", "frame-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'",
                      "upgrade-insecure-requests"]).replace('script-src \'self\' ;', "script-src 'self';")

def inject(rel):
    path = os.path.join(OUT, rel); doc = open(path, encoding='utf-8').read(); url = url_of(rel)
    cfg = PAGES.get(url, {}); indexable = bool(cfg.get('index')) and not url.startswith('/site/')
    title = (re.search(r'<title>(.*?)</title>', doc, re.S) or [None, CFG['site_name']])[1].strip()
    old = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', doc)
    desc = cfg.get('description') or (html.unescape(old.group(1)) if old else f"{title}. A concept demo of Listening Room, a website for a monthly DJ listening party. Made-up DJ, no real tickets.")
    for pat in STRIP: doc = re.sub(pat + r'\s*', '', doc, flags=re.S | re.I)
    doc = re.sub(r'<meta\s+name="description"[^>]*>\s*', '', doc, flags=re.I)
    depth = rel.replace(os.sep, '/').count('/'); up = '../' * depth
    canon = BASE + canonical_of(url); image = f"{BASE}/{cfg.get('image', CFG['share_image'])}"; og_title = cfg.get('og_title') or title
    robots = 'index,follow,max-image-preview:large' if indexable else 'noindex'
    sec = f'<!-- lr-meta:start --><meta http-equiv="Content-Security-Policy" content="{e(csp_for(doc))}"><meta name="referrer" content="strict-origin-when-cross-origin">'
    rest = (f'<meta name="description" content="{e(desc)}"><meta name="robots" content="{robots}"><link rel="canonical" href="{e(canon)}">'
            f'<meta property="og:type" content="website"><meta property="og:site_name" content="{e(CFG["site_name"])}"><meta property="og:title" content="{e(og_title)}">'
            f'<meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{e(canon)}"><meta property="og:image" content="{e(image)}">'
            f'<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{e(og_title)}">'
            f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(og_title)}"><meta name="twitter:description" content="{e(desc)}"><meta name="twitter:image" content="{e(image)}">'
            f'<link rel="icon" href="{up}favicon.ico" sizes="48x48"><link rel="icon" href="{up}favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="{up}apple-touch-icon.png"><link rel="manifest" href="{up}site.webmanifest"><!-- lr-meta:end -->')
    if rel == '404.html' and BASE_PATH: rest = f'<base href="{BASE_PATH}/">' + rest            # a 404 can be served from any depth
    if re.search(r'<meta\s+charset[^>]*>', doc, re.I): doc = re.sub(r'(<meta\s+charset[^>]*>)', lambda m: m.group(1) + sec, doc, count=1, flags=re.I)
    else: doc = re.sub(r'(<head[^>]*>)', lambda m: m.group(1) + sec, doc, count=1, flags=re.I)
    doc = doc.replace('</head>', rest + '</head>', 1)
    open(path, 'w', encoding='utf-8').write(doc)
    return url, indexable

# ───────── 4 · emit ─────────
def emit(indexable_urls):
    urls = ''.join(f'  <url><loc>{e(BASE + u)}</loc><lastmod>{lastmod(u)}</lastmod></url>\n' for u in sorted(indexable_urls))
    open(os.path.join(OUT, 'sitemap.xml'), 'w').write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
    open(os.path.join(OUT, 'robots.txt'), 'w').write(f'# Pages marked noindex (the demo checkout, the door tool, the duplicate /site/ copy and the single concept pages) are kept out by their own <meta> tags.\nUser-agent: *\nAllow: /\n\nSitemap: {BASE}/sitemap.xml\n')
    os.makedirs(os.path.join(OUT, '.well-known'), exist_ok=True)
    exp = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=CFG.get('security_txt_days', 180))).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    txt = f"Contact: {CFG['contact_url']}\nExpires: {exp}\nPreferred-Languages: en\nCanonical: {BASE}/.well-known/security.txt\nPolicy: {CFG['policy_url']}\n"
    open(os.path.join(OUT, '.well-known', 'security.txt'), 'w').write(txt)
    open(os.path.join(OUT, 'security.txt'), 'w').write(txt)                    # some upload steps drop hidden folders; RFC 9116 also allows /security.txt

def main():
    assemble(); make_sitemap_html()
    found = [inject(rel) for rel in sorted(html_files())]
    emit([u for u, idx in found if idx])
    print(f'built {OUT}: {len(found)} pages, {sum(1 for _, i in found if i)} in the sitemap, base {BASE}')

if __name__ == '__main__': main()
