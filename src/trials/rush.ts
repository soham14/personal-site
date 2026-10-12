// Five-Star Rush (Sky-Sage Tirumal's trial): catch falling five-star reviews, dodge one-star pebbles. 20 seconds.
import { Layer, el, fontP, sfx, log, sty, txt, SR, STARC, viewW, type Part } from './dom.ts';
import { palette, stdWindow, CRIM, CREAMT } from './shell.ts';
import type { TrialCtx, TrialGame } from './types.ts';

interface Obj { id: number; k: 'star' | 'feat' | 'peb'; x: number; y: number; ph: number; sx: number }
interface Pop { id: number; t: string; x: number; y: number; age: number; c: string }

const d = (l: number, t: number, w: number, h: number, bg: string, ex = '') => ({ l, t, w, h, bg, ex });
const eye = '#1c1c22';
const GD = {
  star: [d(-19, 0, 38, 38, '#e0a93a', STARC), d(-14, 6, 28, 28, '#ffd166', STARC), d(9, -3, 2, 10, '#fff6d6'), d(5, 1, 10, 2, '#fff6d6')],
  feat: [
    d(-26, 0, 52, 52, 'rgba(200,50,58,0.28)', 'border:4px solid #c8323a;border-radius:50%;box-sizing:border-box;box-shadow:0 0 14px 2px rgba(255,236,190,0.55);'),
    d(-19, 7, 38, 38, '#ffd166', STARC), d(-14, 13, 28, 28, '#fff8e6', STARC), d(15, 5, 2, 10, '#ffffff'), d(11, 9, 10, 2, '#ffffff')
  ],
  peb: [
    d(-20, 2, 40, 36, '#6b6b72', 'border-radius:46% 46% 38% 38%;box-shadow:inset -5px -5px 0 #55555c,inset 3px 3px 0 #85858d;'),
    d(-10, 15, 5, 5, eye), d(5, 15, 5, 5, eye),
    d(-12, 10, 10, 3, eye, 'transform:rotate(18deg);'), d(2, 10, 10, 3, eye, 'transform:rotate(-18deg);'),
    d(-6, 26, 12, 6, 'transparent', 'border:3px solid ' + eye + ';border-bottom:0;border-radius:6px 6px 0 0;box-sizing:border-box;'),
    d(10, 3, 7, 7, '#9a9aa2', STARC)
  ]
};

// Static night-grove scenery (gameDecor in the mockup).
function gameDecor(): { decor: Part[]; bulbs: Part[] } {
  const decor: Part[] = [], bulbs: Part[] = [];
  const b = (css: string) => decor.push({ s: 'position:absolute;pointer-events:none;' + css });
  for (let i = 0; i < 18; i++) {
    const l = (i * 37 + 11) % 97 + 1, t = (i * 53 + 17) % 150 + 24, big = i % 5 === 0;
    b('left:' + l + '%;top:' + t + 'px;width:' + (big ? 3 : 2) + 'px;height:' + (big ? 3 : 2) + 'px;background:#f6ecd2;opacity:' + (big ? 0.9 : 0.55) + ';' +
      (i % 3 === 0 ? 'animation:twinkle ' + (1.2 + (i % 4) * 0.4).toFixed(1) + 's steps(1) infinite;animation-delay:-' + (i * 0.3).toFixed(1) + 's;' : ''));
  }
  b('left:26px;top:90px;width:14px;height:230px;background:#220910;');
  b('right:34px;top:84px;width:14px;height:236px;background:#220910;');
  ([[-40, -34, 150, 118, '#4a121b'], [40, -40, 110, 92, '#5c1722'], [-20, 34, 110, 90, '#3b0f18'], [0, 96, 70, 60, '#4a121b']] as [number, number, number, number, string][]).forEach((c) => {
    b('left:' + c[0] + 'px;top:' + c[1] + 'px;width:' + c[2] + 'px;height:' + c[3] + 'px;border-radius:50%;background:' + c[4] + ';');
    b('right:' + c[0] + 'px;top:' + (c[1] + 6) + 'px;width:' + c[2] + 'px;height:' + c[3] + 'px;border-radius:50%;background:' + c[4] + ';');
  });
  b('left:0;right:0;bottom:0;height:12px;background:#1a0d14;border-top:2px solid #5c1722;');
  const cols = [['#ffd166', 'rgba(255,209,102,0.55)'], ['#ef6f6c', 'rgba(239,111,108,0.55)'], ['#f6ecd2', 'rgba(246,236,210,0.5)']];
  for (let i = 0; i < 11; i++) {
    const t = (i + 0.5) / 11, c = cols[i % 3];
    bulbs.push({ s: 'position:absolute;pointer-events:none;left:calc(' + (t * 100).toFixed(2) + '% - 4px);top:' + Math.round(2 + 32 * t * (1 - t)) + 'px;width:8px;height:11px;border-radius:40% 40% 50% 50%;background:' + c[0] + ';box-shadow:0 0 8px 2px ' + c[1] + ';animation:twinkle ' + (1.4 + (i % 3) * 0.3).toFixed(1) + 's steps(1) infinite;animation-delay:-' + (i * 0.37).toFixed(2) + 's;' });
  }
  return { decor, bulbs };
}

