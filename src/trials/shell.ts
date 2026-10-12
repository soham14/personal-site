import type { TrialKind } from '../content.ts';
import type { Pal } from './types.ts';
import { closeButton, el, fontP } from './dom.ts';

const CRIM = '#c8323a', CREAMT = '#f6ecd2';
export { CRIM, CREAMT };

export function palette(kind: TrialKind): Pal {
  if (kind === 'hex') return { bar: '#1d3a6b', tx: '#f2b632', x: '#f2b632', btn: '#1d3a6b', btnTx: '#f2b632', hi: '#2a4e8a', head: '#1d3a6b' };
  if (kind === 'stk') return { bar: '#2b2b2e', tx: '#c9ccd3', x: '#c9ccd3', btn: '#2b2b2e', btnTx: '#c9ccd3', hi: '#4a4a52', head: '#2b2b2e' };
  if (kind === 'lan') return { bar: '#2f7fd6', tx: '#0b1020', x: '#ffffff', btn: '#2f7fd6', btnTx: '#0b1020', hi: '#7fb8ff', head: '#1f5fa8' };
  return { bar: CRIM, tx: CREAMT, x: CREAMT, btn: CRIM, btnTx: CREAMT, hi: '#e0626a', head: '#a3262e' };
}

export const WIN = 'position:absolute;left:0;right:0;margin:0 auto;top:50%;transform:translateY(-50%);width:min(680px,94%);display:flex;flex-direction:column;box-sizing:border-box;background:#f4f1e8;border:3px solid #1b2040;box-shadow:inset 2px 2px 0 #fff,inset -2px -2px 0 #cfc8b2,6px 6px 0 #000;color:#1b2040;';

const frBtn = 'min-height:44px;padding:0 16px;' + fontP + 'font-size:16px;font-weight:700;border-radius:0;cursor:pointer;';
export const btnP = (P: Pal) => frBtn + 'color:' + P.btnTx + ';background:' + P.btn + ';border:3px solid #1b2040;box-shadow:inset 2px 2px 0 ' + P.hi + ',3px 3px 0 #1b2040;';
export const btnS = frBtn + 'color:#1b2040;background:#e6e0cd;border:3px solid #1b2040;box-shadow:inset 2px 2px 0 #fff,3px 3px 0 #1b2040;';

export function button(label: string, css: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', css, label) as HTMLButtonElement;
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

/** Title bar with the close X (fr.bar). */
export function titleBar(P: Pal, title: string, closeAria: string, onClose: () => void, xBorder = '#1b2040'): HTMLElement {
  const bar = el('div', 'flex:none;display:flex;align-items:center;justify-content:space-between;min-height:44px;padding-left:14px;background:' + P.bar + ';border-bottom:3px solid #1b2040;color:' + P.tx + ';' + fontP + 'font-size:17px;font-weight:700;letter-spacing:2px;');
  bar.appendChild(el('span', '', title));
  bar.appendChild(closeButton(closeAria, xBorder, P.x, onClose));
  return bar;
}

/** Standard cream trial window (fr.win). */
export function stdWindow(P: Pal, aria: string, title: string, closeAria: string, onClose: () => void): HTMLElement {
  const w = el('div', WIN);
  w.setAttribute('role', 'dialog');
  w.setAttribute('aria-label', aria);
  w.appendChild(titleBar(P, title, closeAria, onClose));
  return w;
}
