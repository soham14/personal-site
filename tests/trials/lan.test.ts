import { describe, it, expect, vi } from 'vitest';
import { createLan, dealLanterns, lanScore, lanStars, symNames, LAN_TIME } from '../../src/trials/lan.ts';
import type { TrialGame, TrialResult } from '../../src/trials/types.ts';

// Deterministic Math.random replacement (mulberry32).
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLS = 4;

function start(seed = 1) {
  vi.spyOn(Math, 'random').mockImplementation(seeded(seed));
  const ctx = { gate: false, close: vi.fn(), finish: vi.fn<(r: TrialResult) => void>() };
  const game = createLan(ctx);
  document.body.appendChild(game.root);
  const cards = dealLanterns(seeded(seed)); // the same layout the game dealt
  const lantern = (i: number) => game.root.querySelector('[data-ln="' + i + '"]') as HTMLButtonElement;
  /** A lantern is showing its symbol when its accessible label names it. */
  const shown = (i: number) => lantern(i).getAttribute('aria-label')!.includes(symNames[cards[i]]);
  const pairs = symNames.map((_, sym) => cards.flatMap((c, i) => (c === sym ? [i] : [])));
  const mismatchOf = (i: number) => cards.findIndex((c) => c !== cards[i]);
  return { ctx, game, cards, lantern, shown, pairs, mismatchOf };
}

function runOut(game: TrialGame, dt: number): number {
  for (let n = 1; n < 100000; n++) if (!game.step(dt)) return n;
  throw new Error('game never ended');
}

const key = (code: string, opts: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { code, cancelable: true, ...opts });
const focusedLantern = () => Number((document.activeElement as HTMLElement).dataset.ln);

describe('lanStars', () => {
  it('is always between 1 and 5 and never drops as the score rises', () => {
    const max = lanScore(LAN_TIME, 0);
    let prev = 1;
    for (let sc = 0; sc <= max + 50; sc++) {
      const st = lanStars(sc);
      expect(st).toBeGreaterThanOrEqual(1);
      expect(st).toBeLessThanOrEqual(5);
      expect(st).toBeGreaterThanOrEqual(prev);
      prev = st;
    }
  });
  it('gives five stars for a quick, near-perfect round', () => {
    expect(lanStars(lanScore(LAN_TIME, symNames.length))).toBe(5);
  });
  it('scores more for more time left and for fewer moves', () => {
    expect(lanScore(40, 10)).toBeGreaterThan(lanScore(30, 10));
    expect(lanScore(40, 8)).toBeGreaterThan(lanScore(40, 12));
    expect(lanScore(0, 1000)).toBe(0);
  });
});

describe('dealLanterns', () => {
  it('deals every symbol exactly twice', () => {
    for (let s = 1; s <= 20; s++) {
      const cards = dealLanterns(seeded(s));
      expect(cards).toHaveLength(symNames.length * 2);
      symNames.forEach((_, sym) => expect(cards.filter((c) => c === sym)).toHaveLength(2));
    }
  });
  it('shuffles differently for different random streams', () => {
    const deals = new Set(Array.from({ length: 10 }, (_, s) => dealLanterns(seeded(s + 1)).join(',')));
    expect(deals.size).toBeGreaterThan(1);
  });
});

