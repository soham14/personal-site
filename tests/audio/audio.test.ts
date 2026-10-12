import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { initAudio, resetAudio, toggleSound, setSoundFlags, sfx, musicWeights, noteFreq } from '../../src/audio/audio.ts';
import { songs } from '../../src/audio/songs.ts';
import { state, setState, emit, on } from '../../src/state.ts';
import { MAPS } from '../../src/content.ts';

// ---------------------------------------------------------------------------------------------
// A fake Web Audio implementation: records the node graph, scheduled starts and parameter
// automation, and rejects what real browsers reject (non-finite values, negative times,
// exponential ramps to <= 0), so "schedules sound without throwing" means something.
// ---------------------------------------------------------------------------------------------
type Mode = 'promise' | 'reject' | 'none' | 'throw';
interface Opts { construct: 'ok' | 'throw'; graph: 'ok' | 'throw'; close: 'ok' | 'throw'; source: 'ok' | 'throw'; disconnect: 'ok' | 'throw'; resume: Mode; suspend: Mode }
const DEFAULTS: Opts = { construct: 'ok', graph: 'ok', close: 'ok', source: 'ok', disconnect: 'ok', resume: 'promise', suspend: 'promise' };

const checkTime = (v: number, t: number) => {
  if (!Number.isFinite(v) || !Number.isFinite(t) || t < 0) throw new RangeError(`bad automation ${v} @ ${t}`);
};

class FakeParam {
  private v: number;
  events: [string, number, number][] = [];
  target: number | undefined;
  constructor(v: number) { this.v = v; }
  get value() { return this.v; }
  set value(x: number) { if (!Number.isFinite(x)) throw new TypeError('non-finite value'); this.v = x; }
  get level() { return this.target ?? this.v; }
  setValueAtTime(v: number, t: number) { checkTime(v, t); this.events.push(['set', v, t]); }
  linearRampToValueAtTime(v: number, t: number) { checkTime(v, t); this.events.push(['lin', v, t]); }
  exponentialRampToValueAtTime(v: number, t: number) { checkTime(v, t); if (v <= 0) throw new RangeError('exp ramp to ' + v); this.events.push(['exp', v, t]); }
  setTargetAtTime(v: number, t: number, k: number) { checkTime(v, t); if (!(k > 0)) throw new RangeError('time constant'); this.target = v; this.events.push(['target', v, t]); }
}

class FakeNode {
  inputs: FakeNode[] = [];
  outputs: (FakeNode | FakeParam)[] = [];
  disconnected = false;
  type = '';
  constructor(public ctx: FakeCtx) { ctx.nodes.push(this); }
  connect(d: unknown) {
    if (!(d instanceof FakeNode) && !(d instanceof FakeParam)) throw new TypeError('connect to a non-node');
    this.outputs.push(d);
    if (d instanceof FakeNode) d.inputs.push(this);
    return d;
  }
  disconnect() { if (this.ctx.opts.disconnect === 'throw') throw new Error('disconnect failed'); this.disconnected = true; }
}
class Gain extends FakeNode { gain = new FakeParam(1); }
class Biquad extends FakeNode { frequency = new FakeParam(350); Q = new FakeParam(1); }
class Source extends FakeNode {
  startAt: number | undefined;
  start(t = 0) { checkTime(0, t); this.startAt = t; this.ctx.starts.push(this); }
  stop(t = 0) { checkTime(0, t); }
}
class Osc extends Source {
  frequency = new FakeParam(440); detune = new FakeParam(0); wave: unknown;
  setPeriodicWave(w: unknown) { this.wave = w; }
  get freq() { const e = this.frequency.events.find((x) => x[0] === 'set'); return e ? e[1] : this.frequency.value; }
}
class BufSrc extends Source { buffer: unknown = null; }

