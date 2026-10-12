// Keyboard + touch input for the world (ported from the mockup's onKeyDown / onKeyUp / onPtrDown / onPtrMove / onPtrEnd).
// Keys: ← → / A D walk, Space jump, ↑ / W talk or climb, ↓ / S drop or climb down, C / H / P / Q / I open the profile,
// Esc closes dialogue / profile / résumé, M toggles sound. Touch: hold the left or right half to walk, swipe up or tap a
// second finger to jump; on-screen JUMP (bottom-left) and TALK (bottom-right) buttons live in #ui.
import { state, setState, subscribe, inputLocked, emit } from '../state.ts';
import { sim, ladderAt, nearNpc, openTalk, walkTo } from './sim.ts';

let hitTest: ((clientX: number, clientY: number) => number) | null = null;
/** WorldScene registers this: returns the mentor/portal index under a client point, or -1. */
export function setWorldHitTest(fn: (clientX: number, clientY: number) => number) { hitTest = fn; }

/** Touch gestures: a swipe up of more than SWIPE_PX within SWIPE_MS jumps; a second finger lifted within TAP_MS and TAP_SLOP px jumps. */
export const SWIPE_PX = 40, SWIPE_MS = 250, TAP_MS = 200, TAP_SLOP = 15;

const tpInit = () => ({ walkPtr: null as number | null, rectL: 0, rectW: 1, side: null as 'left' | 'right' | null, anchorY: 0, anchorT: 0, tapId: null as number | null, tapX: 0, tapY: 0, tapT: 0 });
const tp = tpInit();

function sfx(name: string, a?: unknown) { emit('sfx', { name, a }); }

function setSide(side: 'left' | 'right' | null) {
  tp.side = side;
  sim.padL = side === 'left';
  sim.padR = side === 'right';
}

function openProfile(tab: 'journey' | 'skills' | 'trophies') {
  sfx('ui', true);
  emit('log', { text: '[System] Opened ' + (tab === 'trophies' ? 'Trophies' : 'Character') + ' window.' });
  setState({ profileOpen: true, profileTab: tab, profileAlert: false });
}
function closeProfile() { sfx('ui', false); setState({ profileOpen: false }); }

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && !!el.closest && !!el.closest('input, textarea, select, [contenteditable="true"]');
}

function onKeyDown(e: KeyboardEvent) {
  if (isTyping(e.target)) return;
  const k = e.code || '';
  if (!state.focused || state.isTouch) setState({ focused: true, isTouch: false });
  if (state.trial !== null) return; // the trial module owns the keyboard while a trial is open
  const talkOpen = state.talk !== null;
  const sheetOpen = state.profileOpen;
  const lockedUI = talkOpen || sheetOpen || state.resumeOpen;
  const tgt = e.target as HTMLElement | null;
  const onControl = !!tgt && !!tgt.closest && !!tgt.closest('button, a');

  if (k === 'KeyC' || k === 'KeyQ' || k === 'KeyI') {
    if (e.repeat || talkOpen) return;
    if (k === 'KeyC') { if (sheetOpen) closeProfile(); else openProfile('journey'); }
    else if (k === 'KeyQ') openProfile('journey');
    else openProfile('trophies');
    return;
  }
  if (k === 'Space' || e.key === ' ') {
    if (onControl) return; // let a focused button activate normally
    e.preventDefault();
    if (lockedUI || e.repeat || inputLocked()) return;
    sim.jumpReq = true;
    return;
  }
  const L = k === 'ArrowLeft' || k === 'KeyA';
  const R = k === 'ArrowRight' || k === 'KeyD';
  const U = k === 'ArrowUp' || k === 'KeyW';
  const D = k === 'ArrowDown' || k === 'KeyS';
  if (!(L || R || U || D)) return;
  if (!onControl || !lockedUI) e.preventDefault();
  if (inputLocked()) return;
  if (L) sim.left = true;
  if (R) sim.right = true;
  if (D) { sim.down = true; if (!e.repeat) sim.dropReq = true; }
  if (U) {
    sim.up = true;
    if (!e.repeat) {
      const lad = ladderAt(sim.px);
      const canClimb = lad && sim.py < lad.top - 0.5;
      if (!canClimb) {
        const n = nearNpc(sim.px, sim.py);
        if (n >= 0) openTalk(n);
      }
    }
  }
}

