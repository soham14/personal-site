import { describe, it, expect, vi } from 'vitest';
import { popScale, POP_REF_H, installPopScale, installBlurAfterClick } from '../src/app.ts';

describe('popScale', () => {
  it('is 1 when the screen is tall enough for the tallest pop-up', () => {
    expect(popScale(POP_REF_H + 16)).toBe(1);
    expect(popScale(POP_REF_H * 3)).toBe(1);
  });
  it('shrinks on shorter screens and never exceeds 1', () => {
    const short = popScale(POP_REF_H / 2), shorter = popScale(POP_REF_H / 3);
    expect(short).toBeLessThan(1);
    expect(shorter).toBeLessThan(short);
  });
  it('is rounded down to two decimals', () => {
    const z = popScale(401);
    expect(Math.round(z * 100) / 100).toBe(z);
    expect(z).toBeLessThanOrEqual((401 - 16) / POP_REF_H);
  });
});

describe('installPopScale', () => {
  it('sets --pz now and again on resize', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 2000 });
    installPopScale(window);
    expect(document.documentElement.style.getPropertyValue('--pz')).toBe('1');
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: POP_REF_H / 2 });
    window.dispatchEvent(new Event('resize'));
    expect(Number(document.documentElement.style.getPropertyValue('--pz'))).toBeLessThan(1);
  });
});

describe('installBlurAfterClick', () => {
  const setup = () => {
    document.body.innerHTML = '<button id="b">x</button><div role="dialog"><button id="d">y</button></div><span id="s" tabindex="0">z</span>';
    installBlurAfterClick(document);
  };
  const click = (el: HTMLElement, detail: number) => { el.focus(); el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail })); };

  it('drops focus from a button after a mouse/touch click', () => {
    vi.useFakeTimers(); setup();
    const b = document.getElementById('b')!; click(b, 1); vi.runAllTimers();
    expect(document.activeElement).not.toBe(b);
    vi.useRealTimers();
  });
  it('keeps focus after keyboard activation', () => {
    vi.useFakeTimers(); setup();
    const b = document.getElementById('b')!; click(b, 0); vi.runAllTimers();
    expect(document.activeElement).toBe(b);
    vi.useRealTimers();
  });
  it('keeps focus on controls inside dialogs and on non-buttons', () => {
    vi.useFakeTimers(); setup();
    const d = document.getElementById('d')!; click(d, 1); vi.runAllTimers();
    expect(document.activeElement).toBe(d);
    const s = document.getElementById('s')!; click(s, 1); vi.runAllTimers();
    expect(document.activeElement).toBe(s);
    vi.useRealTimers();
  });
});
