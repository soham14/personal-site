// Small DOM helpers for the trial windows: inline-style "part" lists (ported from the mockup's style-string render model)
// are written into reusable child elements so per-frame updates only touch what changed.

import { emit } from '../state.ts';

export const fontP = "font-family:'Pixelify Sans',monospace;";
export const SR = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
export const STARC = 'clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);';

export interface Part { s: string; t?: string }

/** A container whose children mirror a list of {style, text}. Children are reused by index. */
export class Layer {
  private kids: HTMLElement[] = [];
  private cache: string[] = [];
  private tcache: (string | undefined)[] = [];
  constructor(public el: HTMLElement, private make: (i: number) => HTMLElement = () => { const d = document.createElement('div'); d.setAttribute('aria-hidden', 'true'); return d; }) {}
  set(items: Part[]): void {
    for (let i = 0; i < items.length; i++) {
      let k = this.kids[i];
      if (!k) { k = this.make(i); this.kids[i] = k; this.el.appendChild(k); this.cache[i] = ''; }
      if (this.cache[i] !== items[i].s) { k.style.cssText = items[i].s; this.cache[i] = items[i].s; }
      if (this.tcache[i] !== items[i].t) { k.textContent = items[i].t || ''; this.tcache[i] = items[i].t; }
    }
    while (this.kids.length > items.length) { this.kids.pop()!.remove(); this.cache.pop(); this.tcache.pop(); }
  }
  child(i: number): HTMLElement | undefined { return this.kids[i]; }
}

export function el(tag: string, css = '', text = ''): HTMLElement {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (text) e.textContent = text;
  return e;
}

/** Set style only when changed. */
export function sty(e: HTMLElement, css: string): void {
  if ((e as any)._s !== css) { e.style.cssText = css; (e as any)._s = css; }
}
export function txt(e: HTMLElement, t: string): void {
  if (e.textContent !== t) e.textContent = t;
}

export function closeButton(aria: string, border: string, xColor: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('aria-label', aria);
  b.style.cssText = 'flex:none;width:44px;height:44px;padding:0;border:0;border-left:3px solid ' + border + ';background:' + border + ';cursor:pointer;display:flex;align-items:center;justify-content:center;';
  b.innerHTML = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges"><path d="M1 1 L13 13 M13 1 L1 13" style="stroke:' + xColor + ';stroke-width:3;fill:none;"/></svg>';
  b.addEventListener('click', onClick);
  return b;
}

export function lerpColor(a: string, b: string, t: number): string {
  const p = (h: string) => { const x = h.replace('#', ''); return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)]; };
  const A = p(a), B = p(b);
  return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
}

const bx = (x: number, b: number, w: number, h: number, bg: string, ex: string): Part =>
  ({ s: 'position:absolute;left:' + x + 'px;bottom:' + b + 'px;width:' + w + 'px;height:' + h + 'px;background:' + bg + ';' + ex });

/** Isometric-style cube from three flat faces. cols = [top, left, right]. */
export function isoCube(x: number, yb: number, W: number, cols: string[], an: string): Part[] {
  const h = Math.round(W * 0.68), hw = Math.round(W / 2), th = Math.round(W * 0.5);
  return [
    bx(x, yb, hw, h, cols[1], 'clip-path:polygon(0 0,100% 37%,100% 100%,0 63%);' + an),
    bx(x + hw, yb, hw, h, cols[2], 'clip-path:polygon(0 37%,100% 0,100% 63%,0 100%);' + an),
    bx(x, yb + Math.round(W * 0.43), W, th, cols[0], 'clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);' + an)
  ];
}

/** Same signature as the mockup's sfx(name, a, b, delay). */
export function sfx(name: string, a?: number, b?: number, delay?: number): void {
  emit('sfx', { name, a, b, delay });
}
export function log(text: string): void { emit('log', { text }); }

export function viewW(): number { return window.innerWidth || 1280; }
