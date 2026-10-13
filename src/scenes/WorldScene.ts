// The game world: sky, stars, moon, far/mid parallax, stage particles, the foreground track (ground with guild
// names, scenery, gates, portal, sealed gate, banners, platforms, ladders), mentors, the player with his aura,
// and the job-advancement burst. Mirrors the mockup's stage DOM (CareerQuest.dc.html ~line 80-250, renderVals).
import * as Phaser from 'phaser';
import { MAPS, MENTORS, PORTAL, PROFILE } from '../content.ts';
import { state } from '../state.ts';
import { legacy } from '../render/legacy.ts';
import { buildSpriteTextures, v2Sprite, v2Box, HERO_W, HERO_H, TEX_RES } from '../render/textures.ts';
import { buildBoxLayer, buildScreenItems, layoutScreenItems, tickAnimated, labelTexture, LABEL_PAD, boxTexture, type Animated } from '../render/scenery.ts';
import { parseCss } from '../render/css.ts';
import { tick, sim, camLeft, setViewWidth, npcWorld, displayTier, legPose } from '../game/sim.ts';
import { initInput, setWorldHitTest } from '../game/input.ts';

const ACC = '#ffd166';
const PIX = "'Pixelify Sans', monospace";
const TAG_STYLE = "background:rgba(15,18,38,0.88);font-family:'Pixelify Sans',monospace;font-size:11px;font-weight:600;letter-spacing:1px;padding:0 6px;line-height:16px;white-space:nowrap;display:flex;";
const PROMPT_STYLE = "background:#f4f1e8;color:#1b2040;border:2px solid #1b2040;box-shadow:2px 2px 0 #000;font-family:'Pixelify Sans',monospace;font-size:12px;font-weight:700;letter-spacing:1px;white-space:nowrap;display:flex;padding:2px 6px;box-sizing:border-box;";

const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color;
function lerpHex(a: string, b: string, t: number): number {
  const A = Phaser.Display.Color.HexStringToColor(a), B = Phaser.Display.Color.HexStringToColor(b);
  return Phaser.Display.Color.GetColor(Math.round(A.red + (B.red - A.red) * t), Math.round(A.green + (B.green - A.green) * t), Math.round(A.blue + (B.blue - A.blue) * t));
}

interface TierLayers { stars: Phaser.GameObjects.Container; far: Phaser.GameObjects.Container; mid: Phaser.GameObjects.Container; fx: Phaser.GameObjects.Container; starItems: Animated[]; fxItems: Animated[]; farAnims: Animated[]; midAnims: Animated[] }

interface NpcView { c: Phaser.GameObjects.Container; mk: Phaser.GameObjects.Image; mkY: number; prompt: Phaser.GameObjects.Image; i: number }

export class WorldScene extends Phaser.Scene {
  private ready = false;
  private t = 0;
  private W = 0; private H = 0;
  private sky!: Phaser.GameObjects.Graphics;
  private warm = 20;
  private lastNow = 0;
  private moon!: Phaser.GameObjects.Container;
  private moonDisc!: Phaser.GameObjects.Image;
  private constel!: Phaser.GameObjects.Graphics;
  private tiers: TierLayers[] = [];
  private track!: Phaser.GameObjects.Container;
  private trackAnims: Animated[] = [];
  private npcs: NpcView[] = [];
  private portalPrompt!: Phaser.GameObjects.Image;
  // player
  private hero!: Phaser.GameObjects.Container;   // at the feet, carries the name tag
  private body!: Phaser.GameObjects.Container;   // bob offset + squash/flip
  private fxBack!: Phaser.GameObjects.Graphics;
  private fxFront!: Phaser.GameObjects.Graphics;
  private cape!: Phaser.GameObjects.Image;
  private base!: Phaser.GameObjects.Image;
  private tail!: Phaser.GameObjects.Image;
  private book!: Phaser.GameObjects.Image;
  private titleChip: Phaser.GameObjects.Image | null = null;
  private titleText = '';
  private advG!: Phaser.GameObjects.Graphics;
  private capeCr = 0;
  private shownTier = -1;

  constructor() { super('world'); }

