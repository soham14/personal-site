// Per-map songs, ported verbatim from the mockup's songs() (reference/CareerQuest.dc.html ~1405).
// Index = map: 0 Academy Grounds (Berkeley), 1 Azure Citadel (SAP), 2 Crimson Grove (Yelp), 3 Obsidian Spire (Roblox).

export type Ev = [number, string, number, number];
export interface Track { v: string; n: Ev[] }
export interface Song { tempo: number; steps: number; gain: number; tracks: Track[]; at: [string, Ev][][] }

// Parse a melody string into [step, note, lengthSteps, velocity] events. Tokens are 'Note:len' ('_' = rest); a lone '|' jumps to the next bar line (16 steps).
export function seq(str: string, vel: number): Ev[] {
  const out: Ev[] = [];
  let pos = 0, bar = 0;
  str.split(/\s+/).forEach((tk) => {
    if (!tk) return;
    if (tk === '|') { bar += 1; pos = bar * 16; return; }
    const p = tk.split(':');
    const len = parseInt(p[1], 10) || 1;
    if (p[0] !== '_') out.push([pos, p[0], len, vel]);
    pos += len;
  });
  return out;
}

let memo: Song[] | null = null;

export function songs(): Song[] {
  if (memo) return memo;
  const self = { seq };
  const mk = (tempo: number, steps: number, gain: number, tracks: any[]): Song => {
    const at: [string, Ev][][] = [];
    for (let i = 0; i < steps; i++) at.push([]);
    tracks.forEach((tr) => tr.n.forEach((ev) => { if (ev[0] >= 0 && ev[0] < steps) at[ev[0]].push([tr.v, ev]); }));
    return { tempo: tempo, steps: steps, gain: gain, tracks: tracks, at: at };
  };
    // ---- Map 1: Academy Grounds. ~92 BPM, F major, 16 bars = A (bars 1-8) + A' (bars 9-16). ----
    // Chords per bar: n = arpeggio tones, r / f = bass root and fifth. A bar given as [x, y] changes chord at beat 3.
    const CH = {
      F: { n: ['F3', 'A3', 'C4', 'F4'], r: 'F2', f: 'C3' },
      Dm: { n: ['D3', 'F3', 'A3', 'D4'], r: 'D2', f: 'A2' },
      Bb: { n: ['D3', 'F3', 'Bb3', 'D4'], r: 'Bb2', f: 'F3' },
      C: { n: ['E3', 'G3', 'C4', 'E4'], r: 'C3', f: 'G3' },
      Gm7: { n: ['G3', 'Bb3', 'D4', 'F4'], r: 'G2', f: 'D3' },
      C7: { n: ['E3', 'G3', 'Bb3', 'C4'], r: 'C3', f: 'G3' }
    };
    const prog = ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', ['Gm7', 'C7']];
    const arp: any[] = [], bass: any[] = [], kick: any[] = [], brush: any[] = [], hat: any[] = [];
    const pat = [0, 1, 2, 3, 2, 1, 2, 1];
    prog.forEach((e, b) => {
      const sp = Array.isArray(e);
      for (let k = 0; k < 8; k++) {
        const c = CH[sp ? e[k < 4 ? 0 : 1] : e];
        arp.push([b * 16 + k * 2, c.n[sp ? k % 4 : pat[k]], 2, k % 4 === 0 ? 0.8 : 0.55]);
      }
      for (let q = 0; q < 4; q++) {
        const c = CH[sp ? e[q < 2 ? 0 : 1] : e];
        bass.push([b * 16 + q * 4, q % 2 ? c.f : c.r, 3, q % 2 ? 0.55 : 0.75]);
      }
      if (b > 0) {
        kick.push([b * 16, 'C2', 1, 0.6], [b * 16 + 8, 'C2', 1, 0.5]);
        brush.push([b * 16 + 4, 'C2', 1, 0.6], [b * 16 + 12, 'C2', 1, 0.6]);
        for (let k = 0; k < 8; k++) hat.push([b * 16 + k * 2, 'C2', 1, k % 2 ? 0.3 : 0.45]);
      }
    });
    const lead = self.seq([
      '_:12 C4:2 E4:2',
      '| F4:4 A4:2 G4:2 F4:4 D4:4',
      '| Bb4:4 A4:2 G4:2 F4:4 D4:4',
      '| G4:4 E4:2 F4:2 G4:8',
      '| A4:4 C5:4 A4:2 G4:2 A4:4',
      '| F4:4 A4:4 D5:4 C5:2 Bb4:2',
      '| Bb4:4 C5:2 D5:2 C5:4 A4:4',
      '| G4:4 F4:2 E4:2 D4:6 E4:2',
      '| A4:4 C5:4 F5:4 E5:2 D5:2',
      '| D5:4 C5:2 A4:2 F4:4 A4:4',
      '| Bb4:4 D5:4 C5:2 Bb4:2 A4:4',
      '| G4:4 E4:2 F4:2 G4:4 C5:4',
      '| A4:6 G4:2 F4:4 C5:4',
      '| D5:6 C5:2 A4:4 F4:4',
      '| D5:4 C5:4 Bb4:4 A4:4',
      '| Bb4:4 A4:2 G4:2 E4:8'
    ].join(' '), 0.8);
    const counter = self.seq('| | | | | | | | C4:8 F4:8 | D4:8 F4:8 | F4:8 D4:8 | C4:8 E4:8 | C4:8 A3:8 | D4:8 A3:8 | F4:8 D4:8 | D4:8 G3:8', 0.42);
    const chime = self.seq('F5:3 A5:3 G5:3 C5:3', 0.7);
    const academy = mk(92, 256, 1, [
      { v: 'bell', n: chime }, { v: 'lead', n: lead }, { v: 'lead', n: counter }, { v: 'bass', n: bass }, { v: 'pulse', n: arp },
      { v: 'kick', n: kick }, { v: 'brush', n: brush }, { v: 'hat', n: hat }
    ]);

    // ---- Map 2: Azure Citadel (SAP) ----
    // "Azure Citadel" - original heroic journey-launch theme, 126 BPM. Bar 0 fanfare, A (D major, bVII-IV-I rise) then B lifts a step to E major.
    // Gallop bass, power-chord stabs, marching brush rolls; hook returns an octave higher, climax held in bar 15, drum fill launches the loop.
    const SP_CH = {
      D: { s: ['D4','A4','D5','F#4'],  r: 'D2', f: 'A2',  o: 'D3' },
      G: { s: ['G3','D4','G4','B3'],   r: 'G2', f: 'D3',  o: 'G3' },
      A: { s: ['A3','E4','A4','C#4'],  r: 'A2', f: 'E3',  o: 'A3' },
      C: { s: ['C4','G4','C5','E4'],   r: 'C2', f: 'G2',  o: 'C3' },
      E: { s: ['E3','B3','E4','G#3'],  r: 'E2', f: 'B2',  o: 'E3' },
      B: { s: ['B3','F#4','B4','D#4'], r: 'B2', f: 'F#3', o: 'B3' }
    };
    const sp_prog = ['D','G','A','D','C','G','D','A', 'E','A','B','E','D','A','E','A'];
    const sp_stab = [[0,3,0.7],[3,3,0.55],[6,2,0.6],[8,3,0.7],[11,3,0.55],[14,2,0.6]];
    const sp_pulse: any[] = [], sp_bass: any[] = [], sp_kick: any[] = [], sp_brush: any[] = [], sp_hat: any[] = [];
    sp_prog.forEach((name, bar) => {
      const c = SP_CH[name], b = bar * 16;
      sp_stab.forEach(([s, l, v]) => c.s.slice(0, 3).forEach(n => sp_pulse.push([b + s, n, l, v])));
      [[0,c.r],[2,c.r],[4,c.f],[6,c.o],[8,c.r],[10,c.r],[12,c.f],[14,c.o]]
        .forEach(([s, n]) => sp_bass.push([b + s, n, 2, s % 8 === 0 ? 0.9 : 0.75]));
      for (let i = 0; i < 16; i += 2) sp_hat.push([b + i, 'C2', 1, i % 4 === 2 ? 0.24 : 0.14]);
      if (bar === 15) {
        sp_kick.push([b, 'C2', 2, 0.9], [b + 8, 'C2', 2, 0.9], [b + 12, 'C2', 2, 0.8], [b + 14, 'C2', 2, 0.9]);
        sp_brush.push([b + 4, 'C2', 2, 0.65]);
        for (let i = 8; i < 16; i++) sp_brush.push([b + i, 'C2', 1, 0.45 + (i - 8) * 0.06]);
      } else {
        sp_kick.push([b, 'C2', 2, 0.95], [b + 8, 'C2', 2, 0.85]);
        if (bar % 2 === 1) sp_kick.push([b + 14, 'C2', 1, 0.55]);
        sp_brush.push([b + 4, 'C2', 2, 0.7]);
        if (bar % 4 === 3) {
          sp_brush.push([b + 12, 'C2', 1, 0.6], [b + 13, 'C2', 1, 0.45], [b + 14, 'C2', 1, 0.6], [b + 15, 'C2', 1, 0.8]);
        } else {
          sp_brush.push([b + 12, 'C2', 2, 0.7]);
        }
      }
    });
    const sp_lead = self.seq([
      'A4:3 D5:1 D5:3 G5:1 A5:3 D6:1 D6:4',
      '| B4:3 D5:1 G5:4 F#5:2 D5:2 B4:4',
      '| C#5:3 E5:1 A5:4 G5:2 E5:2 C#5:4',
      '| D5:3 F#5:1 A5:4 D6:4 A5:2 F#5:2',
      '| E5:3 G5:1 C6:4 B5:2 G5:2 E5:4',
      '| D5:3 G5:1 B5:4 A5:2 G5:2 D5:4',
      '| F#5:3 A5:1 D6:4 C#6:2 A5:2 F#5:4',
      '| E5:4 A5:4 C#6:4 E6:2 A5:2',
      '| G#5:3 B5:1 E6:4 D#6:2 B5:2 G#5:4',
      '| A5:3 C#6:1 E6:4 D6:2 C#6:2 A5:4',
      '| B5:3 D#6:1 F#6:4 E6:2 D#6:2 B5:4',
      '| E6:3 G#6:1 B6:4 E7:4 B6:2 G#6:2',
      '| D6:3 F#6:1 A6:4 G6:2 F#6:2 D6:4',
      '| C#6:3 E6:1 A6:4 G6:2 E6:2 C#6:4',
      '| B5:3 E6:1 G#6:4 B6:4 G#6:2 E6:2',
      '| A5:2 C#6:2 E6:2 A6:2 C#7:8'
    ].join(' '), 0.9);
    const sp_counter = self.seq([
      '_:16 G4:8 B4:8',
      '| A4:8 C#5:8',
      '| F#4:8 A4:8',
      '| E4:8 G4:8',
      '| D4:8 G4:8',
      '| F#4:8 A4:8',
      '| E4:8 A4:8',
      '| B4:8 E5:8',
      '| C#5:8 A4:8',
      '| D#5:8 F#5:8',
      '| B4:8 G#4:8',
      '| A4:8 F#4:8',
      '| E5:8 C#5:8',
      '| G#4:8 B4:8',
      '| E5:8 C#5:8'
    ].join(' '), 0.45);
    const sp_bellA = self.seq('D5:3 A5:1 D6:3 F#6:1 A6:8', 0.65);
    const sp_bellB = self.seq('_:128 E5:3 B5:1 E6:3 G#6:1 B6:8', 0.65);
    const sp_bell = sp_bellA.concat(sp_bellB);
    const sap = mk(126, 256, 1, [
      { v: 'bell',  n: sp_bell },
      { v: 'lead',  n: sp_lead },
      { v: 'lead',  n: sp_counter },
      { v: 'bass',  n: sp_bass },
      { v: 'pulse', n: sp_pulse },
      { v: 'kick',  n: sp_kick },
      { v: 'brush', n: sp_brush },
      { v: 'hat',   n: sp_hat }
    ]);


    // ---- Map 3: Crimson Grove (Yelp) ----
    // Crimson Grove (Yelp guild): a swung 96 BPM cafe-street-at-dusk theme in A minor / C major, jazzy 7ths.
    // Off-beat 8ths sit on step +3 (long-short); 16 bars = A (Am7 turnaround) + B (brightens to C, back via E7).
      const yp_prog = ['Am7','D9','Gmaj7','Cmaj7','Fmaj7','Bm7b5','E7','Am7','Fmaj7','G7','Cmaj7','Am7','Dm7','G7','Cmaj7','E7'];
      const yp_voic = {
        Am7: ['A3','C4','E4','G4'], D9: ['C4','E4','F#4','A4'], Gmaj7: ['B3','D4','F#4','G4'],
        Cmaj7: ['C4','E4','G4','B4'], Fmaj7: ['A3','C4','E4','F4'], Bm7b5: ['B3','D4','F4','A4'],
        E7: ['B3','D4','E4','G#4'], G7: ['B3','D4','F4','G4'], Dm7: ['A3','C4','D4','F4']
      };
      const yp_walk = [
        ['A2','C3','E3','C#3'], ['D3','F#3','A2','Ab2'], ['G2','B2','D3','Db3'], ['C3','E3','G3','F#3'],
        ['F2','A2','C3','Bb2'], ['B2','D3','F3','D#3'], ['E2','G#2','B2','Bb2'], ['A2','E3','C3','G2'],
        ['F2','A2','C3','E3'], ['G2','D3','F3','B2'], ['C3','E3','G3','G#2'], ['A2','C3','E3','C#3'],
        ['D3','F3','A2','F#2'], ['G2','B2','D3','Db3'], ['C3','G2','E3','D#2'], ['E2','G#2','B2','Bb2']
      ];
      const yp_lead = self.seq([
        '_:8 E4:3 A4:1 C5:3 B4:1',
        '| A4:6 F#4:2 A4:3 G4:1 F#4:3 E4:1',
        '| D4:3 F#4:1 G4:3 B4:1 D5:8',
        '| C5:3 B4:1 G4:3 E4:1 G4:4 _:4',
        '| A4:3 C5:1 A4:3 G4:1 F4:4 E4:2 F4:2',
        '| D5:3 C5:1 B4:3 A4:1 F4:8',
        '| G#4:3 B4:1 D5:3 C5:1 B4:4 G#4:2 A4:2',
        '| A4:12 _:2 E4:1 F4:1',
        '| F5:3 E5:1 C5:3 A4:1 C5:4 F5:4',
        '| D5:3 B4:1 D5:3 F5:1 E5:3 D5:1 B4:4',
        '| E5:6 G5:2 E5:3 D5:1 C5:4',
        '| C5:3 E5:1 A5:3 G5:1 E5:4 C5:2 D5:2',
        '| F5:3 E5:1 D5:3 C5:1 A4:4 D5:4',
        '| B4:3 D5:1 G5:3 F5:1 D5:4 B4:4',
        '| C5:3 B4:1 C5:3 E5:1 G5:8',
        '| G#5:3 E5:1 B4:3 D5:1 G#4:4 _:2 A4:1 B4:1'
      ].join(' '), 0.8);
      const yp_counter = self.seq([
        'C5:3 B4:1 A4:4 _:8',
        '| _:16', '| _:16',
        '| _:12 E5:3 G5:1',
        '| _:16', '| _:16', '| _:16', '| _:16', '| _:16', '| _:16', '| _:16', '| _:16', '| _:16', '| _:16', '| _:16', '| _:16'
      ].join(' '), 0.4);
      const yp_bass: any[] = [], yp_comp: any[] = [], yp_kick: any[] = [], yp_brush: any[] = [], yp_hat: any[] = [];
      for (let b = 0; b < 16; b++) {
        const o = b * 16;
        yp_walk[b].forEach((nt, q) => yp_bass.push([o + q * 4, nt, 3, q === 0 ? 0.7 : 0.58]));
        yp_voic[yp_prog[b]].forEach(nt => {
          yp_comp.push([o + 3, nt, 2, 0.26]);
          yp_comp.push([o + 11, nt, 2, 0.22]);
        });
        yp_kick.push([o, 'C2', 2, 0.8]);
        if (b % 2 === 1) yp_kick.push([o + 11, 'C2', 2, 0.35]);
        yp_brush.push([o + 4, 'C3', 2, 0.5], [o + 12, 'C3', 2, 0.5]);
        for (let q = 0; q < 4; q++) {
          yp_hat.push([o + q * 4, 'C5', 1, 0.2]);
          yp_hat.push([o + q * 4 + 3, 'C5', 1, 0.13]);
        }
      }
      const yp_bell = [
        [0,'E5',6,0.35],[3,'A5',6,0.35],[6,'C6',6,0.35],[9,'E6',8,0.3],
        [64,'C5',6,0.35],[67,'F5',6,0.35],[70,'A5',6,0.35],[73,'C6',8,0.3],
        [128,'A5',6,0.35],[131,'C6',6,0.35],[134,'E6',6,0.35],[137,'A6',8,0.3],
        [192,'D5',6,0.35],[195,'F5',6,0.35],[198,'A5',6,0.35],[201,'C6',8,0.3]
      ];
      const yelp = mk(96, 256, 1, [
        { v: 'bell', n: yp_bell }, { v: 'lead', n: yp_lead }, { v: 'lead', n: yp_counter },
        { v: 'bass', n: yp_bass }, { v: 'pulse', n: yp_comp },
        { v: 'kick', n: yp_kick }, { v: 'brush', n: yp_brush }, { v: 'hat', n: yp_hat }
      ]);


    // ---- Map 4: Obsidian Spire (Roblox) ----
    // "Obsidian Spire" - dawn-over-the-spire theme: 80 BPM, D major with Lydian brightness, warm pad bed and a singable lead.
    // A (bars 0-7) spacious; B (8-15) adds soft half-time drums, climbs to a soaring peak at bar 13 and resolves home on D.
    const RB = {
      D:  { p: ['D3','F#3','A3','C#4'], a: ['D4','F#4','A4','C#5'],  r: 'D2',  f: 'A2' },
      A:  { p: ['A2','E3','A3','C#4'],  a: ['A3','C#4','E4','A4'],   r: 'A1',  f: 'E2' },
      Bm: { p: ['B2','F#3','A3','D4'],  a: ['B3','D4','F#4','A4'],   r: 'B1',  f: 'F#2' },
      G11:{ p: ['G2','D3','B3','C#4'],  a: ['B3','D4','F#4','C#5'],  r: 'G2',  f: 'D3' },
      Fm: { p: ['F#2','C#3','A3','E4'], a: ['A3','C#4','E4','F#4'],  r: 'F#2', f: 'C#3' },
      G:  { p: ['G2','D3','B3','F#4'],  a: ['G3','B3','D4','F#4'],   r: 'G2',  f: 'D3' },
      A7: { p: ['A2','E3','G3','C#4'],  a: ['A3','C#4','E4','G4'],   r: 'A1',  f: 'E2' }
    };
    const rb_prog = ['D','A','Bm','G11','D','Fm','G','A','G','A','Bm','Fm','G11','A','A7','D'];
    const rb_up = n => n.slice(0, -1) + (+n.slice(-1) + 1);
    const rb_pad: any[] = [], rb_arp: any[] = [], rb_bass: any[] = [], rb_bell: any[] = [], rb_kick: any[] = [], rb_brush: any[] = [], rb_hat: any[] = [];
    rb_prog.forEach((k, b) => {
      const c = RB[k], s = b * 16, B = b >= 8;
      c.p.forEach(n => rb_pad.push([s, n, 16, 0.75]));
      for (let i = 0; i < 8; i++) rb_arp.push([s + i * 2, c.a[i % 4], 2, B ? 0.36 : 0.3]);
      rb_bell.push([s + 6, rb_up(c.a[3]), 4, B ? 0.32 : 0.26]);
      if (B) {
        rb_bell.push([s + 14, rb_up(c.a[2]), 4, 0.3]);
        rb_bass.push([s, c.r, 8, 0.75], [s + 8, c.f, 8, 0.65]);
        rb_kick.push([s, 'C2', 1, 0.7]);
        rb_brush.push([s + 8, 'C2', 1, 0.5]);
        rb_hat.push([s + 4, 'C2', 1, 0.2], [s + 12, 'C2', 1, 0.2]);
      } else {
        rb_bass.push([s, c.r, 16, 0.75]);
      }
    });
    const rb_lead = self.seq([
      '_:16',
      '_:16',
      'F#4:6 A4:2 B4:8',
      'A4:6 G4:2 F#4:8',
      'F#4:4 A4:4 D5:8',
      'C#5:6 A4:2 C#5:8',
      'B4:8 A4:4 G4:4',
      'E5:10 C#5:6',
      'D5:4 B4:4 D5:8',
      'E5:4 A4:4 E5:8',
      'F#5:6 D5:2 B4:8',
      'C#5:4 E5:4 F#5:8',
      'D5:4 F#5:4 G5:8',
      'A5:12 E5:4',
      'F#5:6 E5:2 C#5:8',
      'D5:12 _:4'
    ].join(' '), 0.75);
    const roblox = mk(80, 256, 1, [
      { v: 'pad',   n: rb_pad },
      { v: 'bell',  n: rb_bell },
      { v: 'lead',  n: rb_lead },
      { v: 'bass',  n: rb_bass },
      { v: 'pulse', n: rb_arp },
      { v: 'kick',  n: rb_kick },
      { v: 'brush', n: rb_brush },
      { v: 'hat',   n: rb_hat }
    ]);


    memo = [academy, sap, yelp, roblox];
    return memo;
}
