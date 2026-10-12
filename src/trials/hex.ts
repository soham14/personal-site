// Hex Lock (Professor Hug's graduation trial): rotate hex tiles to route the light from the source sigil to the seal before the candle burns out.
// Pointy-top hex grid, 3 rows x 4 columns, odd rows shifted right. Edges: 0 E, 1 SE, 2 SW, 3 W, 4 NW, 5 NE.
import { Layer, el, fontP, sfx, log, sty, txt, SR, STARC, viewW, closeButton, type Part } from './dom.ts';
import { crestDataURL } from '../ui/crests.ts';
import type { TrialCtx, TrialGame } from './types.ts';

interface Grp { e: number[]; v?: number }
const HT: Record<string, Grp[]> = {
  S: [{ e: [0, 3] }],
  B: [{ e: [0, 2] }],
  Y: [{ e: [0, 2, 4] }],
  T: [{ e: [0, 2, 3] }],
  K: [{ e: [0, 2], v: 60 }, { e: [3, 5], v: 240 }]
};
interface Tile { ty: string; s: number; p: boolean }
interface Layout { src: number; seal: number; tiles: Tile[] }
const t = (ty: string, s: number, p?: number): Tile => ({ ty, s, p: !!p });
const LAYOUTS: Layout[] = [
  { src: 0, seal: 2, tiles: [
    t('B', 1, 1), t('K', 0), t('Y', 1), t('S', 2),
    t('S', 1, 1), t('T', 2), t('B', 3), t('K', 1),
    t('Y', 0), t('B', 4, 1), t('T', 0, 1), t('S', 0, 1)
  ] },
  { src: 1, seal: 0, tiles: [
    t('K', 2), t('B', 0, 1), t('T', 0, 1), t('S', 0, 1),
    t('Y', 1, 1), t('S', 1), t('B', 4), t('T', 5),
    t('B', 2), t('Y', 0), t('K', 1), t('S', 2)
  ] },
  { src: 2, seal: 0, tiles: [
    t('S', 1), t('Y', 0), t('B', 0, 1), t('S', 0, 1),
    t('B', 0, 1), t('T', 3, 1), t('K', 2), t('Y', 1),
    t('B', 3, 1), t('S', 2), t('T', 1), t('K', 0)
  ] }
];

function hexNb(r: number, c: number, e: number): number {
  const odd = r % 2 === 1;
  const dd = [[0, 1], [1, odd ? 1 : 0], [1, odd ? 0 : -1], [0, -1], [-1, odd ? 0 : -1], [-1, odd ? 1 : 0]][e];
  const nr = r + dd[0], nc = c + dd[1];
  return (nr < 0 || nr > 2 || nc < 0 || nc > 3) ? -1 : nr * 4 + nc;
}

function hexConn(L: Layout, turns: number[]): { lit: boolean[][]; sealed: boolean } {
  const lit = L.tiles.map((tl) => HT[tl.ty].map(() => false));
  const edgesOf = (i: number, gi: number) => HT[L.tiles[i].ty][gi].e.map((x) => (x + turns[i]) % 6);
  const groupAt = (i: number, edge: number) => {
    const gs = HT[L.tiles[i].ty];
    for (let gi = 0; gi < gs.length; gi++) if (edgesOf(i, gi).indexOf(edge) >= 0) return gi;
    return -1;
  };
  const q: [number, number][] = [];
  const first = groupAt(L.src * 4, 3);
  if (first >= 0) { lit[L.src * 4][first] = true; q.push([L.src * 4, first]); }
  while (q.length) {
    const cur = q.shift()!;
    const r = Math.floor(cur[0] / 4), c = cur[0] % 4;
    edgesOf(cur[0], cur[1]).forEach((e) => {
      const nb = hexNb(r, c, e);
      if (nb < 0) return;
      const gi = groupAt(nb, (e + 3) % 6);
      if (gi >= 0 && !lit[nb][gi]) { lit[nb][gi] = true; q.push([nb, gi]); }
    });
  }
  const sealTile = L.seal * 4 + 3;
  const sg = groupAt(sealTile, 0);
  return { lit, sealed: sg >= 0 && lit[sealTile][sg] };
}

