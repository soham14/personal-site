import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { backGrid, backRuns, BACK_FRAMES, FACE, HEAD0, HEAD1, HC0, HC1, ARM_ROWS, ARM_LIFT } from '../../src/render/back.ts';
import { legacy } from '../../src/render/legacy.ts';

const SPRITES = legacy.v2Sprites();
const TIERS = SPRITES.map((_: unknown, i: number) => i) as number[];
const FRAMES = Array.from({ length: BACK_FRAMES }, (_, i) => i);
const CLIMB = FRAMES.filter((f) => f > 0);
const front = (tier: number): string[][] => SPRITES[tier].layers.base.g;

// Rows any walking/climbing leg pose redraws (compared with the still front grid).
function legRows(tier: number): Set<number> {
  const rows = new Set<number>();
  const base = front(tier);
  for (let pose = 1; pose <= 7; pose++) {
    legacy.v2Pose(tier, pose).forEach((r: string[], y: number) => r.forEach((c, x) => { if (c !== base[y][x]) rows.add(y); }));
  }
  return rows;
}
const diffRows = (a: string[][], b: string[][]) => {
  const rows = new Set<number>();
  a.forEach((r, y) => r.forEach((c, x) => { if (c !== b[y][x]) rows.add(y); }));
  return rows;
};

describe('backGrid', () => {
  it('has a still frame and a climbing cycle of at least two frames', () => {
    expect(BACK_FRAMES).toBeGreaterThanOrEqual(3);
    expect(ARM_LIFT).toHaveLength(BACK_FRAMES);
  });

  it.each(TIERS)('tier %i: every frame has the same dimensions as the front grid', (tier) => {
    const f = front(tier);
    FRAMES.forEach((frame) => {
      const g = backGrid(tier, frame);
      expect(g).toHaveLength(f.length);
      g.forEach((row, y) => expect(row).toHaveLength(f[y].length));
    });
  });

  it.each(TIERS)('tier %i: the head shows no face pixels from behind', (tier) => {
    FRAMES.forEach((frame) => {
      const g = backGrid(tier, frame);
      for (let y = HEAD0; y <= HEAD1 + 1; y++) for (let x = HC0; x <= HC1; x++) expect(FACE.has(g[y][x])).toBe(false);
    });
  });

  it.each(TIERS)('tier %i: the head outline (front grid face area) is kept and filled', (tier) => {
    const f = front(tier), g = backGrid(tier, 0);
    for (let y = HEAD0; y <= HEAD1; y++) for (let x = HC0; x <= HC1; x++) {
      if (f[y][x] === '.') continue;
      expect(g[y][x]).not.toBe('.');
    }
  });

  it.each(TIERS)('tier %i: climbing frames differ from the still frame only in the raised-arm band and the leg rows', (tier) => {
    const still = backGrid(tier, 0), legs = legRows(tier);
    const maxLift = Math.max(...ARM_LIFT.flat());
    CLIMB.forEach((frame) => {
      const rows = diffRows(backGrid(tier, frame), still);
      expect(rows.size).toBeGreaterThan(0);
      rows.forEach((y) => {
        const inArms = y >= ARM_ROWS[0] - maxLift && y <= ARM_ROWS[1];
        expect(inArms || legs.has(y)).toBe(true);
      });
    });
  });

  it.each(TIERS)('tier %i: the two climbing frames alternate the arms', (tier) => {
    const [a, b] = CLIMB;
    const rows = diffRows(backGrid(tier, a), backGrid(tier, b));
    const armRows = [...rows].filter((y) => y <= ARM_ROWS[1]);
    expect(armRows.length).toBeGreaterThan(0);
    // the lift pattern is mirrored between the two frames
    expect(ARM_LIFT[a]).toEqual([...ARM_LIFT[b]].reverse());
  });

  it('returns the same cached grid for repeated calls', () => {
    expect(backGrid(0, 1)).toBe(backGrid(0, 1));
  });
});

