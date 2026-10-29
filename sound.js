// Arkegenics score: generated live with Web Audio (no audio files), synced to the hero.
// The sea under a hull, the hull straining, each plate struck home, and one deep blow when
// the last one lands. Nothing bright or bell-like. Browsers only allow sound after a click,
// tap or key press unless the visitor allows autoplay, so it tries at load and otherwise
// starts on the first gesture.

import { STRIKES, FINAL } from './timeline.js';

function noise(ctx, seconds, brown = false) {
  const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) { last = (last + .02 * white) / 1.02; d[i] = last * 3.5; } else d[i] = white;
  }
  return buf;
}

function room(ctx, seconds, decay) {
  const len = Math.round(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export function createEngine(ctx) {
  const out = ctx.createGain();
  out.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -15; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = .003; comp.release.value = .3;
  out.connect(comp).connect(ctx.destination);
  const bus = ctx.createGain();
  const dry = ctx.createGain(); dry.gain.value = .8;
  const verb = ctx.createConvolver(); verb.buffer = room(ctx, 4.6, 2.2);   // a long wooden hold
  const wet = ctx.createGain(); wet.gain.value = .55;
  bus.connect(dry).connect(out);
  bus.connect(verb).connect(wet).connect(out);
  const hiss = noise(ctx, 2);
  const sea = noise(ctx, 6, true);

  const loop = (buffer, at, dur) => {
    const s = ctx.createBufferSource(); s.buffer = buffer; s.loop = true;
    s.start(at, Math.random() * buffer.duration * .7);
    if (dur) s.stop(at + dur + .05);
    return s;
  };

  return {
    out,
    // Deep water against the hull: slow swells that never quite stop.
    swell(at) {
      const s = loop(sea, at), lp = ctx.createBiquadFilter(), g = ctx.createGain(), level = ctx.createGain();
      lp.type = 'lowpass'; lp.Q.value = .5; lp.frequency.value = 340;
      const wave = ctx.createOscillator(), waveDepth = ctx.createGain();
      wave.frequency.value = .11; waveDepth.gain.value = 190; wave.connect(waveDepth).connect(lp.frequency); wave.start(at);
      const surge = ctx.createOscillator(), surgeDepth = ctx.createGain();
      surge.frequency.value = .11; surgeDepth.gain.value = .35; g.gain.value = .55;
      surge.connect(surgeDepth).connect(g.gain); surge.start(at);
      level.gain.setValueAtTime(0, at); level.gain.linearRampToValueAtTime(.42, at + 2.5);
      s.connect(lp).connect(g).connect(level).connect(bus);
      return level;
    },
    // The hull taking the strain: a low groan that tightens toward the last blow.
    groan(at, dur) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(.0001, at);
      g.gain.exponentialRampToValueAtTime(.22, at + dur * .85);
      g.gain.setTargetAtTime(.0001, at + dur, .25);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.Q.value = 5;
      lp.frequency.setValueAtTime(90, at); lp.frequency.exponentialRampToValueAtTime(260, at + dur);
      const wobble = ctx.createOscillator(), depth = ctx.createGain();
      wobble.frequency.value = .37; depth.gain.value = 28; wobble.connect(depth).connect(lp.frequency);
      wobble.start(at); wobble.stop(at + dur + 2);
      for (const [f, v] of [[41.2, .6], [41.75, .5], [61.8, .18]]) {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, at); o.frequency.linearRampToValueAtTime(f * 1.06, at + dur);
        og.gain.value = v;
        o.connect(og).connect(lp); o.start(at); o.stop(at + dur + 2);
      }
      lp.connect(g).connect(bus);
    },
    // One plate struck home: a hammer's crack, a heavy body, and a dull plate that does not ring.
    strike(at, level = .4) {
      const s = loop(hiss, at, .05), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
      bp.type = 'bandpass'; bp.Q.value = .9; bp.frequency.value = 1900 + Math.random() * 700;
      ng.gain.setValueAtTime(level * .55, at); ng.gain.exponentialRampToValueAtTime(.0001, at + .03);
      s.connect(bp).connect(ng).connect(bus);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime(128 + Math.random() * 18, at); o.frequency.exponentialRampToValueAtTime(46, at + .22);
      og.gain.setValueAtTime(0, at); og.gain.linearRampToValueAtTime(level, at + .005);
      og.gain.exponentialRampToValueAtTime(.0001, at + .45);
      o.connect(og).connect(bus); o.start(at); o.stop(at + .5);
      const p = loop(hiss, at, .4), pf = ctx.createBiquadFilter(), pg = ctx.createGain();
      pf.type = 'bandpass'; pf.Q.value = 4.5; pf.frequency.value = 300 + Math.random() * 60;
      pg.gain.setValueAtTime(level * .5, at); pg.gain.exponentialRampToValueAtTime(.0001, at + .32);
      p.connect(pf).connect(pg).connect(bus);
    },
    // Just before the last blow: the strain rising under the floor.
    rise(at, dur) {
      const s = loop(sea, at, dur), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      lp.type = 'lowpass'; lp.Q.value = 1.2;
      lp.frequency.setValueAtTime(110, at); lp.frequency.exponentialRampToValueAtTime(900, at + dur);
      g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(.5, at + dur - .03);
      g.gain.linearRampToValueAtTime(0, at + dur + .02);
      s.connect(lp).connect(g).connect(bus);
    },
    // The last plate: one deep blow, a crack, and the whole hull shuddering after it.
    boom(at) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(74, at); o.frequency.exponentialRampToValueAtTime(27, at + 1.4);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.95, at + .006);
      g.gain.exponentialRampToValueAtTime(.0001, at + 3.2);
      o.connect(g).connect(out); o.start(at); o.stop(at + 3.3);
      const c = loop(hiss, at, .35), h = ctx.createBiquadFilter(), hg = ctx.createGain();
      h.type = 'highpass'; h.frequency.value = 1700;
      hg.gain.setValueAtTime(.32, at); hg.gain.exponentialRampToValueAtTime(.0001, at + .28);
      c.connect(h).connect(hg).connect(bus);
      const r = loop(sea, at, 2.4), rf = ctx.createBiquadFilter(), rg = ctx.createGain(), trem = ctx.createGain();
      rf.type = 'lowpass'; rf.frequency.value = 420;
      rg.gain.setValueAtTime(.7, at); rg.gain.exponentialRampToValueAtTime(.0001, at + 2.2);
      const shake = ctx.createOscillator(), shakeDepth = ctx.createGain();
      shake.frequency.setValueAtTime(17, at); shake.frequency.exponentialRampToValueAtTime(6, at + 2);
      shakeDepth.gain.value = .5; trem.gain.value = .5;
      shake.connect(shakeDepth).connect(trem.gain); shake.start(at); shake.stop(at + 2.4);
      r.connect(rf).connect(trem).connect(rg).connect(bus);
    },
    // A letter of the definition struck into the page: a small hammer tap, deeper for the word itself.
    stamp(at, space = false, heavy = false) {
      const level = (space ? .07 : heavy ? .12 : .075) * (.8 + Math.random() * .4);
      const s = loop(hiss, at, .04), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.value = (heavy ? 1500 : 2600) + Math.random() * 700;
      g.gain.setValueAtTime(level, at); g.gain.exponentialRampToValueAtTime(.0001, at + .03);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime(heavy ? 150 : 200, at); o.frequency.exponentialRampToValueAtTime(heavy ? 70 : 110, at + .07);
      og.gain.setValueAtTime(level * .9, at); og.gain.exponentialRampToValueAtTime(.0001, at + (heavy ? .14 : .06));
      o.start(at); o.stop(at + .16);
      const send = ctx.createGain(); send.gain.value = heavy ? .3 : .12;
      for (const node of [s.connect(bp).connect(g), o.connect(og)]) { node.connect(out); node.connect(send); }
      send.connect(verb);
    },
    // Warm and low under the rest of the page: an open fifth on D, filtered dark.
    pad(at) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(1, at + 4);
      const level = ctx.createGain(); level.gain.value = .05;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = .6;
      for (const [f, type, v] of [[36.7, 'sine', .55], [73.4, 'sine', .4], [110, 'triangle', .16], [146.8, 'sawtooth', .025]]) {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = type; o.frequency.value = f; og.gain.value = v;
        o.connect(og).connect(lp); o.start(at);
      }
      lp.connect(g).connect(level).connect(bus);
      return level;
    },
  };
}

