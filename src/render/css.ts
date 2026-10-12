// A tiny rasterizer for the mockup's absolutely-positioned CSS boxes.
// The approved mockup draws its scenery, crests and sprites as plain styled <div>s; this paints the same
// declarations onto a 2D canvas so Phaser can use them as textures. It supports exactly what the mockup uses:
// left/right/top/bottom/width/height (px or %), background colour, repeating-linear-gradient stripes,
// border(-left/-right/-bottom), border-radius (px / %), clip-path: polygon(), box-shadow (outer rings and inset),
// opacity, rotate(), and centred single- or multi-line text.

export type Css = Record<string, string>;
export interface Rect { x: number; y: number; w: number; h: number }

export function parseCss(s: string): Css {
  const o: Css = {};
  // split on ';' outside parentheses
  let depth = 0, cur = '';
  const parts: string[] = [];
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ';' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  for (const p of parts) {
    const k = p.indexOf(':');
    if (k < 0) continue;
    const key = p.slice(0, k).trim().toLowerCase();
    if (!key) continue;
    o[key] = p.slice(k + 1).trim();
  }
  return o;
}

/** Split on a separator at parenthesis depth 0. */
export function splitTop(s: string, sep = ','): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === sep && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Resolve a length: px, %, bare number, or calc(A% - Bpx). */
export function len(v: string | undefined, ref: number): number | null {
  if (v === undefined || v === '' || v === 'auto') return null;
  v = v.trim();
  const calc = /^calc\((.*)\)$/.exec(v);
  if (calc) {
    const m = /^(-?[\d.]+)(px|%)\s*([+-])\s*(-?[\d.]+)(px|%)$/.exec(calc[1].trim());
    if (m) {
      const a = m[2] === '%' ? parseFloat(m[1]) * ref / 100 : parseFloat(m[1]);
      const b = m[5] === '%' ? parseFloat(m[4]) * ref / 100 : parseFloat(m[4]);
      return m[3] === '+' ? a + b : a - b;
    }
    return null;
  }
  if (v.endsWith('%')) return parseFloat(v) * ref / 100;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export function resolveRect(c: Css, parent: Rect): Rect {
  const l = len(c.left, parent.w), r = len(c.right, parent.w), t = len(c.top, parent.h), b = len(c.bottom, parent.h);
  let w = len(c.width, parent.w), h = len(c.height, parent.h);
  if (w === null) w = (l !== null && r !== null) ? parent.w - l - r : 0;
  if (h === null) h = (t !== null && b !== null) ? parent.h - t - b : 0;
  const x = l !== null ? parent.x + l : (r !== null ? parent.x + parent.w - r - w : parent.x);
  const y = t !== null ? parent.y + t : (b !== null ? parent.y + parent.h - b - h : parent.y);
  return { x, y, w, h };
}

// ---- colours ----
export function colorOK(c: string | undefined): boolean {
  return !!c && c !== 'transparent' && c !== 'none';
}

// ---- shapes ----
type Radii = [number, number][]; // tl, tr, br, bl as [rx, ry]

function parseRadii(v: string | undefined, w: number, h: number): Radii | null {
  if (!v) return null;
  const [hs, vs] = v.split('/').map((s) => s.trim().split(/\s+/));
  const four = (a: string[]) => a.length === 1 ? [a[0], a[0], a[0], a[0]] : a.length === 2 ? [a[0], a[1], a[0], a[1]] : a.length === 3 ? [a[0], a[1], a[2], a[1]] : a.slice(0, 4);
  const H = four(hs), V = four(vs || hs);
  const r: Radii = H.map((x, i) => [len(x, w) || 0, len(V[i], h) || 0] as [number, number]);
  // CSS corner overlap scaling
  let f = 1;
  const chk = (sum: number, side: number) => { if (sum > side && sum > 0) f = Math.min(f, side / sum); };
  chk(r[0][0] + r[1][0], w); chk(r[3][0] + r[2][0], w); chk(r[0][1] + r[3][1], h); chk(r[1][1] + r[2][1], h);
  return r.map(([a, b]) => [a * f, b * f] as [number, number]);
}

function polyPoints(v: string, R: Rect): [number, number][] | null {
  const m = /polygon\((.*)\)/.exec(v);
  if (!m) return null;
  return splitTop(m[1]).map((p) => {
    const [a, b] = p.trim().split(/\s+/);
    return [R.x + (len(a, R.w) || 0), R.y + (len(b, R.h) || 0)] as [number, number];
  });
}

export interface Shape { poly: [number, number][] | null; radii: Radii | null }

export function tracePath(ctx: CanvasRenderingContext2D, R: Rect, sh: Shape, inset = 0, dx = 0, dy = 0) {
  const x = R.x + inset + dx, y = R.y + inset + dy, w = Math.max(0, R.w - 2 * inset), h = Math.max(0, R.h - 2 * inset);
  if (sh.poly) {
    // inset on polygons is approximated by scaling about the centre
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    const sx = R.w ? w / R.w : 1, sy = R.h ? h / R.h : 1;
    sh.poly.forEach(([px, py], i) => {
      const X = cx + (px - cx) * sx + dx, Y = cy + (py - cy) * sy + dy;
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    });
    ctx.closePath();
    return;
  }
  const r = sh.radii;
  if (!r || r.every(([a, b]) => a <= 0 || b <= 0)) { ctx.rect(x, y, w, h); return; }
  const rr = r.map(([a, b]) => [Math.max(0, a - inset), Math.max(0, b - inset)]);
  const [tl, tr, br, bl] = rr;
  ctx.moveTo(x + tl[0], y);
  ctx.lineTo(x + w - tr[0], y);
  if (tr[0] > 0 && tr[1] > 0) ctx.ellipse(x + w - tr[0], y + tr[1], tr[0], tr[1], 0, -Math.PI / 2, 0); else ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - br[1]);
  if (br[0] > 0 && br[1] > 0) ctx.ellipse(x + w - br[0], y + h - br[1], br[0], br[1], 0, 0, Math.PI / 2); else ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + bl[0], y + h);
  if (bl[0] > 0 && bl[1] > 0) ctx.ellipse(x + bl[0], y + h - bl[1], bl[0], bl[1], 0, Math.PI / 2, Math.PI); else ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + tl[1]);
  if (tl[0] > 0 && tl[1] > 0) ctx.ellipse(x + tl[0], y + tl[1], tl[0], tl[1], 0, Math.PI, Math.PI * 1.5); else ctx.lineTo(x, y);
  ctx.closePath();
}

