import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createStk, STK, STK_TITLE_FLOORS, EXP_BONUS_MAX, EXP_CEIL,
  slideSpeed, stkExpBonus, stkRating, landBlock, rowVisible, levelTagX, stkResult
} from '../../src/trials/stk.ts';
import { EXP_BASE, TRIALS } from '../../src/content.ts';
import { state } from '../../src/state.ts';
import type { TrialGame, TrialResult } from '../../src/trials/types.ts';

beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.5); });

function setup() {
  const ctx = { gate: false, close: vi.fn(), finish: vi.fn() };
  const game = createStk(ctx);
  document.body.appendChild(game.root);
  const area = game.root.children[1] as HTMLElement;
  return { ctx, game, area };
}

const space = (init: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { code: 'Space', key: ' ', cancelable: true, ...init });
const drop = (game: TrialGame) => game.key(space(), true);

// The slider starts each floor at a wall and slides inward; this is how long it takes to sit exactly over the centred tower.
const toCenter = (floors: number, w = STK.W0) => (STK.W / 2 - (w / 2 + STK.EDGE)) / slideSpeed(floors);
// Time for a full wall-to-wall pass.
const fullPass = (floors: number, w = STK.W0) => (STK.W - w - 2 * STK.EDGE) / slideSpeed(floors);

function perfectDrops(game: TrialGame, n: number) {
  for (let i = 0; i < n; i++) { game.step(toCenter(i)); drop(game); }
}

/** Run the game-over pause to its end; returns the reported result. */
function endRun(game: TrialGame, ctx: { finish: ReturnType<typeof vi.fn> }): TrialResult {
  let t = 0;
  while (game.step(0.05)) { t += 0.05; if (t > 30) throw new Error('run never ended'); }
  expect(ctx.finish).toHaveBeenCalledTimes(1);
  return ctx.finish.mock.calls[0][0];
}

describe('landBlock', () => {
  const top = { cx: STK.W / 2, w: 150 };

  it('a perfect drop snaps onto the tower, keeps the width and builds the combo', () => {
    const r = landBlock(top, top.cx + STK.PERFECT / 2, top.w, 0)!;
    expect(r.perfect).toBe(true);
    expect(r.cx).toBe(top.cx);
    expect(r.w).toBe(top.w);
    expect(r.combo).toBe(1);
  });

  it('a run of perfect drops widens a trimmed tower but never beyond the starting width', () => {
    let w = 100, combo = 0, widened = false;
    for (let i = 0; i < 60; i++) {
      const r = landBlock({ cx: top.cx, w }, top.cx, w, combo)!;
      expect(r.combo).toBe(combo + 1);
      expect(r.w).toBeGreaterThanOrEqual(w);
      expect(r.w).toBeLessThanOrEqual(STK.W0);
      if (r.w > w) widened = true;
      w = r.w; combo = r.combo;
    }
    expect(widened).toBe(true);
    expect(w).toBe(STK.W0);
  });

  it.each([1, -1])('an offset drop (side %i) trims the width to the overlap and resets the combo', (side) => {
    const off = 40;
    const r = landBlock(top, top.cx + side * off, top.w, 5)!;
    expect(r.perfect).toBe(false);
    expect(r.w).toBe(top.w - off);
    expect(r.combo).toBe(0);
    expect(Math.sign(r.cx - top.cx)).toBe(side);
  });

  it.each([1, -1])('a drop with (almost) no overlap is a miss (side %i)', (side) => {
    expect(landBlock(top, top.cx + side * (top.w + 10), top.w, 3)).toBeNull();
    expect(landBlock(top, top.cx + side * (top.w - 1), top.w, 3)).toBeNull();
  });
});

