import { describe, it, expect, vi } from 'vitest';
import { createRush, rushStars, scoreCatch, RUSH_SECONDS } from '../../src/trials/rush.ts';
import type { TrialGame, TrialResult } from '../../src/trials/types.ts';
import { LEFT, CENTER, RIGHT, DT, RECT, LEFT_HALF, RIGHT_HALF, keydown, keyup, seedSpawns, setup, run, playOut, scoreWith, pointer, measured, type Spawn } from './rush.helpers.ts';

describe('createRush keyboard', () => {
  it.each([
    ['ArrowLeft', LEFT], ['KeyA', LEFT], ['ArrowRight', RIGHT], ['KeyD', RIGHT]
  ])('holding %s moves the catcher to that side and it stops at the edge of the play area', (code, side) => {
    const hold = (s: ReturnType<typeof setup>) => s.game.key(keydown(code), true);
    expect(scoreWith([['star', side]], hold)).toBeGreaterThan(0);
    expect(scoreWith([['star', CENTER]], hold)).toBe(0);
  });

  it.each([
    ['ArrowRight', 'ArrowLeft', LEFT], ['KeyA', 'KeyD', RIGHT]
  ])('releasing %s stops moving that way (then %s takes over)', (first, second, side) => {
    const score = scoreWith([['star', side]], ({ game }) => {
      game.key(keydown(first), true);
      run(game, 0.2);
      game.keyUp!(keyup(first));
      game.keyUp!(keyup('KeyX'));
      game.key(keydown(second), true);
    });
    expect(score).toBeGreaterThan(0);
  });

  it('movement and scrolling keys do not scroll the page; other keys are left alone', () => {
    const { game } = setup();
    for (const code of ['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'ArrowUp', 'ArrowDown', 'Space']) {
      const e = keydown(code);
      game.key(e, true);
      expect(e.defaultPrevented).toBe(true);
    }
    const other = keydown('KeyX');
    game.key(other, true);
    expect(other.defaultPrevented).toBe(false);
  });
});

