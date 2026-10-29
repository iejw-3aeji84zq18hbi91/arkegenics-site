// Arkegenics hero: out of a dark hold, the wordmark is riveted together plate by plate, each
// strike throwing sparks, then it holds as hammered copper under a lantern the visitor carries.
// Real-time WebGL2, no libraries. Without WebGL2, or with reduced motion, the page keeps its
// CSS hero. Preview stills: ?t=<seconds> freezes the timeline.

import { LIT, APPROACH, STRIKES, FINAL } from './timeline.js';

const root = document.documentElement;
const canvas = document.getElementById('gl');
const mark = document.querySelector('.mark');
const hero = document.querySelector('.hero');
const lantern = document.querySelector('.lantern');
const query = new URLSearchParams(location.search);
const still = query.has('t') ? Math.max(0, parseFloat(query.get('t')) || 0) : null;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const fallback = () => root.classList.remove('gl');
if (reduce || !canvas || !mark || !hero) fallback();
else boot().catch(error => { console.warn(error); fallback(); });

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEAT = `
vec3 heatColor(float h){
  return mix(mix(vec3(.5, .07, .02), vec3(1., .42, .1), smoothstep(0., .5, h)), vec3(1., .88, .64), smoothstep(.5, 1., h));
}`;

const LOGO_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
uniform vec4 uRect;
uniform vec2 uView, uPad;
out vec2 vUv;
void main(){
  vec2 uv = mix(-uPad, 1. + uPad, aCorner);
  vec2 px = uRect.xy + uv * uRect.zw;
  gl_Position = vec4(px.x / uView.x * 2. - 1., 1. - px.y / uView.y * 2., 0., 1.);
  vUv = uv;
}`;

const LOGO_FS = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uTex;
uniform sampler2D uData;
uniform float uT, uAspect, uApproach, uFinal, uExposure;
uniform float uLand[16];
uniform vec4 uSpin[16];
uniform vec2 uCenter[16];
uniform vec3 uRivet[8];
uniform vec3 uLight;
uniform vec3 uStrike;
in vec2 vUv;
out vec4 o;
${HEAT}
int plateAt(vec2 uv){
  ivec2 size = textureSize(uData, 0);
  ivec2 p = ivec2(clamp(uv, 0., .9999) * vec2(size));
  return int(floor(texelFetch(uData, p, 0).b * 255. / 15. + .5)) - 1;
}
vec4 shade(vec2 uv, float lod, float heat){
  vec4 c = textureLod(uTex, uv, lod);
  vec2 nxy = texture(uData, uv).rg * 2. - 1.;
  vec3 N = vec3(nxy, sqrt(max(0., 1. - dot(nxy, nxy))));
  vec2 P = vec2(uv.x * uAspect, uv.y);
  vec2 Lp = vec2(uLight.x * uAspect, uLight.y);
  vec3 L = normalize(vec3(Lp - P, uLight.z));
  float pool = 1. / (1. + dot(Lp - P, Lp - P) * 1.4);
  float diff = max(dot(N, L), 0.);
  float spec = pow(max(dot(reflect(-L, N), vec3(0., 0., 1.)), 0.), 22.);
  float m = max(c.r, max(c.g, c.b));
  // The art already carries its own light; the lantern lifts what it reaches and glints on the hammering.
  vec3 col = c.rgb * (.7 + .46 * diff * pool + .16 * pool) + vec3(1., .78, .5) * spec * pool * .55 * smoothstep(.12, .45, m);
  // Freshly struck metal runs hot along its bevels, then cools.
  float edge = clamp(length(nxy) * 2.4, 0., 1.);
  col += heatColor(heat) * heat * (.22 + .95 * edge) * smoothstep(.05, .3, m);
  return vec4(col, clamp(m * 1.4, 0., 1.));
}
float heatOf(int id){
  float since = uT - uLand[id];
  return since < 0. ? 0. : exp(-since * 2.4);
}
void main(){
  vec2 uv = vUv;
  vec4 acc = vec4(0.);
  if (uv.x >= 0. && uv.x <= 1. && uv.y >= 0. && uv.y <= 1.) {
    int id = plateAt(uv);
    if (id >= 0 && uT >= uLand[id]) acc = shade(uv, 0., heatOf(id));
  }
  // Plates still on their way: out of the dark, large and soft, accelerating into place.
  if (uT < uFinal) {
    for (int j = 0; j < 16; j++) {
      float p = (uT - (uLand[j] - uApproach)) / uApproach;
      if (p <= 0. || p >= 1.) continue;
      float e = p * p;
      float s = mix(1.55, 1., e);
      vec4 sp = uSpin[j];
      float r = sp.x * (1. - e);
      vec2 c = uCenter[j];
      vec2 q = vec2((uv.x - c.x) * uAspect, uv.y - c.y) - sp.yz * (1. - e);
      q = mat2(cos(r), -sin(r), sin(r), cos(r)) * q / s;
      vec2 src = c + vec2(q.x / uAspect, q.y);
      if (src.x < 0. || src.x > 1. || src.y < 0. || src.y > 1.) continue;
      if (plateAt(src) != j) continue;
      vec4 col = shade(src, (1. - e) * 3.2, 0.) * smoothstep(0., .5, p) * mix(.35, 1., e);
      acc = col + acc * (1. - col.a);
    }
  }
  // Rivets glow white, then orange, then cool back to bronze.
  for (int k = 0; k < 8; k++) {
    vec3 rv = uRivet[k];
    if (rv.z <= 0. || uT < rv.z) continue;
    float h = exp(-(uT - rv.z) * 1.1);
    vec2 d = vec2((uv.x - rv.x) * uAspect, uv.y - rv.y);
    float g = exp(-dot(d, d) / .0011), core = exp(-dot(d, d) / .00022);
    acc.rgb += heatColor(h) * h * (g * .8 + core * 1.5);
    acc.a = max(acc.a, clamp(h * g * 1.2, 0., 1.));
  }
  // The last strike sends heat running through the whole hull.
  float sweep = (uT - uFinal - .05) / 1.15;
  if (sweep > 0. && sweep < 1.) {
    float x = mix(-.12, 1.12, sweep);
    float band = exp(-pow((uv.x + (uv.y - .5) * .1 - x) / .05, 2.));
    acc.rgb += vec3(1., .6, .26) * band * acc.a * .9 * (1. - sweep * .4);
  }
  // A visitor's own hammer blow.
  float st = uT - uStrike.z;
  if (st > 0. && st < 2.5) {
    vec2 d = vec2((uv.x - uStrike.x) * uAspect, uv.y - uStrike.y);
    float h = exp(-st * 2.);
    acc.rgb += heatColor(h) * h * exp(-dot(d, d) / .007) * acc.a * 1.3;
  }
  o = acc * uExposure;
}`;

