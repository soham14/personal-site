// World simulation: movement physics, ladders, one-way platforms, gates, zones, background blend,
// mentor/portal proximity, job advancement + crest reward timing, gate trial offers. Ported from the mockup's
// tickPhysics / beginAdvance / scheduleReward / camCenter / blend. Writes the snapshot into `state`.
import { MAPS, MENTORS, PORTAL, STAGES, TRIALS, WORLD, type TrialKind } from '../content.ts';
import { state, setState, emit, on } from '../state.ts';

const C = WORLD;

function freshSim() {
  return {
  px: state.px, py: state.py, vy: 0, facing: 1 as 1 | -1, onGround: true, climbing: false,
  ladder: null as null | { x: number; top: number; map: number },
  left: false, right: false, up: false, down: false, padL: false, padR: false,
  jumpReq: false, dropReq: false, dropId: -1, dropUntil: 0, noGrabUntil: 0,
  t: 0, target: null as number | null, pendingTalk: null as number | null,
  zone: 0, bz: 0, maxTier: 0, pauseUntil: 0, sealAt: 0,
  airOn: false, airMax: 0, climbAcc: 0, climbAlt: false, walkedT: 0, legendDone: false,
  offered: { hex: false, lan: false, rush: false } as Record<string, boolean>,
  /** wall-clock seconds the sim has run; also drives the walk cycle (state has no field for it) */
  wt: 0,
  /** advancement display: tier whose outfit is shown (swaps at the 650ms peak); t0 = performance.now()/1000 */
  adv: null as null | { tier: number; swapped: boolean; t0: number }
  };
}
/** Internal (non-shared) simulation state, like the mockup's this.sim. */
export const sim = freshSim();

const timers: number[] = [];
function later(fn: () => void, ms: number) { timers.push(window.setTimeout(fn, ms)); }

/** Interactables 0-3: mentors, 4: the Starlight Portal (world coordinates). */
export function npcWorld(i: number): { x: number; h: number } {
  if (i === 4) return { x: PORTAL.x, h: 0 };
  const n = MENTORS[i];
  return { x: i * C.MW + n.x, h: n.h };
}
export function nearNpc(px: number, py: number): number {
  for (let i = 0; i < 5; i++) {
    const w = npcWorld(i);
    if (Math.abs(px - w.x) < 70 && Math.abs(py - w.h) < 120) return i;
  }
  return -1;
}
export function ladderAt(px: number) {
  return C.ladders.find((l) => Math.abs(px - (l.x + 8)) <= 14) || null;
}

let viewW = 0;
/** The scene reports the stage width so the camera centre (and the blend) match the renderer. */
export function setViewWidth(w: number) { viewW = w; }
/** Track offset: the world x that lands at screen x 0 is -camLeft. Keeps the player near 40% of the width. */
export function camLeft(px: number, w = viewW || window.innerWidth || 1280): number {
  return Math.min(100, Math.max(w - C.WMAX, 0.4 * w - px));
}
export function camCenter(px: number): number {
  const w = viewW || window.innerWidth || 1280;
  return w / 2 - camLeft(px, w);
}
/** Background blend around each gate (+-240px), driven by the camera centre. t = weight of nb (0.5 at the gate). */
export function blend(cx: number): { cur: number; nxt: number; t: number } {
  const cur = Math.max(0, Math.min(3, Math.floor(cx / C.MW)));
  for (let k = 0; k < 3; k++) {
    const g = C.MW * (k + 1);
    if (cx > g - 240 && cx < g + 240) {
      const s = (cx - (g - 240)) / 480;
      const sm = s * s * (3 - 2 * s);
      return cx < g ? { cur, nxt: k + 1, t: sm } : { cur, nxt: k, t: 1 - sm };
    }
  }
  return { cur, nxt: -1, t: 0 };
}

function sfx(name: string, a?: unknown, b?: unknown) { emit('sfx', { name, a, b }); }

/** Mark the world as "in a trial" right away (the trials module owns the rest of state.trial). */
function offerTrial(kind: TrialKind) {
  clearInput();
  if (kind !== 'stk') sim.offered[kind] = true;
  const gate = kind !== 'stk';
  setState({ trial: { kind, phase: 'prompt', gate }, half: null });
  emit('trialOffer', { kind, gate });
}

let gateBonus = 0, gateBonusIdx = -1;