describe('Lantern Match game', () => {
  it('starts with every lantern dark', () => {
    const s = start();
    expect(s.game.root.getAttribute('role')).toBe('dialog');
    s.cards.forEach((_, i) => expect(s.shown(i)).toBe(false));
  });

  it('a matching pair stays lit', () => {
    const s = start(2);
    const [a, b] = s.pairs[0];
    s.lantern(a).click();
    expect(s.shown(a)).toBe(true);
    s.lantern(b).click();
    for (let k = 0; k < 30; k++) s.game.step(0.1);
    expect(s.shown(a)).toBe(true);
    expect(s.shown(b)).toBe(true);
  });

  it('a mismatched pair turns back off after a delay, and no lantern can be lit meanwhile', () => {
    const s = start(3);
    const a = 0, b = s.mismatchOf(0);
    const c = s.cards.findIndex((_, i) => i !== a && i !== b);
    s.lantern(a).click();
    s.lantern(b).click();
    expect(s.shown(a) && s.shown(b)).toBe(true);
    s.lantern(c).click(); // during the reveal
    expect(s.shown(c)).toBe(false);
    s.game.step(0.01);
    expect(s.shown(a) && s.shown(b)).toBe(true);
    let n = 0;
    while (s.shown(a) && n++ < 1000) s.game.step(0.05);
    expect(s.shown(a)).toBe(false);
    expect(s.shown(b)).toBe(false);
    s.lantern(c).click();
    expect(s.shown(c)).toBe(true);
  });

  it('picking the same lantern twice does not count as a pair', () => {
    const s = start(4);
    const [a, b] = s.pairs[1];
    s.lantern(a).click();
    s.lantern(a).click();
    s.lantern(b).click(); // still completes the pair with the first pick
    s.game.step(LAN_TIME + 1);
    expect(s.ctx.finish.mock.calls[0][0]).toMatchObject({ won: false, pairs: 1, moves: 1 });
  });

  it('finding every pair wins after the celebration, and late clicks are ignored', () => {
    const s = start(5);
    s.pairs.forEach(([a, b]) => { s.lantern(a).click(); s.lantern(b).click(); });
    expect(s.ctx.finish).not.toHaveBeenCalled();
    s.lantern(s.pairs[0][0]).click();
    const e = key('ArrowRight');
    s.game.key(e, true);
    expect(e.defaultPrevented).toBe(true);
    runOut(s.game, 0.05);
    expect(s.ctx.finish).toHaveBeenCalledTimes(1);
    const r = s.ctx.finish.mock.calls[0][0];
    expect(r).toMatchObject({ won: true, pairs: symNames.length, moves: symNames.length });
    expect(r.stars).toBe(lanStars(r.score));
    expect(r.score).toBe(lanScore(r.secs!, r.moves!));
    expect(r.stars).toBe(5);
  });

  it('a faster win earns at least as many stars as a slower one', () => {
    const play = (wait: number) => {
      const s = start(6);
      s.game.step(wait);
      s.pairs.forEach(([a, b]) => { s.lantern(a).click(); s.lantern(b).click(); });
      runOut(s.game, 0.1);
      return s.ctx.finish.mock.calls[0][0];
    };
    const fast = play(0.1), slow = play(LAN_TIME * 0.9);
    expect(fast.score).toBeGreaterThan(slow.score);
    expect(fast.stars).toBeGreaterThanOrEqual(slow.stars);
  });

  it('running out of time is a loss that reports progress', () => {
    const s = start(7);
    const [a, b] = s.pairs[2];
    s.lantern(a).click(); s.lantern(b).click();
    const c = s.cards.findIndex((_, i) => i !== a && i !== b);
    const d = s.cards.findIndex((x, i) => i !== a && i !== b && x !== s.cards[c]);
    s.lantern(c).click(); s.lantern(d).click();
    expect(s.game.step(0.1)).toBe(true);
    runOut(s.game, 0.5);
    expect(s.ctx.finish).toHaveBeenCalledTimes(1);
    expect(s.ctx.finish.mock.calls[0][0]).toMatchObject({ won: false, pairs: 1, moves: 2 });
  });

  it('arrow keys move the ring around the strings and stay on them', () => {
    const { game } = start();
    const e = key('ArrowDown');
    game.key(e, true);
    expect(e.defaultPrevented).toBe(true);
    expect(focusedLantern()).toBe(0);
    game.key(key('ArrowRight'), true);
    game.key(key('KeyD'), true);
    expect(focusedLantern()).toBe(2);
    game.key(key('ArrowDown'), true);
    game.key(key('KeyS'), true);
    game.key(key('KeyS'), true);
    expect(focusedLantern()).toBe(2 + 2 * COLS);
    game.key(key('ArrowUp'), true);
    game.key(key('KeyW'), true);
    game.key(key('KeyW'), true);
    expect(focusedLantern()).toBe(2);
    game.key(key('ArrowLeft'), true);
    game.key(key('KeyA'), true);
    game.key(key('KeyA'), true);
    expect(focusedLantern()).toBe(0);
  });

  it('focusing a lantern directly moves the ring there', () => {
    const { game, lantern } = start();
    lantern(5).focus();
    game.key(key('ArrowRight'), true);
    expect(focusedLantern()).toBe(6);
  });

  it('Space and Enter light the ringed lantern only when pressed directly on the game', () => {
    const s = start(8);
    const e = key('Space');
    s.game.key(e, true); // no ring yet: lights the first lantern
    expect(e.defaultPrevented).toBe(true);
    expect(s.shown(0)).toBe(true);
    const partner = s.pairs[s.cards[0]].find((i) => i !== 0)!;
    s.lantern(partner).focus();
    const indirect = key('Enter');
    s.game.key(indirect, false);
    s.game.key(key('Space', { repeat: true }), true);
    s.game.key(key('KeyX'), true);
    expect(indirect.defaultPrevented).toBe(false);
    expect(s.shown(partner)).toBe(false);
    s.game.key(key('Enter'), true);
    expect(s.shown(partner)).toBe(true);
    const other = s.pairs.find((p) => !p.includes(0))!;
    s.lantern(other[0]).focus();
    s.game.key(key('', { key: ' ' }), true);
    expect(s.shown(other[0])).toBe(true);
  });

  it('the close button quits through the trial context', () => {
    const { game, ctx } = start();
    (game.root.querySelector('button:not([data-ln])') as HTMLButtonElement).click();
    expect(ctx.close).toHaveBeenCalledTimes(1);
  });
});
