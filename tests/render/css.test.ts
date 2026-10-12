import { describe, it, expect } from 'vitest';
import {
  parseCss, splitTop, len, resolveRect, colorOK, paintBox, paintCss, tracePath, parseAnims, evalAnims,
  type Rect, type AnimSpec, type AnimOut,
} from '../../src/render/css.ts';

// ---- a recording 2D context: every method call is logged with the fill style current at the time ----
interface Call { name: string; args: any[]; style: unknown }
function recCtx(opts: { charW?: number; throwOn?: string } = {}) {
  const calls: Call[] = [];
  const props: Record<string, any> = { globalAlpha: 1, fillStyle: '#000' };
  const charW = opts.charW ?? 6;
  const ctx = new Proxy(props, {
    get(t, k: string) {
      if (k === 'measureText') return (s: string) => ({ width: s.length * charW });
      if (k in t) return t[k];
      return (...args: any[]) => { calls.push({ name: k, args, style: t.fillStyle }); };
    },
    set(t, k: string, v) {
      if (k === opts.throwOn) throw new Error('unsupported ' + k);
      t[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  const named = (n: string) => calls.filter((c) => c.name === n);
  return { ctx, calls, props, named };
}

const R: Rect = { x: 10, y: 20, w: 40, h: 30 };
const P: Rect = { x: 0, y: 0, w: 200, h: 100 };
const finiteArgs = (calls: Call[]) => calls.every((c) => c.args.every((a) => typeof a !== 'number' || Number.isFinite(a)));

describe('parseCss', () => {
  it('parses declarations into lower-cased keys with trimmed values', () => {
    expect(parseCss(' Left: 4px ;TOP:5%; background : #fff ')).toEqual({ left: '4px', top: '5%', background: '#fff' });
  });
  it('does not split on semicolons inside parentheses', () => {
    const c = parseCss('background-image:url(a;b);left:1px');
    expect(c['background-image']).toBe('url(a;b)');
    expect(c.left).toBe('1px');
  });
  it('skips empty fragments, fragments without a colon, and empty keys', () => {
    expect(parseCss('left:1px;;junk; :x;')).toEqual({ left: '1px' });
  });
  it('keeps colons in values', () => {
    expect(parseCss('content: a:b').content).toBe('a:b');
  });
});

describe('splitTop', () => {
  it('splits on commas outside parentheses and trims the parts', () => {
    expect(splitTop('a, rgba(1,2,3,0.5) 2px , f(g(1,2),3)')).toEqual(['a', 'rgba(1,2,3,0.5) 2px', 'f(g(1,2),3)']);
  });
  it('drops an empty trailing part', () => {
    expect(splitTop('a,b, ')).toEqual(['a', 'b']);
    expect(splitTop('')).toEqual([]);
  });
  it('supports a custom separator', () => {
    expect(splitTop('a b(c d) e', ' ')).toEqual(['a', 'b(c d)', 'e']);
  });
});

describe('len', () => {
  it('resolves px and bare numbers as-is', () => {
    expect(len('12px', 500)).toBe(12);
    expect(len(' 7.5 ', 500)).toBe(7.5);
    expect(len('-3px', 500)).toBe(-3);
  });
  it('resolves percentages against the reference length', () => {
    expect(len('50%', 80)).toBe(40);
    expect(len('0%', 80)).toBe(0);
  });
  it('resolves calc(A ± B) with px and % on either side', () => {
    expect(len('calc(50% - 4px)', 100)).toBe(46);
    expect(len('calc(10px + 25%)', 100)).toBe(35);
    expect(len('calc(10% + 10%)', 100)).toBe(20);
  });
  it('is null for missing, auto, unsupported calc and garbage values', () => {
    expect(len(undefined, 10)).toBeNull();
    expect(len('', 10)).toBeNull();
    expect(len('auto', 10)).toBeNull();
    expect(len('calc(1px * 2)', 10)).toBeNull();
    expect(len('wide', 10)).toBeNull();
  });
});

describe('resolveRect', () => {
  it('places a box by left/top/width/height inside the parent', () => {
    expect(resolveRect(parseCss('left:5px;top:10%;width:50%;height:20px'), { x: 100, y: 200, w: 60, h: 50 }))
      .toEqual({ x: 105, y: 205, w: 30, h: 20 });
  });
  it('anchors to the far edges with right/bottom', () => {
    const r = resolveRect(parseCss('right:5px;bottom:10px;width:20px;height:8px'), P);
    expect(r.x + r.w).toBe(P.x + P.w - 5);
    expect(r.y + r.h).toBe(P.y + P.h - 10);
  });
  it('stretches between left and right (top and bottom) when no size is given', () => {
    const r = resolveRect(parseCss('left:10px;right:30px;top:5px;bottom:15px'), P);
    expect(r).toEqual({ x: 10, y: 5, w: P.w - 40, h: P.h - 20 });
  });
  it('defaults to the parent origin and zero size', () => {
    expect(resolveRect({}, { x: 3, y: 4, w: 10, h: 10 })).toEqual({ x: 3, y: 4, w: 0, h: 0 });
    expect(resolveRect(parseCss('left:2px'), P)).toEqual({ x: 2, y: 0, w: 0, h: 0 });
  });
});

describe('colorOK', () => {
  it('accepts real colours and rejects empty, transparent and none', () => {
    expect(colorOK('#123')).toBe(true);
    expect(colorOK('rgba(0,0,0,0.5)')).toBe(true);
    expect(colorOK(undefined)).toBe(false);
    expect(colorOK('')).toBe(false);
    expect(colorOK('transparent')).toBe(false);
    expect(colorOK('none')).toBe(false);
  });
});

describe('tracePath', () => {
  it('traces a plain rectangle when there are no radii', () => {
    const { ctx, named } = recCtx();
    tracePath(ctx, R, { poly: null, radii: null });
    expect(named('rect')).toHaveLength(1);
    expect(named('rect')[0].args).toEqual([R.x, R.y, R.w, R.h]);
  });
  it('insets and offsets the rectangle, never going negative', () => {
    const { ctx, named } = recCtx();
    tracePath(ctx, R, { poly: null, radii: null }, 2, 1, -1);
    expect(named('rect')[0].args).toEqual([R.x + 3, R.y + 1, R.w - 4, R.h - 4]);
    tracePath(ctx, { x: 0, y: 0, w: 2, h: 2 }, { poly: null, radii: null }, 5);
    expect(named('rect')[1].args.slice(2)).toEqual([0, 0]);
  });
  it('scales a polygon about the box centre when inset, and tolerates a zero-size box', () => {
    const { ctx, named } = recCtx();
    const poly: [number, number][] = [[10, 20], [50, 20], [30, 50]];
    tracePath(ctx, R, { poly, radii: null }, 5);
    const pts = [named('moveTo')[0].args, ...named('lineTo').map((c) => c.args)];
    expect(pts).toHaveLength(3);
    pts.forEach(([x, y]) => { expect(x).toBeGreaterThanOrEqual(R.x); expect(x).toBeLessThanOrEqual(R.x + R.w); expect(y).toBeGreaterThanOrEqual(R.y); expect(y).toBeLessThanOrEqual(R.y + R.h); });
    const z = recCtx();
    tracePath(z.ctx, { x: 5, y: 5, w: 0, h: 0 }, { poly: [[5, 5], [5, 5]], radii: null }, 1);
    expect(finiteArgs(z.calls)).toBe(true);
    expect(z.named('closePath')).toHaveLength(1);
  });
});

describe('paintBox / paintCss', () => {
  it('paints nothing for display:none', () => {
    const { ctx, calls } = recCtx();
    paintCss(ctx, 'left:0;top:0;width:10px;height:10px;background:#f00;display:none', P);
    expect(calls).toHaveLength(0);
  });

  it('fills the background over its resolved rect and returns that rect', () => {
    const { ctx, named } = recCtx();
    const r = paintCss(ctx, 'left:10px;top:20px;width:40px;height:30px;background:#abc', P);
    expect(r).toEqual(R);
    const f = named('fillRect');
    expect(f).toHaveLength(1);
    expect(f[0].args).toEqual([R.x, R.y, R.w, R.h]);
    expect(f[0].style).toBe('#abc');
  });

  it('skips a transparent background', () => {
    const { ctx, named } = recCtx();
    paintCss(ctx, 'left:0;top:0;width:10px;height:10px;background:transparent', P);
    expect(named('fillRect')).toHaveLength(0);
  });

  it('balances every save with a restore', () => {
    const { ctx, named } = recCtx();
    paintCss(ctx, 'left:0;top:0;width:40px;height:40px;background:#111;border:2px solid #222;border-radius:4px;box-shadow:0 2px 0 #000, inset 0 0 0 2px #fff', P, 'hi', {
      children: [{ s: 'left:0;top:0;width:5px;height:5px;background:#333' }],
    });
    expect(named('save').length).toBeGreaterThan(0);
    expect(named('save').length).toBe(named('restore').length);
  });

  describe('opacity and transforms', () => {
    it('multiplies global alpha by opacity unless ignored', () => {
      const a = recCtx();
      a.props.globalAlpha = 0.8;
      paintCss(a.ctx, 'width:1px;height:1px;opacity:0.5', P);
      expect(a.props.globalAlpha).toBeCloseTo(0.4);
      const b = recCtx();
      paintCss(b.ctx, 'width:1px;height:1px;opacity:0.5', P, undefined, { ignoreOpacity: true });
      expect(b.props.globalAlpha).toBe(1);
    });
    it('rotates and flips about the box centre', () => {
      const { ctx, named } = recCtx();
      paintBox(ctx, parseCss('transform:rotate(90deg) scaleY(-1)'), R);
      expect(named('rotate')[0].args[0]).toBeCloseTo(Math.PI / 2);
      expect(named('scale')[0].args).toEqual([1, -1]);
      const tr = named('translate');
      expect(tr[0].args).toEqual([R.x + R.w / 2, R.y + R.h / 2]);
      expect(tr[1].args).toEqual([-(R.x + R.w / 2), -(R.y + R.h / 2)]);
    });
    it('supports rotate alone and ignores other or ignored transforms', () => {
      const a = recCtx();
      paintBox(a.ctx, parseCss('transform:rotate(-45deg)'), R);
      expect(a.named('rotate')).toHaveLength(1);
      expect(a.named('scale')).toHaveLength(0);
      const b = recCtx();
      paintBox(b.ctx, parseCss('transform:translateX(4px)'), R);
      expect(b.named('translate')).toHaveLength(0);
      const c = recCtx();
      paintBox(c.ctx, parseCss('transform:rotate(10deg)'), R, { ignoreTransform: true });
      expect(c.named('rotate')).toHaveLength(0);
    });
  });

  describe('borders', () => {
    it('paints an equal border as a ring in the border colour', () => {
      const { ctx, named } = recCtx();
      paintBox(ctx, parseCss('border:3px solid #123456'), R);
      const ring = named('fill').filter((c) => c.args[0] === 'evenodd');
      expect(ring).toHaveLength(1);
      expect(ring[0].style).toBe('#123456');
      // outer rect + inner rect inset by the border width
      const rects = named('rect').map((c) => c.args);
      expect(rects).toContainEqual([R.x, R.y, R.w, R.h]);
      expect(rects).toContainEqual([R.x + 3, R.y + 3, R.w - 6, R.h - 6]);
    });

    it('paints uneven square borders side by side, skipping zero-width sides', () => {
      const { ctx, named } = recCtx();
      paintBox(ctx, parseCss('border-top:4px solid #111;border-left:2px solid rgba(1,2,3,0.5);border-right:none;border-bottom:0'), R);
      const f = named('fillRect');
      expect(f.map((c) => c.style)).toEqual(['#111', 'rgba(1,2,3,0.5)']);
      expect(f[0].args).toEqual([R.x, R.y, R.w, 4]);
      expect(f[1].args).toEqual([R.x, R.y, 2, R.h]);
    });

    it('per-side borders override the shorthand', () => {
      const { ctx, named } = recCtx();
      paintBox(ctx, parseCss('border:2px solid #aaa;border-bottom:none'), R);
      const f = named('fillRect');
      expect(f.map((c) => c.args)).toEqual([[R.x, R.y, R.w, 2], [R.x, R.y, 2, R.h], [R.x + R.w - 2, R.y, 2, R.h]]);
    });

    it('rounded uneven borders (arches) paint one ring using the first visible side colour', () => {
      const pick = (css: string) => {
        const { ctx, named } = recCtx();
        paintBox(ctx, parseCss('border-radius:10px 10px 0 0;' + css), R);
        const ring = named('fill').filter((c) => c.args[0] === 'evenodd');
        expect(ring).toHaveLength(1);
        expect(named('fillRect')).toHaveLength(0);
        return ring[0].style;
      };
      expect(pick('border-top:4px solid #a00;border-left:2px solid #0a0;border-right:2px solid #00a')).toBe('#a00');
      expect(pick('border-left:2px solid #0a0;border-right:3px solid #00a')).toBe('#0a0');
      expect(pick('border-right:2px solid #00a;border-bottom:3px solid #ccc')).toBe('#00a');
      expect(typeof pick('border-bottom:3px solid #ccc')).toBe('string');
    });

    it('a border without a colour still paints, and 0 / none paint nothing', () => {
      const a = recCtx();
      paintBox(a.ctx, parseCss('border:2px solid'), R);
      expect(a.named('fill')).toHaveLength(1);
      const b = recCtx();
      paintBox(b.ctx, parseCss('border:0'), R);
      paintBox(b.ctx, parseCss('border:none'), R);
      paintBox(b.ctx, parseCss('border:solid #fff'), R);
      expect(b.named('fill')).toHaveLength(0);
      expect(b.named('fillRect')).toHaveLength(0);
    });

    it('children are positioned inside the border (padding box)', () => {
      const { ctx, named } = recCtx();
      paintBox(ctx, parseCss('border:3px solid #000'), R, { children: [{ s: 'left:0;top:0;width:5px;height:5px;background:#0f0' }, { s: 'right:0;bottom:0;width:5px;height:5px;background:#00f', t: 'x' }] });
      const kids = named('fillRect').filter((c) => c.style !== '#000');
      expect(kids[0].args).toEqual([R.x + 3, R.y + 3, 5, 5]);
      expect(kids[1].args).toEqual([R.x + R.w - 3 - 5, R.y + R.h - 3 - 5, 5, 5]);
      expect(named('fillText')).toHaveLength(1);
    });
  });

  describe('border radius', () => {
    const ellipses = (css: string, r: Rect = R) => {
      const { ctx, named, calls } = recCtx();
      paintBox(ctx, parseCss(css), r);
      expect(finiteArgs(calls)).toBe(true);
      return named('ellipse').map((c) => [c.args[2], c.args[3]] as [number, number]);
    };
    it('rounds every corner for a single value', () => {
      const e = ellipses('border-radius:6px');
      expect(e).toHaveLength(4);
      e.forEach(([rx, ry]) => { expect(rx).toBe(6); expect(ry).toBe(6); });
    });
    it('rounds only the non-zero corners (2, 3 and 4 values)', () => {
      expect(ellipses('border-radius:6px 0')).toHaveLength(2);
      expect(ellipses('border-radius:6px 0 4px')).toHaveLength(2);
      expect(ellipses('border-radius:0 0 4px 0')).toHaveLength(1);
      expect(ellipses('border-radius:0')).toHaveLength(0);
    });
    it('supports separate horizontal / vertical radii and percentages', () => {
      const e = ellipses('border-radius:50% / 10px');
      e.forEach(([rx, ry]) => { expect(rx).toBe(R.w / 2); expect(ry).toBe(10); });
      expect(ellipses('border-radius:4px / 0')).toHaveLength(0);
    });
    it('scales overlapping radii down so adjacent corners never exceed the side (like CSS)', () => {
      const box = { x: 0, y: 0, w: 20, h: 10 };
      const e = ellipses('border-radius:30px', box);
      expect(e).toHaveLength(4);
      e.forEach(([rx, ry]) => { expect(rx + rx).toBeLessThanOrEqual(box.w + 1e-9); expect(ry + ry).toBeLessThanOrEqual(box.h + 1e-9); });
    });
  });

  describe('clip-path', () => {
    it('traces a polygon with one vertex per point, relative to the box', () => {
      const { ctx, named } = recCtx();
      paintBox(ctx, parseCss('background:#f00;clip-path:polygon(50% 0, 100% 100%, 0 100%)'), R);
      const first = named('moveTo')[0].args;
      expect(first).toEqual([R.x + R.w / 2, R.y]);
      expect(named('lineTo').slice(0, 2).map((c) => c.args)).toEqual([[R.x + R.w, R.y + R.h], [R.x, R.y + R.h]]);
      expect(named('clip').length).toBeGreaterThan(0);
    });
    it('clips away outer shadows on polygons but keeps inset ones', () => {
      const { ctx, named } = recCtx();
      paintBox(ctx, parseCss('clip-path:polygon(0 0,100% 0,50% 100%);box-shadow:0 4px 0 #111, inset 0 0 0 2px #222'), R);
      const fills = named('fill').map((c) => c.style);
      expect(fills).toEqual(['#222']);
    });
    it('treats a non-polygon clip-path as the plain box', () => {
      const { ctx, named } = recCtx();
      paintBox(ctx, parseCss('clip-path:inset(2px)'), R);
      expect(named('rect')[0].args).toEqual([R.x, R.y, R.w, R.h]);
    });
  });

  describe('box-shadow', () => {
    it('paints outer shadows outside the box (even-odd clip) in their colours, back to front', () => {
      const { ctx, named } = recCtx();
      paintBox(ctx, parseCss('box-shadow:0 2px 0 #111, 2px 0 0 1px rgba(0,0,0,0.5)'), R);
      expect(named('clip')[0].args).toEqual(['evenodd']);
      expect(named('fill').map((c) => c.style)).toEqual(['rgba(0,0,0,0.5)', '#111']);
    });
    it('offsets and spreads the shadow shape', () => {
      const { ctx, named } = recCtx();
      paintBox(ctx, parseCss('box-shadow:3px 4px 0 2px #111'), R);
      const rects = named('rect').map((c) => c.args);
      expect(rects).toContainEqual([R.x - 2 + 3, R.y - 2 + 4, R.w + 4, R.h + 4]);
    });
    it('grows rounded corners with the spread', () => {
      const { ctx, named } = recCtx();
      paintBox(ctx, parseCss('border-radius:4px;box-shadow:0 0 0 2px #111'), R);
      const radii = named('ellipse').map((c) => c.args[2]);
      expect(radii).toContain(4);
      expect(Math.max(...radii)).toBeGreaterThan(4);
    });
    it('paints inset shadows inside the padding box, also with rounded corners and borders', () => {
      const a = recCtx();
      paintBox(a.ctx, parseCss('box-shadow:inset 0 0 0 2px #0f0'), R);
      expect(a.named('fill').filter((c) => c.args[0] === 'evenodd').map((c) => c.style)).toEqual(['#0f0']);
      const b = recCtx();
      paintBox(b.ctx, parseCss('border:1px solid #000;border-radius:5px;box-shadow:inset 2px 2px #0f0'), R);
      expect(b.named('fill').map((c) => c.style)).toEqual(['#000', '#0f0']);
      expect(finiteArgs(b.calls)).toBe(true);
    });
    it('falls back to a default colour and zero offsets when parts are missing', () => {
      const { ctx, named, calls } = recCtx();
      paintBox(ctx, parseCss('box-shadow:2px 2px 0 0'), R);
      paintBox(ctx, parseCss('box-shadow:black'), R);
      expect(named('fill')).toHaveLength(2);
      expect(finiteArgs(calls)).toBe(true);
    });
    it('ignores box-shadow:none', () => {
      const { ctx, named } = recCtx();
      paintBox(ctx, parseCss('box-shadow:none'), R);
      expect(named('fill')).toHaveLength(0);
    });
  });

  describe('repeating-linear-gradient stripes', () => {
    const stripes = (img: string, extra = '', r: Rect = R) => {
      const { ctx, named } = recCtx();
      paintBox(ctx, parseCss('background-image:' + img + ';' + extra), r);
      return named('fillRect');
    };
    const inside = (f: Call[], r: Rect) => f.forEach(({ args: [x, y, w, h] }) => {
      expect(w).toBeGreaterThan(0); expect(h).toBeGreaterThan(0);
      expect(x).toBeGreaterThanOrEqual(r.x); expect(y).toBeGreaterThanOrEqual(r.y);
      expect(x + w).toBeLessThanOrEqual(r.x + r.w + 1e-9); expect(y + h).toBeLessThanOrEqual(r.y + r.h + 1e-9);
    });

    it('90deg paints full-height vertical bands covering the stripe share of the width', () => {
      const f = stripes('repeating-linear-gradient(90deg, #f00 0px, #f00 2px, transparent 2px, transparent 4px)');
      inside(f, R);
      f.forEach((c) => { expect(c.style).toBe('#f00'); expect(c.args[3]).toBe(R.h); });
      expect(f.reduce((s, c) => s + c.args[2], 0)).toBe(R.w / 2);
    });

    it('180deg (default) paints full-width bands from the top; 0deg / to top from the bottom', () => {
      const img = (dir: string) => `repeating-linear-gradient(${dir}#00f 0px, #00f 3px, #fff 3px, #fff 10px)`;
      const def = stripes(img(''));
      const down = stripes(img('180deg, '));
      expect(def.map((c) => c.args)).toEqual(down.map((c) => c.args));
      inside(down, R);
      down.forEach((c) => expect(c.args[2]).toBe(R.w));
      const blue = down.filter((c) => c.style === '#00f');
      expect(blue[0].args[1]).toBe(R.y);
      const up = stripes(img('0deg, ')), up2 = stripes(img('to top, '));
      expect(up.map((c) => c.args)).toEqual(up2.map((c) => c.args));
      const blueUp = up.filter((c) => c.style === '#00f');
      expect(Math.max(...blueUp.map((c) => c.args[1] + c.args[3]))).toBe(R.y + R.h);
    });

    it('background-position shifts the bands', () => {
      const img = 'repeating-linear-gradient(90deg, #f00 0px, #f00 2px, transparent 2px, transparent 8px)';
      const a = stripes(img), b = stripes(img, 'background-position:3px 0');
      expect(b[0].args[0]).not.toBe(a[0].args[0]);
      inside(b, R);
    });

    it('paints only hard-stop segments (soft transitions between colours are skipped)', () => {
      const f = stripes('repeating-linear-gradient(90deg, #f00 0px, #0f0 4px)');
      expect(f).toHaveLength(0);
    });

    it('ignores non-repeating gradients, zero periods, stops without positions and unknown layers', () => {
      expect(stripes('linear-gradient(#000, #fff)')).toHaveLength(0);
      expect(stripes('repeating-linear-gradient(90deg, #f00 0px, #f00 0px)')).toHaveLength(0);
      expect(stripes('repeating-linear-gradient(#f00, #f00)')).toHaveLength(0);
      expect(stripes('url(x.png), repeating-linear-gradient(90deg, #f00 0px, #f00 2px, #fff 2px, #fff 4px)').length).toBeGreaterThan(0);
    });

    it('stacked layers paint bottom layer first', () => {
      const f = stripes('repeating-linear-gradient(90deg, #a00 0px, #a00 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, #0a0 0px, #0a0 1px, transparent 1px, transparent 4px)');
      expect(f[0].style).toBe('#0a0');
      expect(f[f.length - 1].style).toBe('#a00');
    });
  });

  describe('text', () => {
    const text = (css: string, t: string, r: Rect = { x: 0, y: 0, w: 60, h: 40 }, opts: { charW?: number; throwOn?: string } = {}) => {
      const rc = recCtx(opts);
      paintBox(rc.ctx, parseCss(css), r, { text: t });
      return { lines: rc.named('fillText').map((c) => ({ s: c.args[0] as string, x: c.args[1] as number, y: c.args[2] as number })), props: rc.props };
    };

    it('draws a single centred line', () => {
      const { lines, props } = text('font-size:10px', 'hello', { x: 0, y: 0, w: 60, h: 40 });
      expect(lines).toHaveLength(1);
      expect(lines[0].s).toBe('hello');
      expect(lines[0].x).toBe(30);
      expect(Math.abs(lines[0].y - 20)).toBeLessThanOrEqual(1);
      expect(props.textAlign).toBe('center');
      expect(props.font).toContain('10px');
    });

    it('wraps words to the box width, keeping every word in order', () => {
      const words = 'one two three four five six';
      const { lines } = text('font-size:10px', words, { x: 0, y: 0, w: 60, h: 80 });
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.map((l) => l.s).join(' ')).toBe(words);
      lines.forEach((l) => expect(l.s.length * 6).toBeLessThanOrEqual(60));
      for (let i = 1; i < lines.length; i++) expect(lines[i].y).toBeGreaterThan(lines[i - 1].y);
    });

    it('a single word longer than the box stays on its own line', () => {
      const { lines } = text('', 'supercalifragilistic x', { x: 0, y: 0, w: 30, h: 80 });
      expect(lines.map((l) => l.s)).toEqual(['supercalifragilistic', 'x']);
    });

    it('nowrap keeps the text on one line', () => {
      const { lines } = text('white-space:nowrap', 'one two three four five six');
      expect(lines).toHaveLength(1);
    });

    it('padding narrows the wrap width', () => {
      const t = 'aaa bbb ccc ddd';
      expect(text('padding:0', t).lines.length).toBeLessThan(text('padding:0 15px', t).lines.length);
      expect(text('padding:8px', t).lines.length).toBeGreaterThanOrEqual(text('padding:0', t).lines.length);
    });

    it('line-height in px or as a multiple of the font size sets the line spacing', () => {
      const t = 'aaaaaaaa bbbbbbbb cccccccc';
      const box = { x: 0, y: 0, w: 60, h: 200 };
      const gap = (css: string) => { const l = text(css, t, box).lines; return l[1].y - l[0].y; };
      expect(gap('font-size:10px;line-height:20px')).toBe(20);
      expect(gap('font-size:10px;line-height:3')).toBe(30);
      expect(gap('font-size:10px')).toBeGreaterThan(10);
    });

    it('multi-line text starts at the top unless display:flex centres it', () => {
      const t = 'aaaaaaaa bbbbbbbb';
      const box = { x: 0, y: 0, w: 60, h: 200 };
      const top = text('font-size:10px;line-height:10px', t, box).lines;
      const mid = text('font-size:10px;line-height:10px;display:flex', t, box).lines;
      expect(top[0].y).toBeLessThan(10);
      expect(mid[0].y).toBeGreaterThan(80);
    });

    it('a single line never gets taller than the box (but survives a zero-height box)', () => {
      const a = text('font-size:10px;line-height:100px', 'x', { x: 0, y: 0, w: 60, h: 20 }).lines;
      expect(a[0].y).toBeLessThanOrEqual(21);
      const b = text('font-size:10px', 'x', { x: 0, y: 0, w: 60, h: 0 }).lines;
      expect(Number.isFinite(b[0].y)).toBe(true);
    });

    it('applies the requested font family, weight and colour, with defaults for the rest', () => {
      const a = text('font-family:Pixelify Sans;font-weight:700;color:#abc', 'x').props;
      const b = text('font-size:huge', 'x').props;
      expect(a.font).toContain('Pixelify');
      expect(a.font).toContain('700');
      expect(a.fillStyle).toBe('#abc');
      expect(b.font).not.toContain('Pixelify');
      expect(b.font).toMatch(/\d+px/);
      expect(b.fillStyle).toBeTruthy();
    });

    it('letter-spacing shifts the centre by half a gap, and is skipped where unsupported', () => {
      const a = text('letter-spacing:4px', 'x');
      expect(a.props.letterSpacing).toBe('4px');
      expect(a.lines[0].x).toBe(30 + 2);
      const b = text('letter-spacing:4px', 'x', undefined, { throwOn: 'letterSpacing' });
      expect(b.lines).toHaveLength(1);
    });

    it('applies a px text-shadow and ignores an unparseable one', () => {
      const a = text('text-shadow:1px 2px 3px rgba(0,0,0,0.5)', 'x').props;
      expect([a.shadowOffsetX, a.shadowOffsetY, a.shadowBlur, a.shadowColor]).toEqual([1, 2, 3, 'rgba(0,0,0,0.5)']);
      const b = text('text-shadow:none', 'x').props;
      expect(b.shadowColor).toBeUndefined();
    });

    it('draws text on clip-path boxes too', () => {
      const { lines } = text('clip-path:polygon(0 0,100% 0,50% 100%)', 'hi');
      expect(lines).toHaveLength(1);
    });
  });
});

describe('parseAnims', () => {
  it('returns nothing without an animation', () => {
    expect(parseAnims({})).toEqual([]);
    expect(parseAnims({ animation: 'none' })).toEqual([]);
  });

  it('parses name, duration, steps, easing and alternate for each animation', () => {
    const a = parseAnims(parseCss('animation: bob 2s steps(4) infinite alternate, fog 10s ease-in-out infinite, rise 3s ease-out, glowp 1s ease-in, drift 5s linear, twinkle 1.5s infinite'));
    expect(a.map((x) => x.name)).toEqual(['bob', 'fog', 'rise', 'glowp', 'drift', 'twinkle']);
    expect(a.map((x) => x.dur)).toEqual([2, 10, 3, 1, 5, 1.5]);
    expect(a[0].steps).toBe(4);
    expect(a[1].steps).toBe(0);
    expect(a.map((x) => x.alt)).toEqual([true, false, false, false, false, false]);
    expect(a.map((x) => x.ease)).toEqual(['ease', 'inout', 'out', 'in', 'linear', 'ease']);
  });

  it('gives a positive default duration when it is missing', () => {
    expect(parseAnims({ animation: 'bob' })[0].dur).toBeGreaterThan(0);
  });

  it('matches animation-delay entries by position and reuses the first for the rest', () => {
    const a = parseAnims(parseCss('animation: bob 1s, qbob 1s, pulse 1s; animation-delay: 0.5s, 2s'));
    expect(a.map((x) => x.delay)).toEqual([0.5, 2, 0.5]);
    const b = parseAnims(parseCss('animation: bob 1s, qbob 1s'));
    expect(b.map((x) => x.delay)).toEqual([0, 0]);
  });
});

describe('evalAnims', () => {
  const spec = (name: string, o: Partial<AnimSpec> = {}): AnimSpec => ({ name, dur: 2, delay: 0, steps: 0, ease: 'ease', alt: false, ...o });
  const out = (): AnimOut => ({ dx: 9, dy: 9, alpha: 9, scale: 9, rot: 9 });
  const at = (list: AnimSpec[], t: number) => evalAnims(list, t, out());
  const REST = { dx: 0, dy: 0, alpha: 1, scale: 1, rot: 0 };

  it('resets the output for an empty list or unknown animations', () => {
    expect(at([], 3)).toEqual(REST);
    expect(at([spec('mystery')], 1.3)).toEqual(REST);
  });

  it('blink-style animations only change their own channel in the second half of the cycle', () => {
    const cases: [string, keyof AnimOut][] = [['twinkle', 'alpha'], ['glowp', 'alpha'], ['bob', 'dy'], ['qbob', 'dy'], ['pulse', 'scale']];
    cases.forEach(([name, ch]) => {
      const first = at([spec(name)], 0.2), second = at([spec(name)], 1.2);
      expect(first).toEqual(REST);
      expect(second[ch]).not.toBe(REST[ch]);
      (Object.keys(REST) as (keyof AnimOut)[]).filter((k) => k !== ch).forEach((k) => expect(second[k]).toBe(REST[k]));
    });
    expect(at([spec('bob')], 1.2).dy).toBeLessThan(0);
    expect(at([spec('qbob')], 1.2).dy).toBeLessThan(at([spec('bob')], 1.2).dy);
  });

  it('rise floats up and fades out over the cycle', () => {
    const a = at([spec('rise')], 0.5), b = at([spec('rise')], 1.5);
    expect(b.dy).toBeLessThan(a.dy);
    expect(b.alpha).toBeLessThan(a.alpha);
    expect(at([spec('rise')], 0)).toEqual(REST);
  });

  it('drift and ember wander away and return to the start each cycle', () => {
    ['drift', 'ember'].forEach((name) => {
      const s = at([spec(name)], 0);
      expect(s.dx).toBe(0); expect(s.dy).toBe(0);
      const mid = at([spec(name)], 1);
      expect(Math.abs(mid.dx) + Math.abs(mid.dy)).toBeGreaterThan(0);
      const end = at([spec(name)], 1.9999);
      expect(Math.abs(end.dx)).toBeLessThan(0.01); expect(Math.abs(end.dy)).toBeLessThan(0.01);
    });
    expect(at([spec('ember')], 1).rot).toBeGreaterThan(at([spec('ember')], 0.5).rot);
  });

  it('fog sweeps symmetrically from one side to the other', () => {
    const s = at([spec('fog')], 0).dx, m = at([spec('fog')], 1).dx, e = at([spec('fog')], 1.99999).dx;
    expect(s).toBeLessThan(0);
    expect(m).toBeCloseTo(0);
    expect(e).toBeCloseTo(-s, 2);
    expect(at([spec('fog')], 0.5).dx).toBeLessThan(m);
  });

  it('loops every duration', () => {
    ['drift', 'fog', 'rise', 'ember'].forEach((name) => {
      const a = at([spec(name)], 0.7), b = at([spec(name)], 0.7 + 2 * 3);
      (Object.keys(a) as (keyof AnimOut)[]).forEach((k) => expect(b[k]).toBeCloseTo(a[k], 6));
    });
  });

  it('delay shifts the phase', () => {
    const a = at([spec('drift', { delay: 0.6 })], 0.6 + 0.3), b = at([spec('drift')], 0.3);
    expect(a.dx).toBeCloseTo(b.dx); expect(a.dy).toBeCloseTo(b.dy);
  });

  it('steps hold the value constant within each step', () => {
    const s = spec('rise', { steps: 4 });
    expect(at([s], 0.1).dy).toBe(at([s], 0.4).dy);
    expect(at([s], 0.6).dy).not.toBe(at([s], 0.4).dy);
  });

  it('alternate plays every other cycle backwards', () => {
    const s = spec('rise', { alt: true });
    expect(at([s], 2 + 0.5).dy).toBeCloseTo(at([s], 2 - 0.5).dy);
    expect(at([s], 0.5).dy).toBeCloseTo(at([spec('rise')], 0.5).dy);
  });

  it('combines several animations', () => {
    const o = at([spec('bob'), spec('qbob'), spec('pulse'), spec('twinkle')], 1.5);
    expect(o.dy).toBe(at([spec('bob')], 1.5).dy + at([spec('qbob')], 1.5).dy);
    expect(o.scale).not.toBe(1);
    expect(o.alpha).not.toBe(1);
  });
});