const INK = '#3b2a1e', GL = '#f2b632', GLH = '#ffd166', LEAF = '#c9962c';
const CW = 61, CH = 70, RS = 52.5, X0 = 34, Y0 = 14, AP = 31, PW = 348, PH = 203;
const HEXC = 'clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);';
const f2 = (v: number) => Math.round(v * 100) / 100;
const rad = (dg: number) => dg * Math.PI / 180;
const cellOf = (i: number) => { const r = Math.floor(i / 4), c = i % 4; return { r, c, l: X0 + c * CW + (r % 2 ? CW / 2 : 0), t: Y0 + r * RS }; };

export function createHex(ctx: TrialCtx): TrialGame {
  const L = LAYOUTS[Math.floor(Math.random() * 3)];
  let turns: number[], conn, guard = 0;
  do {
    turns = L.tiles.map((tl) => (tl.p ? (tl.s + 1 + Math.floor(Math.random() * 5)) : Math.floor(Math.random() * 6)));
    conn = hexConn(L, turns);
    guard++;
  } while (conn.sealed && guard < 40);
  const g = { phase: 'hplay' as 'hplay' | 'hwin', turns, conn, moves: 0, t: 0, time: 45, cur: -1, winT: 0, acc: 1, clock: 0 };

  // ---- skeleton: an open spellbook ----
  const root = el('div');
  root.setAttribute('role', 'dialog'); root.classList.add('cq-pop');
  root.setAttribute('aria-label', 'Final exam: Hex Lock');
  const bar = el('div', 'display:flex;align-items:center;justify-content:space-between;min-height:44px;padding:0 0 0 16px;margin:3px 3px 0;color:#f2b632;' + fontP + 'font-size:17px;font-weight:700;letter-spacing:2px;');
  bar.append(el('span', '', 'FINAL EXAM · HEX LOCK'), closeButton('Quit Hex Lock', '#0f1f3d', '#f2b632', ctx.close));
  const pages = el('div', 'position:relative;display:flex;flex-wrap:wrap;margin:0 10px 12px;box-shadow:0 0 0 2px #0f1f3d;');
  const pgBase = 'position:relative;flex:1 1 340px;min-width:0;box-sizing:border-box;min-height:270px;padding:16px 14px 18px;color:' + INK + ';';
  const left = el('div', pgBase + 'background:linear-gradient(90deg,#efe2c4 0%,#efe2c4 90%,#d8c698 100%);');
  const right = el('div', pgBase + 'background:linear-gradient(90deg,#c9b685 0%,#e6d6b2 9%,#e6d6b2 100%);display:flex;flex-direction:column;align-items:center;');
  const corners = (host: HTMLElement) => {
    const list: Part[] = [];
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach((q) => {
      const sd = q[0] ? 'right' : 'left', vt = q[1] ? 'bottom' : 'top';
      const b = 'position:absolute;pointer-events:none;' + sd + ':7px;' + vt + ':7px;background:' + LEAF + ';';
      list.push({ s: b + 'width:22px;height:3px;' }, { s: b + 'width:3px;height:22px;' },
        { s: 'position:absolute;pointer-events:none;' + sd + ':13px;' + vt + ':13px;width:5px;height:5px;background:' + LEAF + ';transform:rotate(45deg);' });
    });
    const box = el('div'); host.appendChild(box); new Layer(box).set(list);
  };
  corners(left);
  const head = el('h2', fontP + 'margin:0;font-size:22px;font-weight:700;line-height:1.15;letter-spacing:1px;color:' + INK + ';padding-bottom:6px;border-bottom:2px solid rgba(59,42,30,0.4);', 'Final Exam · The Seal of Light');
  const instr = el('p', 'margin:10px 0 0;font-size:13px;line-height:1.6;color:' + INK + ';', 'Turn the tiles until the light reaches the seal.');
  const row = el('div', 'display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:12px;');
  const ctr = el('div', 'display:flex;flex-direction:column;gap:10px;min-width:0;');
  const lab = fontP + 'font-size:12px;font-weight:700;letter-spacing:2px;color:#7a5a12;';
  const movesEl = el('div', fontP + 'font-size:28px;font-weight:700;line-height:1;color:' + INK + ';');
  const timeEl = el('div');
  const c1 = el('div'); c1.append(el('div', lab, 'MOVES'), movesEl);
  const c2 = el('div'); c2.append(el('div', lab, 'TIME'), timeEl);
  ctr.append(c1, c2);
  const candle = el('div', 'position:relative;flex:none;width:76px;height:158px;'); candle.setAttribute('aria-hidden', 'true');
  const cn = ['halo', 'dish', 'wax', 'drip', 'wick', 'flame', 'core'].map(() => { const x = el('div'); candle.appendChild(x); return x; });
  row.append(ctr, candle);
  const hint = el('p', 'margin:12px 0 0;font-size:11px;line-height:1.5;color:rgba(59,42,30,0.75);', 'Click or tap a tile to turn it a sixth of a circle. Arrow keys move the ring, Space or Enter turns. Esc leaves the exam.');
  const live = el('span', SR); live.setAttribute('aria-live', 'polite');
  left.append(head, instr, row, hint, live);
  const rib1 = el('div'); const rib2 = el('div');
  rib1.setAttribute('aria-hidden', 'true'); rib2.setAttribute('aria-hidden', 'true');
  corners(right);
  const cap = el('div', fontP + 'font-size:12px;font-weight:700;letter-spacing:2px;color:#7a5a12;margin-bottom:6px;align-self:flex-start;', 'Fig. I · Route the light');
  cap.setAttribute('aria-hidden', 'true');
  const pz = el('div');
  const pzIn = el('div');
  pz.appendChild(pzIn);
  right.append(cap, pz);
  pages.append(left, rib1, rib2, right);
  root.append(bar, pages);

  const mk = () => { const x = el('div'); x.setAttribute('aria-hidden', 'true'); pzIn.appendChild(x); return x; };
  const outlines = new Layer(mk());
  const deco = new Layer(mk());
  const tileBox = el('div'); pzIn.appendChild(tileBox);
  const tiles = new Layer(tileBox, (i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.hx = String(i);
    const cc = cellOf(i);
    b.setAttribute('aria-label', 'Rotate tile, row ' + (cc.r + 1) + ' column ' + (cc.c + 1));
    b.addEventListener('click', () => rotate(i));
    b.addEventListener('focus', () => { if (g.cur !== i) { g.cur = i; render(); } });
    return b;
  });
  const ring = mk();
  const segs = new Layer(mk());
  const sealWrap = el('span'); sealWrap.setAttribute('aria-hidden', 'true');
  const sealImg = document.createElement('img');
  sealImg.alt = '';
  try { sealImg.src = crestDataURL(0, false); } catch { /* crest art unavailable */ }
  sealImg.style.cssText = 'display:block;width:32px;height:32px;image-rendering:pixelated;';
  sealWrap.appendChild(sealImg); pzIn.appendChild(sealWrap);
  const burst = new Layer(mk());

  // static outlines (never change)
  outlines.set(Array.from({ length: 12 }, (_, i) => { const cc = cellOf(i); return { s: 'position:absolute;left:' + cc.l + 'px;top:' + cc.t + 'px;width:' + CW + 'px;height:' + CH + 'px;background:' + INK + ';' + HEXC }; }));

  const litN = (cn2: { lit: boolean[][] }) => cn2.lit.reduce((n, tl) => n + tl.reduce((m, x) => m + (x ? 1 : 0), 0), 0);
  function rotate(i: number) {
    if (g.phase !== 'hplay' || i < 0 || i > 11) return;
    g.turns[i] += 1;
    g.moves += 1;
    g.cur = i;
    const before = litN(g.conn);
    g.conn = hexConn(L, g.turns);
    sfx('htick');
    if (g.conn.sealed) {
      g.phase = 'hwin'; g.winT = 0;
      sfx('hseal', 0, 0, 0.05);
    } else if (litN(g.conn) > before) {
      sfx('hlit', litN(g.conn) - before, before, 0.04);
    }
    render();
  }

  function render() {
    const winning = g.phase === 'hwin';
    const tl: Part[] = [], sg: Part[] = [];
    for (let i = 0; i < 12; i++) {
      const cc = cellOf(i), lit = g.conn.lit[i];
      const anyLit = lit.some((v) => v);
      tl.push({ s: 'position:absolute;left:' + (cc.l + 2) + 'px;top:' + (cc.t + 2) + 'px;width:' + (CW - 4) + 'px;height:' + (CH - 4) + 'px;padding:0;margin:0;border:0;border-radius:0;cursor:pointer;outline:none;background:' + (anyLit ? '#f8e9b4' : '#f3e8cd') + ';transition:background-color 120ms;' + HEXC });
      const cx = cc.l + CW / 2, cy = cc.t + CH / 2, R = g.turns[i] * 60;
      HT[L.tiles[i].ty].forEach((grp, gi) => {
        const on = lit[gi];
        const base = 'position:absolute;pointer-events:none;left:' + f2(cx) + 'px;top:' + f2(cy) + 'px;transform-origin:0 50%;transition:transform 160ms ease-out,background-color 120ms,box-shadow 120ms;background:' + (on ? GL : INK) + ';' + (on ? 'box-shadow:0 0 8px 2px rgba(255,209,102,0.9);' : '');
        const mid = (e: number) => [AP * Math.cos(rad(e * 60)), AP * Math.sin(rad(e * 60))];
        const seg = (x1: number, y1: number, x2: number, y2: number) => {
          const dx = x2 - x1, dy = y2 - y1;
          sg.push({ s: base + 'width:' + f2(Math.sqrt(dx * dx + dy * dy) + 1) + 'px;height:5px;margin-top:-2.5px;transform:rotate(' + R + 'deg) translate(' + f2(x1) + 'px,' + f2(y1) + 'px) rotate(' + f2(Math.atan2(dy, dx) * 180 / Math.PI) + 'deg);' });
        };
        const hub = (x: number, y: number) => sg.push({ s: base + 'width:7px;height:7px;margin-top:-3.5px;border-radius:50%;transform:rotate(' + R + 'deg) translate(' + f2(x) + 'px,' + f2(y) + 'px) translate(-3.5px,0);' });
        if (grp.v === undefined) {
          grp.e.forEach((e) => { const m = mid(e); seg(0, 0, m[0], m[1]); });
          hub(0, 0);
        } else {
          const Pv = [13 * Math.cos(rad(grp.v)), 13 * Math.sin(rad(grp.v))];
          const a = mid(grp.e[0]), b = mid(grp.e[1]);
          seg(a[0], a[1], Pv[0], Pv[1]);
          seg(Pv[0], Pv[1], b[0], b[1]);
          hub(Pv[0], Pv[1]);
        }
      });
    }
    tiles.set(tl);
    segs.set(sg);
    if (g.cur >= 0 && g.phase === 'hplay') {
      const rc = cellOf(g.cur);
      sty(ring, 'position:absolute;pointer-events:none;left:' + rc.l + 'px;top:' + rc.t + 'px;width:' + CW + 'px;height:' + CH + 'px;background:#1d3a6b;clip-path:path(evenodd,\'M30.5 0 L61 17.5 L61 52.5 L30.5 70 L0 52.5 L0 17.5 Z M30.5 4 L57.5 19.5 L57.5 50.5 L30.5 66 L3.5 50.5 L3.5 19.5 Z\');');
    } else sty(ring, 'display:none;');

    const sc0 = cellOf(L.src * 4), sy = sc0.t + CH / 2;
    const dc: Part[] = [];
    const D = (css: string) => dc.push({ s: 'position:absolute;pointer-events:none;' + css });
    D('left:' + (sc0.l - 40) + 'px;top:' + (sy - 18) + 'px;width:36px;height:36px;border-radius:50%;background:rgba(255,209,102,0.35);animation:pulse 1.1s steps(1) infinite;');
    D('left:' + (sc0.l - 8) + 'px;top:' + (sy - 2.5) + 'px;width:10px;height:5px;background:' + GL + ';box-shadow:0 0 8px 2px rgba(255,209,102,0.9);');
    D('left:' + (sc0.l - 34) + 'px;top:' + (sy - 14) + 'px;width:28px;height:28px;box-sizing:border-box;border-radius:50%;background:' + GL + ';border:2px solid ' + INK + ';box-shadow:0 0 10px rgba(255,209,102,0.8);');
    D('left:' + (sc0.l - 29) + 'px;top:' + (sy - 9) + 'px;width:18px;height:18px;background:#fff6d6;' + STARC);
    const ec = cellOf(L.seal * 4 + 3), ey = ec.t + CH / 2, ex = ec.l + CW;
    D('left:' + (ex - 1) + 'px;top:' + (ey - 2.5) + 'px;width:9px;height:5px;background:' + (g.conn.sealed ? GL : INK) + ';' + (g.conn.sealed ? 'box-shadow:0 0 8px 2px rgba(255,209,102,0.9);' : ''));
    deco.set(dc);
    sty(sealWrap, 'position:absolute;pointer-events:none;left:' + (ex + 6) + 'px;top:' + (ey - 16) + 'px;width:32px;height:32px;transition:filter 200ms,opacity 200ms;' +
      (g.conn.sealed ? 'filter:drop-shadow(0 0 6px rgba(255,209,102,1)) drop-shadow(0 0 12px rgba(255,209,102,0.8));' : 'opacity:0.5;filter:grayscale(0.7);'));
    const bu: Part[] = [];
    if (winning) {
      const scx = ex + 6 + 16;
      [0, 0.2].forEach((dl) => bu.push({ s: 'position:absolute;pointer-events:none;left:' + (scx - 20) + 'px;top:' + (ey - 20) + 'px;width:40px;height:40px;box-sizing:border-box;border-radius:50%;border:3px solid ' + GLH + ';animation:sealburst 0.9s ease-out both;animation-delay:' + dl + 's;' }));
      for (let k = 0; k < 8; k++) {
        bu.push({ s: 'position:absolute;pointer-events:none;left:' + (scx - 3) + 'px;top:' + (ey - 3) + 'px;width:6px;height:6px;background:' + (k % 2 ? '#fff6d6' : GLH) + ';--sx:' + f2(54 * Math.cos(rad(k * 45))) + 'px;--sy:' + f2(54 * Math.sin(rad(k * 45))) + 'px;animation:sparkle 0.9s ease-out both;' });
      }
    }
    burst.set(bu);

    // candle: wax shortens with the timer, flame flickers
    const frac = Math.max(0, Math.min(1, g.time / 45));
    const waxH = Math.round(10 + 80 * frac);
    const c = 'position:absolute;left:50%;';
    sty(cn[0], c + 'margin-left:-34px;bottom:' + (waxH - 2) + 'px;width:68px;height:68px;border-radius:50%;background:rgba(255,180,84,' + (0.14 + 0.12 * frac).toFixed(2) + ');animation:glowp 0.9s steps(1) infinite;');
    sty(cn[1], c + 'margin-left:-27px;bottom:0;width:54px;height:12px;border-radius:50%;background:#b8841c;box-shadow:inset 0 3px 0 #e0a93a,0 2px 0 #7a5a12;');
    sty(cn[2], c + 'margin-left:-13px;bottom:7px;width:26px;height:' + waxH + 'px;background:#f6ecd2;box-shadow:inset -6px 0 0 #dccfa8,inset 0 3px 0 #fff8e6;border-radius:3px 3px 2px 2px;');
    sty(cn[3], c + 'margin-left:-13px;bottom:' + Math.max(7, 7 + waxH - 16) + 'px;width:6px;height:18px;background:#f6ecd2;border-radius:0 0 3px 3px;box-shadow:inset -2px 0 0 #dccfa8;');
    sty(cn[4], c + 'margin-left:-1px;bottom:' + (7 + waxH) + 'px;width:2px;height:7px;background:' + INK + ';');
    sty(cn[5], c + 'margin-left:-8px;bottom:' + (13 + waxH) + 'px;width:16px;height:28px;background:#ffb454;clip-path:polygon(50% 0,80% 35%,100% 65%,80% 92%,50% 100%,20% 92%,0 65%,20% 35%);transform-origin:50% 100%;animation:candle ' + (g.time < 10 ? '0.3' : '0.5') + 's steps(1) infinite;');
    sty(cn[6], c + 'margin-left:-4px;bottom:' + (13 + waxH) + 'px;width:8px;height:15px;background:#fff1c4;clip-path:polygon(50% 0,85% 40%,100% 70%,50% 100%,0 70%,15% 40%);transform-origin:50% 100%;animation:candle 0.5s steps(1) infinite;animation-delay:-0.2s;');

    // sizes: two pages side by side when wide enough, otherwise stacked; the puzzle scales down to fit a page
    const winW = Math.min(780, viewW() * 0.94);
    const pagesW = winW - 26;
    const pageW = pagesW >= 680 ? pagesW / 2 : pagesW;
    const kz = Math.max(0.5, Math.min(1, (pageW - 30) / PW));
    sty(root, 'position:absolute;left:0;right:0;margin:0 auto;top:50%;transform:translateY(-50%);width:min(780px,94%);max-height:calc(100% - 12px);overflow-y:auto;box-sizing:border-box;background:#1d3a6b;border:3px solid #0f1f3d;box-shadow:inset 0 0 0 3px #f2b632,6px 6px 0 #000;color:#f4f1e8;');
    sty(rib1, 'position:absolute;left:50%;top:-2px;margin-left:-11px;width:22px;height:84px;background:#f2b632;clip-path:polygon(0 0,100% 0,100% 100%,50% 86%,0 100%);z-index:3;pointer-events:none;' + (pagesW >= 680 ? '' : 'display:none;'));
    sty(rib2, 'position:absolute;left:50%;top:-2px;margin-left:-8px;width:16px;height:80px;background:#1d3a6b;clip-path:polygon(0 0,100% 0,100% 100%,50% 85%,0 100%);z-index:4;pointer-events:none;' + (pagesW >= 680 ? '' : 'display:none;'));
    sty(pz, 'position:relative;flex:none;width:' + Math.round(PW * kz) + 'px;height:' + Math.round(PH * kz) + 'px;');
    sty(pzIn, 'position:absolute;left:0;top:0;width:' + PW + 'px;height:' + PH + 'px;transform:scale(' + kz.toFixed(3) + ');transform-origin:0 0;');
    sty(timeEl, fontP + 'font-size:28px;font-weight:700;line-height:1;color:' + (g.time < 10 ? '#a3262e' : INK) + ';');
    txt(movesEl, String(g.moves));
    txt(timeEl, Math.ceil(g.time) + 's');
    txt(live, g.conn.sealed ? 'The seal is lit. Exam passed.' : 'Moves: ' + g.moves);
  }

  function finish(won: boolean) {
    if (!won) {
      sfx('hout');
      log('[System] Hex Lock: the candle burned out');
      ctx.finish({ won: false, score: 0, stars: 0, bonus: 0, moves: g.moves });
      return;
    }
    const secs = Math.floor(Math.max(0, 45 - g.t));
    const sc = secs * 10 + Math.max(0, 20 - g.moves) * 5;
    const stars = sc >= 300 ? 5 : (sc >= 220 ? 4 : (sc >= 140 ? 3 : (sc >= 60 ? 2 : 1)));
    log('[System] Hex Lock: score ' + sc + ' (' + '★'.repeat(stars) + ')');
    sfx('rate', stars);
    ctx.finish({ won: true, score: sc, stars, bonus: sc * 10, secs, moves: g.moves });
  }

  render();
  return {
    root,
    step(dt) {
      g.clock += dt;
      if (g.phase === 'hplay') {
        g.t += dt;
        g.time = Math.max(0, 45 - g.t);
        if (g.time <= 0) { finish(false); return false; }
      } else {
        g.winT += dt;
        if (g.winT >= 1.4) { finish(true); return false; }
      }
      g.acc += dt;
      if (g.acc >= 0.1) { g.acc = 0; render(); }
      return true;
    },
    // Arrows move the focus ring (and DOM focus) between tiles; Space / Enter rotate the ringed tile.
    key(e, direct) {
      const arrows: Record<string, [number, number]> = { ArrowLeft: [0, -1], KeyA: [0, -1], ArrowRight: [0, 1], KeyD: [0, 1], ArrowUp: [-1, 0], KeyW: [-1, 0], ArrowDown: [1, 0], KeyS: [1, 0] };
      const mv = arrows[e.code];
      if (mv) {
        e.preventDefault();
        if (g.phase !== 'hplay') return;
        let i = g.cur;
        if (i < 0) i = 0;
        else {
          const r = Math.max(0, Math.min(2, Math.floor(i / 4) + mv[0]));
          const c = Math.max(0, Math.min(3, (i % 4) + mv[1]));
          i = r * 4 + c;
        }
        g.cur = i;
        render();
        tiles.child(i)?.focus();
        return;
      }
      if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter') {
        if (!direct) return; // a focused tile button rotates itself through its click
        e.preventDefault();
        if (!e.repeat) rotate(g.cur < 0 ? 0 : g.cur);
      }
    }
  };
}
