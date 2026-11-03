/* Listening Room · shader motifs (raw WebGL1, no dependencies).
   One uniform API for every motif, so a new DJ skin = pick a motif + 5 colours.
   Perf rules: DPR capped, half-res on phones, paused when offscreen/hidden, single static frame under Reduce Motion. */
(function (global) {
  'use strict';

  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  var HEAD = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 uRes;uniform float uTime;uniform float uProg;uniform vec2 uPtr;uniform float uDpr;uniform float uSeed;uniform float uSafe;',
    'uniform vec3 uBg;uniform vec3 uInk;uniform vec3 uAcc;uniform vec3 uAcc2;',
    'float h11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}',
    'float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}',
    'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}',
    'float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+17.1;a*=.5;}return s;}',
    'float fbm3(vec2 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*vn(p);p=p*2.03+17.1;a*=.5;}return s;}',
    'vec3 finish(vec3 c,vec2 fc,float grain){float ax=fc.x/uRes.x;float land=step(1.,uRes.x/uRes.y);float sf=mix(.5,mix(.3,1.,smoothstep(.28,.68,ax)),land);c*=mix(1.,sf,uSafe);c+=(h21(fc+fract(uTime)*91.7)-.5)*grain;return c;}'
  ].join('\n');

  var S = {};

  /* 1 · QUIET SPECTRA — a field of small deliberate marks, one vertical axis, one intentional irregularity,
         a single tempered-metal playhead that travels down the field as you scroll. */
  S.spectra = [
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy;float cell=(uRes.x>900.?24.:17.)*uDpr;',
    ' vec2 g=fc/cell;float cols=uRes.x/cell;float axis=floor(cols*.5);',
    ' float irr=step(abs(floor(g.x)-(axis+5.)),.5);g.y+=irr*.5;',
    ' vec2 id=floor(g);vec2 lp=fract(g)-.5;',
    ' vec2 cuv=(id+.5)*cell/uRes;',
    ' float asp=uRes.x/uRes.y;float dx=(cuv.x-.5)*asp;',
    ' float env=exp(-dx*dx*1.7);',
    ' float n=fbm3(id*.075+vec2(uSeed,uTime*.035));',
    ' float wv=.5+.5*sin(length(vec2(dx,(cuv.y-.52)*1.2))*10.-uTime*.8-uProg*9.);',
    ' float f=clamp(env*(.2+.8*n)*(.35+.65*wv)+.035,0.,1.);',
    ' float pd=distance(vec2(cuv.x*asp,cuv.y),vec2(uPtr.x*asp,uPtr.y));f+=smoothstep(.26,0.,pd)*.55;',
    ' f=clamp(f,0.,1.);',
    ' float r=mix(.05,.40,f);float d=length(lp)-r;float aa=1.1/cell*uDpr;',
    ' float dotA=1.-smoothstep(-aa,aa,d);',
    ' float py=1.-uProg;float band=smoothstep(.085,0.,abs(cuv.y-py));',
    ' float irrHi=irr*smoothstep(.1,0.,abs(cuv.y-py))*.6;',
    ' vec3 mk=mix(uInk*.5,uAcc,clamp(band+irrHi,0.,1.));',
    ' vec3 col=uBg+mk*dotA*(.25+.75*f);',
    ' col+=uAcc*exp(-abs(dx)*5.)*.05*(1.-uProg*.5)*smoothstep(.0,1.,cuv.y);',
    ' gl_FragColor=vec4(finish(col,fc,.035),1.);}'
  ].join('\n');

  /* 2 · LED TUNNEL — chebyshev rings fly past; scroll = camera depth. Beat-pulsed LED dashes per ring. */
  S.tunnel = [
    'void main(){',
    ' vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;p+=(uPtr-.5)*vec2(.07,.045);',
    ' float t=uTime;float z0=uProg*34.+t*1.15;',
    ' vec2 q=vec2(p.x*.58,p.y);float ax=abs(q.x),ay=abs(q.y);float r=max(max(ax,ay),.0008);',
    ' float depth=1.05/r;float zz=depth+z0;',
    ' float ringF=zz*.72;float ringId=floor(ringF);float rd=abs(fract(ringF)-.5);',
    ' float scr=rd*r*r/.756;',
    ' float w=.0021;float lg=w/(scr+w);lg=pow(lg,1.35);',
    ' float u=(ax>ay)?q.y/ax:q.x/ay;',
    ' float ln=abs(fract(u*5.+.5)-.5);float w2=.0013;float lg2=w2/(ln*r*2.2+w2);lg2=pow(lg2,1.3);',
    ' float rh=h11(ringId*1.7+uSeed);',
    ' float pulse=pow(.5+.5*sin(ringId*.55-t*3.1),6.);',
    ' float dashU=step(.55,fract(u*3.5+rh*9.+ringId*.41));',
    ' float bar=smoothstep(w*4.,0.,scr)*dashU*step(.62,rh);',
    ' vec3 cA=mix(uAcc,uAcc2,step(.9,rh));',
    ' float fade=smoothstep(.012,.14,r)*smoothstep(1.7,.45,r);',
    ' vec3 col=uBg;',
    ' col+=cA*lg*(.22+1.15*pulse)*fade;',
    ' col+=uAcc*lg2*.3*fade;',
    ' col+=cA*bar*(.4+1.4*pulse)*fade;',
    ' col+=mix(uAcc,uAcc2,.45)*exp(-r*8.)*.2*(.65+.35*sin(t*2.1));',
    ' col*=.9+.1*sin(gl_FragCoord.y*1.6*uDpr);',
    ' gl_FragColor=vec4(finish(col,gl_FragCoord.xy,.03),1.);}'
  ].join('\n');

  /* 3 · SUNBURST — art-deco sun over water, foil rays, gold dust. Scroll raises the sun: golden hour. */
  S.sunburst = [
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy;vec2 p=(fc-.5*uRes)/uRes.y;float t=uTime;',
    ' float hor=-.12;float rise=smoothstep(0.,1.,uProg);',
    ' float asp=uRes.x/uRes.y;float sx=.36*smoothstep(.6,1.4,asp);float kk=min(1.,asp*1.25);vec2 sc=vec2(sx,hor+mix(.045,.30,rise)*kk);float rad=.27*kk;',
    ' vec2 sp=p-sc;float d=length(sp);',
    ' vec3 col;',
    ' if(p.y>=hor){',
    '  float hy=clamp((p.y-hor)/.95,0.,1.);',
    '  vec3 horizon=mix(uAcc2,uAcc,.35)*mix(.34,.62,step(1.,asp));',
    '  col=mix(uBg,horizon,pow(1.-hy,2.4)*(.55+.45*rise));',
    '  col=mix(col,uBg*1.3+vec3(0.,.035,.03),smoothstep(.4,1.,hy)*.8);',
    '  float a=atan(sp.y,sp.x);',
    '  float rays=pow(.5+.5*sin(a*30.+t*.07),4.)*exp(-d*1.5)*smoothstep(.0,.2,d-rad*.7);',
    '  col+=uAcc*rays*.22*(.5+.5*rise);',
    '  float disc=smoothstep(rad+.004,rad-.004,d);',
    '  float ringB=.5+.5*sin(d*95.);float band=mix(.78,1.,smoothstep(.2,.8,ringB));',
    '  vec3 sunC=mix(uAcc2,uAcc,clamp((sp.y/rad)*.5+.55,0.,1.));',
    '  sunC=mix(sunC,vec3(1.,.96,.82),smoothstep(.55,0.,d/rad)*.5);',
    '  col=mix(col,sunC*band,disc);',
    '  col+=uAcc*exp(-max(d-rad,0.)*9.)*mix(.14,.28,step(1.,asp));',
    ' }else{',
    '  float depth=(hor-p.y);',
    '  vec2 m=vec2(p.x+sin(p.y*70.+t*1.4)*.012*smoothstep(0.,.5,depth),p.y);',
    '  vec3 water=mix(uBg*1.5+vec3(0.,.04,.035),uBg,smoothstep(0.,.6,depth));',
    '  col=water;',
    '  float streak=exp(-abs(m.x-sx)*(6.+depth*14.))*(.5+.5*sin(p.y*(120.+depth*60.)+t*2.2));',
    '  streak*=smoothstep(.65,0.,depth)*(.5+.5*rise);',
    '  col+=mix(uAcc2,uAcc,.5)*streak*.62;',
    '  col+=uAcc2*exp(-depth*18.)*.16;',
    ' }',
    ' for(int l=0;l<3;l++){float fl=float(l);',
    '  vec2 gp=p*vec2(10.,6.)*(1.+fl*.8);gp.y-=t*(.06+fl*.05);gp.x+=fl*7.3;',
    '  vec2 cl=floor(gp);vec2 f=fract(gp)-.5;float rr=h21(cl+fl*13.1+uSeed);',
    '  vec2 off=(vec2(h21(cl+3.1),h21(cl+7.7))-.5)*.6;',
    '  float sp2=smoothstep(.07,0.,length(f-off))*step(.6,rr)*(.5+.5*sin(t*1.8+rr*40.));',
    '  col+=mix(uAcc,vec3(1.),.3)*sp2*(.45-.1*fl);}',
    ' gl_FragColor=vec4(finish(col,fc,.03),1.);}'
  ].join('\n');

  /* 4 · MERCURY — domain-warped liquid chrome lit by a procedural studio. Scroll increases the warp. */
  S.mercury = [
    'float hgt(vec2 q,float t,float warp){vec2 w=vec2(fbm3(q+vec2(0.,t)),fbm3(q+vec2(5.2,1.3)-t));return fbm(q+warp*(w*2.-1.)+t*.5);}',
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy;vec2 p=(fc-.5*uRes)/uRes.y;float t=uTime*.06+uSeed;',
    ' vec2 q=p*1.55+(uPtr-.5)*.15;float warp=.9+1.6*uProg;',
    ' float e=.0035;float h=hgt(q,t,warp);',
    ' float hx=hgt(q+vec2(e,0.),t,warp)-h;float hy=hgt(q+vec2(0.,e),t,warp)-h;',
    ' vec3 n=normalize(vec3(-hx*26.,-hy*26.,1.));',
    ' vec3 rd=reflect(vec3(0.,0.,-1.),n);',
    ' float band=sin(rd.y*7.+rd.x*2.5+1.2);',
    ' float studio=smoothstep(-.15,.85,band);',
    ' float horizon=pow(1.-abs(rd.y*1.1),14.)*1.25;',
    ' float box=smoothstep(.62,.7,rd.x*.8+rd.y*.6)*.8;',
    ' vec3 chrome=vec3(.025)+vec3(.9,.92,.96)*(studio*.62+horizon+box);',
    ' float fr=pow(1.-n.z,2.2);',
    ' vec3 irid=.5+.5*cos(6.2832*(vec3(0.,.33,.67)+dot(n.xy,vec2(1.,.7))*2.4+t*.4));',
    ' vec3 col=chrome;col=mix(col,col*mix(uInk,irid,.55),fr*1.4);',
    ' col+=uAcc2*pow(max(horizon,0.),2.)*.12;',
    ' col=mix(uBg,col,.55);',
    ' col*=mix(.16,1.,smoothstep(-.15,.8,p.x));',
    ' col*=1.-smoothstep(.45,1.15,length(p*vec2(.9,1.1)))*.6;',
    ' gl_FragColor=vec4(finish(col,fc,.028),1.);}'
  ].join('\n');

  /* 5 · SPOTLIGHT — a volumetric beam through dusty air onto a vinyl-ringed pool. Scroll narrows the beam. */
  S.spotlight = [
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy;vec2 p=(fc-.5*uRes)/uRes.y;float t=uTime;',
    ' float asp=uRes.x/uRes.y;',
    ' vec2 S=vec2(mix(.40,.34,uProg)+.04*sin(t*.23),.7);',
    ' vec2 T=vec2(mix(.20,.26,uProg)+.03*sin(t*.2+1.),-.40);',
    ' vec2 dir=normalize(T-S);vec2 v=p-S;float al=dot(v,dir);vec2 pr=v-dir*al;float perp=length(pr);',
    ' float side=sign(dir.x*v.y-dir.y*v.x);',
    ' float hw=max(al,0.)*mix(.2,.12,uProg);',
    ' float beam=smoothstep(hw,hw*.15,perp)*smoothstep(0.,.25,al)*exp(-al*.35);',
    ' float dust=fbm(vec2(side*perp*9.,al*2.6-t*.12));beam*=.5+.9*dust;',
    ' vec3 col=uBg+vec3(.012,.008,.02)*fbm3(p*2.+t*.02);',
    ' col+=mix(uAcc,uInk,.3)*beam*(.55+.35*uProg);',
    ' for(int l=0;l<2;l++){float fl=float(l);vec2 gp=p*vec2(13.,8.)*(1.+fl*.9);gp.y-=t*(.04+fl*.04);',
    '  vec2 cl=floor(gp);vec2 f=fract(gp)-.5;float rr=h21(cl+fl*9.7+uSeed);vec2 off=(vec2(h21(cl+1.3),h21(cl+4.1))-.5)*.5;',
    '  float m=smoothstep(.06,0.,length(f-off))*step(.55,rr)*(.5+.5*sin(t*1.4+rr*30.));',
    '  col+=mix(uAcc,uInk,.5)*m*beam*3.2;}',
    ' vec2 e=(p-T)*vec2(1.,2.9);float pool=exp(-dot(e,e)*2.6);',
    ' float rings=.5+.5*sin(length(e)*150.-t*.35);',
    ' col+=uAcc*pool*(.26+.2*uProg)+uAcc*pool*rings*.12;',
    ' col*=1.-smoothstep(.5,1.25,length(p*vec2(.85,1.)))*.7;',
    ' gl_FragColor=vec4(finish(col,fc,.05),1.);}'
  ].join('\n');

  function hex(c) {
    c = String(c || '#000').replace('#', '');
    if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join('');
    var n = parseInt(c, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s); gl.deleteShader(s);
      throw new Error('shader: ' + log);
    }
    return s;
  }

  /* mount(canvas, motif, opts) → controller. opts: tokens{bg,ink,acc,acc2}, dprMax, scale, fps, seed, prog, still */
  function mount(canvas, motif, opts) {
    opts = opts || {};
    var body = S[motif] || S.spectra;
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: !!opts.keep });
    if (!gl) return null;
    var prog;
    try {
      var vs = compile(gl, gl.VERTEX_SHADER, VERT), fs = compile(gl, gl.FRAGMENT_SHADER, HEAD + '\n' + body);
      prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (err) { if (global.console) console.warn('[LR] shader failed, using CSS fallback.', err.message); return null; }
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ['uRes', 'uTime', 'uProg', 'uPtr', 'uDpr', 'uSeed', 'uSafe', 'uBg', 'uInk', 'uAcc', 'uAcc2'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    var tk = opts.tokens || {};
    gl.uniform3fv(U.uBg, hex(tk.bg)); gl.uniform3fv(U.uInk, hex(tk.ink)); gl.uniform3fv(U.uAcc, hex(tk.acc)); gl.uniform3fv(U.uAcc2, hex(tk.acc2));
    gl.uniform1f(U.uSeed, opts.seed || 0); gl.uniform1f(U.uSafe, opts.safe ? 1 : 0);

    var state = { prog: opts.prog == null ? 0 : opts.prog, ptr: [.5, .5], ptrT: [.5, .5], t0: performance.now(), tOff: opts.timeOffset || 0, vis: true, raf: 0, last: 0, dpr: 1 };
    var small = global.innerWidth < 700;
    function resize() {
      var dpr = Math.min(global.devicePixelRatio || 1, opts.dprMax || 1.5) * (opts.scale || (small ? .72 : 1));
      var w = Math.max(2, Math.round(canvas.clientWidth * dpr)), h = Math.max(2, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      state.dpr = dpr; gl.viewport(0, 0, w, h);
      gl.uniform2f(U.uRes, w, h); gl.uniform1f(U.uDpr, dpr);
    }
    function draw(now) {
      state.ptr[0] += (state.ptrT[0] - state.ptr[0]) * .06; state.ptr[1] += (state.ptrT[1] - state.ptr[1]) * .06;
      gl.uniform1f(U.uTime, opts.still ? (opts.stillTime || 12) : ((now - state.t0) / 1000 + state.tOff));
      gl.uniform1f(U.uProg, state.prog); gl.uniform2f(U.uPtr, state.ptr[0], state.ptr[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    var minDt = 1000 / (opts.fps || 60);
    function loop(now) {
      state.raf = global.requestAnimationFrame(loop);
      if (!state.vis || document.hidden) return;
      if (now - state.last < minDt) return; state.last = now; draw(now);
    }
    var io = ('IntersectionObserver' in global) ? new IntersectionObserver(function (e) { state.vis = e[0].isIntersecting; }, { threshold: 0 }) : null;
    if (io) io.observe(canvas);
    global.addEventListener('resize', resize);
    resize();
    if (opts.still) { draw(performance.now()); } else { state.raf = global.requestAnimationFrame(loop); }
    return {
      setProg: function (p) { state.prog = p; if (opts.still) draw(performance.now()); },
      setPointer: function (x, y) { state.ptrT[0] = x; state.ptrT[1] = 1 - y; },
      redraw: function () { resize(); draw(performance.now()); },
      destroy: function () { global.cancelAnimationFrame(state.raf); global.removeEventListener('resize', resize); if (io) io.disconnect(); }
    };
  }

  global.LRShaders = { mount: mount, motifs: Object.keys(S) };
})(window);
