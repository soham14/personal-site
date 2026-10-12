import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initInput, disposeInput, setWorldHitTest, SWIPE_PX, SWIPE_MS, TAP_MS, TAP_SLOP } from '../../src/game/input.ts';
import { sim, initSim, clearInput, disposeSim, npcWorld } from '../../src/game/sim.ts';
import { state, setState } from '../../src/state.ts';
import { WORLD } from '../../src/content.ts';

// The #game element is 800px wide starting at x=0, so x < 400 is the left half.
const W = 800;
const LEFT_X = W / 4, RIGHT_X = (3 * W) / 4;
const TRIAL = { kind: 'hex' as const, phase: 'play' as const, gate: true };

let game: HTMLElement, ui: HTMLElement;

function mount(width = W) {
  document.body.innerHTML = '<div id="game"></div><div id="ui"></div>';
  game = document.getElementById('game')!;
  ui = document.getElementById('ui')!;
  game.getBoundingClientRect = () => ({ left: 0, top: 0, right: width, bottom: 400, width, height: 400, x: 0, y: 0, toJSON() {} }) as DOMRect;
}

function key(type: 'keydown' | 'keyup', code: string, opts: KeyboardEventInit = {}, target: EventTarget = window) {
  const e = new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...opts });
  target.dispatchEvent(e);
  return e;
}
const press = (code: string, opts: KeyboardEventInit = {}, target: EventTarget = window) => key('keydown', code, opts, target);
const release = (code: string) => key('keyup', code);

interface Ptr { id?: number; kind?: string; x?: number; y?: number; t?: number; button?: number }
/** A pointer event (jsdom has no PointerEvent constructor we rely on): a MouseEvent carrying pointer fields. */
function ptr(type: string, o: Ptr = {}, target: EventTarget = game) {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: o.x ?? 0, clientY: o.y ?? 0, button: o.button ?? 0 });
  Object.defineProperties(e, {
    pointerId: { value: o.id ?? 1 },
    pointerType: { value: o.kind ?? 'touch' },
    timeStamp: { value: o.t ?? 0 },
  });
  target.dispatchEvent(e);
  return e;
}

const jumpBtn = () => ui.querySelector<HTMLButtonElement>('button[aria-label="Jump"]')!;
const talkBtn = () => ui.querySelector<HTMLButtonElement>('button[aria-label="Talk"]')!;
const standAt = (i: number) => { const w = npcWorld(i); sim.px = w.x; sim.py = w.h; };

beforeEach(() => {
  initSim(0);
  clearInput();
  mount();
  initInput(game, ui);
});
afterEach(() => {
  disposeInput();
  disposeSim();
  vi.unstubAllGlobals();
});

describe('keyboard movement', () => {
  it.each([
    ['ArrowLeft', 'left'], ['KeyA', 'left'],
    ['ArrowRight', 'right'], ['KeyD', 'right'],
    ['ArrowUp', 'up'], ['KeyW', 'up'],
    ['ArrowDown', 'down'], ['KeyS', 'down'],
  ] as const)('%s is held while pressed and released on key up (%s)', (code, field) => {
    const e = press(code);
    expect(sim[field]).toBe(true);
    expect(e.defaultPrevented).toBe(true); // arrows must not scroll the page
    release(code);
    expect(sim[field]).toBe(false);
  });

  it('holding both directions keeps both held until each is released', () => {
    press('KeyA'); press('ArrowRight');
    release('KeyA');
    expect(sim.left).toBe(false);
    expect(sim.right).toBe(true);
  });

  it('down asks to drop through a platform once per press, not on key repeat', () => {
    press('ArrowDown');
    expect(sim.dropReq).toBe(true);
    sim.dropReq = false;
    press('ArrowDown', { repeat: true });
    expect(sim.dropReq).toBe(false);
    expect(sim.down).toBe(true);
  });

  it('ignores keys that are not controls', () => {
    const e = press('KeyX');
    expect(e.defaultPrevented).toBe(false);
    expect([sim.left, sim.right, sim.up, sim.down, sim.jumpReq]).toEqual([false, false, false, false, false]);
  });

  it('does not move while the world is paused, but still keeps the page from scrolling', () => {
    setState({ paused: true });
    const e = press('ArrowLeft');
    expect(sim.left).toBe(false);
    expect(e.defaultPrevented).toBe(true);
  });

  it('an arrow on a focused button is still captured for movement when no overlay is open', () => {
    document.body.insertAdjacentHTML('beforeend', '<button id="b">x</button>');
    const e = press('ArrowRight', {}, document.getElementById('b')!);
    expect(e.defaultPrevented).toBe(true);
    expect(sim.right).toBe(true);
  });

  it('an arrow on a focused button inside an open overlay is left to the overlay', () => {
    setState({ profileOpen: true });
    document.body.insertAdjacentHTML('beforeend', '<button id="b">x</button>');
    const e = press('ArrowRight', {}, document.getElementById('b')!);
    expect(e.defaultPrevented).toBe(false);
    expect(sim.right).toBe(false);
  });

  it('a key with no code is ignored, pressed or released', () => {
    press('ArrowLeft');
    const e = press('', { key: 'x' });
    expect(e.defaultPrevented).toBe(false);
    key('keyup', '', { key: 'x' });
    expect(sim.left).toBe(true);
  });
});

