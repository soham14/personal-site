// @ts-nocheck
// GENERATED from reference/CareerQuest.dc.html (the approved mockup) by porting its pure data/drawing helpers verbatim.
// These build plain box/run descriptions (CSS-like specs) that src/render/css.ts rasterizes to canvases.
// Type-checking is off for this file only: it is a faithful copy of untyped mockup code.
import { MAPS, STAGES, WORLD } from '../content.ts';

class Legacy {
  memo: any = {};
  maps(acc) { return MAPS; }
  platData() { return WORLD.platforms; }
  ladderData() { return WORLD.ladders; }
  credData() {
    return STAGES.map((s) => ({ crest: s.crest, org: s.org, role: s.title, field: s.crestField, trim: s.crestTrim, quest: s.quest, rewardExp: s.rewardExp }));
  }
  // Crest ribbon label: the crest name without the trailing "Crest", upper-cased (e.g. GOLDEN BEAR)
  ribbon(kind) { return STAGES[kind].crest.replace(/\s*Crest$/, '').toUpperCase(); }
  bookData(tier) {
    const HEX = 'clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);';
    return [
      { w: 56, c: [[0, 6, 56, 34, '#6b4226'], [3, 8, 25, 29, '#f1e6c8'], [29, 8, 24, 29, '#f1e6c8'], [27, 6, 2, 34, '#3f2615'], [6, 13, 18, 2, '#bfae86'], [6, 19, 18, 2, '#bfae86'], [6, 25, 12, 2, '#bfae86'], [32, 13, 18, 2, '#bfae86'], [32, 19, 14, 2, '#bfae86']], pg: [29, 8, 24, 29, '#fff8e1'] },
      { w: 78, c: [[0, 0, 78, 54, '#2566b0'], [5, 5, 33, 40, '#f4f8ff'], [40, 5, 33, 40, '#f4f8ff'], [37, 3, 3, 44, '#2f7fd6'], [9, 11, 24, 2, '#8fc0ee'], [9, 18, 20, 2, '#8fc0ee'], [9, 25, 24, 2, '#8fc0ee'], [9, 32, 16, 2, '#8fc0ee'], [44, 11, 24, 2, '#8fc0ee'], [44, 18, 20, 2, '#8fc0ee'], [44, 25, 24, 2, '#8fc0ee']], pg: [40, 5, 33, 40, '#cfe8ff'], top: [[31, 36, 16, 16, '#ffd166', HEX], [35, 40, 8, 8, '#e0a93a', HEX]] },
      { w: 76, c: [[0, 0, 76, 54, '#7e1d24', 'box-shadow:inset 0 0 0 1px #ff8a5c;'], [5, 5, 31, 44, '#f1e6cc'], [39, 5, 31, 44, '#f1e6cc'], [9, 12, 23, 2, '#cdbf9f'], [9, 19, 23, 2, '#cdbf9f'], [9, 26, 17, 2, '#cdbf9f'], [10, 34, 7, 7, '#e0555c'], [43, 12, 23, 2, '#cdbf9f'], [43, 19, 23, 2, '#cdbf9f'], [55, 33, 4, 4, '#ffd166', 'box-shadow:1px 0 0 #ffd166,-1px 0 0 #ffd166,0 1px 0 #ffd166,0 -1px 0 #ffd166;']], pg: [39, 5, 31, 44, '#e6d9b9'] },
      { w: 64, c: [[0, 6, 64, 38, '#8f939c', 'box-shadow:inset 0 0 0 1px #1a1428;'], [4, 10, 26, 30, '#eef0f5'], [32, 10, 26, 30, '#dfe2ea'], [30, 8, 4, 34, '#5b5e68'], [35, 16, 18, 2, '#aeb2bc'], [35, 22, 18, 2, '#aeb2bc'], [35, 28, 12, 2, '#aeb2bc'], [9, 18, 16, 14, 'rgba(143,208,255,0.4)', 'border-radius:50%;'], [15, 16, 4, 18, '#5fb3f0'], [11, 21, 12, 4, '#5fb3f0'], [12, 29, 10, 3, '#bfe3ff']], pg: [32, 10, 26, 30, '#f6f7fa'] }
    ][tier];
  }
  rgba(hex, a) {
    const h = hex.replace('#', '');
    const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return 'rgba(' + parseInt(v.slice(0, 2), 16) + ',' + parseInt(v.slice(2, 4), 16) + ',' + parseInt(v.slice(4, 6), 16) + ',' + a + ')';
  }

  v2Sprites() {
    if (this.memo.v2s) return this.memo.v2s;
    const rp = (c, n) => { let s = ''; for (let i = 0; i < n; i++) s += c; return s; };
    const mk = (W, H) => { const g = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push('.'); g.push(r); } return g; };
    const put = (g, row, col, s) => {
      for (let k = 0; k < s.length; k++) {
        const ch = s.charAt(k);
        if (ch !== '.' && row >= 0 && row < g.length && col + k >= 0 && col + k < g[0].length) g[row][col + k] = ch;
      }
    };
    const fill = (g, x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (j >= 0 && j < g.length && i >= 0 && i < g[0].length) g[j][i] = c; };

    // ---- 0 Apprentice (UC Berkeley) ----
    const apprentice = () => {
      const R = rp, L = (n, s) => R('.', n) + s;
      const pal = {
        k: '#17112a', s: '#d4a07a', d: '#bf8a63', l: '#e2b892',
        h: '#2b2340', H: '#1f1930', L: '#4a3f66', f: '#2e2a44', e: '#1a1426', i: '#3d2f5c', g: '#ffffff', m: '#8a4a3a',
        n: '#1d3a6b', N: '#14284a', a: '#2f5596', G: '#f2b632',
        y: '#ffd166', Y: '#e0a93a', W: '#fff1c4',
        q: '#6b5a3a', Q: '#4a3d28',
        B: '#4a3226', M: '#6a4a38', O: '#2e1e18',
        K: '#9a6a3c', R: '#7a4a2a', T: '#5e3b20', x: '#8a5a34',
        c: '#f1e6c8', C: '#bfae86', r: '#d9434f', u: '#4aa3e8'
      };
      const HD = (s) => '......' + s + '......';
      const E = R('.', 36);
      const rows = [
        E, E, E, E, E, E, E, E, E, E, E, E, E, E,
        HD('.......kk.k..k...kk.....'),
        HD('.....kkhhkhkkhkkkhhk....'),
        HD('....khhLhhhhLhhhhhhhk...'),
        HD('..kkhhhLhhhhhhhLhhhhhk..'),
        HD('.khHhhhhLLhhhhhhhhhhHhk.'),
        HD('.khhhhhhhhhLhhhhhhhhhhk.'),
        HD('.kHhhhhhhhhhhhhhhhhHhHkk'),
        HD('.kHHhhhhshhlhhHHHHHshhHH'),
        HD('.kHHsHHHHHlllHsssssHHdkk'),
        HD('.kHlssffffssssffffssdHk.'),
        HD('.khlsfeeesfssfeeesfsddk.'),
        HD('.kffsfgeisffffgeisfsffk.'),
        HD('.kllsfgiisfssfgiisfsddk.'),
        HD('.kllsfssssfssfssssfsddk.'),
        HD('..kllsffffsddsffffsddk..'),
        HD('...kllssssmssmssssddk...'),
        HD('....kllssssmmssdsddk....'),
        HD('.....kddddddddddddk.....'),
        HD('......kkddddddddkk......'),
        HD('........kddddddk........'),
        HD('........kddddddk........'),
        '..............kddddddk....kkkkkk....',
        '...........kakyWWyyyYYkak.kKRRGk...W',
        '.........kanyWWyyyyyyYYYnNkKRRGk..y.',
        '.......kaaannYyyyyyyyYYnnnNNkRRk.x..',
        '.......kannNaQqnnnnyyYnnNnNNkKRkr...',
        '.......kannNaaQqnnnyWYnNNnNNkKRxr...',
        '.......kannNaanQqnnyyYGGNnNNkGxkr...',
        '.......kannNaannGqnyWYGaNnNNkxRk.r..',
        '.......kGGGNaannnQqyyYnNNGGGxKRk....',
        '.......klsskaannnnQYYYnNkssxkKRk....',
        '.......kssdkaannnnqYnYqQksddkKRk....',
        '.......ksddkqqqqqGGqqqQQkdddkGGk....',
        '.......kkkkkTTKKKnTnTKKKkkkkkKRk....',
        '...........kcCRGRrruuRGRkRRRRRRk....',
        '..........kaTTTTTrruuTTTNkRRRRRk....',
        '..........kGGGGGGGGGGGGGGkRRRRRk....',
        '..........kkkkkkkkkkkkkkkkkkkkkk....',
        '............kNNNk..kNNNk............',
        '............kanNk..kanNk............',
        '............kanNk..kanNk............',
        '............kanNk..kanNk............',
        '...........kMMMMMkkMMMMMk...........',
        '...........kMBBBOkkMBBBOk...........',
        '.........kBBBBBBOkkMBBBBBBk.........',
        '.........kkkkkkkkkkkkkkkkkk.........'
      ];
      const g = mk(36, 60);
      rows.forEach((rw, y) => put(g, y, 0, rw));
      return {
        W: 36, H: 60, pal: pal,
        layers: { base: { g: g, x: 0, y: 0 } },
        blink: [[12, 24, 3, 3, '#d4a07a'], [20, 24, 3, 3, '#d4a07a']],
        ring: '#f2b632', ring2: '#e0a93a', rune: '#ffd166'
      };
    };

