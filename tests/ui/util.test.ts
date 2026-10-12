import { describe, it, expect } from 'vitest';
import { esc, expPct, titleSkin, rgba } from '../../src/ui/util.ts';
import { setState } from '../../src/state.ts';
import { EXP_BASE, TRIALS } from '../../src/content.ts';

describe('esc', () => {
  it('escapes every HTML-special character', () => {
    const out = esc(`<a href="x" title='y'>Tom & Jerry</a>`);
    expect(out).not.toMatch(/[<>"']/);
    expect(out.replace(/&(amp|lt|gt|quot|#39);/g, '')).not.toContain('&');
  });
  it('round-trips through the HTML parser to the original text', () => {
    const raw = `5 < 6 & "quoted" 'single' > done`;
    const d = document.createElement('div');
    d.innerHTML = `<span title="${esc(raw)}">${esc(raw)}</span>`;
    const s = d.firstElementChild as HTMLElement;
    expect(s.textContent).toBe(raw);
    expect(s.getAttribute('title')).toBe(raw);
  });
  it('leaves plain text unchanged and stringifies non-strings', () => {
    expect(esc('plain text')).toBe('plain text');
    expect(esc(42 as unknown as string)).toBe('42');
  });
});

describe('expPct', () => {
  it('starts at the base value from content', () => {
    expect(expPct()).toBe(EXP_BASE);
  });
  it('rises with the Keep Leveling bonus', () => {
    setState({ expBonus: 1 });
    expect(expPct()).toBeGreaterThan(EXP_BASE);
  });
  it('is capped below 100 however large the bonus', () => {
    setState({ expBonus: 1e6 });
    const capped = expPct();
    setState({ expBonus: 2e6 });
    expect(expPct()).toBe(capped);
    expect(capped).toBeLessThan(100);
    expect(capped).toBeGreaterThan(EXP_BASE);
  });
});

describe('titleSkin', () => {
  const titles = Object.values(TRIALS).map((t) => t.title);
  it('returns a complete skin for every title', () => {
    for (const t of titles) {
      const k = titleSkin(t);
      expect(k.bg).toMatch(/^#/); expect(k.tx).toMatch(/^#/); expect(k.bd).toMatch(/^#/);
    }
  });
  it('falls back to a default skin for unknown titles', () => {
    expect(titleSkin('not a real title')).toEqual(titleSkin(''));
  });
  it('gives titles their own look rather than one shared skin', () => {
    const distinct = new Set(titles.map((t) => JSON.stringify(titleSkin(t))));
    expect(distinct.size).toBeGreaterThan(1);
  });
});

describe('rgba', () => {
  it('splits a hex colour into channels with the given alpha', () => {
    const [r, g, b] = [18, 52, 255];
    const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
    expect(rgba(hex, 0.5)).toBe(`rgba(${r},${g},${b},0.5)`);
  });
  it('handles black and white', () => {
    expect(rgba('#000000', 1)).toBe('rgba(0,0,0,1)');
    expect(rgba('#ffffff', 0)).toBe('rgba(255,255,255,0)');
  });
});
