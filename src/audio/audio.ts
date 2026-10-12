// Sound: music + SFX synthesized live with Web Audio (port of the mockup's audio section, ~1029 / ~1405 / ~1695).
// The AudioContext is only created inside a user gesture (audioEnsure). One toggle (toggleSound / M key) flips music + sfx together.

import { state, setState, on, emit } from '../state.ts';
import { MAPS } from '../content.ts';
import { songs, type Song } from './songs.ts';

interface Loop { song: Song; g: GainNode; step: number; next: number; zero: number }
interface AU {
  ctx: AudioContext; master: GainNode; lp: BiquadFilterNode; musicBus: GainNode; sfxBus: GainNode; duck: GainNode;
  noise: AudioBuffer; pw: PeriodicWave | null; loops: Record<string, Loop>; timer: ReturnType<typeof setTimeout> | null;
  duckLvl: number; fanfareUntil: number; wk: string; unlocked?: boolean;
}

let au: AU | null = null;
let musOn = false;
let sfxOn = false;
let soundToasted = false;
let silentEl: HTMLAudioElement | null = null;
let hiddenSuspended = false;

const setPlayback = () => {
  // iOS: let Web Audio play even when the ring/silent switch is on (Safari 16.4+).
  try { const n = navigator as any; if (typeof navigator !== 'undefined' && n.audioSession) n.audioSession.type = 'playback'; } catch (err) { /* ignore */ }
};

// Create (first call) or resume the AudioContext. Only called from user-gesture handlers. Returns null when Web Audio is unavailable.
function audioEnsure(): AU | null {
  if (au) { audioWake(); return au; }
  const w = window as any;
  const AC = typeof AudioContext !== 'undefined' ? AudioContext : (w.webkitAudioContext || null);
  if (!AC) return null;
  setPlayback();
  let c: AudioContext;
  try { c = new AC(); } catch (err) { return null; }
  try {
    const master = c.createGain(); master.gain.value = 0.5; master.connect(c.destination);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000; lp.Q.value = 0.5; lp.connect(master);
    const musicBus = c.createGain(); musicBus.gain.value = 0; musicBus.connect(lp);
    const sfxBus = c.createGain(); sfxBus.gain.value = 0; sfxBus.connect(lp);
    const duck = c.createGain(); duck.gain.value = 1; duck.connect(musicBus);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    au = { ctx: c, master, lp, musicBus, sfxBus, duck, noise: nb, pw: null, loops: {}, timer: null, duckLvl: 1, fanfareUntil: 0, wk: '' };
  } catch (err) {
    try { c.close(); } catch (e2) { /* ignore */ }
    return null;
  }
  audioWake();
  return au;
}

function audioWake(): void {
  const A = au;
  if (!A) return;
  setPlayback();
  // iOS/Android can leave the context 'suspended' or 'interrupted'; resume inside the gesture.
  if (A.ctx.state !== 'running') {
    try { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* ignore */ }
  }
  // iOS silent switch fallback: a looping silent <audio> element moves the page's audio session to "playback".
  silentKeepAlive(true);
  // iOS only truly unlocks audio once a source node is started during a user gesture: play one silent sample.
  if (!A.unlocked) {
    try {
      const b = A.ctx.createBuffer(1, 1, A.ctx.sampleRate);
      const src = A.ctx.createBufferSource();
      src.buffer = b; src.connect(A.ctx.destination); src.start(0);
      A.unlocked = true;
    } catch (err) { /* ignore */ }
  }
}

