#!/usr/bin/env python3
"""Serves the BUILT site the way GitHub Pages does, so path bugs show up before a deploy.

    python3 tools/serve_site.py [dir=_site] [port=8802] [prefix=/Listening-party-]

  * the site lives under the prefix (a project site is served at /<repo>/), not at the root
  * anything that does not exist answers 404 with the site's own 404.html, at any depth
Then:  node tools/qa/site-meta.js http://localhost:8802/Listening-party-
"""
import http.server, os, sys, urllib.parse

DIR = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '_site'); PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8802
PREFIX = (sys.argv[3] if len(sys.argv) > 3 else '/Listening-party-').rstrip('/')

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=DIR, **k)
    def log_message(self, *a): pass
    def translate_path(self, path):
        p = urllib.parse.unquote(urllib.parse.urlparse(path).path)
        if PREFIX and not (p == PREFIX or p.startswith(PREFIX + '/')): return os.path.join(DIR, '__outside_prefix__')
        p = p[len(PREFIX):] or '/'
        full = os.path.normpath(os.path.join(DIR, p.lstrip('/')))
        return full if full.startswith(DIR) else os.path.join(DIR, '__nope__')
    def send_error(self, code, message=None, explain=None):
        if code == 404 and os.path.exists(os.path.join(DIR, '404.html')):
            body = open(os.path.join(DIR, '404.html'), 'rb').read()
            self.send_response(404); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(body))); self.end_headers()
            if self.command != 'HEAD': self.wfile.write(body)
        else: super().send_error(code, message, explain)

if __name__ == '__main__':
    print(f'serving {DIR} at http://localhost:{PORT}{PREFIX}/'); http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
