import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MAPS, MENTORS, PORTAL, TRIALS, WORLD } from '../../src/content.ts';
import { state, setState, on, emit, inputLocked, type EventName } from '../../src/state.ts';
import {
  sim, initSim, tick, resetSim, disposeSim, npcWorld, nearNpc, ladderAt, camLeft, camCenter, setViewWidth,
  blend, walkTo, walkToX, openTalk, clearInput, displayTier, legPose
} from '../../src/game/sim.ts';

const DT = 1 / 60;
type Platform = (typeof WORLD.platforms)[number];
type Ladder = (typeof WORLD.ladders)[number];

/** Run the sim for `seconds` of game time in frames of `dt`. */
function run(seconds: number, dt = DT) {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) tick(dt);
}
/** Tick until `pred` holds (or give up after `maxSeconds`). Returns whether it held. */
function until(pred: () => boolean, maxSeconds = 30, dt = DT): boolean {
  for (let t = 0; t < maxSeconds; t += dt) {
    if (pred()) return true;
    tick(dt);
  }
  return pred();
}
function record(name: EventName): any[] {
  const list: any[] = [];
  on(name, (p) => list.push(p));
  return list;
}
const sfxNames = (list: any[]) => list.map((p) => p.name);

/** An x in `map` with open ground (no platform or ladder) for `clear` px either side. */
function openX(map: number, clear = 50): number {
  for (let x = map * WORLD.MW + clear; x < (map + 1) * WORLD.MW - clear; x += 5) {
    const blocked = WORLD.platforms.some((p) => x + clear >= p.x - 4 && x - clear <= p.x + p.w + 4) ||
      WORLD.ladders.some((l) => Math.abs(x - l.x) < clear + 20);
    if (!blocked) return x;
  }
  throw new Error('no open ground in map ' + map);
}
/** The centre of the x-range where `ladderAt` reports ladder `l`. */
function ladderX(l: Ladder): number {
  const xs: number[] = [];
  for (let x = l.x - 50; x <= l.x + 50; x += 0.5) if (ladderAt(x) === l) xs.push(x);
  return (xs[0] + xs[xs.length - 1]) / 2;
}
/** A platform with open ground below and beside it (nothing overlapping it in x). */
function lonePlatform(map: number): Platform {
  const p = WORLD.platforms.find((a) => a.map === map &&
    !WORLD.platforms.some((b) => b !== a && b.x - 30 < a.x + a.w && a.x < b.x + b.w + 30) &&
    !WORLD.ladders.some((l) => l.x > a.x - 40 && l.x < a.x + a.w + 40));
  if (!p) throw new Error('no lone platform in map ' + map);
  return p;
}
function standOn(p: Platform, x = p.x + p.w / 2) {
  Object.assign(sim, { px: x, py: p.top, vy: 0, onGround: true, climbing: false });
  tick(DT);
}
/** Walk right from the start of map 0 into map 1, dismissing the gate trial offer on the way. */
function crossFirstGate() {
  sim.right = true;
  expect(until(() => state.trial !== null || state.zone === 1)).toBe(true);
  if (state.trial !== null) setState({ trial: null });
  sim.right = true;
  expect(until(() => state.zone === 1)).toBe(true);
  sim.right = false;
}

beforeEach(() => {
  resetSim();
  initSim(0);
});
afterEach(() => {
  disposeSim();
  vi.useRealTimers();
});

describe('initSim', () => {
  it('starts at the beginning of the requested map with earlier crests already earned', () => {
    initSim(2);
    expect(Math.floor(sim.px / WORLD.MW)).toBe(2);
    expect(state.zone).toBe(2);
    expect(state.bz).toBe(2);
    expect(state.maxTier).toBe(2);
    expect(state.earnedN).toBe(2);
    expect(state.blend.t).toBe(0);
  });
  it('clamps the starting map to the world and defaults to the first map', () => {
    initSim(99);
    expect(state.zone).toBe(MAPS.length - 1);
    initSim(-5);
    expect(state.zone).toBe(0);
    initSim();
    expect(state.zone).toBe(0);
    expect(state.earnedN).toBe(0);
  });
});