// The score, from `from` seconds into the intro onward; `now` is the AudioContext time.
export function scheduleIntro(e, from, now) {
  const at = s => now + Math.max(0, s - from);
  if (from < FINAL - .3) e.groan(at(from), FINAL - from);
  STRIKES.forEach((s, i) => { if (!s.final && s.t >= from) e.strike(at(s.t), .3 + .22 * i / STRIKES.length); });
  const riseFrom = Math.max(from, FINAL - .5);
  if (from < FINAL - .1) e.rise(at(riseFrom), FINAL - riseFrom);
  if (from < FINAL + .25) e.boom(at(FINAL));
  else e.strike(now + .02, .3);
}

const btn = document.querySelector('.sound');
const replay = document.querySelector('.replay');
const AC = window.AudioContext || window.webkitAudioContext;
if (btn && AC && document.documentElement.classList.contains('gl')) wire();

function wire() {
  let ctx, engine, seaLevel, padLevel, on = false, started = false;
  try { ctx = new AC({ latencyHint: 'interactive' }); } catch { return; }
  engine = createEngine(ctx);
  const hero = () => window.arkHero;
  const show = state => {
    on = state;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('.label').textContent = on ? 'Sound on' : 'Sound off';
    replay.hidden = !on;
  };

  const start = () => {
    // No score without the live hero (WebGL unavailable or reduced motion).
    if (started || ctx.state !== 'running' || !document.documentElement.classList.contains('gl')) return;
    started = true;
    const now = ctx.currentTime + .03;
    engine.out.gain.setTargetAtTime(.9, now, .08);
    const t = hero()?.time() ?? 99;
    seaLevel = engine.swell(now);
    scheduleIntro(engine, t, now);
    padLevel = engine.pad(now + Math.max(0, FINAL + .3 - t));
    show(true);
  };
  const unlock = e => {
    if (started || e.target.closest?.('.sound, .replay')) return;
    ctx.resume().then(start);
  };
  for (const type of ['pointerdown', 'keydown', 'touchend']) addEventListener(type, unlock, { capture: true, passive: true });
  // Allowed right away only where the visitor permits autoplay.
  ctx.resume().then(start).catch(() => {});

  btn.addEventListener('click', () => {
    if (!started) { ctx.resume().then(start); return; }
    if (on) { engine.out.gain.setTargetAtTime(0, ctx.currentTime, .12); show(false); }
    else { ctx.resume(); engine.out.gain.setTargetAtTime(.9, ctx.currentTime, .12); show(true); }
  });
  replay.addEventListener('click', () => {
    hero()?.restart();
    scheduleIntro(engine, 0, ctx.currentTime + .05);
  });
  addEventListener('hero:strike', () => { if (started && on) engine.strike(ctx.currentTime + .01, .5); });
  addEventListener('type:key', e => { if (started && on) engine.stamp(ctx.currentTime + .005, e.detail?.space, e.detail?.heavy); });
  addEventListener('scroll', () => {
    const s = Math.min(1, scrollY / innerHeight);
    if (seaLevel) seaLevel.gain.setTargetAtTime(.42 * (1 - .6 * s), ctx.currentTime, .3);
    if (padLevel) padLevel.gain.setTargetAtTime(.05 * (1 - .5 * s), ctx.currentTime, .3);
  }, { passive: true });
  setTimeout(() => btn.classList.add('ready'), 1200);
}