function parseShadows(v: string | undefined) {
  if (!v || v === 'none') return [];
  return splitTop(v).map((s) => {
    const inset = /\binset\b/.test(s);
    s = s.replace(/\binset\b/, '').trim();
    // colour: last token that is not a length (may be rgba(...))
    const cm = /(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|[a-z]+)\s*$/.exec(s);
    const color = cm ? cm[1] : '#000';
    const nums = (cm ? s.slice(0, cm.index) : s).trim().split(/\s+/).filter(Boolean).map((n) => parseFloat(n) || 0);
    return { inset, x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, spread: nums[3] || 0, color };
  });
}

function parseBorder(v: string | undefined): { w: number; color: string } | null {
  if (!v) return null;
  if (v.trim() === '0' || v.trim() === 'none') return { w: 0, color: 'transparent' };
  const w = parseFloat(v) || 0;
  const cm = /(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8})/.exec(v);
  return { w, color: cm ? cm[1] : '#000' };
}

function paintGradients(ctx: CanvasRenderingContext2D, R: Rect, v: string, pos: string | undefined) {
  const [px, py] = (pos || '0 0').split(/\s+/).map((s) => parseFloat(s) || 0);
  for (const g of splitTop(v).reverse()) {
    const m = /repeating-linear-gradient\((.*)\)$/.exec(g);
    if (!m) continue;
    const args = splitTop(m[1]);
    let dir = '180deg';
    if (/deg$|^to /.test(args[0])) dir = args.shift()!;
    const stops = args.map((a) => {
      const mm = /^(.*?)\s+(-?[\d.]+)px$/.exec(a.trim());
      return mm ? { c: mm[1].trim(), p: parseFloat(mm[2]) } : { c: a.trim(), p: 0 };
    });
    const period = stops[stops.length - 1].p;
    if (!(period > 0)) continue;
    // horizontal (90deg): bands along x. vertical (0deg / to top): bands from the bottom up. 180deg: from top down.
    const horiz = dir === '90deg';
    const fromBottom = dir === '0deg' || dir === 'to top';
    const total = horiz ? R.w : R.h;
    const off = horiz ? px : py;
    for (let base = -period + (off % period) - period; base < total + period; base += period) {
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i], b = stops[i + 1];
        if (a.c !== b.c || !colorOK(a.c)) continue; // hard stops only; colour segments are between equal-colour stops
        const s0 = base + a.p, s1 = base + b.p;
        if (s1 <= 0 || s0 >= total || s1 <= s0) continue;
        ctx.fillStyle = a.c;
        const c0 = Math.max(0, s0), c1 = Math.min(total, s1);
        if (horiz) ctx.fillRect(R.x + c0, R.y, c1 - c0, R.h);
        else if (fromBottom) ctx.fillRect(R.x, R.y + R.h - c1, R.w, c1 - c0);
        else ctx.fillRect(R.x, R.y + c0, R.w, c1 - c0);
      }
    }
  }
}