class FakeCtx {
  static instances: FakeCtx[] = [];
  static opts: Opts = { ...DEFAULTS };
  opts: Opts;
  state = 'running';
  currentTime = 0;
  sampleRate = 4000;
  nodes: FakeNode[] = [];
  starts: Source[] = [];
  destination: FakeNode;
  resumes = 0; suspends = 0; waves = 0; closed = false;
  constructor() {
    if (FakeCtx.opts.construct === 'throw') throw new Error('AudioContext not allowed');
    this.opts = FakeCtx.opts;
    this.destination = new FakeNode(this);
    FakeCtx.instances.push(this);
  }
  private result(mode: Mode, next: string) {
    if (mode === 'throw') throw new Error('not allowed');
    this.state = next;
    if (mode === 'reject') return Promise.reject(new Error('denied'));
    if (mode === 'none') return undefined;
    return Promise.resolve();
  }
  resume() { this.resumes++; return this.result(this.opts.resume, 'running'); }
  suspend() { this.suspends++; return this.result(this.opts.suspend, 'suspended'); }
  close() { if (this.opts.close === 'throw') throw new Error('close failed'); this.closed = true; }
  private guard() { if (this.opts.graph === 'throw') throw new Error('graph failed'); }
  createGain() { this.guard(); return new Gain(this); }
  createBiquadFilter() { this.guard(); return new Biquad(this); }
  createOscillator() { this.guard(); return new Osc(this); }
  createBufferSource() { if (this.opts.source === 'throw') throw new Error('no sources'); return new BufSrc(this); }
  createBuffer(_ch: number, n: number) { const d = new Float32Array(n); return { length: n, getChannelData: () => d }; }
  createPeriodicWave(re: Float32Array, im: Float32Array) { this.waves++; return { re, im }; }
}

// ---- helpers ----
const ctx = () => FakeCtx.instances[FakeCtx.instances.length - 1];
/** Sources started for actual sound (excludes the silent unlock sample wired straight to the destination). */
const sounds = (c = ctx()) => (c ? c.starts.filter((n) => !n.outputs.includes(c.destination)) : []);
const unlocks = (c = ctx()) => c.starts.filter((n) => n.outputs.includes(c.destination));

/** Advance audio time (only while the context runs, like a real one) and the scheduler's timers together. */
function tick(seconds: number, step = 0.025) {
  for (let i = 0, n = Math.round(seconds / step); i < n; i++) {
    const c = ctx();
    if (c && c.state === 'running') c.currentTime += step;
    vi.advanceTimersByTime(step * 1000);
  }
}

/** Find the buses by wiring: destination <- master <- lowpass <- {music, sfx}; music <- duck <- loop channels. */
function graph(c = ctx()) {
  const gains = c.nodes.filter((n): n is Gain => n instanceof Gain);
  const master = gains.find((g) => g.outputs.includes(c.destination))!;
  const lp = c.nodes.find((n) => n instanceof Biquad && n.outputs.includes(master))!;
  const buses = gains.filter((g) => g.outputs.includes(lp));
  const duck = gains.find((g) => buses.includes(g.outputs[0] as Gain) && g.inputs.some((i) => i instanceof Gain));
  const music = duck ? (duck.outputs[0] as Gain) : undefined;
  const loops = duck ? (duck.inputs as Gain[]) : [];
  return { buses, duck, music, sfx: buses.find((b) => b !== music), loops };
}

/** Nodes created while fn runs. */
function created<T>(fn: () => T, c = ctx()) {
  const n = c.nodes.length;
  fn();
  return c.nodes.slice(n);
}
const oscs = (nodes: FakeNode[]) => nodes.filter((n): n is Osc => n instanceof Osc);

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

function key(code: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) {
  target.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, ...init }));
}
function pointer(type: 'pointerdown' | 'pointerup', pointerType: string, target: EventTarget = document.body) {
  const e = new Event(type, { bubbles: true });
  Object.defineProperty(e, 'pointerType', { value: pointerType });
  target.dispatchEvent(e);
}
function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

let dispose: () => void;
let play: ReturnType<typeof vi.spyOn>;
let pause: ReturnType<typeof vi.spyOn>;
const origObjectURL = URL.createObjectURL;

beforeEach(() => {
  vi.useFakeTimers();
  FakeCtx.instances = [];
  FakeCtx.opts = { ...DEFAULTS };
  vi.stubGlobal('AudioContext', FakeCtx);
  vi.stubGlobal('Audio', function FakeAudio() { return document.createElement('audio'); });
  URL.createObjectURL = vi.fn(() => 'blob:silence');
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  resetAudio();
  dispose = initAudio();
});

afterEach(() => {
  dispose();
  resetAudio();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  URL.createObjectURL = origObjectURL;
  delete (window as any).webkitAudioContext;
  delete (document as any).hidden;
  delete (navigator as any).audioSession;
});

// ---------------------------------------------------------------------------------------------

