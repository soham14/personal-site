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

describe('transient messages', () => {
  it('shows the map banner on entering a map, then clears it', () => {
    STAGES.forEach((st, i) => {
      emit('enterMap', { map: i });
      expect(slot('banner').textContent).toContain(MAPS[i].name);
      expect(slot('banner').textContent).toContain(st.jobTitle);
    });
    vi.runAllTimers();
    expect(slot('banner').children).toHaveLength(0);
  });

  it('clamps the banner to known maps', () => {
    emit('enterMap', { map: 99 });
    expect(slot('banner').textContent).toContain(MAPS[MAPS.length - 1].name);
    emit('enterMap', {});
    expect(slot('banner').textContent).toContain(MAPS[0].name);
  });

  it('a newer banner replaces the old one and restarts its timer', () => {
    emit('enterMap', { map: 0 });
    emit('enterMap', { map: 1 });
    expect(slot('banner').children).toHaveLength(1);
    expect(slot('banner').textContent).toContain(MAPS[1].name);
    expect(vi.getTimerCount()).toBe(1);
    vi.runAllTimers();
    expect(slot('banner').children).toHaveLength(0);
  });

  it('shows log messages as a toast, then clears it', () => {
    emit('log', { text: '[System] hello there' });
    expect(slot('toast').textContent).toContain('[System]');
    expect(slot('toast').textContent).toContain('hello there');
    vi.runAllTimers();
    expect(slot('toast').children).toHaveLength(0);
  });

  it('shows plain log text without a prefix and ignores empty logs', () => {
    emit('log', { text: 'just words' });
    expect(slot('toast').textContent!.trim()).toBe('just words');
    vi.runAllTimers();
    emit('log', {});
    expect(slot('toast').children).toHaveLength(0);
  });

  it('colours the toast prefix by message kind', () => {
    const colour = (text: string) => { emit('log', { text }); return (q('span', slot('toast'))).style.color; };
    const kinds = ['[System] a', '[Tip] b', '[Mentor] c'].map(colour);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it('shows JOB ADVANCED with the new job, then clears it', () => {
    STAGES.forEach((st, i) => {
      emit('advance', { tier: i });
      expect(slot('job').textContent).toContain(st.jobTitle);
      expect(slot('job').textContent).toContain(st.cls);
    });
    emit('advance', {});
    expect(slot('job').textContent).toContain(STAGES[0].jobTitle);
    vi.runAllTimers();
    expect(slot('job').children).toHaveLength(0);
  });
});

describe('quest reward', () => {
  const card = () => q('.cq-reward', slot('reward'));
  const info = () => qa('[data-fade]', card()).find((e) => e.querySelector('div'))!; // the text column

  it('shows the quest card only in the card phase', () => {
    for (const phase of ['fly', 'done', undefined]) {
      emit('reward', { idx: 0, bonus: 0, phase });
      expect(slot('reward').children).toHaveLength(0);
    }
    emit('reward', { idx: 1, bonus: 0, phase: 'card' });
    expect(card().textContent).toContain(STAGES[1].quest);
    expect(card().textContent).toContain(STAGES[1].crest);
  });

  it('shows the stage reward EXP when the stage has one and the trial bonus when earned', () => {
    const lines = (idx: number, bonus: number) => {
      emit('reward', { idx, bonus, phase: 'card' });
      return info().children.length;
    };
    const withExp = STAGES.findIndex((s) => s.rewardExp), noExp = STAGES.findIndex((s) => !s.rewardExp);
    const base = lines(withExp, 0);
    expect(card().textContent).toContain(STAGES[withExp].rewardExp);
    expect(lines(noExp, 0)).toBe(base - 1);
    expect(lines(withExp, 777)).toBe(base + 1);
    expect(card().textContent).toContain('777');
  });

  it('clamps the crest index to known stages', () => {
    emit('reward', { idx: 99, phase: 'card' });
    expect(card().textContent).toContain(STAGES[STAGES.length - 1].crest);
  });

  it('flies the crest toward the PROFILE button, then clears', () => {
    emit('reward', { idx: 0, bonus: 0, phase: 'card' });
    const src = q('[data-crest-src]', card());
    expect(src.style.getPropertyValue('--fx')).toBe('');
    vi.advanceTimersToNextTimer();
    expect(card()).not.toBeNull();
    expect(src.style.getPropertyValue('--fx')).toMatch(/px$/);
    expect(src.style.getPropertyValue('--fy')).toMatch(/px$/);
    expect(src.style.animation).not.toBe('');
    qa('[data-fade]', card()).forEach((f) => expect(f.style.animation).not.toBe(''));
    vi.advanceTimersToNextTimer();
    expect(slot('reward').children).toHaveLength(0);
  });
});

describe('title chip', () => {
  it('never draws a second title over the hero (the world draws it)', () => {
    const title = TRIALS[KINDS[0]].title;
    setState({ titles: [title], px: 500, py: 40 });
    expect(slot('title').children).toHaveLength(0);
    expect(root.textContent).not.toContain(title);
  });

  it('hides the title layer during trials and while the profile is open', () => {
    expect(slot('title').style.display).toBe('');
    setState({ profileOpen: true });
    expect(slot('title').style.display).toBe('none');
    setState({ profileOpen: false, trial: { kind: 'lan', phase: 'play', gate: false } });
    expect(slot('title').style.display).toBe('none');
    setState({ trial: null });
    expect(slot('title').style.display).toBe('');
  });
});

describe('walk hint and controls legend', () => {
  it('shows the walk hint until the game is focused or touched, and no legend', () => {
    expect(slot('hint').children).toHaveLength(1);
    expect(slot('legend').children).toHaveLength(0);
    setState({ focused: true });
    expect(slot('hint').children).toHaveLength(0);
    setState({ focused: false, isTouch: true });
    expect(slot('hint').children).toHaveLength(0);
  });

  it('shows the controls legend once engaged, with touch-specific wording, until dismissed', () => {
    setState({ focused: true });
    const desktop = slot('legend').textContent;
    expect(desktop).not.toBe('');
    setState({ isTouch: true });
    const touch = slot('legend').textContent;
    expect(touch).not.toBe('');
    expect(touch).not.toBe(desktop);
    setState({ legendDone: true });
    expect(slot('legend').children).toHaveLength(0);
  });
});

describe('résumé overlay', () => {
  const openResume = () => click(q('[data-act="resume"]', slot('top')));

  it('RÉSUMÉ opens the overlay and focuses Back', () => {
    openResume();
    expect(state.resumeOpen).toBe(true);
    expect(overlay().style.visibility).toBe('visible');
    expect(overlay().getAttribute('aria-hidden')).toBe('false');
    expect(document.activeElement).toBe(q('[data-act="closeResume"]'));
  });

  it('inserts the résumé page without its standalone back link', async () => {
    openResume();
    await flush();
    expect(fetchMock).toHaveBeenCalledWith('resume/');
    expect(resumeBox().textContent).toContain(PROFILE.email);
    expect(q('.rs-back', resumeBox())).toBeNull();
    expect(RESUME_HTML).toContain('rs-back'); // the standalone page does have one
  });

  it('is built once and reused across open/close', async () => {
    openResume();
    await flush();
    const first = overlay();
    click(q('[data-act="closeResume"]'));
    openResume();
    await flush();
    expect(overlay()).toBe(first);
    expect(qa('.cq-resume')).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('opening again while open changes nothing', () => {
    openResume();
    openResume();
    expect(state.resumeOpen).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Back hides the overlay and takes its buttons out of the tab order', () => {
    openResume();
    click(q('[data-act="closeResume"]'));
    expect(state.resumeOpen).toBe(false);
    expect(overlay().style.visibility).toBe('hidden');
    expect(overlay().getAttribute('aria-hidden')).toBe('true');
    qa('button', overlay()).forEach((b) => expect(b.getAttribute('tabindex')).toBe('-1'));
  });

  it('shows an error message when the résumé cannot be loaded', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('offline')));
    openResume();
    await flush();
    expect(resumeBox().textContent!.trim()).not.toBe('');
    expect(resumeBox().textContent).not.toContain(PROFILE.email);
  });

  it('stays empty when the page has no content', async () => {
    fetchReturns('');
    openResume();
    await flush();
    expect(resumeBox().children).toHaveLength(0);
  });

  it('is preloaded hidden in idle time after the page loads', () => {
    // the idle-callback API is looked up when the UI mounts, so mount again with it present
    const ric = vi.fn((cb: () => void) => cb());
    (window as any).requestIdleCallback = ric;
    try {
      document.body.innerHTML = '';
      mount();
      expect(overlay()).toBeNull();
      window.dispatchEvent(new Event('load'));
      expect(ric).toHaveBeenCalled();
      expect(overlay().style.visibility).toBe('hidden');
      expect(state.resumeOpen).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      delete (window as any).requestIdleCallback;
    }
  });

  it('is preloaded on a timer when idle callbacks are unavailable', () => {
    expect((window as any).requestIdleCallback).toBeUndefined();
    window.dispatchEvent(new Event('load'));
    expect(overlay()).toBeNull();
    vi.runAllTimers();
    expect(overlay()).not.toBeNull();
    expect(state.resumeOpen).toBe(false);
  });
});

describe('focus handling', () => {
  const addGameCanvas = () => {
    const g = document.createElement('div'); g.id = 'game';
    const c = document.createElement('canvas'); c.tabIndex = 0;
    g.appendChild(c); document.body.appendChild(g);
    return c;
  };

  it('mouse clicks on controls hand focus back to the game', () => {
    const c = addGameCanvas();
    click(q('[data-act="sound"]'), 1);
    expect(document.activeElement).toBe(c);
  });

  it('keyboard activation keeps focus on the control', () => {
    const c = addGameCanvas();
    const b = q('[data-act="sound"]'); b.focus();
    click(b, 0);
    expect(document.activeElement).not.toBe(c);
  });

  it('keeps focus in open windows and on the résumé', () => {
    const c = addGameCanvas();
    click(q('[data-act="profile"]'), 1);
    expect(document.activeElement).not.toBe(c);
    click(q('[data-act="closeProfile"]'), 1);
    expect(document.activeElement).toBe(c);
    c.blur();
    emit('talk', { i: 0 });
    click(q('[data-act="mini"]'), 1);
    expect(document.activeElement).not.toBe(c);
    setState({ talk: null });
    click(q('[data-act="resume"]'), 1);
    expect(document.activeElement).not.toBe(c);
  });

  it('copes with no game canvas on the page', () => {
    expect(() => click(q('[data-act="sound"]'), 1)).not.toThrow();
  });

  it('ignores clicks that are not on a UI control', () => {
    const sound = record('soundToggle');
    click(slot('center'));
    click(root);
    const wrap = document.createElement('div');
    wrap.dataset.act = 'sound';
    document.body.appendChild(wrap);
    wrap.appendChild(root);
    click(slot('center'));
    click(root);
    expect(sound).toHaveLength(0);
  });

  it('keeps keyboard focus on the same control when a window re-renders', () => {
    click(q('[data-act="profile"]'), 0);
    const tab = q('[data-act="tab"][data-tab="skills"]'); tab.focus();
    click(tab, 0);
    expect(document.activeElement).not.toBe(tab); // re-rendered
    expect((document.activeElement as HTMLElement).dataset.tab).toBe('skills');

    click(q('[data-act="tab"][data-tab="journey"]'), 0);
    const flip = q('[data-act="flip"][data-i="1"]'); flip.focus();
    click(flip, 0);
    expect((document.activeElement as HTMLElement).dataset).toMatchObject({ act: 'flip', i: '1' });

    click(q('[data-act="tab"][data-tab="trophies"]'), 0);
    q(`[data-act="play"][data-kind="${KINDS[2]}"]`).focus();
    setState({ best: { ...state.best, [KINDS[2]]: 3 } });
    expect((document.activeElement as HTMLElement).dataset).toMatchObject({ act: 'play', kind: KINDS[2] });

    const res = q('[data-act="resume"]', slot('profile')); res.focus();
    setState({ expBonus: 1 });
    expect(document.activeElement).not.toBe(res);
    expect(slot('profile').contains(document.activeElement)).toBe(true);
    expect((document.activeElement as HTMLElement).dataset.act).toBe('resume');
  });

  it('keeps focus on top-bar controls while other parts re-render', () => {
    const b = q('[data-act="sound"]'); b.focus();
    setState({ musicOn: true, focused: true });
    expect((document.activeElement as HTMLElement).dataset.act).toBe('sound');
  });

  it('lets focus go when the focused control disappears', () => {
    emit('talk', { i: 0 });
    q('[data-act="next"]').focus();
    setState({ talk: null });
    expect(root.contains(document.activeElement)).toBe(false);
  });

  it('re-renders on window resize', () => {
    window.dispatchEvent(new Event('resize'));
    expect(q('[data-mini-dot]')).not.toBeNull();
  });
});