describe('talking and climbing with up', () => {
  it('up next to a mentor opens their dialogue', () => {
    standAt(1);
    press('ArrowUp');
    expect(state.talk).toBe(1);
  });

  it('a held (repeating) up does not open dialogue', () => {
    standAt(1);
    press('KeyW', { repeat: true });
    expect(state.talk).toBeNull();
    expect(sim.up).toBe(true);
  });

  it('up away from everyone just holds up', () => {
    press('ArrowUp');
    expect(state.talk).toBeNull();
    expect(sim.up).toBe(true);
  });

  it('up at the foot of a ladder climbs instead of talking', () => {
    const lad = WORLD.ladders[0];
    sim.px = lad.x + 8; sim.py = 0;
    press('ArrowUp');
    expect(state.talk).toBeNull();
    expect(sim.up).toBe(true);
  });

  it('up at the top of a ladder (nothing left to climb) does not open dialogue when no one is near', () => {
    const lad = WORLD.ladders[0];
    sim.px = lad.x + 8; sim.py = lad.top;
    press('ArrowUp');
    expect(state.talk).toBeNull();
  });
});

describe('jumping with Space', () => {
  it('Space requests a jump and does not scroll the page', () => {
    const e = press('Space', { key: ' ' });
    expect(sim.jumpReq).toBe(true);
    expect(e.defaultPrevented).toBe(true);
  });

  it('a Space key reported only by its key value still jumps', () => {
    press('', { key: ' ' });
    expect(sim.jumpReq).toBe(true);
  });

  it('a held (repeating) Space does not request another jump', () => {
    press('Space', { repeat: true });
    expect(sim.jumpReq).toBe(false);
  });

  it.each(['<button id="c">b</button>', '<a id="c" href="#x">a</a>', '<button><span id="c">inner</span></button>'])(
    'Space on a focused control activates the control instead of jumping: %s',
    (html) => {
      document.body.insertAdjacentHTML('beforeend', html);
      const e = press('Space', {}, document.getElementById('c')!);
      expect(sim.jumpReq).toBe(false);
      expect(e.defaultPrevented).toBe(false);
    },
  );

  it.each([{ talk: 0 }, { profileOpen: true }, { resumeOpen: true }, { paused: true }])(
    'Space does not jump while the UI is locked: %o',
    (patch) => {
      setState(patch);
      press('Space');
      expect(sim.jumpReq).toBe(false);
    },
  );
});

describe('profile keys', () => {
  it('C opens the profile on the journey tab and clears the new-crest alert; C again closes it', () => {
    setState({ profileAlert: true, profileTab: 'skills' });
    press('KeyC');
    expect(state.profileOpen).toBe(true);
    expect(state.profileTab).toBe('journey');
    expect(state.profileAlert).toBe(false);
    press('KeyC');
    expect(state.profileOpen).toBe(false);
  });

  it('Q opens the journey tab and does not toggle closed', () => {
    press('KeyQ');
    press('KeyQ');
    expect(state.profileOpen).toBe(true);
    expect(state.profileTab).toBe('journey');
  });

  it('I opens the trophies tab, switching from another tab if already open', () => {
    press('KeyC');
    press('KeyI');
    expect(state.profileOpen).toBe(true);
    expect(state.profileTab).toBe('trophies');
  });

  it('a held (repeating) profile key does nothing', () => {
    press('KeyC', { repeat: true });
    expect(state.profileOpen).toBe(false);
  });

  it('profile keys do nothing while a dialogue is open', () => {
    setState({ talk: 2 });
    press('KeyC'); press('KeyI'); press('KeyQ');
    expect(state.profileOpen).toBe(false);
  });

  it('profile keys work while the résumé is open (they are not movement)', () => {
    setState({ resumeOpen: true });
    press('KeyI');
    expect(state.profileOpen).toBe(true);
  });
});