describe('walking', () => {
  it('moves right and left with the keys and faces the walking direction', () => {
    sim.px = openX(0);
    const x0 = sim.px;
    sim.right = true;
    expect(tick(DT)).toBe(true);
    expect(state.px).toBeGreaterThan(x0);
    expect(state.facing).toBe(1);
    expect(state.moving).toBe(true);
    expect(state.hmove).toBe(true);
    sim.right = false;
    sim.left = true;
    const x1 = sim.px;
    run(0.2);
    expect(state.px).toBeLessThan(x1);
    expect(state.facing).toBe(-1);
  });

  it('walks with the touch halves of the screen too', () => {
    sim.px = openX(0);
    const x0 = sim.px;
    sim.padR = true;
    run(0.2);
    expect(sim.px).toBeGreaterThan(x0);
    sim.padR = false;
    sim.padL = true;
    const x1 = sim.px;
    run(0.2);
    expect(sim.px).toBeLessThan(x1);
  });

  it('holding both directions cancels out', () => {
    sim.px = openX(0);
    const x0 = sim.px;
    sim.left = true;
    sim.right = true;
    run(0.2);
    expect(sim.px).toBe(x0);
    expect(state.moving).toBe(false);
  });

  it('reports no activity when standing still', () => {
    sim.px = openX(0);
    tick(DT);
    expect(tick(DT)).toBe(false);
    expect(state.moving).toBe(false);
  });

  it('stops at the left edge of the world', () => {
    sim.left = true;
    run(3);
    const edge = sim.px;
    run(1);
    expect(sim.px).toBe(edge);
    expect(edge).toBeGreaterThanOrEqual(WORLD.WMIN);
    expect(state.facing).toBe(-1);
  });

  it('hides the controls hint for good after some real walking, but not after a single step', () => {
    sim.left = true; // walking into the edge still counts as walking
    tick(DT);
    expect(state.legendDone).toBe(false);
    expect(until(() => state.legendDone, 10)).toBe(true);
    sim.left = false;
    run(0.5);
    expect(state.legendDone).toBe(true);
  });

  it('caps a long stalled frame instead of teleporting, and ignores negative frame time', () => {
    const step = (dt: number) => {
      resetSim(); initSim(0);
      sim.px = openX(0);
      const x0 = sim.px;
      sim.right = true;
      tick(dt);
      return sim.px - x0;
    };
    const big = step(1e3), huge = step(1e6);
    expect(big).toBeGreaterThan(0);
    expect(huge).toBe(big);
    expect(big).toBeLessThan(WORLD.WALK);
    expect(step(-1)).toBe(0);
  });

  it('gives (nearly) the same result for two half frames as for one full frame', () => {
    const go = (dts: number[]) => {
      resetSim(); initSim(0);
      sim.px = openX(0);
      sim.right = true;
      sim.jumpReq = true;
      dts.forEach((d) => tick(d));
      return { px: sim.px, py: sim.py };
    };
    const full = go([0.1]), halves = go([0.05, 0.05]);
    expect(full.py).toBeGreaterThan(0);
    expect(halves.px).toBeCloseTo(full.px, 6);
    expect(Math.abs(halves.py - full.py)).toBeLessThan(2);
  });
});

