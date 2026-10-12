// Shared game state + event bus. Every module reads/writes state through here and talks via events,
// so the world (Phaser), UI (DOM), trials, and audio stay decoupled.

import type { TrialKind } from './content.ts';

export interface GameState {
  // player / simulation snapshot (written by game/sim.ts each frame)
  px: number; py: number; vy: number; facing: 1 | -1;
  moving: boolean; hmove: boolean; air: boolean; climb: boolean; climbMoving: boolean;
  zone: number;        // map the player stands in (drives outfit + guild)
  bz: number;          // map the camera/background is in (drives banner + music)
  blend: { cur: number; nxt: number; t: number }; // background crossfade at gates
  maxTier: number;     // highest map reached
  earnedN: number;     // crests earned (0..3)
  near: number;        // index of nearby mentor (0-3), 4 = portal, -1 none
  // overlays (written by ui/*, trials/*)
  talk: number | null;            // open dialogue: mentor index or 4 for the portal
  profileOpen: boolean;
  profileTab: 'journey' | 'skills' | 'trophies';
  resumeOpen: boolean;
  trial: { kind: TrialKind; phase: 'prompt' | 'play' | 'result'; gate: boolean } | null;
  paused: boolean;                // advancement sequence freezes movement
  // progress
  titles: string[];
  best: Record<TrialKind, number>;
  expBonus: number;
  profileAlert: boolean;
  // input / UI
  isTouch: boolean; focused: boolean; legendDone: boolean; half: 'left' | 'right' | null;
  musicOn: boolean; sfxOn: boolean; soundNA: boolean;
}

export const state: GameState = {
  px: 80, py: 0, vy: 0, facing: 1,
  moving: false, hmove: false, air: false, climb: false, climbMoving: false,
  zone: 0, bz: 0, blend: { cur: 0, nxt: 0, t: 0 }, maxTier: 0, earnedN: 0, near: -1,
  talk: null, profileOpen: false, profileTab: 'journey', resumeOpen: false, trial: null, paused: false,
  titles: [], best: { hex: 0, lan: 0, rush: 0, stk: 0 }, expBonus: 0, profileAlert: false,
  isTouch: false, focused: false, legendDone: false, half: null,
  musicOn: false, sfxOn: false, soundNA: false
};

type Listener = () => void;
const listeners = new Set<Listener>();

/** Merge a patch into state and notify subscribers (UI re-renders from here). */
export function setState(patch: Partial<GameState>): void {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn());
}
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** True while something should block world movement. */
export function inputLocked(): boolean {
  return state.talk !== null || state.profileOpen || state.resumeOpen || state.trial !== null || state.paused;
}

// ---- Event bus ----
// Events (payloads):
//  'log' {text}                      toast/system message
//  'enterMap' {map}                  camera crossed a gate midpoint (banner + music)
//  'advance' {tier}                  first time entering a higher map (JOB ADVANCED sequence)
//  'reward' {idx, bonus}             crest earned after advancing (quest card + fly to PROFILE button)
//  'sealed' {}                       bumped into the sealed gate
//  'talk' {i}                        open dialogue with mentor i (4 = portal)
//  'trialOffer' {kind, gate}         open a trial prompt
//  'trialDone' {kind, score, stars, gate}  a trial finished
//  'titleUnlocked' {title}
//  'sfx' {name, a?, b?}              play a sound effect
//  'jump' {} | 'land' {fall}         movement cues (audio)
export type EventName =
  | 'log' | 'enterMap' | 'advance' | 'reward' | 'sealed' | 'talk' | 'trialOffer' | 'trialDone'
  | 'titleUnlocked' | 'sfx' | 'jump' | 'land' | 'walkTo';
type Handler = (payload: any) => void;
const handlers = new Map<EventName, Set<Handler>>();

export function on(name: EventName, fn: Handler): () => void {
  if (!handlers.has(name)) handlers.set(name, new Set());
  handlers.get(name)!.add(fn);
  return () => handlers.get(name)!.delete(fn);
}
export function emit(name: EventName, payload: any = {}): void {
  handlers.get(name)?.forEach((fn) => fn(payload));
}
