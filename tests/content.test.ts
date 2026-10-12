import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { STAGES, MAPS, MENTORS, TRIALS, WORLD, SKILLS, PORTAL } from '../src/content.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'Mon YYYY' -> months since year 0; 'Present' sorts after every real date (no comparison with today).
function monthIndex(s: string): number {
  if (s.trim() === 'Present') return Infinity;
  const m = /^([A-Z][a-z]{2}) (\d{4})$/.exec(s.trim());
  if (!m || !MONTHS.includes(m[1])) throw new Error('unparseable date: ' + s);
  return Number(m[2]) * 12 + MONTHS.indexOf(m[1]);
}
const range = (dates: string) => {
  const parts = dates.split(/\s+[–-]\s+/);
  expect(parts).toHaveLength(2);
  return { start: monthIndex(parts[0]), end: monthIndex(parts[1]) };
};

const MW = WORLD.MW;
const mapOf = (x: number) => Math.floor(x / MW);

describe('stages, maps and mentors', () => {
  it('every stage has a map theme and a mentor at the same index', () => {
    expect(MAPS).toHaveLength(STAGES.length);
    expect(MENTORS).toHaveLength(STAGES.length);
    STAGES.forEach((_, i) => {
      expect(MAPS[i].name).toBeTruthy();
      expect(MENTORS[i].name).toBeTruthy();
    });
  });

  it('stage ids are unique', () => {
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGES.length);
  });

  it('stage dates parse, start before they end, and run chronologically without overlapping', () => {
    const ranges = STAGES.map((s) => range(s.dates));
    ranges.forEach((r) => expect(r.start).toBeLessThan(r.end));
    for (let i = 1; i < ranges.length; i++) expect(ranges[i].start).toBeGreaterThanOrEqual(ranges[i - 1].end);
  });

  it('only the last stage is ongoing', () => {
    const ongoing = STAGES.map((s) => range(s.dates).end === Infinity);
    expect(ongoing.indexOf(true)).toBe(STAGES.length - 1);
    expect(ongoing.filter(Boolean)).toHaveLength(1);
  });

  it('every mentor stands inside their map, on the ground or on a platform of that map', () => {
    MENTORS.forEach((m, i) => {
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x).toBeLessThanOrEqual(MW);
      if (m.h === 0) return;
      const wx = i * MW + m.x;
      const under = WORLD.platforms.filter((p) => p.map === i && p.x <= wx && wx <= p.x + p.w && p.top === m.h);
      expect(under.length).toBeGreaterThan(0);
    });
  });

  it('the portal is in the last map and inside the world', () => {
    expect(mapOf(PORTAL.x)).toBe(STAGES.length - 1);
    expect(PORTAL.x).toBeGreaterThanOrEqual(WORLD.WMIN);
    expect(PORTAL.x).toBeLessThanOrEqual(WORLD.WMAX);
  });
});

describe('trials', () => {
  const trials = Object.values(TRIALS);

  it('each trial names an existing mentor', () => {
    trials.forEach((t) => {
      expect(Number.isInteger(t.mentor)).toBe(true);
      expect(MENTORS[t.mentor]).toBeDefined();
    });
  });

  it('gate trials sit exactly on the world gates (one each) and the endless trial sits on the sealed gate', () => {
    const xs = trials.map((t) => t.gateX).sort((a, b) => a - b);
    expect(xs).toEqual([...WORLD.GATES, WORLD.LOCKX].sort((a, b) => a - b));
    expect(new Set(xs).size).toBe(xs.length);
  });

  it("each trial's gate is at the far end of (or inside) its mentor's map", () => {
    trials.forEach((t) => {
      expect(t.gateX).toBeGreaterThan(t.mentor * MW);
      expect(t.gateX).toBeLessThanOrEqual((t.mentor + 1) * MW);
    });
  });

  it('trial titles are unique', () => {
    expect(new Set(trials.map((t) => t.title)).size).toBe(trials.length);
  });
});

describe('world geometry', () => {
  it('gates are the boundaries between consecutive maps', () => {
    expect(WORLD.GATES).toHaveLength(STAGES.length - 1);
    WORLD.GATES.forEach((g, i) => expect(g).toBe((i + 1) * MW));
  });

  it('the sealed gate lies inside the last map, before the end of the world', () => {
    expect(mapOf(WORLD.LOCKX)).toBe(STAGES.length - 1);
    expect(WORLD.LOCKX).toBeLessThan(WORLD.WMAX);
    expect(WORLD.WMIN).toBeLessThan(WORLD.GATES[0]);
  });

  it('every platform lies entirely within its own map and above the ground', () => {
    expect(WORLD.platforms.length).toBeGreaterThan(0);
    WORLD.platforms.forEach((p, i) => {
      expect(p.id).toBe(i);
      expect(p.map).toBeGreaterThanOrEqual(0);
      expect(p.map).toBeLessThan(STAGES.length);
      expect(p.x).toBeGreaterThanOrEqual(p.map * MW);
      expect(p.x + p.w).toBeLessThanOrEqual((p.map + 1) * MW);
      expect(p.w).toBeGreaterThan(0);
      expect(p.top).toBeGreaterThan(0);
    });
  });

  it('every ladder lies within its own map and leads up to a platform there', () => {
    WORLD.ladders.forEach((l) => {
      expect(mapOf(l.x)).toBe(l.map);
      const target = WORLD.platforms.filter((p) => p.map === l.map && p.x <= l.x && l.x <= p.x + p.w && p.top === l.top);
      expect(target.length).toBeGreaterThan(0);
    });
  });
});

describe('skills', () => {
  it('has no duplicate skills or groups', () => {
    const all = SKILLS.flatMap((g) => g.nodes);
    expect(new Set(all).size).toBe(all.length);
    expect(new Set(SKILLS.map((g) => g.name)).size).toBe(SKILLS.length);
    SKILLS.forEach((g) => expect(g.nodes.length).toBeGreaterThan(0));
  });
});

describe('résumé page matches content.ts', () => {
  const html = readFileSync(resolve(process.cwd(), 'resume/index.html'), 'utf8');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const norm = (s: string | null) => (s || '').replace(/\s+/g, ' ').trim();
  const articles = Array.from(doc.querySelectorAll('article')).map((a) => norm(a.textContent));

  it.each(STAGES.map((s) => [s.id, s] as const))('lists %s with its title, organisation, dates and highlights', (_id, s) => {
    const mine = articles.filter((t) => t.includes(s.dates));
    expect(mine).toHaveLength(1);
    const text = mine[0];
    expect(text).toContain(s.title);
    // The organisation, or for an abbreviated name (e.g. "UC Berkeley") its distinctive last word.
    const org = s.org.split(' ');
    expect(text.includes(s.org) || text.includes(org[org.length - 1])).toBe(true);
    s.highlights.forEach((h) => expect(text).toContain(h));
  });
});
