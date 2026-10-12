import { describe, it, expect } from 'vitest';
import { crestDataURL } from '../../src/ui/crests.ts';
import { STAGES } from '../../src/content.ts';

const PREFIX = 'data:image/svg+xml;charset=utf-8,';
const svgOf = (url: string) => {
  expect(url.startsWith(PREFIX)).toBe(true);
  const doc = new DOMParser().parseFromString(decodeURIComponent(url.slice(PREFIX.length)), 'image/svg+xml');
  expect(doc.querySelector('parsererror')).toBeNull();
  return doc.documentElement;
};
const LOCKED = STAGES.length; // any index past the earned crests is the locked silhouette

describe('crestDataURL', () => {
  it('returns a valid SVG data URL for every stage crest and the locked crest', () => {
    for (let i = 0; i <= LOCKED; i++) {
      const svg = svgOf(crestDataURL(i));
      expect(svg.tagName).toBe('svg');
      expect(svg.children.length).toBeGreaterThan(0);
    }
  });
  it('draws a different crest for every stage', () => {
    const urls = new Set(Array.from({ length: LOCKED + 1 }, (_, i) => crestDataURL(i)));
    expect(urls.size).toBe(LOCKED + 1);
  });
  it('is taller with the ribbon than without', () => {
    for (let i = 0; i <= LOCKED; i++) {
      const withR = Number(svgOf(crestDataURL(i, true)).getAttribute('height'));
      const noR = Number(svgOf(crestDataURL(i, false)).getAttribute('height'));
      expect(withR).toBeGreaterThan(noR);
    }
  });
  it('drops the ribbon label when the ribbon is off', () => {
    for (let i = 0; i < LOCKED; i++) {
      const withR = svgOf(crestDataURL(i, true)).querySelectorAll('text').length;
      const noR = svgOf(crestDataURL(i, false)).querySelectorAll('text').length;
      expect(withR).toBeGreaterThan(noR);
    }
  });
  it('shows a question mark on the locked crest, ribbon or not', () => {
    for (const ribbon of [true, false]) {
      const texts = Array.from(svgOf(crestDataURL(LOCKED, ribbon)).querySelectorAll('text')).map((t) => t.textContent);
      expect(texts).toContain('?');
    }
  });
  it('returns the same URL on repeated calls', () => {
    expect(crestDataURL(1)).toBe(crestDataURL(1));
    expect(crestDataURL(1, false)).toBe(crestDataURL(1, false));
    expect(crestDataURL(1)).not.toBe(crestDataURL(1, false));
  });
});