// Start (inside a gesture) or stop the silent keep-alive <audio> element. The WAV is generated in memory (0.5s of silence).
function silentKeepAlive(on: boolean): void {
  try {
    if (!on) { if (silentEl) silentEl.pause(); return; }
    if (typeof Audio === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') return;
    if (!silentEl) {
      const n = 4000, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
      const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
      w(36, 'data'); v.setUint32(40, n, true);
      for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
      const el = new Audio();
      el.src = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
      el.loop = true;
      el.setAttribute('playsinline', '');
      el.setAttribute('x-webkit-airplay', 'deny');
      silentEl = el;
    }
    const p = silentEl.play();
    if (p && p.catch) p.catch(() => {});
  } catch (err) { /* ignore */ }
}

// Every keydown / pointer gesture: resume a suspended context (ignores the sound button itself, marked data-snd).
function audioGesture(e: Event): void {
  const tg = e && (e.target as any);
  if (tg && tg.closest && tg.closest('[data-snd]')) return;
  if (musOn || sfxOn) audioWake();
}

/** The one sound toggle (button + M key): flips music and sfx together. Call from a gesture handler. */
export function toggleSound(): void {
  const both = musOn && sfxOn;
  setSoundFlags(!both, !both);
}

// The single place that changes the MUSIC / SFX switches. Must run inside a gesture handler when turning anything on.
export function setSoundFlags(music: boolean, sfx: boolean): void {
  if ((music || sfx) && !audioEnsure()) {
    musOn = false; sfxOn = false;
    setState({ musicOn: false, sfxOn: false, soundNA: true });
    return;
  }
  const musicWasOff = !musOn;
  musOn = !!music;
  sfxOn = !!sfx;
  setState({ musicOn: musOn, sfxOn: sfxOn, soundNA: false });
  if (musOn && musicWasOff && !soundToasted) {
    soundToasted = true;
    const mi = state.bz;
    emit('log', { text: mi === 0 ? '♪ Now playing: Academy Grounds' : '♪ Now playing: ' + mapName(mi) });
  }
  audioApply();
}

function mapName(i: number): string {
  const c = { maps: MAPS as any };
  const m = c.maps && c.maps[i];
  return (m && m.name) || ['Academy Grounds', 'Azure Citadel', 'Crimson Grove', 'Obsidian Spire'][i];
}

function audioApply(): void {
  const A = au;
  if (!A) return;
  const c = A.ctx;
  if (!musOn && !sfxOn) {
    musicStop();
    silentKeepAlive(false);
    try { const p = c.suspend(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* ignore */ }
    return;
  }
  audioWake();
  A.musicBus.gain.setTargetAtTime(musOn ? 0.35 : 0, c.currentTime, 0.04);
  A.sfxBus.gain.setTargetAtTime(sfxOn ? 0.6 : 0, c.currentTime, 0.04);
  if (musOn) {
    A.wk = '';
    musicSync();
    if (A.timer === null) musicSched();
  } else {
    musicStop();
  }
}

function musicStop(): void {
  const A = au;
  if (!A) return;
  if (A.timer !== null) { clearTimeout(A.timer); A.timer = null; }
  Object.keys(A.loops).forEach((k) => loopStop(k));
}

function loopStart(i: number): void {
  const A = au!, c = A.ctx;
  const g = c.createGain();
  g.gain.value = 0;
  g.connect(A.duck);
  A.loops[i] = { song: songs()[i], g, step: 0, next: c.currentTime + 0.06, zero: 0 };
}

function loopStop(k: string | number): void {
  const A = au;
  const L = A && A.loops[k];
  if (!L) return;
  try { L.g.disconnect(); } catch (err) { /* ignore */ }
  delete A!.loops[k];
}

// Per-map weights from the gate blend (state.blend, same value that crossfades the scenery): cur gets 1 - t, the neighbour t.
function musicWeights(): number[] {
  const w = [0, 0, 0, 0];
  const bl = state.blend;
  const cur = Math.max(0, Math.min(3, bl ? bl.cur : state.bz));
  if (bl && bl.nxt !== bl.cur && bl.t > 0 && bl.nxt >= 0 && bl.nxt <= 3) { w[cur] = 1 - bl.t; w[bl.nxt] = bl.t; } else w[cur] = 1;
  return w;
}

// Start an incoming loop as soon as it has weight; drive every loop's gain equal-power; mark loops at zero so musicSched can stop them.
function musicSync(): void {
  const A = au;
  if (!A || !musOn) return;
  const c = A.ctx, w = musicWeights();
  const key = w.map((x) => x.toFixed(3)).join(',');
  if (key === A.wk) return;
  A.wk = key;
  for (let i = 0; i < 4; i++) {
    if (w[i] > 0.002 && !A.loops[i]) loopStart(i);
    const L = A.loops[i];
    if (!L) continue;
    L.g.gain.setTargetAtTime(Math.sin(Math.min(1, w[i]) * Math.PI / 2) * L.song.gain, c.currentTime, 0.05);
    L.zero = w[i] > 0.002 ? 0 : (L.zero || c.currentTime);
  }
}

// Music ducks to 25% while any trial window is open, and to 20% during the JOB ADVANCED fanfare.
function duckSync(): void {
  const A = au!, c = A.ctx;
  const lvl = c.currentTime < A.fanfareUntil ? 0.2 : (state.trial !== null ? 0.25 : 1);
  if (lvl !== A.duckLvl) {
    A.duckLvl = lvl;
    A.duck.gain.setTargetAtTime(lvl, c.currentTime, 0.12);
  }
}

// Look-ahead scheduler: every ~25ms schedule whatever falls in the next ~120ms against ctx.currentTime.
function musicSched(): void {
  const A = au;
  if (!A) return;
  if (!musOn) { A.timer = null; return; }
  const c = A.ctx;
  if (c.state === 'running') {
    const now = c.currentTime;
    musicSync();
    duckSync();
    Object.keys(A.loops).forEach((k) => {
      const L = A.loops[k];
      if (L.zero > 0 && now - L.zero > 0.5) { loopStop(k); return; }
      const sd = 60 / L.song.tempo / 4;
      if (L.next < now - 0.05) L.next = now + 0.03;
      let guard = 0;
      while (L.next < now + 0.12 && guard++ < 64) {
        const evs = L.song.at[L.step];
        for (let i = 0; i < evs.length; i++) {
          const ev = evs[i][1];
          playNote(L.g, evs[i][0], nf(ev[1]), L.next, ev[2] * sd, ev[3]);
        }
        L.step = (L.step + 1) % L.song.steps;
        L.next += sd;
      }
    });
  }
  A.timer = setTimeout(musicSched, 25);
}

// Note name ('F4', 'Bb3', 'C#5') -> frequency in Hz.
function nf(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return 440;
  const semi = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[m[1]] + (m[2] === '#' ? 1 : (m[2] === 'b' ? -1 : 0));
  return 440 * Math.pow(2, (12 * (parseInt(m[3], 10) + 1) + semi - 69) / 12);
}

  // Gain envelope on an AudioParam: attack a to peak v, decay dcy to v * sus, hold until t + d, release r. Exponential ramps with a 0.0001 floor. Returns the end time.
function adsr(p, t, d, v, a, dcy, sus, r) {
    const hold = Math.max(t + d, t + a + dcy);
    const sl = Math.max(0.0001, v * sus);
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a);
    p.exponentialRampToValueAtTime(sl, t + a + dcy);
    p.setValueAtTime(sl, hold);
    p.exponentialRampToValueAtTime(0.0001, hold + r);
    return hold + r;
}

function osc(type, f, t, end, dest, cents?) {
    const o = au!.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    if (cents) o.detune.value = cents;
    o.connect(dest);
    o.start(t);
    o.stop(end + 0.05);
    return o;
}

  // 25% pulse wave (cached PeriodicWave)
function pulseWave() {
    const A = au!;
    if (!A.pw) {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) {
        re[k] = Math.sin(2 * Math.PI * k * 0.25) / (k * Math.PI);
        im[k] = (1 - Math.cos(2 * Math.PI * k * 0.25)) / (k * Math.PI);
      }
      A.pw = A.ctx.createPeriodicWave(re, im);
    }
    return A.pw;
}

  // Filtered white-noise burst from the cached noise buffer.