describe('jumping and platforms', () => {
  it('jumps off the ground and lands back on it with a landing cue', () => {
    const jumps = record('jump'), lands = record('land'), sfx = record('sfx');
    sim.px = openX(0);
    tick(DT);
    sim.jumpReq = true;
    expect(tick(DT)).toBe(true);
    expect(state.air).toBe(true);
    expect(state.py).toBeGreaterThan(0);
    expect(jumps).toHaveLength(1);
    expect(sfxNames(sfx)).toContain('jump');
    expect(until(() => !state.air, 5)).toBe(true);
    expect(state.py).toBe(0);
    expect(lands).toHaveLength(1);
    expect(lands[0].fall).toBeGreaterThan(0);
  });

  it('cannot jump again in mid-air', () => {
    const jumps = record('jump');
    sim.px = openX(0);
    sim.jumpReq = true;
    run(0.1);
    const vy = sim.vy;
    sim.jumpReq = true;
    tick(DT);
    expect(sim.vy).toBeLessThan(vy);
    expect(sim.jumpReq).toBe(false);
    expect(jumps).toHaveLength(1);
  });

  it('never falls through the ground, however long the frame', () => {
    sim.px = openX(0);
    sim.jumpReq = true;
    tick(DT);
    for (let i = 0; i < 5; i++) {
      tick(1e6);
      expect(sim.py).toBeGreaterThanOrEqual(0);
    }
    expect(sim.py).toBe(0);
    expect(state.air).toBe(false);
  });

  it('lands on a platform when falling onto it from above, even with long frames', () => {
    const p = lonePlatform(0);
    Object.assign(sim, { px: p.x + p.w / 2, py: p.top + 60, vy: 0, onGround: false });
    for (let i = 0; i < 5; i++) tick(1e6);
    expect(state.air).toBe(false);
    expect(sim.py).toBe(p.top);
    run(0.5);
    expect(sim.py).toBe(p.top);
  });

  it('jumps up through a platform from below (one-way)', () => {
    const p = lonePlatform(0);
    Object.assign(sim, { px: p.x + p.w / 2, py: 0, vy: 0, onGround: true });
    tick(DT);
    sim.jumpReq = true;
    let maxPy = 0;
    until(() => { maxPy = Math.max(maxPy, sim.py); return sim.onGround && sim.vy === 0 && sim.py !== 0; }, 3);
    expect(maxPy).toBeGreaterThan(p.top);
    expect(sim.py).toBe(p.top);
  });

  it('lands on the higher of two overlapping platforms after a very fast fall', () => {
    const pairs = WORLD.platforms.flatMap((a) => WORLD.platforms
      .filter((b) => b.top > a.top && Math.max(a.x, b.x) < Math.min(a.x + a.w, b.x + b.w))
      .map((b) => [a, b] as const));
    expect(pairs.length).toBeGreaterThan(0);
    const [lo, hi] = pairs[0];
    initSim(hi.map);
    const x = (Math.max(lo.x, hi.x) + Math.min(lo.x + lo.w, hi.x + hi.w)) / 2;
    Object.assign(sim, { px: x, py: hi.top + 1, vy: -1e6, onGround: false });
    tick(DT);
    expect(sim.py).toBe(hi.top);
    expect(sim.onGround).toBe(true);
  });

  it('drops through a platform when pressing down', () => {
    const p = lonePlatform(0);
    standOn(p);
    expect(sim.py).toBe(p.top);
    sim.down = true;
    sim.dropReq = true;
    tick(DT);
    expect(state.air).toBe(true);
    expect(until(() => !state.air, 5)).toBe(true);
    expect(sim.py).toBeLessThan(p.top);
  });

  it('does not drop from the ground or while a dialogue is open', () => {
    sim.px = openX(0);
    sim.dropReq = true;
    tick(DT);
    expect(state.air).toBe(false);
    const p = lonePlatform(0);
    standOn(p);
    setState({ talk: 0 });
    sim.dropReq = true;
    run(0.3);
    expect(sim.py).toBe(p.top);
  });

  it('falls to the ground when walking off a platform edge', () => {
    const p = lonePlatform(0);
    standOn(p);
    sim.right = true;
    expect(until(() => state.air, 3)).toBe(true);
    sim.right = false;
    expect(until(() => !state.air, 3)).toBe(true);
    expect(sim.py).toBe(0);
  });

  it('pressing down as you step off a ledge still just falls to the ground below', () => {
    const p = lonePlatform(0);
    standOn(p, p.x + p.w + 3.9);
    sim.right = true;
    sim.dropReq = true;
    tick(DT);
    sim.right = false;
    expect(until(() => !state.air, 3)).toBe(true);
    expect(sim.py).toBe(0);
  });
});

