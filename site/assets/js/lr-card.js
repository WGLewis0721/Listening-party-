/* Listening Room · customer-card helpers shared by the pay page and the concept picker.
   Needs lr-core.js. Nothing here reads the DOM theme: every colour comes from the edition's own tokens,
   so five differently skinned cards can live on one page. */
(function (g) {
  'use strict';
  var LR = g.LR; if (!LR) return;

  /* text decrypt: scrambles the unrevealed tail, then settles. Instant under Reduce Motion. */
  LR.scramble = function (el, text, ms, done) {
    if (LR.reduce) { el.textContent = text; done && done(); return; }
    var G = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789', t0 = performance.now();
    (function frame(now) {
      var n = Math.min(1, (now - t0) / ms), keep = Math.floor(n * text.length), out = text.slice(0, keep);
      for (var i = keep; i < text.length; i++) out += /[\s,·.]/.test(text[i]) ? text[i] : G[(Math.random() * G.length) | 0];
      el.textContent = out;
      if (n < 1) g.requestAnimationFrame(frame); else { el.textContent = text; done && done(); }
    })(t0);
  };

  LR.makeRef = function (E) {
    var A = 'ABCDEFGHJKMNPQRSTVWXYZ23456789', out = '', b = new Uint8Array(6);
    (g.crypto || g.msCrypto).getRandomValues(b); for (var i = 0; i < 6; i++) out += A[b[i] % A.length];
    return 'LR-ED' + E.series.edition + '-' + out;
  };
  LR.cardPayload = function (E, ref, qty) { return 'LR|' + E.slug + '|' + ref + '|' + qty; };
  /* the address is not in the edition any more; only the simulated server (demo pages) can supply it */
  LR.cardAddress = function (E) { return (LR.api && LR.api.demo && LR.api.demo.address) ? LR.api.demo.address() : ''; };

  function wrap(ctx, text, maxW) { var w = text.split(/\s+/), lines = [], l = ''; w.forEach(function (x) { var c = l ? l + ' ' + x : x; if (l && ctx.measureText(c).width > maxW) { lines.push(l); l = x; } else l = c; }); if (l) lines.push(l); return lines; }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* o: { E, name, qty, ref, plate }  plate = canvas or img drawn as the card's top art (optional). Resolves to a PNG Blob. */
  LR.cardPNG = async function (o) {
    var E = o.E, ev = E.event, d = E.dj, s = E.series, tk = E.theme.tokens, tw = E.theme.title || {};
    var fam = (E.theme.font.stack.match(/'([^']+)'/) || [])[1];
    if (document.fonts && document.fonts.load) { try { await Promise.all([document.fonts.load((tw.weight || 400) + ' 100px "' + fam + '"'), document.fonts.load('700 20px "JetBrains Mono Variable"'), document.fonts.load('500 20px "Manrope Variable"')]); } catch (e) { } }
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var C = { sf: tk.surface, bg: tk.bg, ink: tk.ink, mu: tk.muted, ac: tk.acc };
    var W = 1000, P = 64, DISP = E.theme.font.stack, MONO = "'JetBrains Mono Variable',ui-monospace,monospace", BODY = "'Manrope Variable',system-ui,sans-serif";
    var up = tw.transform === 'uppercase', lines = d.lines || [d.name];
    var tfs = Math.min(150, 1700 / Math.max.apply(null, lines.map(function (l) { return l.length; })) * (up ? .95 : 1.25));
    var H = 2100, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var x = cv.getContext('2d');
    x.fillStyle = C.sf; x.fillRect(0, 0, W, H);
    var PH = 420;
    try { if (o.plate) x.drawImage(o.plate, 0, 0, W, PH); else { x.fillStyle = C.bg; x.fillRect(0, 0, W, PH); } } catch (err) { x.fillStyle = C.bg; x.fillRect(0, 0, W, PH); }
    var gr = x.createLinearGradient(0, 0, 0, PH); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(.45, 'rgba(0,0,0,0)'); gr.addColorStop(1, C.sf); x.fillStyle = gr; x.fillRect(0, 0, W, PH);
    x.textBaseline = 'alphabetic';
    x.font = '700 22px ' + MONO; x.fillStyle = C.ink; x.fillText((s.name + ' · Ed. ' + s.edition).toUpperCase(), P, 70);
    x.textAlign = 'right'; x.fillStyle = '#5ee08f'; x.fillText('● PAID', W - P, 70); x.textAlign = 'left';
    var y = 480; x.font = '700 22px ' + MONO; x.fillStyle = C.ac; x.fillText(('Featured DJ · ' + s.month).toUpperCase(), P, y); y += 28;
    x.fillStyle = C.ink; x.font = (tw.style === 'italic' ? 'italic ' : '') + (tw.weight || 400) + ' ' + tfs + 'px ' + DISP;
    lines.forEach(function (l) { y += tfs * (tw.lh || .9) + 6; x.fillText(up ? l.toUpperCase() : l, P, y); });
    y += 40; x.font = '500 28px ' + BODY; x.fillStyle = C.mu; wrap(x, d.tagline, W - 2 * P).forEach(function (l) { x.fillText(l, P, y); y += 40; });
    y += 20; x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 2; x.beginPath(); x.moveTo(P, y); x.lineTo(W - P, y); x.stroke(); y += 50;
    [['DATE', ev.dateLabel], ['DOORS', LR.time12(ev.doors)], ['ADMIT', String(o.qty)]].forEach(function (c, i) { var cx = P + i * 290; x.font = '600 20px ' + MONO; x.fillStyle = C.mu; x.fillText(c[0], cx, y); x.font = '700 32px ' + BODY; x.fillStyle = C.ink; x.fillText(c[1], cx, y + 44); });
    y += 100; x.beginPath(); x.moveTo(P, y); x.lineTo(W - P, y); x.stroke(); y += 50;
    x.font = '600 20px ' + MONO; x.fillStyle = C.mu; x.fillText('HOLDER', P, y); x.fillText('REFERENCE', P + 480, y);
    x.font = '700 34px ' + BODY; x.fillStyle = C.ink; x.fillText((o.name || '').trim() || 'Guest', P, y + 48); x.font = '700 34px ' + MONO; x.fillText(o.ref, P + 480, y + 48); y += 120;
    /* The saved image never carries the address or a QR: an image cannot expire, and this is the most shared artifact there is. */
    rr(x, P, y, W - 2 * P, 230, 24); x.fillStyle = 'rgba(255,255,255,.06)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.16)'; x.stroke();
    x.font = '600 20px ' + MONO; x.fillStyle = C.mu; x.fillText('LOCATION', P + 32, y + 48);
    x.font = '700 32px ' + BODY; x.fillStyle = C.ink; x.fillText(ev.venueArea || 'Montgomery, AL', P + 32, y + 100);
    x.font = '500 24px ' + BODY; x.fillStyle = C.mu; wrap(x, 'The exact address unlocks on your live card 3 hours before doors.', W - 2 * P - 64).forEach(function (l, i) { x.fillText(l, P + 32, y + 148 + i * 34); });
    y += 290;
    x.textAlign = 'center'; x.font = '600 20px ' + MONO; x.fillStyle = C.mu; x.fillText('OPEN YOUR LIVE CARD AT THE DOOR · ' + o.ref, W / 2, y); y += 36;
    x.fillText('THE ENTRY CODE REFRESHES EVERY 30 SECONDS', W / 2, y); y += 36;
    x.fillText('DEMO CARD · FICTIONAL EVENT · NOT A REAL TICKET', W / 2, y);
    var fin = document.createElement('canvas'); fin.width = W; fin.height = Math.min(H, y + 64); fin.getContext('2d').drawImage(cv, 0, 0);
    return new Promise(function (res) { fin.toBlob(res, 'image/png'); });
  };

  /* triggers a download and also returns an object URL so callers can show the image inline (sandboxed viewers block downloads) */
  LR.saveBlob = function (blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); }, 500); return url;
  };
})(window);