describe('keys the world must not react to', () => {
  it.each([
    '<input id="f">',
    '<textarea id="f"></textarea>',
    '<select id="f"></select>',
    '<div id="f" contenteditable="true"></div>',
    '<div contenteditable="true"><span id="f">nested</span></div>',
  ])('typing in a text field is ignored: %s', (html) => {
    document.body.insertAdjacentHTML('beforeend', html);
    const f = document.getElementById('f')!;
    for (const code of ['Space', 'ArrowLeft', 'KeyC']) {
      const e = press(code, {}, f);
      expect(e.defaultPrevented).toBe(false);
    }
    expect(sim.jumpReq).toBe(false);
    expect(sim.left).toBe(false);
    expect(state.profileOpen).toBe(false);
    expect(state.focused).toBe(false);
  });

  it('while a trial is open the keyboard belongs to the trial', () => {
    setState({ trial: TRIAL });
    for (const code of ['Space', 'ArrowLeft', 'ArrowUp', 'KeyC', 'KeyI']) {
      const e = press(code);
      expect(e.defaultPrevented).toBe(false);
    }
    expect(sim.jumpReq).toBe(false);
    expect(sim.left).toBe(false);
    expect(state.profileOpen).toBe(false);
    expect(state.focused).toBe(true);
  });

  it('releasing a key stops that direction even if focus moved into a text field meanwhile', () => {
    press('ArrowLeft');
    document.body.insertAdjacentHTML('beforeend', '<input id="f">');
    key('keyup', 'ArrowLeft', {}, document.getElementById('f')!);
    expect(sim.left).toBe(false);
  });
});

describe('focus and input mode', () => {
  it('a key press marks the game focused and switches out of touch mode', () => {
    setState({ isTouch: true, focused: false });
    press('KeyX');
    expect(state.focused).toBe(true);
    expect(state.isTouch).toBe(false);
    press('KeyX');
    expect(state.focused).toBe(true);
  });

  it('a pointer press marks the game focused', () => {
    ptr('pointerdown', { kind: 'mouse' });
    expect(state.focused).toBe(true);
    ptr('pointerdown', { kind: 'mouse' });
    expect(state.focused).toBe(true);
  });

  it('losing window focus releases every held key and touch, and unfocuses the game', () => {
    press('ArrowLeft'); press('ArrowRight'); press('ArrowUp'); press('ArrowDown');
    ptr('pointerdown', { id: 1, x: LEFT_X });
    window.dispatchEvent(new Event('blur'));
    expect([sim.left, sim.right, sim.up, sim.down, sim.padL, sim.padR]).toEqual([false, false, false, false, false, false]);
    expect(state.focused).toBe(false);
    expect(state.half).toBeNull();
    // the old finger no longer steers
    ptr('pointermove', { id: 1, x: RIGHT_X });
    expect(sim.padR).toBe(false);
  });

  it('opening any overlay drops held directions and the touch walk', () => {
    for (const patch of [{ talk: 0 }, { profileOpen: true }, { resumeOpen: true }, { trial: TRIAL }]) {
      setState({ talk: null, profileOpen: false, resumeOpen: false, trial: null });
      press('ArrowLeft'); press('ArrowUp'); press('ArrowDown'); press('ArrowRight');
      ptr('pointerup', { id: 1 });
      ptr('pointerdown', { id: 1, x: LEFT_X });
      expect(sim.padL).toBe(true);
      setState(patch);
      expect([sim.left, sim.right, sim.up, sim.down, sim.padL, sim.padR]).toEqual([false, false, false, false, false, false]);
      setState({ half: null }); // further updates while the overlay stays open are harmless
      ptr('pointermove', { id: 1, x: RIGHT_X });
      expect(sim.padR).toBe(false);
    }
  });

  describe('touch detection at start-up', () => {
    let addedTouch = false;
    const setup = (touchPoints: number, fine: boolean) => {
      disposeInput();
      setState({ isTouch: false });
      if (!('ontouchstart' in window)) { (window as any).ontouchstart = null; addedTouch = true; }
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: touchPoints });
      vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: fine })));
      initInput(game, ui);
    };
    afterEach(() => {
      delete (navigator as any).maxTouchPoints;
      if (addedTouch) { delete (window as any).ontouchstart; addedTouch = false; }
    });

    it('a touchscreen with a coarse pointer starts in touch mode', () => {
      setup(5, false);
      expect(state.isTouch).toBe(true);
    });
    it('a touchscreen laptop with a fine pointer does not', () => {
      setup(5, true);
      expect(state.isTouch).toBe(false);
    });
    it('a device with no touch points does not', () => {
      setup(0, false);
      expect(state.isTouch).toBe(false);
    });
  });
});