describe('ladders', () => {
  const L = WORLD.ladders[0];
  beforeEach(() => {
    initSim(L.map);
    sim.px = ladderX(L);
    tick(DT);
  });

  it('climbs up with up held, alternating climb sounds, and steps off at the top', () => {
    const sfx = record('sfx');
    sim.up = true;
    tick(DT);
    expect(state.climb).toBe(true);
    expect(state.climbMoving).toBe(true);
    expect(sim.py).toBeGreaterThan(0);
    expect(until(() => !state.climb, 5)).toBe(true);
    expect(sim.py).toBe(L.top);
    expect(state.air).toBe(false);
    const climbs = sfx.filter((p) => p.name === 'climb').map((p) => p.a);
    expect(climbs.length).toBeGreaterThanOrEqual(2);
    climbs.slice(1).forEach((a, i) => expect(a).not.toBe(climbs[i]));
    run(0.3); // still holding up at the top: stays put
    expect(sim.py).toBe(L.top);
  });

  it('climbs back down from the top with down held and steps off at the bottom', () => {
    sim.up = true;
    until(() => !state.climb && sim.py === L.top, 5);
    sim.up = false;
    sim.down = true;
    tick(DT);
    expect(state.climb).toBe(true);
    expect(sim.py).toBeLessThan(L.top);
    expect(until(() => !state.climb, 5)).toBe(true);
    expect(sim.py).toBe(0);
  });

  it('stays on the ladder without moving when no key (or both up and down) is held', () => {
    sim.up = true;
    run(0.2);
    sim.up = false;
    const y = sim.py;
    expect(tick(DT)).toBe(false);
    expect(state.climb).toBe(true);
    expect(sim.py).toBe(y);
    sim.up = true;
    sim.down = true;
    run(0.2);
    expect(sim.py).toBe(y);
    expect(state.climbMoving).toBe(false);
  });

  it('does not grab the ladder without pressing up, nor away from a ladder', () => {
    run(0.3);
    expect(state.climb).toBe(false);
    sim.px = openX(L.map, 20);
    sim.up = true;
    run(0.5);
    expect(state.climb).toBe(false);
    expect(sim.py).toBe(0);
  });

  it('stepping sideways off a ladder lets go, and it cannot be re-grabbed instantly', () => {
    sim.up = true;
    until(() => sim.py > L.top / 2, 5);
    sim.right = true;
    tick(DT);
    sim.right = false;
    expect(state.climb).toBe(false);
    tick(DT);
    expect(state.climb).toBe(false); // up is still held, but there's a short cooldown
    expect(until(() => state.climb, 3)).toBe(true); // after the cooldown it grabs again
  });

  it('can jump off a ladder', () => {
    const jumps = record('jump');
    sim.up = true;
    run(0.2);
    sim.up = false;
    sim.jumpReq = true;
    tick(DT);
    expect(state.climb).toBe(false);
    expect(sim.vy).toBeGreaterThan(0);
    expect(jumps).toHaveLength(1);
  });
});

describe('gate trials', () => {
  it('offers the gate trial once on the way to the first gate, before advancing', () => {
    const offers = record('trialOffer');
    sim.right = true;
    expect(until(() => state.trial !== null)).toBe(true);
    expect(offers).toEqual([{ kind: 'hex', gate: true }]);
    expect(state.trial).toMatchObject({ kind: 'hex', gate: true, phase: 'prompt' });
    expect(sim.px).toBeLessThan(TRIALS.hex.gateX);
    expect(sim.right).toBe(false); // the offer drops held input
    sim.right = true;
    const x = sim.px;
    run(0.2);
    expect(sim.px).toBe(x); // a trial overlay freezes the world
    setState({ trial: null });
    sim.right = true;
    expect(until(() => state.zone === 1)).toBe(true);
    expect(offers).toHaveLength(1);
  });

  it('does not offer a gate trial for a gate already passed', () => {
    const offers = record('trialOffer');
    initSim(1);
    sim.left = true;
    expect(until(() => sim.px < TRIALS.hex.gateX - WORLD.MW / 2)).toBe(true);
    expect(offers).toHaveLength(0);
    expect(state.trial).toBeNull();
  });
});

