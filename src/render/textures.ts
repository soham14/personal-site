// Sprite + crest textures. The v2 pixel grids (hero per tier, leg poses, mentors) and the crests come straight from the
// mockup (see legacy.ts); here they are painted to canvases, for Phaser textures and for the DOM UI.
import * as Phaser from 'phaser';
import { legacy } from './legacy.ts';
import { paintCss } from './css.ts';
import { backRuns, BACK_FRAMES } from './back.ts';

export const HERO_W = 56, HERO_H = 72; // the mockup's sprite box
export const POSES = 8;                // 0 idle, 1-4 walk cycle, 5 jump tuck, 6-7 ladder

export interface Crop { w: number; h: number; l: number; t: number }

interface V2Sprite {
  W: number; H: number; pal: Record<string, string>;
  layers: Record<string, { g: string[][]; x: number; y: number }>;
  capePivot?: [number, number]; tailPivot?: [number, number];
  blink: [number, number, number, number, string][];
  ring: string; ring2: string; rune: string;
}

export function v2Sprite(tier: number): V2Sprite { return legacy.v2Sprites()[tier]; }
export function v2Box(tier: number): { P: number; W: number; H: number; ox: number; oy: number } { return legacy.v2Box(tier); }
/** Head-and-shoulders crop window for portraits (same as the mockup's v2Crop). */
export function heroCrop(tier: number, k: number, w: number, h: number): Crop {
  const b = v2Box(tier);
  return { w, h, l: Math.round((w - b.W * b.P * k) / 2 - b.ox * k), t: Math.round(-(b.oy + 4 * b.P) * k) };
}

function mkCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return [c, c.getContext('2d')!];
}

/** Paint one hero layer ('base' | 'cape' | 'tail') into ctx, in 56x72 box units (caller scales). */
export function drawHeroLayer(ctx: CanvasRenderingContext2D, tier: number, layer: string, pose = 0) {
  const S = v2Sprite(tier);
  if (!S.layers[layer]) return;
  const B = v2Box(tier), P = B.P;
  for (const r of legacy.v2Runs(tier, layer, layer === 'base' ? pose : 0) as { x: number; y: number; w: number; c: string }[]) {
    ctx.fillStyle = r.c;
    ctx.fillRect(B.ox + r.x * P, B.oy + r.y * P, r.w * P + 0.35, P + 0.35);
  }
}

function boxCanvas(k: number, crop: Crop | undefined, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const w = crop ? crop.w : Math.round(HERO_W * k), h = crop ? crop.h : Math.round(HERO_H * k);
  const [c, ctx] = mkCanvas(w, h);
  if (crop) ctx.translate(crop.l, crop.t);
  ctx.scale(k, k);
  draw(ctx);
  return c;
}

/** The player sprite (no aura) at scale k, optionally cropped like the mockup's portraits. For the DOM UI. */
export function heroCanvas(tier: number, k = 1, opts: { pose?: number; crop?: Crop } = {}): HTMLCanvasElement {
  return boxCanvas(k, opts.crop, (ctx) => {
    drawHeroLayer(ctx, tier, 'cape');
    drawHeroLayer(ctx, tier, 'base', opts.pose || 0);
    drawHeroLayer(ctx, tier, 'tail');
  });
}

/** Mentor sprite (0 Hug, 1 Amelia, 2 Tirumal, 3 Darragh) at scale k. */
export function drawNpc(ctx: CanvasRenderingContext2D, i: number) {
  const S = legacy.npcSprites()[i] as { rows: string[]; pal: Record<string, string> };
  const P = 1.25, W = 36, H = 60, ox = (HERO_W - W * P) / 2, oy = HERO_H - H * P;
  S.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') { x++; continue; }
      let e = x;
      while (e + 1 < row.length && row[e + 1] === ch) e++;
      ctx.fillStyle = S.pal[ch];
      ctx.fillRect(ox + x * P, oy + y * P, (e - x + 1) * P + 0.02, P + 0.02);
      x = e + 1;
    }
  });
}
export function npcCanvas(i: number, k = 1, crop?: Crop): HTMLCanvasElement {
  return boxCanvas(k, crop, (ctx) => drawNpc(ctx, i));
}