// Catcher: a small crimson-robed mage (stand-in for the mockup's hero sprite at the Wizard tier).
function mageParts(step: number): Part[] {
  const bob = step % 2 ? -2 : 0;
  const p = (l: number, t: number, w: number, h: number, bg: string, ex = '') => ({ s: 'position:absolute;left:' + l + 'px;top:' + (t + bob) + 'px;width:' + w + 'px;height:' + h + 'px;background:' + bg + ';' + ex });
  const leg = step === 1 || step === 3 ? 3 : 0;
  return [
    p(20, 0, 30, 24, '#8f1f27', 'clip-path:polygon(55% 0,100% 100%,0 100%);'),
    p(14, 20, 42, 6, '#5a1219'),
    p(24, 26, 22, 20, '#f2c9a0', 'box-shadow:inset 0 -4px 0 #d9a77a;'),
    p(30, 33, 3, 4, eye), p(39, 33, 3, 4, eye),
    p(20, 26, 6, 14, '#3a2418'), p(44, 26, 4, 10, '#3a2418'),
    p(16, 46, 38, 30, CRIM, 'clip-path:polygon(18% 0,82% 0,100% 100%,0 100%);box-shadow:inset -6px 0 0 #8f1f27;'),
    p(20, 54, 30, 4, '#ffd166'),
    { s: 'position:absolute;left:' + (22 - leg) + 'px;top:76px;width:10px;height:8px;background:#2a1a12;' },
    { s: 'position:absolute;left:' + (38 + leg) + 'px;top:76px;width:10px;height:8px;background:#2a1a12;' },
    p(54, 36, 4, 40, '#6b4a3a'), p(50, 30, 12, 10, '#ffd166', STARC)
  ];
}

