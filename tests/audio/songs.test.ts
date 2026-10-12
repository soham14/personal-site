import { describe, it, expect } from 'vitest';
import { seq, songs } from '../../src/audio/songs.ts';
import { MAPS } from '../../src/content.ts';

describe('seq', () => {
  it('turns note tokens into [step, note, length, velocity] events laid end to end', () => {
    const ev = seq('C4:2 E4:3 G4:1', 0.7);
    expect(ev.map((e) => e[1])).toEqual(['C4', 'E4', 'G4']);
    expect(ev.map((e) => e[2])).toEqual([2, 3, 1]);
    ev.forEach((e) => expect(e[3]).toBe(0.7));
    expect(ev[0][0]).toBe(0);
    for (let i = 1; i < ev.length; i++) expect(ev[i][0]).toBe(ev[i - 1][0] + ev[i - 1][2]);
  });

  it('rests take time but produce no event', () => {
    const ev = seq('_:4 A4:2 _:3 B4:1', 1);
    expect(ev.map((e) => e[1])).toEqual(['A4', 'B4']);
    expect(ev[0][0]).toBe(4);
    expect(ev[1][0]).toBe(4 + 2 + 3);
  });

  it('a token without a (valid) length lasts one step', () => {
    const ev = seq('C4 D4:x E4', 1);
    expect(ev.map((e) => e[2])).toEqual([1, 1, 1]);
    expect(ev.map((e) => e[0])).toEqual([0, 1, 2]);
  });

  it('a bar line jumps to the start of the next bar, however far into the current bar we are', () => {
    const bar = seq('| C4', 1)[0][0];
    expect(bar).toBeGreaterThan(0);
    expect(seq('D4:1 | C4', 1)[1][0]).toBe(bar);
    expect(seq('D4:5 | C4 | E4', 1).map((e) => e[0])).toEqual([0, bar, 2 * bar]);
  });

  it('ignores extra whitespace and returns nothing for an empty string', () => {
    expect(seq('   C4:2    D4:2  ', 1).map((e) => e[0])).toEqual([0, 2]);
    expect(seq('', 1)).toEqual([]);
  });
});

describe('songs', () => {
  const NOTE = /^[A-G][#b]?-?\d$/;
  const all = songs();

  it('has one song per map and is memoized', () => {
    expect(all).toHaveLength(MAPS.length);
    expect(songs()).toBe(all);
  });

  it('every song has a positive tempo, length and gain', () => {
    all.forEach((s) => {
      expect(s.tempo).toBeGreaterThan(0);
      expect(Number.isInteger(s.steps) && s.steps > 0).toBe(true);
      expect(s.gain).toBeGreaterThan(0);
      expect(s.at).toHaveLength(s.steps);
    });
  });

  it('every event parses to a finite step, a note name and a positive length and velocity', () => {
    all.forEach((s) => s.tracks.forEach((tr) => {
      expect(tr.v).toBeTruthy();
      expect(tr.n.length).toBeGreaterThan(0);
      tr.n.forEach(([step, note, len, vel]) => {
        expect(Number.isFinite(step)).toBe(true);
        expect(step).toBeGreaterThanOrEqual(0);
        expect(note).toMatch(NOTE);
        expect(Number.isFinite(len) && len > 0).toBe(true);
        expect(vel).toBeGreaterThan(0);
        expect(vel).toBeLessThanOrEqual(1);
      });
    }));
  });

  it('the per-step index holds exactly the in-range events of every track', () => {
    all.forEach((s) => {
      const inRange = s.tracks.reduce((n, tr) => n + tr.n.filter((e) => e[0] >= 0 && e[0] < s.steps).length, 0);
      const indexed = s.at.reduce((n, a) => n + a.length, 0);
      expect(indexed).toBe(inRange);
      s.at.forEach((evs, step) => evs.forEach(([v, ev]) => {
        expect(ev[0]).toBe(step);
        expect(s.tracks.some((tr) => tr.v === v && tr.n.includes(ev))).toBe(true);
      }));
    });
  });
});