describe('the sealed gate', () => {
  beforeEach(() => initSim(MAPS.length - 1));

  it('is a wall that offers Keep Leveling once per contact and re-arms after backing off', () => {
    const offers = record('trialOffer'), sealed = record('sealed'), logs = record('log');
    sim.right = true;
    expect(until(() => state.trial !== null, 10)).toBe(true);
    expect(sim.px).toBe(WORLD.LOCKX);
    expect(offers).toEqual([{ kind: 'stk', gate: false }]);
    expect(sealed).toHaveLength(1);
    expect(logs.length).toBeGreaterThan(0);

    setState({ trial: null });
    sim.right = true;
    run(1);
    expect(sim.px).toBe(WORLD.LOCKX);
    expect(offers).toHaveLength(1);
    expect(sealed).toHaveLength(1);

    sim.right = false;
    sim.left = true;
    expect(until(() => sim.px < WORLD.LOCKX - WORLD.MW / 4)).toBe(true);
    sim.left = false;
    sim.right = true;
    expect(until(() => state.trial !== null, 10)).toBe(true);
    expect(offers).toHaveLength(2);
    expect(sealed).toHaveLength(2);
    expect(offers[1].kind).toBe('stk');
  });

  it('stops a walk-to target beyond the gate at the gate', () => {
    walkToX(WORLD.WMAX);
    expect(until(() => state.trial !== null, 10)).toBe(true);
    expect(sim.px).toBe(WORLD.LOCKX);
    expect(sim.target).toBeNull();
  });
});

describe('advancing to a new map', () => {
  it('emits advance once, pauses movement, then plays the reward card → fly → done and earns one crest', () => {
    vi.useFakeTimers();
    const adv = record('advance'), rewards = record('reward');
    const before = state.earnedN;
    crossFirstGate();
    expect(adv).toEqual([{ tier: 1 }]);
    expect(state.maxTier).toBe(1);
    expect(state.paused).toBe(true);
    expect(inputLocked()).toBe(true);
    expect(rewards).toHaveLength(0);

    vi.runAllTimers();
    expect(rewards.map((r) => r.phase)).toEqual(['card', 'fly', 'done']);
    expect(rewards.every((r) => r.idx === adv[0].tier - 1 && r.bonus === 0)).toBe(true);
    expect(state.earnedN).toBe(before + 1);
    expect(state.profileAlert).toBe(true);

    run(3);
    vi.runAllTimers();
    expect(adv).toHaveLength(1);
    expect(rewards).toHaveLength(3);
    expect(state.earnedN).toBe(before + 1);
  });

  it('freezes input during the advancement, then hands control back', () => {
    crossFirstGate();
    const x = sim.px;
    sim.right = true;
    expect(tick(DT)).toBe(true);
    run(0.3);
    expect(sim.px).toBe(x);
    expect(until(() => !state.paused, 5)).toBe(true);
    sim.right = true;
    run(0.2);
    expect(sim.px).toBeGreaterThan(x);
  });

  it('shows the previous outfit until the advancement peak, then the new one', () => {
    vi.useFakeTimers();
    crossFirstGate();
    expect(displayTier()).toBe(state.zone - 1);
    expect(state.near).toBe(-1);
    vi.advanceTimersToNextTimer();
    expect(displayTier()).toBe(state.zone);
    vi.runAllTimers();
    expect(sim.adv).toBeNull();
    expect(displayTier()).toBe(state.zone);
  });

  it('does not flag the profile button when the crest arrives with the profile open', () => {
    vi.useFakeTimers();
    crossFirstGate();
    setState({ profileOpen: true });
    vi.runAllTimers();
    expect(state.earnedN).toBe(1);
    expect(state.profileAlert).toBe(false);
  });

  it('attaches the bonus from the finished gate trial to that crest only once', () => {
    vi.useFakeTimers();
    const rewards = record('reward');
    emit('trialDone', { kind: 'hex', gate: true, bonus: 7 });
    crossFirstGate();
    vi.runAllTimers();
    expect(rewards.map((r) => r.bonus)).toEqual([7, 7, 7]);
    // the next gate's crest starts without it
    rewards.length = 0;
    until(() => !state.paused, 5);
    sim.right = true;
    until(() => state.trial !== null || state.zone === 2);
    setState({ trial: null });
    sim.right = true;
    expect(until(() => state.zone === 2)).toBe(true);
    vi.runAllTimers();
    expect(rewards.map((r) => r.bonus)).toEqual([0, 0, 0]);
  });

  it.each([
    ['another gate', { kind: 'lan', gate: true, bonus: 7 }],
    ['a non-gate run', { kind: 'hex', gate: false, bonus: 7 }],
    ['Keep Leveling', { kind: 'stk', gate: true, bonus: 7 }],
    ['an unknown trial', { kind: 'nope', gate: true, bonus: 7 }],
    ['a gate trial without a bonus', { kind: 'hex', gate: true }],
  ])('gives no bonus for a trial result from %s', (_name, payload) => {
    vi.useFakeTimers();
    const rewards = record('reward');
    emit('trialDone', payload);
    crossFirstGate();
    vi.runAllTimers();
    expect(rewards.map((r) => r.bonus)).toEqual([0, 0, 0]);
  });

  it('re-entering a map already reached announces the map but advances nothing', () => {
    const adv = record('advance'), maps = record('enterMap'), offers = record('trialOffer');
    initSim(1);
    sim.left = true;
    expect(until(() => state.zone === 0 && state.bz === 0)).toBe(true);
    sim.left = false;
    sim.right = true;
    expect(until(() => state.zone === 1 && state.bz === 1)).toBe(true);
    expect(maps).toEqual([{ map: 0 }, { map: 1 }]);
    expect(adv).toHaveLength(0);
    expect(offers).toHaveLength(0);
    expect(state.paused).toBe(false);
    expect(state.maxTier).toBe(1);
  });

  it('disposeSim cancels the pending reward', () => {
    vi.useFakeTimers();
    const rewards = record('reward');
    crossFirstGate();
    disposeSim();
    vi.runAllTimers();
    expect(rewards).toHaveLength(0);
    expect(state.earnedN).toBe(0);
  });
});