function noiseTo(t, dur, ftype, f0, f1, q, dest, peak, att?) {
    const c = au!.ctx;
    const s = c.createBufferSource();
    s.buffer = au!.noise;
    const fl = c.createBiquadFilter();
    fl.type = ftype;
    fl.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    fl.Q.value = q || 0.7;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + (att || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest);
    s.start(t, Math.random() * 1.0);
    s.stop(t + dur + 0.03);
}

  // One oscillator blip with an optional pitch sweep (f1 = 0 for none) and a quick attack / exponential decay.
function tone(type, f0, f1, t, dur, peak, dest?, att?) {
    const c = au!.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + (att || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || au!.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.03);
}

  // The voices. v: lead | pulse | bass | bell | pad | kick | brush | hat. f in Hz (ignored by drums), t start, d held length in seconds, vel 0..1.
function playNote(out, v, f, t, d, vel) {
    const c = au!.ctx;
    if (v === 'lead') {
      const g = c.createGain(); g.connect(out);
      const end = adsr(g.gain, t, d, 0.7 * vel, 0.03, 0.1, 0.75, 0.15);
      const o = osc('triangle', f, t, end, g);
      const lfo = c.createOscillator(); lfo.frequency.value = 5.4;
      const lg = c.createGain();
      lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + 0.12); lg.gain.linearRampToValueAtTime(7, t + 0.5);
      lfo.connect(lg); lg.connect(o.detune);
      lfo.start(t); lfo.stop(end + 0.05);
    } else if (v === 'pulse') {
      const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 2200; fl.connect(out);
      const g = c.createGain(); g.connect(fl);
      const end = adsr(g.gain, t, d, 0.14 * vel, 0.006, 0.06, 0.45, 0.07);
      const o = c.createOscillator(); o.setPeriodicWave(pulseWave()); o.frequency.value = f;
      o.connect(g); o.start(t); o.stop(end + 0.05);
    } else if (v === 'bass') {
      const g = c.createGain(); g.connect(out);
      const end = adsr(g.gain, t, d, 0.7 * vel, 0.012, 0.08, 0.7, 0.09);
      osc('triangle', f, t, end, g);
    } else if (v === 'bell') {
      const ring = Math.min(2.4, 0.5 + d * 0.8);
      [[1, 1, 1], [2, 0.3, 0.55], [3.01, 0.14, 0.3]].forEach((p) => {
        const g = c.createGain(); g.connect(out);
        const end = t + ring * p[2];
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.5 * vel * p[1]), t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, end);
        osc('sine', f * p[0], t, end, g);
      });
    } else if (v === 'pad') {
      const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1100; fl.Q.value = 0.4;
      const g = c.createGain(); fl.connect(g); g.connect(out);
      const end = adsr(g.gain, t, d, 0.06 * vel, Math.min(2.0, d * 0.4), 0.5, 0.85, 2.4);
      osc('sawtooth', f, t, end, fl, -7);
      osc('sawtooth', f, t, end, fl, 7);
    } else if (v === 'kick') {
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.9 * vel), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.34);
    } else if (v === 'brush') {
      noiseTo(t, 0.16, 'bandpass', 1800, 1800, 0.7, out, 0.35 * vel, 0.02);
    } else if (v === 'hat') {
      noiseTo(t, 0.04, 'highpass', 7000, 7000, 0.7, out, 0.13 * vel, 0.002);
    }
}