  create() {
    this.cameras.main.setBackgroundColor(MAPS[0].sky[0]);
    this.sky = this.add.graphics();
    initInput();
    setWorldHitTest((x, y) => this.hitTest(x, y));
    this.scale.on('resize', () => this.layout());
    // Text in the scenery uses the page fonts: wait for them (bounded) before painting the textures.
    const fonts = (document as any).fonts;
    const loads = fonts && fonts.load ? Promise.all([
      fonts.load("700 22px 'Pixelify Sans'"), fonts.load("600 11px 'Pixelify Sans'"), fonts.load("11px 'Space Mono'")
    ]) : Promise.resolve();
    Promise.race([loads, new Promise((r) => setTimeout(r, 2500))]).catch(() => null).then(() => this.build());
    this.layout();
  }

  private build() {
    if (!this.sys || !this.sys.isActive()) return;
    buildSpriteTextures(this);
    // sky extras for map 4: moon + constellations
    this.moon = this.add.container(0, 0);
    const mc = parseCss('width:62px;height:62px;border-radius:50%;box-shadow:inset -19px -5px 0 0 #e8eaf0, 0 0 0 10px rgba(232,234,240,0.06);');
    this.moonDisc = this.add.image(0, 0, boxTexture(this, mc, { x: 0, y: 0, w: 62, h: 62 })).setOrigin(0, 0);
    this.constel = this.add.graphics();
    this.moon.add([this.constel, this.moonDisc]);

    // per-map parallax sets (all four built once; crossfaded by the blend)
    const starsRoot = this.add.container(0, 0), farRoot = this.add.container(0, 0), midRoot = this.add.container(0, 0), fxRoot = this.add.container(0, 0);
    for (let tier = 0; tier < 4; tier++) {
      const L = legacy.layers(tier, ACC);
      const stars = this.add.container(0, 0), far = this.add.container(0, 0), mid = this.add.container(0, 0), fx = this.add.container(0, 0);
      starsRoot.add(stars); farRoot.add(far); midRoot.add(mid); fxRoot.add(fx);
      const starItems = buildScreenItems(this, stars, L.stars);
      const fxItems = buildScreenItems(this, fx, L.fx);
      const farAnims = buildBoxLayer(this, far, L.far, 0, 1900, 380, 260);
      const midAnims = buildBoxLayer(this, mid, L.mid, 0, 2600, 420, 300);
      this.tiers.push({ stars, far, mid, fx, starItems, fxItems, farAnims, midAnims });
    }
    // order: sky < stars < moon < far < mid < fx < track
    this.children.bringToTop(starsRoot);
    this.children.bringToTop(this.moon);
    this.children.bringToTop(farRoot);
    this.children.bringToTop(midRoot);
    this.children.bringToTop(fxRoot);

    // foreground track
    this.track = this.add.container(0, 0);
    const Wd = legacy.world(ACC);
    const X0 = -420, WW = 4700, HH = 440;
    this.trackAnims.push(...buildBoxLayer(this, this.track, [...Wd.ground, ...Wd.decor], X0, WW, HH));
    const plats = Wd.platforms.map((p: any) => ({ s: p.s, children: [{ s: p.t }, { s: p.b }, { s: p.d1 }, { s: p.d2 }, { s: p.d3 }] }));
    this.trackAnims.push(...buildBoxLayer(this, this.track, [...Wd.banners, ...plats, ...Wd.ladders], X0, WW, HH));

    // portal prompt
    this.portalPrompt = this.prompt('↑ Enter');
    this.portalPrompt.setPosition(PORTAL.x, -(242 + 30) + this.portalPrompt.height / 2 - LABEL_PAD);
    this.track.add(this.portalPrompt);

    // mentors
    for (let i = 0; i < 4; i++) this.npcs.push(this.makeNpc(i));

    // job advancement burst (behind/around the player)
    this.advG = this.add.graphics();
    this.track.add(this.advG);

    this.makeHero();
    this.ready = true;
    // Fade out the HTML loading screen once the first frame of the world is drawn.
    this.time.delayedCall(60, () => {
      const b = document.getElementById('boot');
      if (b) { b.classList.add('gone'); setTimeout(() => b.remove(), 400); }
    });
    this.layout();
  }

  private prompt(text: string): Phaser.GameObjects.Image {
    const L = labelTexture(this, text, PROMPT_STYLE, 8, 20, '700 12px ' + PIX, 1);
    return this.add.image(0, 0, L.key).setVisible(false);
  }

