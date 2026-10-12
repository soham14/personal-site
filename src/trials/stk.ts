// Keep Leveling (Archivist Darragh's endless stacker; never advances anything).
// Logical play area 640x440 (scaled to fit). Floor k (0 = the base slab) has its top at G - (k+1)*BH before the camera offset.
import { Layer, el, fontP, sfx, log, sty, txt, SR, lerpColor, isoCube, viewW, type Part } from './dom.ts';
import { palette, titleBar } from './shell.ts';
import { state } from '../state.ts';
import { EXP_BASE } from '../content.ts';
import type { TrialCtx, TrialGame, TrialResult } from './types.ts';

/** Play-area geometry: size, ground line, block height, starting width, perfect-drop tolerance, slider margin from the walls. */
export const STK = { W: 640, H: 440, G: 412, BH: 26, W0: 190, PERFECT: 4, EDGE: 8 };
const C = STK;
/** Floors needed for the trial's title. */
export const STK_TITLE_FLOORS = 20;
/** Most EXP bonus Keep Leveling can ever add, and the "to next advancement" percent it never passes. */
export const EXP_BONUS_MAX = 56;
export const EXP_CEIL = 99;

/** Slider speed (px/s) at a given height. */
export function slideSpeed(floors: number): number {
  return Math.min(340, 170 + 16 * Math.floor(floors / 5));
}

/** Accumulated EXP bonus after a run of `floors` floors. */
export function stkExpBonus(prev: number, floors: number): number {
  return Math.min(EXP_BONUS_MAX, prev + Math.floor(floors / 5));
}

/** Sound rating (1-5) for a run. */
export function stkRating(f: number): number {
  return f >= 30 ? 5 : (f >= 20 ? 4 : (f >= 12 ? 3 : (f >= 5 ? 2 : 1)));
}

export interface Landing { cx: number; w: number; combo: number; perfect: boolean }
/**
 * Where a block dropped at `mx` (width `mw`) lands on `top`: null on a miss (almost no overlap);
 * a perfect drop snaps onto the top, keeps the width and grows the combo (every third one widens, up to W0);
 * otherwise only the overlap remains and the combo resets.
 */
export function landBlock(top: { cx: number; w: number }, mx: number, mw: number, combo: number): Landing | null {
  const nl = Math.max(mx - mw / 2, top.cx - top.w / 2), nr = Math.min(mx + mw / 2, top.cx + top.w / 2), ov = nr - nl;
  if (ov < 2) return null;
  if (Math.abs(mx - top.cx) <= C.PERFECT) {
    const c = combo + 1;
    return { cx: top.cx, w: c % 3 === 0 ? Math.min(C.W0, mw + 10) : mw, combo: c, perfect: true };
  }
  return { cx: (nl + nr) / 2, w: ov, combo: 0, perfect: false };
}

/** True if a row whose top is at y (view coordinates) is at least partly inside the play area. */
export function rowVisible(y: number): boolean {
  return y > -C.BH && y < C.H;
}

/** Left x of a "Lv." tag: right of the block when it fits, otherwise left of it. */
export function levelTagX(cx: number, w: number): number {
  return cx + w / 2 + 8 + 50 <= C.W ? cx + w / 2 + 8 : cx - w / 2 - 58;
}

/** The result of a run of `f` floors given the EXP bonus banked so far. */
export function stkResult(f: number, expBonus: number): TrialResult {
  const eb = stkExpBonus(expBonus, f);
  return { won: true, score: f, stars: 0, bonus: 0, floors: f, exp: f * 50, capped: EXP_BASE + eb >= EXP_CEIL, title: f >= STK_TITLE_FLOORS };
}
const f1 = (v: number) => Math.round(v * 10) / 10;
let starMemo: { x: number; y: number; z: number; tw: boolean; o: number }[] | null = null;

