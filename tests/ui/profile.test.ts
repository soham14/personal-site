import { describe, it, expect, beforeEach } from 'vitest';
import { profileHTML, toggleFlip, resetFlips, trialStars, trialRecord, STAR_AT } from '../../src/ui/profile.ts';
import { expPct } from '../../src/ui/util.ts';
import { setState, state } from '../../src/state.ts';
import { PROFILE, STAGES, SKILLS, TRIALS, MENTORS, type TrialKind } from '../../src/content.ts';

const KINDS = Object.keys(TRIALS) as TrialKind[];
const RATED = Object.keys(STAR_AT) as (keyof typeof STAR_AT)[];

function view(): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = profileHTML();
  document.body.appendChild(d);
  return d;
}
const open = (patch: Partial<typeof state> = {}) => { setState({ profileOpen: true, ...patch }); return view(); };
const stage = (v: HTMLElement, i: number) => v.querySelector(`[data-stage="${i}"]`) as HTMLElement;
const unlocked = (e: Element) => e.getAttribute('data-unlocked') === 'true';

beforeEach(() => resetFlips());

describe('profileHTML', () => {
  it('renders nothing while the window is closed', () => {
    expect(profileHTML()).toBe('');
  });

  it('shows the profile card from content', () => {
    const v = open();
    expect(v.textContent).toContain(PROFILE.name);
    expect(v.textContent).toContain(PROFILE.summary);
    expect(v.querySelector(`a[href="mailto:${PROFILE.email}"]`)).not.toBeNull();
    expect(v.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('dresses the avatar for the current map, clamped to the known stages', () => {
    for (const [zone, tier] of [[0, 0], [2, 2], [99, STAGES.length - 1], [-5, 0]]) {
      document.body.innerHTML = '';
      const v = open({ zone });
      expect(v.querySelector('[data-avatar]')!.getAttribute('data-avatar')).toBe(String(tier));
      expect(v.textContent).toContain(STAGES[tier].outfit);
    }
  });

  it('marks the selected tab and shows its section', () => {
    for (const tab of ['journey', 'skills', 'trophies'] as const) {
      document.body.innerHTML = '';
      const v = open({ profileTab: tab });
      const sel = v.querySelectorAll('[role="tab"][aria-selected="true"]');
      expect(sel).toHaveLength(1);
      expect(sel[0].getAttribute('data-tab')).toBe(tab);
    }
  });

  it('shows the latest earned title as a chip, and none before any title', () => {
    const titles = KINDS.map((k) => TRIALS[k].title);
    expect(open().textContent).not.toContain(titles[0]);
    document.body.innerHTML = '';
    const v = open({ titles: [titles[0], titles[1]] });
    expect(v.textContent).toContain(titles[1]);
  });

  it('draws the EXP bar at the current EXP percent', () => {
    setState({ expBonus: 2 });
    const v = open();
    const bar = v.querySelector('[role="img"]') as HTMLElement;
    expect((bar.firstElementChild as HTMLElement).style.width).toBe(expPct() + '%');
    expect(bar.getAttribute('aria-label')).toContain(expPct().toFixed(2));
  });
});

describe('journey tab', () => {
  it('has one entry per career stage', () => {
    const v = open();
    for (let i = 0; i < STAGES.length; i++) {
      const row = stage(v, i);
      expect(row).not.toBeNull();
      expect(row.textContent).toContain(STAGES[i].org);
      expect(row.textContent).toContain(STAGES[i].dates);
    }
    expect(v.querySelectorAll('[data-stage]')).toHaveLength(STAGES.length);
  });

  it('locks everything at the start', () => {
    const v = open();
    v.querySelectorAll('[data-stage]').forEach((r) => expect(unlocked(r)).toBe(false));
  });

  it('unlocks past stages by crests earned and the current stage by reaching its map', () => {
    const last = STAGES.length - 1;
    for (let earned = 0; earned < last; earned++) {
      document.body.innerHTML = '';
      const v = open({ earnedN: earned, maxTier: earned });
      for (let i = 0; i < last; i++) expect(unlocked(stage(v, i))).toBe(i < earned);
      expect(unlocked(stage(v, last))).toBe(false);
    }
    document.body.innerHTML = '';
    const v = open({ earnedN: last, maxTier: last });
    v.querySelectorAll('[data-stage]').forEach((r) => expect(unlocked(r)).toBe(true));
  });

  it('flips a crest to its details and back', () => {
    const pressed = (v: HTMLElement, i: number) => stage(v, i).querySelector('[data-act="flip"]')!.getAttribute('aria-pressed');
    expect(pressed(open(), 1)).toBe('false');
    toggleFlip(1);
    document.body.innerHTML = '';
    let v = view();
    expect(pressed(v, 1)).toBe('true');
    expect(pressed(v, 2)).toBe('false');
    toggleFlip(1);
    document.body.innerHTML = '';
    v = view();
    expect(pressed(v, 1)).toBe('false');
  });

  it('resetFlips turns every crest back', () => {
    toggleFlip(0); toggleFlip(3);
    resetFlips();
    open().querySelectorAll('[data-act="flip"]').forEach((b) => expect(b.getAttribute('aria-pressed')).toBe('false'));
  });
});

describe('skills tab', () => {
  it('lists every branch and every skill node', () => {
    const v = open({ profileTab: 'skills' });
    const text = v.textContent!;
    for (const b of SKILLS) {
      expect(text).toContain(b.name.toUpperCase());
      for (const n of b.nodes) expect(text).toContain(n);
    }
  });
});

describe('trophies tab', () => {
  const tile = (v: HTMLElement, k: TrialKind) => v.querySelector(`[data-trophy="${k}"]`) as HTMLElement;
  const record = (v: HTMLElement, k: TrialKind) => v.querySelector(`[data-record="${k}"]`) as HTMLElement;

  it('has a title tile per trial, all locked with how-to-earn hints at the start', () => {
    const v = open({ profileTab: 'trophies' });
    for (const k of KINDS) {
      expect(tile(v, k).textContent).toContain(TRIALS[k].title);
      expect(unlocked(tile(v, k))).toBe(false);
      expect(tile(v, k).textContent).toContain(TRIALS[k].how);
    }
    expect(v.querySelector('[data-shown]')).toBeNull();
  });

  it('unlocks owned titles and marks the latest one as shown', () => {
    const [a, b] = KINDS;
    const v = open({ profileTab: 'trophies', titles: [TRIALS[a].title, TRIALS[b].title] });
    expect(unlocked(tile(v, a))).toBe(true);
    expect(unlocked(tile(v, b))).toBe(true);
    for (const k of KINDS.slice(2)) expect(unlocked(tile(v, k))).toBe(false);
    expect(tile(v, a).textContent).not.toContain(TRIALS[a].how);
    const shown = v.querySelectorAll('[data-shown]');
    expect(shown).toHaveLength(1);
    expect(tile(v, b).contains(shown[0])).toBe(true);
  });

  it('shows each trial with its mentor and a play button', () => {
    const v = open({ profileTab: 'trophies' });
    for (const k of KINDS) {
      const r = record(v, k);
      expect(r.textContent).toContain(TRIALS[k].name);
      expect(r.textContent).toContain(MENTORS[TRIALS[k].mentor].name);
      expect(r.querySelector(`[data-act="play"][data-kind="${k}"]`)).not.toBeNull();
    }
  });

  it('shows the session best only for trials that were played', () => {
    const before = open({ profileTab: 'trophies' });
    const empty = record(before, 'hex').textContent;
    document.body.innerHTML = '';
    const best = { ...state.best, hex: 123, stk: 7 };
    const v = open({ profileTab: 'trophies', best });
    expect(record(v, 'hex').textContent).toContain(trialRecord('hex', best.hex));
    expect(record(v, 'hex').textContent).not.toBe(empty);
    expect(record(v, 'stk').textContent).toContain(trialRecord('stk', best.stk));
    expect(record(v, 'lan').textContent).toBe(record(before, 'lan').textContent);
  });

  it('lists the achievements with crest images', () => {
    const v = open({ profileTab: 'trophies' });
    const ach = v.querySelector('section[aria-label="Achievements"]')!;
    expect(ach.querySelectorAll('img').length).toBeGreaterThan(0);
  });
});

describe('trialStars', () => {
  it('is 1 star for a zero score', () => {
    for (const k of RATED) expect(trialStars(k, 0)).toBe(1);
  });
  it('gains a star exactly at each threshold', () => {
    for (const k of RATED) {
      STAR_AT[k].forEach((t, j) => {
        expect(trialStars(k, t)).toBe(j + 2);
        expect(trialStars(k, t - 1)).toBe(j + 1);
      });
    }
  });
  it('stays within 1-5 and never drops as the score rises', () => {
    for (const k of RATED) {
      const top = STAR_AT[k][STAR_AT[k].length - 1] * 2;
      let prev = 1;
      for (let s = 0; s <= top; s++) {
        const n = trialStars(k, s);
        expect(n).toBeGreaterThanOrEqual(prev);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(5);
        prev = n;
      }
      expect(prev).toBe(5);
    }
  });
});

describe('trialRecord', () => {
  const parts = (r: string) => r.split('·').map((x) => x.trim());
  const lastWord = (r: string) => r.trim().split(/\s+/).pop()!;

  it('shows the score, then its star count, for rated trials', () => {
    for (const k of RATED) {
      for (const s of [0, ...STAR_AT[k]]) {
        const [score, stars] = parts(trialRecord(k, s));
        expect(score.startsWith(String(s))).toBe(true);
        expect(stars.startsWith(String(trialStars(k, s)))).toBe(true);
      }
    }
  });
  it('uses a singular unit for one star and the plural otherwise', () => {
    const one = lastWord(trialRecord('hex', 0));
    const units = STAR_AT.hex.map((t) => lastWord(trialRecord('hex', t)));
    for (const u of units) {
      expect(u).not.toBe(one);
      expect(u.startsWith(one)).toBe(true);
    }
    expect(new Set(units).size).toBe(1);
  });
  it('labels points the same for Hex Lock and Lantern Match, and catches differently', () => {
    const unit = (k: TrialKind) => parts(trialRecord(k, 0))[0].replace(/^0/, '');
    expect(unit('hex')).toBe(unit('lan'));
    expect(unit('rush')).not.toBe(unit('hex'));
  });
  it('counts floors for Keep Leveling, singular for one, with no star rating', () => {
    const one = trialRecord('stk', 1), many = trialRecord('stk', 2);
    expect(one.startsWith('1')).toBe(true);
    expect(many.startsWith('2')).toBe(true);
    expect(lastWord(many)).not.toBe(lastWord(one));
    expect(lastWord(many).startsWith(lastWord(one))).toBe(true);
    expect(parts(one)).toHaveLength(1);
  });
});