/** Job advancement: a ~1.6s sequence (movement paused), outfit swaps at the 650ms peak, then the crest reward. */
function beginAdvance(z: number) {
  sim.pauseUntil = sim.t + 1.6;
  const id = Date.now() + Math.random();
  advId = id;
  sim.adv = { tier: z, swapped: false, t0: performance.now() / 1000 };
  sfx('advance');
  later(() => { if (advId === id && sim.adv) sim.adv.swapped = true; }, 650);
  later(() => { if (advId === id) sim.adv = null; }, 1650);
  emit('advance', { tier: z });
  if (z >= 1 && z <= 3) scheduleReward(z - 1);
}
let advId = 0, rewardId = 0;
let sealArmed = true;

/** After the JOB ADVANCED banner: QUEST COMPLETE card (3.3s), then the crest flies to the PROFILE button. */
function scheduleReward(idx: number) {
  const id = Date.now() + Math.random();
  rewardId = id;
  const bonus = idx === gateBonusIdx ? gateBonus : 0;
  later(() => { if (rewardId === id) { sfx('quest'); emit('reward', { idx, bonus, phase: 'card' }); } }, 1700);
  later(() => { if (rewardId === id) { sfx('whoosh'); emit('reward', { idx, bonus, phase: 'fly' }); } }, 5000);
  later(() => {
    const st = STAGES[idx];
    emit('log', { text: '[System] Earned: ' + st.crest + ' (' + st.org + ')' });
    if (idx === gateBonusIdx) { gateBonus = 0; gateBonusIdx = -1; }
    sfx('ding');
    const patch: Partial<typeof state> = { earnedN: Math.max(state.earnedN, idx + 1) };
    if (!state.profileOpen) patch.profileAlert = true;
    if (rewardId === id) emit('reward', { idx, bonus, phase: 'done' });
    setState(patch);
  }, 5800);
}

export function clearInput() {
  const s = sim;
  s.left = false; s.right = false; s.up = false; s.down = false; s.padL = false; s.padR = false;
  s.jumpReq = false; s.dropReq = false; s.target = null; s.pendingTalk = null;
}

/** Open a mentor/portal dialogue (UI listens to 'talk'). */
export function openTalk(i: number) {
  sim.up = false; sim.target = null; sim.pendingTalk = null;
  sfx('talk');
  setState({ talk: i });
  emit('talk', { i });
}

/** Walk to mentor/portal i (talk on arrival), or to a world x. */
export function walkTo(i: number, talkAfter: boolean) {
  if (talkAfter && nearNpc(sim.px, sim.py) === i) { openTalk(i); return; }
  sim.target = npcWorld(i).x - 50;
  sim.pendingTalk = talkAfter ? i : null;
}
export function walkToX(x: number) { sim.target = x; sim.pendingTalk = null; sim.facing = 1; }

/** Initialise at a map (0-3). Call once before the first tick. */
export function initSim(startTier = 0) {
  const t = Math.max(0, Math.min(3, startTier));
  Object.assign(sim, { px: t * C.MW + 80, py: 0, vy: 0, onGround: true, climbing: false, zone: t, bz: t, maxTier: t });
  setState({ px: sim.px, py: 0, zone: t, bz: t, maxTier: t, earnedN: Math.min(t, 3), blend: { cur: t, nxt: -1, t: 0 } });
}

// ---- events from other modules ----
function onWalkTo(p: { i?: number; talk?: boolean; x?: number }) {
  if (typeof p.x === 'number') walkToX(p.x);
  else if (typeof p.i === 'number') walkTo(p.i, !!p.talk);
}
// A finished gate trial: remember the bonus (shown on the next quest card), and the trial's "continue" walks
// the player through the gate (trials emit walkTo {x: gateX + 20}). As a fallback, closing a gate trial result
// with no walkTo still lets normal play continue.
function onTrialDone(p: { kind: TrialKind; gate?: boolean; bonus?: number }) {
  if (p && p.gate && p.kind !== 'stk') {
    gateBonus = p.bonus || 0;
    gateBonusIdx = ({ hex: 0, lan: 1, rush: 2 } as Record<string, number>)[p.kind] ?? -1;
  }
}
// Named handlers: subscribing the same function twice is a no-op, so re-binding is safe.
function bindEvents() { on('walkTo', onWalkTo); on('trialDone', onTrialDone); }
bindEvents();

function locked(paused: boolean) {
  return state.talk !== null || state.profileOpen || state.resumeOpen || state.trial !== null || paused;
}

