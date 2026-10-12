import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The four trial games are replaced by controllable fakes: these tests cover the controller (prompt -> play -> results),
// not the games themselves (see rush.test.ts / stk.test.ts and the other game tests).
const fx = vi.hoisted(() => {
  const s = { ctxs: [] as any[], games: [] as any[], withDestroy: true, withKeyUp: true, step: null as null | ((dt: number) => boolean) };
  const make = (kind: string, ctx: any) => {
    const root = document.createElement('div');
    root.dataset.fakeGame = kind;
    const g: any = { kind, root, step: vi.fn((dt: number) => (s.step ? s.step(dt) : true)), key: vi.fn() };
    if (s.withKeyUp) g.keyUp = vi.fn();
    if (s.withDestroy) g.destroy = vi.fn();
    s.ctxs.push(ctx); s.games.push(g);
    return g;
  };
  return { s, make };
});
vi.mock('../../src/trials/hex.ts', () => ({ createHex: (ctx: any) => fx.make('hex', ctx) }));
vi.mock('../../src/trials/lan.ts', () => ({ createLan: (ctx: any) => fx.make('lan', ctx) }));
vi.mock('../../src/trials/rush.ts', () => ({ createRush: (ctx: any) => fx.make('rush', ctx) }));
vi.mock('../../src/trials/stk.ts', async (importOriginal) => ({ ...(await importOriginal<any>()), createStk: (ctx: any) => fx.make('stk', ctx) }));
// Mentor portraits are pixel art drawn through Phaser textures; a blank canvas stands in.
vi.mock('../../src/render/textures.ts', () => ({
  heroCrop: () => ({ l: 0, t: 0, w: 1, h: 1 }),
  npcCanvas: () => document.createElement('canvas')
}));

import { initTrials } from '../../src/trials/index.ts';
import { stkExpBonus, EXP_BONUS_MAX, EXP_CEIL } from '../../src/trials/stk.ts';
import { TRIALS, type TrialKind } from '../../src/content.ts';
import { state, setState, emit, on, type EventName } from '../../src/state.ts';
import { expPct } from '../../src/ui/util.ts';
import type { TrialResult } from '../../src/trials/types.ts';

const KINDS = Object.keys(TRIALS) as TrialKind[];

// Animation frames are queued here and run on demand with explicit timestamps.
let frames: Map<number, FrameRequestCallback>;
function frame(ts: number) { const cbs = [...frames.values()]; frames.clear(); cbs.forEach((cb) => cb(ts)); }

// initTrials adds window listeners; remove them after each test so earlier tests' controllers stay out of the way.
const added: [string, any, any][] = [];
let root: HTMLElement;

beforeEach(() => {
  fx.s.ctxs = []; fx.s.games = []; fx.s.withDestroy = true; fx.s.withKeyUp = true; fx.s.step = null;
  frames = new Map();
  let id = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.set(++id, cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (h: number) => { frames.delete(h); });
  const orig = window.addEventListener.bind(window);
  vi.spyOn(window, 'addEventListener').mockImplementation((t: string, l: any, o?: any) => { added.push([t, l, o]); orig(t, l, o); });
  root = document.createElement('div');
  document.body.appendChild(root);
  initTrials(root);
});
afterEach(() => {
  added.splice(0).forEach(([t, l, o]) => window.removeEventListener(t, l, o));
  vi.unstubAllGlobals();
});

const overlay = () => root.firstElementChild as HTMLElement;
const isOpen = () => overlay().style.display !== 'none';
const xButton = () => overlay().querySelector('button[aria-label]') as HTMLButtonElement;
/** The window's action buttons in order (prompt: start, dismiss; results: continue, retry). */
const actions = () => [...overlay().querySelectorAll('button')].filter((b) => !b.hasAttribute('aria-label')) as HTMLButtonElement[];
const lastGame = () => fx.s.games[fx.s.games.length - 1];
const lastCtx = () => fx.s.ctxs[fx.s.ctxs.length - 1];