describe('background blend', () => {
  it('is fully the current map in the middle of each map', () => {
    MAPS.forEach((_m, k) => {
      expect(blend(k * WORLD.MW + WORLD.MW / 2)).toEqual({ cur: k, nxt: -1, t: 0 });
    });
  });

  it('mixes in the neighbouring map near each gate', () => {
    WORLD.GATES.forEach((g, k) => {
      const before = blend(g - 1), after = blend(g + 1);
      expect(before).toMatchObject({ cur: k, nxt: k + 1 });
      expect(after).toMatchObject({ cur: k + 1, nxt: k });
      for (const b of [before, after]) {
        expect(b.t).toBeGreaterThan(0);
        expect(b.t).toBeLessThan(1);
      }
    });
  });

  it('crossfades continuously and monotonically across each gate', () => {
    const weightOf = (map: number, b: { cur: number; nxt: number; t: number }) =>
      (b.cur === map ? 1 - b.t : 0) + (b.nxt === map ? b.t : 0);
    WORLD.GATES.forEach((g, k) => {
      let prev = weightOf(k + 1, blend(g - WORLD.MW / 2));
      expect(prev).toBe(0);
      for (let x = g - WORLD.MW / 2 + 1; x <= g + WORLD.MW / 2; x++) {
        const w = weightOf(k + 1, blend(x));
        expect(w).toBeGreaterThanOrEqual(prev - 1e-9);
        expect(w - prev).toBeLessThan(0.05);
        prev = w;
      }
      expect(prev).toBe(1);
    });
  });

  it('clamps outside the world to the first and last maps', () => {
    expect(blend(-WORLD.MW).cur).toBe(0);
    expect(blend(WORLD.MW * (MAPS.length + 2)).cur).toBe(MAPS.length - 1);
  });
});

