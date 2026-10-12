// Lantern Match (Ranger Amelia's trial): 12 lanterns on 3 strings, 6 symbol pairs, 60 seconds.
// Card states: 0 dim, 1 lit (waiting for its partner), 2 matched.
import { Layer, el, fontP, sfx, log, sty, txt, SR, STARC, lerpColor, type Part } from './dom.ts';
import { palette, stdWindow } from './shell.ts';
import type { TrialCtx, TrialGame } from './types.ts';

const INK = '#3b1d12', INK2 = '#6b3b22', INK3 = '#55301b', PAPER = '#ffcf8a';
const HEXC = 'clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);';
const DIAC = 'clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);';
const f2 = (v: number) => Math.round(v * 100) / 100;
const AH = 330, FX = [0.14, 0.38, 0.62, 0.86], Y0S = [20, 124, 228], SAG = 24;
type G = [number, number, number, number, string, string?];
// symbols: open book (Berkeley), hexagon (SAP), five-point star (Yelp), block (Roblox), wand, gold scarf; each in a 26x26 box
const glyphs: G[][] = [
  [[0, 4, 12, 16, INK, 'clip-path:polygon(0 10%,100% 0,100% 100%,0 90%);'], [14, 4, 12, 16, INK, 'clip-path:polygon(0 0,100% 10%,100% 90%,0 100%);'], [2, 8, 8, 1.5, PAPER], [2, 12, 8, 1.5, PAPER], [16, 8, 8, 1.5, PAPER], [16, 12, 8, 1.5, PAPER], [1, 21, 24, 2, INK2]],
  [[3, 2, 20, 22, INK, HEXC], [8, 7, 10, 12, PAPER, HEXC]],
  [[1, 1, 24, 24, INK, STARC]],
  [[1, 1, 24, 12, INK2, DIAC], [1, 7, 12, 16, INK, 'clip-path:polygon(0 0,100% 37%,100% 100%,0 63%);'], [13, 7, 12, 16, INK3, 'clip-path:polygon(0 37%,100% 0,100% 63%,0 100%);']],
  [[3, 3, 20, 20, INK, 'clip-path:polygon(0 82%,18% 100%,100% 18%,82% 0);'], [17, 0, 9, 9, INK, STARC], [2, 6, 3, 3, INK2, DIAC], [6, 1, 3, 3, INK2, DIAC]],
  [[1, 5, 24, 8, '#8a5a0a'], [1, 11, 24, 2, '#4d3205'], [15, 12, 8, 13, '#8a5a0a'], [15, 22, 8, 3, '#4d3205'], [5, 5, 2, 8, '#4d3205'], [10, 5, 2, 8, '#4d3205']]
];
/** Spoken names of the symbols, by card value. */
export const symNames = ['an open book', 'a hexagon', 'a five-point star', 'a cube', 'a wand', 'a gold scarf'];

/** Shuffle the six symbol pairs onto the 12 lanterns (Fisher-Yates). */
export function dealLanterns(rand: () => number = Math.random): number[] {
  const cards = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
  }
  return cards;
}

/** Win score: seconds left plus a bonus for few moves. */
export function lanScore(secs: number, moves: number): number { return secs * 5 + Math.max(0, 30 - moves) * 10; }
export function lanStars(sc: number): number { return sc >= 330 ? 5 : (sc >= 260 ? 4 : (sc >= 190 ? 3 : (sc >= 110 ? 2 : 1))); }

/** Seconds on the fuse. */
export const LAN_TIME = 60;