function events(name: EventName) { const got: any[] = []; on(name, (p) => got.push(p)); return got; }
const press = (code: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) => {
  const e = new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
};

function result(over: Partial<TrialResult> = {}): TrialResult {
  return { won: true, score: 10, stars: 3, bonus: 1000, ...over };
}
/** Offer, start, and finish a trial with the given result. */
function playTo(kind: TrialKind, r: TrialResult, gate = false) {
  emit('trialOffer', { kind, gate, direct: true });
  lastCtx().finish(r);
}

describe('offering a trial', () => {
  it.each(KINDS)('%s: shows the prompt and records the prompt phase', (kind) => {
    setState({ talk: 1, half: 'left' });
    emit('trialOffer', { kind, gate: kind !== 'stk' });
    expect(isOpen()).toBe(true);
    expect(overlay().querySelector('[role="dialog"]')).not.toBeNull();
    expect(actions()).toHaveLength(2);
    expect(state.trial).toEqual({ kind, phase: 'prompt', gate: kind !== 'stk' });
    expect(state.talk).toBeNull();
    expect(state.half).toBeNull();
    expect(fx.s.games).toHaveLength(0);
  });

  it('Keep Leveling is never a gate trial', () => {
    emit('trialOffer', { kind: 'stk', gate: true });
    expect(state.trial!.gate).toBe(false);
  });

  it('ignores offers without a known trial', () => {
    emit('trialOffer', null);
    emit('trialOffer', { kind: 'nope' });
    expect(state.trial).toBeNull();
    expect(isOpen()).toBe(false);
  });

  it.each([
    ['the dismiss button', () => actions()[1].click()],
    ['the close X', () => xButton().click()],
    ['Escape', () => press('Escape')]
  ])('%s closes the prompt without playing', (_n, act) => {
    const done = events('trialDone');
    emit('trialOffer', { kind: 'rush', gate: true });
    act();
    expect(isOpen()).toBe(false);
    expect(state.trial).toBeNull();
    expect(fx.s.games).toHaveLength(0);
    expect(done).toHaveLength(0);
  });

  it('a held-down Escape does not close the prompt', () => {
    emit('trialOffer', { kind: 'rush' });
    press('Escape', { repeat: true });
    expect(state.trial!.phase).toBe('prompt');
  });
});