describe('noteFreq', () => {
  it('tunes A4 to 440 Hz and doubles per octave', () => {
    expect(noteFreq('A4')).toBeCloseTo(440);
    expect(noteFreq('A5')).toBeCloseTo(880);
    expect(noteFreq('A3')).toBeCloseTo(220);
    expect(noteFreq('C5') / noteFreq('C4')).toBeCloseTo(2);
    expect(noteFreq('C0') / noteFreq('C-1')).toBeCloseTo(2);
  });
  it('a sharp is one semitone up and equals the flat of the next note', () => {
    expect(noteFreq('C#4') / noteFreq('C4')).toBeCloseTo(Math.pow(2, 1 / 12));
    expect(noteFreq('C#4')).toBeCloseTo(noteFreq('Db4'));
    expect(noteFreq('Bb3')).toBeCloseTo(noteFreq('A#3'));
  });
  it('rises with every note of the scale', () => {
    const f = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'].map(noteFreq);
    for (let i = 1; i < f.length; i++) expect(f[i]).toBeGreaterThan(f[i - 1]);
  });
  it('returns a usable frequency for unparseable names', () => {
    ['', 'H2', 'C', 'A44'].forEach((n) => { expect(Number.isFinite(noteFreq(n))).toBe(true); expect(noteFreq(n)).toBeGreaterThan(0); });
  });
});

describe('musicWeights', () => {
  const blend = (cur: number, nxt: number, t: number) => { setState({ blend: { cur, nxt, t } }); return musicWeights(); };
  const sum = (w: number[]) => w.reduce((a, b) => a + b, 0);

  it('has one weight per map', () => {
    expect(musicWeights()).toHaveLength(MAPS.length);
  });

  it('puts all weight on the current map away from gates', () => {
    MAPS.forEach((_, i) => {
      const w = blend(i, i, 0);
      expect(w[i]).toBe(1);
      expect(sum(w)).toBe(1);
    });
  });

  it('crossfades between the current map and its neighbour following blend.t', () => {
    let prev = -1;
    [0.1, 0.25, 0.5, 0.75, 0.9].forEach((t) => {
      const w = blend(1, 2, t);
      expect(w[1]).toBeCloseTo(1 - t);
      expect(w[2]).toBeCloseTo(t);
      expect(w[0] + w[3]).toBe(0);
      expect(sum(w)).toBeCloseTo(1);
      expect(w[2]).toBeGreaterThan(prev);
      prev = w[2];
    });
  });

  it('ignores the neighbour when t is 0 or the neighbour is not a map', () => {
    expect(blend(2, 3, 0)[2]).toBe(1);
    expect(blend(2, -1, 0.5)[2]).toBe(1);
    expect(blend(2, MAPS.length, 0.5)[2]).toBe(1);
  });

  it('clamps the current map into range and falls back to bz without a blend', () => {
    expect(blend(99, 99, 0)[MAPS.length - 1]).toBe(1);
    expect(blend(-5, -5, 0)[0]).toBe(1);
    setState({ blend: null as any, bz: 2 });
    expect(musicWeights()[2]).toBe(1);
  });

  it('always sums to 1', () => {
    for (let cur = 0; cur < MAPS.length; cur++) for (let nxt = -1; nxt <= MAPS.length; nxt++) for (const t of [0, 0.3, 1]) {
      expect(sum(blend(cur, nxt, t))).toBeCloseTo(1);
    }
  });
});