describe('backRuns', () => {
  it.each(TIERS)('tier %i: runs cover every non-empty cell exactly once with that cell\'s palette colour', (tier) => {
    const pal = SPRITES[tier].pal;
    FRAMES.forEach((frame) => {
      const g = backGrid(tier, frame);
      const seen = g.map((r) => r.map(() => 0));
      const runs = backRuns(tier, frame);
      runs.forEach((r) => {
        expect(r.w).toBeGreaterThan(0);
        for (let x = r.x; x < r.x + r.w; x++) {
          expect(g[r.y][x]).not.toBe('.');
          expect(pal[g[r.y][x]]).toBe(r.c);
          seen[r.y][x]++;
        }
      });
      g.forEach((row, y) => row.forEach((c, x) => expect(seen[y][x]).toBe(c === '.' ? 0 : 1)));
    });
  });

  it('each run is maximal: neighbouring cells outside it have a different character', () => {
    const g = backGrid(1, 0);
    backRuns(1, 0).forEach((r) => {
      const ch = g[r.y][r.x];
      for (let x = r.x; x < r.x + r.w; x++) expect(g[r.y][x]).toBe(ch);
      if (r.x > 0) expect(g[r.y][r.x - 1]).not.toBe(ch);
      if (r.x + r.w < g[r.y].length) expect(g[r.y][r.x + r.w]).not.toBe(ch);
    });
  });
});

// Edge cases the shipped sprites don't exercise, on tiny synthetic sprites (same grid size and template rows).
describe('with synthetic sprites', () => {
  const H = front(0).length, W = front(0)[0].length;
  const ROBE = 'n', CAPE = 'c', HAIR = 'h', SKIN = [...FACE][0];
  const sprite = (cape: boolean) => {
    const g: string[][] = Array.from({ length: H }, () => Array(W).fill('.'));
    // the row just below the face template: outline, a hair pixel, two face pixels, outline
    const y = HEAD1 + 1;
    g[y][HC0 + 2] = 'k'; g[y][HC0 + 3] = HAIR; g[y][HC0 + 4] = SKIN; g[y][HC0 + 5] = SKIN; g[y][HC0 + 6] = 'k';
    for (let r = ARM_ROWS[0]; r <= ARM_ROWS[1] + 3; r++) for (let x = 11; x <= 24; x++) g[r][x] = ROBE;
    const layers: Record<string, { g: string[][] }> = { base: { g } };
    if (cape) layers.cape = { g: [[CAPE, CAPE, '.']] }; // a one-colour cape
    return { layers, pal: { k: '#000', h: '#111', H: '#222', L: '#333', [SKIN]: '#444', n: '#555', c: '#666' } };
  };
  const fakes = [sprite(false), sprite(true)];
  let back: typeof import('../../src/render/back.ts');

  beforeAll(async () => {
    vi.resetModules();
    vi.doMock('../../src/render/legacy.ts', () => ({
      legacy: { v2Sprites: () => fakes, v2Pose: (tier: number) => fakes[tier].layers.base.g.map((r) => r.slice()) },
    }));
    back = await import('../../src/render/back.ts');
  });
  afterAll(() => { vi.doUnmock('../../src/render/legacy.ts'); vi.resetModules(); });

  it('below the face rows only face pixels turn into hair; existing hair is kept', () => {
    const g = back.backGrid(0, 0), y = HEAD1 + 1;
    expect(g[y][HC0 + 3]).toBe(HAIR);
    expect(FACE.has(g[y][HC0 + 4])).toBe(false);
    expect(FACE.has(g[y][HC0 + 5])).toBe(false);
    expect(g[y][HC0 + 4]).not.toBe('.');
  });

  it('a one-colour cape is drawn in that colour and outlined', () => {
    FRAMES.forEach((frame) => {
      const g = back.backGrid(1, frame);
      let runs = 0;
      g.forEach((row) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] !== CAPE || row[x - 1] === CAPE) continue;
          let e = x;
          while (row[e + 1] === CAPE) e++;
          runs++;
          expect(row[x - 1]).toBe('k');
          expect(row[e + 1]).toBe('k');
        }
      });
      expect(runs).toBeGreaterThan(0);
    });
  });
});
