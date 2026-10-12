// Shared helpers for the Five-Star Rush tests (split across files so they run in parallel).
import { expect, vi } from 'vitest';
import { createRush, RUSH_SECONDS } from '../../src/trials/rush.ts';
import type { TrialGame, TrialResult } from '../../src/trials/types.ts';

// Horizontal spawn positions as a fraction of the play area (fed to Math.random for the x coordinate).
export const LEFT = 0.0001, CENTER = 0.5, RIGHT = 0.9999;
export type Spawn = ['star' | 'feat' | 'peb', number];

/** Seed Math.random so falling objects cycle through `spawns` (kind + horizontal position). */
export function seedSpawns(spawns: Spawn[]) {
  // Extreme draws pick a kind regardless of the exact spawn odds: 0 is always "pebble"/"featured", ~1 never is.
  const vals = spawns.flatMap(([k, x]) => (k === 'peb' ? [0, x, 0] : [0.9999, k === 'feat' ? 0 : 0.9999, x, 0]));
  let i = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => vals[i++ % vals.length]);
}

export const DT = 0.05;
/** Coarser tick for whole-round playthroughs: still smaller than the catch band (max fall 320px/s × 0.1s = 32px < 46px). */
export const ROUND_DT = 0.1;

export function setup() {
  const ctx = { gate: false, close: vi.fn(), finish: vi.fn() };
  const game = createRush(ctx);
  document.body.appendChild(game.root);
  const area = game.root.lastElementChild as HTMLElement;
  return { ctx, game, area };
}

/** Step for `seconds` of game time. */
export function run(game: TrialGame, seconds: number) {
  for (let t = 0; t < seconds; t += DT) expect(game.step(DT)).toBe(true);
}

/** Step until the round ends; returns the result and how much time was stepped. */
export function playOut(game: TrialGame, ctx: { finish: ReturnType<typeof vi.fn> }): { result: TrialResult; elapsed: number } {
  let elapsed = 0;
  for (;;) {
    elapsed += ROUND_DT;
    if (!game.step(ROUND_DT)) break;
    expect(ctx.finish).not.toHaveBeenCalled();
    if (elapsed > 10 * RUSH_SECONDS) throw new Error('round never ended');
  }
  expect(ctx.finish).toHaveBeenCalledTimes(1);
  return { result: ctx.finish.mock.calls[0][0], elapsed };
}

export function scoreWith(spawns: Spawn[], before: (s: ReturnType<typeof setup>) => void = () => {}): number {
  seedSpawns(spawns);
  const s = setup();
  before(s);
  return playOut(s.game, s.ctx).result.score;
}

export const keydown = (code: string) => new KeyboardEvent('keydown', { code, cancelable: true });
export const keyup = (code: string) => new KeyboardEvent('keyup', { code });

export function pointer(target: Element, type: string, clientX: number, pointerId = 1) {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX });
  Object.defineProperty(e, 'pointerId', { value: pointerId });
  target.dispatchEvent(e);
  return e;
}

// A measured play area: 400px wide starting at x=100, so the halves split at x=300.
export const RECT = { left: 100, width: 400, top: 0, height: 320, right: 500, bottom: 320, x: 100, y: 0, toJSON() {} } as DOMRect;
export const LEFT_HALF = 150, RIGHT_HALF = 450;
export function measured(area: HTMLElement) { vi.spyOn(area, 'getBoundingClientRect').mockReturnValue(RECT); }