export function createStk(ctx: TrialCtx): TrialGame {
  const g = {
    phase: 'splay' as 'splay' | 'sover', blocks: [{ cx: C.W / 2, w: C.W0 }], floors: 0, combo: 0, mw: C.W0,
    mx: C.W0 / 2 + C.EDGE, dir: 1, side: -1, cam: 0, over: 0, clock: 0,
    pieces: [] as { cx: number; w: number; y: number; vy: number; vx: number; rot: number; vr: number; age: number }[],
    rings: [] as { cx: number; w: number; ys: number; age: number }[],
    pops: [] as { t: string; cx: number; ys: number; age: number; c: string }[]
  };

  const P = palette('stk');
  const root = el('div');
  root.setAttribute('role', 'dialog'); root.classList.add('cq-pop');
  root.setAttribute('aria-label', 'Keep Leveling');
  root.appendChild(titleBar(P, 'KEEP LEVELING', 'Quit Keep Leveling', ctx.close, '#0f1015'));
  const area = el('div');
  const inner = el('div');
  area.appendChild(inner);
  const mk = (host: HTMLElement) => { const b = el('div'); b.setAttribute('aria-hidden', 'true'); host.appendChild(b); return b; };
  const sky = new Layer(mk(inner)), stars = new Layer(mk(inner));
  const moon = mk(inner);
  const cubes = new Layer(mk(inner)), spires = new Layer(mk(inner)), blocks = new Layer(mk(inner)), tags = new Layer(mk(inner));
  const pieces = new Layer(mk(inner)), rings = new Layer(mk(inner)), pops = new Layer(mk(inner));
  const hud = el('div', 'position:absolute;left:8px;right:8px;top:8px;z-index:6;display:flex;flex-wrap:wrap;gap:6px 8px;pointer-events:none;');
  const chip = fontP + 'display:inline-block;padding:3px 10px;font-size:15px;font-weight:700;letter-spacing:1px;background:rgba(20,20,24,0.84);border:2px solid #4a4a52;color:#e8eaf0;';
  const floorsEl = el('span', chip), bestEl = el('span', chip), comboEl = el('span');
  const live = el('span', SR); live.setAttribute('aria-live', 'polite');
  hud.append(floorsEl, bestEl, comboEl, live);
  area.appendChild(hud);
  const hint = el('div', 'display:block;margin:8px auto 0;max-width:100%;box-sizing:border-box;padding:2px 10px;text-align:center;color:#c9ccd3;font-size:11px;line-height:1.5;', 'Tap, click or press Space to drop · Esc to quit');
  hint.setAttribute('aria-hidden', 'true');
  root.append(area, hint);
  area.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') e.preventDefault(); drop(); });

  const cubeCols = ['#c9ccd3', '#6b6e76', '#4a4c52'];
  const cubeParts: Part[] = [];
  ([[84, 262, 28, 11], [452, 188, 22, 14], [278, 330, 18, 9]]).forEach((q, i) => isoCube(q[0], q[1], q[2], cubeCols, 'opacity:0.55;animation:drift ' + q[3] + 's ease-in-out infinite;animation-delay:-' + i * 3 + 's;').forEach((p) => cubeParts.push(p)));
  cubes.set(cubeParts);
  if (!starMemo) {
    starMemo = [];
    for (let i = 0; i < 130; i++) starMemo.push({ x: (i * 97 + 13) % 627 + 6, y: (i * 53 + 7) % 372 + 6, z: i % 9 === 0 ? 3 : 2, tw: i % 4 === 0, o: i % 3 === 0 ? 0.95 : 0.6 });
  }

  // Drop the sliding block: keep the overlap, slice off the overhang, snap on a perfect drop, game over on a total miss.
  function drop() {
    if (g.phase !== 'splay') return;
    const top = g.blocks[g.floors];
    const L = g.mx - g.mw / 2, R = g.mx + g.mw / 2, TL = top.cx - top.w / 2, TR = top.cx + top.w / 2;
    const land = landBlock(top, g.mx, g.mw, g.combo);
    const k = g.floors + 1;
    const ys = C.G - (k + 1) * C.BH;
    const piece = (l: number, r: number, dirn: number) => g.pieces.push({ cx: (l + r) / 2, w: r - l, y: ys, vy: 0, vx: dirn * 46, rot: 0, vr: dirn * (110 + Math.random() * 90), age: 0 });
    if (!land) {
      piece(L, R, g.mx >= top.cx ? 1 : -1);
      g.combo = 0;
      g.phase = 'sover';
      g.over = 1.1;
      g.pops.push({ t: 'Missed!', cx: Math.max(60, Math.min(C.W - 60, g.mx)), ys, age: 0, c: '#ff9e84' });
      sfx('sover');
      render();
      return;
    }
    const { cx, w } = land;
    g.combo = land.combo;
    if (land.perfect) {
      g.rings.push({ cx, w, ys, age: 0 });
      g.pops.push({ t: 'Perfect!', cx, ys, age: 0, c: '#e8eaf0' });
      sfx('sdrop');
      sfx('sperf', g.combo, 0, 0.04);
    } else {
      if (L < TL) piece(L, TL, -1);
      if (R > TR) piece(TR, R, 1);
      sfx('sdrop');
      if (L < TL || R > TR) sfx('sslice', 0, 0, 0.03);
    }
    if (k % 10 === 0) sfx('sfan', 0, 0, 0.2);
    g.blocks.push({ cx, w });
    g.floors = k;
    if (k % 10 === 0) g.pops.push({ t: 'Lv. ' + k, cx: Math.max(60, Math.min(C.W - 60, cx)), ys: ys - 30, age: 0, c: '#ffd166' });
    g.mw = w;
    g.side = -g.side;
    g.mx = g.side > 0 ? C.W - w / 2 - C.EDGE : w / 2 + C.EDGE;
    g.dir = g.side > 0 ? -1 : 1;
    render();
  }

  function render() {
    const cam = g.cam;
    const lvl = Math.floor(g.floors / 10);
    const dark = Math.min(0.55, lvl * 0.11);
    const winW = Math.min(680, viewW() * 0.94);
    const aw = Math.max(280, Math.min(C.W, winW - 6));
    const kz = aw / C.W;
    sky.set(['#0b0e1c', '#10142a', '#161a33', '#1c2140', '#232950'].map((c, i) => ({ s: 'position:absolute;left:0;right:0;top:' + (i * 20) + '%;height:21%;background:' + lerpColor(c, '#03040a', dark) + ';' })));
    stars.set(starMemo!.slice(0, Math.min(130, 38 + lvl * 9)).map((s0, i) => ({
      s: 'position:absolute;left:' + s0.x + 'px;top:' + s0.y + 'px;width:' + s0.z + 'px;height:' + s0.z + 'px;background:#e8eaf0;opacity:' + s0.o + ';' + (s0.tw ? 'animation:twinkle ' + (1.3 + (i % 5) * 0.35).toFixed(2) + 's steps(1) infinite;animation-delay:-' + (i % 7) * 0.3 + 's;' : '')
    })));
    spires.set([[26, 74, 150], [236, 56, 118], [508, 84, 176]].map((sp) => ({ s: 'position:absolute;left:' + sp[0] + 'px;bottom:28px;width:' + sp[1] + 'px;height:' + sp[2] + 'px;background:#12152b;clip-path:polygon(50% 0,100% 100%,0 100%);transform:translateY(' + f1(cam * 0.25) + 'px);' })));
    sty(moon, 'position:absolute;right:46px;top:' + f1(46 + cam * 0.05) + 'px;width:54px;height:54px;border-radius:50%;box-shadow:inset -16px -5px 0 0 #e8eaf0,0 0 0 8px rgba(232,234,240,0.06);opacity:' + (1 - dark * 0.8).toFixed(2) + ';');

    const bl: Part[] = [], tg: Part[] = [];
    const body = (cx: number, w: number, y: number, k: number) => {
      const gold = k > 0 && k % 10 === 0;
      bl.push({ s: 'position:absolute;left:' + f1(cx - w / 2) + 'px;top:' + f1(y) + 'px;width:' + f1(w) + 'px;height:' + C.BH + 'px;box-sizing:border-box;background:#2b2b2e;box-shadow:' +
        (gold ? 'inset 0 3px 0 #ffd166,inset 0 -3px 0 #ffd166,inset 3px 0 0 #ffd166,inset -3px 0 0 #b8841c;' : 'inset 0 3px 0 #c9ccd3,inset 3px 0 0 #8d9099,inset -3px -3px 0 #1c1c1f;') });
      bl.push({ s: 'position:absolute;left:' + f1(cx - w / 2 + 6) + 'px;top:' + f1(y + 6) + 'px;width:' + f1(Math.max(0, w - 12)) + 'px;height:12px;background:' + (k % 2 ? '#3a3a40' : '#34343a') + ';' });
      if (gold) {
        tg.push({ t: 'Lv. ' + k, s: 'position:absolute;left:' + f1(levelTagX(cx, w)) + 'px;top:' + f1(y + 5) + 'px;width:50px;height:16px;line-height:16px;text-align:center;background:#ffd166;color:#2b2b2e;' + fontP + 'font-size:11px;font-weight:700;letter-spacing:1px;box-shadow:2px 2px 0 #000;' });
      }
    };
    bl.push({ s: 'position:absolute;left:0px;top:' + f1(C.G + cam) + 'px;width:' + C.W + 'px;height:80px;background:#14172b;border-top:3px solid #4a4a52;' });
    bl.push({ s: 'position:absolute;left:150px;top:' + f1(C.G + cam) + 'px;width:340px;height:10px;background:#34343a;box-shadow:inset 0 3px 0 #8d9099;' });
    g.blocks.forEach((b, k) => {
      const y = C.G - (k + 1) * C.BH + cam;
      if (rowVisible(y)) body(b.cx, b.w, y, k);
    });
    if (g.phase === 'splay') body(g.mx, g.mw, C.G - (g.floors + 2) * C.BH + cam, g.floors + 1);
    blocks.set(bl);
    tags.set(tg);
    pieces.set(g.pieces.map((p) => ({ s: 'position:absolute;left:' + f1(p.cx - p.w / 2) + 'px;top:' + f1(p.y + cam) + 'px;width:' + f1(p.w) + 'px;height:' + C.BH + 'px;box-sizing:border-box;background:#2b2b2e;box-shadow:inset 0 3px 0 #c9ccd3,inset 3px 0 0 #8d9099;transform:rotate(' + f1(p.rot) + 'deg);opacity:' + Math.max(0, 1 - p.age / 0.9).toFixed(2) + ';' })));
    rings.set(g.rings.map((r) => {
      const q = Math.min(1, r.age / 0.6);
      return { s: 'position:absolute;left:' + f1(r.cx - r.w / 2 - 5) + 'px;top:' + f1(r.ys + cam - 5) + 'px;width:' + f1(r.w + 10) + 'px;height:' + (C.BH + 10) + 'px;box-sizing:border-box;border:3px solid #e8eaf0;transform:scale(' + (1 + 0.5 * q).toFixed(2) + ');opacity:' + (1 - q).toFixed(2) + ';' };
    }));
    pops.set(g.pops.map((p) => {
      const q = Math.min(1, p.age / 0.9);
      return { t: p.t, s: 'position:absolute;left:' + f1(p.cx) + 'px;top:' + f1(p.ys + cam - 30 - 34 * q) + 'px;transform:translateX(-50%);opacity:' + (1 - q * q).toFixed(2) + ';white-space:nowrap;' + fontP + 'font-size:22px;font-weight:700;line-height:1;color:' + p.c + ';text-shadow:2px 2px 0 #000;' };
    }));

    sty(root, 'position:absolute;left:0;right:0;margin:0 auto;top:50%;transform:translateY(-50%);width:' + Math.round(aw + 6) + 'px;max-width:94%;box-sizing:border-box;background:#2b2b2e;border:3px solid #0f1015;box-shadow:inset 0 0 0 2px #4a4a52,6px 6px 0 #000;color:#e8eaf0;');
    sty(area, 'position:relative;flex:none;width:' + Math.round(aw) + 'px;height:' + Math.round(C.H * kz) + 'px;margin:0 auto;overflow:hidden;background:#0b0e1c;cursor:pointer;touch-action:none;');
    sty(inner, 'position:absolute;left:0;top:0;width:' + C.W + 'px;height:' + C.H + 'px;transform:scale(' + kz.toFixed(4) + ');transform-origin:0 0;');
    txt(floorsEl, 'FLOORS ' + g.floors);
    txt(bestEl, 'BEST ' + Math.max(state.best.stk, g.floors));
    sty(comboEl, g.combo >= 2 ? chip + 'background:#c9ccd3;color:#2b2b2e;border-color:#e8eaf0;' : 'display:none;');
    txt(comboEl, 'x' + g.combo + ' combo');
    txt(live, 'Floors ' + g.floors);
  }

  function finish() {
    const f = g.floors;
    log('[System] Keep Leveling: ' + f + ' floors');
    sfx('rate', stkRating(f));
    ctx.finish(stkResult(f, state.expBonus));
  }

  render();
  return {
    root,
    step(dt) {
      g.clock += dt;
      if (g.phase === 'splay') {
        const v = slideSpeed(g.floors);
        const lo = g.mw / 2 + C.EDGE, hi = C.W - g.mw / 2 - C.EDGE;
        g.mx += g.dir * v * dt;
        if (g.mx >= hi) { g.mx = Math.max(lo, hi - (g.mx - hi)); g.dir = -1; }
        else if (g.mx <= lo) { g.mx = Math.min(hi, lo + (lo - g.mx)); g.dir = 1; }
      } else {
        g.over -= dt;
        if (g.over <= 0) { finish(); return false; }
      }
      // the view eases upward so the tower top stays in the upper third
      const topY = C.G - (g.floors + 1) * C.BH;
      const target = Math.max(0, 150 - topY);
      g.cam += (target - g.cam) * Math.min(1, 6 * dt);
      g.pieces.forEach((p) => { p.vy += 1100 * dt; p.y += p.vy * dt; p.cx += p.vx * dt; p.rot += p.vr * dt; p.age += dt; });
      g.pieces = g.pieces.filter((p) => p.age < 0.9);
      g.rings.forEach((r) => { r.age += dt; });
      g.rings = g.rings.filter((r) => r.age < 0.6);
      g.pops.forEach((p) => { p.age += dt; });
      g.pops = g.pops.filter((p) => p.age < 0.9);
      render();
      return true;
    },
    // Space / Enter drop the block (only when no button has focus, so the close button still works with the keyboard).
    key(e, direct) {
      if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter') {
        if (!direct) return;
        e.preventDefault();
        if (!e.repeat) drop();
        return;
      }
      if (e.code.indexOf('Arrow') === 0) e.preventDefault();
    }
  };
}