    // ---- 1 Mage (SAP) ----
    const mage = () => {
      const PAL = { 'k': '#17112a', 's': '#d4a07a', 'd': '#bf8a63', 'l': '#e2b892', 'h': '#2b2340', 'H': '#1f1930', 'L': '#4a3f66', 'f': '#2e2a44', 'e': '#1a1426', 'i': '#3d2f5c', 'g': '#ffffff', 'm': '#8a4a3a', 't': '#2566b0', 'T': '#6fa8ff', 'u': '#2566b0', 'p': '#f4f8ff', 'y': '#ffd166', 'Y': '#e0a93a', 'W': '#fff1c4', 'q': '#6b5a3a', 'Q': '#4a3d28', 'B': '#4a3226', 'M': '#6a4a38', 'N': '#2e1e18', 'R': '#2f7fd6', 'D': '#2566b0', 'X': '#6fa8ff', 'w': '#f4f8ff', 'C': '#cfe8ff', 'c': '#8fc0ee', 'G': '#ffd166', 'a': '#e0a93a', 'r': '#8a5a3a', 'v': '#5e3a24', 'z': '#b07a50' };
      const layered = (layers, W, H) => {
        const g = mk(W, H);
        layers.forEach((layer) => {
          for (let r = 0; r < H; r++) {
            const line = layer[r];
            if (!line) continue;
            line.split(';').forEach((seg) => {
              const k = seg.indexOf(':');
              put(g, r, parseInt(seg.substring(0, k), 10), seg.substring(k + 1));
            });
          }
        });
        return g;
      };
      let r;
      // canonical 36x60 template (head + body); rows 0-16 headroom
      const TPL = [];
      for (r = 0; r < 17; r++) TPL.push(null);
      [
        '0:........kkkkkkkkkkkkkkkkkkkk........',
        '0:.......kHHHHHHHHHHHHHHHHHHHHk.......',
        '0:.......khhhhhhhhhLhhhhhhhhhhk.......',
        '0:.......kHhhhhhhhhhhhhhhhhHhHkk......',
        '0:.......kHHhhhhshhlhhHHHHHshhHH......',
        '0:.......kHHsHHHHHlllHsssssHHdkk......',
        '0:.......kHlssffffssssffffssdHk.......',
        '0:.......khlsfeeesfssfeeesfsddk.......',
        '0:.......kffsfgeisffffgeisfsffk.......',
        '0:.......kllsfgiisfssfgiisfsddk.......',
        '0:.......kllsfssssfssfssssfsddk.......',
        '0:........kllsffffsddsffffsddk........',
        '0:.........kllssssmssmssssddk.........',
        '0:..........kllssssmmssdsddk..........',
        '0:...........kddddddddddddk...........',
        '0:............kkddddddddkk............',
        '0:..............kddddddk..............',
        '0:..............kddddddk..............',
        '0:..............kddddddk..............',
        '0:.............kyWWyyyYYk.............',
        '0:.........kTtyWWyyyyyyYYYtuk.........',
        '0:.......kTTTttYyyyyyyyYYtttuuk.......',
        '0:.......kTttuTTtttttyyYttutuuk.......',
        '0:.......kTttuTTtttttyWYtuutuuk.......',
        '0:.......kTttuTTtttttyyYtuutuuk.......',
        '0:.......kTttuTTtttttyWYtuutuuk.......',
        '0:.......kpppuTTtttttyyYtuupppk.......',
        '0:.......klsskTTtttttYYYtuksssk.......',
        '0:.......kssdkTTtttttYtYtuksddk.......',
        '0:.......ksddkqqqqqyyqqqQQkdddk.......',
        '0:.......kkkkkTttttttttuuukkkkk.......',
        '0:...........kTttttttttuuuk...........',
        '0:..........kTTttttttttttuuk..........',
        '0:..........kTTtttttttttuuuk..........',
        '0:..........kkkkkkkkkkkkkkkk..........',
        '0:............kuuuk..kuuuk............',
        '0:............kTtuk..kTtuk............',
        '0:............kTtuk..kTtuk............',
        '0:............kTtuk..kTtuk............',
        '0:...........kMMMMMkkMMMMMk...........',
        '0:...........kMBBBNkkMBBBNk...........',
        '0:.........kBBBBBBNkkMBBBBBBk.........',
        '0:.........kkkkkkkkkkkkkkkkkk.........'
      ].forEach((s) => TPL.push(s));
      // behind body: scroll case on the back, staff pole
      const back = [];
      for (r = 30; r <= 50; r++) { back[r] = (r === 30 || r === 50) ? '2:kGGGk' : '2:kzzvk'; }
      // outfit: bright blue robe, white trim, tabard + hex emblem, mantle, gloves
      const O = [];
      O[37] = '10:XR;24:RD';
      O[38] = '8:XXRRR;23:RRRDD';
      const TAB = ['RwXXXXw', 'RwXXXXw', 'RwXwwXw', 'RwwXXww', 'RwwXXww', 'RwXwwXw', 'RwXXXXw'];
      for (r = 39; r <= 45; r++) { O[r] = '12:' + TAB[r - 39] + ';22:DD'; }
      O[39] += ';8:wwwD;24:Dwww';
      O[40] += ';8:XwCD;24:DRDD';
      O[41] += ';8:XCwD;24:DRDD';
      O[42] += ';8:XRRD;24:DRDD';
      O[43] += ';8:wwwD;24:Dwww';
      O[44] += ';8:wwc;25:wwc';
      O[45] += ';8:wcc;20:Y;25:wccc';
      O[46] = '8:ccc;12:wwwwwGGwwwDD;25:ccc';
      O[47] = '12:XRRRRRRRRRDD';
      O[48] = '12:XRRRRXRRRRDD';
      O[49] = '11:XXRRRRXRRRRRDD';
      O[50] = '11:' + rp('w', 14);
      O[52] = '13:DDD;20:DDD';
      for (r = 53; r <= 55; r++) { O[r] = '13:XRD;20:XRD'; }
      O[57] = '14:G;21:G';
      // front: staff with hex-cut ice crystal + charm
      const F = [];
      F[1] = '29:kk';
      F[2] = '28:kCCk';
      F[3] = '27:kCwCck';
      F[4] = '26:kCwCCcck';
      F[5] = '26:kCCwCcck';
      F[6] = '26:kCCCCcck';
      F[7] = '26:kCwCCcck';
      F[8] = '27:kCCCcck';
      F[9] = '28:kCcck';
      F[10] = '29:kk';
      for (r = 11; r <= 58; r++) { F[r] = '29:' + ((r % 6 === 0) ? 'zv' : 'rv') + 'k'; }
      F[59] = '29:kkk';
      F[12] += ';32:a';
      F[13] += ';32:a';
      F[14] += ';32:GG';
      F[15] += ';32:aa';
      // hat: floppy pointed blue hat, white band, feather; brim on row 18
      const hr = (l, rt) => l + ':k' + 'XX' + rp('R', rt - l - 5) + 'DD' + 'k';
      const HT = [];
      HT[0] = '27:kkk';
      HT[1] = '24:kRRDk';
      HT[2] = '22:kXRRk';
      HT[3] = '21:kXRRDk';
      HT[4] = hr(20, 26); HT[5] = hr(19, 26); HT[6] = hr(18, 26); HT[7] = hr(17, 26);
      HT[8] = hr(16, 26); HT[9] = hr(15, 26); HT[10] = hr(14, 26); HT[11] = hr(13, 26);
      HT[12] = hr(12, 27); HT[13] = hr(11, 27); HT[14] = hr(10, 28); HT[15] = hr(9, 28); HT[16] = hr(8, 28);
      HT[17] = '7:k' + rp('w', 17) + 'ccc' + 'k';
      HT[18] = '5:k' + 'XX' + rp('R', 18) + 'DDDD' + 'k';
      HT[7] += ';3:kk';
      HT[8] += ';3:kCk';
      HT[9] += ';3:kcCk';
      HT[10] += ';3:kcCk';
      HT[11] += ';4:kcCCk';
      HT[12] += ';4:kcCk';
      HT[13] += ';4:kcCCk';
      HT[14] += ';6:kcCk';
      HT[15] += ';7:kcCk';
      return {
        W: 36, H: 60, pal: PAL,
        layers: { base: { g: layered([back, TPL, O, F, HT], 36, 60), x: 0, y: 0 } },
        blink: [[12, 24, 3, 3, '#d4a07a'], [20, 24, 3, 3, '#d4a07a']],
        ring: '#6fa8ff', ring2: '#2f7fd6', rune: '#cfe8ff'
      };
    };