export function createLan(ctx: TrialCtx): TrialGame {
  const cards = dealLanterns();
  const g = {
    phase: 'lplay' as 'lplay' | 'lwin', cards, cs: cards.map(() => 0), first: -1, second: -1, lock: 0,
    moves: 0, pairs: 0, t: 0, time: LAN_TIME, cur: -1, clock: 0, acc: 0, dirty: false, winT: 0, secs: 0, bursts: [] as { i: number; age: number }[]
  };

  const P = palette('lan');
  const root = stdWindow(P, 'Lantern Match', 'LANTERN MATCH', 'Quit Lantern Match', ctx.close);
  const hud = el('div', 'flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;padding:8px 14px;box-sizing:border-box;border-bottom:3px solid #1b2040;background:#241b2e;color:#f6ecd2;');
  const stat = fontP + 'font-size:17px;font-weight:700;letter-spacing:1px;min-width:98px;';
  const pairsEl = el('span', stat), movesEl = el('span', stat);
  const fuse = el('span', 'position:relative;flex:1 1 150px;min-width:110px;height:24px;margin-right:6px;'); fuse.setAttribute('aria-hidden', 'true');
  const burnt = el('span', 'position:absolute;left:0;right:0;top:10px;height:5px;background:#4a3b52;');
  const cord = el('span'), flame = el('span'), flameCore = el('span');
  fuse.append(burnt, cord, flame, flameCore);
  const timeEl = el('span'); timeEl.setAttribute('aria-hidden', 'true');
  const live = el('span', SR); live.setAttribute('aria-live', 'polite');
  hud.append(pairsEl, movesEl, fuse, timeEl, live);

  const area = el('div', 'position:relative;flex:none;height:' + AH + 'px;overflow:hidden;background:#27456f;');
  // sky: 8 flat columns, an upper sky band and a lighter horizon band, plus silhouettes (no gradients)
  const sky: Part[] = [];
  for (let k = 0; k < 8; k++) {
    const tt = k / 7, left = (k * 12.5).toFixed(2) + '%';
    sky.push({ s: 'position:absolute;pointer-events:none;left:' + left + ';width:12.6%;top:0;height:62%;background:' + lerpColor('#27456f', '#6e2a3c', tt) + ';' });
    sky.push({ s: 'position:absolute;pointer-events:none;left:' + left + ';width:12.6%;top:62%;bottom:0;background:' + lerpColor('#4a73a6', '#bb4d40', tt) + ';' });
    sky.push({ s: 'position:absolute;pointer-events:none;left:' + left + ';width:12.6%;bottom:0;height:22px;background:' + lerpColor('#14213d', '#3b0f18', tt) + ';' });
  }
  [[3, 14], [9, 40], [15, 20], [21, 52], [27, 30], [33, 12], [39, 46]].forEach((p, k) => sky.push({ s: 'position:absolute;pointer-events:none;left:' + p[0] + '%;top:' + (p[1] + 60) + 'px;width:3px;height:3px;background:#dbe8ff;opacity:0.75;' + (k % 2 ? 'animation:twinkle 1.8s steps(1) infinite;animation-delay:-' + k * 0.4 + 's;' : '') }));
  ([[0, 78, 92, '#14213d'], [7, 60, 70, '#1a2d52'], [68, 70, 96, '#4a121b'], [82, 88, 110, '#3b0f18'], [93, 56, 66, '#5c1722']] as [number, number, number, string][]).forEach((b) => sky.push({ s: 'position:absolute;pointer-events:none;left:' + b[0] + '%;bottom:8px;width:' + b[1] + 'px;height:' + b[2] + 'px;border-radius:50% 50% 8px 8px;background:' + b[3] + ';' }));
  const skyBox = el('div'); area.appendChild(skyBox); new Layer(skyBox).set(sky);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('viewBox', '0 0 100 330'); svg.setAttribute('preserveAspectRatio', 'none');
  const paths = ['M0 20 Q50 44 100 20', 'M0 124 Q50 148 100 124', 'M0 228 Q50 252 100 228'].map((dd) => { const p = document.createElementNS(svgNS, 'path'); p.setAttribute('d', dd); svg.appendChild(p); return p; });
  area.appendChild(svg);
  const lanBoxes = Array.from({ length: 12 }, () => { const b = el('div'); area.appendChild(b); return new Layer(b); });
  const fxBox = el('div'); area.appendChild(fxBox); const fx = new Layer(fxBox);
  const btnBox = el('div'); area.appendChild(btnBox);
  const btns = new Layer(btnBox, (i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.ln = String(i);
    b.addEventListener('click', () => light(i));
    b.addEventListener('focus', () => { if (g.cur !== i) { g.cur = i; render(); } });
    return b;
  });
  const ring = el('div'); ring.setAttribute('aria-hidden', 'true'); area.appendChild(ring);
  const banner = el('div', '', 'Path lit!'); banner.setAttribute('aria-hidden', 'true'); area.appendChild(banner);
  const foot = el('div', 'flex:none;padding:7px 12px;box-sizing:border-box;background:#e6e0cd;border-top:3px solid #1b2040;font-size:12px;line-height:1.5;color:#1b2040;', 'Light two lanterns that match. Arrow keys move the ring, Space or Enter lights a lantern. Esc leaves the trial.');
  root.append(hud, area, foot);

  function light(i: number) {
    if (g.phase !== 'lplay' || g.lock > 0 || i < 0 || i > 11 || g.cs[i] !== 0) return;
    g.cur = i;
    g.cs[i] = 1;
    sfx('lpluck', g.cards[i]);
    if (g.first < 0) {
      g.first = i;
    } else {
      g.second = i;
      g.moves += 1;
      if (g.cards[g.first] === g.cards[g.second]) {
        g.cs[g.first] = 2; g.cs[g.second] = 2;
        g.bursts.push({ i: g.first, age: 0 }, { i: g.second, age: 0 });
        g.pairs += 1;
        g.first = -1; g.second = -1;
        sfx('lmatch', 0, 0, 0.12);
        if (g.pairs >= 6) {
          g.phase = 'lwin'; g.winT = 0;
          g.secs = Math.floor(Math.max(0, LAN_TIME - g.t));
          sfx('lwin', 0, 0, 0.45);
        }
      } else {
        g.lock = 0.7;
        sfx('lmiss', 0, 0, 0.2);
      }
    }
    render();
  }

  function render() {
    const winning = g.phase === 'lwin';
    const fxl: Part[] = [], bl: Part[] = [];
    let ringS = 'display:none;';
    for (let i = 0; i < 12; i++) {
      const r = Math.floor(i / 4), c = i % 4, f = FX[c];
      const ay = Math.round((Y0S[r] + 2 * SAG * f * (1 - f)) * 10) / 10;
      const cs = g.cs[i], lit = cs > 0 || winning, matched = cs === 2 || winning;
      const sway = matched ? '' : 'animation:lsway ' + (2.4 + ((i * 7) % 5) * 0.35).toFixed(2) + 's ease-in-out infinite alternate;animation-delay:-' + ((i * 0.43) % 2.4).toFixed(2) + 's;';
      const vis: Part[] = [];
      const at = (dl: number, dt: number) => 'left:calc(' + (f * 100).toFixed(2) + '% + ' + dl + 'px);top:' + f2(ay + dt) + 'px;transform-origin:' + (-dl) + 'px ' + (-dt) + 'px;';
      const part = (dl: number, dt: number, w: number, h: number, bg: string, ex?: string) => vis.push({ s: 'position:absolute;pointer-events:none;' + at(dl, dt) + 'width:' + w + 'px;height:' + h + 'px;background:' + bg + ';' + (ex || '') + sway });
      const face = winning ? '#ffe6b8' : (matched ? '#ffd89c' : PAPER);
      part(-1, 0, 2, 10, '#b8956a');
      part(-16, 9, 32, 6, lit ? '#7a3b1a' : '#2e2118');
      part(-24, 14, 48, 52, lit ? face : '#6b5a4a',
        'border-radius:46%;transition:background-color 140ms,box-shadow 140ms;box-shadow:' + (lit
          ? 'inset -7px -7px 0 rgba(224,150,60,0.35),0 0 0 6px rgba(255,180,84,' + (winning ? 0.5 : 0.35) + '),0 0 0 14px rgba(255,180,84,' + (winning ? 0.26 : 0.16) + '),0 0 ' + (winning ? 34 : 26) + 'px 12px rgba(255,180,84,0.3);'
          : 'inset -7px -7px 0 rgba(0,0,0,0.25),inset 3px 3px 0 rgba(255,255,255,0.06);'));
      part(-12, 19, 2, 42, lit ? '#d9953f' : '#4d3f33', 'border-radius:1px;');
      part(10, 19, 2, 42, lit ? '#d9953f' : '#4d3f33', 'border-radius:1px;');
      part(-14, 65, 28, 5, lit ? '#7a3b1a' : '#2e2118');
      part(-2, 70, 4, 12, '#c8323a');
      part(-4, 68, 8, 4, '#8f1f27');
      if (lit) glyphs[g.cards[i]].forEach((gg) => part(-13 + gg[0], 27 + gg[1], gg[2], gg[3], gg[4], gg[5]));
      lanBoxes[i].set(vis);

      // match burst slot: a chime ring plus four sparks; hidden unless this lantern just matched
      const burst = g.bursts.some((b) => b.i === i);
      const bs = (dl: number, dt: number, w: number, h: number, ex: string) => fxl.push({ s: burst ? 'position:absolute;pointer-events:none;left:calc(' + (f * 100).toFixed(2) + '% + ' + dl + 'px);top:' + f2(ay + dt) + 'px;width:' + w + 'px;height:' + h + 'px;' + ex : 'display:none;' });
      bs(-20, 20, 40, 40, 'box-sizing:border-box;border-radius:50%;border:3px solid #ffe3b0;animation:sealburst 0.9s ease-out both;');
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach((dd, k) => bs(-3, 37, 6, 6, 'background:' + (k % 2 ? '#fff6d6' : '#ffd166') + ';--sx:' + 34 * dd[0] + 'px;--sy:' + 30 * dd[1] + 'px;animation:sparkle 0.9s ease-out both;'));

      bl.push({ s: 'position:absolute;left:calc(' + (f * 100).toFixed(2) + '% - 28px);top:' + f2(ay) + 'px;width:56px;height:84px;padding:0;margin:0;border:0;border-radius:0;background:transparent;outline:none;cursor:' + (cs === 0 && !(g.lock > 0) ? 'pointer' : 'default') + ';' });
      if (g.cur === i && g.phase === 'lplay') {
        ringS = 'position:absolute;pointer-events:none;left:calc(' + (f * 100).toFixed(2) + '% - 34px);top:' + f2(ay - 3) + 'px;width:68px;height:90px;box-sizing:border-box;border:3px solid #fff1c4;box-shadow:0 0 0 2px #0b1020,inset 0 0 0 2px #0b1020;';
      }
    }
    fx.set(fxl);
    btns.set(bl);
    for (let i = 0; i < 12; i++) {
      const shown = g.cs[i] > 0 || winning;
      btns.child(i)!.setAttribute('aria-label', 'Lantern, row ' + (Math.floor(i / 4) + 1) + ' column ' + (i % 4 + 1) + (shown ? ' showing ' + symNames[g.cards[i]] : '') + (g.cs[i] === 2 ? ', matched' : ''));
    }
    sty(ring, ringS);
    sty(banner, winning ? 'position:absolute;left:0;right:0;top:118px;z-index:5;text-align:center;pointer-events:none;' + fontP + 'font-size:clamp(34px,8vw,52px);font-weight:700;letter-spacing:3px;line-height:1.1;color:#fff1d6;text-shadow:0 0 14px #ffb454,3px 3px 0 #8f1f27,5px 5px 0 #000;animation:jobin 1.6s linear both;' : 'display:none;');
    svg.setAttribute('style', 'position:absolute;left:0;top:0;width:100%;height:' + AH + 'px;pointer-events:none;overflow:visible;' + (winning ? 'filter:drop-shadow(0 0 5px #ffcf8a) drop-shadow(0 0 10px #ffb454);' : ''));
    paths.forEach((p) => p.setAttribute('style', 'fill:none;vector-effect:non-scaling-stroke;stroke-width:' + (winning ? 3 : 2.5) + 'px;stroke:' + (winning ? '#ffe3b0' : '#b89a6c') + ';'));

    const frac = Math.max(0, Math.min(1, g.time / LAN_TIME));
    const low = g.time < 10;
    sty(cord, 'position:absolute;left:0;top:9px;height:7px;width:' + (frac * 100).toFixed(2) + '%;background:#e0c08e;box-shadow:inset 0 -2px 0 #b8956a;');
    sty(flame, 'position:absolute;left:calc(' + (frac * 100).toFixed(2) + '% - 7px);top:-5px;width:14px;height:20px;background:#ff9a3c;clip-path:polygon(50% 0,80% 35%,100% 65%,80% 92%,50% 100%,20% 92%,0 65%,20% 35%);transform-origin:50% 100%;animation:candle ' + (low ? '0.3' : '0.5') + 's steps(1) infinite;');
    sty(flameCore, 'position:absolute;left:calc(' + (frac * 100).toFixed(2) + '% - 3px);top:3px;width:6px;height:11px;background:#fff1c4;clip-path:polygon(50% 0,85% 40%,100% 70%,50% 100%,0 70%,15% 40%);transform-origin:50% 100%;animation:candle 0.5s steps(1) infinite;animation-delay:-0.2s;');
    sty(timeEl, fontP + 'flex:none;min-width:40px;text-align:right;font-size:17px;font-weight:700;color:' + (low ? '#ff9e84' : '#f6ecd2') + ';');
    txt(timeEl, Math.ceil(g.time) + 's');
    txt(pairsEl, 'PAIRS ' + g.pairs + '/6');
    txt(movesEl, 'MOVES ' + g.moves);
    txt(live, winning ? 'Path lit!' : 'Pairs found ' + g.pairs + ' of 6, moves ' + g.moves);
  }

  function finish(won: boolean) {
    if (!won) {
      sfx('hout');
      log('[System] Lantern Match: the lanterns went cold');
      ctx.finish({ won: false, score: 0, stars: 0, bonus: 0, pairs: g.pairs, moves: g.moves });
      return;
    }
    const sc = lanScore(g.secs, g.moves);
    const stars = lanStars(sc);
    log('[System] Lantern Match: ' + g.moves + ' moves, ' + '★'.repeat(stars));
    sfx('rate', stars);
    ctx.finish({ won: true, score: sc, stars, bonus: sc * 10, secs: g.secs, moves: g.moves, pairs: g.pairs });
  }

  render();
  return {
    root,
    step(dt) {
      g.clock += dt;
      g.bursts.forEach((b) => { b.age += dt; });
      const nb = g.bursts.filter((b) => b.age < 0.9);
      if (nb.length !== g.bursts.length) g.dirty = true;
      g.bursts = nb;
      if (g.phase === 'lplay') {
        g.t += dt;
        g.time = Math.max(0, LAN_TIME - g.t);
        if (g.lock > 0) {
          g.lock -= dt;
          if (g.lock <= 0) {
            g.lock = 0;
            g.cs[g.first] = 0; g.cs[g.second] = 0;
            g.first = -1; g.second = -1;
            g.dirty = true;
          }
        }
        if (g.time <= 0) { finish(false); return false; }
      } else {
        g.winT += dt;
        if (g.winT >= 1.6) { finish(true); return false; }
      }
      g.acc += dt;
      if (g.acc >= 0.1 || g.dirty) { g.acc = 0; g.dirty = false; render(); }
      return true;
    },
    // Arrows move the focus ring (and DOM focus); Space / Enter light the ringed lantern.
    key(e, direct) {
      const arrows: Record<string, [number, number]> = { ArrowLeft: [0, -1], KeyA: [0, -1], ArrowRight: [0, 1], KeyD: [0, 1], ArrowUp: [-1, 0], KeyW: [-1, 0], ArrowDown: [1, 0], KeyS: [1, 0] };
      const mv = arrows[e.code];
      if (mv) {
        e.preventDefault();
        if (g.phase !== 'lplay') return;
        let i = g.cur;
        if (i < 0) i = 0;
        else {
          const r = Math.max(0, Math.min(2, Math.floor(i / 4) + mv[0]));
          const c = Math.max(0, Math.min(3, (i % 4) + mv[1]));
          i = r * 4 + c;
        }
        g.cur = i;
        render();
        btns.child(i)?.focus();
        return;
      }
      if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter') {
        if (!direct) return;
        e.preventDefault();
        if (!e.repeat) light(g.cur < 0 ? 0 : g.cur);
      }
    }
  };
}