function onKeyUp(e: KeyboardEvent) {
  const k = e.code || '';
  if (k === 'ArrowLeft' || k === 'KeyA') sim.left = false;
  if (k === 'ArrowRight' || k === 'KeyD') sim.right = false;
  if (k === 'ArrowUp' || k === 'KeyW') sim.up = false;
  if (k === 'ArrowDown' || k === 'KeyS') sim.down = false;
}

function onBlur() {
  sim.left = false; sim.right = false; sim.up = false; sim.down = false;
  tp.walkPtr = null; tp.tapId = null; setSide(null);
  setState({ focused: false, half: null });
}

function onPtrDown(e: PointerEvent, el: HTMLElement) {
  if (!state.focused) setState({ focused: true });
  const overlay = state.talk !== null || state.profileOpen || state.resumeOpen || state.trial !== null;
  if (e.pointerType !== 'touch') {
    if (overlay || e.button !== 0) return;
    const n = hitTest ? hitTest(e.clientX, e.clientY) : -1;
    if (n >= 0) walkTo(n, true);
    return;
  }
  if (overlay) return;
  e.preventDefault();
  const now = e.timeStamp;
  // A second finger while walking: remember it; a quick tap on release jumps
  if (tp.walkPtr !== null && tp.walkPtr !== e.pointerId) {
    tp.tapId = e.pointerId; tp.tapX = e.clientX; tp.tapY = e.clientY; tp.tapT = now;
    return;
  }
  // Tapping a mentor / the portal walks there and talks (like the mockup's NPC buttons)
  const n = hitTest ? hitTest(e.clientX, e.clientY) : -1;
  if (n >= 0) { setState({ isTouch: true }); walkTo(n, true); return; }
  const rect = el.getBoundingClientRect();
  // Capture the finger so scenery changing under it can't end the walk
  try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  tp.walkPtr = e.pointerId;
  tp.rectL = rect.left; tp.rectW = rect.width || 1;
  tp.anchorY = e.clientY; tp.anchorT = now;
  const side = e.clientX < tp.rectL + tp.rectW / 2 ? 'left' : 'right';
  setSide(side);
  setState({ isTouch: true, half: side });
}

function onPtrMove(e: PointerEvent, el: HTMLElement) {
  if (e.pointerType !== 'touch') {
    // hover feedback over mentors / the portal
    const n = hitTest ? hitTest(e.clientX, e.clientY) : -1;
    el.style.cursor = n >= 0 && !inputLocked() ? 'pointer' : '';
    return;
  }
  if (tp.walkPtr === null || e.pointerId !== tp.walkPtr) return;
  const now = e.timeStamp;
  const side = e.clientX < tp.rectL + tp.rectW / 2 ? 'left' : 'right';
  if (side !== tp.side) { setSide(side); setState({ half: side }); }
  // Swipe up: more than ~40px within ~250ms of the anchor = one jump
  if (now - tp.anchorT > SWIPE_MS) { tp.anchorY = e.clientY; tp.anchorT = now; }
  else if (tp.anchorY - e.clientY > SWIPE_PX) { sim.jumpReq = true; tp.anchorY = e.clientY; tp.anchorT = now; }
}

function onPtrEnd(e: PointerEvent) {
  if (e.pointerType !== 'touch') return;
  // A held walking finger only ends on a real lift or a browser cancel; spurious leave events are ignored
  if (e.type === 'pointerleave' && e.pointerId === tp.walkPtr) return;
  if (e.pointerId === tp.walkPtr) { tp.walkPtr = null; setSide(null); setState({ half: null }); return; }
  if (e.pointerId === tp.tapId) {
    const quick = e.type === 'pointerup' && (e.timeStamp - tp.tapT) < TAP_MS && Math.abs(e.clientX - tp.tapX) < TAP_SLOP && Math.abs(e.clientY - tp.tapY) < TAP_SLOP;
    tp.tapId = null;
    if (quick) sim.jumpReq = true;
  }
}