    // ---- 2 Wizard (Yelp) ----
    const wizard = () => {
      const W = 36, H = 60;
      const g = mk(W, H);
      const pt = (row, col, s) => put(g, row, col, s);
      let r, c, i;
      // cape layer (behind body), rows 37-58
      for (r = 37; r <= 58; r++) {
        const cl = ({ 37: 9, 38: 7, 39: 6, 40: 6, 41: 5, 42: 5, 43: 5, 44: 4, 45: 4, 46: 4, 47: 3, 48: 3, 49: 3 })[r] || 2;
        const cr = 35 - cl;
        for (c = cl; c <= cr; c++) { g[r][c] = (c === cl || c === cr || r === 58) ? 'D' : 'C'; }
      }
      // embroidered star on cape
      pt(47, 6, 'z'); pt(48, 5, 'zzz'); pt(49, 4, 'zzzzz'); pt(50, 5, 'zzz'); pt(51, 6, 'z');
      pt(52, 31, 'z'); pt(53, 30, 'zzz'); pt(54, 31, 'z');
      const TP = [
        '........kkkkkkkkkkkkkkkkkkkk........',
        '.......kHHHHHHHHHHHHHHHHHHHHk.......',
        '.......khhhhhhhhhLhhhhhhhhhhk.......',
        '.......kHhhhhhhhhhhhhhhhhHhHkk......',
        '.......kHHhhhhshhlhhHHHHHshhHH......',
        '.......kHHsHHHHHlllHsssssHHdkk......',
        '.......kHlssffffssssffffssdHk.......',
        '.......khlsfeeesfssfeeesfsddk.......',
        '.......kffsfgeisffffgeisfsffk.......',
        '.......kllsfgiisfssfgiisfsddk.......',
        '.......kllsfssssfssfssssfsddk.......',
        '........kllsffffsddsffffsddk........',
        '.........kllssssmssmssssddk.........',
        '..........kllssssmmssdsddk..........',
        '...........kddddddddddddk...........',
        '............kkddddddddkk............',
        '..............kddddddk..............',
        '..............kddddddk..............',
        '..............kddddddk..............',
        '.............kyWWyyyYYk.............',
        '.........kTtyWWyyyyyyYYYtuk.........',
        '.......kTTTttYyyyyyyyYYtttuuk.......',
        '.......kTttuTTtttttyyYttutuuk.......',
        '.......kTttuTTtttttyWYtuutuuk.......',
        '.......kTttuTTtttttyyYtuutuuk.......',
        '.......kTttuTTtttttyWYtuutuuk.......',
        '.......kpppuTTtttttyyYtuupppk.......',
        '.......klsskTTtttttYYYtuksssk.......',
        '.......kssdkTTtttttYtYtuksddk.......',
        '.......ksddkqqqqqyyqqqQQkdddk.......',
        '.......kkkkkTttttttttuuukkkkk.......',
        '...........kTttttttttuuuk...........',
        '..........kTTttttttttttuuk..........',
        '..........kTTtttttttttuuuk..........',
        '..........kkkkkkkkkkkkkkkk..........',
        '............kuuuk..kuuuk............',
        '............kTtuk..kTtuk............',
        '............kTtuk..kTtuk............',
        '............kTtuk..kTtuk............',
        '...........kMMMMMkkMMMMMk...........',
        '...........kMBBBNkkMBBBNk...........',
        '.........kBBBBBBNkkMBBBBBBk.........',
        '.........kkkkkkkkkkkkkkkkkk.........'
      ];
      const mp = { t: 'R', T: 'P', u: 'r', p: 'c' };
      for (i = 0; i < TP.length; i++) {
        let trow = '';
        for (c = 0; c < W; c++) { const tc0 = TP[i].charAt(c); trow += (i + 17 >= 37 && mp[tc0]) ? mp[tc0] : tc0; }
        pt(17 + i, 0, trow);
      }
      // hem trim
      for (c = 11; c <= 24; c++) { g[50][c] = (c >= 22) ? 'a' : 'c'; }
      // pauldrons
      pt(38, 8, 'ccc'); pt(38, 25, 'ccc'); pt(39, 8, 'cPRr'); pt(39, 24, 'rRPc'); pt(40, 8, 'cccc'); pt(40, 24, 'cccc');
      // sash with five stars
      for (i = 0; i < 5; i++) { pt(39 + i, 12 + i, 'yc'); }
      pt(44, 17, 'ca');
      // crest brooch
      pt(40, 22, 'cV'); pt(41, 22, 'Vc');
      // belt kit: pouch, red + blue vials, scroll
      pt(47, 12, 'qqq'); pt(48, 12, 'xwx'); pt(49, 12, 'xwx');
      pt(47, 15, 'xx'); pt(48, 15, 'VV'); pt(49, 15, 'Vr');
      pt(47, 18, 'xx'); pt(48, 18, 'bb'); pt(49, 18, 'bj');
      pt(47, 21, 'aca'); pt(48, 21, 'ccc'); pt(49, 21, 'aca');
      // staff at right hand + ribbon
      for (r = 10; r <= 59; r++) { g[r][29] = 'w'; if (r < 38 || r > 47) { g[r][28] = 'x'; } }
      pt(58, 28, 'yy'); pt(59, 28, 'xw');
      pt(44, 29, 'R'); pt(45, 30, 'RP'); pt(46, 30, 'rR'); pt(47, 31, 'rP'); pt(48, 32, 'Rr'); pt(49, 32, 'r');
      // ember crystal
      pt(3, 28, 'kk'); pt(4, 27, 'kFEk'); pt(5, 26, 'kFEEJk'); pt(6, 26, 'kFEEJk'); pt(7, 27, 'kEJk'); pt(8, 28, 'kk'); pt(9, 27, 'yyyy');
      // tall pointed hat rows 0-16, brim row 16 (head template brim below)
      const cone = (row, n) => {
        const s = 18 - (n + 2) / 2;
        const inner = n < 6 ? 'P' + rp('R', n - 2) + 'r' : 'PP' + rp('R', n - 4) + 'rr';
        pt(row, s, 'k' + inner + 'k');
      };
      pt(0, 17, 'kk'); cone(1, 2); cone(2, 4); cone(3, 4); cone(4, 6); cone(5, 6); cone(6, 8); cone(7, 8);
      cone(8, 10); cone(9, 10); cone(10, 12); cone(11, 12); cone(12, 14); cone(13, 14);
      pt(14, 9, 'k' + rp('c', 14) + 'aa' + 'k'); pt(15, 8, 'k' + rp('c', 16) + 'aa' + 'k');
      cone(16, 20);
      // dangling star charm
      pt(17, 6, 'a'); pt(18, 5, 'a'); pt(19, 5, 'y'); pt(20, 4, 'yyy'); pt(21, 5, 'y');
      const pal = {
        k: '#17112a', s: '#d4a07a', d: '#bf8a63', l: '#e2b892', h: '#2b2340', H: '#1f1930', L: '#4a3f66', f: '#2e2a44',
        e: '#1a1426', i: '#3d2f5c', g: '#ffffff', m: '#8a4a3a', y: '#ffd166', Y: '#e0a93a', W: '#fff1c4', q: '#6b5a3a', Q: '#4a3d28',
        B: '#4a3226', M: '#6a4a38', N: '#2e1e18',
        R: '#c8323a', r: '#a3262e', P: '#e0555c', c: '#f1e6cc', a: '#cdbf9f', C: '#7e1d24', D: '#4a1218', z: '#ffd166',
        E: '#ff8a5c', F: '#ffd0a8', J: '#c9532f', w: '#8a5a3a', x: '#5e3a24', V: '#ff4d5e', b: '#4aa3e0', j: '#2f6fa8'
      };
      const layerOf = (row, col, ch) => {
        if (ch === 'C' || ch === 'D' || ch === 'z') return 'cape';
        if (row >= 39 && row <= 45 && col >= 19 && col <= 21 && (ch === 'y' || ch === 'Y' || ch === 'W')) return 'tail';
        return 'base';
      };
      const L = { base: mk(W, H), cape: mk(W, H), tail: mk(W, H) };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const ch = g[y][x];
        if (ch !== '.') L[layerOf(y, x, ch)][y][x] = ch;
      }
      return {
        W: W, H: H, pal: pal,
        layers: { cape: { g: L.cape, x: 0, y: 0 }, base: { g: L.base, x: 0, y: 0 }, tail: { g: L.tail, x: 0, y: 0 } },
        capePivot: [18, 37], tailPivot: [20, 39],
        blink: [[12, 24, 3, 3, '#d4a07a'], [20, 24, 3, 3, '#d4a07a']],
        ring: '#c8323a', ring2: '#a3262e', rune: '#e0555c'
      };
    };

    // ---- 3 Archmage (Roblox) ----
    const archmage = () => {
      const W = 36, H = 60;
      const PAL = {
        k: '#17112a', s: '#d4a07a', d: '#bf8a63', l: '#e2b892',
        h: '#2b2340', H: '#1f1930', L: '#4a3f66', f: '#2e2a44', e: '#1a1426', i: '#3d2f5c', g: '#ffffff', m: '#8a4a3a',
        r: '#2b2b2e', R: '#1e1e21', x: '#45454c', S: '#c9ccd3', Z: '#8f939c', V: '#eef0f5', a: '#5b5e68', n: '#3a3a40', b: '#14141a',
        y: '#ffd166', Y: '#e0a93a', W: '#fff1c4', o: '#17112a'
      };
      const Pt =(g, x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
      const Rc = (g, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) Pt(g, x, y, c); };
      const El = (g, cx, cy, rx, ry, c) => {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const dx = (x - cx) / rx, dy = (y - cy) / ry;
          if (dx * dx + dy * dy <= 1) g[y][x] = c;
        }
      };
      const outl = (g) => {
        const add = [];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (g[y][x] !== '.') continue;
          const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
          for (let k = 0; k < 4; k++) {
            const nx = nb[k][0], ny = nb[k][1];
            if (nx >= 0 && nx < W && ny >= 0 && ny < H && g[ny][nx] !== '.' && g[ny][nx] !== 'o') { add.push([x, y]); break; }
          }
        }
        for (let i = 0; i < add.length; i++) g[add[i][1]][add[i][0]] = 'o';
      };
      const TPL = [];
      for (let te = 0; te < 17; te++) TPL.push('....................................');
      [
        "........kkkkkkkkkkkkkkkkkkkk........",
        ".......kHHHHHHHHHHHHHHHHHHHHk.......",
        ".......khhhhhhhhhLhhhhhhhhhhk.......",
        ".......kHhhhhhhhhhhhhhhhhHhHkk......",
        ".......kHHhhhhshhlhhHHHHHshhHH......",
        ".......kHHsHHHHHlllHsssssHHdkk......",
        ".......kHlssffffssssffffssdHk.......",
        ".......khlsfeeesfssfeeesfsddk.......",
        ".......kffsfgeisffffgeisfsffk.......",
        ".......kllsfgiisfssfgiisfsddk.......",
        ".......kllsfssssfssfssssfsddk.......",
        "........kllsffffsddsffffsddk........",
        ".........kllssssmssmssssddk.........",
        "..........kllssssmmssdsddk..........",
        "...........kddddddddddddk...........",
        "............kkddddddddkk............",
        "..............kddddddk..............",
        "..............kddddddk..............",
        "..............kddddddk..............",
        ".............kyWWyyyYYk.............",
        ".........kTtyWWyyyyyyYYYtuk.........",
        ".......kTTTttYyyyyyyyYYtttuuk.......",
        ".......kTttuTTtttttyyYttutuuk.......",
        ".......kTttuTTtttttyWYtuutuuk.......",
        ".......kTttuTTtttttyyYtuutuuk.......",
        ".......kTttuTTtttttyWYtuutuuk.......",
        ".......kpppuTTtttttyyYtuupppk.......",
        ".......klsskTTtttttYYYtuksssk.......",
        ".......kssdkTTtttttYtYtuksddk.......",
        ".......ksddkqqqqqyyqqqQQkdddk.......",
        ".......kkkkkTttttttttuuukkkkk.......",
        "...........kTttttttttuuuk...........",
        "..........kTTttttttttttuuk..........",
        "..........kTTtttttttttuuuk..........",
        "..........kkkkkkkkkkkkkkkk..........",
        "............kuuuk..kuuuk............",
        "............kTtuk..kTtuk............",
        "............kTtuk..kTtuk............",
        "............kTtuk..kTtuk............",
        "...........kMMMMMkkMMMMMk...........",
        "...........kMBBBNkkMBBBNk...........",
        ".........kBBBBBBNkkMBBBBBBk.........",
        ".........kkkkkkkkkkkkkkkkkk........."
      ].forEach((s) => TPL.push(s));
      const b = mk(W, H);
      for (let ty = 0; ty < 60; ty++) for (let tx0 = 0; tx0 < 36; tx0++) {
        const tc = TPL[ty].charAt(tx0);
        if (tc !== '.') b[ty][tx0] = tc;
      }
      // recolor outfit (rows 37-59) to obsidian robe; head rows <=35 and scarf untouched
      const CM = { t: 'r', T: 'x', u: 'R', p: 'S', q: 'R', Q: 'R', B: 'r', M: 'n', N: 'b' };
      for (let oy2 = 37; oy2 < 60; oy2++) for (let ox2 = 0; ox2 < 36; ox2++) if (CM[b[oy2][ox2]]) b[oy2][ox2] = CM[b[oy2][ox2]];
      // gauntlets on hands (same silhouette)
      const GM = { l: 'S', s: 'Z', d: 'n' };
      for (let gy = 44; gy <= 46; gy++) for (let gx2 = 0; gx2 < 36; gx2++) if ((gx2 >= 8 && gx2 <= 10) || (gx2 >= 25 && gx2 <= 27)) if (GM[b[gy][gx2]]) b[gy][gx2] = GM[b[gy][gx2]];
      Rc(b, 8, 43, 10, 43, 'S'); Rc(b, 25, 43, 27, 43, 'S');
      // mantle silver trim (row 41) + block emblem brooch
      for (let mx2 = 8; mx2 <= 27; mx2++) if ('rxR'.indexOf(b[41][mx2]) >= 0) b[41][mx2] = (mx2 % 2) ? 'S' : 'Z';
      Rc(b, 13, 42, 15, 44, 'S'); Pt(b, 14, 43, 'k'); Pt(b, 13, 42, 'V'); Pt(b, 15, 44, 'Z');
      // charcoal/silver crest brooch on robe
      Rc(b, 13, 47, 16, 49, 'S'); Rc(b, 14, 48, 15, 48, 'n'); Pt(b, 14, 48, 'V'); Pt(b, 16, 49, 'Z');
      // embroidery + hem trim
      for (let hx = 8; hx <= 27; hx++) if ('rxR'.indexOf(b[50][hx]) >= 0) b[50][hx] = (hx % 2) ? 'Z' : 'S';
      for (let ey = 43; ey <= 49; ey += 3) { Pt(b, 22, ey, 'S'); Pt(b, 9, ey, 'Z'); }
      // staff: pole slants up-right from right grip (26,45); orb at top
      for (let sy = 29; sy <= 57; sy++) {
        const sxp = sy <= 45 ? 26 + Math.round((45 - sy) * 0.4) : 26;
        if (b[sy][sxp] === '.') b[sy][sxp] = 'a';
        if (b[sy][sxp + 1] === '.') b[sy][sxp + 1] = 'Z';
      }
      for (let sr = 36; sr <= 44; sr += 4) { const sxr = 26 + Math.round((45 - sr) * 0.4); if (b[sr][sxr] === 'a' || b[sr][sxr] === '.') b[sr][sxr] = 'S'; }
      Rc(b, 30, 29, 34, 29, 'S'); Pt(b, 30, 28, 'S'); Pt(b, 34, 28, 'S');
      El(b, 32, 26, 2.8, 2.8, 'V');
      for (let oy3 = 20; oy3 < 32; oy3++) for (let ox3 = 28; ox3 < 36; ox3++) if (b[oy3][ox3] === 'V' && (ox3 - 32) + (oy3 - 26) >= 2) b[oy3][ox3] = 'S';
      Pt(b, 31, 25, 'g');
      // tall bent charcoal hat (rows 0-18, brim on row 18)
      const hatC = {};
      for (let t = 0; t <= 16; t++) {
        const hy = 17 - t, half = Math.max(3, Math.round(9 - t * 0.5));
        const cx = 17.5 + (t > 9 ? (t - 9) : 0);
        const hx0 = Math.round(cx - half), hx1 = Math.round(cx + half) - 1;
        hatC[hy] = cx;
        Rc(b, hx0, hy, hx1, hy, 'r');
        Rc(b, hx0 + 1, hy, Math.min(hx0 + 2, hx1 - 1), hy, 'x');
        Pt(b, hx1 - 1, hy, 'R');
        Pt(b, hx0, hy, 'k'); Pt(b, hx1, hy, 'k');
        if (t === 16) Rc(b, hx0, hy, hx1, hy, 'k');
      }
      for (let bx = 8; bx <= 27; bx++) b[18][bx] = (bx < 13) ? 'x' : 'R';
      Pt(b, 7, 18, 'k'); Pt(b, 28, 18, 'k');
      // silver band + crescent pin
      for (let by2 = 13; by2 <= 14; by2++) {
        const bc = hatC[by2], bh = Math.max(3, Math.round(9 - (17 - by2) * 0.5));
        for (let bxx = Math.round(bc - bh) + 1; bxx <= Math.round(bc + bh) - 2; bxx++) b[by2][bxx] = 'S';
      }
      const pc = Math.round(hatC[13]);
      Pt(b, pc - 1, 12, 'V'); Pt(b, pc - 2, 13, 'V'); Pt(b, pc - 2, 14, 'V'); Pt(b, pc - 1, 15, 'V'); Pt(b, pc, 13, 'Z'); Pt(b, pc, 14, 'Z');
      // short hanging chain from brim (left of head)
      Pt(b, 5, 19, 'S'); Pt(b, 5, 20, 'Z'); Pt(b, 4, 21, 'S'); Pt(b, 5, 22, 'Z'); Pt(b, 5, 23, 'S'); Pt(b, 5, 24, 'V');
      // cape with silver lining, behind body (cols 2-33)
      const cape = mk(W, H);
      for (let cy = 37; cy <= 58; cy++) {
        const chw = Math.min(16, Math.round(11 + (cy - 37) * 0.25)), cx0 = 18 - chw, cx1 = 17 + chw;
        Rc(cape, cx0, cy, cx1, cy, 'R');
        for (let cxx = cx0 + 3; cxx <= cx1 - 3; cxx++) if ((cxx - cx0) % 6 === 3) Pt(cape, cxx, cy, 'r');
        Pt(cape, cx0, cy, 'S'); Pt(cape, cx0 + 1, cy, 'S'); Pt(cape, cx1, cy, 'S'); Pt(cape, cx1 - 1, cy, 'S');
        if (cy === 58) for (let cxh = cx0; cxh <= cx1; cxh++) Pt(cape, cxh, cy, (cxh % 2) ? 'S' : 'Z');
      }
      outl(cape);
      return {
        W: W, H: H, pal: PAL,
        layers: { cape: { g: cape, x: 0, y: 0 }, base: { g: b, x: 0, y: 0 } },
        capePivot: [18, 37],
        blink: [[12, 24, 3, 3, '#d4a07a'], [20, 24, 3, 3, '#d4a07a']],
        ring: '#c9ccd3', ring2: '#8f939c', rune: '#eef0f5'
      };
    };

    this.memo.v2s = [apprentice(), mage(), wizard(), archmage()];
    return this.memo.v2s;
  }

  // Box placement for the v2 sprites: one pixel size (1.25px, 36x60 grid = 45x75) for every tier, centred in the 56x72 hero box, feet on the bottom edge
  v2Box(tier) {
    const S = this.v2Sprites()[tier], P = 1.25;
    return { P: P, W: S.W, H: S.H, ox: (56 - S.W * P) / 2, oy: 72 - S.H * P };
  }

  // Head-and-shoulders window (portraits): same template rows for all tiers (grid row 4 at the top edge, head rows 14-35, shoulders row 38+)
  v2Pose(tier, pose) {
    const key = tier + 'p' + pose;
    if (!this.memo.v2p) this.memo.v2p = {};
    if (this.memo.v2p[key]) return this.memo.v2p[key];
    const S = this.v2Sprites()[tier], src = S.layers.base.g;
    const g = src.map((r) => r.slice());
    // MapleStory-style: K = back leg kicked up 3 rows and angled backward (boot rows slide 1px further back per row down, sole points back), F = planted foot 1px forward,
    // Z = unchanged, U = boot lifted 2 rows, T(sx) = tuck. Only lower-leg + boot rows 54-59 are redrawn; hem/robe rows above stay fixed.
    const K = (y) => y < 56 ? [y === 55 ? -1 : 0, 0] : [-(1 + (y - 56)), -3];
    const F = () => [1, 0], Z = () => [0, 0], U = (y) => [0, y >= 56 ? -2 : 0], T = (sx) => (y) => [sx, y >= 56 ? -2 : 0];
    const spec = [null, [K, F], [Z, Z], [F, K], [Z, Z], [T(-1), T(1)], [Z, U], [U, Z]][pose];
    const R0 = 54, R1 = 59, C1 = 26, MID = 17;
    for (let y = R0; y <= R1; y++) for (let x = 0; x <= C1; x++) g[y][x] = '.';
    const draw = (x0, x1, f) => {
      for (let y = R0; y <= R1; y++) for (let x = x0; x <= x1; x++) {
        const ch = src[y][x];
        if (ch === '.') continue;
        const d = f(y), ty = y + d[1], tx = x + d[0];
        if (ty >= R0 && tx >= 0 && tx <= C1 + 1) g[ty][tx] = ch;
      }
    };
    const legs = [[0, MID, spec[0]], [MID + 1, C1, spec[1]]];
    if (spec[1] === K) legs.reverse();
    legs.forEach((l) => draw(l[0], l[1], l[2]));
    this.memo.v2p[key] = g;
    return g;
  }

  v2Runs(tier, name, pose) {
    const key = tier + name + (pose || 0);
    if (!this.memo.v2r) this.memo.v2r = {};
    if (this.memo.v2r[key]) return this.memo.v2r[key];
    const S = this.v2Sprites()[tier], Ly = (name === 'base' && pose) ? { g: this.v2Pose(tier, pose), x: 0, y: 0 } : S.layers[name], out = [];
    S.pal;
    for (let y = 0; y < Ly.g.length; y++) {
      const row = Ly.g[y];
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (ch === '.') { x++; continue; }
        let e = x;
        while (e + 1 < row.length && row[e + 1] === ch) e++;
        out.push({ x: x + Ly.x, y: y + Ly.y, w: e - x + 1, c: S.pal[ch] });
        x = e + 1;
      }
    }
    this.memo.v2r[key] = out;
    return out;
  }

  // Player parts in the 56x72 box (v2 grids at 1.3px/pixel). fx adds the aura: rune circle, floating spellbook, particles, blink, tail drift (and Archmage wings + orbiting cubes).
  npcSprites() {
    return [{"rows":["....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................",".........kkkkkkkkkkkkkkkkkk.........",".......kCCCCCCcccggccccccccck.......",".....kCCCCCCcccccgJgggggggggggk.....",".....kcccccccccccccccccccccccgk.....",".......kkkkkkkkkkkkkkkkkkkkkkgk.....","..........kCCcccccccccccck...gGk....",".........kCCcccccccccccccck..gGk....","........kCCcccccccccccccccck.gGk....","........kCCcccccccccccccccck.gGk....",".......kGgJggggJggggJggggJggkgGk....",".......kwwwddddddddddddddvwwkgGk....",".......kwwwssssssssssssssvwwkgGgGk..",".......kwwvlsssssssssssssvwwkgkgGk..",".......kwwvlsssssssssssssvwwkkGkGk..",".......kwwvvwwwvsssvwwwvsvwwk.......",".......kwwsJgggssssJgggssdwwk.......",".......kgGsgeeegggggeeeggggwk.......",".......kwwsgxiigssdgxiigsdwwk.......",".......kwwsgsixgsddgsisgsdwwk.......","........kwwwwvsswwwwsvwwwvvk........","........kwwwwwwwvwwvwwwwwwwk........","........kwwvwwwwwwwwwwwwvwvk........","........kwwwvwwvmmmmvwwvwvvk........","........kwwwwwwwwwwwwwvwwvvk........",".........kwwvwwvwwwwwwwwvvk.........","..........kwwwvwwwwvwwVvvk..........","...........kwvwwVwwwwvvvk...........","............kwwwvwwwvVvk............","............kkwwwVvvvvkk............",".........knnngkwvvvVvkGnnnk.........","......kAnnnnnngkwvwwkGnnnnnNNk......","......kAAnNnnnngkwvkGnnnnAnNNk......","......kAAnNNnnnnggGGnnnnNAnNNk......","......kAAnNNnnnnngGnnnnnNAnNNk......","......kAAnNNnnnnngGnnnnnNAnNNk......","......kAAnNNnnnnnJGnnnnnNAkkkkkkkkk.","......kAAnNNnnnnngGnnnnkAAAAAkbggPk.","......kAAnNNnnnnnJGnnnnkGggGGkbbpPk.","......kGgggkGGGGGGGGGGkkkssskGGGGPk.","......kkGJgkJgggggggggggksssdkbbpPk.",".....kkssdkkgggggGGGkgJgkllsdkgJgPk.",".....kksssdkGGGGGGGGkgGGGkkkkgGgGPk.",".....kklssdkAnNnngGnkgGgGGkBObgJgPk.",".....kAkkkknAnNnnJGnkgGkgGkBObGGpPk.",".....kAAANnnAnNnngGnkgGkgGkBObbbpPk.","....kAAnANnnAnNnnJGnnkJGkJkBgbbbgPk.","....kAAnnNnnAnNnngGnnkgGkgkBggbggPk.","....kgggJgggJgggJgggJgggJgkkkkkkkkk.","....kGgGGgGGgGGgGGgGGgGGgGGgGGgk....","....kkkkkkkkkkkkkkkkkkkkkkkkkkkk....","........kZZzzzzzk..kZZzzzzzk........","........kkkkkkkkkk.kkkkkkkkkk......."],"pal":{"k":"#141a30","s":"#e8b896","d":"#cf9a74","l":"#f3cfae","w":"#f2f2f6","v":"#bcc0d0","V":"#8d92aa","g":"#f2b632","G":"#b9821c","J":"#ffe08a","n":"#1d3a6b","N":"#14284a","A":"#2f5596","c":"#0f1a33","C":"#243a66","e":"#1a1426","i":"#3a5a8a","x":"#ffffff","m":"#8a4a3a","b":"#6b3f22","B":"#4a2a16","O":"#8a5a34","P":"#e8dcc0","p":"#bfae88","z":"#3a2a22","Z":"#5a4234"}},{"rows":["....................................","....................................","..............................kk....",".............................kwVk...","............................kwVUEk..","...........................kwVVUUEk.","...........................kwVwUUEk.","...........................kVVUUEEk.","...........................kVVUUEEk.","...........................kVUUEEEk.",".......kkkk.................kVUUEk..","......kLLZhk.................kUEk...",".....kLZhhhhk.................kk....","....kLZhhhhhk................kSXk...","....khZhhhHHhk...............kSXk...","....khhZhhHHhk...............kSXk...","....khhZhhHHk................kSXk...","....khhZkkkkkkkkkkkkkkkkkkkk.kSXk...","...khhZkkHhhhhhhhLLhhhhhhHkHkkSXk...","..khhZhkHhhhhhhhhLLhhhhhhhHkkkSXk...","..khhZhkhhhhhhhhhLLZhhhhhHHkkkSXk...","..khhZhkHhhhhhhhhhhZhhhHHsskHkSXk...","..khZhhkHhhhhhhhhhhhhHHHsssdkkSXk...",".khLZhhkHhLHHHHssssHHHHsssddkkSXk...",".khLZhhkHhHeeeessssseeeessddkkSXk...",".khLZhhkHhLsgiisssssgiissssskkSXk...",".khLZhhkHhHsiiisssssiiisssddkkSXk...",".khhZhHkHhLsrrssssssssrrssddkkSXk...",".khhZhHkkhHssssssddssssssddk.kSXk...",".khhZhHk.kllsssmsdssmsssddk..kSXk...",".khhZhHk..kllsssmmmmsdsddk...kSXk...","..khhZhk...kddddddddddddk....kSXk...","..khhHk.....kkddddddddkk.....kSXk...","...khHk.......kddddddk.......kSXk...","...kkk........kddddddk.......kSXk...","..............kddddddk.......kSXk...","..........kcCkwwwwwwWWk......kSXk...",".........kcCCDwwwwwwwWWWAak..kSXk...","....kcwkkcCCCDwwwwwwwWWAAAaakkSXk...","...kDwwkckwwwkAAAAAwwWAAaAaakkSXk...","..kcDwwkcAAaccAAAAAwwWAaaAaakkSXk...","..kcDwwkcAAaccAAAAAwwWAaaAaakkSXk...","..kcDwwkcAAaccAAAAAwwWAaaAaakkSXk...","..kcDwwkwwwaccAAAAAwwWAaawwwkkSXk...","..kcDwwkFGGkccAAAAAWWWAakFGGGGGRk...","..kcDwwkGGRkccAAAyyWAWAakGGRGGGRk...","..kcDwwksddkqqqqyJYyqqQQkddddGGRk...","...kDwwkkkkkcAAAAYYkFFPkkkkkkkSXk...","...kDww....kcAAAAAAkFPRkk....kSXk...","...kDww...kccAAAAAAkPRRkak...kSXk...","...kDwww..kcwwwwwwwwwwwWak...kSXk...","...kDwww..kkkkkkkkkkkkkkkk...kSXk...","...kkkkk....koook..koook.....kSXk...","............kwwWk..kwwWk.....kSXk...","............kMBNk..kMBNk.....kSXk...","............kMBNk..kMBNk.....kSXk...","...........kMMMMMkkMMMMMk....kSXk...","...........kMBBBNkkMBBBNk....kSXk...",".........kBBBBBBNkkMBBBBBBk..kSXk...",".........kkkkkkkkkkkkkkkkkk..kkkk..."],"pal":{"k":"#17112a","s":"#f3d0b0","d":"#d9a888","l":"#fbe4cd","h":"#7a4a2a","H":"#55321c","L":"#b57a48","Z":"#e0a868","e":"#2a1a22","i":"#3f8aa8","g":"#ffffff","m":"#b5524a","r":"#efa898","A":"#2f7fd6","a":"#2566b0","c":"#6fa8ff","w":"#f4f8ff","W":"#c4d3ec","q":"#6b4a2a","Q":"#45301a","y":"#e8c25a","Y":"#b08a30","J":"#fff3c0","C":"#2a6cc0","D":"#1c4f8f","B":"#5a3a28","M":"#7a5238","N":"#35221a","o":"#1c2650","P":"#8a5a32","R":"#6a4426","F":"#b07a48","G":"#8a5a32","S":"#8a6a44","X":"#5e4528","V":"#cfe8ff","U":"#9cc9f5","E":"#3a78c0"}},{"rows":["....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","........kkkkkkkkkkkkkkkkkkkk........",".......kHHHHHHHHHHHHHHHHHHHHk.......",".......khhhhhhhLLLLLhhhhhhhhk.......",".......kHhhhLLhhhhhhhhhhhhhHk.......",".......kHHhhhhhhhhhhhhhhhhhHk.......",".......kHHhhhhhhhhssssssssdsk.......",".......kHhhlsshhhhsshhhhsssdk.......",".......kHhhlsseeesssseeesssdk.......",".......kHhhlsswgisssswgisssdk.......",".......kHhhlsswiisssswiisssdk.......",".......kHhlsssssssssdsssssddk.......","........khhhhssssssssssssddk........",".........khhhhsssLhhhhhhhdk.........","..........khhhhhmmmmhhhhhk..........","...........khhLhhhhhhhhHk...........","............kkHhhhhhhHkk............","..............kddddddk..............","..............kdssssdk..............","..............ksssssdk..............",".............kccddddcck.............",".........karrrcddddddcRRRak.........",".......karrrrRRcddddcRRRRRRak..F....",".......karrrRRPrrcCrrRRRRRRak....G..",".......kAaaaaAPrrcCrrRaaaaAAk..qqqq.",".......kPrrRPrrrrcCrrrRRRrRRk.qOEEOq",".......kPrrRPPrrrcCrrrRRRrRRkGqEFFEq",".......kcccRPrrrrcCrrrRRRcCCk.qEFFEq",".......klsskPPrrrcCrrrRRksssk.qOEEOq",".......kssdkccccccccccCCksddk..qqqq.",".......ksddkcZcZcZcZcZCCkdddk...G..F",".......kkkkkCaCaCaCaCaCCkkkkk.......","...........kPPrrrcCrcCRRk...........","..........kPrrrrrcCrcCRRRk..........","..........kPPrrrrcCrcCRRRk..........",".........kPrrPRrrcCrCarRRRk.........","........kPPrrrrrrcCrrrrrRRRk........","........kPrrrrrrrcCrrrrrRRRk........","........kccccccccccccccccCCk........","........kcCCaCCCaCCCaCCCaCCk........","........kkkkkkkkkkkkkkkkkkkk........","............kMBBk..kMBBk............","..........kMMBBBNk.kMMBBBBNk........","..........kkkkkkkk.kkkkkkkkk........"],"pal":{"k":"#24100e","s":"#a8683f","d":"#8f5733","l":"#bd7c50","h":"#1f1a1a","H":"#120e0e","L":"#3a3232","e":"#1a0f0f","i":"#3a2418","w":"#f4ece0","g":"#ffffff","m":"#6e3524","r":"#c8323a","R":"#a3262e","P":"#e0555c","c":"#f1e6cc","C":"#cdbf9f","a":"#e0a93a","A":"#b57d1e","Z":"#f6cf6a","B":"#5a3a28","M":"#7a5238","N":"#35201a","q":"#8a2e1c","O":"#ff8a5c","E":"#ffb27a","F":"#ffe3b8","G":"#c8522f"}},{"rows":["....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","....................................","............kkkkkkkkkkkk............","..........kkzzzzzcccccckk...........","........kzzzzzzzccccccccck..........",".......kzzzzzzcccccccvvcccck........",".......kzzzzcccccccccvVccccCk.......",".......kzzzccccccccccccccCCCCk......",".......kccccccccccccccccCCCCCCk.....",".......kCCCCCCCCCCCCCCCCCCCCk.......",".......khhhhhhhhhLhhhhhhhhhhk.......",".......kHhhhhhhhhhhhhhhhhHhHkk......",".......kHHhhhhshhlhhHHHHHshhHH......",".......kHHsHHHHHlllHHHHHsHHdkk......",".......kHlssffffssssffffssdHk.......",".......khlsfeeesfssfeeesfsddk.......",".......kffsfgeisffffgeisfsffk.......",".......kllsfiiisfssfiiisfsddk.......",".......kllsfssssfssfssssfsddk.......","........kllsffffsddsffffsddk........",".........kllsssmsdssmsssddk.........","..........kllsssmmmmsdsddk..........","...........kddddddddddddk...........","............kkddddddddkk............","..............kddddddk..............","..............kddddddk..............","..............kddddddk..............",".............kyWWyyyYYk.............",".........kTtyWWyyyyyyYYYtuk.........",".......kTTTttYyyyyyyyYYtttuuk.......",".......kTttuTTtttttyyYttutuuk.......",".......kTttuTTtttttyWYtuutuuk.......","kkkkkkkkTttuTTtttttyyYtuutuuk.......","kvvvvvkkTttuTTtttttyWYtuutuuk.......","kvabbAkkpppuTTtttttyyYtuupppk.......","kvabvAkklsskTTtttttYYYtuksssk.......","kvabbAkkssdkTTtttttYtYtuksddk.......","kvabbAkksddkqqqqqyyqqqQQkdddk.......","kvabbAkkkkkkTttttpptuuuukkkkk.......","kvabbAk....kTttttpWtuVuuk...........","kvvvvVk...kTTttttpptuvtuuk..........","kwwwwwk...kTTttttpWtuuVuuk..........","kkkkkkk.kTTtttttttttttvuuuuk........","........kTTttttttttttVttuuuk........","........kTTtttttttuutvtttuuk........","........kTTtttttttuutttttuuk........","........kppppppppuuppppppppk........","........kkkkMMMMMkkMMMMMkkkk........","...........kMBBBNkkMBBBNk...........",".........kBBBBBBNkkMBBBBBBk.........",".........kkkkkkkkkkkkkkkkkk........."],"pal":{"k":"#1d1520","s":"#ecc5a6","d":"#d0a183","l":"#f6dcc4","h":"#8a3b22","H":"#5e2615","L":"#c0693a","f":"#aeb3bd","e":"#1a1426","i":"#5a6b8a","g":"#ffffff","m":"#a0564a","t":"#3a3a40","T":"#4a4a52","u":"#2b2b2e","p":"#c9ccd3","y":"#c9ccd3","Y":"#8e939e","W":"#f1f3f7","q":"#55402c","Q":"#3a2c1e","B":"#26262e","M":"#50505e","N":"#121216","c":"#5a2230","C":"#3e1520","z":"#7a3444","v":"#c9ccd3","V":"#8e939e","b":"#2f4a58","a":"#4a6a7a","A":"#1f3340","w":"#e9e2cf"}}];
  }

  crestRaw(kind) {
    if (!this.memo.crest) this.memo.crest = {};
    if (this.memo.crest[kind]) return this.memo.crest[kind];
    const o = [];
    const a = (l, t, w, h, bg, ex, txt, rib) => o.push({ l: l, t: t, w: w, h: h, bg: bg, ex: ex || '', txt: txt || '', rib: !!rib });
    const SH = 'clip-path:polygon(0 0,100% 0,100% 62%,50% 100%,0 62%);';
    const STAR = 'clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);';
    const HEX = 'clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);';
    const RIB = "clip-path:polygon(0 0,100% 0,94% 50%,100% 100%,0 100%,6% 50%);display:flex;align-items:center;justify-content:center;font-family:'Pixelify Sans',monospace;font-size:9px;font-weight:700;letter-spacing:1px;line-height:1;white-space:nowrap;";
    if (kind === 0) {
      // Golden Bear Crest: stylized bear silhouette in front of a slim bell tower
      const G = '#f2b632', N = '#1d3a6b', T = '#7fa0d8';
      a(0, 0, 100, 100, G, SH); a(5, 5, 90, 89, N, SH);
      a(61, 17, 10, 56, T); a(58, 8, 16, 11, T, 'clip-path:polygon(50% 0,100% 100%,0 100%);');
      a(64, 24, 4, 9, N); a(64, 40, 4, 9, N); a(56, 70, 20, 4, T);
      a(26, 42, 28, 28, G, 'border-radius:42% 42% 18% 18%;');
      a(29, 28, 22, 18, G, 'border-radius:50%;');
      a(27, 25, 8, 8, G, 'border-radius:50%;'); a(45, 25, 8, 8, G, 'border-radius:50%;');
      a(20, 46, 9, 22, G, 'border-radius:40%;'); a(51, 46, 9, 22, G, 'border-radius:40%;');
      a(29, 66, 11, 12, G, 'border-radius:30% 30% 10% 10%;'); a(41, 66, 11, 12, G, 'border-radius:30% 30% 10% 10%;');
      a(34, 34, 3, 3, N, 'border-radius:50%;'); a(43, 34, 3, 3, N, 'border-radius:50%;'); a(37, 38, 6, 5, N, 'border-radius:40%;');
      a(3, 92, 94, 22, G, RIB + 'color:#14284a;', this.ribbon(0), true);
    } else if (kind === 1) {
      // Azure Bastion Crest: abstract hexagon with battlements
      const W = '#e8f1ff', B = '#2f7fd6';
      a(0, 0, 100, 100, W, SH); a(5, 5, 90, 89, B, SH);
      a(27, 13, 10, 8, W); a(45, 13, 10, 8, W); a(63, 13, 10, 8, W);
      a(25, 22, 50, 52, W, HEX); a(31, 29, 38, 38, B, HEX); a(40, 37, 20, 22, W, HEX);
      a(3, 92, 94, 22, '#1f5fa8', RIB + 'color:#ffffff;', this.ribbon(1), true);
    } else if (kind === 2) {
      // Five-Star Crest: an arc of five stars
      const C = '#f6ecd2', R = '#c8323a';
      a(0, 0, 100, 100, C, SH); a(5, 5, 90, 89, R, SH);
      [[12, 38], [28, 26], [43, 22], [58, 26], [73, 38]].forEach((p) => a(p[0], p[1], 15, 15, C, STAR));
      a(30, 62, 40, 4, C); a(40, 70, 20, 3, C);
      a(3, 92, 94, 22, '#8f1f27', RIB + 'color:#f6ecd2;', this.ribbon(2), true);
    } else if (kind === 3) {
      // Obsidian Block Crest: a stack of three isometric blocks
      const S = '#c9ccd3', K = '#2b2b2e';
      a(0, 0, 100, 100, S, SH); a(5, 5, 90, 89, K, SH);
      const cube = (x, y) => {
        a(x, y + 7, 14, 19, '#8d9099', 'clip-path:polygon(0 0,100% 37%,100% 100%,0 63%);');
        a(x + 14, y + 7, 14, 19, '#5b5d63', 'clip-path:polygon(0 37%,100% 0,100% 63%,0 100%);');
        a(x, y, 28, 14, S, 'clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);');
      };
      cube(22, 50); cube(50, 50); cube(36, 28);
      a(3, 92, 94, 22, '#161618', RIB + 'color:#c9ccd3;', this.ribbon(3), true);
    } else {
      // Locked silhouette
      a(0, 0, 100, 100, '#3a3d63', SH); a(5, 5, 90, 89, '#15183a', SH);
      a(0, 24, 100, 44, 'transparent', "display:flex;align-items:center;justify-content:center;font-family:'Pixelify Sans',monospace;font-size:44px;font-weight:700;color:#6c6780;line-height:1;", '?');
    }
    this.memo.crest[kind] = o;
    return o;
  }

  lerpColor(a, b, t) {
    const p = (h) => { const x = h.replace('#', ''); return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)]; };
    const A = p(a), B = p(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }

  bx(x, b, w, h, bg, ex, t) {
    return { s: 'position:absolute;left:' + x + 'px;bottom:' + b + 'px;width:' + w + 'px;height:' + h + 'px;background:' + bg + ';' + (ex || ''), t: t || '' };
  }

  // Isometric-style cube from three flat shaded faces. cols = [top, left, right]; an = extra css (e.g. an animation) applied to every face.
  isoCube(x, yb, W, cols, an) {
    const h = Math.round(W * 0.68), hw = Math.round(W / 2), th = Math.round(W * 0.5);
    return [
      this.bx(x, yb, hw, h, cols[1], 'clip-path:polygon(0 0,100% 37%,100% 100%,0 63%);' + an),
      this.bx(x + hw, yb, hw, h, cols[2], 'clip-path:polygon(0 37%,100% 0,100% 63%,0 100%);' + an),
      this.bx(x, yb + Math.round(W * 0.43), W, th, cols[0], 'clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);' + an)
    ];
  }

  // Static foreground world (ground, scenery, gates, platforms, ladders). Built once per accent.
  world(acc) {
    if (this.memo.world && this.memo.worldAcc === acc) return this.memo.world;
    const M = this.maps(acc);
    const D = (x, b, w, h, bg, ex, t) => this.bx(x, b, w, h, bg, ex, t);
    const px = "font-family:'Pixelify Sans',monospace;";
    const ground = [], decor = [], platforms = [], ladders = [];

    // Ground: one styled run per map, with a 300px transitional strip centred on each gate that steps through 4 intermediate hues
    const SEAM = 150;
    const gStrip = (x0, w, g) => {
      ground.push(D(x0, 0, w, 70, g.body));
      ground.push(D(x0, 16, w, 8, 'transparent', 'background-image:repeating-linear-gradient(90deg,' + g.deco + ' 0px,' + g.deco + ' 12px,transparent 12px,transparent 58px);'));
      ground.push(D(x0, 40, w, 6, 'transparent', 'background-image:repeating-linear-gradient(90deg,transparent 0px,transparent 30px,' + g.deco + ' 30px,' + g.deco + ' 40px,transparent 40px,transparent 90px);'));
      ground.push(D(x0, 70, w, 18, g.top, 'box-shadow:inset 0 -6px 0 ' + g.shade + ';'));
      ground.push(D(x0, 88, w, 6, 'transparent', 'background-image:repeating-linear-gradient(90deg,' + g.top + ' 0px,' + g.top + ' 6px,transparent 6px,transparent 26px);'));
    };
    M.forEach((m, i) => {
      const a0 = i === 0 ? -400 : i * 960 + SEAM;
      const b0 = i === 3 ? 4240 : (i + 1) * 960 - SEAM;
      gStrip(a0, b0 - a0, m.g);
    });
    [960, 1920, 2880].forEach((gx, i) => {
      const A = M[i].g, B = M[i + 1].g;
      for (let k = 0; k < 4; k++) {
        const q = (k + 0.5) / 4;
        gStrip(gx - SEAM + k * (SEAM / 2), SEAM / 2, {
          top: this.lerpColor(A.top, B.top, q), shade: this.lerpColor(A.shade, B.shade, q),
          body: this.lerpColor(A.body, B.body, q), deco: this.lerpColor(A.deco, B.deco, q)
        });
      }
    });
    // Yelp: cobblestone courses (two staggered rows) that fade out into dark blocks before the Roblox gate; Roblox: a silver seam along the walkway
    ground.push(D(1920, 73, 860, 7, 'transparent', 'background-image:repeating-linear-gradient(90deg,#b08f78 0px,#b08f78 18px,transparent 18px,transparent 22px);'));
    ground.push(D(1920, 64, 860, 7, 'transparent', 'background-image:repeating-linear-gradient(90deg,#8a6a58 0px,#8a6a58 18px,transparent 18px,transparent 22px);background-position:11px 0;'));
    ground.push(D(2780, 73, 100, 7, 'transparent', 'opacity:0.5;background-image:repeating-linear-gradient(90deg,#b08f78 0px,#b08f78 18px,transparent 18px,transparent 22px);'));
    ground.push(D(2780, 64, 100, 7, 'transparent', 'opacity:0.5;background-image:repeating-linear-gradient(90deg,#8a6a58 0px,#8a6a58 18px,transparent 18px,transparent 22px);background-position:11px 0;'));
    ground.push(D(2880, 86, 1020, 2, 'rgba(201,204,211,0.5)'));

    // Guild names inlaid in the ground under each map, one stone per letter, in that map's material
    const HEXN = 'clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);';
    const inlay = (name, cx, tile) => {
      const step = 40, x0 = Math.round(cx - (name.length * step - 6) / 2);
      name.split('').forEach((ch, k) => {
        if (ch === ' ') return;
        const st = tile(k);
        decor.push(D(x0 + k * step, 14, 34, 40, st.bg, 'display:flex;align-items:center;justify-content:center;box-sizing:border-box;' + px + 'font-size:22px;font-weight:700;line-height:1;' + st.ex, ch));
      });
    };
    inlay(STAGES[0].org.toUpperCase(), 480, () => ({ bg: '#14284a', ex: 'color:#f2b632;border:2px solid #f2b632;box-shadow:inset 0 -4px 0 #0c1a33;' }));
    inlay(STAGES[1].org.toUpperCase(), 1440, (k) => ({ bg: k % 2 ? '#24508f' : '#1b3d6e', ex: HEXN + 'color:#e8f4ff;text-shadow:0 0 6px rgba(207,232,255,0.8);' }));
    inlay(STAGES[2].org.toUpperCase(), 2400, (k) => ({ bg: k % 2 ? '#c9a68c' : '#b08f78', ex: 'color:#5a1218;border-radius:' + ['10px 7px 12px 8px', '7px 12px 8px 11px', '12px 9px 7px 10px', '8px 11px 10px 7px'][k % 4] + ';box-shadow:inset 0 -4px 0 rgba(90,58,40,0.45);' }));
    inlay(STAGES[3].org.toUpperCase(), 3360, (k) => ({ bg: k % 2 ? '#3a3a40' : '#2b2b2e', ex: 'color:#e8eaf0;box-shadow:inset 0 3px 0 #c9ccd3,inset 3px 0 0 rgba(201,204,211,0.35),inset 0 -3px 0 rgba(0,0,0,0.35);' }));

    // ---- Map 1 · Academy Grounds (UC Berkeley): navy and gold, book stacks, candles, low drifting fog
    decor.push(D(150, 88, 6, 50, '#3a2f4a'), D(214, 88, 6, 50, '#3a2f4a'));
    decor.push(D(138, 124, 96, 50, '#14284a', 'border:4px solid #f2b632;box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#f4f1e8;' + px + 'font-size:13px;font-weight:700;letter-spacing:1px;', 'ACADEMY'));
    [[380, 3], [600, 2], [860, 3]].forEach((b) => {
      decor.push(D(b[0], 88, 40, 10, '#1d3a6b'), D(b[0] + 3, 98, 34, 9, '#4a6fb0'));
      if (b[1] > 2) decor.push(D(b[0] - 2, 107, 38, 8, '#f2b632'));
    });
    [[255, 238], [500, 270], [700, 218], [880, 265], [105, 270], [330, 310]].forEach((c, i) => {
      const an = 'animation:bob 1.4s steps(1) infinite;animation-delay:-' + (i * 0.3).toFixed(1) + 's;';
      decor.push(D(c[0], c[1], 8, 16, '#f4f1e8', an), D(c[0] + 1, c[1] + 16, 6, 8, '#f2b632', 'box-shadow:0 0 0 4px rgba(242,182,50,0.25),0 0 0 9px rgba(242,182,50,0.1);' + an));
    });
    [[20, 92, 340, 14], [330, 108, 420, 10], [640, 90, 300, 14], [150, 130, 300, 8]].forEach((f, i) => {
      decor.push(D(f[0], f[1], f[2], f[3], 'rgba(170,205,240,0.13)', 'animation:fog ' + (16 + i * 5) + 's ease-in-out infinite alternate;animation-delay:-' + (i * 4) + 's;'));
    });

    // ---- Map 2 · Azure Citadel (SAP): steel walls, faintly glowing hex tiles, frosty crystal lamps
    const HEXC = 'clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);';
    for (let k = 0; k < 24; k++) {
      const glow = k % 5 === 0 ? 'animation:twinkle ' + (3 + (k % 3)) + 's steps(1) infinite;animation-delay:-' + (k % 4) + 's;' : '';
      decor.push(D(962 + k * 40, 36, 36, 30, 'rgba(160,205,255,' + (k % 5 === 0 ? 0.3 : 0.14) + ')', HEXC + glow));
      if (k < 23) decor.push(D(982 + k * 40, 14, 36, 30, 'rgba(160,205,255,0.1)', HEXC));
    }
    [40, 330, 900].forEach((x0) => {
      const x = 960 + x0;
      decor.push(D(x, 88, 6, 70, '#24508f'), D(x - 3, 150, 12, 8, '#9fc4ee'), D(x - 7, 158, 20, 20, '#cfe8ff', 'border:3px solid #1b3d6e;box-sizing:border-box;box-shadow:0 0 0 8px rgba(207,232,255,0.2),0 0 0 16px rgba(207,232,255,0.09);'));
    });
    decor.push(D(1417, 88, 6, 46, '#24508f'), D(1376, 112, 88, 20, '#cfe8ff', 'border:2px solid #2f7fd6;box-sizing:border-box;color:#1b3d6e;text-align:center;line-height:16px;' + px + 'font-size:11px;font-weight:700;letter-spacing:1px;', 'CITADEL'));

    // ---- Map 3 · Crimson Grove (Yelp): autumn trees, paper lanterns, bistro string lights
    [[270, '#c8323a'], [600, '#e0603a'], [900, '#e8a23a']].forEach((t) => {
      const x = 1920 + t[0];
      decor.push(D(x, 88, 12, 62, '#5a3a28'), D(x - 34, 134, 80, 56, t[1], 'border-radius:50%;'), D(x - 20, 168, 52, 36, '#c8323a', 'border-radius:50%;'), D(x + 10, 146, 30, 22, '#e8a23a', 'border-radius:50%;opacity:0.9;'));
    });
    [200, 360, 520, 840].forEach((x0, i) => {
      const x = 1920 + x0;
      decor.push(D(x, 88, 4, 64, '#5a3a28'), D(x - 10, 150, 24, 4, '#5a3a28'), D(x - 8, 124, 20, 26, '#e0603a', 'border-radius:6px;box-shadow:0 0 0 5px rgba(224,96,58,0.28),0 0 0 11px rgba(224,96,58,0.12);animation:glowp ' + (1.6 + i * 0.2).toFixed(1) + 's steps(1) infinite;'), D(x - 4, 130, 12, 14, '#ffd98a', 'border-radius:3px;'));
    });
    const bistro = (xa, xb, yb, sag, n) => {
      for (let j = 0; j <= n; j++) {
        const t = j / n, x = xa + (xb - xa) * t, y = yb - sag * 4 * t * (1 - t);
        if (j < n) decor.push(D(Math.round(x + (xb - xa) / n / 2), Math.round(y) - 1, 3, 2, '#5a3a28'));
        decor.push(D(Math.round(x) - 2, Math.round(y) - 6, 5, 7, '#ffd98a', 'box-shadow:0 0 0 3px rgba(255,217,138,0.28);' + (j % 3 === 0 ? 'animation:twinkle ' + (2 + (j % 4)) + 's steps(1) infinite;' : '')));
      }
    };
    decor.push(D(1990, 88, 5, 230, '#5a3a28'), D(2290, 88, 5, 230, '#5a3a28'), D(2700, 88, 5, 230, '#5a3a28'));
    bistro(1992, 2292, 318, 26, 12);
    bistro(2292, 2702, 318, 24, 14);
    decor.push(D(1920 + 450, 88, 6, 46, '#5a3a28'), D(1920 + 410, 112, 90, 20, '#f6ecd2', 'border:2px solid #c8323a;box-sizing:border-box;color:#8f1f27;text-align:center;line-height:16px;' + px + 'font-size:11px;font-weight:700;letter-spacing:1px;', 'GROVE'));

    // ---- Map 4 · Obsidian Spire (Roblox): stacked block pillars with silver edges, floating cubes
    [230, 380].forEach((x0) => {
      const x = 2880 + x0;
      [[34, 0], [28, 22], [22, 44]].forEach((bl, k) => decor.push(D(x - bl[0] / 2, 88 + bl[1], bl[0], 22, k % 2 ? '#3a3a40' : '#2b2b2e', 'box-shadow:inset 0 3px 0 #c9ccd3,inset 3px 0 0 rgba(0,0,0,0.25);')));
      decor.push(D(x - 5, 154, 10, 10, '#e8eaf0', 'box-shadow:0 0 0 5px rgba(232,234,240,0.2),0 0 0 11px rgba(232,234,240,0.09);'));
    });
    this.isoCube(2880 + 640, 88, 28, ['#a9adb6', '#5b5d63', '#3a3a40'], '').forEach((p) => decor.push(p));
    this.isoCube(2880 + 664, 88, 22, ['#8d9099', '#4a4a52', '#2f2f35'], '').forEach((p) => decor.push(p));
    this.isoCube(2880 + 652, 116, 24, ['#c9ccd3', '#6b6d74', '#46464d'], '').forEach((p) => decor.push(p));
    [[260, 250, 26], [520, 310, 22], [860, 236, 28]].forEach((r, i) => {
      this.isoCube(2880 + r[0], r[1], r[2], ['#a9adb6', '#5b5d63', '#3a3a40'], 'animation:drift ' + (11 + i * 2) + 's linear infinite;animation-delay:-' + (i * 3) + 's;').forEach((p) => decor.push(p));
    });

    // ---- Glowing arched portal gates between maps
    [960, 1920, 2880].forEach((xc, i) => {
      const col = M[i + 1].a;
      const label = 'MAP ' + (i + 2) + ' ▸ ' + M[i + 1].name.toUpperCase();
      decor.push(D(xc - 52, 88, 104, 210, 'transparent', 'border:14px solid ' + ['#24508f', '#8f1f27', '#4a4a52'][i] + ';border-bottom:0;border-radius:52px 52px 0 0;box-sizing:border-box;box-shadow:0 0 0 5px ' + this.rgba(col, 0.25) + ',0 0 0 12px ' + this.rgba(col, 0.1) + ';'));
      decor.push(D(xc - 38, 88, 76, 196, this.rgba(col, 0.28), 'border-radius:38px 38px 0 0;animation:glowp 1.4s steps(1) infinite;'));
      decor.push(D(xc - 20, 88, 40, 170, this.rgba(col, 0.35), 'border-radius:20px 20px 0 0;animation:glowp 1.4s steps(1) infinite;animation-delay:-0.7s;'));
      decor.push(D(xc - 9, 292, 18, 14, col));
      decor.push(D(xc - 90, 318, 180, 22, 'rgba(15,18,38,0.92)', 'border:2px solid ' + col + ';box-sizing:border-box;color:#f4f1e8;' + px + 'font-size:11px;font-weight:700;letter-spacing:1px;text-align:center;line-height:18px;white-space:nowrap;', label));
      [-30, -10, 12, 30].forEach((dx, k) => decor.push(D(xc + dx, 100 + k * 18, 4, 4, col, 'animation:rise 2.4s steps(10) infinite;animation-delay:-' + (k * 0.55).toFixed(2) + 's;')));
    });

    // ---- Gate seams: 300px physical strips centred on each gate where the two neighbouring styles mingle
    const HEXS = 'clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);';
    const mote = (x, b, col, kind, i) => decor.push(D(x, b, kind === 'ember' ? 5 : 4, kind === 'ember' ? 5 : 4, col, kind === 'ember'
      ? 'animation:ember ' + (7 + (i % 3)) + 's linear infinite;animation-delay:-' + i + 's;'
      : 'box-shadow:0 0 0 3px ' + this.rgba(col, 0.25) + ';animation:drift ' + (5 + (i % 3)) + 's linear infinite;animation-delay:-' + i + 's;'));

    // Berkeley -> SAP (x = 960): fog thins out, a eucalyptus gives way to the first steel wall, hex tiles creep onto the ground, fireflies mix with frost
    [[780, 96, 150, 6, 0.08], [850, 112, 120, 5, 0.05]].forEach((f, i) => decor.push(D(f[0], f[1], f[2], f[3], 'rgba(170,205,240,' + f[4] + ')', 'animation:fog ' + (22 + i * 6) + 's ease-in-out infinite alternate;animation-delay:-' + (i * 5) + 's;')));
    decor.push(D(770, 88, 10, 150, '#d9d4c4'), D(772, 100, 2, 100, '#9a968a'), D(777, 96, 2, 70, '#b3ae9f'));
    decor.push(D(748, 214, 54, 22, '#9fb5a8', 'border-radius:50%;'), D(756, 230, 40, 18, '#9fb5a8', 'border-radius:50%;'), D(762, 242, 28, 14, '#7e9a8c', 'border-radius:50%;'));
    [[846, 0.07], [884, 0.11], [922, 0.15]].forEach((h) => decor.push(D(h[0], 36, 36, 30, 'rgba(160,205,255,' + h[1] + ')', HEXS)));
    decor.push(D(1016, 88, 56, 96, '#24508f', 'box-shadow:inset 0 3px 0 #9fc4ee,inset 3px 0 0 rgba(0,0,0,0.2);'), D(1016, 184, 56, 8, 'transparent', 'background-image:repeating-linear-gradient(90deg,#24508f 0px,#24508f 9px,transparent 9px,transparent 18px);'), D(1034, 124, 20, 18, 'rgba(207,232,255,0.5)', HEXS));
    [[846, 130, '#f2b632'], [878, 172, '#f2b632'], [910, 150, '#f2b632'], [940, 205, '#f2b632'], [986, 160, '#cfe8ff'], [1030, 215, '#cfe8ff'], [1058, 120, '#cfe8ff'], [1092, 190, '#cfe8ff'], [1002, 138, '#f2b632'], [926, 118, '#cfe8ff']].forEach((p, i) => mote(p[0], p[1], p[2], 'drift', i));

    // SAP -> Yelp (x = 1920): steel wall ends in a vine-wrapped pillar, the first crimson canopy and a paper lantern on the SAP side, frost mixes with embers
    decor.push(D(1756, 88, 54, 110, '#24508f', 'box-shadow:inset 0 3px 0 #9fc4ee,inset 3px 0 0 rgba(0,0,0,0.2);'), D(1756, 198, 54, 8, 'transparent', 'background-image:repeating-linear-gradient(90deg,#24508f 0px,#24508f 9px,transparent 9px,transparent 18px);'), D(1774, 130, 18, 16, 'rgba(207,232,255,0.5)', HEXS));
    decor.push(D(1812, 88, 18, 134, '#1b3d6e', 'box-shadow:inset 0 3px 0 #9fc4ee;'), D(1808, 222, 26, 8, '#9fc4ee'));
    [0, 1, 2, 3, 4].forEach((k) => decor.push(D(1810, 100 + k * 24, 22, 5, '#2f7a4a', 'transform:rotate(' + (k % 2 ? 18 : -18) + 'deg);'), D(1806 + (k % 2) * 26, 106 + k * 24, 6, 6, '#c8323a')));
    decor.push(D(1858, 88, 10, 56, '#5a3a28'), D(1832, 132, 62, 44, '#c8323a', 'border-radius:50%;'), D(1846, 152, 36, 26, '#e0603a', 'border-radius:50%;'));
    decor.push(D(1830, 226, 26, 3, '#5a3a28'), D(1852, 206, 2, 20, '#5a3a28'), D(1844, 184, 18, 22, '#e0603a', 'border-radius:5px;box-shadow:0 0 0 5px rgba(224,96,58,0.28),0 0 0 11px rgba(224,96,58,0.12);animation:glowp 1.8s steps(1) infinite;'), D(1848, 189, 10, 12, '#ffd98a', 'border-radius:3px;'));
    [[1780, 150, '#cfe8ff', 'drift'], [1834, 210, '#cfe8ff', 'drift'], [1886, 120, '#cfe8ff', 'drift'], [1944, 180, '#e0603a', 'ember'], [1985, 140, '#e8a23a', 'ember'], [2024, 210, '#e0603a', 'ember'], [1902, 236, '#e8a23a', 'ember'], [2050, 160, '#cfe8ff', 'drift']].forEach((p, i) => mote(p[0], p[1], p[2], p[3], i));

    // Yelp -> Roblox (x = 2880): cobblestone turns into dark blocks, block stones at the last crimson tree's base, embers meet silver dust, cubes drift over the crimson side
    [[2790, 0.3], [2850, 0.5], [2910, 0.7], [2970, 0.9]].forEach((b) => decor.push(D(b[0], 0, 60, 70, 'rgba(43,43,46,' + b[1] + ')', 'background-image:repeating-linear-gradient(90deg,transparent 0px,transparent 26px,#16161a 26px,#16161a 28px),repeating-linear-gradient(0deg,transparent 0px,transparent 18px,#16161a 18px,#16161a 20px);')));
    decor.push(D(2800, 88, 24, 14, '#3a3a40', 'box-shadow:inset 0 3px 0 #c9ccd3;'), D(2826, 88, 18, 11, '#2b2b2e', 'box-shadow:inset 0 3px 0 #c9ccd3;'), D(2808, 102, 16, 11, '#46464d', 'box-shadow:inset 0 3px 0 #c9ccd3;'));
    [2918, 2956, 2996].forEach((x) => decor.push(D(x, 88, 26, 14, '#3a3a40', 'box-shadow:inset 0 3px 0 #c9ccd3;')));
    this.isoCube(2758, 215, 26, ['#a9adb6', '#5b5d63', '#3a3a40'], 'animation:drift 13s linear infinite;').forEach((p) => decor.push(p));
    this.isoCube(2832, 262, 20, ['#8d9099', '#4a4a52', '#2f2f35'], 'animation:drift 15s linear infinite;animation-delay:-4s;').forEach((p) => decor.push(p));
    [[2776, 140, '#e0603a', 'ember'], [2812, 190, '#e8a23a', 'ember'], [2852, 150, '#e0603a', 'ember'], [2902, 170, '#e8eaf0', 'drift'], [2942, 128, '#e8eaf0', 'drift'], [2984, 200, '#e8eaf0', 'drift'], [3020, 154, '#e8eaf0', 'drift']].forEach((p, i) => mote(p[0], p[1], p[2], p[3], i));

    // ---- The Starlight Portal (talk target with Contact / Plain site)
    const pc = 3640;
    const pa = 'animation:pulse 1.6s steps(1) infinite;';
    decor.push(D(pc - 55, 92, 110, 150, '#c9ccd3', 'border-radius:50%;box-shadow:0 0 0 6px rgba(201,204,211,0.22),0 0 0 14px rgba(255,209,102,0.12);' + pa));
    decor.push(D(pc - 47, 100, 94, 134, '#3a3a40', 'border-radius:50%;' + pa));
    decor.push(D(pc - 39, 108, 78, 118, '#e8eaf0', 'border-radius:50%;' + pa));
    decor.push(D(pc - 29, 118, 58, 98, acc, 'border-radius:50%;' + pa));
    decor.push(D(pc - 21, 126, 42, 82, '#0f0f14', 'border-radius:50%;' + pa));
    decor.push(D(pc - 65, 84, 130, 10, '#3a3a40', 'border:2px solid #c9ccd3;box-sizing:border-box;'));
    [-40, -20, 0, 22, 40, 10].forEach((dx, i) => decor.push(D(pc + dx, 110 + [10, 40, 70, 30, 60, 90][i], 4, 4, i % 2 ? '#e8eaf0' : acc, 'animation:rise 2.4s steps(10) infinite;animation-delay:-' + (i * 0.4).toFixed(1) + 's;')));

    // ---- The sealed gate (next advancement)
    const lc = 3800;
    decor.push(D(lc - 52, 88, 104, 210, '#141417', 'border:14px solid #3a3a40;border-bottom:0;border-radius:52px 52px 0 0;box-sizing:border-box;'));
    decor.push(D(lc - 1, 88, 2, 196, '#3a3a40'), D(lc - 38, 148, 76, 3, '#3a3a40'), D(lc - 38, 208, 76, 3, '#3a3a40'));
    decor.push(D(lc - 8, 182, 16, 16, 'transparent', 'border:4px solid #6c6780;border-bottom:0;border-radius:8px 8px 0 0;box-sizing:border-box;'));
    decor.push(D(lc - 12, 164, 24, 18, '#6c6780'), D(lc - 2, 170, 4, 7, '#141417'));
    decor.push(D(lc - 95, 314, 190, 40, 'rgba(15,15,20,0.94)', 'border:2px solid #4a4a52;box-sizing:border-box;color:#c9c4d8;font-size:11px;line-height:1.3;text-align:center;padding:3px 4px;', 'Next advancement: ??? · Quest in progress'));

    // Platforms, styled per map
    this.platData().forEach((p) => {
      // Platforms inside a gate's 300px seam step their trim palette (4 hues) from the left map's toward the right map's
      let pm = M[p.map].p;
      const pcx = p.x + p.w / 2;
      for (let gi = 0; gi < 3; gi++) {
        const gx = 960 * (gi + 1);
        if (Math.abs(pcx - gx) < SEAM) {
          const q = (Math.floor((pcx - (gx - SEAM)) / (SEAM / 2)) + 0.5) / 4;
          const PA = M[gi].p, PB = M[gi + 1].p;
          pm = { t: this.lerpColor(PA.t, PB.t, q), s: this.lerpColor(PA.s, PB.s, q), b: this.lerpColor(PA.b, PB.b, q), d: this.lerpColor(PA.d, PB.d, q) };
        }
      }
      const A = 'position:absolute;', none = 'display:none;';
      const o = { s: 'position:absolute;left:' + p.x + 'px;bottom:' + (88 + p.top - 26) + 'px;width:' + p.w + 'px;height:26px;', d1: none, d2: none, d3: none };
      if (p.map === 0) {
        o.t = A + 'left:-3px;right:-3px;top:0;height:8px;background:' + pm.t + ';box-shadow:inset 0 -3px 0 ' + pm.s + ';';
        o.b = A + 'left:2px;right:2px;top:8px;height:16px;background:' + pm.b + ';background-image:repeating-linear-gradient(90deg,transparent 0px,transparent 22px,' + pm.d + ' 22px,' + pm.d + ' 24px);';
        o.d1 = A + 'left:12%;top:24px;width:4px;height:12px;background:' + pm.d + ';';
        o.d2 = A + 'right:12%;top:24px;width:4px;height:9px;background:' + pm.d + ';';
      } else if (p.map === 1) {
        // SAP: steel-blue slab, white and light-blue edge lines
        o.t = A + 'left:0;right:0;top:0;height:6px;background:#e8f4ff;box-shadow:inset 0 -2px 0 ' + pm.t + ';';
        o.b = A + 'left:0;right:0;top:6px;height:14px;background:' + pm.b + ';box-shadow:inset 0 -3px 0 ' + pm.s + ';';
        o.d1 = A + 'left:8%;top:11px;width:84%;height:2px;background:' + pm.t + ';opacity:0.7;';
        o.d2 = A + 'left:12%;top:20px;width:5px;height:10px;background:' + pm.d + ';';
        o.d3 = A + 'right:12%;top:20px;width:5px;height:10px;background:' + pm.d + ';';
      } else if (p.map === 2) {
        // Yelp: warm wood planks with a crimson trim and a little paper lantern
        o.t = A + 'left:-2px;right:-2px;top:0;height:7px;background:' + pm.t + ';box-shadow:inset 0 -3px 0 ' + pm.s + ';';
        o.b = A + 'left:2px;right:2px;top:7px;height:17px;background:' + pm.b + ';background-image:repeating-linear-gradient(90deg,transparent 0px,transparent 18px,' + pm.d + ' 18px,' + pm.d + ' 20px);';
        o.d1 = A + 'left:20%;top:24px;width:4px;height:8px;background:' + pm.d + ';';
        o.d2 = A + 'right:14%;top:24px;width:8px;height:10px;background:#e0603a;border-radius:3px;box-shadow:0 0 0 3px rgba(224,96,58,0.3);';
        o.d3 = A + 'left:46%;top:-5px;width:5px;height:5px;background:#e8a23a;';
      } else {
        // Roblox: obsidian blocks with silver edges
        o.t = A + 'left:-2px;right:-2px;top:0;height:6px;background:' + pm.t + ';box-shadow:inset 0 -2px 0 ' + pm.s + ';';
        o.b = A + 'left:2px;right:2px;top:6px;height:18px;background:' + pm.b + ';background-image:repeating-linear-gradient(90deg,transparent 0px,transparent 28px,' + pm.d + ' 28px,' + pm.d + ' 30px);box-shadow:inset 0 -3px 0 ' + pm.s + ';';
        o.d1 = A + 'left:20%;top:12px;width:6px;height:6px;background:' + pm.t + ';';
        o.d2 = A + 'left:50%;top:12px;width:6px;height:6px;background:' + pm.t + ';opacity:0.7;';
        o.d3 = A + 'right:20%;top:12px;width:6px;height:6px;background:' + pm.t + ';opacity:0.5;';
      }
      platforms.push(o);
    });

    // Ladders: steel ladder in the Azure Citadel, wooden ladder in the Crimson Grove
    this.ladderData().forEach((l) => {
      const col = M[l.map].lad;
      ladders.push({ s: 'position:absolute;left:' + l.x + 'px;bottom:88px;width:16px;height:' + (l.top + 8) + 'px;box-sizing:border-box;border-left:2px solid ' + col + ';border-right:2px solid ' + col + ';background-image:repeating-linear-gradient(to top,' + col + ' 0px,' + col + ' 3px,transparent 3px,transparent 12px);' });
    });

    // Guild banners: cloth pennants on poles or hung from platforms, 2-3 per map, in each guild's colors with its crest
    const banners = [];
    const rr = (v) => Math.round(v * 10) / 10;
    const flag = (kind, cx, yt, pole) => {
      const cd = this.credData()[kind];
      const sw = 'clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%);';
      if (pole) banners.push(D(cx - 46, 88, 5, yt - 82, '#5a3d2b'), D(cx - 49, yt + 6, 11, 9, '#c89b5a'));
      else banners.push(D(cx - 30, yt, 2, 7, '#4a3228'), D(cx + 28, yt, 2, 7, '#4a3228'));
      banners.push(D(cx - 34, yt - 96, 68, 96, cd.trim, sw), D(cx - 30, yt - 93, 60, 90, cd.field, sw));
      this.crestRaw(kind).filter((p) => !p.rib).forEach((p) => {
        banners.push(D(rr(cx - 25 + p.l * 0.5), rr(yt - 58 + (100 - p.t - p.h) * 0.5), rr(p.w * 0.5), rr(p.h * 0.5), p.bg, p.ex));
      });
      banners.push(D(cx - 40, yt - 3, 80, 6, '#6b4a3a'));
    };
    [[0, 170, 296, false], [0, 295, 358, false], [1, 1430, 180, true], [1, 1100, 302, false], [2, 2235, 238, true], [2, 2540, 260, false], [3, 3020, 288, false], [3, 3185, 390, false]].forEach((b) => flag(b[0], b[1], b[2], b[3]));

    this.memo.world = { ground: ground, decor: decor, platforms: platforms, ladders: ladders, banners: banners };
    this.memo.worldAcc = acc;
    return this.memo.world;
  }

  // Per-map parallax layers, stars and drifting effects. Built once per map and accent.
  layers(tier, acc) {
    // All four map layer sets are memoized, so cross-fading two of them never rebuilds anything.
    const key = tier + '|' + acc;
    if (!this.memo.layerSets) this.memo.layerSets = {};
    if (this.memo.layerSets[key]) return this.memo.layerSets[key];
    const m = this.maps(acc)[tier];
    const D = (x, b, w, h, bg, ex) => this.bx(x, b, w, h, bg, ex);
    let seed = 11 + tier * 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const hump = (c) => 'clip-path:polygon(' + c + ');';

    // Stars (densest on the observatory map)
    const stars = [];
    const maxTop = tier === 3 ? 60 : 44;
    if (m.day) {
      // Daytime sky (Azure Citadel): a blocky sun with a soft halo, and a few drifting pixel clouds
      stars.push({ s: 'position:absolute;left:78%;top:9%;width:64px;height:64px;background:#fff1a8;border-radius:50%;box-shadow:0 0 0 6px #ffd95a;' });
      [[6, 12, 150], [30, 24, 110], [52, 8, 170], [66, 30, 120], [90, 18, 100]].forEach((c) => {
        const w = c[2], h = Math.round(w * 0.28);
        stars.push({ s: 'position:absolute;left:' + c[0] + '%;top:' + c[1] + '%;width:' + w + 'px;height:' + h + 'px;background:#f4f9ff;border-radius:' + h + 'px;box-shadow:0 4px 0 #d6e8fa;' });
        stars.push({ s: 'position:absolute;left:' + c[0] + '%;top:' + c[1] + '%;margin-left:' + Math.round(w * 0.2) + 'px;margin-top:-' + Math.round(h * 0.6) + 'px;width:' + Math.round(w * 0.45) + 'px;height:' + Math.round(h * 1.2) + 'px;background:#f4f9ff;border-radius:50%;' });
      });
    }
    for (let i = 0; i < m.stars; i++) {
      const big = rnd() > 0.82;
      const sz = big ? 4 : 3;
      const anim = i % 3 === 0 ? 'animation:twinkle ' + (2 + rnd() * 3).toFixed(1) + 's steps(1) infinite;animation-delay:-' + (rnd() * 4).toFixed(1) + 's;' : '';
      stars.push({ s: 'position:absolute;left:' + Math.round(rnd() * 97) + '%;top:' + Math.round(rnd() * maxTop) + '%;width:' + sz + 'px;height:' + sz + 'px;background:' + (big ? m.win : '#f4f1e8') + ';' + anim });
    }

    // Far layer (1700 x 260)
    const far = [];
    const teeth = (x, b, w, col, step) => D(x, b, w, 8, 'transparent', 'background-image:repeating-linear-gradient(90deg,' + col + ' 0px,' + col + ' ' + step + 'px,transparent ' + step + 'px,transparent ' + (step * 2) + 'px);');
    if (tier === 0) {
      // Berkeley: navy hills with a slim campanile (tall square shaft, small open belfry, pointed cap)
      const hs = [70, 110, 85, 120, 60, 100, 80, 115, 65, 105, 90, 125, 75, 110, 70, 100, 85, 120, 65, 95, 80];
      const pts = ['0px 260px'];
      hs.forEach((h, i) => pts.push((i * 85) + 'px ' + (260 - h) + 'px'));
      pts.push('1700px 260px');
      far.push(D(0, 0, 1700, 260, m.far, hump(pts.join(','))));
      const tx = 640;
      far.push(D(tx, 0, 34, 236, m.far), D(tx - 6, 236, 46, 36, m.far), D(tx, 242, 10, 22, '#0b1330'), D(tx + 24, 242, 10, 22, '#0b1330'));
      far.push(D(tx - 9, 272, 52, 48, m.far, 'clip-path:polygon(50% 0,100% 100%,0 100%);'), D(tx + 14, 150, 6, 24, m.win, 'opacity:0.8;'), D(tx + 14, 90, 6, 24, m.win, 'opacity:0.8;'));
    } else if (tier === 1) {
      // SAP: distant steel skyline with crenellated towers and slim spires
      for (let i = 0; i < 14; i++) {
        const h = 90 + ((i * 47) % 5) * 30, x = i * 125;
        far.push(D(x, 0, 100, h, m.far), teeth(x, h, 100, m.far, 10), D(x + 44, h + 8, 12, 44, m.far, 'clip-path:polygon(50% 0,100% 100%,0 100%);'));
      }
    } else if (tier === 2) {
      // Yelp: plum rolling hills and a few distant floating islands
      far.push(D(0, 0, 1700, 60, m.far));
      for (let i = 0; i < 9; i++) {
        far.push(D(i * 200 - 60, 20, 260, 90 + ((i * 13) % 3) * 24, m.far, 'border-radius:50% 50% 0 0;'));
      }
      [[180, 150, 110, 34], [620, 190, 90, 30], [1060, 160, 120, 36], [1420, 200, 90, 30]].forEach((v) => {
        far.push(D(v[0], v[1], v[2], v[3], m.far, 'clip-path:polygon(0 0,100% 0,86% 45%,60% 100%,36% 60%,12% 34%);'));
      });
    } else {
      // Roblox: far skyline of stacked dark blocks with faint silver top edges
      for (let i = 0; i < 15; i++) {
        const h = 70 + ((i * 37) % 5) * 38, x = i * 120;
        far.push(D(x, 0, 104, h, m.far), D(x + 14, h, 76, 26 + (i % 2) * 14, m.far), D(x, h - 2, 104, 2, 'rgba(201,204,211,0.22)'));
      }
    }

    // Mid layer (2400 x 300)
    const mid = [];
    const cren = (x, b, w, col, step) => D(x, b, w, 8, 'transparent', 'background-image:repeating-linear-gradient(90deg,' + col + ' 0px,' + col + ' ' + step + 'px,transparent ' + step + 'px,transparent ' + (step * 2) + 'px);');
    if (tier === 0) {
      // Academy: deep-navy stone halls with gold-lit windows, a slim campanile, and a eucalyptus grove
      for (let k = 0; k < 4; k++) {
        const x = 60 + k * 380, th = 150 + (k % 2) * 34;
        mid.push(D(x + 40, 0, 140, 110, m.mid), cren(x + 40, 110, 140, m.mid, 10));
        mid.push(D(x + 8, 0, 46, th, m.mid), cren(x + 8, th, 46, m.mid, 9));
        mid.push(D(x + 166, 0, 46, th, m.mid), cren(x + 166, th, 46, m.mid, 9));
        mid.push(D(x + 82, 0, 56, 150, m.midHi), D(x + 76, 150, 68, 44, m.midHi, 'clip-path:polygon(50% 0,100% 100%,0 100%);'));
        mid.push(D(x + 109, 192, 2, 16, m.mid), D(x + 111, 200, 10, 6, '#f2b632'));
        mid.push(D(x + 105, 96, 10, 14, m.win), D(x + 24, th - 60, 8, 12, m.win), D(x + 188, th - 60, 8, 12, m.win), D(x + 100, 30, 20, 30, m.win, 'border-radius:10px 10px 0 0;'));
        mid.push(D(x + 24, 40, 8, 12, m.win), D(x + 188, 40, 8, 12, m.win), D(x + 60, 60, 8, 12, m.win), D(x + 150, 60, 8, 12, m.win));
      }
      // campanile (original generic shape): tall square shaft, small open belfry, pointed cap
      const cx0 = 712;
      mid.push(D(cx0, 0, 40, 270, '#243f78'), D(cx0 - 7, 270, 54, 40, '#243f78'), D(cx0 - 7, 308, 54, 4, '#f2b632'));
      mid.push(D(cx0 + 2, 276, 12, 26, '#0b1330'), D(cx0 + 26, 276, 12, 26, '#0b1330'), D(cx0 - 10, 312, 60, 52, '#243f78', 'clip-path:polygon(50% 0,100% 100%,0 100%);'));
      mid.push(D(cx0 + 17, 190, 6, 28, m.win), D(cx0 + 17, 130, 6, 28, m.win), D(cx0 + 17, 70, 6, 28, m.win));
      // eucalyptus grove: tall pale bark with grey streaks, silvery sage leaves
      [20, 300, 350, 400, 672, 800, 1060, 1115, 1170, 1440, 1500].forEach((tx, i) => {
        const th = 190 + ((i * 29) % 4) * 22;
        mid.push(D(tx, 0, 11, th, '#d9d4c4', 'opacity:0.72;'), D(tx + 2, 20, 2, th - 60, '#9a968a', 'opacity:0.7;'), D(tx + 7, 6, 2, th - 90, '#b3ae9f', 'opacity:0.7;'));
        mid.push(D(tx - 22, th - 8, 54, 24, '#9fb5a8', 'border-radius:50%;opacity:0.85;'), D(tx - 12, th + 10, 40, 20, '#9fb5a8', 'border-radius:50%;opacity:0.85;'), D(tx - 2, th + 22, 30, 16, '#7e9a8c', 'border-radius:50%;opacity:0.85;'));
      });
    } else if (tier === 1) {
      // Azure Citadel: blue-steel towers and walls, faint glowing hex panels, frosty crystal lamps
      const HEXM = 'clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);';
      for (let k = 0; k < 8; k++) {
        const x = 40 + k * 250, th = 190 + ((k * 37) % 3) * 40;
        mid.push(D(x + 90, 0, 160, 110, m.mid), cren(x + 90, 110, 160, m.mid, 10));
        [0, 1, 2, 3].forEach((j) => mid.push(D(x + 108 + j * 36, 28 + (j % 2) * 24, 30, 26, 'rgba(160,205,255,0.16)', HEXM)));
        mid.push(D(x, 0, 90, th, m.midHi), cren(x, th, 90, m.midHi, 11));
        mid.push(D(x + 36, th - 70, 18, 36, m.win, 'border-radius:9px 9px 0 0;opacity:0.85;'), D(x + 12, th - 120, 8, 14, m.win, 'opacity:0.8;'), D(x + 70, th - 120, 8, 14, m.win, 'opacity:0.8;'));
        mid.push(D(x + 42, th + 8, 6, 14, m.mid), D(x + 38, th + 22, 14, 14, '#cfe8ff', 'border-radius:50%;box-shadow:0 0 0 5px rgba(207,232,255,0.2),0 0 0 11px rgba(207,232,255,0.08);'));
      }
    } else if (tier === 2) {
      // Crimson Grove: oval autumn canopies (crimson, red-orange, amber), paper lanterns, floating islands with crimson-leaf tops
      const cols = ['#a82a33', '#c4512f', '#c98f30'];
      for (let i = 0; i < 20; i++) {
        const x = 590 + i * 88 + ((i * 7) % 3) * 12, rw = 34 + ((i * 13) % 5) * 7, w = 2 * rw, hh = Math.round(w * 0.78);
        mid.push(D(x + rw - 5, 0, 10, 74, '#4a2a2a'), D(x, 46, w, hh, cols[i % 3], 'border-radius:50%;'), D(x + Math.round(rw * 0.4), 46 + Math.round(hh * 0.5), Math.round(rw * 1.1), Math.round(hh * 0.5), cols[(i + 1) % 3], 'border-radius:50%;opacity:0.9;'));
      }
      // paper lanterns hung on short strings
      for (let i = 0; i < 12; i++) {
        const lx = 640 + i * 142 + ((i * 5) % 3) * 14, ly = 210 + ((i * 7) % 4) * 14;
        mid.push(D(lx + 4, ly + 13, 2, 300 - ly - 13, '#5a3a28'), D(lx, ly, 10, 13, '#e0603a', 'border-radius:3px;box-shadow:0 0 0 4px rgba(224,96,58,0.25);animation:twinkle ' + (3 + (i % 3)) + 's steps(1) infinite;animation-delay:-' + (i % 4) + 's;'));
      }
      // floating islands with crimson-leaf tops
      [[780, 150, 190, 46], [1130, 190, 150, 40], [1480, 130, 210, 50], [1850, 175, 160, 42]].forEach((v, i) => {
        const x = v[0], y = v[1], w = v[2], h = v[3];
        mid.push(D(x + Math.round(w * 0.3), y - 18, 3, 20, '#4a2a2a'), D(x + Math.round(w * 0.6), y - 10, 3, 12, '#4a2a2a'));
        mid.push(D(x, y, w, h, '#5a3a3a', 'clip-path:polygon(0 0,100% 0,88% 40%,62% 100%,36% 58%,10% 30%);'));
        mid.push(D(x, y + h - 8, w, 8, '#8f1f27'));
        mid.push(D(x + Math.round(w * 0.14), y + h, Math.round(w * 0.42), 40, cols[i % 3], 'border-radius:50% 50% 0 0;'), D(x + Math.round(w * 0.5), y + h, Math.round(w * 0.34), 30, '#c8323a', 'border-radius:50% 50% 0 0;'));
      });
    } else {
      // Obsidian Spire: stacked dark stone blocks with silver edges, floating cubes
      // stack(centerX, [[width, height], ...]) builds a tower of slightly offset blocks, each with a silver top edge
      const stack = (xc, blocks, wins) => {
        let y = 0;
        blocks.forEach((b, k) => {
          const w = b[0], h = b[1], x = xc - w / 2 + ((k % 2) * 2 - 1) * 3;
          mid.push(D(x, y, w, h, k % 2 ? m.mid : m.midHi, 'box-shadow:inset 0 3px 0 #c9ccd3,inset 4px 0 0 rgba(0,0,0,0.22);'));
          if (wins && w > 50) {
            mid.push(D(x + w * 0.25, y + h * 0.35, 8, 11, m.win, 'opacity:0.85;'), D(x + w * 0.62, y + h * 0.35, 8, 11, m.win, 'opacity:0.6;'));
          }
          y += h;
        });
        return y;
      };
      stack(1060, [[170, 50], [136, 44], [104, 40], [72, 34]], true);
      stack(1330, [[96, 40], [70, 34], [46, 30]], false);
      const top = stack(1545, [[150, 52], [124, 48], [102, 46], [82, 42], [62, 40], [44, 36], [26, 30]], true);
      mid.push(D(1542, top, 6, 24, '#c9ccd3'), D(1538, top + 24, 14, 14, '#e8eaf0', 'border-radius:50%;box-shadow:0 0 0 6px rgba(232,234,240,0.2),0 0 0 14px rgba(232,234,240,0.08);animation:twinkle 2.4s steps(1) infinite;'));
      stack(1730, [[104, 44], [76, 38], [48, 32]], false);
      stack(1935, [[200, 56], [158, 50], [116, 44], [80, 38]], true);
      // floating cubes in the sky (three shaded greys), drifting slowly
      [[1190, 210, 30], [1450, 255, 22], [1640, 200, 26], [2060, 235, 32], [2250, 190, 22]].forEach((r, i) => {
        this.isoCube(r[0], r[1], r[2], ['#a9adb6', '#5b5d63', '#3a3a40'], 'animation:drift ' + (12 + i * 2) + 's linear infinite;animation-delay:-' + (i * 3) + 's;').forEach((p) => mid.push(p));
      });
    }

    // Stage particles: gold fireflies, blue frost sparkles, red-orange embers (slowly rotating squares), silver dust
    const fx = [];
    const fxCol = ['#f2b632', '#cfe8ff', '#e0603a', '#e8eaf0'][tier];
    const fxN = [9, 12, 11, 12][tier];
    for (let i = 0; i < fxN; i++) {
      const pos = 'position:absolute;left:' + Math.round(6 + rnd() * 88) + '%;bottom:' + Math.round(134 + rnd() * 224) + 'px;';
      if (tier === 2) {
        fx.push({ s: pos + 'width:5px;height:5px;background:' + (i % 2 ? '#e0603a' : '#e8a23a') + ';animation:ember ' + (7 + (i % 4)) + 's linear infinite;animation-delay:-' + i + 's;' });
      } else if (tier === 1) {
        fx.push({ s: pos + 'width:3px;height:3px;background:' + fxCol + ';box-shadow:0 0 0 2px ' + this.rgba(fxCol, 0.25) + ';animation:drift ' + (6 + (i % 3)) + 's linear infinite,twinkle ' + (1.6 + (i % 3) * 0.5).toFixed(1) + 's steps(1) infinite;animation-delay:-' + i + 's,-' + (i % 3) + 's;' });
      } else if (tier === 3) {
        fx.push({ s: pos + 'width:3px;height:3px;background:' + fxCol + ';opacity:0.8;animation:drift ' + (8 + (i % 4)) + 's linear infinite;animation-delay:-' + i + 's;' });
      } else {
        fx.push({ s: pos + 'width:4px;height:4px;background:' + fxCol + ';box-shadow:0 0 0 3px ' + this.rgba(fxCol, 0.25) + ';animation:drift ' + (5 + (i % 3)) + 's linear infinite;animation-delay:-' + i + 's;' });
      }
    }

    const layer = { m: m, stars: stars, far: far, mid: mid, fx: fx };
    this.memo.layerSets[key] = layer;
    return layer;
  }

}

export const legacy: any = new Legacy();