describe('mouse on the world', () => {
  it('clicking a mentor walks there to talk, using the click position for the hit-test', () => {
    const hit = vi.fn(() => 2);
    setWorldHitTest(hit);
    ptr('pointerdown', { kind: 'mouse', x: 123, y: 45 });
    expect(hit).toHaveBeenCalledWith(123, 45);
    expect(sim.target).not.toBeNull();
    expect(sim.pendingTalk).toBe(2);
    expect(sim.padL || sim.padR).toBe(false); // the mouse never walks by halves
  });

  it('clicking the mentor you are standing next to opens the dialogue right away', () => {
    standAt(0);
    setWorldHitTest(() => 0);
    ptr('pointerdown', { kind: 'mouse' });
    expect(state.talk).toBe(0);
  });

  it('clicking empty ground does nothing', () => {
    ptr('pointerdown', { kind: 'mouse' }); // no hit-test registered yet
    setWorldHitTest(() => -1);
    ptr('pointerdown', { kind: 'mouse' });
    expect(sim.target).toBeNull();
    expect(state.half).toBeNull();
  });

  it('right clicks and clicks behind an open overlay are ignored', () => {
    setWorldHitTest(() => 1);
    ptr('pointerdown', { kind: 'mouse', button: 2 });
    expect(sim.target).toBeNull();
    setState({ profileOpen: true });
    ptr('pointerdown', { kind: 'mouse' });
    expect(sim.target).toBeNull();
  });

  it('hovering a mentor shows a pointer cursor, unless input is locked', () => {
    ptr('pointermove', { kind: 'mouse' });
    expect(game.style.cursor).toBe('');
    let n = 1;
    setWorldHitTest(() => n);
    ptr('pointermove', { kind: 'mouse' });
    expect(game.style.cursor).toBe('pointer');
    n = -1;
    ptr('pointermove', { kind: 'mouse' });
    expect(game.style.cursor).toBe('');
    n = 1;
    setState({ talk: 1 });
    ptr('pointermove', { kind: 'mouse' });
    expect(game.style.cursor).toBe('');
  });

  it('releasing the mouse does not end a touch walk', () => {
    ptr('pointerdown', { id: 1, x: LEFT_X });
    ptr('pointerup', { id: 1, kind: 'mouse' });
    expect(sim.padL).toBe(true);
  });

  it('the context menu is suppressed on the world', () => {
    const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    game.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });
});