export interface PaintOpts { text?: string; ignoreOpacity?: boolean; ignoreTransform?: boolean; children?: { s: string; t?: string }[] }

/** Paint one CSS box (already parsed) into rect R. */
export function paintBox(ctx: CanvasRenderingContext2D, c: Css, R: Rect, opts: PaintOpts = {}) {
  if (c.display === 'none') return;
  ctx.save();
  if (!opts.ignoreOpacity && c.opacity !== undefined) ctx.globalAlpha *= parseFloat(c.opacity);
  if (!opts.ignoreTransform && c.transform) {
    const rot = /rotate\((-?[\d.]+)deg\)/.exec(c.transform);
    const sc = /scaleY\((-?[\d.]+)\)/.exec(c.transform);
    if (rot || sc) {
      const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
      ctx.translate(cx, cy);
      if (sc) ctx.scale(1, parseFloat(sc[1]));
      if (rot) ctx.rotate(parseFloat(rot[1]) * Math.PI / 180);
      ctx.translate(-cx, -cy);
    }
  }
  const sh: Shape = {
    poly: c['clip-path'] ? polyPoints(c['clip-path'], R) : null,
    radii: parseRadii(c['border-radius'], R.w, R.h)
  };
  const shadows = parseShadows(c['box-shadow']);
  // outer shadows (clip-path clips them away, like CSS)
  if (!sh.poly) {
    const outer = shadows.filter((s) => !s.inset).reverse();
    if (outer.length) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(R.x - 400, R.y - 400, R.w + 800, R.h + 800);
      tracePath(ctx, R, sh);
      ctx.clip('evenodd');
      for (const s of outer) {
        ctx.beginPath();
        tracePath(ctx, R, { poly: null, radii: sh.radii ? sh.radii.map(([a, b]) => [a + s.spread, b + s.spread] as [number, number]) : null }, -s.spread, s.x, s.y);
        ctx.fillStyle = s.color;
        ctx.fill();
      }
      ctx.restore();
    }
  }
  ctx.save();
  ctx.beginPath();
  tracePath(ctx, R, sh);
  ctx.clip();
  if (colorOK(c.background)) { ctx.fillStyle = c.background; ctx.fillRect(R.x, R.y, R.w, R.h); }
  if (c['background-image']) paintGradients(ctx, R, c['background-image'], c['background-position']);
  // borders
  const all = parseBorder(c.border);
  const bw = {
    t: parseBorder(c['border-top']) || all, r: parseBorder(c['border-right']) || all,
    b: parseBorder(c['border-bottom']) || all, l: parseBorder(c['border-left']) || all
  };
  const B = { t: bw.t ? bw.t.w : 0, r: bw.r ? bw.r.w : 0, b: bw.b ? bw.b.w : 0, l: bw.l ? bw.l.w : 0 };
  const anyB = B.t || B.r || B.b || B.l;
  const inner: Rect = { x: R.x + B.l, y: R.y + B.t, w: R.w - B.l - B.r, h: R.h - B.t - B.b };
  if (anyB) {
    const col = (bw.t && B.t ? bw.t.color : null) || (bw.l && B.l ? bw.l.color : null) || (bw.r ? bw.r.color : '#000');
    if (B.t === B.r && B.r === B.b && B.b === B.l) {
      ctx.beginPath();
      tracePath(ctx, R, sh);
      tracePath(ctx, R, sh, B.t);
      ctx.fillStyle = col;
      ctx.fill('evenodd');
    } else if (sh.radii) {
      // e.g. arches: border on three sides with rounded top. Inner shape = rect inset per side, radii reduced.
      ctx.beginPath();
      tracePath(ctx, R, sh);
      const ir: Radii = sh.radii.map(([a, b2]) => [Math.max(0, a - B.l), Math.max(0, b2 - B.t)] as [number, number]);
      tracePath(ctx, inner, { poly: null, radii: ir });
      ctx.fillStyle = col;
      ctx.fill('evenodd');
    } else {
      const side = (bb: { w: number; color: string } | null, x: number, y: number, w: number, h: number) => {
        if (bb && bb.w && colorOK(bb.color)) { ctx.fillStyle = bb.color; ctx.fillRect(x, y, w, h); }
      };
      side(bw.t, R.x, R.y, R.w, B.t); side(bw.b, R.x, R.y + R.h - B.b, R.w, B.b);
      side(bw.l, R.x, R.y, B.l, R.h); side(bw.r, R.x + R.w - B.r, R.y, B.r, R.h);
    }
  }
  // inset shadows inside the padding box
  for (const s of shadows.filter((q) => q.inset)) {
    ctx.save();
    ctx.beginPath();
    const ir: Radii | null = sh.radii ? sh.radii.map(([a, b2]) => [Math.max(0, a - B.l), Math.max(0, b2 - B.t)] as [number, number]) : null;
    const ish: Shape = { poly: sh.poly, radii: ir };
    tracePath(ctx, inner, ish);
    ctx.clip();
    ctx.beginPath();
    ctx.rect(inner.x - 50, inner.y - 50, inner.w + 100, inner.h + 100);
    tracePath(ctx, inner, ish, s.spread, s.x, s.y);
    ctx.fillStyle = s.color;
    ctx.fill('evenodd');
    ctx.restore();
  }
  ctx.restore();
  // children (nested boxes, e.g. platform parts) are positioned against this box's padding box
  if (opts.children) for (const ch of opts.children) paintCss(ctx, ch.s, inner, ch.t);
  // text
  if (opts.text) paintText(ctx, c, inner, opts.text, sh.poly ? R : null);
  ctx.restore();
}

