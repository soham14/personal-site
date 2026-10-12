import { describe, it, expect, vi } from 'vitest';
import { createHex, dealHex, hexConn, hexNb, hexScore, hexStars, HT, LAYOUTS, HEX_TIME, type Layout } from '../../src/trials/hex.ts';
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

const ROWS = 3, COLS = 4, N = ROWS * COLS;
const mod6 = (v: number) => ((v % 6) + 6) % 6;

/** All rotations that route light from the source to the seal, found by walking a path tile by tile. */
function solutions(L: Layout): number[][] {
  const out: number[][] = [];
  const turns = L.tiles.map(() => 0);
  const used = new Set<number>();
  const sealTile = L.seal * COLS + COLS - 1;
  const walk = (i: number, inEdge: number) => {
    if (used.has(i)) return;
    used.add(i);
    for (let r = 0; r < 6; r++) {
      const g = HT[L.tiles[i].ty].find((gr) => gr.e.some((e) => (e + r) % 6 === inEdge));
      if (!g) continue;
      turns[i] = r;
      const outs = g.e.map((e) => (e + r) % 6).filter((e) => e !== inEdge);
      if (i === sealTile && outs.includes(0)) { out.push([...turns]); continue; }
      for (const o of outs) { const nb = hexNb(Math.floor(i / COLS), i % COLS, o); if (nb >= 0) walk(nb, (o + 3) % 6); }
    }
    turns[i] = 0;
    used.delete(i);
  };
  walk(L.src * COLS, 3);
  return out;
}

function start(seed = 1) {
  vi.spyOn(Math, 'random').mockImplementation(seeded(seed));
  const ctx = { gate: false, close: vi.fn(), finish: vi.fn<(r: TrialResult) => void>() };
  const game = createHex(ctx);
  document.body.appendChild(game.root);
  const deal = dealHex(seeded(seed)); // the same board the game dealt
  const tile = (i: number) => game.root.querySelector('[data-hx="' + i + '"]') as HTMLButtonElement;
  return { ctx, game, deal, tile };
}

/** Step until the game loop stops; returns the number of steps taken. */
function runOut(game: TrialGame, dt: number): number {
  for (let n = 1; n < 100000; n++) if (!game.step(dt)) return n;
  throw new Error('game never ended');
}

const key = (code: string, opts: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { code, cancelable: true, ...opts });
const focusedTile = () => Number((document.activeElement as HTMLElement).dataset.hx);

/** A tile (not the first) whose rotations alone never complete the route. */
function safeTile(deal: ReturnType<typeof dealHex>): number {
  return [...Array(N).keys()].slice(1).find((k) => [1, 2, 3, 4, 5].every((d) => { const t = [...deal.turns]; t[k] += d; return !hexConn(deal.L, t).sealed; }))!;
}

/** Click every tile the number of times needed to reach the solution. */
function solve(s: ReturnType<typeof start>) {
  const target = solutions(s.deal.L)[0];
  let clicks = 0;
  target.forEach((t, i) => { for (let k = mod6(t - s.deal.turns[i]); k > 0; k--) { s.tile(i).click(); clicks++; } });
  return clicks;
}

describe('hexStars', () => {
  it('is always between 1 and 5 and never drops as the score rises', () => {
    const max = hexScore(HEX_TIME, 0);
    let prev = 1;
    for (let sc = 0; sc <= max + 50; sc++) {
      const st = hexStars(sc);
      expect(st).toBeGreaterThanOrEqual(1);
      expect(st).toBeLessThanOrEqual(5);
      expect(st).toBeGreaterThanOrEqual(prev);
      prev = st;
    }
  });
  it('gives five stars for an instant win with no moves', () => {
    expect(hexStars(hexScore(HEX_TIME, 0))).toBe(5);
  });
  it('scores more for more time left and for fewer moves', () => {
    expect(hexScore(30, 10)).toBeGreaterThan(hexScore(20, 10));
    expect(hexScore(30, 5)).toBeGreaterThan(hexScore(30, 10));
    expect(hexScore(0, 1000)).toBe(0);
  });
});

describe('hexNb', () => {
  it('is symmetric: crossing an edge and coming back lands on the same tile', () => {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (let e = 0; e < 6; e++) {
      const nb = hexNb(r, c, e);
      if (nb < 0) continue;
      expect(nb).toBeLessThan(N);
      expect(hexNb(Math.floor(nb / COLS), nb % COLS, (e + 3) % 6)).toBe(r * COLS + c);
    }
  });
  it('returns -1 off the edges of the board', () => {
    expect(hexNb(0, 0, 3)).toBe(-1);           // west of the first tile
    expect(hexNb(0, COLS - 1, 0)).toBe(-1);    // east of the last column
    expect(hexNb(0, 1, 4)).toBe(-1);           // above the top row
    expect(hexNb(ROWS - 1, 1, 1)).toBe(-1);    // below the bottom row
  });
});