describe('playing', () => {
  it('Start begins the game: play phase, announced, with the gate flag passed to the game', () => {
    const logs = events('log');
    emit('trialOffer', { kind: 'lan', gate: true });
    actions()[0].click();
    expect(state.trial).toEqual({ kind: 'lan', phase: 'play', gate: true });
    expect(lastGame().kind).toBe('lan');
    expect(lastCtx().gate).toBe(true);
    expect(overlay().contains(lastGame().root)).toBe(true);
    expect(logs).toHaveLength(1);
  });

  it('Enter on the prompt starts, unless a button has focus or the key is held down', () => {
    emit('trialOffer', { kind: 'hex' });
    press('Enter', { repeat: true });
    const btn = actions()[1];
    press('Enter', {}, btn);
    expect(state.trial!.phase).toBe('prompt');
    press('Enter');
    expect(state.trial!.phase).toBe('play');
  });

  it('a direct offer skips the prompt', () => {
    emit('trialOffer', { kind: 'hex', gate: true, direct: true });
    expect(state.trial).toEqual({ kind: 'hex', phase: 'play', gate: true });
    expect(fx.s.games).toHaveLength(1);
  });

  it.each(KINDS)('%s starts its own game', (kind) => {
    emit('trialOffer', { kind, direct: true });
    expect(lastGame().kind).toBe(kind);
  });

  it('runs the game every frame with a bounded time step until the game says stop', () => {
    let more = true;
    fx.s.step = () => more;
    emit('trialOffer', { kind: 'rush', direct: true });
    const step = lastGame().step;
    frame(1000);
    frame(1016);
    frame(9000);
    frame(8000);
    const dts = step.mock.calls.map((c: number[]) => c[0]);
    expect(dts[0]).toBe(0);
    expect(dts[1]).toBeGreaterThan(0);
    for (const dt of dts) { expect(dt).toBeGreaterThanOrEqual(0); expect(dt).toBeLessThanOrEqual(dts[2]); }
    expect(dts[2]).toBeLessThan(1);
    expect(dts[3]).toBe(0);
    more = false;
    frame(8016);
    expect(frames.size).toBe(0);
  });

  it('stops running once the results are showing, even if the game asks for more frames', () => {
    emit('trialOffer', { kind: 'rush', direct: true });
    fx.s.step = () => { lastCtx().finish(result()); return true; };
    frame(0);
    frame(16);
    expect(lastGame().step).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    expect(state.trial!.phase).toBe('result');
  });

  it('a new offer while playing stops the running loop', () => {
    emit('trialOffer', { kind: 'rush', direct: true });
    expect(frames.size).toBe(1);
    emit('trialOffer', { kind: 'lan' });
    expect(frames.size).toBe(0);
    expect(state.trial!.phase).toBe('prompt');
  });

  it.each([
    ['the game quitting (its close X)', () => lastCtx().close()],
    ['Escape', () => press('Escape')]
  ])('quitting mid-play via %s closes without saving anything', (_n, quit) => {
    const done = events('trialDone');
    state.best.rush = 3;
    emit('trialOffer', { kind: 'rush', gate: true, direct: true });
    const game = lastGame();
    quit();
    expect(game.destroy).toHaveBeenCalled();
    expect(state.trial).toBeNull();
    expect(isOpen()).toBe(false);
    expect(state.best.rush).toBe(3);
    expect(done).toHaveLength(0);
    expect(frames.size).toBe(0);
  });

  it('games without a destroy hook can be quit too', () => {
    fx.s.withDestroy = false;
    emit('trialOffer', { kind: 'hex', direct: true });
    lastCtx().close();
    expect(state.trial).toBeNull();
  });
});

describe('keyboard routing while a trial is open', () => {
  const worldKeys = () => { const fn = vi.fn(); window.addEventListener('keydown', fn); return fn; };

  it('keeps keys from reaching the world while open, except Tab', () => {
    emit('trialOffer', { kind: 'rush' });
    const world = worldKeys();
    press('KeyX');
    expect(world).not.toHaveBeenCalled();
    press('Tab');
    expect(world).toHaveBeenCalledTimes(1);
    actions()[1].click();
    press('KeyX');
    expect(world).toHaveBeenCalledTimes(2);
  });

  it('ignores keys when no trial window is showing', () => {
    const world = worldKeys();
    setState({ trial: { kind: 'rush', phase: 'play', gate: false } });
    press('KeyX');
    expect(world).toHaveBeenCalledTimes(1);
  });

  it('passes keys to the game during play, telling it whether a button had focus', () => {
    emit('trialOffer', { kind: 'stk', direct: true });
    const btn = document.createElement('button');
    overlay().appendChild(btn);
    press('Space');
    press('Space', {}, btn);
    const calls = lastGame().key.mock.calls;
    expect(calls.map((c: any[]) => c[0].code)).toEqual(['Space', 'Space']);
    expect(calls.map((c: any[]) => c[1])).toEqual([true, false]);
  });

  it('Space on the prompt or results does not scroll the page unless a button has focus', () => {
    emit('trialOffer', { kind: 'rush' });
    expect(press('Space').defaultPrevented).toBe(true);
    expect(press('Space', {}, actions()[0]).defaultPrevented).toBe(false);
  });

  it('passes key releases to the game while playing only', () => {
    const world = vi.fn();
    window.addEventListener('keyup', world);
    emit('trialOffer', { kind: 'rush', direct: true });
    const game = lastGame();
    document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft', bubbles: true }));
    expect(game.keyUp).toHaveBeenCalledTimes(1);
    expect(world).not.toHaveBeenCalled();
    lastCtx().close();
    document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft', bubbles: true }));
    expect(game.keyUp).toHaveBeenCalledTimes(1);
    expect(world).toHaveBeenCalledTimes(1);
  });

  it('games without a key-release handler are fine', () => {
    fx.s.withKeyUp = false;
    emit('trialOffer', { kind: 'hex', direct: true });
    document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft', bubbles: true }));
    window.dispatchEvent(new Event('blur'));
    expect(state.trial!.phase).toBe('play');
  });

  it('losing window focus releases the movement keys', () => {
    window.dispatchEvent(new Event('blur')); // no game: nothing to release
    emit('trialOffer', { kind: 'rush', direct: true });
    window.dispatchEvent(new Event('blur'));
    const codes = lastGame().keyUp.mock.calls.map((c: any[]) => c[0].code).sort();
    expect(codes).toEqual(['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD']);
  });
});

