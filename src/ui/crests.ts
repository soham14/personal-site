// Crest images (ported from the mockup's crestRaw): shield + ribbon in a 100x116 box, rendered as SVG data URLs.
// idx 0-3 = Golden Bear, Azure Bastion, Five-Star, Obsidian Block; anything else = locked silhouette.

type Part = { l: number; t: number; w: number; h: number; bg: string; clip?: string; r?: string; txt?: string; tx?: string; fs?: number; rib?: boolean };

const SH = '0 0,100 0,100 62,50 100,0 62';
const STAR = '50 0,61 35,98 35,68 57,79 91,50 70,21 91,32 57,2 35,39 35';
const HEX = '25 0,75 0,100 50,75 100,25 100,0 50';
const RIB = '0 0,100 0,94 50,100 100,0 100,6 50';
const TRI = '50 0,100 100,0 100';

function raw(kind: number): Part[] {
  const o: Part[] = [];
  const a = (l: number, t: number, w: number, h: number, bg: string, ex: Partial<Part> = {}) => o.push({ l, t, w, h, bg, ...ex });
  const rib = (bg: string, tx: string, txt: string) => a(3, 92, 94, 22, bg, { clip: RIB, txt, tx, fs: 9, rib: true });
  if (kind === 0) {
    const G = '#f2b632', N = '#1d3a6b', T = '#7fa0d8';
    a(0, 0, 100, 100, G, { clip: SH }); a(5, 5, 90, 89, N, { clip: SH });
    a(61, 17, 10, 56, T); a(58, 8, 16, 11, T, { clip: TRI });
    a(64, 24, 4, 9, N); a(64, 40, 4, 9, N); a(56, 70, 20, 4, T);
    a(26, 42, 28, 28, G, { r: '42' });
    a(29, 28, 22, 18, G, { r: '50' });
    a(27, 25, 8, 8, G, { r: '50' }); a(45, 25, 8, 8, G, { r: '50' });
    a(20, 46, 9, 22, G, { r: '40' }); a(51, 46, 9, 22, G, { r: '40' });
    a(29, 66, 11, 12, G, { r: '30' }); a(41, 66, 11, 12, G, { r: '30' });
    a(34, 34, 3, 3, N, { r: '50' }); a(43, 34, 3, 3, N, { r: '50' }); a(37, 38, 6, 5, N, { r: '40' });
    rib(G, '#14284a', 'GOLDEN BEAR');
  } else if (kind === 1) {
    const W = '#e8f1ff', B = '#2f7fd6';
    a(0, 0, 100, 100, W, { clip: SH }); a(5, 5, 90, 89, B, { clip: SH });
    a(27, 13, 10, 8, W); a(45, 13, 10, 8, W); a(63, 13, 10, 8, W);
    a(25, 22, 50, 52, W, { clip: HEX }); a(31, 29, 38, 38, B, { clip: HEX }); a(40, 37, 20, 22, W, { clip: HEX });
    rib('#1f5fa8', '#ffffff', 'AZURE BASTION');
  } else if (kind === 2) {
    const C = '#f6ecd2', R = '#c8323a';
    a(0, 0, 100, 100, C, { clip: SH }); a(5, 5, 90, 89, R, { clip: SH });
    [[12, 38], [28, 26], [43, 22], [58, 26], [73, 38]].forEach((p) => a(p[0], p[1], 15, 15, C, { clip: STAR }));
    a(30, 62, 40, 4, C); a(40, 70, 20, 3, C);
    rib('#8f1f27', '#f6ecd2', 'FIVE-STAR');
  } else if (kind === 3) {
    const S = '#c9ccd3', K = '#2b2b2e';
    a(0, 0, 100, 100, S, { clip: SH }); a(5, 5, 90, 89, K, { clip: SH });
    const cube = (x: number, y: number) => {
      a(x, y + 7, 14, 19, '#8d9099', { clip: '0 0,100 37,100 100,0 63' });
      a(x + 14, y + 7, 14, 19, '#5b5d63', { clip: '0 37,100 0,100 63,0 100' });
      a(x, y, 28, 14, S, { clip: '50 0,100 50,50 100,0 50' });
    };
    cube(22, 50); cube(50, 50); cube(36, 28);
    rib('#161618', '#c9ccd3', 'OBSIDIAN BLOCK');
  } else {
    a(0, 0, 100, 100, '#3a3d63', { clip: SH }); a(5, 5, 90, 89, '#15183a', { clip: SH });
    a(0, 24, 100, 44, 'transparent', { txt: '?', tx: '#6c6780', fs: 44 });
  }
  return o;
}

function partSvg(p: Part): string {
  let s = '';
  if (p.bg !== 'transparent') {
    if (p.clip) {
      const pts = p.clip.split(',').map((xy) => {
        const [x, y] = xy.trim().split(/\s+/).map(Number);
        return (p.l + (x / 100) * p.w).toFixed(2) + ',' + (p.t + (y / 100) * p.h).toFixed(2);
      }).join(' ');
      s += `<polygon points="${pts}" fill="${p.bg}"/>`;
    } else if (p.r) {
      const k = Number(p.r) / 100;
      s += `<rect x="${p.l}" y="${p.t}" width="${p.w}" height="${p.h}" rx="${(p.w * k).toFixed(2)}" ry="${(p.h * k).toFixed(2)}" fill="${p.bg}"/>`;
    } else {
      s += `<rect x="${p.l}" y="${p.t}" width="${p.w}" height="${p.h}" fill="${p.bg}"/>`;
    }
  }
  if (p.txt) {
    s += `<text x="${p.l + p.w / 2}" y="${p.t + p.h / 2}" text-anchor="middle" dominant-baseline="central" font-family="'Pixelify Sans',monospace" font-weight="700" font-size="${p.fs}" letter-spacing="${p.rib ? 1 : 0}" fill="${p.tx}">${p.txt}</text>`;
  }
  return s;
}

const cache = new Map<string, string>();

/** SVG data URL of crest `idx` (100x116 with ribbon, or 100x100 without). */
export function crestDataURL(idx: number, ribbon = true): string {
  const key = idx + (ribbon ? 'r' : 'n');
  const hit = cache.get(key);
  if (hit) return hit;
  const H = ribbon ? 116 : 100;
  const body = raw(idx).filter((p) => ribbon || !p.rib).map(partSvg).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${H}" width="100" height="${H}" shape-rendering="crispEdges">${body}</svg>`;
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  cache.set(key, url);
  return url;
}