describe('sound switches', () => {
  it('toggleSound turns music and sfx on together, then both off', () => {
    toggleSound();
    expect([state.musicOn, state.sfxOn, state.soundNA]).toEqual([true, true, false]);
    expect(FakeCtx.instances).toHaveLength(1);
    const g = graph();
    expect(g.buses).toHaveLength(2);
    g.buses.forEach((b) => expect(b.gain.level).toBeGreaterThan(0));
    toggleSound();
    expect([state.musicOn, state.sfxOn]).toEqual([false, false]);
    expect(ctx().state).toBe('suspended');
    expect(graph().loops.every((l) => l.disconnected)).toBe(true);
  });

  it('toggleSound turns both on when only one of them was on', () => {
    setSoundFlags(true, false);
    toggleSound();
    expect([state.musicOn, state.sfxOn]).toEqual([true, true]);
    setSoundFlags(false, true);
    toggleSound();
    expect([state.musicOn, state.sfxOn]).toEqual([true, true]);
  });

  it('music only: songs play, effects are silent', () => {
    setSoundFlags(true, false);
    expect([state.musicOn, state.sfxOn]).toEqual([true, false]);
    const g = graph();
    expect(g.music!.gain.level).toBeGreaterThan(0);
    expect(g.sfx!.gain.level).toBe(0);
    tick(1);
    expect(sounds().length).toBeGreaterThan(0);
    const n = sounds().length;
    sfx('jump');
    expect(sounds().length).toBe(n);
  });

  it('effects only: effects play, no music is scheduled', () => {
    setSoundFlags(false, true);
    expect([state.musicOn, state.sfxOn]).toEqual([false, true]);
    tick(1);
    expect(sounds()).toHaveLength(0);
    const levels = graph().buses.map((b) => b.gain.level).sort();
    expect(levels[0]).toBe(0);
    expect(levels[1]).toBeGreaterThan(0);
    sfx('jump');
    expect(sounds().length).toBeGreaterThan(0);
  });

  it('turning music off while effects stay on stops the songs', () => {
    setSoundFlags(true, true);
    tick(0.5);
    setSoundFlags(false, true);
    expect(graph().loops.every((l) => l.disconnected)).toBe(true);
    const n = sounds().length;
    tick(1);
    expect(sounds().length).toBe(n);
  });

  it('switching everything off before audio exists creates no AudioContext', () => {
    setSoundFlags(false, false);
    expect(FakeCtx.instances).toHaveLength(0);
    expect([state.musicOn, state.sfxOn, state.soundNA]).toEqual([false, false, false]);
  });

  it('turning sound back on reuses and resumes the same AudioContext', () => {
    toggleSound(); toggleSound();
    const c = ctx(), r = c.resumes;
    toggleSound();
    expect(FakeCtx.instances).toHaveLength(1);
    expect(c.resumes).toBeGreaterThan(r);
    expect(c.state).toBe('running');
  });

  it('setting the same flags twice keeps a single music scheduler running', () => {
    setSoundFlags(true, true);
    tick(0.3);
    setSoundFlags(true, true);
    const n = sounds().length;
    tick(2);
    const once = sounds().length - n;
    resetAudio(); FakeCtx.instances = [];
    setSoundFlags(true, true);
    tick(0.3);
    const m = sounds().length;
    tick(2);
    expect(sounds().length - m).toBe(once);
  });

  it("announces the current map's song once, the first time music starts", () => {
    const log = vi.fn();
    on('log', log);
    setState({ bz: 2, blend: { cur: 2, nxt: 2, t: 0 } });
    setSoundFlags(false, true);
    expect(log).not.toHaveBeenCalled();
    toggleSound();
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0].text).toContain(MAPS[2].name);
    toggleSound(); toggleSound();
    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe('when Web Audio is unavailable', () => {
  it('marks sound as not available and keeps both switches off', () => {
    vi.stubGlobal('AudioContext', undefined);
    toggleSound();
    expect([state.musicOn, state.sfxOn, state.soundNA]).toEqual([false, false, true]);
    expect(() => sfx('jump')).not.toThrow();
  });

  it('uses the prefixed webkitAudioContext when that is all there is', () => {
    vi.stubGlobal('AudioContext', undefined);
    (window as any).webkitAudioContext = FakeCtx;
    vi.stubGlobal('webkitAudioContext', FakeCtx);
    toggleSound();
    expect([state.musicOn, state.sfxOn, state.soundNA]).toEqual([true, true, false]);
  });

  it('marks sound as not available when the context cannot be created', () => {
    FakeCtx.opts.construct = 'throw';
    toggleSound();
    expect(state.soundNA).toBe(true);
    expect(state.musicOn).toBe(false);
  });

  it('closes a half-built context when building the graph fails (even if closing fails too)', () => {
    FakeCtx.opts.graph = 'throw';
    toggleSound();
    expect(state.soundNA).toBe(true);
    expect(ctx().closed).toBe(true);
    FakeCtx.opts = { ...DEFAULTS, graph: 'throw', close: 'throw' };
    expect(() => toggleSound()).not.toThrow();
    expect(state.soundNA).toBe(true);
  });

  it('a later attempt can still succeed and clears the not-available flag', () => {
    FakeCtx.opts.construct = 'throw';
    toggleSound();
    expect(state.soundNA).toBe(true);
    FakeCtx.opts = { ...DEFAULTS };
    toggleSound();
    expect([state.musicOn, state.sfxOn, state.soundNA]).toEqual([true, true, false]);
  });
});

describe('waking audio from gestures', () => {
  it('creates no AudioContext from gestures before sound is turned on', () => {
    pointer('pointerdown', 'mouse');
    pointer('pointerup', 'touch');
    key('KeyA');
    expect(FakeCtx.instances).toHaveLength(0);
  });

  it('plays one silent unlock sample on the first enable only', () => {
    toggleSound();
    expect(unlocks()).toHaveLength(1);
    toggleSound(); toggleSound();
    pointer('pointerdown', 'mouse');
    expect(unlocks()).toHaveLength(1);
  });

  it('retries the unlock sample on the next gesture if it failed', () => {
    FakeCtx.opts.source = 'throw';
    setSoundFlags(false, true);
    expect(state.sfxOn).toBe(true);
    FakeCtx.opts.source = 'ok';
    expect(unlocks()).toHaveLength(0);
    pointer('pointerdown', 'mouse');
    expect(unlocks()).toHaveLength(1);
  });

  it('a mouse pointerdown resumes a context the system suspended', () => {
    toggleSound();
    const c = ctx();
    c.state = 'suspended';
    pointer('pointerdown', 'mouse');
    expect(c.state).toBe('running');
  });

  it('touch wakes on pointerup (not pointerdown); mouse pointerup does nothing', () => {
    toggleSound();
    const c = ctx();
    c.state = 'suspended';
    pointer('pointerdown', 'touch');
    pointer('pointerup', 'mouse');
    expect(c.state).toBe('suspended');
    pointer('pointerup', 'touch');
    expect(c.state).toBe('running');
  });

  it('other keys wake audio too, including keys sent to the window itself', () => {
    toggleSound();
    const c = ctx();
    c.state = 'suspended';
    key('KeyA');
    expect(c.state).toBe('running');
    c.state = 'suspended';
    key('Space', {}, window);
    expect(c.state).toBe('running');
  });

  it('leaves gestures on the sound button to the button itself', () => {
    document.body.innerHTML = '<button data-snd><span id="ic">♪</span></button>';
    toggleSound();
    const c = ctx();
    c.state = 'suspended';
    pointer('pointerdown', 'mouse', document.getElementById('ic')!);
    expect(c.state).toBe('suspended');
  });

  it('does not wake audio while sound is off', () => {
    toggleSound(); toggleSound();
    const c = ctx(), r = c.resumes;
    pointer('pointerdown', 'mouse');
    key('KeyA');
    expect(c.resumes).toBe(r);
    expect(c.state).toBe('suspended');
  });

  it('keeps a silent looping media element playing while sound is on (created once) and pauses it when off', () => {
    toggleSound();
    expect(play).toHaveBeenCalled();
    pointer('pointerdown', 'mouse');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    toggleSound();
    expect(pause).toHaveBeenCalled();
  });

  it('works without media-element support, or when the keep-alive element fails', () => {
    vi.stubGlobal('Audio', undefined);
    toggleSound();
    expect(play).not.toHaveBeenCalled();
    toggleSound();
    expect(pause).not.toHaveBeenCalled();
    vi.stubGlobal('Audio', function FakeAudio() { return document.createElement('audio'); });
    URL.createObjectURL = vi.fn(() => { throw new Error('no blobs'); });
    toggleSound();
    expect(state.musicOn).toBe(true);
  });

  it('asks iOS for a playback audio session where supported, and survives when it refuses', () => {
    Object.defineProperty(navigator, 'audioSession', { configurable: true, value: { type: 'auto' } });
    toggleSound();
    expect((navigator as any).audioSession.type).toBe('playback');
    toggleSound();
    Object.defineProperty(navigator, 'audioSession', { configurable: true, get: () => { throw new Error('nope'); } });
    toggleSound();
    expect(state.musicOn).toBe(true);
  });

  it.each(['reject', 'none', 'throw'] as Mode[])('tolerates resume/suspend/play that %s', async (mode) => {
    FakeCtx.opts.resume = mode; FakeCtx.opts.suspend = mode;
    play.mockImplementation((() => {
      if (mode === 'throw') throw new Error('play blocked');
      return mode === 'reject' ? Promise.reject(new Error('blocked')) : undefined;
    }) as any);
    toggleSound();
    const c = ctx();
    setHidden(true);
    setHidden(false);
    c.state = 'suspended';
    pointer('pointerdown', 'mouse');
    toggleSound();
    await flush();
    expect(state.musicOn).toBe(false);
  });
});

describe('M key', () => {
  it('toggles sound exactly once per press', () => {
    key('KeyM');
    expect([state.musicOn, state.sfxOn]).toEqual([true, true]);
    key('KeyM');
    expect([state.musicOn, state.sfxOn]).toEqual([false, false]);
    expect(FakeCtx.instances).toHaveLength(1);
  });

  it('ignores auto-repeat and modifier combinations', () => {
    key('KeyM', { repeat: true });
    key('KeyM', { ctrlKey: true });
    key('KeyM', { metaKey: true });
    key('KeyM', { altKey: true });
    expect(state.musicOn).toBe(false);
  });

  it('is ignored while typing in a text field', () => {
    document.body.innerHTML = '<input id="i"><textarea id="t"></textarea><div id="e"></div>';
    const ed = document.getElementById('e')!;
    Object.defineProperty(ed, 'isContentEditable', { value: true });
    key('KeyM', {}, document.getElementById('i')!);
    key('KeyM', {}, document.getElementById('t')!);
    key('KeyM', {}, ed);
    expect(state.musicOn).toBe(false);
    expect(FakeCtx.instances).toHaveLength(0);
  });

  it('other keys do not toggle', () => {
    key('KeyN');
    expect(state.musicOn).toBe(false);
  });

  it('stops listening once disposed', () => {
    dispose();
    key('KeyM');
    expect(state.musicOn).toBe(false);
    dispose = initAudio();
  });
});

describe('music', () => {
  const at = (cur: number, nxt = cur, t = 0) => setState({ bz: cur, blend: { cur, nxt, t } });

  it("plays the current map's song while music is on", () => {
    at(2);
    toggleSound();
    tick(2);
    expect(sounds().length).toBeGreaterThan(0);
    expect(graph().loops).toHaveLength(1);
  });

  it('crossing a gate fades the next song in with equal power, then stops the old one', () => {
    at(0);
    toggleSound();
    tick(0.5);
    at(0, 1, 0.5);
    emit('enterMap', { map: 1 });
    const [a, b] = graph().loops;
    expect(b).toBeDefined();
    const S = songs();
    expect(a.gain.level / S[0].gain).toBeCloseTo(b.gain.level / S[1].gain);
    [0.2, 0.7].forEach((t) => {
      at(0, 1, t);
      tick(0.05);
      expect((a.gain.level / S[0].gain) ** 2 + (b.gain.level / S[1].gain) ** 2).toBeCloseTo(1);
      expect(b.gain.level / S[1].gain).toBeGreaterThan(0);
    });
    at(1);
    tick(0.1);
    expect(a.disconnected).toBe(false);
    expect(a.gain.level).toBe(0);
    tick(1);
    expect(a.disconnected).toBe(true);
    expect(b.disconnected).toBe(false);
    const n = sounds().length;
    tick(1);
    expect(sounds().length).toBeGreaterThan(n);
  });

  it('does not re-automate loop levels while the blend is unchanged', () => {
    toggleSound();
    tick(0.2);
    const loop = graph().loops[0], n = loop.gain.events.length;
    tick(1);
    emit('enterMap', { map: 0 });
    tick(0.2);
    expect(loop.gain.events.length).toBe(n + 1);
  });

  it('enterMap before audio exists, or with music off, starts no music', () => {
    expect(() => emit('enterMap', { map: 1 })).not.toThrow();
    expect(FakeCtx.instances).toHaveLength(0);
    setSoundFlags(false, true);
    at(1);
    emit('enterMap', { map: 1 });
    tick(1);
    expect(sounds()).toHaveLength(0);
  });

  it('ducks the music while a trial is open and restores it afterwards', () => {
    toggleSound();
    tick(0.1);
    const duck = graph().duck!;
    expect(duck.gain.level).toBe(1);
    setState({ trial: { kind: 'hex', phase: 'play', gate: true } });
    tick(0.05);
    const ducked = duck.gain.level;
    expect(ducked).toBeLessThan(1);
    expect(ducked).toBeGreaterThan(0);
    setState({ trial: null });
    tick(0.05);
    expect(duck.gain.level).toBe(1);
  });

  it('the advancement fanfare ducks the music at least as deep as a trial, then it recovers', () => {
    toggleSound();
    tick(0.1);
    const duck = graph().duck!;
    setState({ trial: { kind: 'hex', phase: 'result', gate: true } });
    tick(0.05);
    const trialLvl = duck.gain.level;
    sfx('advance');
    tick(0.05);
    expect(duck.gain.level).toBeLessThanOrEqual(trialLvl);
    setState({ trial: null });
    tick(5);
    expect(duck.gain.level).toBe(1);
  });

  it('after a stall the scheduler skips ahead instead of playing a burst of past notes', () => {
    toggleSound();
    tick(0.5);
    const c = ctx();
    c.currentTime += 5;
    const n = sounds().length;
    tick(0.5);
    const late = sounds().slice(n);
    expect(late.length).toBeGreaterThan(0);
    late.forEach((s) => expect(s.startAt!).toBeGreaterThanOrEqual(c.currentTime - 0.5));
  });

  it("plays every map's song through a full loop with valid automation, building the pulse wave once", () => {
    toggleSound();
    const S = songs();
    S.forEach((song, i) => {
      at(i);
      emit('enterMap', { map: i });
      const n = sounds().length;
      tick(song.steps * 60 / song.tempo / 4 + 0.5);
      expect(sounds().length).toBeGreaterThan(n);
    });
    expect(ctx().waves).toBe(1);
  }, 30000);
});

describe('page visibility', () => {
  it('hiding the tab suspends running audio; showing it resumes', () => {
    toggleSound();
    tick(0.5);
    const c = ctx();
    setHidden(true);
    expect(c.state).toBe('suspended');
    expect(pause).toHaveBeenCalled();
    const n = sounds().length;
    tick(1);
    expect(sounds().length).toBe(n);
    setHidden(false);
    expect(c.state).toBe('running');
    tick(1);
    expect(sounds().length).toBeGreaterThan(n);
  });

  it('showing the tab again does not resume twice', () => {
    toggleSound();
    const c = ctx();
    setHidden(true);
    setHidden(false);
    const r = c.resumes;
    setHidden(false);
    expect(c.resumes).toBe(r);
  });

  it('leaves audio alone when sound is already off', () => {
    toggleSound(); toggleSound();
    const c = ctx(), s = c.suspends, r = c.resumes;
    setHidden(true);
    setHidden(false);
    expect([c.suspends, c.resumes]).toEqual([s, r]);
  });

  it('turning sound off while hidden keeps it off when the tab returns', () => {
    toggleSound();
    const c = ctx();
    setHidden(true);
    toggleSound();
    const r = c.resumes;
    setHidden(false);
    expect(c.resumes).toBe(r);
    expect(c.state).toBe('suspended');
  });

  it('ignores visibility changes before audio exists', () => {
    setHidden(true);
    setHidden(false);
    expect(FakeCtx.instances).toHaveLength(0);
  });

  it('tolerates a loop channel that fails to disconnect', () => {
    FakeCtx.opts.disconnect = 'throw';
    toggleSound();
    tick(0.3);
    expect(() => toggleSound()).not.toThrow();
    const n = sounds().length;
    tick(1);
    expect(sounds().length).toBe(n);
  });
});

describe('sfx', () => {
  const SRC = readFileSync(new URL('../../src/audio/audio.ts', import.meta.url), 'utf8');
  const body = SRC.slice(SRC.indexOf('export function sfx('), SRC.indexOf('export function resetAudio('));
  const NAMES = [...body.matchAll(/case '(\w+)'/g)].map((m) => m[1]);
  const fxOn = () => setSoundFlags(false, true);

  it('finds the effect names in the source', () => {
    expect(NAMES.length).toBeGreaterThan(10);
  });

  it.each(NAMES)('%s schedules sound at or after now, with any arguments', (name) => {
    fxOn();
    const c = ctx();
    c.currentTime = 3;
    const n = sounds().length;
    sfx(name, 3, 2);
    const fresh = sounds().slice(n);
    expect(fresh.length).toBeGreaterThan(0);
    fresh.forEach((s) => expect(s.startAt!).toBeGreaterThanOrEqual(c.currentTime));
    expect(() => { sfx(name); sfx(name, 0, 0); sfx(name, 1, 20, 0.5); sfx(name, 99, 99); }).not.toThrow();
  });

  it('an unknown effect name is harmless and silent', () => {
    fxOn();
    expect(() => sfx('no-such-sound', 1, 2)).not.toThrow();
    expect(sounds()).toHaveLength(0);
  });

  it('is silent before audio exists, with effects off, and while the context is not running', () => {
    expect(() => sfx('jump')).not.toThrow();
    expect(FakeCtx.instances).toHaveLength(0);
    setSoundFlags(true, false);
    expect(created(() => sfx('jump'))).toHaveLength(0);
    setSoundFlags(false, true);
    ctx().state = 'suspended';
    expect(created(() => sfx('jump'))).toHaveLength(0);
  });

  it('delay postpones the effect', () => {
    fxOn();
    const a = oscs(created(() => sfx('beep')))[0], b = oscs(created(() => sfx('beep', 0, 0, 0.5)))[0];
    expect(b.startAt! - a.startAt!).toBeCloseTo(0.5);
  });

  it('the results jingle plays more notes for more stars (capped) and nothing for zero stars', () => {
    fxOn();
    const count = (stars?: number) => oscs(created(() => sfx('rate', stars))).length;
    expect(count(0)).toBe(0);
    expect(count()).toBe(0);
    expect(count(1)).toBeGreaterThan(0);
    expect(count(3)).toBeGreaterThan(count(1));
    expect(count(5)).toBeGreaterThan(count(3));
    expect(count(9)).toBe(count(5));
  });

  it('the star-catch blip climbs with the combo and caps at an octave', () => {
    fxOn();
    const f = (combo?: number) => oscs(created(() => sfx('catch', combo)))[0].freq;
    expect(f(5)).toBeGreaterThan(f(1));
    expect(f(13)).toBeGreaterThan(f(5));
    expect(f(30)).toBeCloseTo(f(13));
    expect(f(13) / f(1)).toBeCloseTo(2);
    expect(f()).toBeCloseTo(f(1));
    expect(f(-4)).toBeCloseTo(f(1));
  });

  it('the perfect-drop ping also climbs with the combo', () => {
    fxOn();
    const f = (combo?: number) => oscs(created(() => sfx('sperf', combo)))[0].frequency.value;
    expect(f(4)).toBeGreaterThan(f(1));
    expect(f(40)).toBeCloseTo(f(13));
  });

  it('harder landings are louder, up to a cap', () => {
    fxOn();
    const peak = (fall?: number) => Math.max(...created(() => sfx('land', fall))
      .filter((n): n is Gain => n instanceof Gain)
      .flatMap((g) => g.gain.events.filter((e) => e[0] === 'exp').map((e) => e[1])));
    expect(peak(160)).toBeGreaterThan(peak(40));
    expect(peak(400)).toBeCloseTo(peak(160));
    expect(peak()).toBeLessThan(peak(160));
  });

  it('Hex Lock lights play one rising tone per newly lit tile (capped)', () => {
    fxOn();
    const tones = (a?: number, b?: number) => oscs(created(() => sfx('hlit', a, b)));
    expect(tones(3).length).toBeGreaterThan(tones(1).length);
    expect(tones(10).length).toBe(tones(4).length);
    expect(tones().length).toBe(tones(1).length);
    expect(tones(1, 5)[0].freq).toBeGreaterThan(tones(1, 0)[0].freq);
    const ladder = tones(3, 0).map((o) => o.freq);
    for (let i = 1; i < ladder.length; i++) expect(ladder[i]).toBeGreaterThan(ladder[i - 1]);
  });

  it('ladder steps alternate between two pitches and UI clicks differ for open/close', () => {
    fxOn();
    const first = (name: string, a?: number) => oscs(created(() => sfx(name, a)))[0].freq;
    expect(first('climb', 1)).not.toBe(first('climb', 0));
    expect(first('ui', 1)).not.toBe(first('ui', 0));
  });

  it('the Lantern Match pluck cycles through its scale', () => {
    fxOn();
    const f = (i?: number) => oscs(created(() => sfx('lpluck', i)))[0].frequency.value;
    expect(f(1)).toBeGreaterThan(f(0));
    expect(f()).toBe(f(0));
    const seen = new Set<number>();
    for (let i = 0; i < 24; i++) seen.add(f(i));
    expect(seen.size).toBeGreaterThan(1);
    expect(seen.size).toBeLessThan(24);
  });
});

describe('event bus wiring', () => {
  const plays = (fn: () => void) => { const n = sounds().length; fn(); return sounds().length - n; };

  it('game events trigger their sounds', () => {
    setSoundFlags(false, true);
    expect(plays(() => emit('jump'))).toBeGreaterThan(0);
    expect(plays(() => emit('land', { fall: 120 }))).toBeGreaterThan(0);
    expect(plays(() => emit('land'))).toBeGreaterThan(0);
    expect(plays(() => emit('talk', { i: 0 }))).toBeGreaterThan(0);
    expect(plays(() => emit('advance', { tier: 1 }))).toBeGreaterThan(0);
    expect(plays(() => emit('trialDone', { kind: 'hex', score: 1, stars: 3, gate: true }))).toBeGreaterThan(0);
    expect(plays(() => emit('sfx', { name: 'ding' }))).toBeGreaterThan(0);
    expect(plays(() => emit('sfx', { name: 'beep', delay: 0.2 }))).toBeGreaterThan(0);
  });

  it('events without the needed details play nothing', () => {
    setSoundFlags(false, true);
    expect(plays(() => emit('trialDone', { kind: 'hex', score: 0, stars: 0 }))).toBe(0);
    expect(plays(() => emit('trialDone', null))).toBe(0);
    expect(plays(() => emit('sfx', {}))).toBe(0);
    expect(plays(() => emit('sfx', null))).toBe(0);
  });
});
