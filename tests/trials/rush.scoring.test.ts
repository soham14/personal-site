import { describe, it, expect, vi } from 'vitest';
import { createRush, rushStars, scoreCatch, RUSH_SECONDS } from '../../src/trials/rush.ts';
import type { TrialGame, TrialResult } from '../../src/trials/types.ts';
import { LEFT, CENTER, RIGHT, DT, RECT, LEFT_HALF, RIGHT_HALF, keydown, keyup, seedSpawns, setup, run, playOut, scoreWith, pointer, measured, type Spawn } from './rush.helpers.ts';

describe('rushStars', () => {
  it('rates every score from 1 to 5 stars and never drops as the score rises', () => {
    let prev = 0;
    const seen = new Set<number>();
    for (let s = 0; s <= 200; s++) {
      const r = rushStars(s);
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(Math.max(1, prev));
      expect(r).toBeLessThanOrEqual(5);
      prev = r;
      seen.add(r);
    }
    expect(rushStars(0)).toBe(1);
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('scoreCatch', () => {
  it('catching a star raises the score and the combo', () => {
    const r = scoreCatch(4, 2, 'star');
    expect(r.score).toBeGreaterThan(4);
    expect(r.combo).toBe(3);
  });

  it('a featured star is worth more than an ordinary one and also builds the combo', () => {
    const feat = scoreCatch(0, 0, 'feat'), star = scoreCatch(0, 0, 'star');
    expect(feat.score).toBeGreaterThan(star.score);
    expect(feat.combo).toBe(1);
  });

  it('a pebble costs points and resets the combo', () => {
    const r = scoreCatch(5, 4, 'peb');
    expect(r.score).toBeLessThan(5);
    expect(r.combo).toBe(0);
  });

  it('the score never goes negative, however many pebbles are caught', () => {
    let s = { score: 1, combo: 3 };
    for (let i = 0; i < 5; i++) {
      s = scoreCatch(s.score, s.combo, 'peb');
      expect(s.score).toBeGreaterThanOrEqual(0);
    }
    expect(s.score).toBe(0);
  });
});

describe('createRush round', () => {
  it('ends only after the full round time has been played and reports a rated result', () => {
    seedSpawns([['star', CENTER]]);
    const { game, ctx } = setup();
    const { result, elapsed } = playOut(game, ctx);
    expect(elapsed).toBeGreaterThanOrEqual(RUSH_SECONDS);
    expect(result.won).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.stars).toBe(rushStars(result.score));
    expect(result.bonus).toBeGreaterThan(0);
  });

  it('stars falling onto the catcher score; stars falling past it do not', () => {
    expect(scoreWith([['star', CENTER]])).toBeGreaterThan(0);
    expect(scoreWith([['star', LEFT]])).toBe(0);
  });

  it('featured stars score more than the same number of ordinary stars', () => {
    expect(scoreWith([['feat', CENTER]])).toBeGreaterThan(scoreWith([['star', CENTER]]));
  });

  it('catching only pebbles leaves the score at zero (the lowest rating), never negative', () => {
    seedSpawns([['peb', CENTER]]);
    const { game, ctx } = setup();
    const { result } = playOut(game, ctx);
    expect(result.score).toBe(0);
    expect(result.stars).toBe(rushStars(0));
  });

  it('a mixed round of stars, featured stars, pebbles and misses produces a consistent result', () => {
    seedSpawns([['star', CENTER], ['star', CENTER], ['star', CENTER], ['feat', CENTER], ['peb', CENTER], ['star', LEFT]]);
    const { game, ctx } = setup();
    const { result } = playOut(game, ctx);
    expect(result.score).toBeGreaterThan(0);
    expect(result.stars).toBe(rushStars(result.score));
  });

  it('the close button quits the trial', () => {
    const { game, ctx } = setup();
    (game.root.querySelector('button[aria-label]') as HTMLButtonElement).click();
    expect(ctx.close).toHaveBeenCalled();
  });
});