describe('hexConn', () => {
  it('every layout has a rotation that lights the seal', () => {
    for (const L of LAYOUTS) {
      const sols = solutions(L);
      expect(sols.length).toBeGreaterThan(0);
      for (const t of sols) {
        const c = hexConn(L, t);
        expect(c.sealed).toBe(true);
        expect(c.lit[L.src * COLS].some(Boolean)).toBe(true);
        expect(c.lit[L.seal * COLS + COLS - 1].some(Boolean)).toBe(true);
      }
    }
  });
  it('lights nothing when the source tile faces away from the light', () => {
    const L = LAYOUTS[0];
    const turns = L.tiles.map(() => 0);
    let dark = false;
    for (let r = 0; r < 6 && !dark; r++) {
      turns[L.src * COLS] = r;
      const c = hexConn(L, turns);
      if (c.lit.every((g) => g.every((x) => !x))) { dark = true; expect(c.sealed).toBe(false); }
    }
    expect(dark).toBe(true);
  });
  it('a full turn of any tile leaves the light unchanged', () => {
    const { L, turns } = dealHex(seeded(5));
    const before = hexConn(L, turns);
    for (let i = 0; i < N; i++) {
      const t = [...turns]; t[i] += 6;
      expect(hexConn(L, t)).toEqual(before);
    }
  });
});

describe('dealHex', () => {
  it('never deals a board that is already solved', () => {
    for (let s = 1; s <= 40; s++) {
      const d = dealHex(seeded(s));
      expect(LAYOUTS).toContain(d.L);
      expect(d.turns).toHaveLength(N);
      expect(d.conn.sealed).toBe(false);
      expect(hexConn(d.L, d.turns).sealed).toBe(false);
    }
  });

  // A scripted random stream: one layout pick, then one value per tile repeated each re-deal, optionally
  // switching to `then` after the first deal. The value that yields a wanted rotation is found by probing dealHex.
  function script(pick: number, vals: number[], then?: () => number) {
    let n = 0;
    const rand = () => { n++; if (n === 1) return pick; if (then && n > 1 + N) return then(); return vals[(n - 2) % N]; };
    return { rand, calls: () => n };
  }
  function solvedRoll() {
    const grid = Array.from({ length: 50 }, (_, k) => (k + 0.5) / 50);
    for (const L of LAYOUTS) {
      const pick = grid.find((p) => dealHex(script(p, Array(N).fill(0.5)).rand).L === L)!;
      for (const sol of solutions(L)) {
        const vals: number[] = [];
        for (let i = 0; i < N; i++) {
          const v = grid.find((c) => { const a = Array(N).fill(0.5); a[i] = c; return mod6(dealHex(script(pick, a).rand).turns[i]) === sol[i]; });
          if (v === undefined) break;
          vals.push(v);
        }
        if (vals.length === N) return { L, pick, vals };
      }
    }
    throw new Error('no dealable solved board');
  }

  it('re-deals when the first scramble comes out solved', () => {
    const { L, pick, vals } = solvedRoll();
    const s = script(pick, vals, seeded(3));
    const d = dealHex(s.rand);
    expect(s.calls()).toBeGreaterThan(1 + N);
    expect(d.L).toBe(L);
    expect(d.conn.sealed).toBe(false);
  });
  it('gives up re-dealing after a bounded number of tries', () => {
    const { L, pick, vals } = solvedRoll();
    const s = script(pick, vals); // every scramble comes out solved
    const d = dealHex(s.rand);
    expect(d.L).toBe(L);
    expect(s.calls()).toBeGreaterThan(1 + N);
  });
});