function paintText(ctx: CanvasRenderingContext2D, c: Css, R: Rect, text: string, _clip: Rect | null) {
  const size = parseFloat(c['font-size'] || '12') || 12;
  const weight = c['font-weight'] || '400';
  const fam = /Pixelify/.test(c['font-family'] || '') ? "'Pixelify Sans', monospace" : "'Space Mono', monospace";
  ctx.font = weight + ' ' + size + 'px ' + fam;
  const ls = parseFloat(c['letter-spacing'] || '0') || 0;
  try { (ctx as any).letterSpacing = ls + 'px'; } catch (e) { /* older browsers */ }
  ctx.fillStyle = c.color || '#f4f1e8';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const pad = (c.padding || '0').split(/\s+/).map((v) => parseFloat(v) || 0);
  const pt = pad[0], pr = pad.length > 1 ? pad[1] : pad[0];
  const area: Rect = { x: R.x + pr, y: R.y + pt, w: R.w - 2 * pr, h: R.h - 2 * pt };
  // wrap words to the area width (unless nowrap)
  const lines: string[] = [];
  if (c['white-space'] === 'nowrap') lines.push(text);
  else {
    let cur = '';
    for (const word of text.split(' ')) {
      const t = cur ? cur + ' ' + word : word;
      if (cur && ctx.measureText(t).width > area.w) { lines.push(cur); cur = word; } else cur = t;
    }
    if (cur) lines.push(cur);
  }
  const lhRaw = c['line-height'];
  let lh = size * 1.3;
  if (lhRaw) lh = lhRaw.endsWith('px') ? parseFloat(lhRaw) : parseFloat(lhRaw) * size;
  if (lines.length === 1) lh = Math.min(lh, area.h || lh);
  const block = lh * lines.length;
  const flexCenter = c.display === 'flex' || lines.length === 1;
  let y0 = flexCenter ? area.y + (area.h - block) / 2 : area.y;
  const sh = c['text-shadow'];
  if (sh) {
    const m = /(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(rgba?\([^)]*\)|#\w+)/.exec(sh);
    if (m) { ctx.shadowOffsetX = +m[1]; ctx.shadowOffsetY = +m[2]; ctx.shadowBlur = +m[3]; ctx.shadowColor = m[4]; }
  }
  for (const line of lines) {
    // letterSpacing adds trailing space after the last glyph; shift by half to stay centred like CSS
    ctx.fillText(line, area.x + area.w / 2 + ls / 2, Math.round(y0 + lh / 2) + 0.5);
    y0 += lh;
  }
}

/** Parse and paint a style string inside a parent rect. Returns the resolved rect. */
export function paintCss(ctx: CanvasRenderingContext2D, s: string, parent: Rect, text?: string, opts: PaintOpts = {}): Rect {
  const c = parseCss(s);
  const R = resolveRect(c, parent);
  paintBox(ctx, c, R, Object.assign({ text }, opts));
  return R;
}

// ---- CSS animation keyframes used by the world, evaluated per frame ----
export interface AnimSpec { name: string; dur: number; delay: number; steps: number; ease: string; alt: boolean }

export function parseAnims(c: Css): AnimSpec[] {
  const a = c.animation;
  if (!a || a === 'none') return [];
  const delays = (c['animation-delay'] || '').split(',').map((d) => parseFloat(d) || 0);
  return splitTop(a).map((one, i) => {
    const t = one.split(/\s+/);
    const name = t[0];
    const dur = parseFloat(t[1]) || 1;
    const st = /steps\((\d+)\)/.exec(one);
    const ease = /ease-in-out/.test(one) ? 'inout' : (/ease-out/.test(one) ? 'out' : (/ease-in/.test(one) ? 'in' : (/linear/.test(one) ? 'linear' : 'ease')));
    return { name, dur, delay: delays[i] !== undefined ? delays[i] : (delays[0] || 0), steps: st ? +st[1] : 0, ease, alt: /alternate/.test(one) };
  });
}

export interface AnimOut { dx: number; dy: number; alpha: number; scale: number; rot: number }

const lerpKF = (kf: [number, number, number][], p: number): [number, number] => {
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1];
    if (p >= a[0] && p <= b[0]) {
      const q = (p - a[0]) / (b[0] - a[0] || 1);
      return [a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q];
    }
  }
  return [kf[kf.length - 1][1], kf[kf.length - 1][2]];
};
const ease = (e: string, p: number) => e === 'linear' ? p : (e === 'inout' ? p * p * (3 - 2 * p) : (e === 'out' ? 1 - (1 - p) * (1 - p) : (e === 'in' ? p * p : p * p * (3 - 2 * p))));