  private makeNpc(i: number): NpcView {
    const w = npcWorld(i);
    const c = this.add.container(w.x, -(88 + w.h));
    const spr = this.add.image(-HERO_W / 2, -HERO_H, 'npc-' + i).setOrigin(0, 0).setScale(1 / TEX_RES);
    this.textures.get('npc-' + i).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const tag = labelTexture(this, MENTORS[i].name, TAG_STYLE + 'color:#f4f1e8;', 6, 16, '600 11px ' + PIX, 1);
    const tagImg = this.add.image(0, 2 + 8, tag.key);
    const mkKey = boxTexture(this, parseCss("width:18px;height:22px;box-sizing:border-box;background:" + ACC + ";border:2px solid #1b2040;border-radius:4px;color:#1b2040;font-family:'Pixelify Sans',monospace;font-weight:700;font-size:14px;line-height:1;display:flex;"), { x: 0, y: 0, w: 18, h: 22 }, '!');
    const mkY = -HERO_H - 3 - 11;
    const mk = this.add.image(0, mkY, mkKey);
    const prompt = this.prompt('↑ Talk');
    prompt.setPosition(0, -HERO_H - 3 - 22 - 30 + 10);
    c.add([spr, tagImg, mk, prompt]);
    this.track.add(c);
    return { c, mk, mkY, prompt, i };
  }

  private makeHero() {
    this.hero = this.add.container(0, 0);
    this.body = this.add.container(0, 0);
    this.fxBack = this.add.graphics();
    this.fxFront = this.add.graphics();
    const img = (key: string) => this.add.image(-HERO_W / 2, -HERO_H, key).setOrigin(0, 0).setScale(1 / TEX_RES);
    this.cape = img('hero-3-cape');
    this.base = img('hero-0-base-0');
    this.tail = img('hero-2-tail');
    this.book = img('hero-0-book');
    for (const k of this.textures.getTextureKeys()) if (k.startsWith('hero-')) this.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.body.add([this.fxBack, this.cape, this.base, this.tail, this.fxFront, this.book]);
    const tag = labelTexture(this, PROFILE.name, TAG_STYLE + 'color:' + ACC + ';', 6, 16, '600 11px ' + PIX, 1);
    // name tag sits under the feet (the sprite box is 18px above the tag's bottom)
    const tagImg = this.add.image(0, 2 + 8, tag.key);
    this.hero.add([this.body, tagImg]);
    this.track.add(this.hero);
  }

  private setTier(t: number) {
    if (t === this.shownTier) return;
    this.shownTier = t;
    const S = v2Sprite(t), B = v2Box(t);
    this.cape.setVisible(!!S.layers.cape);
    if (S.layers.cape) {
      const cp = S.capePivot!;
      const px = B.ox + cp[0] * B.P, py = B.oy + cp[1] * B.P;
      this.cape.setTexture('hero-' + t + '-cape').setOrigin(px / HERO_W, py / HERO_H).setPosition(px - HERO_W / 2, py - HERO_H);
    }
    this.tail.setVisible(!!S.layers.tail);
    if (S.layers.tail) {
      const tp = S.tailPivot!;
      const px = B.ox + tp[0] * B.P, py = B.oy + tp[1] * B.P;
      this.tail.setTexture('hero-' + t + '-tail').setOrigin(px / HERO_W, py / HERO_H).setPosition(px - HERO_W / 2, py - HERO_H);
    }
    this.book.setTexture('hero-' + t + '-book');
  }

  /** Mentor / portal under a client point (for clicks and taps), or -1. */
  private hitTest(cx: number, cy: number): number {
    if (!this.ready) return -1;
    const r = this.game.canvas.getBoundingClientRect();
    const wx = cx - r.left - Math.round(camLeft(state.px, this.W)), by = r.bottom - cy;
    for (let i = 0; i < 4; i++) {
      const w = npcWorld(i), b0 = 88 + w.h - 18;
      if (wx >= w.x - 40 && wx <= w.x + 40 && by >= b0 && by <= b0 + 115) return i;
    }
    if (wx >= PORTAL.x - 55 && wx <= PORTAL.x + 55 && by >= 92 && by <= 242) return 4;
    return -1;
  }

