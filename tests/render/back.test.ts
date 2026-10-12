import { describe, it, expect } from 'vitest';
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