describe('camera', () => {
  const W = 1280;
  it('follows the player at a fixed screen position mid-world', () => {
    const a = WORLD.MW * 1.5, b = WORLD.MW * 2;
    expect(a + camLeft(a, W)).toBeCloseTo(b + camLeft(b, W));
    expect(a + camLeft(a, W)).toBeLessThan(W / 2);
  });

  it('stops following at both ends of the world and never shows past the right end', () => {
    expect(camLeft(WORLD.WMIN, W)).toBe(camLeft(WORLD.WMIN - 500, W));
    expect(camLeft(WORLD.WMAX, W)).toBe(camLeft(WORLD.WMAX + 500, W));
    for (let px = WORLD.WMIN; px <= WORLD.WMAX; px += 50) {
      expect(WORLD.WMAX + camLeft(px, W)).toBeGreaterThanOrEqual(W);
    }
  });

  it('uses the width reported by the scene, else the window width', () => {
    const px = WORLD.MW * 1.5;
    expect(camLeft(px)).toBe(camLeft(px, window.innerWidth));
    setViewWidth(W);
    expect(camLeft(px)).toBe(camLeft(px, W));
    expect(camCenter(px)).toBeCloseTo(W / 2 - camLeft(px, W));
  });

  it('keeps the camera centre ahead of the player even when no width is known', () => {
    const iw = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 0 });
    try {
      const px = WORLD.MW * 1.5;
      expect(Number.isFinite(camLeft(px))).toBe(true);
      expect(camCenter(px)).toBeGreaterThan(px);
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: iw });
    }
  });
});

describe('mentors, portal and ladders lookup', () => {
  it('places each mentor in their own map and the portal where content says', () => {
    MENTORS.forEach((m, i) => {
      const w = npcWorld(i);
      expect(Math.floor(w.x / WORLD.MW)).toBe(i);
      expect(w.h).toBe(m.h);
    });
    expect(npcWorld(4)).toEqual({ x: PORTAL.x, h: 0 });
  });

  it('finds the mentor or portal next to a position, and nobody far away or far below', () => {
    for (let i = 0; i < 5; i++) {
      const w = npcWorld(i);
      expect(nearNpc(w.x, w.h)).toBe(i);
      expect(nearNpc(w.x, w.h + 1000)).toBe(-1);
    }
    expect(nearNpc((npcWorld(0).x + npcWorld(1).x) / 2, 0)).toBe(-1);
  });

  it('finds each ladder only in a narrow band around it', () => {
    WORLD.ladders.forEach((l) => {
      const xs: number[] = [];
      for (let x = l.x - 100; x <= l.x + 100; x++) if (ladderAt(x) === l) xs.push(x);
      expect(xs.length).toBeGreaterThan(0);
      expect(xs[xs.length - 1] - xs[0]).toBeLessThan(60);
      expect(xs.length).toBe(xs[xs.length - 1] - xs[0] + 1); // contiguous
    });
    expect(ladderAt(openX(0))).toBeNull();
  });

  it('reports the nearby mentor in state while walking past', () => {
    sim.px = npcWorld(0).x;
    tick(DT);
    expect(state.near).toBe(0);
    sim.px = openX(0);
    tick(DT);
    expect(state.near).toBe(-1);
  });
});