export function createRush(ctx: TrialCtx): TrialGame {
  const P = palette('rush');
  const root = stdWindow(P, 'Five-Star Rush', 'FIVE-STAR RUSH', 'Quit Five-Star Rush', ctx.close);
  const gw0 = Math.max(240, Math.round(Math.min(680, viewW() * 0.94) - 6));
  const g = {
    phase: 'count' as 'count' | 'play', cd: 3, cdn: -1, t: 0, time: 20, score: 0, combo: 0, cx: gw0 / 2, face: 1, mv: false,
    objs: [] as Obj[], pops: [] as Pop[], nid: 1, spawn: 0.4, stun: 0, glow: 0, flash: 0, clock: 0, gw: gw0
  };
  const k = { l: false, r: false, side: null as null | 'left' | 'right', ptr: null as number | null };

  // HUD
  const hud = el('div', 'flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;padding:8px 12px;box-sizing:border-box;border-bottom:3px solid #1b2040;background:#e6e0cd;');
  const scoreEl = el('span', fontP + 'font-size:18px;font-weight:700;letter-spacing:1px;min-width:96px;');
  const comboEl = el('span');
  const barWrap = el('span', 'display:flex;align-items:center;gap:8px;flex:1 1 150px;min-width:0;');
  const barOuter = el('span', 'display:block;flex:1 1 auto;min-width:0;height:16px;box-sizing:border-box;border:3px solid #1b2040;background:#cfc8b2;');
  const barFill = el('span');
  const timeEl = el('span', fontP + 'flex:none;min-width:34px;text-align:right;font-size:16px;font-weight:700;');
  const live = el('span', SR); live.setAttribute('aria-live', 'polite');
  barOuter.setAttribute('aria-hidden', 'true'); timeEl.setAttribute('aria-hidden', 'true');
  barOuter.appendChild(barFill); barWrap.append(barOuter, timeEl);
  hud.append(scoreEl, comboEl, barWrap, live);

  // Play area
  const area = el('div', 'position:relative;flex:none;height:320px;overflow:hidden;background:linear-gradient(#0d0a1f 0%,#1f1030 55%,#3a1220 100%);touch-action:none;cursor:pointer;');
  const GS = gameDecor();
  new Layer(area).set(GS.decor);
  area.insertAdjacentHTML('beforeend', '<svg aria-hidden="true" viewBox="0 0 100 20" preserveAspectRatio="none" style="position:absolute;left:0;top:0;width:100%;height:20px;pointer-events:none;"><path d="M0 2 Q50 18 100 2" style="fill:none;stroke:#6b4a3a;stroke-width:2;vector-effect:non-scaling-stroke;"/></svg>');
  const bulbBox = el('div'); area.appendChild(bulbBox); new Layer(bulbBox).set(GS.bulbs);
  const partBox = el('div'); area.appendChild(partBox); const parts = new Layer(partBox);
  const catPos = el('div'); catPos.setAttribute('aria-hidden', 'true');
  const catFlip = el('div');
  const catBody = el('div', 'position:absolute;left:0;top:0;width:67px;height:86px;');
  const catParts = new Layer(catBody);
  const catGlow = el('span');
  catFlip.append(catBody, catGlow); catPos.appendChild(catFlip); area.appendChild(catPos);
  const popBox = el('div'); area.appendChild(popBox); const pops = new Layer(popBox);
  const cdEl = el('div'); cdEl.setAttribute('aria-hidden', 'true'); area.appendChild(cdEl);
  const hint = el('div', 'position:absolute;left:50%;bottom:22px;transform:translateX(-50%);z-index:4;pointer-events:none;max-width:calc(100% - 24px);box-sizing:border-box;padding:4px 10px;text-align:center;background:rgba(15,18,38,0.82);border:2px solid #2a3166;color:#f4f1e8;font-size:12px;line-height:1.5;', 'Move with ← → or A D, or hold the left or right side');
  hint.setAttribute('aria-hidden', 'true'); area.appendChild(hint);
  root.append(hud, area);

  // Touch / pointer hold on the play area: left or right half moves the catcher.
  area.addEventListener('pointerdown', (e) => {
    const r = area.getBoundingClientRect();
    if (g.phase === 'count' && r.width > 100 && Math.abs(r.width - g.gw) > 2) { g.gw = Math.round(r.width); g.cx = g.gw / 2; }
    k.ptr = e.pointerId;
    k.side = e.clientX < r.left + r.width / 2 ? 'left' : 'right';
    try { area.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    e.preventDefault();
  });
  area.addEventListener('pointermove', (e) => {
    if (k.ptr === null || e.pointerId !== k.ptr) return;
    const r = area.getBoundingClientRect();
    k.side = e.clientX < r.left + r.width / 2 ? 'left' : 'right';
  });
  const up = (e: PointerEvent) => { if (k.ptr !== null && e.pointerId !== k.ptr) return; k.ptr = null; k.side = null; };
  area.addEventListener('pointerup', up); area.addEventListener('pointercancel', up); area.addEventListener('pointerleave', up);

  let measured = false;
  const catchObj = (o: Obj, ox: number) => {
    const popY = 214;
    if (o.k === 'peb') {
      g.score = Math.max(0, g.score - 1); g.combo = 0; g.stun = 0.4; g.flash = 0.4;
      g.pops.push({ id: g.nid++, t: '−1', x: ox, y: popY, age: 0, c: '#ff8a8a' });
      sfx('peb');
    } else {
      const pts = o.k === 'feat' ? 3 : 1;
      g.score += pts; g.combo += 1; g.glow = 0.35;
      g.pops.push({ id: g.nid++, t: '+' + pts, x: ox, y: popY, age: 0, c: o.k === 'feat' ? '#fff3c4' : '#ffd166' });
      if (o.k === 'feat') sfx('feat'); else sfx('catch', g.combo);
    }
  };

  const render = () => {
    const gp = (x: number) => (x / g.gw * 100).toFixed(2) + '%';
    const count = g.phase === 'count';
    txt(scoreEl, 'SCORE ' + g.score);
    txt(live, 'Score ' + g.score);
    sty(comboEl, fontP + 'display:inline-block;min-width:96px;box-sizing:border-box;padding:2px 8px;text-align:center;font-size:15px;font-weight:700;letter-spacing:1px;' +
      (g.combo >= 3 ? 'background:' + CRIM + ';color:' + CREAMT + ';border:2px solid #1b2040;' : 'visibility:hidden;'));
    txt(comboEl, g.combo >= 3 ? 'x' + g.combo + ' combo' : 'x0 combo');
    const timeLeft = count ? 20 : g.time;
    sty(barFill, 'display:block;height:100%;width:' + Math.max(0, Math.min(100, timeLeft / 20 * 100)).toFixed(1) + '%;background:' + CRIM + ';box-shadow:inset 0 -3px 0 #8f1f27;');
    txt(timeEl, Math.ceil(timeLeft) + 's');

    const gparts: Part[] = [];
    g.objs.forEach((o) => {
      const pulse = o.k === 'feat' ? Math.sin(g.clock * 5) : 0;
      const x = o.x + o.sx;
      GD[o.k].forEach((dd, di) => {
        const ex = dd.ex + (o.k === 'feat' && di === 0 ? 'transform:scale(' + (1 + 0.06 * pulse).toFixed(3) + ');' : '');
        gparts.push({ s: 'position:absolute;pointer-events:none;left:calc(' + gp(x) + ' + ' + dd.l + 'px);top:' + Math.round(o.y + dd.t) + 'px;width:' + dd.w + 'px;height:' + dd.h + 'px;background:' + dd.bg + ';' + ex });
      });
    });
    parts.set(gparts);
    pops.set(g.pops.map((p) => {
      const pr = Math.min(1, p.age / 0.8);
      return { t: p.t, s: 'position:absolute;pointer-events:none;z-index:3;left:' + gp(p.x) + ';top:' + Math.round(p.y - 46 * pr) + 'px;transform:translateX(-50%) scale(' + (1 + 0.25 * pr).toFixed(2) + ');opacity:' + (1 - pr * pr).toFixed(2) + ';white-space:nowrap;' + fontP + 'font-size:24px;font-weight:700;line-height:1;color:' + p.c + ';text-shadow:2px 2px 0 #000;' };
    }));
    const blink = g.flash > 0 && Math.floor(g.flash * 20) % 2 === 0;
    sty(catPos, 'position:absolute;z-index:2;left:calc(' + gp(g.cx) + ' - 34px);top:222px;width:67px;height:86px;' + (blink ? 'opacity:0.35;' : ''));
    sty(catFlip, 'position:absolute;left:0;top:0;width:67px;height:86px;transform:scaleX(' + g.face + ');transform-origin:50% 50%;' + (g.flash > 0 ? 'filter:saturate(0.3) brightness(1.4);' : ''));
    catParts.set(mageParts(g.mv ? 1 + (Math.floor(g.clock / 0.2) % 4) : 0));
    sty(catGlow, g.glow > 0
      ? 'position:absolute;left:36px;top:-10px;width:30px;height:30px;border-radius:50%;background:rgba(255,138,92,0.55);box-shadow:0 0 0 6px rgba(255,138,92,0.3),0 0 18px 8px rgba(255,200,140,0.6);'
      : 'display:none;');
    const showCd = count || g.t < 0.6;
    const cdFrac = count ? Math.ceil(g.cd) - g.cd : 0;
    const cdStyle = count
      ? 'transform:scale(' + (1.5 - 0.5 * Math.min(1, cdFrac * 4)).toFixed(2) + ');opacity:' + Math.min(1, 0.2 + cdFrac * 5).toFixed(2) + ';'
      : 'opacity:' + Math.max(0, 1 - g.t / 0.6).toFixed(2) + ';';
    sty(cdEl, showCd ? 'position:absolute;left:0;right:0;top:62px;z-index:4;text-align:center;pointer-events:none;' + fontP + 'font-size:96px;font-weight:700;line-height:1;color:' + CREAMT + ';text-shadow:4px 4px 0 ' + CRIM + ',6px 6px 0 #000;' + cdStyle : 'display:none;');
    txt(cdEl, count ? String(Math.max(1, Math.ceil(g.cd))) : 'GO!');
    hint.style.display = count ? '' : 'none';
  };

  const finish = () => {
    const sc = g.score;
    const stars = sc >= 25 ? 5 : (sc >= 18 ? 4 : (sc >= 12 ? 3 : (sc >= 6 ? 2 : 1)));
    log('[System] Five-Star Rush: score ' + sc + ' (' + '★'.repeat(stars) + ')');
    sfx('rate', stars);
    ctx.finish({ won: true, score: sc, stars, bonus: sc * 100 });
  };

  return {
    root,
    step(dt) {
      if (!measured) {
        measured = true;
        const w = area.getBoundingClientRect().width;
        if (w > 100) { g.gw = Math.round(w); g.cx = g.gw / 2; }
      }
      const H = 320, CT = 224;
      g.clock += dt;
      if (g.stun > 0) g.stun = Math.max(0, g.stun - dt);
      if (g.glow > 0) g.glow = Math.max(0, g.glow - dt);
      if (g.flash > 0) g.flash = Math.max(0, g.flash - dt);
      let dir = 0;
      if (g.stun <= 0) {
        if (k.l || k.side === 'left') dir -= 1;
        if (k.r || k.side === 'right') dir += 1;
      }
      g.mv = dir !== 0;
      if (dir !== 0) { g.cx = Math.max(34, Math.min(g.gw - 34, g.cx + dir * 420 * dt)); g.face = dir; }
      if (g.phase === 'count') {
        g.cd -= dt;
        const n = Math.max(0, Math.ceil(g.cd));
        if (n !== g.cdn) { g.cdn = n; sfx(n > 0 ? 'beep' : 'go'); }
        if (g.cd <= 0) { g.phase = 'play'; g.cd = 0; g.t = 0; g.time = 20; }
      } else {
        g.t += dt;
        g.time = Math.max(0, 20 - g.t);
        const p = Math.min(1, g.t / 20);
        const v = 180 + 140 * p;
        g.spawn -= dt;
        if (g.spawn <= 0 && g.time > 0.3) {
          g.spawn += (700 - 350 * p) / 1000;
          const kind = Math.random() < 0.25 ? 'peb' : (Math.random() < 0.1 ? 'feat' : 'star');
          g.objs.push({ id: g.nid++, k: kind, x: 24 + Math.random() * (g.gw - 48), y: -54, ph: Math.random() * 6.28, sx: 0 });
        }
        const keep: Obj[] = [];
        for (const o of g.objs) {
          o.y += v * dt;
          o.sx = Math.sin(o.ph + o.y / 46) * 9;
          const hh = o.k === 'feat' ? 52 : 38, ww = o.k === 'feat' ? 52 : 40;
          const bottom = o.y + hh, ox = o.x + o.sx;
          if (bottom >= CT && bottom <= CT + 46 && Math.abs(ox - g.cx) <= 30 + ww * 0.4) { catchObj(o, ox); continue; }
          if (o.y < H + 10) keep.push(o);
        }
        g.objs = keep;
      }
      g.pops.forEach((p) => { p.age += dt; });
      g.pops = g.pops.filter((p) => p.age < 0.8);
      if (g.phase === 'play' && g.t >= 20) { finish(); return false; }
      render();
      return true;
    },
    key(e) {
      const c = e.code;
      if (c === 'ArrowLeft' || c === 'KeyA') { k.l = true; e.preventDefault(); return; }
      if (c === 'ArrowRight' || c === 'KeyD') { k.r = true; e.preventDefault(); return; }
      if (c === 'ArrowUp' || c === 'ArrowDown' || c === 'Space') e.preventDefault();
    },
    keyUp(e) {
      const c = e.code;
      if (c === 'ArrowLeft' || c === 'KeyA') k.l = false;
      if (c === 'ArrowRight' || c === 'KeyD') k.r = false;
    }
  };
}