/** Play a sound effect (mockup sfx()). Silent when SFX is off or the context is not running. */
export function sfx(name: string, a?: any, b?: any, delay?: number): void {
  const A = au;
  if (!A || !sfxOn || A.ctx.state !== 'running') return;
  const c = A.ctx, o = A.sfxBus, t = c.currentTime + 0.01 + (delay || 0);
  const note = (v: string, n: string, at: number, d: number, vel: number) => playNote(o, v, nf(n), at, d, vel);
    switch (name) {
      case 'jump': tone('square', 300, 820, t, 0.13, 0.16); break;
      case 'land': {
        const k = Math.min(1, (a || 40) / 160);
        tone('sine', 140, 55, t, 0.14, 0.22 + 0.22 * k);
        noiseTo(t, 0.07, 'lowpass', 500, 300, 0.7, o, 0.08 + 0.08 * k, 0.003);
        break;
      }
      case 'climb': tone('triangle', a ? 640 : 560, 0, t, 0.045, 0.05); break;
      case 'talk':
        tone('triangle', 620, 0, t, 0.05, 0.16);
        tone('triangle', 930, 0, t + 0.06, 0.07, 0.16);
        break;
      case 'ui':
        tone('square', a ? 380 : 560, a ? 620 : 380, t, 0.05, 0.07);
        tone('triangle', a ? 1240 : 900, 0, t, 0.03, 0.05);
        break;
      case 'advance': {
        // JOB ADVANCED: rising arpeggio, then a held major chord with bell sparkles (~2.2s); music ducks to 20% meanwhile
        A.fanfareUntil = c.currentTime + 2.4;
        ['C4', 'E4', 'G4', 'C5', 'E5', 'G5'].forEach((n, i) => note('lead', n, t + i * 0.085, 0.16, 0.7));
        const ct = t + 0.6;
        ['C5', 'E5', 'G5', 'C6'].forEach((n) => note('lead', n, ct, 1.3, 0.5));
        note('bass', 'C3', ct, 1.3, 0.8);
        ['G6', 'E6', 'C7', 'G6', 'E7'].forEach((n, i) => note('bell', n, ct + 0.1 + i * 0.17, 0.2, 0.35));
        break;
      }
      case 'quest': ['E5', 'G5', 'C6'].forEach((n, i) => note('bell', n, t + i * 0.14, 0.3, 0.8)); break;
      case 'whoosh': noiseTo(t, 0.75, 'bandpass', 300, 3800, 1.2, o, 0.3, 0.25); break;
      case 'ding':
        note('bell', 'C6', t, 0.5, 0.9);
        note('bell', 'G6', t + 0.02, 0.4, 0.5);
        break;
      case 'catch': {
        // Five-Star Rush star: two-note blip, pitch climbs one semitone per combo up to an octave
        const f = 523.25 * Math.pow(2, Math.min(12, Math.max(0, (a || 1) - 1)) / 12);
        tone('triangle', f, 0, t, 0.07, 0.2);
        tone('triangle', f * 1.5, 0, t + 0.06, 0.1, 0.2);
        break;
      }
      case 'feat': ['E6', 'G6', 'C7'].forEach((n, i) => note('bell', n, t + i * 0.07, 0.15, 0.6)); break;
      case 'peb':
        noiseTo(t, 0.16, 'lowpass', 380, 180, 0.8, o, 0.35, 0.004);
        tone('square', 260, 90, t, 0.18, 0.1);
        break;
      case 'beep': tone('square', 440, 0, t, 0.12, 0.14); break;
      case 'go':
        tone('square', 880, 0, t, 0.32, 0.15);
        tone('triangle', 1760, 0, t, 0.32, 0.08);
        break;
      case 'lpluck': note('bell', ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'][(a || 0) % 6], t, 0.25, 0.55); break;
      case 'lmatch':
        note('bell', 'G5', t, 0.25, 0.7);
        note('bell', 'C6', t + 0.1, 0.35, 0.7);
        break;
      case 'lmiss':
        tone('sine', 392, 0, t, 0.18, 0.15);
        tone('sine', 294, 0, t + 0.14, 0.26, 0.15);
        break;
      case 'lwin':
        ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => note('lead', n, t + i * 0.09, 0.14, 0.6));
        note('bell', 'E6', t + 0.36, 0.5, 0.7);
        break;
      case 'htick': tone('triangle', 900 + Math.random() * 350, 0, t, 0.035, 0.16, o, 0.002); break;
      case 'hlit': {
        // Hex Lock: a = tiles newly lit, b = tiles lit before; each steps one note up a pentatonic ladder
        const P = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
        for (let i = 0; i < Math.min(a || 1, 4); i++) tone('sine', 330 * Math.pow(2, P[Math.min(12, (b || 0) + i)] / 12), 0, t + 0.04 + i * 0.07, 0.18, 0.2);
        break;
      }
      case 'hseal':
        tone('sine', 280, 1100, t, 0.5, 0.2, o, 0.03);
        ['C5', 'E5', 'G5'].forEach((n) => note('lead', n, t + 0.5, 0.7, 0.6));
        note('bell', 'C6', t + 0.52, 0.5, 0.8);
        note('bell', 'G6', t + 0.66, 0.4, 0.6);
        break;
      case 'hout':
        tone('sine', 520, 140, t, 0.7, 0.2, o, 0.02);
        noiseTo(t, 0.5, 'lowpass', 900, 200, 0.6, o, 0.06, 0.05);
        break;
      case 'sdrop':
        tone('sine', 170, 62, t, 0.14, 0.4);
        noiseTo(t, 0.08, 'lowpass', 600, 300, 0.7, o, 0.14, 0.003);
        break;
      case 'sslice': noiseTo(t, 0.09, 'bandpass', 3200, 1800, 1.4, o, 0.28, 0.004); break;
      case 'sperf': {
        // Keep Leveling perfect drop: a bright ping that rises one semitone per combo, up to an octave
        const f = 784 * Math.pow(2, Math.min(12, Math.max(0, (a || 1) - 1)) / 12);
        playNote(o, 'bell', f, t, 0.2, 0.7);
        tone('sine', f * 2, 0, t, 0.12, 0.05);
        break;
      }
      case 'sfan':
        ['C5', 'G5', 'C6', 'E6'].forEach((n, i) => note('lead', n, t + i * 0.07, 0.12, 0.6));
        note('bell', 'G6', t + 0.28, 0.5, 0.7);
        break;
      case 'sover': ['A4', 'F4', 'D4'].forEach((n, i) => tone('triangle', nf(n), 0, t + i * 0.17, 0.26, 0.22)); break;
      case 'rate': {
        // Results jingle: a = stars (1-5); n+1 notes up a pentatonic scale, the last one held with a bell
        const sc = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
        const n = Math.max(0, Math.min(5, a || 0)) + 1;
        if (!a) break;
        for (let i = 0; i < n; i++) {
          const last = i === n - 1;
          note('lead', sc[i], t + i * 0.1, last ? 0.5 : 0.1, 0.6);
          if (last) note('bell', sc[i], t + i * 0.1, 0.4, 0.7);
        }
        break;
      }
      default: break;
    }
  }