/** Advance the simulation by dt seconds (capped at 0.25, physics in 0.02s substeps). Returns true while anything moves. */
export function tick(dtIn: number): boolean {
  const dt = Math.min(0.25, Math.max(0, dtIn)); // generous cap so slow frames on phones don't slow the game down
  const steps = Math.max(1, Math.ceil(dt / 0.02));
  const s = sim;
  const plats = C.platforms;
  s.t += dt;
  s.wt += dt;
  const paused = s.t < s.pauseUntil;
  const lock = locked(paused);
  if (state.paused !== paused) setState({ paused });

  let dir = 0;
  if (!lock) {
    if (s.left || s.padL) dir -= 1;
    if (s.right || s.padR) dir += 1;
  }

  // Tween toward a target (minimap, Next mentor, NPC click, trial continue). Player input cancels it.
  let arrivedTalk: number | null = null;
  if (s.target !== null && !paused) {
    if (dir !== 0) { s.target = null; s.pendingTalk = null; }
    else {
      const d = s.target - s.px;
      if (Math.abs(d) <= C.WALK * dt + 0.5) {
        s.px = s.target; s.target = null;
        if (s.pendingTalk !== null) { arrivedTalk = s.pendingTalk; s.pendingTalk = null; s.facing = 1; }
      } else dir = d > 0 ? 1 : -1;
    }
  }

  const up = !lock && s.up;
  const down = !lock && s.down;

  if (s.jumpReq) {
    s.jumpReq = false;
    if (!lock && (s.onGround || s.climbing)) {
      if (s.climbing) s.noGrabUntil = s.t + 0.3;
      s.climbing = false;
      sfx('jump'); emit('jump', {});
      s.vy = C.JUMP; s.onGround = false;
    }
  }

  let moving = false;
  if (s.climbing && dir !== 0) { s.climbing = false; s.vy = 0; s.onGround = false; s.noGrabUntil = s.t + 0.3; }
  if (!s.climbing && dir !== 0) {
    // After ~1.5s of actual walking the controls hint has done its job and goes away for good
    s.walkedT += dt;
    if (!s.legendDone && s.walkedT >= 1.5) s.legendDone = true;
    s.px += dir * C.WALK * dt;
    s.facing = dir as 1 | -1;
    moving = true;
  }
  s.px = Math.max(C.WMIN + 20, Math.min(C.WMAX - 20, s.px));

  // The sealed gate is a solid wall: stop flush against it (no teleport). It only "bumps"
  // (log + trial offer) on fresh contact; walking a little way back re-arms it.
  let sealed = false;
  if (s.px >= C.LOCKX) {
    s.px = C.LOCKX; s.target = null; s.pendingTalk = null;
    if (sealArmed) { sealed = true; sealArmed = false; }
  } else if (s.px < C.LOCKX - 40) sealArmed = true;

  const lad = ladderAt(s.px);
  if (!s.climbing && lad && !lock && s.t >= s.noGrabUntil) {
    if (up && s.py > -0.5 && s.py < lad.top - 0.5) {
      s.climbing = true; s.ladder = lad; s.vy = 0; s.onGround = false; s.px = lad.x + 8;
    } else if (down && s.onGround && s.py > 0.5 && s.py <= lad.top + 0.5) {
      s.climbing = true; s.ladder = lad; s.vy = 0; s.onGround = false; s.px = lad.x + 8;
    }
  }

  let climbMoving = false;
  if (s.climbing) {
    s.vy = 0;
    if (up && !down) { s.py += C.CLIMB * dt; climbMoving = true; }
    else if (down && !up) { s.py -= C.CLIMB * dt; climbMoving = true; }
    s.airOn = false;
    if (climbMoving) {
      s.climbAcc += dt;
      if (s.climbAcc >= 0.3) { s.climbAcc = 0; s.climbAlt = !s.climbAlt; sfx('climb', s.climbAlt ? 1 : 0); }
    } else s.climbAcc = 0.2;
    const top = s.ladder!.top; // always set when climbing starts (both grab paths assign it)
    if (s.py >= top) { s.py = top; s.climbing = false; s.onGround = true; s.vy = 0; }
    else if (s.py <= 0) { s.py = 0; s.climbing = false; s.onGround = true; s.vy = 0; }
  }

  const support = () => plats.find((p) => Math.abs(s.py - p.top) < 0.6 && s.px >= p.x - 4 && s.px <= p.x + p.w + 4);
  if (s.dropReq) {
    s.dropReq = false;
    if (!lock && !s.climbing && s.onGround && s.py > 0.5) {
      const sup = support();
      s.dropId = sup ? sup.id : -1;
      s.dropUntil = s.t + 0.25;
      s.onGround = false; s.vy = 0;
    }
  }

  if (!s.climbing) {
    if (s.onGround && s.py > 0.5 && !support()) { s.onGround = false; s.vy = 0; }
    const hdt = dt / steps;
    for (let sub = 0; sub < steps && !s.onGround; sub++) {
      const prev = s.py;
      if (!s.airOn) { s.airOn = true; s.airMax = prev; }
      s.vy -= C.G * (s.vy < 0 ? 1.4 : 1) * hdt;
      s.py += s.vy * hdt;
      if (s.py > s.airMax) s.airMax = s.py;
      if (s.vy <= 0) {
        let best: (typeof plats)[number] | null = null;
        for (const p of plats) {
          if (s.t < s.dropUntil && p.id === s.dropId) continue;
          if (prev >= p.top - 0.01 && s.py <= p.top && s.px >= p.x - 4 && s.px <= p.x + p.w + 4) {
            if (!best || p.top > best.top) best = p;
          }
        }
        if (best) { s.py = best.top; s.vy = 0; s.onGround = true; }
        else if (s.py <= 0) { s.py = 0; s.vy = 0; s.onGround = true; }
      }
      if (s.onGround) {
        const fall = s.airMax - s.py;
        if (fall > 40) { sfx('land', fall); emit('land', { fall }); }
        s.airOn = false;
      }
    }
  }

  const active = dir !== 0 || paused || (!s.onGround && !s.climbing) || (s.climbing && (up || down)) ||
    s.target !== null || s.jumpReq || s.dropReq;

  const z = Math.max(0, Math.min(3, Math.floor(s.px / C.MW)));
  const bl = blend(camCenter(s.px));
  const patch: Partial<typeof state> = {
    px: s.px, py: s.py, vy: s.vy, facing: s.facing,
    moving: moving && s.onGround, hmove: moving, air: !s.onGround && !s.climbing,
    climb: s.climbing, climbMoving, zone: z, blend: bl
  };
  if (s.legendDone && !state.legendDone) patch.legendDone = true;

  // Gate trials: offered the first time the player nears each gate from the earlier map (before advancing past it)
  const offer: [TrialKind, number, number][] = [['rush', 2, 3], ['hex', 0, 1], ['lan', 1, 2]];
  for (const [kind, map, tierBelow] of offer) {
    const gx = TRIALS[kind].gateX;
    if (!s.offered[kind] && state.trial === null && s.maxTier < tierBelow && z === map && s.px >= gx - 120 && s.px < gx) {
      offerTrial(kind);
    }
  }
  if (sealed && s.t >= s.sealAt) {
    s.sealAt = s.t + 1.2;
    emit('log', { text: '[System] Sealed. Come back later.' });
    emit('sealed', {});
  }
  // The sealed gate: besides the bump, Archivist Darragh offers his endless trial (never advances anything)
  if (sealed && state.trial === null) offerTrial('stk');

  // Map banner + "Entered" log fire when the background blend passes its midpoint (measured at the camera centre)
  if (bl.cur !== s.bz) {
    s.bz = bl.cur;
    patch.bz = bl.cur;
    emit('log', { text: '[System] Entered: ' + MAPS[bl.cur].name });
    emit('enterMap', { map: bl.cur });
  }
  // The player crossing the gate itself drives the outfit, guild and job advancement
  if (z !== s.zone) {
    s.zone = z;
    if (z > s.maxTier) {
      s.maxTier = z;
      patch.maxTier = z;
      beginAdvance(z);
      emit('log', { text: '[System] Job advanced: ' + STAGES[z].jobTitle });
      patch.paused = true;
    }
  }
  patch.near = (state.talk === null && !state.profileOpen && !sim.adv && state.trial === null) ? nearNpc(s.px, s.py) : -1;
  setState(patch);
  if (arrivedTalk !== null) openTalk(arrivedTalk);
  return active;
}

/** Outfit tier to draw: during an advancement the old outfit shows until the 650ms peak. */
export function displayTier(): number {
  const a = sim.adv;
  return a && !a.swapped ? Math.max(0, a.tier - 1) : state.zone;
}

/** Leg pose: walk cycle one frame per 0.2s, jump = tuck, ladder = alternating lifts every 14px climbed. */
export function legPose(): number {
  if (state.climb) return state.climbMoving ? (Math.floor(Math.abs(state.py) / 14) % 2 ? 7 : 6) : 0;
  if (state.air) return 5;
  if (state.moving) return 1 + (Math.floor(sim.wt / 0.2) % 4);
  return 0;
}

export function disposeSim() { timers.forEach((id) => clearTimeout(id)); timers.length = 0; }

/** Fresh simulation (tests / a fresh start): clears timers, module state and re-binds event handlers. */
export function resetSim() {
  disposeSim();
  Object.assign(sim, freshSim());
  gateBonus = 0; gateBonusIdx = -1; advId = 0; rewardId = 0; sealArmed = true; viewW = 0;
  bindEvents();
}
