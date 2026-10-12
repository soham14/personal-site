import { describe, it, expect, vi } from 'vitest';
import { palette, btnP, btnS, button, titleBar, stdWindow } from '../../src/trials/shell.ts';
import { TRIALS, type TrialKind } from '../../src/content.ts';

const kinds = Object.keys(TRIALS) as TrialKind[];
const KEYS = ['bar', 'tx', 'x', 'btn', 'btnTx', 'hi', 'head'];

describe('palette', () => {
  it('gives every trial kind a complete palette', () => {
    for (const k of kinds) {
      const P = palette(k);
      expect(Object.keys(P).sort()).toEqual([...KEYS].sort());
      for (const key of KEYS) expect((P as any)[key]).toMatch(/\S/);
    }
  });
  it('gives each trial kind its own colours', () => {
    const bars = kinds.map((k) => JSON.stringify(palette(k)));
    expect(new Set(bars).size).toBe(kinds.length);
  });
});

describe('buttons', () => {
  it('primary button style uses the palette button colours', () => {
    const P = palette(kinds[0]);
    const css = btnP(P);
    expect(css).toContain(P.btn);
    expect(css).toContain(P.btnTx);
    expect(btnS).not.toBe(css);
  });
  it('button() makes a labelled button that calls its handler', () => {
    const onClick = vi.fn();
    const b = button('Go', btnS, onClick);
    expect(b.tagName).toBe('BUTTON');
    expect(b.type).toBe('button');
    expect(b.textContent).toBe('Go');
    b.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('titleBar', () => {
  it('shows the title and a labelled close button that calls onClose', () => {
    const onClose = vi.fn();
    const bar = titleBar(palette(kinds[0]), 'MY TRIAL', 'Quit trial', onClose);
    expect(bar.textContent).toContain('MY TRIAL');
    const x = bar.querySelector('button')!;
    expect(x.getAttribute('aria-label')).toBe('Quit trial');
    x.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('accepts a custom border colour for the close button', () => {
    const plain = titleBar(palette(kinds[0]), 'T', 'Quit', () => {}).querySelector('button')!;
    const custom = titleBar(palette(kinds[0]), 'T', 'Quit', () => {}, '#123456').querySelector('button')!;
    expect(custom.style.cssText).not.toBe(plain.style.cssText);
  });
});

describe('stdWindow', () => {
  it('is a labelled dialog that starts with the title bar', () => {
    const onClose = vi.fn();
    const w = stdWindow(palette(kinds[1]), 'Some Trial', 'SOME TRIAL', 'Quit Some Trial', onClose);
    expect(w.getAttribute('role')).toBe('dialog');
    expect(w.getAttribute('aria-label')).toBe('Some Trial');
    expect(w.children).toHaveLength(1);
    expect(w.firstElementChild!.textContent).toContain('SOME TRIAL');
    (w.querySelector('button[aria-label="Quit Some Trial"]') as HTMLButtonElement).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