describe('results', () => {
  it('finishing shows the results and reports the outcome', () => {
    const done = events('trialDone');
    playTo('lan', result({ score: 7, stars: 4, bonus: 700 }), true);
    expect(state.trial).toEqual({ kind: 'lan', phase: 'result', gate: true });
    expect(overlay().querySelector('[role="status"]')).not.toBeNull();
    expect(done).toEqual([{ kind: 'lan', score: 7, stars: 4, gate: true, bonus: 700, won: true }]);
  });

  it.each([
    ['a practice run', false, true],
    ['a lost gate trial', true, false]
  ])('%s reports no bonus', (_n, gate, won) => {
    const done = events('trialDone');
    playTo('hex', result({ won }), gate);
    expect(done[0].bonus).toBe(0);
    expect(done[0].won).toBe(won);
  });

  it('the best score only changes when beaten', () => {
    state.best.rush = 10;
    playTo('rush', result({ score: 5 }));
    expect(state.best.rush).toBe(10);
    actions()[0].click();
    playTo('rush', result({ score: 15 }));
    expect(state.best.rush).toBe(15);
    expect(overlay().textContent).toContain('15');
  });

  it.each([
    ['hex won', 'hex', result({ secs: 12, moves: 30 }), true, 0],
    ['hex lost at the gate', 'hex', result({ won: false }), true, 0],
    ['lantern won', 'lan', result({ secs: 9, moves: 14 }), true, 0],
    ['lantern lost at the gate', 'lan', result({ won: false, pairs: 3 }), true, 0],
    ['lantern lost in practice', 'lan', result({ won: false, pairs: 2 }), false, 0],
    ['rush practice in an unknown zone', 'rush', result({ score: 21, stars: 4 }), false, 99],
    ['keep leveling, capped', 'stk', { won: true, score: 12, stars: 0, bonus: 0, floors: 12, exp: 600, capped: true, title: false }, false, 0],
    ['keep leveling with no floors reported', 'stk', { won: true, score: 0, stars: 0, bonus: 0 }, false, 0]
  ] as [string, TrialKind, TrialResult, boolean, number][])('%s: shows the outcome', (_n, kind, r, gate, zone) => {
    state.zone = zone;
    playTo(kind, r, gate);
    const box = overlay().querySelector('[role="status"]')!;
    const showsStars = r.won && kind !== 'stk';
    expect(!!box.querySelector('[role="img"]')).toBe(showsStars);
    if (showsStars) expect(box.textContent).toContain(String(r.score));
    if (kind === 'stk') expect(box.textContent).toContain(String(r.floors || 0));
    expect(box.textContent).not.toContain(TRIALS[kind].title);
    expect(actions()).toHaveLength(2);
  });

  it.each([
    ['a gate trial won', true, true, 1000],
    ['a gate trial lost', true, false, 0]
  ])('Continue after %s walks the player past that gate', (_n, gate, won, bonus) => {
    const walks = events('walkTo');
    playTo('rush', result({ won, bonus: 1000 }), gate);
    actions()[0].click();
    expect(state.trial).toBeNull();
    expect(isOpen()).toBe(false);
    expect(walks).toHaveLength(1);
    expect(walks[0].kind).toBe('rush');
    expect(walks[0].bonus).toBe(bonus);
    expect(walks[0].x).toBeGreaterThan(TRIALS.rush.gateX);
  });

  it('Continue after a practice run just closes', () => {
    const walks = events('walkTo');
    playTo('hex', result(), false);
    actions()[0].click();
    expect(state.trial).toBeNull();
    expect(walks).toHaveLength(0);
  });

  it.each([
    ['the close X', () => xButton().click()],
    ['Escape', () => press('Escape')]
  ])('%s on the results continues', (_n, act) => {
    const walks = events('walkTo');
    playTo('lan', result(), true);
    act();
    expect(state.trial).toBeNull();
    expect(walks).toHaveLength(1);
  });

  it('Retry starts a fresh round quietly', () => {
    const logs = events('log');
    playTo('hex', result(), true);
    const before = logs.length;
    actions()[1].click();
    expect(fx.s.games).toHaveLength(2);
    expect(state.trial).toEqual({ kind: 'hex', phase: 'play', gate: true });
    expect(overlay().contains(lastGame().root)).toBe(true);
    expect(logs).toHaveLength(before);
    expect(frames.size).toBe(1);
  });
});