/** Wire audio to the event bus + gestures + page visibility. Call once at startup. */
export function initAudio(): void {
  on('sfx', (p) => { if (p && p.name) sfx(p.name, p.a, p.b, p.delay); });
  on('jump', () => sfx('jump'));
  on('land', (p) => sfx('land', p && p.fall));
  on('talk', () => sfx('talk'));
  on('advance', () => sfx('advance'));
  on('trialDone', (p) => { if (p && p.stars) sfx('rate', p.stars); });
  on('enterMap', () => { if (au) { au.wk = ''; musicSync(); } });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tg = e.target as any;
      if (!(tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable))) { toggleSound(); return; }
    }
    audioGesture(e);
  }, true);
  window.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') audioGesture(e); }, true);
  window.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') audioGesture(e); }, true);

  document.addEventListener('visibilitychange', () => {
    const A = au;
    if (!A) return;
    if (document.hidden) {
      if (A.ctx.state === 'running') {
        hiddenSuspended = true;
        silentKeepAlive(false);
        try { const p = A.ctx.suspend(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* ignore */ }
      }
    } else if (hiddenSuspended) {
      hiddenSuspended = false;
      if (musOn || sfxOn) {
        try { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* ignore */ }
        silentKeepAlive(true);
      }
    }
  });
}
