import { describe, it, expect, vi } from 'vitest';
import { Layer, el, sty, txt, closeButton, lerpColor, isoCube, sfx, log, viewW } from '../../src/trials/dom.ts';
import { on } from '../../src/state.ts';

const rgb = (s: string) => s.match(/\d+/g)!.map(Number);

describe('el', () => {
  it('creates an element with the given style and text', () => {
    const e = el('span', 'color: red;', 'hello');
    expect(e.tagName).toBe('SPAN');
    expect(e.style.color).toBe('red');
    expect(e.textContent).toBe('hello');
  });
  it('leaves style and text empty when none are given', () => {
    const e = el('div');
    expect(e.getAttribute('style')).toBeNull();
    expect(e.textContent).toBe('');
  });
});

describe('sty', () => {
  it('applies a new style', () => {
    const e = el('div');
    sty(e, 'color: red;');
    expect(e.style.color).toBe('red');
    sty(e, 'color: blue;');
    expect(e.style.color).toBe('blue');
  });
  it('does not rewrite the element when the style string is unchanged', () => {
    const e = el('div');
    sty(e, 'color: red;');
    e.style.width = '5px'; // a change made elsewhere survives a repeated identical sty()
    sty(e, 'color: red;');
    expect(e.style.width).toBe('5px');
  });
});

describe('txt', () => {
  it('sets text, and leaves the node alone when the text is unchanged', () => {
    const e = el('div');
    txt(e, 'a');
    expect(e.textContent).toBe('a');
    const node = e.firstChild;
    txt(e, 'a');
    expect(e.firstChild).toBe(node);
    txt(e, 'b');
    expect(e.textContent).toBe('b');
  });
});

describe('Layer', () => {
  it('creates one hidden child per part with its style and text', () => {
    const host = el('div');
    const L = new Layer(host);
    L.set([{ s: 'color: red;', t: 'x' }, { s: 'color: blue;' }]);
    expect(host.children).toHaveLength(2);
    expect(L.child(0)!.style.color).toBe('red');
    expect(L.child(0)!.textContent).toBe('x');
    expect(L.child(1)!.style.color).toBe('blue');
    expect(L.child(1)!.textContent).toBe('');
    expect(L.child(0)!.getAttribute('aria-hidden')).toBe('true');
  });
  it('reuses children by index and only updates what changed', () => {
    const host = el('div');
    const L = new Layer(host);
    L.set([{ s: 'color: red;', t: 'x' }]);
    const first = L.child(0)!;
    first.style.width = '5px';
    L.set([{ s: 'color: red;', t: 'x' }]);
    expect(L.child(0)).toBe(first);
    expect(first.style.width).toBe('5px'); // style untouched because it did not change
    L.set([{ s: 'color: green;', t: 'y' }]);
    expect(L.child(0)).toBe(first);
    expect(first.style.color).toBe('green');
    expect(first.textContent).toBe('y');
    L.set([{ s: 'color: green;' }]);
    expect(first.textContent).toBe('');
  });
  it('removes extra children when the list shrinks', () => {
    const host = el('div');
    const L = new Layer(host);
    L.set([{ s: '' }, { s: '' }, { s: '' }]);
    L.set([{ s: 'color: red;' }]);
    expect(host.children).toHaveLength(1);
    expect(L.child(1)).toBeUndefined();
    L.set([]);
    expect(host.children).toHaveLength(0);
  });
  it('builds children with a custom factory', () => {
    const host = el('div');
    const make = vi.fn((i: number) => { const b = document.createElement('button'); b.dataset.i = String(i); return b; });
    const L = new Layer(host, make);
    L.set([{ s: '' }, { s: '' }]);
    L.set([{ s: '' }, { s: '' }]);
    expect(make).toHaveBeenCalledTimes(2);
    expect(L.child(1)!.tagName).toBe('BUTTON');
    expect(L.child(1)!.dataset.i).toBe('1');
  });
});

describe('closeButton', () => {
  it('is a labelled button that calls its handler when clicked', () => {
    const onClick = vi.fn();
    const b = closeButton('Quit', '#000000', '#ffffff', onClick);
    expect(b.type).toBe('button');
    expect(b.getAttribute('aria-label')).toBe('Quit');
    b.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('lerpColor', () => {
  it('returns the start colour at 0 and the end colour at 1', () => {
    expect(rgb(lerpColor('#102030', '#f0e0d0', 0))).toEqual([0x10, 0x20, 0x30]);
    expect(rgb(lerpColor('#102030', '#f0e0d0', 1))).toEqual([0xf0, 0xe0, 0xd0]);
  });
  it('blends each channel halfway at 0.5', () => {
    const [r, g, b] = rgb(lerpColor('#000000', '#ff8040', 0.5));
    expect(Math.abs(r - 0xff / 2)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(g - 0x80 / 2)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(b - 0x40 / 2)).toBeLessThanOrEqual(0.5);
  });
  it('accepts colours with or without a leading #', () => {
    expect(lerpColor('102030', 'f0e0d0', 0.3)).toBe(lerpColor('#102030', '#f0e0d0', 0.3));
  });
});

describe('isoCube', () => {
  it('returns three faces using the top, left and right colours', () => {
    const parts = isoCube(10, 20, 40, ['#aaaaaa', '#bbbbbb', '#cccccc'], 'opacity:1;');
    expect(parts).toHaveLength(3);
    for (const c of ['#aaaaaa', '#bbbbbb', '#cccccc']) expect(parts.some((p) => p.s.includes(c))).toBe(true);
    for (const p of parts) expect(p.s).toContain('opacity:1;');
  });
  it('moves with its x position', () => {
    const left = (x: number) => isoCube(x, 0, 40, ['#aaaaaa', '#bbbbbb', '#cccccc'], '').map((p) => Number(p.s.match(/left:(-?[\d.]+)px/)![1]));
    const a = left(0), b = left(25);
    a.forEach((v, i) => expect(b[i] - v).toBe(25));
  });
});

describe('sfx and log', () => {
  it('emit sound and log events with their arguments', () => {
    const sounds: any[] = [], logs: any[] = [];
    on('sfx', (p) => sounds.push(p));
    on('log', (p) => logs.push(p));
    sfx('ding', 1, 2, 0.5);
    sfx('plain');
    log('hello');
    expect(sounds).toEqual([{ name: 'ding', a: 1, b: 2, delay: 0.5 }, { name: 'plain', a: undefined, b: undefined, delay: undefined }]);
    expect(logs).toEqual([{ text: 'hello' }]);
  });
});

describe('viewW', () => {
  it('reports the window width', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 777 });
    expect(viewW()).toBe(777);
  });
  it('falls back to a positive width when the window reports none', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 0 });
    expect(viewW()).toBeGreaterThan(0);
  });
});