describe('titles', () => {
  it.each(['hex', 'lan', 'rush'] as TrialKind[])('%s: five stars unlocks the title once, moved to the end of the list', (kind) => {
    const title = TRIALS[kind].title;
    const unlocked = events('titleUnlocked');
    state.titles = ['Other', title, 'Another'];
    playTo(kind, result({ stars: 5 }));
    expect(state.titles).toEqual(['Other', 'Another', title]);
    expect(unlocked).toEqual([{ title }]);
    expect(overlay().textContent).toContain(title);
  });

  it('fewer than five stars unlocks nothing', () => {
    const unlocked = events('titleUnlocked');
    playTo('rush', result({ stars: 4 }));
    expect(state.titles).toEqual([]);
    expect(unlocked).toHaveLength(0);
  });

  it('Keep Leveling unlocks its title when the run earned it, not by stars', () => {
    const title = TRIALS.stk.title;
    const unlocked = events('titleUnlocked');
    playTo('stk', { won: true, score: 3, stars: 5, bonus: 0, floors: 3, title: false });
    expect(state.titles).toEqual([]);
    actions()[0].click();
    playTo('stk', { won: true, score: 30, stars: 0, bonus: 0, floors: 30, title: true });
    playTo('stk', { won: true, score: 30, stars: 0, bonus: 0, floors: 30, title: true });
    expect(state.titles).toEqual([title]);
    expect(unlocked.length).toBeGreaterThan(0);
    expect(unlocked.every((u) => u.title === title)).toBe(true);
  });
});

describe('Keep Leveling EXP', () => {
  it('banks the EXP bonus earned by the run', () => {
    state.expBonus = 3;
    playTo('stk', { won: true, score: 12, stars: 0, bonus: 0, floors: 12 });
    expect(state.expBonus).toBe(stkExpBonus(3, 12));
    expect(state.expBonus).toBeGreaterThan(3);
  });

  it('other trials leave the EXP bonus alone', () => {
    state.expBonus = 3;
    playTo('rush', result({ score: 40 }));
    expect(state.expBonus).toBe(3);
  });

  it('never pushes the bonus past its cap or the advancement EXP to 100%', () => {
    for (let i = 0; i < 10; i++) {
      playTo('stk', { won: true, score: 500, stars: 0, bonus: 0, floors: 500 });
      expect(state.expBonus).toBeLessThanOrEqual(EXP_BONUS_MAX);
      expect(expPct()).toBeLessThanOrEqual(EXP_CEIL);
    }
    expect(state.expBonus).toBe(EXP_BONUS_MAX);
  });

  it('a run without a floor count banks nothing new', () => {
    state.expBonus = 4;
    playTo('stk', { won: true, score: 0, stars: 0, bonus: 0 });
    expect(state.expBonus).toBe(4);
  });
});