/** Crest (0-3 earned crests, 4 = locked "?") in its 100x100 (116 with ribbon) box, scaled by k. */
export function crestCanvas(kind: number, k = 1, ribbon = true): HTMLCanvasElement {
  const H = ribbon ? 116 : 100;
  const [c, ctx] = mkCanvas(100 * k, H * k);
  ctx.scale(k, k);
  for (const p of legacy.crestRaw(kind) as { l: number; t: number; w: number; h: number; bg: string; ex: string; txt: string; rib: boolean }[]) {
    if (p.rib && !ribbon) continue;
    paintCss(ctx, 'left:' + p.l + 'px;top:' + p.t + 'px;width:' + p.w + 'px;height:' + p.h + 'px;background:' + p.bg + ';' + p.ex, { x: 0, y: 0, w: 100, h: H }, p.txt);
  }
  return c;
}
export function crestDataURL(kind: number, k = 1, ribbon = true): string {
  return crestCanvas(kind, k, ribbon).toDataURL();
}

/** The floating spellbook beside the hero (tier-specific), drawn at its box position. Returns its bounds in box units. */
export function drawBook(ctx: CanvasRenderingContext2D, tier: number) {
  const B = v2Box(tier), P = B.P, k = 0.2;
  const bk = legacy.bookData(tier) as { w: number; c: any[][]; pg: any[]; top?: any[][] };
  const l = B.ox + 8 * P - bk.w * k - 0.5, t = B.oy + 36 * P;
  const part = (q: any[]) => paintCss(ctx, 'left:' + (l + q[0] * k) + 'px;top:' + (t + q[1] * k) + 'px;width:' + Math.max(0.8, q[2] * k) + 'px;height:' + Math.max(0.8, q[3] * k) + 'px;background:' + q[4] + ';' + (q[5] || ''), { x: 0, y: 0, w: HERO_W, h: HERO_H });
  bk.c.forEach(part);
  part(bk.pg);
  (bk.top || []).forEach(part);
}

/**
 * Register every sprite texture with Phaser:
 *   hero-{tier}-base-{pose}, hero-{tier}-back-{0 still|1-2 climb}, hero-{tier}-cape, hero-{tier}-tail, hero-{tier}-book, npc-{i}
 * Textures are painted at `res` pixels per CSS pixel (default 2 for crisp edges) and displayed at 1/res.
 */
export const TEX_RES = 2;
export function buildSpriteTextures(scene: Phaser.Scene) {
  const add = (key: string, c: HTMLCanvasElement) => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, c);
  };
  for (let t = 0; t < 4; t++) {
    for (let p = 0; p < POSES; p++) {
      add('hero-' + t + '-base-' + p, boxCanvas(TEX_RES, undefined, (ctx) => drawHeroLayer(ctx, t, 'base', p)));
    }
    const S = v2Sprite(t);
    if (S.layers.cape) add('hero-' + t + '-cape', boxCanvas(TEX_RES, undefined, (ctx) => drawHeroLayer(ctx, t, 'cape')));
    if (S.layers.tail) add('hero-' + t + '-tail', boxCanvas(TEX_RES, undefined, (ctx) => drawHeroLayer(ctx, t, 'tail')));
    for (let f = 0; f < BACK_FRAMES; f++) add('hero-' + t + '-back-' + f, boxCanvas(TEX_RES, undefined, (ctx) => {
      const B = v2Box(t), P = B.P;
      for (const r of backRuns(t, f)) { ctx.fillStyle = r.c; ctx.fillRect(B.ox + r.x * P, B.oy + r.y * P, r.w * P + 0.35, P + 0.35); }
    }));
    add('hero-' + t + '-book', boxCanvas(TEX_RES, undefined, (ctx) => drawBook(ctx, t)));
  }
  for (let i = 0; i < 4; i++) add('npc-' + i, npcCanvas(i, TEX_RES));
}
