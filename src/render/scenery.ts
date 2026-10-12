// Turns the mockup's scenery box lists (legacy.world / legacy.layers) into Phaser objects:
// static boxes are painted into a few large canvas chunks, animated boxes get their own small texture
// and are driven per frame by the mockup's keyframes (twinkle, drift, fog, rise, ember, pulse, glowp, bob).
import * as Phaser from 'phaser';
import { parseCss, resolveRect, paintBox, parseAnims, evalAnims, type AnimSpec, type AnimOut, type Css, type Rect } from './css.ts';

export interface BoxItem { s: string; t?: string; children?: { s: string; t?: string }[] }

export interface Animated {
  obj: Phaser.GameObjects.Image;
  x: number; y: number;      // base position of the image centre (container coords)
  anims: AnimSpec[];
  /** screen-space items: re-resolved against the stage size */
  css?: Css; pad?: number;
}

let texN = 0;
const PAD = 18;

function canvasTex(scene: Phaser.Scene, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, prefix = 'box'): string {
  const key = prefix + '-' + (texN++);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  draw(c.getContext('2d')!);
  scene.textures.addCanvas(key, c);
  return key;
}

/** A single box painted into its own texture (with padding for shadow rings). Returns the key and the rect used. */
export function boxTexture(scene: Phaser.Scene, c: Css, R: Rect, text?: string, children?: BoxItem['children']): string {
  return canvasTex(scene, R.w + PAD * 2, R.h + PAD * 2, (ctx) => {
    paintBox(ctx, c, { x: PAD, y: PAD, w: R.w, h: R.h }, { text, children, ignoreTransform: false });
  });
}

/**
 * Build a layer from bottom-anchored boxes. The layer's own coordinate frame: x from X0 (left edge) to X0 + width,
 * y measured upwards from the layer bottom ("bottom:" in CSS). Objects are added to `into` with the layer bottom at y = 0.
 * Returns the animated items (the caller ticks them).
 */
export function buildBoxLayer(scene: Phaser.Scene, into: Phaser.GameObjects.Container, items: BoxItem[], X0: number, width: number, HH: number, layoutH = HH): Animated[] {
  const frame: Rect = { x: -X0, y: HH - layoutH, w: width, h: layoutH }; // CSS parent box inside the canvas
  const statics: { c: Css; R: Rect; it: BoxItem }[] = [];
  const anims: Animated[] = [];
  for (const it of items) {
    const c = parseCss(it.s);
    if (c.display === 'none') continue;
    const R = resolveRect(c, frame);
    const al = parseAnims(c);
    if (al.length) {
      const key = boxTexture(scene, c, R, it.t, it.children);
      const img = scene.add.image(0, 0, key);
      const x = R.x + X0 + R.w / 2, y = R.y - HH + R.h / 2;
      img.setPosition(x, y);
      into.add(img);
      anims.push({ obj: img, x, y, anims: al });
    } else statics.push({ c, R, it });
  }
  // static chunks (painted in order); chunk width keeps textures well under GPU limits
  const CW = 1024;
  const chunks: Phaser.GameObjects.Image[] = [];
  for (let cx = 0; cx < width; cx += CW) {
    const w = Math.min(CW, width - cx);
    const key = canvasTex(scene, w, HH, (ctx) => {
      ctx.translate(-cx, 0);
      for (const s of statics) {
        if (s.R.x > cx + w + 40 || s.R.x + s.R.w < cx - 40) continue;
        paintBox(ctx, s.c, s.R, { text: s.it.t, children: s.it.children });
      }
    }, 'chunk');
    const img = scene.add.image(X0 + cx, 0, key).setOrigin(0, 1);
    chunks.push(img);
  }
  // statics go underneath this layer's animated items
  into.addAt(chunks, into.list.length - anims.length);
  return anims;
}

/** Screen-space boxes (stars, stage particles): positioned against the stage size on every layout(). */
export function buildScreenItems(scene: Phaser.Scene, into: Phaser.GameObjects.Container, items: BoxItem[]): Animated[] {
  return items.map((it) => {
    const c = parseCss(it.s);
    const R = resolveRect(c, { x: 0, y: 0, w: 1000, h: 1000 });
    const key = boxTexture(scene, c, R, it.t);
    const img = scene.add.image(0, 0, key);
    into.add(img);
    return { obj: img, x: 0, y: 0, anims: parseAnims(c), css: c, pad: PAD };
  });
}
export function layoutScreenItems(list: Animated[], W: number, H: number) {
  for (const a of list) {
    if (!a.css) continue;
    const R = resolveRect(a.css, { x: 0, y: 0, w: W, h: H });
    a.x = Math.round(R.x) + R.w / 2; a.y = Math.round(R.y) + R.h / 2;
  }
}

const tmp: AnimOut = { dx: 0, dy: 0, alpha: 1, scale: 1, rot: 0 };
export function tickAnimated(list: Animated[], t: number) {
  for (const a of list) {
    if (!a.anims.length) { a.obj.setPosition(a.x, a.y); continue; }
    evalAnims(a.anims, t, tmp);
    a.obj.setPosition(a.x + tmp.dx, a.y + tmp.dy);
    a.obj.setAlpha(tmp.alpha);
    a.obj.setScale(tmp.scale);
    a.obj.setRotation(tmp.rot);
  }
}

/** A text label painted to a texture (name tags, prompts, markers). Width is measured from the text when not given. */
export function labelTexture(scene: Phaser.Scene, text: string, style: string, padX: number, h: number, fontSpec: string, ls = 0): { key: string; w: number; h: number } {
  const m = document.createElement('canvas').getContext('2d')!;
  m.font = fontSpec;
  try { (m as any).letterSpacing = ls + 'px'; } catch (e) { /* ignore */ }
  const w = Math.ceil(m.measureText(text).width) + padX * 2;
  const c = parseCss('left:0;top:0;width:' + w + 'px;height:' + h + 'px;' + style);
  const key = boxTexture(scene, c, { x: 0, y: 0, w, h }, text);
  return { key, w, h };
}
export const LABEL_PAD = PAD;
