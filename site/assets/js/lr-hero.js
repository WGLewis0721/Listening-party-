/* Listening Room · hero engine.
   One pinned stage. Scroll is the funnel: Arrive → Sound → Set → Room → Ticket.
   The bottom scrubber is "the evening": it advances from doors to close as you scroll.
   Falls back to a stacked static layout with no pinning for Reduce Motion, no-JS-libs, or print. */
(function (g) {
  'use strict';
  var LR = g.LR; if (!LR) return;
  var CH = [{ k: 'arrive', n: 'Arrive', p: 0 }, { k: 'sound', n: 'Sound', p: .12 }, { k: 'set', n: 'Set', p: .34 }, { k: 'room', n: 'Room', p: .58 }, { k: 'ticket', n: 'Ticket', p: .82 }];

  /* mount(edition, opts) builds the whole hero into #lr and returns { destroy, progress, setProgress }.
     opts: embed, payHref, intro (false skips the opening sequence), swap (quick fade), progress (0..1 to start at). */
  function mount(E, opts) {
  opts = opts || {};
  LR.E = E; LR.applyTheme(E);
  var esc = LR.esc, d = E.dj, ev = E.event, th = E.theme, s = E.series;
  var root = document.getElementById('lr');
  var embed = opts.embed != null ? opts.embed : /[?&]embed=1/.test(location.search);
  var payHref = opts.payHref || (((E.cta && E.cta.pay) || 'pay.html') + (embed ? '?embed=1' : ''));
  var ctaLabel = (E.cta && E.cta.label) || 'Reserve your seat';
  var price = '$' + ev.price;
  var dead = false, cleanups = [], mm, intro, art, plate, stage, track;
  function onWin(type, fn, o) { g.addEventListener(type, fn, o); cleanups.push(function () { g.removeEventListener(type, fn, o); }); }
  var api = {
    E: E,
    progress: function () { if (!track) return 0; var max = track.offsetHeight - g.innerHeight; return max > 0 ? LR.clamp(g.scrollY / max, 0, 1) : 0; },
    setProgress: function (p) { if (!track) return; var max = track.offsetHeight - g.innerHeight; g.scrollTo(0, track.offsetTop + max * LR.clamp(p, 0, 1)); },
    destroy: function () {
      dead = true;
      try { if (mm) mm.revert(); } catch (e) { }
      try { if (intro) intro.kill(); } catch (e) { }
      try { if (g.ScrollTrigger) g.ScrollTrigger.getAll().forEach(function (t) { t.kill(); }); } catch (e) { }
      if (art) art.destroy(); if (plate) plate.destroy();
      cleanups.forEach(function (f) { f(); }); cleanups = [];
      root.innerHTML = ''; root.setAttribute('data-mode', 'static'); root.classList.remove('no-intro', 'swap-in');
    }
  };

  /* ───── markup ───── */
  function nameHTML() {
    var lines = d.lines || [d.name], chars = th.title && th.title.split === 'chars';
    return lines.map(function (l) {
      return '<span class="ln"><span>' + (chars ? l.split('').map(function (c) { return '<span class="ch">' + esc(c) + '</span>'; }).join('') : esc(l)) + '</span></span>';
    }).join('');
  }
  function words(t) { return t.split(/\s+/).map(function (w) { return '<span class="w">' + esc(w) + '</span>'; }).join(' '); }

  function arcSVG() {
    var W = 600, H = 312, px = 30, py = 40, st = E.set, n = st.length;
    var m = st.map(function (x) { return LR.mins(x.t); }); var t0 = m[0], t1 = m[n - 1];
    var X = m.map(function (v) { return px + (W - 2 * px) * (v - t0) / (t1 - t0); });
    var Y = st.map(function (x) { return H - py - (H - 2 * py) * x.energy; });
    var dpath = 'M' + X[0].toFixed(1) + ' ' + Y[0].toFixed(1);
    for (var i = 0; i < n - 1; i++) {
      var p0 = i ? i - 1 : 0, p3 = i + 2 < n ? i + 2 : n - 1;
      var c1x = X[i] + (X[i + 1] - X[p0]) / 6, c1y = Y[i] + (Y[i + 1] - Y[p0]) / 6;
      var c2x = X[i + 1] - (X[p3] - X[i]) / 6, c2y = Y[i + 1] - (Y[p3] - Y[i]) / 6;
      dpath += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ',' + X[i + 1].toFixed(1) + ' ' + Y[i + 1].toFixed(1);
    }
    var area = dpath + ' L' + X[n - 1].toFixed(1) + ' ' + (H - py + 14) + ' L' + X[0].toFixed(1) + ' ' + (H - py + 14) + ' Z';
    var grid = [0, 1, 2, 3].map(function (i) { var y = py + (H - 2 * py) * i / 3; return '<line x1="' + px + '" x2="' + (W - px) + '" y1="' + y + '" y2="' + y + '"/>'; }).join('');
    var dots = X.map(function (x, i) { return '<circle class="dot" data-i="' + i + '" cx="' + x.toFixed(1) + '" cy="' + Y[i].toFixed(1) + '" r="6"/>'; }).join('');
    var axis = '<div class="axis" aria-hidden="true">' + X.map(function (x, i) { return '<span style="left:' + (x / W * 100).toFixed(2) + '%">' + LR.time12(st[i].t).replace(/ [AP]M$/, '') + '</span>'; }).join('') + '</div>';
    return '<svg class="arc" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Energy arc of the evening: ' + esc(st.map(function (x) { return x.title; }).join(', ')) + '">' +
      '<defs><linearGradient id="arcFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--acc);stop-opacity:.34"/><stop offset="1" style="stop-color:var(--acc);stop-opacity:0"/></linearGradient></defs>' +
      '<g class="grid">' + grid + '</g><path class="fillarea" d="' + area + '"/><path class="ghost" d="' + dpath + '"/><path class="live" d="' + dpath + '"/>' + dots +
      '<circle class="headring" r="13" cx="' + X[0] + '" cy="' + Y[0] + '"/><circle class="head" r="5" cx="' + X[0] + '" cy="' + Y[0] + '"/>' +
      '</svg>' + axis;
  }

  function build() {
    var rows = E.set.map(function (r, i) { return '<li class="set-row" data-i="' + i + '"><time datetime="' + r.t + '">' + LR.time12(r.t) + '</time><div><b>' + esc(r.title) + '</b><span>' + esc(r.note) + '</span></div></li>'; }).join('');
    var specs = [['Sound', d.tags.join(' · ')], ['Tempo', d.bpm], ['Mood', d.mood]].map(function (x) { return '<li><b>' + x[0] + '</b><span>' + esc(x[1]) + '</span></li>'; }).join('');
    var stats = E.room.stats.map(function (x) { return '<div class="stat"><strong>' + esc(x.n) + '</strong><span>' + esc(x.l) + '</span></div>'; }).join('');
    var points = E.room.points.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var assure = E.closing.assure.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var ticks = CH.map(function (c, i) { return '<button class="pl-tick" type="button" data-p="' + c.p + '" style="left:' + (c.p * 100) + '%" aria-label="Jump to ' + c.n + '"><span>' + c.n + '</span></button>'; }).join('');
    var seatsText = (typeof ev.seatsLeft === 'number') ? (ev.seatsLeft + ' of ' + ev.capacity + ' left') : (ev.capacity + ' total');
    var foot = '<a class="btn btn--block" id="reserve" href="' + payHref + '">' + esc(ctaLabel) + ' · ' + price + LR.icons.arrow + '</a>';

    root.innerHTML = '' +
      '<a class="skip" href="#reserve">Skip to reserve</a>' +
      '<div class="track" id="track"><main class="stage" id="stage" data-gl="1">' +
      '<canvas class="gl" aria-hidden="true"></canvas><div class="fx scrim" aria-hidden="true"></div><div class="fx grain" aria-hidden="true"></div><div class="fx vignette" aria-hidden="true"></div>' +
      '<header class="bar"><a class="brand" href="' + (embed ? '#' : esc(E.homeHref || './')) + '" aria-label="' + esc(s.name) + ', edition ' + esc(s.edition) + '"><span class="brand-mark"></span><b>' + esc(s.name) + '</b><i>Ed. ' + esc(s.edition) + '</i></a>' +
      '<p class="bar-meta"><span class="m-wrap"><span class="m-date">' + esc(ev.dateLabel) + ' · ' + esc(s.city) + '</span><b>' + esc(d.name) + '</b></span></p>' +
      '<a class="btn btn--sm bar-cta" href="' + payHref + '">Reserve · ' + price + LR.icons.arrow + '</a></header>' +

      '<section class="name-wrap" aria-label="Featured DJ">' +
      '<p class="eyebrow">Featured DJ · ' + esc(s.month) + '</p>' +
      '<h1 class="name' + (th.title && th.title.fill ? ' fill' : '') + '" aria-label="' + esc(d.name) + '">' + nameHTML() + '</h1>' +
      '<p class="tagline">' + esc(d.tagline) + '</p></section>' +
      '<p class="cue">Scroll to enter the room</p>' +

      '<section class="beat b-sound" aria-label="The sound"><div class="col-a"><p class="eyebrow">The sound</p><p class="statement">' + words(E.statement) + '</p></div>' +
      '<div class="col-b"><ul class="specs">' + specs + '</ul></div></section>' +

      '<section class="beat b-set" aria-label="The set"><div class="set-list-wrap" style="grid-column:1/span 6"><p class="eyebrow">The set · one arc, no skips</p><ol class="set-list">' + rows + '</ol></div>' +
      '<div class="set-viz"><p class="cap label"><span>Energy of the evening · PM</span><span>' + esc(d.bpm) + '</span></p>' + arcSVG() + '</div></section>' +

      '<section class="beat b-room" aria-label="The room"><p class="eyebrow" style="grid-column:1/-1">The room</p><div class="stats">' + stats + '</div>' +
      '<ul class="points">' + points + '</ul>' +
      '<p class="lock-note">' + LR.icons.lock + '<span>' + esc(E.room.lockNote) + '</span></p></section>' +

      '<section class="beat b-close" aria-label="Reserve"><div class="close-copy"><p class="eyebrow">Your seat</p><h2 class="h2">' + esc(E.closing.headline) + '</h2><ul class="assure">' + assure + '</ul></div></section>' +

      '<aside class="ticket-wrap" aria-label="Your ticket">' + LR.ticketHTML({ state: 'locked', foot: foot, seatsText: seatsText, note: esc(E.closing.note) }) + '</aside>' +

      '<nav class="player" aria-label="The evening · chapters"><div class="pl-now"><i></i><span class="pl-chap">Arrive</span></div>' +
      '<div class="pl-track"><div class="pl-fill"></div>' + ticks + '</div>' +
      '<div class="pl-clock"><span class="pl-time">' + LR.time12(E.set[0].t).replace(' ', '&nbsp;') + '</span><small>THE NIGHT</small></div></nav>' +
      '</main></div>' +
      '<footer class="foot"><span>' + esc(E.footer.left) + '</span><span>' + E.footer.right + '</span></footer>';
  }

  /* ───── boot ───── */
  build();
  var $ = function (q, el) { return (el || root).querySelector(q); }, $$ = function (q, el) { return [].slice.call((el || root).querySelectorAll(q)); };
  stage = $('#stage'); track = $('#track');
  if (opts.intro === false) root.classList.add('no-intro'); if (opts.swap) root.classList.add('swap-in');
  art = LR.mountArt($('.gl'), { E: E, fps: LR.coarse ? 40 : 60, safe: true });
  plate = LR.mountArt($('.tk-plate canvas'), { E: E, fps: 24, prog: .62, seed: 7, timeOffset: 30, dprMax: 1.25 });
  var ticket = $('.tk');
  /* "Scroll to enter the room" is a nicety: whenever the window is short enough that it would touch the tagline, drop it instead of overlapping the text */
  function fitCue() { var c = $('.cue'), t = $('.tagline'); if (!c || !t) return; c.classList.remove('cue--off'); var a = c.getBoundingClientRect(), b = t.getBoundingClientRect(); if (a.width && a.top < b.bottom + 18) c.classList.add('cue--off'); }
  function measure() { stage.style.setProperty('--tk-h', ticket.offsetHeight + 'px'); fitCue(); }
  setTimeout(function () { if (!dead) fitCue(); }, 1700);                                   // again once the intro motion has settled
  measure(); onWin('resize', measure); if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!dead) measure(); });
  LR.tilt(ticket, 6); LR.magnet($('#reserve'), .18); LR.magnet($('.bar-cta'), .25);

  var gsap = g.gsap, ST = g.ScrollTrigger;
  if (embed) { var bl = $('.brand'); if (bl) bl.addEventListener('click', function (e) { e.preventDefault(); }); }
  var useScrub = !!(gsap && ST) && !LR.reduce;
  root.setAttribute('data-mode', useScrub ? 'scrub' : 'static');
  if (!useScrub) { if (art) art.setProg(.5); if (plate) plate.setProg(.62); return api; }

  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });

  var t0 = LR.mins(E.set[0].t), t1 = LR.mins(E.set[E.set.length - 1].t);
  var chapEl = $('.pl-chap'), timeEl = $('.pl-time'), apEl = $('.pl-clock'), fillEl = $('.pl-fill'), tickEls = $$('.pl-tick');
  var rowEls = $$('.set-row'), dotEls = $$('.arc .dot'), live = $('.arc .live'), head = $('.arc .head'), ring = $('.arc .headring');
  var barCta = $('.bar-cta'), reserve = $('#reserve'), pointer = { x: .5, y: .5 };
  var rowAt = E.set.map(function (r) { return (LR.mins(r.t) - t0) / (t1 - t0); });
  var arcLen = live.getTotalLength(), lastChap = -1, lastDock = null, lastClock = '';
  live.style.strokeDasharray = arcLen; live.style.strokeDashoffset = arcLen;

  function onProg(p) {
    if (art) art.setProg(p);
    if (plate) plate.setProg(.45 + p * .4);
    fillEl.style.width = (p * 100).toFixed(2) + '%';
    var ci = 0; CH.forEach(function (c, i) { if (p >= c.p - .002) ci = i; });
    if (ci !== lastChap) { lastChap = ci; chapEl.textContent = CH[ci].n; tickEls.forEach(function (t, i) { t.classList.toggle('on', i <= ci); }); }
    var cl = LR.clock(t0 + (t1 - t0) * p), key = cl.t + cl.ap;
    if (key !== lastClock) { lastClock = key; timeEl.textContent = cl.t + ' ' + cl.ap; }
    var docked = p > .075 ? '1' : '0'; if (docked !== lastDock) { lastDock = docked; stage.setAttribute('data-docked', docked); }
    // set arc: draw, light rows + dots, move the head along the path
    var sp = LR.clamp((p - .375) / .17), pos = sp;
    live.style.strokeDashoffset = (arcLen * (1 - sp)).toFixed(1);
    rowEls.forEach(function (r, i) { r.classList.toggle('on', sp >= rowAt[i] - .001 && sp > 0); });
    dotEls.forEach(function (c, i) { c.classList.toggle('on', sp >= rowAt[i] - .001 && sp > 0); });
    var pt = live.getPointAtLength(arcLen * pos); head.setAttribute('cx', pt.x); head.setAttribute('cy', pt.y); ring.setAttribute('cx', pt.x); ring.setAttribute('cy', pt.y);
    head.style.opacity = ring.style.opacity = (sp > 0 && p < .6) ? 1 : 0;
    // final beat: bar CTA yields to the ticket CTA (one primary action on screen)
    var fin = p > .86; barCta.style.opacity = fin ? 0 : 1; barCta.style.pointerEvents = fin ? 'none' : 'auto'; barCta.tabIndex = fin ? -1 : 0;
    reserve.classList.toggle('is-beat', fin && !LR.reduce);
  }

  function timeline(mobile) {
    var T = mobile ? { roomOut: .695, tIn: .715, tDur: .1, cIn: .77 } : { roomOut: .775, tIn: .585, tDur: .2, cIn: .79 };
    var b = { sound: $('.b-sound'), set: $('.b-set'), room: $('.b-room'), close: $('.b-close') };
    var nameEl = $('.name'), nameWrap = $('.name-wrap'), tw = $('.ticket-wrap');
    var tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: track, start: 'top top', end: 'bottom bottom', scrub: .75, onUpdate: function (self) { onProg(self.progress); } } });
    gsap.set([b.sound, b.set, b.room, b.close, tw], { autoAlpha: 0 });
    gsap.set($('.scrim'), { opacity: .5 });
    gsap.set($$('.set-row'), { y: 18 });
    // 1 Arrive → exit by moving through the name
    tl.to($('.scrim'), { opacity: 1, duration: .12 }, 0)
      .to([$('.tagline'), $('.name-wrap .eyebrow'), $('.cue')], { autoAlpha: 0, y: -24, duration: .04 }, .0)
      .to(nameEl, { scale: mobile ? 1.18 : 1.4, autoAlpha: 0, yPercent: -7, ease: 'power2.in', duration: .11 }, .02)
    // 2 Sound
      .fromTo(b.sound, { autoAlpha: 0 }, { autoAlpha: 1, duration: .03 }, .115)
      .fromTo($$('.b-sound .eyebrow'), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .03 }, .12)
      .to($$('.statement .w'), { opacity: 1, stagger: .0085, duration: .02 }, .135)
      .fromTo($('.specs'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: .03, ease: 'power2.out' }, .2)
      .fromTo($$('.specs li'), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: .016, duration: .03, ease: 'power2.out' }, .215)
      .to(b.sound, { autoAlpha: 0, y: -36, duration: .045, ease: 'power2.in' }, .295)
    // 3 Set
      .fromTo(b.set, { autoAlpha: 0 }, { autoAlpha: 1, duration: .035 }, .34)
      .to($$('.set-row'), { y: 0, stagger: .028, duration: .03, ease: 'power2.out' }, .365)
      .to(b.set, { autoAlpha: 0, y: -36, duration: .04, ease: 'power2.in' }, .54)
    // 4 Room
      .fromTo(b.room, { autoAlpha: 0 }, { autoAlpha: 1, duration: .035 }, .58)
      .fromTo($$('.stat'), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: .02, duration: .04, ease: 'power3.out' }, .59)
      .fromTo($$('.points li'), { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: .012, duration: .03, ease: 'power2.out' }, .64)
      .fromTo($$('.lock-note'), { autoAlpha: 0 }, { autoAlpha: 1, duration: .03 }, .69)
      .to(b.room, { autoAlpha: 0, y: -36, duration: .04, ease: 'power2.in' }, T.roomOut - .04)
    // 5 Ticket
      .fromTo(tw, { autoAlpha: 0, y: mobile ? 60 : innerHeight * .55, rotateX: mobile ? 0 : 26, scale: .92 }, { autoAlpha: 1, y: 0, rotateX: 0, scale: 1, ease: 'power3.out', duration: T.tDur }, T.tIn)
      .fromTo(b.close, { autoAlpha: 0 }, { autoAlpha: 1, duration: .035 }, T.cIn)
      .fromTo($$('.close-copy > *'), { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: .015, duration: .03, ease: 'power2.out' }, T.cIn);
    tl.to({}, { duration: 1 - tl.duration() > 0 ? 1 - tl.duration() : 0 }, tl.duration());
    return tl;
  }

  /* intro: letters rise through a mask, then the rest settle in. Runs once, ~1.2s. */
  var easeIn = th.ease || 'expo.out';
  var targets = $$('.name .ch').length ? $$('.name .ch') : $$('.name .ln>span');
  if (opts.intro !== false) {
  gsap.set([$('.bar'), $('.player')], { autoAlpha: 0 });
  intro = gsap.timeline({ delay: .08 });
  intro.from(targets, { yPercent: 118, rotate: th.title && th.title.tilt ? th.title.tilt : 0, duration: 1.15, stagger: targets.length > 6 ? .035 : .12, ease: easeIn })
    .to([$('.bar'), $('.player')], { autoAlpha: 1, duration: .8, ease: 'power2.out' }, .45);
  }

  var p0 = opts.progress || 0; if (p0 > 0) api.setProgress(p0);
  mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', function () { var t = timeline(false); onProg(p0); return function () { t.kill(); }; });
  mm.add('(max-width: 899px)', function () { var t = timeline(true); onProg(p0); return function () { t.kill(); }; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!dead) ST.refresh(); });

  /* chapter jumps + skip link */
  function toP(p, instant) {
    var max = track.offsetHeight - g.innerHeight;
    g.scrollTo({ top: track.offsetTop + max * p, behavior: instant ? 'auto' : 'smooth' });
  }
  tickEls.forEach(function (t) { t.addEventListener('click', function () { toP(parseFloat(t.getAttribute('data-p')) + .003); }); });
  $('.skip').addEventListener('click', function (e) { e.preventDefault(); toP(1, true); setTimeout(function () { reserve.focus({ preventScroll: true }); }, 60); });

  /* pointer parallax for the motif */
  onWin('pointermove', function (e) { if (art) art.setPointer(e.clientX / g.innerWidth, e.clientY / g.innerHeight); }, { passive: true });
  onWin('keydown', function (e) { if (e.key === 'Home') { e.preventDefault(); toP(0, true); } });
  return api;
  }

  LR.hero = { mount: mount };
  if (!g.LR_MANUAL && LR.E) LR.hero.current = mount(LR.E, {});
})(window);