describe('touch walking', () => {
  it('holding the left half walks left until the finger lifts', () => {
    const e = ptr('pointerdown', { id: 1, x: LEFT_X });
    expect(e.defaultPrevented).toBe(true);
    expect(sim.padL).toBe(true);
    expect(sim.padR).toBe(false);
    expect(state.half).toBe('left');
    expect(state.isTouch).toBe(true);
    ptr('pointerup', { id: 1, x: LEFT_X });
    expect(sim.padL).toBe(false);
    expect(state.half).toBeNull();
  });

  it('holding the right half walks right', () => {
    ptr('pointerdown', { id: 1, x: RIGHT_X });
    expect(sim.padR).toBe(true);
    expect(sim.padL).toBe(false);
    expect(state.half).toBe('right');
  });

  it('captures the finger so the walk survives scenery changing under it', () => {
    const cap = vi.fn();
    game.setPointerCapture = cap;
    ptr('pointerdown', { id: 7, x: LEFT_X });
    expect(cap).toHaveBeenCalledWith(7);
  });

  it('still walks when pointer capture is unavailable', () => {
    game.setPointerCapture = () => { throw new Error('not supported'); };
    ptr('pointerdown', { id: 1, x: LEFT_X });
    expect(sim.padL).toBe(true);
  });

  it('sliding the finger across the middle turns around; moving within a half keeps going', () => {
    ptr('pointerdown', { id: 1, x: LEFT_X });
    ptr('pointermove', { id: 1, x: LEFT_X + 10 });
    expect(sim.padL).toBe(true);
    ptr('pointermove', { id: 1, x: RIGHT_X });
    expect(sim.padR).toBe(true);
    expect(sim.padL).toBe(false);
    expect(state.half).toBe('right');
  });

  it('moves of other fingers, or with no walking finger, are ignored', () => {
    ptr('pointermove', { id: 1, x: RIGHT_X });
    expect(sim.padR).toBe(false);
    ptr('pointerdown', { id: 1, x: LEFT_X });
    ptr('pointermove', { id: 2, x: RIGHT_X });
    expect(sim.padL).toBe(true);
    expect(sim.padR).toBe(false);
  });

  it('a stray pointerleave keeps the walk going; a cancel ends it', () => {
    ptr('pointerdown', { id: 1, x: LEFT_X });
    ptr('pointerleave', { id: 1 });
    expect(sim.padL).toBe(true);
    ptr('pointercancel', { id: 1 });
    expect(sim.padL).toBe(false);
  });

  it('lifting a finger that is not walking or tapping changes nothing', () => {
    ptr('pointerdown', { id: 1, x: LEFT_X });
    ptr('pointerup', { id: 9 });
    expect(sim.padL).toBe(true);
    expect(sim.jumpReq).toBe(false);
  });

  it('works on an element that has not been laid out yet', () => {
    disposeInput();
    mount(0);
    initInput(game, ui);
    ptr('pointerdown', { id: 1, x: 0 });
    expect(sim.padL || sim.padR).toBe(true);
  });

  it('tapping a mentor walks there to talk instead of walking by halves', () => {
    setWorldHitTest(() => 3);
    ptr('pointerdown', { id: 1, x: LEFT_X });
    expect(sim.pendingTalk).toBe(3);
    expect(sim.padL).toBe(false);
    expect(state.isTouch).toBe(true);
  });

  it('touches behind an open overlay are ignored and not prevented', () => {
    setState({ trial: TRIAL });
    const e = ptr('pointerdown', { id: 1, x: LEFT_X });
    expect(e.defaultPrevented).toBe(false);
    expect(sim.padL).toBe(false);
  });
});

describe('touch jumping', () => {
  it('a quick swipe up jumps once, then needs another full swipe', () => {
    ptr('pointerdown', { id: 1, x: LEFT_X, y: 300, t: 0 });
    ptr('pointermove', { id: 1, x: LEFT_X, y: 300 - SWIPE_PX / 2, t: 1 });
    expect(sim.jumpReq).toBe(false);
    ptr('pointermove', { id: 1, x: LEFT_X, y: 300 - SWIPE_PX - 1, t: 2 });
    expect(sim.jumpReq).toBe(true);
    sim.jumpReq = false;
    ptr('pointermove', { id: 1, x: LEFT_X, y: 300 - SWIPE_PX - 2, t: 3 });
    expect(sim.jumpReq).toBe(false);
    expect(sim.padL).toBe(true); // still walking
  });

  it('a slow drag up does not jump, but a quick flick later in the same drag does', () => {
    ptr('pointerdown', { id: 1, x: LEFT_X, y: 300, t: 0 });
    const late = SWIPE_MS + 1;
    ptr('pointermove', { id: 1, x: LEFT_X, y: 300 - SWIPE_PX - 1, t: late });
    expect(sim.jumpReq).toBe(false);
    const y0 = 300 - SWIPE_PX - 1;
    ptr('pointermove', { id: 1, x: LEFT_X, y: y0 - SWIPE_PX - 1, t: late + 1 });
    expect(sim.jumpReq).toBe(true);
  });

  it('a quick tap with a second finger jumps while the first keeps walking', () => {
    ptr('pointerdown', { id: 1, x: LEFT_X });
    ptr('pointerdown', { id: 2, x: RIGHT_X, y: 100, t: 10 });
    expect(sim.padL).toBe(true); // the second finger does not steer
    ptr('pointerup', { id: 2, x: RIGHT_X + TAP_SLOP - 1, y: 100 - (TAP_SLOP - 1), t: 10 + TAP_MS - 1 });
    expect(sim.jumpReq).toBe(true);
    expect(sim.padL).toBe(true);
  });

  it.each([
    ['held too long', { type: 'pointerup', dx: 0, dy: 0, dt: TAP_MS }],
    ['moved sideways', { type: 'pointerup', dx: TAP_SLOP, dy: 0, dt: 1 }],
    ['moved vertically', { type: 'pointerup', dx: 0, dy: TAP_SLOP, dt: 1 }],
    ['cancelled', { type: 'pointercancel', dx: 0, dy: 0, dt: 1 }],
    ['left the element', { type: 'pointerleave', dx: 0, dy: 0, dt: 1 }],
  ])('a second finger that %s does not jump', (_label, { type, dx, dy, dt }) => {
    ptr('pointerdown', { id: 1, x: LEFT_X });
    ptr('pointerdown', { id: 2, x: RIGHT_X, y: 100, t: 10 });
    ptr(type, { id: 2, x: RIGHT_X + dx, y: 100 + dy, t: 10 + dt });
    expect(sim.jumpReq).toBe(false);
    // the tap is used up: lifting it again does nothing either
    ptr('pointerup', { id: 2, x: RIGHT_X, y: 100, t: 11 });
    expect(sim.jumpReq).toBe(false);
  });

  it('a repeated press of the walking finger re-reads its side', () => {
    ptr('pointerdown', { id: 1, x: LEFT_X });
    ptr('pointerdown', { id: 1, x: RIGHT_X });
    expect(sim.padR).toBe(true);
    expect(sim.padL).toBe(false);
  });
});

