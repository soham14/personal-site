import { describe, it, expect, vi } from 'vitest';
import { createRush, rushStars, scoreCatch, RUSH_SECONDS } from '../../src/trials/rush.ts';
import type { TrialGame, TrialResult } from '../../src/trials/types.ts';

// Horizontal spawn positions as a fraction of the play area (fed to Math.random for the x coordinate).
const LEFT = 0.0001, CENTER = 0.5, RIGHT = 0.9999;
type Spawn = ['star' | 'feat' | 'peb', number];

/** Seed Math.random so falling objects cycle through `spawns` (kind + horizontal position). */
function seedSpawns(spawns: Spawn[]) {
  // Extreme draws pick a kind regardless of the exact spawn odds: 0 is always "pebble"/"featured", ~1 never is.
  const vals = spawns.flatMap(([k, x]) => (k === 'peb' ? [0, x, 0] : [0.9999, k === 'feat' ? 0 : 0.9999, x, 0]));
  let i = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => vals[i++ % vals.length]);
}

const DT = 0.05;

function setup() {
  const ctx = { gate: false, close: vi.fn(), finish: vi.fn() };
  const game = createRush(ctx);
  document.body.appendChild(game.root);
  const area = game.root.lastElementChild as HTMLElement;
  return { ctx, game, area };
}

/** Step for `seconds` of game time. */
function run(game: TrialGame, seconds: number) {
  for (let t = 0; t < seconds; t += DT) expect(game.step(DT)).toBe(true);
}

/** Step until the round ends; returns the result and how much time was stepped. */
function playOut(game: TrialGame, ctx: { finish: ReturnType<typeof vi.fn> }): { result: TrialResult; elapsed: number } {
  let elapsed = 0;
  for (;;) {
    elapsed += DT;
    if (!game.step(DT)) break;
    expect(ctx.finish).not.toHaveBeenCalled();
    if (elapsed > 10 * RUSH_SECONDS) throw new Error('round never ended');
  }
  expect(ctx.finish).toHaveBeenCalledTimes(1);
  return { result: ctx.finish.mock.calls[0][0], elapsed };
}

function scoreWith(spawns: Spawn[], before: (s: ReturnType<typeof setup>) => void = () => {}): number {
  seedSpawns(spawns);
  const s = setup();
  before(s);
  return playOut(s.game, s.ctx).result.score;
}

const keydown = (code: string) => new KeyboardEvent('keydown', { code, cancelable: true });
const keyup = (code: string) => new KeyboardEvent('keyup', { code });

function pointer(target: Element, type: string, clientX: number, pointerId = 1) {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX });
  Object.defineProperty(e, 'pointerId', { value: pointerId });
  target.dispatchEvent(e);
  return e;
}

// A measured play area: 400px wide starting at x=100, so the halves split at x=300.
const RECT = { left: 100, width: 400, top: 0, height: 320, right: 500, bottom: 320, x: 100, y: 0, toJSON() {} } as DOMRect;
const LEFT_HALF = 150, RIGHT_HALF = 450;
function measured(area: HTMLElement) { vi.spyOn(area, 'getBoundingClientRect').mockReturnValue(RECT); }

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

describe('createRush keyboard', () => {
  it.each([
    ['ArrowLeft', LEFT], ['KeyA', LEFT], ['ArrowRight', RIGHT], ['KeyD', RIGHT]
  ])('holding %s moves the catcher to that side and it stops at the edge of the play area', (code, side) => {
    const hold = (s: ReturnType<typeof setup>) => s.game.key(keydown(code), true);
    expect(scoreWith([['star', side]], hold)).toBeGreaterThan(0);
    expect(scoreWith([['star', CENTER]], hold)).toBe(0);
  });

  it('releasing a key stops moving that way', () => {
    const score = scoreWith([['star', LEFT]], ({ game }) => {
      game.key(keydown('ArrowRight'), true);
      run(game, 0.2);
      game.keyUp!(keyup('ArrowRight'));
      game.keyUp!(keyup('KeyX'));
      game.key(keydown('ArrowLeft'), true);
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

  it('sliding a held pointer across the middle switches direction, also mid-round', () => {
    const score = scoreWith([['star', RIGHT]], ({ game, area }) => {
      measured(area);
      run(game, RUSH_SECONDS / 4);
      pointer(area, 'pointerdown', LEFT_HALF);
      pointer(area, 'pointermove', RIGHT_HALF);
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