// ---- on-screen JUMP / TALK buttons ----
const ACC = '#ffd166';
const PAD_BTN = 'display:flex;align-items:center;justify-content:center;box-sizing:border-box;border:3px solid ' + ACC + ';border-radius:0;background:rgba(27,32,64,0.78);color:' + ACC + ";font-family:'Pixelify Sans',monospace;font-size:15px;font-weight:700;letter-spacing:1px;cursor:pointer;box-shadow:3px 3px 0 #000;touch-action:none;height:48px;padding:0 14px;";

function mountPad(ui: HTMLElement): () => void {
  const wrapL = document.createElement('div');
  wrapL.style.cssText = 'position:absolute;left:16px;bottom:16px;z-index:9;touch-action:none;pointer-events:auto;';
  const jump = document.createElement('button');
  jump.type = 'button';
  jump.setAttribute('aria-label', 'Jump');
  jump.dataset.noWalk = '1';
  jump.textContent = 'JUMP';
  jump.style.cssText = PAD_BTN + 'min-width:72px;';
  jump.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!inputLocked()) sim.jumpReq = true; });
  jump.addEventListener('mousedown', (e) => e.preventDefault());
  wrapL.appendChild(jump);

  const wrapR = document.createElement('div');
  wrapR.style.cssText = 'position:absolute;right:16px;bottom:16px;z-index:9;touch-action:none;pointer-events:auto;';
  const talk = document.createElement('button');
  talk.type = 'button';
  talk.setAttribute('aria-label', 'Talk');
  talk.dataset.noWalk = '1';
  talk.textContent = '↑ TALK';
  talk.style.cssText = PAD_BTN + 'min-width:48px;';
  talk.addEventListener('mousedown', (e) => e.preventDefault());
  talk.addEventListener('click', () => { const n = nearNpc(sim.px, sim.py); if (n >= 0 && !inputLocked()) openTalk(n); });
  wrapR.appendChild(talk);

  ui.appendChild(wrapL);
  ui.appendChild(wrapR);
  const sync = () => {
    const show = state.near >= 0;
    wrapR.style.display = show ? '' : 'none';
    wrapL.style.display = state.trial !== null ? 'none' : '';
  };
  const unsub = subscribe(sync);
  sync();
  return () => { unsub(); wrapL.remove(); wrapR.remove(); };
}

let teardown: (() => void) | null = null;
/** Wire keyboard (window), pointer (the #game element) and the on-screen pad (in #ui). Idempotent until disposeInput(). */
export function initInput(gameEl: HTMLElement = document.getElementById('game')!, ui: HTMLElement = document.getElementById('ui')!) {
  if (teardown) return;
  const ac = new AbortController();
  const o = { signal: ac.signal };
  setState({ isTouch: typeof window !== 'undefined' && 'ontouchstart' in window && navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches });
  window.addEventListener('keydown', onKeyDown, o);
  window.addEventListener('keyup', onKeyUp, o);
  window.addEventListener('blur', onBlur, o);
  gameEl.style.touchAction = 'none';
  gameEl.addEventListener('pointerdown', (e) => onPtrDown(e, gameEl), o);
  gameEl.addEventListener('pointermove', (e) => onPtrMove(e, gameEl), o);
  gameEl.addEventListener('pointerup', onPtrEnd, o);
  gameEl.addEventListener('pointercancel', onPtrEnd, o);
  gameEl.addEventListener('pointerleave', onPtrEnd, o);
  gameEl.addEventListener('contextmenu', (e) => e.preventDefault(), o);
  // Opening an overlay drops any held direction (like the mockup's clearInput on trials/dialogue)
  let wasLocked = false;
  const unsubLock = subscribe(() => {
    const l = state.talk !== null || state.profileOpen || state.resumeOpen || state.trial !== null;
    if (l && !wasLocked) { sim.left = false; sim.right = false; sim.up = false; sim.down = false; tp.walkPtr = null; setSide(null); }
    wasLocked = l;
  });
  const unmountPad = ui ? mountPad(ui) : null;
  teardown = () => { ac.abort(); unsubLock(); unmountPad?.(); };
}

/** Undo initInput: remove every listener and the on-screen pad, forget gestures and the hit-test (tests / a fresh start). */
export function disposeInput() {
  teardown?.();
  teardown = null;
  hitTest = null;
  Object.assign(tp, tpInit());
}