describe('Keep Leveling rules', () => {
  it('rates runs from 1 to 5 and never lower for more floors', () => {
    let prev = 1;
    const seen = new Set<number>();
    for (let f = 0; f <= 100; f++) {
      const r = stkRating(f);
      expect(r).toBeGreaterThanOrEqual(prev);
      expect(r).toBeLessThanOrEqual(5);
      prev = r; seen.add(r);
    }
    expect(stkRating(0)).toBe(1);
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('the slider never slows down as the tower grows', () => {
    for (let f = 1; f < 200; f++) expect(slideSpeed(f)).toBeGreaterThanOrEqual(slideSpeed(f - 1));
  });

  it('the EXP bonus grows with floors, keeps what was banked and never passes its cap', () => {
    expect(stkExpBonus(3, 0)).toBe(3);
    for (let f = 1; f < 400; f += 7) {
      expect(stkExpBonus(0, f)).toBeGreaterThanOrEqual(stkExpBonus(0, f - 1));
      expect(stkExpBonus(EXP_BONUS_MAX, f)).toBe(EXP_BONUS_MAX);
    }
    expect(stkExpBonus(0, 1e6)).toBe(EXP_BONUS_MAX);
  });

  it('the title is earned exactly when the floor count reaches the threshold', () => {
    expect(stkResult(STK_TITLE_FLOORS - 1, 0).title).toBe(false);
    expect(stkResult(STK_TITLE_FLOORS, 0).title).toBe(true);
    expect(stkResult(STK_TITLE_FLOORS + 1, 0).title).toBe(true);
  });

  it('the title requirement shown in the content matches the rule', () => {
    expect(TRIALS.stk.how).toContain(String(STK_TITLE_FLOORS));
  });

  it('reports floors as the score, more EXP for more floors, and "capped" once the bonus would reach the ceiling', () => {
    for (const bank of [0, 1, EXP_BONUS_MAX - 1, EXP_BONUS_MAX]) {
      for (const f of [0, 4, 5, 25]) {
        const r = stkResult(f, bank);
        expect(r.won).toBe(true);
        expect(r.score).toBe(f);
        expect(r.floors).toBe(f);
        expect(r.capped).toBe(EXP_BASE + stkExpBonus(bank, f) >= EXP_CEIL);
      }
    }
    expect(stkResult(0, 0).capped).not.toBe(stkResult(0, EXP_BONUS_MAX).capped);
    expect(stkResult(6, 0).exp!).toBeGreaterThan(stkResult(5, 0).exp!);
  });

  it('rows are drawn only while at least partly inside the play area', () => {
    expect(rowVisible(0)).toBe(true);
    expect(rowVisible(-STK.BH + 1)).toBe(true);
    expect(rowVisible(STK.H - 1)).toBe(true);
    expect(rowVisible(-STK.BH)).toBe(false);
    expect(rowVisible(STK.H)).toBe(false);
  });

  it('level tags sit right of the block when there is room, otherwise left of it', () => {
    const w = 100;
    expect(levelTagX(STK.W / 2, w)).toBeGreaterThanOrEqual(STK.W / 2 + w / 2);
    const flush = STK.W - w / 2;
    expect(levelTagX(flush, w)).toBeLessThan(flush - w / 2);
  });
});

describe('createStk', () => {
  it('counts every floor stacked by perfect drops', () => {
    const { game, ctx } = setup();
    perfectDrops(game, 5);
    drop(game); // the slider is back at a wall: a total miss
    const r = endRun(game, ctx);
    expect(r.floors).toBe(5);
    expect(r.score).toBe(5);
  });

  it.each([0.8, 1.2])('an offset drop (%f of the way to the centre) still adds a floor', (frac) => {
    const { game, ctx } = setup();
    game.step(toCenter(0) * frac);
    drop(game);
    drop(game); // slider at the far wall: miss
    expect(endRun(game, ctx).floors).toBe(1);
  });

  it('a total miss ends the run after a short pause; further drops are ignored', () => {
    const { game, ctx } = setup();
    drop(game);
    expect(ctx.finish).not.toHaveBeenCalled();
    drop(game);
    const r = endRun(game, ctx);
    expect(r.floors).toBe(0);
    expect(r.title).toBe(false);
  });

  it('a miss past the far side of the tower also ends the run', () => {
    const { game, ctx } = setup();
    perfectDrops(game, 1);
    drop(game);
    expect(endRun(game, ctx).floors).toBe(1);
  });

  it('reaching the title floor count earns the title; one floor short does not', () => {
    const a = setup();
    perfectDrops(a.game, STK_TITLE_FLOORS);
    drop(a.game);
    const won = endRun(a.game, a.ctx);
    expect(won.floors).toBe(STK_TITLE_FLOORS);
    expect(won.title).toBe(true);

    const b = setup();
    perfectDrops(b.game, STK_TITLE_FLOORS - 1);
    drop(b.game);
    expect(endRun(b.game, b.ctx).title).toBe(false);
  });

  it('the slider bounces off both walls', () => {
    const { game, ctx } = setup();
    // One and a half passes: hits the far wall and comes back to the centre.
    game.step(fullPass(0) * 1.5);
    drop(game);
    game.step(fullPass(1) * 1.5);
    drop(game);
    drop(game);
    expect(endRun(game, ctx).floors).toBe(2);
  });

  it('EXP and "capped" in the result follow the EXP bonus already banked', () => {
    for (const bank of [0, EXP_BONUS_MAX]) {
      state.expBonus = bank;
      const { game, ctx } = setup();
      perfectDrops(game, 3);
      drop(game);
      const r = endRun(game, ctx);
      expect(r).toEqual(stkResult(3, bank));
    }
  });

  it('clicking or tapping the play area drops the block; only taps suppress the default', () => {
    const mouse = setup();
    const m = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    Object.defineProperty(m, 'pointerType', { value: 'mouse' });
    mouse.area.dispatchEvent(m);
    expect(m.defaultPrevented).toBe(false);
    expect(endRun(mouse.game, mouse.ctx).floors).toBe(0);

    const touch = setup();
    const t = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    Object.defineProperty(t, 'pointerType', { value: 'touch' });
    touch.area.dispatchEvent(t);
    expect(t.defaultPrevented).toBe(true);
    expect(endRun(touch.game, touch.ctx).floors).toBe(0);
  });

  it('Space only drops when no button has focus and not on key repeat', () => {
    const { game, ctx } = setup();
    const onButton = space();
    game.key(onButton, false);
    expect(onButton.defaultPrevented).toBe(false);
    const repeat = space({ repeat: true });
    game.key(repeat, true);
    expect(repeat.defaultPrevented).toBe(true);
    for (let i = 0; i < 100; i++) expect(game.step(0.05)).toBe(true);
    expect(ctx.finish).not.toHaveBeenCalled();
  });

  it.each([
    ['Space', { code: 'Space' }], ['Enter', { code: 'Enter' }], ['a space key without a code', { key: ' ' }]
  ])('%s drops the block', (_n, init) => {
    const { game, ctx } = setup();
    const e = new KeyboardEvent('keydown', { cancelable: true, ...init });
    game.key(e, true);
    expect(e.defaultPrevented).toBe(true);
    expect(endRun(game, ctx).floors).toBe(0);
  });

  it('arrow keys do not scroll the page; other keys are left alone', () => {
    const { game } = setup();
    const arrow = new KeyboardEvent('keydown', { code: 'ArrowDown', cancelable: true });
    game.key(arrow, true);
    expect(arrow.defaultPrevented).toBe(true);
    const other = new KeyboardEvent('keydown', { code: 'KeyX', cancelable: true });
    game.key(other, true);
    expect(other.defaultPrevented).toBe(false);
  });

  it('the close button quits the trial', () => {
    const { game, ctx } = setup();
    (game.root.querySelector('button[aria-label]') as HTMLButtonElement).click();
    expect(ctx.close).toHaveBeenCalled();
  });
});