describe('talking and walking to targets', () => {
  it('openTalk opens the dialogue, stops movement and blocks input', () => {
    const talks = record('talk'), sfx = record('sfx');
    sim.up = true;
    sim.target = 500;
    openTalk(2);
    expect(state.talk).toBe(2);
    expect(talks).toEqual([{ i: 2 }]);
    expect(sfxNames(sfx)).toContain('talk');
    expect(sim.up).toBe(false);
    expect(sim.target).toBeNull();
    const x = sim.px, y = sim.py;
    sim.right = true;
    sim.jumpReq = true;
    run(0.3);
    expect(sim.px).toBe(x);
    expect(sim.py).toBe(y);
    expect(state.near).toBe(-1);
  });

  it('walkTo walks to a mentor and opens the dialogue on arrival, facing them', () => {
    const talks = record('talk');
    walkTo(0, true);
    expect(state.talk).toBeNull();
    expect(until(() => state.talk !== null, 10)).toBe(true);
    expect(talks).toEqual([{ i: 0 }]);
    expect(nearNpc(sim.px, sim.py)).toBe(0);
    expect(state.facing).toBe(1);
    expect(sim.target).toBeNull();
  });

  it('walkTo talks straight away when already next to that mentor', () => {
    sim.px = npcWorld(0).x;
    walkTo(0, true);
    expect(state.talk).toBe(0);
  });

  it('walkTo without talking just walks there', () => {
    walkTo(0, false);
    expect(until(() => sim.target === null, 10)).toBe(true);
    expect(state.talk).toBeNull();
    expect(nearNpc(sim.px, sim.py)).toBe(0);
  });

  it('walkToX walks left or right to an exact x', () => {
    initSim(1);
    const x0 = sim.px;
    walkToX(x0 - 100);
    expect(until(() => sim.target === null, 5)).toBe(true);
    expect(sim.px).toBe(x0 - 100);
    walkToX(x0 + 50);
    expect(until(() => sim.target === null, 5)).toBe(true);
    expect(sim.px).toBe(x0 + 50);
  });

  it('player input cancels a walk-to', () => {
    const talks = record('talk');
    walkTo(0, true);
    tick(DT);
    sim.left = true;
    tick(DT);
    expect(sim.target).toBeNull();
    sim.left = false;
    run(3);
    expect(talks).toHaveLength(0);
  });

  it('responds to walkTo events from other modules', () => {
    initSim(1);
    const x0 = sim.px;
    emit('walkTo', { x: x0 + 40 });
    expect(until(() => sim.target === null, 5)).toBe(true);
    expect(sim.px).toBe(x0 + 40);

    emit('walkTo', {});
    expect(sim.target).toBeNull();

    emit('walkTo', { i: 1, talk: true });
    expect(until(() => state.talk !== null, 10)).toBe(true);
    expect(state.talk).toBe(1);
  });

  it('clearInput drops all held input and any walk-to', () => {
    Object.assign(sim, { left: true, right: true, up: true, down: true, padL: true, padR: true, jumpReq: true, dropReq: true, target: 5, pendingTalk: 1 });
    clearInput();
    expect(sim).toMatchObject({ left: false, right: false, up: false, down: false, padL: false, padR: false, jumpReq: false, dropReq: false, target: null, pendingTalk: null });
  });
});

describe('legPose', () => {
  it('uses a rest pose standing, cycling walk frames, a distinct jump pose and alternating climb poses', () => {
    sim.px = openX(0);
    tick(DT);
    const rest = legPose();

    const walk = new Set<number>();
    sim.right = true;
    for (let i = 0; i < 60; i++) { tick(DT); walk.add(legPose()); }
    sim.right = false;
    expect(walk.size).toBeGreaterThan(1);
    expect(walk.has(rest)).toBe(false);

    sim.jumpReq = true;
    tick(DT);
    const air = legPose();
    expect(air).not.toBe(rest);
    expect(walk.has(air)).toBe(false);
    until(() => !state.air, 5);
    expect(legPose()).toBe(rest);

    const L = WORLD.ladders[0];
    initSim(L.map);
    sim.px = ladderX(L);
    tick(DT);
    sim.up = true;
    const climb = new Set<number>();
    for (let i = 0; i < 30; i++) { tick(DT); if (state.climb) climb.add(legPose()); }
    expect(climb.size).toBe(2);
    expect(climb.has(rest)).toBe(false);
    expect(climb.has(air)).toBe(false);
    sim.up = false;
    tick(DT);
    expect(state.climb).toBe(true);
    expect(legPose()).toBe(rest);
  });
});

describe('displayTier', () => {
  it('is the current map when no advancement is playing', () => {
    initSim(2);
    tick(DT);
    expect(displayTier()).toBe(2);
  });
});