describe('Hex Lock game', () => {
  it('opens as a labelled dialog with twelve tiles', () => {
    const { game, tile } = start();
    expect(game.root.getAttribute('role')).toBe('dialog');
    for (let i = 0; i < N; i++) expect(tile(i)).toBeTruthy();
  });

  it('solving the board finishes as a win after the seal animation', () => {
    const s = start(2);
    const clicks = solve(s);
    expect(s.ctx.finish).not.toHaveBeenCalled();
    s.game.step(0.05);
    runOut(s.game, 0.05);
    expect(s.ctx.finish).toHaveBeenCalledTimes(1);
    const r = s.ctx.finish.mock.calls[0][0];
    expect(r.won).toBe(true);
    expect(r.moves).toBeGreaterThan(0);
    expect(r.moves).toBeLessThanOrEqual(clicks);
    expect(r.stars).toBeGreaterThanOrEqual(1);
    expect(r.stars).toBeLessThanOrEqual(5);
    expect(r.stars).toBe(hexStars(r.score));
    expect(r.score).toBe(hexScore(r.secs!, r.moves!));
  });

  it('ignores tile clicks and arrow keys once the seal is lit', () => {
    const plain = start(2);
    solve(plain);
    runOut(plain.game, 0.1);
    const s = start(2);
    solve(s);
    s.tile(0).focus();
    const before = document.activeElement;
    s.tile(0).click();
    s.game.key(key('Space'), true);
    const e = key('ArrowRight');
    s.game.key(e, true);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(before);
    runOut(s.game, 0.1);
    const r = s.ctx.finish.mock.calls[0][0];
    expect(r.won).toBe(true);
    expect(r.moves).toBe(plain.ctx.finish.mock.calls[0][0].moves);
  });

  it('a faster win earns at least as many stars as a slower one', () => {
    const fast = start(4);
    solve(fast);
    runOut(fast.game, 0.1);
    const slow = start(4);
    slow.game.step(HEX_TIME * 0.9);
    solve(slow);
    runOut(slow.game, 0.1);
    const a = fast.ctx.finish.mock.calls[0][0], b = slow.ctx.finish.mock.calls[0][0];
    expect(a.score).toBeGreaterThan(b.score);
    expect(a.stars).toBeGreaterThanOrEqual(b.stars);
  });

  it('an unsolved board never seals and runs out of time as a loss', () => {
    const { game, ctx } = start(3);
    expect(game.step(0.1)).toBe(true);
    expect(ctx.finish).not.toHaveBeenCalled();
    runOut(game, 0.5);
    expect(ctx.finish).toHaveBeenCalledTimes(1);
    expect(ctx.finish.mock.calls[0][0]).toMatchObject({ won: false, moves: 0 });
  });

  it('counts every rotation as a move, and a full turn restores the light', () => {
    const s = start(6);
    const i = safeTile(s.deal);
    const looks = () => [...Array(N).keys()].map((k) => s.tile(k).style.cssText);
    const before = looks();
    for (let k = 0; k < 6; k++) s.tile(i).click();
    expect(looks()).toEqual(before);
    s.game.step(HEX_TIME + 1);
    expect(s.ctx.finish.mock.calls[0][0]).toMatchObject({ won: false, moves: 6 });
  });

  it('arrow keys move the focus ring between tiles and stay on the board', () => {
    const { game } = start();
    const e = key('ArrowRight');
    game.key(e, true);
    expect(e.defaultPrevented).toBe(true);
    expect(focusedTile()).toBe(0); // first press lands on the first tile
    game.key(key('ArrowRight'), true);
    expect(focusedTile()).toBe(1);
    game.key(key('ArrowDown'), true);
    expect(focusedTile()).toBe(1 + COLS);
    game.key(key('KeyA'), true);
    game.key(key('KeyA'), true);
    game.key(key('ArrowLeft'), true);
    expect(focusedTile()).toBe(COLS); // clamped at the left edge
    game.key(key('KeyW'), true);
    game.key(key('ArrowUp'), true);
    expect(focusedTile()).toBe(0);
    for (let k = 0; k < 5; k++) { game.key(key('KeyD'), true); game.key(key('KeyS'), true); }
    expect(focusedTile()).toBe(N - 1); // clamped at the bottom-right corner
  });

  it('focusing a tile directly moves the ring there', () => {
    const { game, tile } = start();
    tile(6).focus();
    game.key(key('ArrowRight'), true);
    expect(focusedTile()).toBe(7);
  });

  it('Space and Enter turn the ringed tile only when pressed directly on the game', () => {
    const { game, ctx, tile, deal } = start(6);
    const i = safeTile(deal);
    // precondition: these turns never complete the route, so the round ends by time
    for (const d of [1, 2]) { const t = [...deal.turns]; t[0] += 1; t[i] += d; expect(hexConn(deal.L, t).sealed).toBe(false); }
    // no ring yet: Space turns the first tile
    const e1 = key('Space');
    game.key(e1, true);
    expect(e1.defaultPrevented).toBe(true);
    tile(i).focus();
    game.key(key('Enter'), true);
    game.key(key('', { key: ' ' }), true);
    // not counted: a held key, a key that reached a focused button, and an unrelated key
    game.key(key('Space', { repeat: true }), true);
    const indirect = key('Enter');
    game.key(indirect, false);
    expect(indirect.defaultPrevented).toBe(false);
    game.key(key('KeyX'), true);
    game.step(HEX_TIME + 1);
    expect(ctx.finish.mock.calls[0][0]).toMatchObject({ won: false, moves: 3 });
  });

  it('the close button quits through the trial context', () => {
    const { game, ctx } = start();
    (game.root.querySelector('button:not([data-hx])') as HTMLButtonElement).click();
    expect(ctx.close).toHaveBeenCalledTimes(1);
  });

  it('shrinks the puzzle to fit narrow screens', () => {
    const puzzleW = (w: number) => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
      const { tile } = start();
      return parseFloat(tile(0).parentElement!.parentElement!.parentElement!.style.width);
    };
    const wide = puzzleW(1600), narrow = puzzleW(360);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    expect(narrow).toBeLessThan(wide);
    expect(narrow).toBeGreaterThan(0);
  });

  it('still opens when the seal art is unavailable', async () => {
    vi.resetModules();
    vi.doMock('../../src/ui/crests.ts', () => ({ crestDataURL: () => { throw new Error('no art'); } }));
    try {
      const fresh = await import('../../src/trials/hex.ts');
      const g = fresh.createHex({ gate: false, close: vi.fn(), finish: vi.fn() });
      expect(g.root.querySelectorAll('[data-hx]')).toHaveLength(N);
    } finally {
      vi.doUnmock('../../src/ui/crests.ts');
      vi.resetModules();
    }
  });
});
