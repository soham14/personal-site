// Back-view hero grids (shown while climbing a ladder), derived programmatically from each tier's front v2 grid:
// the face becomes hair, front decorations (collar / tie / medallion) become robe, the cape (if any) hangs straight
// down over the back, and the arms are lifted (alternating 2-frame cycle while climbing, both half-raised when still).
import { legacy } from './legacy.ts';

type Grid = string[][];
export const BACK_FRAMES = 3; // 0 still, 1-2 climbing cycle

const FACE = new Set(['s', 'd', 'l', 'f', 'e', 'i', 'g', 'm', 'w']);
const DECOR = new Set(['y', 'W', 'Y']);
const HEAD0 = 19, HEAD1 = 30, HC0 = 8, HC1 = 27;            // face template rows / cols (same for every tier)
const ARM_ROWS: [number, number] = [36, 47];
const ARMS: [number, number][] = [[7, 10], [25, 28]];       // left / right sleeve + hand columns

const memo: Record<string, Grid> = {};

function majority(row: string[], c0: number, c1: number, skip: Set<string>): string {
  const n: Record<string, number> = {};
  for (let x = c0; x <= c1; x++) { const ch = row[x]; if (ch !== '.' && ch !== 'k' && !skip.has(ch)) n[ch] = (n[ch] || 0) + 1; }
  let best = '', bn = 0;
  for (const k in n) if (n[k] > bn) { best = k; bn = n[k]; }
  return best;
}

export function backGrid(tier: number, frame: number): Grid {
  const key = tier + ':' + frame;
  if (memo[key]) return memo[key];
  const S = legacy.v2Sprites()[tier];
  const src: Grid = frame === 0 ? S.layers.base.g : legacy.v2Pose(tier, frame === 1 ? 6 : 7);
  const g: Grid = src.map((r: string[]) => r.slice());
  const H = g.length;

  // 1. head: every face pixel becomes hair (darker at the outline edges and the nape, a few highlight strands)
  for (let y = HEAD0; y <= HEAD1 + 1; y++) for (let x = HC0; x <= HC1; x++) {
    const ch = g[y][x];
    if (!FACE.has(ch) && !(y >= HEAD0 && (ch === 'h' || ch === 'H' || ch === 'L'))) continue;
    const edge = g[y][x - 1] === 'k' || g[y][x + 1] === 'k' || g[y][x - 1] === '.' || g[y][x + 1] === '.';
    let c = edge || y >= HEAD1 - 1 ? 'H' : 'h';
    if (!edge && y < HEAD1 - 1 && (x === 13 || x === 17 || x === 22) && (y + x) % 3 === 0) c = 'L';
    if (y === HEAD1 + 1 && !FACE.has(ch)) continue;
    g[y][x] = c;
  }

  // 2. torso: collar / tie / medallion and see-through gaps become plain robe
  for (let y = 36; y <= 50; y++) {
    const row = g[y], robe = majority(row, 11, 24, DECOR);
    if (!robe) continue;
    let l = -1, r = -1;
    for (let x = 0; x < row.length; x++) if (row[x] === 'k' && x >= 9 && x <= 13 && l < 0) l = x;
    for (let x = row.length - 1; x >= 0; x--) if (row[x] === 'k' && x >= 22 && x <= 26 && r < 0) r = x;
    if (l < 0) l = 10;
    if (r < 0) r = 25;
    for (let x = l + 1; x < r; x++) if (DECOR.has(row[x]) || row[x] === '.' || (y >= 38 && y <= 45 && row[x] !== 'k')) row[x] = robe; // plain robe back (no chest emblem / strap)
  }

  // 3. lift arms out of the way (re-painted on top of the cape below)
  const arms = ARMS.map(([c0, c1]) => {
    const px: [number, number, string][] = [];
    for (let y = ARM_ROWS[0]; y <= ARM_ROWS[1]; y++) for (let x = c0; x <= c1; x++) {
      if (g[y][x] !== '.') px.push([x, y, g[y][x]]);
      g[y][x] = '.';
    }
    return px;
  });

  // 4. cape hangs straight down the back
  const cape = S.layers.cape;
  if (cape) {
    const cnt: Record<string, number> = {};
    for (const r of cape.g) for (const ch of r) if (ch !== '.') cnt[ch] = (cnt[ch] || 0) + 1;
    const ranked = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
    const main = ranked[0], edge = ranked[1] || 'k', fold = tier === 3 ? 'r' : main;
    const y0 = 37, y1 = 57;
    for (let y = y0; y <= y1; y++) {
      const hw = 7 + Math.round(((y - y0) / (y1 - y0)) * 3);
      const c0 = 18 - hw, c1 = 17 + hw;
      for (let x = c0; x <= c1; x++) {
        let c = x === c0 || x === c1 || y === y1 ? edge : main;
        if (c === main && (x - c0) % 5 === 3 && y > y0 + 1) c = fold;
        g[y][x] = c;
      }
      if (c0 - 1 >= 0) g[y][c0 - 1] = 'k';
      if (c1 + 1 < g[y].length) g[y][c1 + 1] = 'k';
    }
    for (let x = 18 - 10 - 1; x <= 17 + 10 + 1; x++) if (y1 + 1 < H) g[y1 + 1][x] = 'k';
  }

  // 5. arms back on top, raised: still = both up 2, climbing = alternate 4 / 1
  const lift = frame === 0 ? [2, 2] : frame === 1 ? [4, 1] : [1, 4];
  arms.forEach((px, i) => { for (const [x, y, c] of px) { const ty = y - lift[i]; if (ty >= 0) g[ty][x] = c; } });

  memo[key] = g;
  return g;
}

/** Run-length rows of a back grid, in grid units (same shape as legacy.v2Runs). */
export function backRuns(tier: number, frame: number): { x: number; y: number; w: number; c: string }[] {
  const S = legacy.v2Sprites()[tier], g = backGrid(tier, frame), out: { x: number; y: number; w: number; c: string }[] = [];
  for (let y = 0; y < g.length; y++) {
    const row = g[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') { x++; continue; }
      let e = x;
      while (e + 1 < row.length && row[e + 1] === ch) e++;
      out.push({ x, y, w: e - x + 1, c: S.pal[ch] });
      x = e + 1;
    }
  }
  return out;
}