const SPARK_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aPosVel;
layout(location = 2) in vec2 aHeat;
uniform vec2 uView;
uniform float uScroll;
out vec2 vQ;
out float vHeat;
void main(){
  vec2 v = aPosVel.zw;
  float sp = length(v);
  vec2 dir = sp > 1e-3 ? v / sp : vec2(0., -1.);
  vec2 side = vec2(-dir.y, dir.x);
  float len = clamp(sp * .014, 1.1, 24.) * aHeat.y;
  float wid = .55 + .75 * aHeat.y;
  vec2 px = vec2(aPosVel.x, aPosVel.y - uScroll) + dir * (aCorner.x - 1.) * len + side * aCorner.y * wid;
  gl_Position = vec4(px.x / uView.x * 2. - 1., 1. - px.y / uView.y * 2., 0., 1.);
  vQ = aCorner;
  vHeat = aHeat.x;
}`;

const SPARK_FS = `#version 300 es
precision mediump float;
in vec2 vQ;
in float vHeat;
out vec4 o;
${HEAT}
void main(){
  float across = 1. - abs(vQ.y);
  float a = across * across * smoothstep(-1., .9, vQ.x) * smoothstep(0., .12, vHeat);
  o = vec4(heatColor(vHeat) * (1.1 + vHeat) * a, a * .35);
}`;

function compile(gl, vs, fs) {
  const program = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  const uniforms = {};
  for (let i = 0, n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i < n; i++) {
    const name = gl.getActiveUniform(program, i).name;
    uniforms[name] = uniforms[name.replace(/\[0\]$/, '')] = gl.getUniformLocation(program, name);
  }
  return { program, u: uniforms };
}

function texture(gl, img, mipmaps) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

async function load(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

async function boot() {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: still !== null });
  if (!gl) throw new Error('WebGL2 unavailable');
  const [logoImg, dataImg, layout] = await Promise.all([
    load(mark.querySelector('img').currentSrc || 'logo.png'), load('data.png?v=2'),
    fetch('plates.json').then(r => r.json()),
  ]);
  const plates = layout.plates;
  const aspect = layout.size[0] / layout.size[1];
  const small = matchMedia('(max-width: 760px), (pointer: coarse)').matches;

  const logo = compile(gl, LOGO_VS, LOGO_FS);
  const spark = compile(gl, SPARK_VS, SPARK_FS);
  gl.activeTexture(gl.TEXTURE0);
  texture(gl, logoImg, true);
  gl.activeTexture(gl.TEXTURE1);
  texture(gl, dataImg, false);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const lVao = gl.createVertexArray();
  gl.bindVertexArray(lVao);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const MAX = small ? 900 : 1600;
  const inst = new Float32Array(MAX * 6);
  const sVao = gl.createVertexArray();
  gl.bindVertexArray(sVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const instBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
  gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 24, 16);
  gl.vertexAttribDivisor(2, 1);
  gl.bindVertexArray(null);
  gl.enable(gl.BLEND);

  // Each plate's landing, its tumble on the way in, and where it is struck.
  const land = new Float32Array(16).fill(999);
  const spin = new Float32Array(64);
  const centers = new Float32Array(32);
  const rivets = new Float32Array(24);
  const seeded = rng(20261029);
  let r = 0;
  for (const s of STRIKES) {
    const p = plates[s.plate];
    land[s.plate] = s.t;
    const side = seeded() < .5 ? -1 : 1;
    spin.set([side * (.07 + seeded() * .16), (seeded() - .5) * .5, -.05 - seeded() * .12, 0], s.plate * 4);
    centers.set(p.center, s.plate * 2);
    for (const [x, y] of p.rivets) if (r < 8) rivets.set([x, y, s.t], 3 * r++);
  }
  // Where each strike throws sparks: its rivets, or the foot of the plate.
  const strikePoints = STRIKES.map(s => {
    const p = plates[s.plate];
    if (s.final) return [p.center];
    if (p.rivets.length) return p.rivets;
    const [x0, , x1, y1] = p.box;
    return [[x0 + (x1 - x0) * .3, y1 - .02], [x0 + (x1 - x0) * .7, y1 - .02]];
  });

  // Sparks and embers live in page coordinates, so they stay put while the page scrolls.
  let sparks = [];
  let random = rng(7);
  const emit = (rect, u, v, count, power, ember = false) => {
    const k = rect.width / 1700;
    for (let i = 0; i < count; i++) {
      const up = random() < .82;
      const angle = up ? -Math.PI / 2 + (random() * 2 - 1) * 1.35 : random() * Math.PI * 2;
      const speed = ember ? 10 + random() * 40 : (150 + 780 * Math.pow(random(), 1.8)) * power;
      const life = ember ? 3 + random() * 4.5 : .3 + random() * .85;
      sparks.push({
        x: rect.left + u * rect.width + (random() - .5) * 6 * k,
        y: rect.top + scrollY + v * rect.height + (random() - .5) * 6 * k,
        vx: Math.cos(angle) * speed * k, vy: (ember ? -Math.abs(Math.sin(angle)) - .4 : Math.sin(angle)) * speed * k,
        life, life0: life, heat0: ember ? .45 + random() * .3 : .78 + random() * .22,
        size: ember ? .7 : .75 + random() * .55, ember, k, seed: random() * 6.28,
      });
    }
    if (sparks.length > MAX) sparks = sparks.slice(sparks.length - MAX);
  };
  const step = (dt, t) => {
    for (const s of sparks) {
      s.life -= dt;
      if (s.ember) {
        s.vx += Math.sin(t * 1.3 + s.seed) * 9 * s.k * dt;
        s.vy -= 2 * s.k * dt;
      } else {
        s.vy += 1500 * s.k * dt;
        const drag = Math.exp(-1.5 * dt);
        s.vx *= drag; s.vy *= drag;
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
    }
    sparks = sparks.filter(s => s.life > 0);
  };

  const pointer = { x: 0, y: 0, seen: false, type: 'mouse', touching: false, movedAt: -1e9 };
  const light = { x: .1, y: -.6, z: .6, sx: 0, sy: 0 };
  let strike = [0, 0, -99];
  let fired = 0, emberClock = 0, last = null, blank = false;
  let begin = performance.now();
  const now = () => (still ?? (performance.now() - begin) / 1000);
  // sound.js reads the intro clock and can replay the intro.
  window.arkHero = {
    time: now,
    restart() {
      scrollTo(0, 0);
      sparks = []; fired = 0; emberClock = 0; strike = [0, 0, -99]; last = null;
      begin = performance.now();
    },
  };

  const track = e => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.type = e.pointerType;
    pointer.movedAt = performance.now();
    pointer.seen = true;
  };
  addEventListener('pointermove', track, { passive: true });
  addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { pointer.touching = true; track(e); } }, { passive: true });
  for (const type of ['pointerup', 'pointercancel']) addEventListener(type, e => { if (e.pointerType !== 'mouse') pointer.touching = false; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.movedAt = -1e9; });
  // A click or a tap on the mark is a hammer blow where it lands; a touch that turns into a scroll is not.
  hero.addEventListener('click', e => {
    const t = now();
    if (t < FINAL + .6) return;
    const rect = mark.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width, v = (e.clientY - rect.top) / rect.height;
    if (u < -.02 || u > 1.02 || v < -.3 || v > 1.3) return;
    strike = [u, v, t];
    emit(rect, u, v, small ? 40 : 70, 1.05);
    dispatchEvent(new Event('hero:strike'));
  });

  // What the intro has done by time t: every strike at or before it throws its sparks.
  const play = (rect, t) => {
    while (fired < STRIKES.length && STRIKES[fired].t <= t) {
      const s = STRIKES[fired];
      for (const [u, v] of strikePoints[fired]) emit(rect, u, v, s.final ? (small ? 140 : 240) : (small ? 14 : 24), s.final ? 1.35 : .85);
      if (s.final) for (let i = 0; i < (small ? 30 : 60); i++) emit(rect, .04 + random() * .92, .25 + random() * .5, 1, 1, true);
      fired++;
    }
  };

  const shakeAt = t => {
    let x = 0, y = 0;
    for (const s of STRIKES) {
      const since = t - s.t;
      if (since < 0 || since > .6) continue;
      const a = (s.final ? 5 : 1.1) * Math.exp(-since * 14);
      x += Math.sin(since * 97 + s.t * 13) * a;
      y += Math.cos(since * 83 + s.t * 7) * a;
    }
    return [x, y];
  };

  // A still runs the same sparks forward in fixed steps, so a preview frame is repeatable.
  if (still !== null) {
    await document.fonts?.ready;
    const rect = mark.getBoundingClientRect();
    for (let t = 0; t < still; t += 1 / 120) { play(rect, t); step(1 / 120, t); }
  }

  function frame(stamp) {
    const t = now();
    const dt = still !== null ? 0 : clamp(last === null ? 1 / 60 : (stamp - last) / 1000, 0, 1 / 20);
    last = stamp;
    // The canvas is sized to the large viewport (CSS 100lvh), so a phone's address bar
    // sliding in and out during a scroll never reallocates it.
    const dpr = Math.min(2, devicePixelRatio || 1);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const rect = mark.getBoundingClientRect();
    const onScreen = rect.bottom > 0;

    if (still === null) {
      play(rect, t);
      // After the last strike, embers keep lifting off the warm metal while it is in view.
      if (t > FINAL && rect.bottom > innerHeight * .25) {
        emberClock += dt * (small ? 6 : 11);
        while (emberClock > 1) { emberClock--; emit(rect, .04 + random() * .92, .2 + random() * .6, 1, 1, true); }
      }
      step(dt, t);
    }

    // The lantern follows the work during the intro, then the visitor's hand, else it sways.
    const active = pointer.seen && (pointer.type === 'mouse' ? performance.now() - pointer.movedAt < 2500 : pointer.touching);
    let target;
    if (t < FINAL + .9) {
      const next = STRIKES.find(s => s.t > t - .25) ?? STRIKES[STRIKES.length - 1];
      const c = plates[next.plate].center;
      target = [c[0], -.55, .62];
    } else if (active) {
      target = [(pointer.x - rect.left) / rect.width, (pointer.y - rect.top) / rect.height, .5];
      target[0] = clamp(target[0], -.3, 1.3); target[1] = clamp(target[1], -2.5, 3.5);
    } else {
      target = [.5 + Math.sin(t * .3) * .4, -.45 + Math.sin(t * .47) * .12, .62];
    }
    const ease = still !== null ? 1 : 1 - Math.exp(-dt * (t < FINAL ? 6 : 3.2));
    light.x += (target[0] - light.x) * ease;
    light.y += (target[1] - light.y) * ease;
    light.z += (target[2] - light.z) * ease;
    const exposure = smooth(LIT * .4, LIT + .8, t);
    if (lantern) {
      const lx = rect.left + light.x * rect.width, ly = rect.top + light.y * rect.height;
      light.sx += (lx - light.sx) * (still !== null ? 1 : .12);
      light.sy += (ly - light.sy) * (still !== null ? 1 : .12);
      lantern.style.transform = `translate3d(${light.sx.toFixed(1)}px, ${light.sy.toFixed(1)}px, 0)`;
      lantern.style.opacity = (exposure * smooth(-innerHeight * .2, innerHeight * .5, rect.bottom)).toFixed(3);
    }

    // Down the page with nothing left in the air, one cleared frame is enough until it changes.
    const empty = !onScreen && !sparks.length;
    if (empty && blank) { requestAnimationFrame(frame); return; }
    blank = empty;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (onScreen && exposure > 0) {
      const [sx, sy] = shakeAt(t);
      gl.useProgram(logo.program);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform4f(logo.u.uRect, rect.left + sx, rect.top + sy, rect.width, rect.height);
      gl.uniform2f(logo.u.uView, cw, ch);
      gl.uniform2f(logo.u.uPad, .1, .5);
      gl.uniform1f(logo.u.uT, t);
      gl.uniform1f(logo.u.uAspect, aspect);
      gl.uniform1f(logo.u.uApproach, APPROACH);
      gl.uniform1f(logo.u.uFinal, FINAL);
      gl.uniform1f(logo.u.uExposure, exposure);
      gl.uniform1fv(logo.u.uLand, land);
      gl.uniform4fv(logo.u.uSpin, spin);
      gl.uniform2fv(logo.u.uCenter, centers);
      gl.uniform3fv(logo.u.uRivet, rivets);
      gl.uniform3f(logo.u.uLight, light.x, light.y, light.z);
      gl.uniform3f(logo.u.uStrike, ...strike);
      gl.uniform1i(logo.u.uTex, 0);
      gl.uniform1i(logo.u.uData, 1);
      gl.bindVertexArray(lVao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    if (sparks.length) {
      let n = 0;
      for (const s of sparks) {
        const fade = Math.pow(clamp(s.life / s.life0), s.ember ? .5 : .8);
        const heat = s.heat0 * fade * (s.ember ? clamp((s.life0 - s.life) * 2) : 1);
        inst.set([s.x, s.y, s.vx, s.vy, heat, s.size * s.k * 1.7 + .25], n * 6);
        if (++n >= MAX) break;
      }
      gl.useProgram(spark.program);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform2f(spark.u.uView, cw, ch);
      gl.uniform1f(spark.u.uScroll, scrollY);
      gl.bindVertexArray(sVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst, 0, n * 6);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
    }
    gl.bindVertexArray(null);
    if (still === null) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