/** Evaluate the mockup keyframes at time t (seconds). */
export function evalAnims(list: AnimSpec[], t: number, out: AnimOut): AnimOut {
  out.dx = 0; out.dy = 0; out.alpha = 1; out.scale = 1; out.rot = 0;
  for (const a of list) {
    let cyc = (t - a.delay) / a.dur;
    let p = cyc - Math.floor(cyc);
    if (a.alt && Math.floor(cyc) % 2 === 1) p = 1 - p;
    if (a.steps) p = Math.floor(p * a.steps) / a.steps;
    const half = p >= 0.5;
    switch (a.name) {
      case 'twinkle': out.alpha *= half ? 0.25 : 1; break;
      case 'glowp': out.alpha *= half ? 0.6 : 1; break;
      case 'bob': out.dy += half ? -2 : 0; break;
      case 'qbob': out.dy += half ? -4 : 0; break;
      case 'pulse': out.scale *= half ? 1.05 : 1; break;
      case 'rise': out.dy += -80 * p; out.alpha *= 1 - p; break;
      case 'drift': {
        const [x, y] = lerpKF([[0, 0, 0], [0.25, 10, -8], [0.5, 18, 4], [0.75, 6, 10], [1, 0, 0]], p);
        out.dx += x; out.dy += y; break;
      }
      case 'fog': out.dx += -70 + 140 * ease('inout', p); break;
      case 'ember': {
        const [x, y] = lerpKF([[0, 0, 0], [0.5, 16, -12], [1, 0, 0]], p);
        out.dx += x; out.dy += y; out.rot += p * Math.PI * 2; break;
      }
      default: break;
    }
  }
  return out;
}
