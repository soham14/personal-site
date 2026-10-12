// UI overlay tests, split into two files so they run in parallel (shared setup duplicated on purpose).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initUI } from '../../src/ui/index.ts';
import { resetFlips } from '../../src/ui/profile.ts';
import { expPct } from '../../src/ui/util.ts';
import { state, setState, on, emit, type EventName } from '../../src/state.ts';
import { PROFILE, STAGES, MAPS, MENTORS, PORTAL, TRIALS, WORLD, SKILLS, type TrialKind } from '../../src/content.ts';

import RESUME_HTML from '../../resume/index.html?raw'; // the real standalone résumé page
const PORTAL_I = MENTORS.length; // dialogue index used for the portal
const KINDS = Object.keys(TRIALS) as TrialKind[];
const trialOfMentor = (m: number) => KINDS.find((k) => TRIALS[k].mentor === m)!;

let root: HTMLElement;
let fetchMock: ReturnType<typeof vi.fn>;

const slot = (name: string) => root.querySelector(`[data-slot="${name}"]`) as HTMLElement;
const q = <T extends HTMLElement = HTMLElement>(sel: string, within: ParentNode = root) => within.querySelector(sel) as T;
const qa = (sel: string, within: ParentNode = root) => Array.from(within.querySelectorAll<HTMLElement>(sel));
const click = (target: Element, detail = 1) => target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }));
const key = (code: string, opts: KeyboardEventInit = {}, target: EventTarget = window) => {
  const e = new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true, ...opts });
  target.dispatchEvent(e);
  return e;
};
const record = (name: EventName) => { const got: any[] = []; on(name, (p) => got.push(p)); return got; };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const fetchReturns = (html: string) => fetchMock.mockImplementation(() => Promise.resolve({ text: () => Promise.resolve(html) }));
const resumeBox = () => q('.cq-resume-scroll');
const overlay = () => q('.cq-resume');

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  fetchReturns(RESUME_HTML);
  vi.stubGlobal('fetch', fetchMock);
  resetFlips();
  mount();
});
function mount() {
  root = document.createElement('div');
  root.id = 'ui';
  document.body.appendChild(root);
  initUI(root);
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('top bar', () => {
  it('sound button asks the audio module to toggle', () => {
    const got = record('soundToggle');
    click(q('[data-act="sound"]'));
    expect(got).toHaveLength(1);
  });

  it('sound button reflects whether any sound is on, and when sound is unavailable', () => {
    const btn = () => q('[data-act="sound"]');
    expect(btn().getAttribute('aria-pressed')).toBe('false');
    const offLabel = btn().getAttribute('aria-label');
    setState({ musicOn: true });
    expect(btn().getAttribute('aria-pressed')).toBe('true');
    const onLabel = btn().getAttribute('aria-label');
    setState({ musicOn: false, sfxOn: true });
    expect(btn().getAttribute('aria-pressed')).toBe('true');
    setState({ soundNA: true });
    const naLabel = btn().getAttribute('aria-label');
    expect(new Set([offLabel, onLabel, naLabel]).size).toBe(3);
  });

  it('names the current map in the minimap', () => {
    MAPS.forEach((m, i) => {
      setState({ zone: i });
      expect(q('.cq-mini-title').textContent).toContain(m.name);
    });
  });

  it('minimap segments ask the world to walk to that map', () => {
    const got = record('walkTo');
    const segs = qa('[data-act="mini"]');
    expect(segs).toHaveLength(MAPS.length);
    segs.forEach((s) => click(s));
    expect(got).toEqual(MAPS.map((_, i) => ({ i, talk: false })));
  });

  it('minimap dot moves right in proportion to the player x, clamped to the map', () => {
    const left = () => Number(/([\d.]+)%/.exec(q('[data-mini-dot]').style.left)![1]);
    setState({ px: WORLD.WMAX / 4 });
    const quarter = left();
    setState({ px: WORLD.WMAX / 2 });
    const half = left();
    expect(quarter).toBeGreaterThan(0);
    expect(half).toBeCloseTo(quarter * 2, 1);
    setState({ px: WORLD.WMAX });
    const full = left();
    setState({ px: WORLD.WMAX * 2 });
    expect(left()).toBe(full);
    setState({ px: -500 });
    expect(left()).toBe(0);
  });

  it('minimap dot rises with the player height and never sinks below the ground line', () => {
    const bottom = () => parseFloat(q('[data-mini-dot]').style.bottom);
    setState({ py: 0 });
    const ground = bottom();
    setState({ py: 100 });
    const up = bottom();
    setState({ py: 200 });
    expect(up).toBeGreaterThan(ground);
    expect(bottom()).toBeGreaterThan(up);
    setState({ py: -100 });
    expect(bottom()).toBe(ground);
  });

  it('PROFILE button opens and closes the character window', () => {
    const sfx = record('sfx'), log = record('log');
    click(q('[data-act="profile"]'));
    expect(state.profileOpen).toBe(true);
    expect(state.profileTab).toBe('journey');
    expect(q('[role="dialog"][aria-label="Character info"]')).not.toBeNull();
    expect(log).toHaveLength(1);
    click(q('[data-act="profile"]'));
    expect(state.profileOpen).toBe(false);
    expect(slot('profile').children).toHaveLength(0);
    expect(sfx).toHaveLength(2);
  });

  it('PROFILE button shows an alert badge until the window is opened', () => {
    const children = () => q('[data-act="profile"]').children.length;
    const plain = children();
    setState({ profileAlert: true });
    expect(children()).toBeGreaterThan(plain);
    click(q('[data-act="profile"]'));
    expect(state.profileAlert).toBe(false);
    click(q('[data-act="profile"]'));
    expect(children()).toBe(plain);
  });
});

describe('character window', () => {
  const openProfile = () => click(q('[data-act="profile"]'));

  it('tabs switch the section', () => {
    openProfile();
    const sfx = record('sfx');
    click(q('[data-act="tab"][data-tab="skills"]'));
    expect(state.profileTab).toBe('skills');
    expect(q('[data-act="tab"][data-tab="skills"]').getAttribute('aria-selected')).toBe('true');
    for (const n of SKILLS[0].nodes) expect(slot('profile').textContent).toContain(n);
    click(q('[data-act="tab"][data-tab="trophies"]'));
    expect(state.profileTab).toBe('trophies');
    expect(q('[data-record]')).not.toBeNull();
    click(q('[data-act="tab"][data-tab="journey"]'));
    expect(state.profileTab).toBe('journey');
    expect(sfx).toHaveLength(3);
  });

  it('reopening always starts on the journey tab', () => {
    openProfile();
    click(q('[data-act="tab"][data-tab="skills"]'));
    click(q('[data-act="closeProfile"]'));
    expect(state.profileOpen).toBe(false);
    openProfile();
    expect(state.profileTab).toBe('journey');
  });

  it('crest flip toggles on click', () => {
    openProfile();
    const flip = () => q('[data-act="flip"][data-i="2"]');
    expect(flip().getAttribute('aria-pressed')).toBe('false');
    click(flip());
    expect(flip().getAttribute('aria-pressed')).toBe('true');
    click(flip());
    expect(flip().getAttribute('aria-pressed')).toBe('false');
  });

  it('fills the avatar and every journey portrait with a sprite canvas', () => {
    openProfile();
    expect(q('[data-avatar] canvas')).not.toBeNull();
    const portraits = qa('[data-portrait]');
    expect(portraits).toHaveLength(STAGES.length);
    portraits.forEach((p) => expect(p.querySelector('canvas')).not.toBeNull());
  });

  it('Play on a trial record closes the window and offers that trial', () => {
    const got = record('trialOffer');
    openProfile();
    click(q('[data-act="tab"][data-tab="trophies"]'));
    const k = KINDS[1];
    click(q(`[data-act="play"][data-kind="${k}"]`));
    expect(state.profileOpen).toBe(false);
    expect(got).toEqual([{ kind: k, gate: false }]);
  });

  it('shows the EXP bar between the base value and its cap', () => {
    setState({ expBonus: 3 });
    openProfile();
    const bar = q('[role="img"]').firstElementChild as HTMLElement;
    expect(bar.style.width).toBe(expPct() + '%');
  });
});

describe('keyboard', () => {
  it('P and H toggle the character window', () => {
    for (const code of ['KeyP', 'KeyH']) {
      expect(key(code).defaultPrevented).toBe(true);
      expect(state.profileOpen).toBe(true);
      key(code);
      expect(state.profileOpen).toBe(false);
    }
  });

  it('ignores held-down repeats, modified keys and other keys', () => {
    key('KeyP', { repeat: true });
    key('KeyP', { ctrlKey: true });
    key('KeyP', { metaKey: true });
    key('KeyP', { altKey: true });
    expect(key('KeyQ').defaultPrevented).toBe(false);
    expect(state.profileOpen).toBe(false);
  });

  it('ignores typing in text fields', () => {
    const input = document.createElement('input'), area = document.createElement('textarea');
    document.body.append(input, area);
    key('KeyP', {}, input);
    key('KeyP', {}, area);
    expect(state.profileOpen).toBe(false);
  });

  it('Esc closes the résumé, then the character window, then the dialogue', () => {
    setState({ talk: 0, profileOpen: true, resumeOpen: true });
    expect(key('Escape').defaultPrevented).toBe(true);
    expect(state).toMatchObject({ resumeOpen: false, profileOpen: true, talk: 0 });
    expect(key('Escape').defaultPrevented).toBe(true);
    expect(state).toMatchObject({ resumeOpen: false, profileOpen: false, talk: 0 });
    expect(key('Escape').defaultPrevented).toBe(true);
    expect(state.talk).toBeNull();
    expect(key('Escape').defaultPrevented).toBe(false);
  });

  it('does not open the character window while the résumé is open', () => {
    setState({ resumeOpen: true });
    key('KeyP');
    expect(state.profileOpen).toBe(false);
  });

  it('leaves the keyboard to trials while one is running', () => {
    setState({ trial: { kind: 'hex', phase: 'play', gate: false }, talk: 1 });
    key('KeyP');
    key('Escape');
    expect(state.profileOpen).toBe(false);
    expect(state.talk).toBe(1);
  });
});

describe('dialogue', () => {
  const dialog = () => q('[role="dialog"][aria-label="NPC dialogue"]');

  it('shows each mentor\'s name and line from content', () => {
    MENTORS.forEach((m, i) => {
      emit('talk', { i });
      expect(state.talk).toBe(i);
      expect(dialog().textContent).toContain(m.name);
      expect(dialog().textContent).toContain(m.line);
      expect(q('[data-act="next"]', dialog())).not.toBeNull();
    });
  });

  it('fills the mentor portrait with a sprite canvas', () => {
    MENTORS.forEach((_, i) => {
      emit('talk', { i });
      expect(q('[data-portrait-npc] canvas', dialog())).not.toBeNull();
    });
  });

  it('the portal offers contact and the résumé instead of a next mentor', () => {
    emit('talk', { i: PORTAL_I });
    const d = dialog();
    expect(d.textContent).toContain(PORTAL.name);
    expect(d.textContent).toContain(PORTAL.line);
    expect(q(`a[href="mailto:${PROFILE.email}"]`, d)).not.toBeNull();
    expect(q('[data-act="next"]', d)).toBeNull();
    expect(q('[data-portrait-npc] canvas', d)).toBeNull();
    click(q('[data-act="resume"]', d));
    expect(state.resumeOpen).toBe(true);
  });

  it('ignores talk requests for unknown characters', () => {
    emit('talk', { i: -1 });
    emit('talk', { i: PORTAL_I + 1 });
    emit('talk', {});
    expect(state.talk).toBeNull();
    expect(slot('talk').children).toHaveLength(0);
  });

  it('End chat and the close button both close the dialogue', () => {
    const ends = () => qa('[data-act="endChat"]', dialog());
    emit('talk', { i: 0 });
    expect(ends().length).toBeGreaterThan(1);
    for (let n = 0; n < 2; n++) {
      emit('talk', { i: 0 });
      click(ends()[n]);
      expect(state.talk).toBeNull();
      expect(slot('talk').children).toHaveLength(0);
    }
  });

  it('Next mentor closes the dialogue and walks to the next one (the last mentor leads to the portal)', () => {
    const got = record('walkTo');
    MENTORS.forEach((_, i) => {
      emit('talk', { i });
      click(q('[data-act="next"]'));
      expect(state.talk).toBeNull();
    });
    expect(got).toEqual(MENTORS.map((_, i) => ({ i: i + 1, talk: true })));
  });

  it('offers a replay only for trials already played, and always for the last mentor', () => {
    const last = MENTORS.length - 1;
    for (let i = 0; i < last; i++) {
      emit('talk', { i });
      expect(q('[data-act="play"]', dialog())).toBeNull();
    }
    emit('talk', { i: last });
    expect(q('[data-act="play"]', dialog()).dataset.kind).toBe(trialOfMentor(last));
    const k = trialOfMentor(0);
    setState({ best: { ...state.best, [k]: 1 } });
    emit('talk', { i: 0 });
    expect(q('[data-act="play"]', dialog()).dataset.kind).toBe(k);
  });

  it('Play closes the dialogue and offers the trial', () => {
    const got = record('trialOffer');
    emit('talk', { i: MENTORS.length - 1 });
    click(q('[data-act="play"]', dialog()));
    expect(state.talk).toBeNull();
    expect(got).toEqual([{ kind: trialOfMentor(MENTORS.length - 1), gate: false }]);
  });

  it('is hidden while a trial is running', () => {
    setState({ talk: 0, trial: { kind: 'hex', phase: 'prompt', gate: false } });
    expect(slot('talk').children).toHaveLength(0);
  });
});