describe('on-screen JUMP and TALK buttons', () => {
  it('JUMP requests a jump without stealing focus', () => {
    const e = ptr('pointerdown', {}, jumpBtn());
    expect(sim.jumpReq).toBe(true);
    expect(e.defaultPrevented).toBe(true);
    for (const b of [jumpBtn(), talkBtn()]) {
      const m = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      b.dispatchEvent(m);
      expect(m.defaultPrevented).toBe(true);
    }
  });

  it('JUMP does nothing while input is locked', () => {
    setState({ paused: true });
    ptr('pointerdown', {}, jumpBtn());
    expect(sim.jumpReq).toBe(false);
  });

  it('TALK opens the dialogue of the mentor you are next to', () => {
    standAt(3);
    talkBtn().click();
    expect(state.talk).toBe(3);
  });

  it('TALK does nothing away from mentors or while input is locked', () => {
    talkBtn().click();
    expect(state.talk).toBeNull();
    standAt(3);
    setState({ paused: true });
    talkBtn().click();
    expect(state.talk).toBeNull();
  });

  it('TALK is only shown near someone to talk to, and JUMP hides during a trial', () => {
    const shown = (b: HTMLElement) => b.parentElement!.style.display !== 'none';
    expect(shown(talkBtn())).toBe(false);
    expect(shown(jumpBtn())).toBe(true);
    setState({ near: 2 });
    expect(shown(talkBtn())).toBe(true);
    setState({ near: -1 });
    expect(shown(talkBtn())).toBe(false);
    setState({ trial: TRIAL });
    expect(shown(jumpBtn())).toBe(false);
    setState({ trial: null });
    expect(shown(jumpBtn())).toBe(true);
  });
});

describe('initInput / disposeInput', () => {
  it('a second initInput is a no-op (one pad, one set of listeners)', () => {
    initInput(game, ui);
    expect(ui.querySelectorAll('button')).toHaveLength(2);
    press('ArrowLeft');
    release('ArrowLeft');
    expect(sim.left).toBe(false);
  });

  it('defaults to the #game and #ui elements', () => {
    disposeInput();
    initInput();
    expect(game.style.touchAction).toBe('none');
    expect(ui.querySelectorAll('button')).toHaveLength(2);
    ptr('pointerdown', { id: 1, x: LEFT_X });
    expect(sim.padL).toBe(true);
  });

  it('works without a #ui element (no on-screen pad)', () => {
    disposeInput();
    ui.remove();
    initInput();
    expect(document.querySelectorAll('button')).toHaveLength(0);
    press('Space');
    expect(sim.jumpReq).toBe(true);
  });

  it('disposeInput removes the listeners, the pad and the hit-test, and is safe to repeat', () => {
    const hit = vi.fn(() => 1);
    setWorldHitTest(hit);
    disposeInput();
    disposeInput();
    expect(ui.querySelectorAll('button')).toHaveLength(0);
    press('Space'); press('ArrowLeft');
    ptr('pointerdown', { id: 1, x: LEFT_X });
    window.dispatchEvent(new Event('blur'));
    expect(sim.jumpReq).toBe(false);
    expect(sim.left).toBe(false);
    expect(sim.padL).toBe(false);
    expect(hit).not.toHaveBeenCalled();
    // after re-init, the old hit-test is gone
    initInput(game, ui);
    ptr('pointerdown', { kind: 'mouse' });
    expect(hit).not.toHaveBeenCalled();
  });
});
