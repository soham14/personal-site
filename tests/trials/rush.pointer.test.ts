import { describe, it, expect, vi } from 'vitest';
import { createRush, rushStars, scoreCatch, RUSH_SECONDS } from '../../src/trials/rush.ts';
import type { TrialGame, TrialResult } from '../../src/trials/types.ts';
import { LEFT, CENTER, RIGHT, DT, RECT, LEFT_HALF, RIGHT_HALF, keydown, keyup, seedSpawns, setup, run, playOut, scoreWith, pointer, measured, type Spawn } from './rush.helpers.ts';

describe('createRush pointer', () => {
  it('holding the left half of the play area moves the catcher left (before the round starts)', () => {
    const score = scoreWith([['star', LEFT]], ({ area }) => {
      measured(area);
      (area as any).setPointerCapture = () => { throw new Error('capture unavailable'); };
      const e = pointer(area, 'pointerdown', LEFT_HALF);
      expect(e.defaultPrevented).toBe(true);
    });
    expect(score).toBeGreaterThan(0);
  });

  it('holding the right half of the play area moves the catcher right', () => {
    const score = scoreWith([['star', RIGHT]], ({ game, area }) => {
      measured(area);
      game.step(DT);
      pointer(area, 'pointerdown', RIGHT_HALF);
    });
    expect(score).toBeGreaterThan(0);
  });

  it.each([
    [LEFT_HALF, RIGHT_HALF, RIGHT], [RIGHT_HALF, LEFT_HALF, LEFT]
  ])('sliding a held pointer across the middle (x %i to %i) switches direction, also mid-round', (from, to, side) => {
    const score = scoreWith([['star', side]], ({ game, area }) => {
      measured(area);
      run(game, RUSH_SECONDS / 4);
      pointer(area, 'pointerdown', from);
      pointer(area, 'pointermove', to);
    });
    expect(score).toBeGreaterThan(0);
  });

  it('ignores moves from another pointer or with no pointer held', () => {
    const otherPointer = scoreWith([['star', RIGHT]], ({ area }) => {
      measured(area);
      pointer(area, 'pointerdown', RIGHT_HALF, 1);
      pointer(area, 'pointermove', LEFT_HALF, 2);
    });
    expect(otherPointer).toBeGreaterThan(0);
    const noneHeld = scoreWith([['star', CENTER]], ({ area }) => {
      measured(area);
      pointer(area, 'pointermove', LEFT_HALF);
    });
    expect(noneHeld).toBeGreaterThan(0);
  });

  it.each(['pointerup', 'pointercancel', 'pointerleave'])('%s of the holding pointer stops the catcher', (type) => {
    const score = scoreWith([['star', CENTER]], ({ area }) => {
      measured(area);
      pointer(area, 'pointerdown', RIGHT_HALF, 1);
      pointer(area, type, RIGHT_HALF, 1);
    });
    expect(score).toBeGreaterThan(0);
  });

  it('another pointer lifting does not stop the catcher', () => {
    const score = scoreWith([['star', CENTER]], ({ area }) => {
      measured(area);
      pointer(area, 'pointerdown', RIGHT_HALF, 1);
      pointer(area, 'pointerup', RIGHT_HALF, 2);
    });
    expect(score).toBe(0);
  });
});