  private layout() {
    this.W = this.scale.width; this.H = this.scale.height;
    setViewWidth(this.W);
    if (!this.ready) return;
    for (const L of this.tiers) { layoutScreenItems(L.starItems, this.W, this.H); layoutScreenItems(L.fxItems, this.W, this.H); }
    // moon: right 15%, top 50px; constellations: a 1000x260 viewBox "slice"-fitted into the top 46%
    this.moonDisc.setPosition(Math.round(this.W * 0.85 - 62) - LABEL_PAD, 50 - LABEL_PAD);
    const g = this.constel;
    g.clear();
    const bw = this.W, bh = this.H * 0.46, k = Math.max(bw / 1000, bh / 260), ox = (bw - 1000 * k) / 2, oy = (bh - 260 * k) / 2;
    const P = (x: number, y: number) => [ox + x * k, oy + y * k];
    const lines = [[70, 70, 170, 120, 270, 78, 380, 140, 470, 96], [560, 40, 650, 110, 770, 70, 880, 140], [290, 24, 350, 58, 430, 34]];
    g.lineStyle(1.5 * k, 0xe8eaf0, 0.5);
    for (const l of lines) {
      g.beginPath();
      for (let j = 0; j < l.length; j += 2) { const [x, y] = P(l[j], l[j + 1]); if (j === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.strokePath();
    }
    g.fillStyle(0xe8eaf0, 1);
    for (const l of lines) for (let j = 0; j < l.length; j += 2) { const [x, y] = P(l[j], l[j + 1]); g.fillCircle(x, y, 3 * k); }
  }

  update(_time: number, _delta: number) {
    // Use real elapsed time. Phaser's delta is smoothed and snaps to ~16ms after a stall, which made
    // the game run in slow motion while a phone was busy (e.g. right after the music starts).
    const now = performance.now();
    const raw = this.lastNow ? (now - this.lastNow) / 1000 : 1 / 60;
    this.lastNow = now;
    const dt = Math.min(0.25, Math.max(0, raw));
    this.t += dt;
    tick(dt);
    this.drawSky();
    if (!this.ready) return;
    if (this.warm > 0) this.warm--;
    const W = this.W, H = this.H;
    const camL = camLeft(state.px, W);
    const bl = state.blend;
    const hasB = bl.nxt >= 0 && bl.t > 0.003;
    const bt = hasB ? bl.t : 0;
    // parallax sets: A = camera map at 1 - t, B = neighbour at t
    this.tiers.forEach((L, i) => {
      let a = i === bl.cur ? 1 - bt : (hasB && i === bl.nxt ? bt : 0);
      // Warm-up: draw every map's layers nearly invisibly for the first frames so the GPU uploads
      // their textures at load, instead of stalling later (this was the slow first seconds on phones).
      if (this.warm > 0 && a <= 0.001) a = 0.01;
      const vis = a > 0.001;
      for (const c of [L.stars, L.far, L.mid, L.fx]) { c.setVisible(vis); c.setAlpha(a >= 0.995 ? 1 : a); }
      if (!vis) return;
      L.far.setPosition(Math.round((camL + 100) * 0.15), H - 70);
      L.mid.setPosition(Math.round((camL + 100) * 0.45), H - 70);
      tickAnimated(L.starItems, this.t); tickAnimated(L.fxItems, this.t);
      tickAnimated(L.farAnims, this.t); tickAnimated(L.midAnims, this.t);
    });
    const moonW = bl.cur === 3 ? 1 - bt : (hasB && bl.nxt === 3 ? bt : 0);
    this.moon.setVisible(moonW > 0.004).setAlpha(moonW);

    this.track.setPosition(Math.round(camL), H);
    tickAnimated(this.trackAnims, this.t);

    // mentors: "!" bob, prompt when near
    for (const n of this.npcs) {
      const half = ((this.t + n.i * 0.3) / 1.1) % 1 >= 0.5;
      n.mk.y = n.mkY + (half ? -4 : 0);
      n.prompt.setVisible(state.near === n.i);
    }
    this.portalPrompt.setVisible(state.near === 4);

    this.drawHero(dt);
    this.drawAdvance();
  }

  private drawSky() {
    const g = this.sky, b = state.blend, W = this.scale.width, H = this.scale.height;
    const hasB = b.nxt >= 0 && b.t > 0.003;
    const col = (k: number) => hasB ? lerpHex(MAPS[b.cur].sky[k], MAPS[b.nxt].sky[k], b.t) : hex(MAPS[b.cur].sky[k]);
    g.clear();
    // smooth vertical gradient (no visible bands): top -> mid at 370px above the bottom -> low at 213px
    const y1 = Math.max(0, H - 370), y2 = Math.max(y1, H - 213);
    const c0 = col(0), c1 = col(1), c2 = col(2);
    const grad = (ya: number, yb: number, a: number, b2: number) => {
      if (yb <= ya) return;
      // strips instead of fillGradientStyle so it also works with the Canvas renderer
      const step = 4;
      for (let y = ya; y < yb; y += step) {
        const t = (y - ya) / (yb - ya);
        const r = ((a >> 16) & 255) + (((b2 >> 16) & 255) - ((a >> 16) & 255)) * t;
        const gg = ((a >> 8) & 255) + (((b2 >> 8) & 255) - ((a >> 8) & 255)) * t;
        const bb = (a & 255) + ((b2 & 255) - (a & 255)) * t;
        g.fillStyle((Math.round(r) << 16) | (Math.round(gg) << 8) | Math.round(bb));
        g.fillRect(0, y, W, Math.min(step, yb - y));
      }
    };
    grad(0, y1, c0, c1);
    grad(y1, y2, c1, c2);
    g.fillStyle(c2); g.fillRect(0, y2, W, H - y2);
  }

  private drawHero(dt: number) {
    const tier = displayTier();
    this.setTier(tier);
    const pose = legPose();
    // on a ladder: back view (2-frame arm cycle while moving); cape / tail / spellbook are folded into or hidden by it
    if (state.climb) this.base.setTexture('hero-' + tier + '-back-' + (state.climbMoving ? (pose === 7 ? 2 : 1) : 0));
    else this.base.setTexture('hero-' + tier + '-base-' + pose);
    { const S0 = v2Sprite(tier); this.cape.setVisible(!!S0.layers.cape && !state.climb); this.tail.setVisible(!!S0.layers.tail && !state.climb); this.book.setVisible(!state.climb); }
    const px = Math.round(state.px), py = Math.round(state.py);
    this.hero.setPosition(px, -(70 + py) - 18);
    // squash / flip (origin at the feet); idle bob 0.9s steps; walk frames 1 and 3 lift 1px
    let sx = state.facing as number, sy = 1, dy = 0;
    if (state.climb) sx = 1;
    else if (state.air) { sx = state.facing * (state.vy > 0 ? 0.92 : 1.06); sy = state.vy > 0 ? 1.1 : 0.94; }
    else if (state.moving) dy = (pose === 1 || pose === 3) ? -1 : 0;
    else dy = (this.t / 0.9) % 1 >= 0.5 ? -2 : 0;
    this.body.setPosition(0, dy).setScale(sx, sy);

    const S = v2Sprite(tier), B = v2Box(tier), P = B.P;
    const X = (gx: number) => B.ox + gx * P - HERO_W / 2, Y = (gy: number) => B.oy + gy * P - HERO_H;
    const t = this.t;
    // cape: hangs still when idle, trails backward while moving (eases over ~150ms) + flutter
    if (S.layers.cape) {
      const deg = tier === 3 ? 10 : 6;
      const target = state.hmove ? deg : 0;
      this.capeCr += (target - this.capeCr) * Math.min(1, dt / 0.06);
      const cf = state.hmove ? 2 - 2 * Math.cos((t / 0.55) * Math.PI * 2) : 0;
      this.cape.setRotation((this.capeCr + cf) * Math.PI / 180);
    }
    if (S.layers.tail) this.tail.setRotation((0.5 - 4.5 * Math.cos((t / 2.8) * Math.PI * 2)) * Math.PI / 180);
    this.book.y = -HERO_H + (-1 + Math.cos((t / 3.6) * Math.PI * 2)) ;

    // aura (behind): rune circle, staff glow, archmage wing blocks
    const g = this.fxBack;
    g.clear();
    const cx = 28 - HERO_W / 2, cy = 69 - HERO_H;
    if (tier > 0) {
      g.lineStyle(1, hex(S.ring), 0.85);
      g.strokeEllipse(cx, cy, 54, 54 * 0.35);
      const rot = (t / 14) * Math.PI * 2;
      g.lineStyle(1, hex(S.ring2), 0.9);
      for (let d = 0; d < 24; d++) {
        if (d % 2) continue;
        const a0 = rot + d * Math.PI / 12, a1 = a0 + Math.PI / 12;
        g.beginPath();
        g.moveTo(cx + 17 * Math.cos(a0), cy + 17 * Math.sin(a0) * 0.35);
        g.lineTo(cx + 17 * Math.cos(a1), cy + 17 * Math.sin(a1) * 0.35);
        g.strokePath();
      }
      g.fillStyle(hex(S.rune), 1);
      for (let i = 0; i < 8; i++) {
        const an = rot + i * Math.PI / 4;
        g.fillRect(cx + 24 * Math.cos(an) - 1, cy + 24 * Math.sin(an) * 0.35 - 1, 2, 2);
      }
    }
    const glow = [null, [0x6fa8ff, 0.4, 29, 5.5, 1.6], [0xff8a5c, 0.45, 29.5, 6, 1.8], [0xeef0f5, 0.35, 32, 26, 2]][tier] as number[] | null;
    if (glow) {
      const q = 0.5 - 0.5 * Math.cos((t / glow[4]) * Math.PI * 2);
      g.fillStyle(glow[0], glow[1] * (0.5 + 0.5 * q));
      g.fillCircle(X(glow[2]), Y(glow[3]), 5 * (0.85 + 0.35 * q));
    }
    if (tier === 3) {
      let wi = 0;
      for (let wr = 0; wr < 3; wr++) for (let wk = 0; wk < 4 - wr; wk++) {
        const szg = (14 - wk * 2) / 5, gl = 7.5 - szg - wk * 3 - wr * 0.6, gt = 29 + wr * 4.2 - wk * (2 - wr * 0.6);
        const hov = -0.8 + 0.8 * Math.cos(((t + wi * 0.27) / 3) * Math.PI * 2);
        const col = wi % 2 ? 0x45454c : 0x2b2b2e;
        for (const lx of [X(gl), X(36 - gl - szg)]) {
          g.fillStyle(col, 1); g.fillRect(lx, Y(gt) + hov, szg * P, szg * P);
          g.lineStyle(1, 0xc9ccd3, 1); g.strokeRect(lx + 0.5, Y(gt) + hov + 0.5, szg * P - 1, szg * P - 1);
        }
        wi++;
      }
    }
    // front: blink lids, tier particles
    const f = this.fxFront;
    f.clear();
    const bp = (t % 4.2) / 4.2;
    if (!state.climb && bp > 0.93 && bp < 0.975) for (const b of S.blink) { f.fillStyle(hex(b[4]), 1); f.fillRect(X(b[0]), Y(b[1]), b[2] * P, b[3] * P); }
    const bx = (x: number) => x - HERO_W / 2, by = (y: number) => y - HERO_H;
    if (tier === 0) {
      [[12, 62, 2, 2.6, 0xf1e6c8], [22, 66, 2.4, 3, 0xe6d9b5], [36, 63, 2, 2.6, 0xf1e6c8], [46, 66, 2.4, 3, 0xe6d9b5]].forEach((p, i) => {
        const q = ((t + i * 1.3) / (4 + i)) % 1, a = q < 0.15 ? q / 0.15 : 1 - (q - 0.15) / 0.85;
        f.fillStyle(p[4], a); f.fillRect(bx(p[0]) + 5 * q, by(p[1]) - 36 * q, p[2], p[3]);
      });
    } else if (tier === 1) {
      [[8, 30, 3, 0x6fa8ff], [46, 34, 3.4, 0xcfe8ff], [10, 54, 2.6, 0x2f7fd6], [44, 18, 3, 0xcfe8ff]].forEach((p, i) => {
        const q = Math.sin(((t + i * 0.6) / (3 + i * 0.7)) * Math.PI * 2);
        f.fillStyle(p[3], 0.9); f.fillRect(bx(p[0]) + 1.6 * q, by(p[1]) - 3 * q, p[2], p[2]);
      });
    } else if (tier === 2) {
      [[14, 62, 2, 0xff8a5c], [40, 64, 2, 0xffb066], [24, 58, 1, 0xfff1c4], [34, 62, 1, 0xffd166]].forEach((p, i) => {
        const q = ((t + i * 0.7) / (3 + i * 0.6)) % 1, a = q < 0.15 ? q / 0.15 : 1 - (q - 0.15) / 0.85;
        f.fillStyle(p[3], a); f.fillRect(bx(p[0]) + (i % 2 ? -3.6 : 3.6) * q, by(p[1]) - 34 * q, p[2], p[2]);
      });
    } else {
      for (let i = 0; i < 3; i++) {
        const an = ((t + i * 1.1) / 3.3) * Math.PI * 2;
        f.fillStyle(0xdfe2ea, 1); f.fillRect(X(32) + 7 * Math.cos(an) - 1, Y(26) + 7 * Math.sin(an) - 1, 2, 2);
      }
      [[21, 9, 0], [24, 11, 2.3], [19, 13, 4.6]].forEach((cb) => {
        const an = ((t + cb[2]) / cb[1]) * Math.PI * 2;
        const x = X(18) + cb[0] * Math.cos(an), y = Y(40) + cb[0] * Math.sin(an);
        f.fillStyle(0xd5d8df, 1); f.fillRect(x, y - 1.3, 2.6, 0.8);
        f.fillStyle(0x9a9da6, 1); f.fillRect(x, y - 0.5, 1.3, 1.8);
        f.fillStyle(0x5d5f68, 1); f.fillRect(x + 1.3, y - 0.5, 1.3, 1.8);
      });
      f.fillStyle(0xeef0f5, (t / 1.6) % 1 < 0.5 ? 1 : 0.25); f.fillRect(bx(3), by(17), 2, 2);
      f.fillStyle(0xc9ccd3, ((t + 0.8) / 2.1) % 1 < 0.5 ? 1 : 0.25); f.fillRect(bx(52), by(26), 2, 2);
    }

    // latest unlocked title above the head
    const top = state.titles.length ? state.titles[state.titles.length - 1] : '';
    if (top !== this.titleText) {
      this.titleText = top;
      if (this.titleChip) { this.titleChip.destroy(); this.titleChip = null; }
      if (top) {
        const skin = top === 'Seal Breaker' ? ['#f2b632', '#1d3a6b', '#1b2040'] : top === 'Lamplighter' ? ['#2f7fd6', '#f4f8ff', '#ffb454']
          : top === 'Always Growing' ? ['#c9ccd3', '#2b2b2e', '#2b2b2e'] : ['#c8323a', '#f6ecd2', '#1b2040'];
        const L = labelTexture(this, top, 'background:' + skin[0] + ';color:' + skin[1] + ';border:2px solid ' + skin[2] + ";box-shadow:2px 2px 0 #000;font-family:'Pixelify Sans',monospace;font-size:11px;font-weight:700;letter-spacing:1px;white-space:nowrap;display:flex;box-sizing:border-box;padding:0 8px;", 8, 20, '700 11px ' + PIX, 1);
        this.titleChip = this.add.image(0, 0, L.key);
        this.hero.add(this.titleChip);
      }
    }
    if (this.titleChip) this.titleChip.setPosition(0, 18 - 112 - 10 + ((t / 0.9) % 1 >= 0.5 ? -2 : 0));
  }

  private drawAdvance() {
    const g = this.advG;
    g.clear();
    const a = sim.adv;
    if (!a) return;
    const e = performance.now() / 1000 - a.t0;
    const cx = Math.round(state.px), base = -(88 + Math.round(state.py)), cy = base - 36;
    // light column: fade in to 0.75 by 25%, widen 0.4 -> 1 -> 1.25, fade out
    const p = Math.min(1, e / 1.6);
    const op = p < 0.25 ? 0.75 * p / 0.25 : 0.75 * (1 - (p - 0.25) / 0.75);
    const sx = p < 0.25 ? 0.4 + 0.6 * p / 0.25 : 1 + 0.25 * (p - 0.25) / 0.75;
    g.fillStyle(0xffd166, 0.5 * op);
    g.fillRect(cx - 34 * sx, base - 380, 68 * sx, 380);
    // rings
    [0, 0.25, 0.5].forEach((d) => {
      const q = (e - d) / 1;
      if (q < 0 || q > 1) return;
      const k = 1 - (1 - q) * (1 - q);
      g.lineStyle(3 * (0.3 + 2.9 * k), 0xffd166, 1 - k);
      g.strokeCircle(cx, cy, 38.5 * (0.3 + 2.9 * k));
    });
    // rays
    const q = (e - 0.1) / 0.8;
    if (q >= 0 && q <= 1) {
      const k = 1 - (1 - q) * (1 - q), off = 14 + 72 * k;
      for (let i = 0; i < 8; i++) {
        const an = i * Math.PI / 4;
        g.lineStyle(4, i % 2 ? 0xfff1c4 : 0xffd166, 1 - k);
        g.beginPath();
        g.moveTo(cx + off * Math.cos(an), cy + off * Math.sin(an));
        g.lineTo(cx + (off + 16) * Math.cos(an), cy + (off + 16) * Math.sin(an));
        g.strokePath();
      }
    }
  }
}
