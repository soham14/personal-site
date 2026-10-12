import { describe, it, expect, vi } from 'vitest';
import { state, setState, subscribe, inputLocked, on, emit, resetState } from '../src/state.ts';

describe('setState', () => {
  it('merges the patch into state and leaves other fields alone', () => {
    const before = { ...state };
    setState({ px: before.px + 10, musicOn: !before.musicOn });
    expect(state.px).toBe(before.px + 10);
    expect(state.musicOn).toBe(!before.musicOn);
    expect(state.zone).toBe(before.zone);
    expect(state.titles).toBe(before.titles);
  });

  it('notifies every subscriber once per update, after the change is applied', () => {
    const seen: number[] = [];
    const a = vi.fn(() => seen.push(state.zone));
    const b = vi.fn();
    subscribe(a);
    subscribe(b);
    setState({ zone: 2 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([2]);
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const fn = vi.fn();
    const off = subscribe(fn);
    setState({ near: 1 });
    off();
    setState({ near: 2 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('inputLocked', () => {
  it('is false when no overlay is open and nothing is paused', () => {
    expect(inputLocked()).toBe(false);
  });

  it.each([
    ['a dialogue (even with mentor 0)', { talk: 0 }],
    ['the portal dialogue', { talk: 4 }],
    ['the profile', { profileOpen: true }],
    ['the résumé', { resumeOpen: true }],
    ['a trial', { trial: { kind: 'hex' as const, phase: 'prompt' as const, gate: true } }],
    ['the advancement pause', { paused: true }],
  ])('is true while %s is open', (_name, patch) => {
    setState(patch);
    expect(inputLocked()).toBe(true);
  });
});

describe('event bus', () => {
  it('delivers the payload to every handler of that event only', () => {
    const log = vi.fn(), log2 = vi.fn(), other = vi.fn();
    on('log', log);
    on('log', log2);
    on('sealed', other);
    emit('log', { text: 'hi' });
    expect(log).toHaveBeenCalledWith({ text: 'hi' });
    expect(log2).toHaveBeenCalledWith({ text: 'hi' });
    expect(other).not.toHaveBeenCalled();
  });

  it('sends an empty payload when none is given', () => {
    const fn = vi.fn();
    on('jump', fn);
    emit('jump');
    expect(fn).toHaveBeenCalledWith({});
  });

  it('does nothing when an event has no handlers', () => {
    expect(() => emit('advance', { tier: 1 })).not.toThrow();
  });

  it('stops calling a handler after it is removed', () => {
    const fn = vi.fn();
    const off = on('sfx', fn);
    emit('sfx', { name: 'a' });
    off();
    emit('sfx', { name: 'b' });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('resetState', () => {
  it('restores the initial values and drops listeners and handlers', () => {
    const initial = JSON.parse(JSON.stringify(state));
    const listener = vi.fn(), handler = vi.fn();
    subscribe(listener);
    on('log', handler);
    setState({ px: initial.px + 500, titles: ['x'], talk: 2 });
    (state as any).extra = true;
    listener.mockClear();

    resetState();
    expect(JSON.parse(JSON.stringify(state))).toEqual(initial);
    expect('extra' in state).toBe(false);
    setState({ px: 1 });
    emit('log', { text: 'x' });
    expect(listener).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });
});
