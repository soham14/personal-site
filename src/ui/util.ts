import { state } from '../state.ts';
import { EXP_BASE } from '../content.ts';

export const ACC = '#ffd166';
export const FP = "font-family:'Pixelify Sans',monospace;";

export function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** "To next advancement" percent: EXP_BASE nudged by Keep Leveling, never reaching 100. */
export function expPct(): number {
  return Math.min(99, EXP_BASE + (state.expBonus || 0));
}

/** Title chip colours per title (mockup titleSkin). */
export function titleSkin(t: string): { bg: string; tx: string; bd: string } {
  if (t === 'Seal Breaker') return { bg: '#f2b632', tx: '#1d3a6b', bd: '#1b2040' };
  if (t === 'Lamplighter') return { bg: '#2f7fd6', tx: '#f4f8ff', bd: '#ffb454' };
  if (t === 'Always Growing') return { bg: '#c9ccd3', tx: '#2b2b2e', bd: '#2b2b2e' };
  return { bg: '#c8323a', tx: '#f6ecd2', bd: '#1b2040' };
}

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
