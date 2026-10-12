// DOM UI overlays: top bar (minimap, sound, RÉSUMÉ, PROFILE), map banner, toasts, legend, walk hint,
// JOB ADVANCED, QUEST COMPLETE card, title chip, NPC dialogue, CHARACTER INFO window, résumé overlay.
import { state, setState, subscribe, on, emit } from '../state.ts';
import { PROFILE, STAGES, MAPS, MENTORS, PORTAL, TRIALS, WORLD, type TrialKind } from '../content.ts';
import { crestDataURL } from './crests.ts';
import { profileHTML, toggleFlip } from './profile.ts';
import { heroCanvas, heroCrop, npcCanvas } from '../render/textures.ts';
import { esc, ACC, FP, titleSkin, rgba } from './util.ts';

export { registerSW } from './sw.ts';
export { crestDataURL } from './crests.ts';

const CLOSE_X = (c: string) => `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges"><path d="M1 1 L13 13 M13 1 L1 13" style="stroke:${c};stroke-width:3;fill:none;"/></svg>`;
const SND_ON = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" shape-rendering="crispEdges" style="flex:none;fill:currentColor;"><rect x="1" y="5" width="4" height="6"/><polygon points="5,5 9,1 9,15 5,11"/><rect x="11" y="6" width="1" height="4"/><rect x="13" y="4" width="1" height="8"/></svg>';
const SND_OFF = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" shape-rendering="crispEdges" style="flex:none;fill:currentColor;"><rect x="1" y="5" width="4" height="6"/><polygon points="5,5 9,1 9,15 5,11"/><polygon points="10,5 11,4 15,10 14,11"/><polygon points="14,4 15,5 11,11 10,10"/></svg>';
const KEYCAP = "display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 3px;box-sizing:border-box;background:#f4f1e8;color:#1b2040;border:2px solid #0f1226;font-family:'Pixelify Sans',monospace;font-size:11px;font-weight:700;line-height:1;flex:none;";
const WORLD_W = 3900;

function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}
/** Fill the empty sprite slots (profile avatar, journey portraits, mentor portrait) with canvases. */
function hydrateSprites(root: HTMLElement): void {
  const put = (host: Element, c: HTMLCanvasElement) => {
    c.style.cssText = 'display:block;image-rendering:pixelated;width:100%;height:100%;';
    host.replaceChildren(c);
  };
  root.querySelectorAll<HTMLElement>('[data-avatar]').forEach((e) => {
    put(e, heroCanvas(Number(e.dataset.avatar) || 0, 2.2));
  });
  root.querySelectorAll<HTMLElement>('[data-portrait]').forEach((e) => {
    const t = Number(e.dataset.portrait) || 0;
    const cr = heroCrop(t, 2, 64, 64);
    cr.t -= 18; // lift the sprite so the head sits in the middle of the frame
    put(e, heroCanvas(t, 2, { crop: cr }));
  });
  root.querySelectorAll<HTMLElement>('[data-portrait-npc]').forEach((e) => {
    if (e.dataset.portraitNpc === '') return;
    const i = Number(e.dataset.portraitNpc) || 0;
    put(e, npcCanvas(i, 3, heroCrop(3, 3, 104, 104)));
  });
}

/** Re-render a slot only when its HTML actually changed (state ticks every frame). */
function patch(slot: HTMLElement, html: string): void {
  if ((slot as any)._html === html) return;
  (slot as any)._html = html;
  const scroll = slot.querySelector('[data-scroll]') as HTMLElement | null;
  const top = scroll ? scroll.scrollTop : 0;
  const focusAct = (document.activeElement as HTMLElement | null)?.closest?.('[data-act]') as HTMLElement | null;
  const fkey = focusAct && slot.contains(focusAct) ? focusAct.dataset.act + '|' + (focusAct.dataset.i || focusAct.dataset.tab || focusAct.dataset.kind || '') : '';
  slot.innerHTML = html;
  hydrateSprites(slot);
  const s2 = slot.querySelector('[data-scroll]') as HTMLElement | null;
  if (s2) s2.scrollTop = top;
  if (fkey) {
    const [act, k] = fkey.split('|');
    const n = Array.from(slot.querySelectorAll<HTMLElement>('[data-act="' + act + '"]')).find((b) => (b.dataset.i || b.dataset.tab || b.dataset.kind || '') === k);
    n?.focus();
  }
}

let ui: HTMLElement;
const slots: Record<string, HTMLElement> = {};
const timers: Record<string, number> = {};
function later(key: string, ms: number, fn: () => void): void {
  clearTimeout(timers[key]);
  timers[key] = window.setTimeout(fn, ms);
}

// ---------- actions ----------
function openProfile(open: boolean): void {
  if (open === state.profileOpen) return;
  emit('sfx', { name: 'ui', a: open });
  if (open) {
    setState({ profileOpen: true, profileAlert: false, profileTab: 'journey' });
    emit('log', { text: '[System] Opened Character window.' });
  } else setState({ profileOpen: false });
}
function openResume(open: boolean): void {
  if (open === state.resumeOpen) return;
  setState({ resumeOpen: open });
}
function closeTalk(): void { if (state.talk !== null) setState({ talk: null }); }

// ---------- top bar ----------
function topHTML(): string {
  const tier = Math.max(0, Math.min(3, state.zone));
  const m = MAPS[tier];
  const pct = (x: number) => Math.max(0, Math.min(100, x / WORLD_W * 100));
  const segs = MAPS.map((mp, i) => `<button type="button" data-act="mini" data-i="${i}" aria-label="Go to Map ${i + 1}, ${esc(mp.name)}, ${esc(mp.short)}" style="position:absolute;top:0;bottom:0;left:${pct(i * 960).toFixed(2)}%;width:${(960 / WORLD_W * 100).toFixed(2)}%;padding:0;margin:0;border:0;border-radius:0;box-sizing:border-box;cursor:pointer;background:${rgba(mp.a, i === tier ? 0.22 : 0.07)};box-shadow:inset 0 0 0 ${i === tier ? 2 : 1}px ${i === tier ? mp.a : '#2a3166'};"><span class="cq-mini-lab" style="position:absolute;left:0;right:0;bottom:2px;text-align:center;${FP}font-size:10px;font-weight:700;letter-spacing:1px;color:${i === tier ? '#f4f1e8' : '#c9c4d8'};">${esc(mp.short)}</span></button>`).join('');
  const mk = (l: string, b: number, w: number, h: number, bg: string, ex = '') => `<div aria-hidden="true" style="position:absolute;pointer-events:none;left:${l};bottom:${b}px;width:${w}px;height:${h}px;background:${bg};box-sizing:border-box;${ex}"></div>`;
  let marks = '';
  MAPS.forEach((mp, i) => { marks += mk((pct(i * 960) + 0.4).toFixed(2) + '%', 16, 0, 2, mp.g.top, 'width:' + (960 / WORLD_W * 100 - 0.8).toFixed(2) + '%;'); });
  WORLD.platforms.forEach((p) => { marks += mk(pct(p.x).toFixed(2) + '%', 18 + Math.round(p.top / 230 * 26), 0, 2, MAPS[p.map].p.s, 'width:' + (p.w / WORLD_W * 100).toFixed(2) + '%;'); });
  WORLD.GATES.forEach((x, i) => { marks += mk('calc(' + pct(x).toFixed(2) + '% - 1px)', 14, 2, 34, MAPS[i + 1].a); });
  MENTORS.forEach((n, i) => { marks += mk('calc(' + pct(i * 960 + n.x).toFixed(2) + '% - 3px)', 20 + Math.round(n.h / 230 * 26), 6, 6, MAPS[i].a, i === tier ? 'border:1px solid #f4f1e8;' : ''); });
  marks += mk('calc(' + pct(PORTAL.x).toFixed(2) + '% - 4px)', 20, 8, 8, '#ef6f6c', 'transform:rotate(45deg);border:1px solid #f4f1e8;');
  marks += mk('calc(' + pct(3800).toFixed(2) + '% - 4px)', 14, 8, 6, '#6c6780');
  marks += mk('calc(' + pct(3800).toFixed(2) + '% - 3px)', 20, 6, 5, 'transparent', 'border:2px solid #6c6780;border-bottom:0;border-radius:3px 3px 0 0;');

  const sOn = state.musicOn || state.sfxOn;
  const sAria = state.soundNA ? 'Sound unavailable' : (sOn ? 'Sound on, tap to mute' : 'Sound off, tap to turn on');
  const sStyle = 'flex:none;display:inline-flex;align-items:center;justify-content:center;width:44px;min-height:44px;padding:0;box-sizing:border-box;border-radius:0;cursor:pointer;box-shadow:3px 3px 0 #000;' +
    (sOn ? 'background:' + ACC + ';color:#1b2040;border:3px solid #1b2040;' : 'background:rgba(27,32,64,0.92);color:' + ACC + ';border:3px solid ' + ACC + ';');
  const pOpen = state.profileOpen;
  const alert = state.profileAlert && !pOpen;
  const pStyle = "position:relative;flex:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 12px;box-sizing:border-box;font-family:'Pixelify Sans',monospace;font-size:14px;font-weight:700;letter-spacing:1px;border-radius:0;cursor:pointer;box-shadow:3px 3px 0 #000;" +
    (pOpen ? 'color:#1b2040;background:' + ACC + ';border:3px solid ' + ACC + ';' : 'color:' + ACC + ';background:rgba(27,32,64,0.92);border:3px solid ' + ACC + ';') +
    (alert ? 'animation:ringpulse 1.3s steps(1) infinite;' : '');
  return `<div style="position:absolute;left:12px;right:12px;top:12px;z-index:8;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;pointer-events:none;">
  <div class="cq-mini" data-no-walk="1" style="pointer-events:auto;flex:0 1 300px;width:300px;min-width:0;box-sizing:border-box;background:rgba(27,32,64,0.88);border:3px solid ${ACC};box-shadow:3px 3px 0 #000;">
    <div class="cq-mini-title" style="padding:3px 8px;background:rgba(42,49,102,0.95);color:${ACC};${FP}font-size:11px;font-weight:700;letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">MAP ${tier + 1}/4 &middot; ${esc(m.name)}</div>
    <div style="position:relative;height:64px;">${segs}${marks}<div aria-hidden="true" data-mini-dot style="position:absolute;left:0;bottom:12px;width:9px;height:9px;box-sizing:border-box;background:#ef6f6c;border:2px solid #f4f1e8;pointer-events:none;"></div></div>
  </div>
  <div class="cq-right" style="flex:none;display:flex;flex-direction:row;align-items:flex-start;gap:8px;pointer-events:auto;">
    <div style="flex:none;display:flex;flex-direction:row;align-items:flex-start;gap:8px;">
      <button type="button" data-no-walk="1" data-snd="1" data-act="sound" aria-pressed="${sOn}" aria-label="${sAria}" aria-keyshortcuts="M" title="${sAria} (M)" style="${sStyle}">${sOn ? SND_ON : SND_OFF}</button>
      <button type="button" data-no-walk="1" data-act="resume" title="Résumé: plain list of education and experience" style="white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 12px;box-sizing:border-box;${FP}font-size:14px;font-weight:700;color:${ACC};text-decoration:none;background:rgba(27,32,64,0.92);border:3px solid ${ACC};border-radius:0;cursor:pointer;box-shadow:3px 3px 0 #000;"><svg aria-hidden="true" width="14" height="16" viewBox="0 0 14 16" shape-rendering="crispEdges" style="flex:none;fill:currentColor;"><path d="M1 0h9l4 4v12H1z M3 6h8v1H3z M3 9h8v1H3z M3 12h6v1H3z" fill-rule="evenodd"/></svg><span>RÉSUMÉ</span></button>
    </div>
    <button type="button" data-no-walk="1" data-fly="status" data-act="profile" aria-expanded="${pOpen}" aria-keyshortcuts="P" style="${pStyle}">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges" style="flex:none;fill:currentColor;"><rect x="1" y="2" width="12" height="3"/><rect x="1" y="7" width="8" height="3"/><rect x="1" y="12" width="14" height="3"/></svg>
      <span>PROFILE</span><span aria-hidden="true" class="cq-keycap" style="${KEYCAP}">P</span>
      ${alert ? `<span aria-hidden="true" style="position:absolute;right:-9px;top:-9px;width:20px;height:20px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:#ef6f6c;color:#1b2040;border:2px solid #1b2040;border-radius:50%;${FP}font-size:13px;font-weight:700;line-height:1;animation:qbob 1.1s steps(1) infinite;">!</span>` : ''}
    </button>
  </div>
</div>`;
}

// ---------- legend + walk hint ----------
function legendHTML(): string {
  const engaged = state.focused || state.isTouch;
  if (!engaged || state.legendDone) return '';
  const long = state.isTouch ? 'Hold left or right side to walk · swipe up or JUMP to jump · TALK near a !' : '← → / A D move · Space jump · ↑ / W talk · P profile · Esc close';
  const short = state.isTouch ? 'Hold a side to walk · swipe up to jump' : '← → move · Space jump · P profile';
  return `<div aria-hidden="true" style="max-width:100%;box-sizing:border-box;padding:6px 12px;text-align:center;background:rgba(15,18,38,0.82);border:2px solid #2a3166;color:#f4f1e8;font-family:'Space Mono',monospace;font-size:12px;line-height:1.5;"><span class="cq-lg-long">${esc(long)}</span><span class="cq-lg-short">${esc(short)}</span></div>`;
}
function hintHTML(): string {
  if (state.focused || state.isTouch) return '';
  return `<div class="cq-hint" aria-hidden="true" style="position:absolute;left:50%;top:max(38%,260px);transform:translate(-50%,-50%);z-index:9;pointer-events:none;display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 16px;max-width:calc(100% - 24px);box-sizing:border-box;background:rgba(15,18,38,0.88);border:3px solid ${ACC};box-shadow:4px 4px 0 #000;color:#f4f1e8;${FP}font-size:17px;font-weight:700;letter-spacing:1px;">
  <svg aria-hidden="true" width="28" height="18" viewBox="0 0 28 18" shape-rendering="crispEdges"><rect x="1" y="1" width="26" height="16" style="fill:none;stroke:#f4f1e8;stroke-width:2;"/><rect x="4" y="4" width="3" height="3" style="fill:#f4f1e8;"/><rect x="9" y="4" width="3" height="3" style="fill:#f4f1e8;"/><rect x="14" y="4" width="3" height="3" style="fill:#f4f1e8;"/><rect x="19" y="4" width="3" height="3" style="fill:#f4f1e8;"/><rect x="7" y="11" width="14" height="3" style="fill:#ffd166;"/></svg>
  <span class="cq-hint-long">Click or tap the world to play</span><span class="cq-hint-short">Tap to play</span></div>`;
}

// ---------- dialogue ----------
const PORTAL_FIG = '<svg aria-hidden="true" width="70" height="90" viewBox="0 0 70 90" shape-rendering="crispEdges" style="margin-bottom:6px;"><ellipse cx="35" cy="45" rx="30" ry="40" style="fill:#ef6f6c;"/><ellipse cx="35" cy="45" rx="23" ry="33" style="fill:#ffd166;"/><ellipse cx="35" cy="45" rx="16" ry="26" style="fill:#f4f1e8;"/><ellipse cx="35" cy="45" rx="9" ry="18" style="fill:#1b2040;"/></svg>';
const REPLAY_STYLE = [
  'color:#f2b632;background:#1d3a6b;box-shadow:inset 2px 2px 0 #2a4e8a,3px 3px 0 #1b2040;',
  'color:#0b1020;background:#2f7fd6;box-shadow:inset 2px 2px 0 #7fb8ff,3px 3px 0 #1b2040;',
  'color:#f6ecd2;background:#c8323a;box-shadow:inset 2px 2px 0 #e0626a,3px 3px 0 #1b2040;',
  'color:#c9ccd3;background:#2b2b2e;box-shadow:inset 2px 2px 0 #4a4a52,3px 3px 0 #1b2040;'
];
function trialOf(mentor: number): TrialKind {
  return (Object.keys(TRIALS) as TrialKind[]).find((k) => TRIALS[k].mentor === mentor) || 'stk';
}
function talkHTML(): string {
  const talk = state.talk;
  if (talk === null || state.trial) return '';
  const ti = Math.min(talk, 3);
  const dm = MAPS[ti];
  const isPortal = talk === 4;
  const name = isPortal ? PORTAL.name : MENTORS[ti].name;
  const line = isPortal ? PORTAL.line : MENTORS[ti].line;
  const zone = 'Map ' + (ti + 1) + ' · ' + dm.name;
  const btnP = `display:inline-flex;align-items:center;min-height:44px;padding:0 14px;box-sizing:border-box;${FP}font-size:16px;font-weight:700;color:#1b2040;text-decoration:none;background:${ACC};border:3px solid #1b2040;box-shadow:inset 2px 2px 0 rgba(255,255,255,0.5),3px 3px 0 #1b2040;cursor:pointer;border-radius:0;`;
  let quest = '';
  if (!isPortal) {
    const q = ti === 3 ? STAGES[3].quest + ' at ' + STAGES[3].org : STAGES[ti].quest;
    const chip = ti === 3 ? 'background:#ef6f6c;color:#1b2040;border:2px solid #1b2040;' : 'background:#1b2040;color:' + ACC + ';border:2px solid #1b2040;';
    quest = `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-top:10px;padding:8px 10px;background:#e6e0cd;border:2px solid #1b2040;">
      <span style="flex:1 1 150px;min-width:0;${FP}font-size:13px;font-weight:700;letter-spacing:1px;">QUEST &middot; ${esc(q)}</span>
      <span style="flex:none;padding:3px 8px;${FP}font-size:12px;font-weight:700;letter-spacing:1px;${chip}">${ti === 3 ? 'In progress' : 'Completed'}</span></div>`;
  }
  const kind = trialOf(ti);
  const showReplay = !isPortal && (ti === 3 || (state.best[kind] || 0) > 0);
  const btns = (isPortal
    ? `<a href="mailto:${esc(PROFILE.email)}" style="${btnP}">Contact &#9656;</a><button type="button" data-act="resume" style="${btnP}">Résumé &#9656;</button>`
    : `<button type="button" data-act="next" style="min-height:44px;padding:0 14px;${FP}font-size:16px;font-weight:700;color:${ACC};background:#2a3166;border:3px solid #1b2040;border-radius:0;cursor:pointer;box-shadow:inset 2px 2px 0 #3d4691,3px 3px 0 #1b2040;">${ti === 3 ? 'To the portal ▸' : 'Next mentor ▸'}</button>`) +
    (showReplay ? `<button type="button" data-act="play" data-kind="${kind}" style="min-height:44px;padding:0 14px;${FP}font-size:16px;font-weight:700;border:3px solid #1b2040;border-radius:0;cursor:pointer;${REPLAY_STYLE[ti]}">Play ${esc(TRIALS[kind].name)}</button>` : '') +
    `<button type="button" data-act="endChat" style="min-height:44px;padding:0 14px;${FP}font-size:16px;font-weight:700;color:#1b2040;background:#e6e0cd;border:3px solid #1b2040;border-radius:0;cursor:pointer;box-shadow:inset 2px 2px 0 #fff,3px 3px 0 #1b2040;">End chat</button>`;
  return `<div role="dialog" aria-label="NPC dialogue" data-no-walk="1" class="cq-modal" style="position:absolute;left:0;right:0;margin:0 auto;top:116px;max-height:calc(100% - 128px);overflow-y:auto;z-index:20;width:min(560px,94%);box-sizing:border-box;background:#f4f1e8;border:3px solid #1b2040;box-shadow:inset 2px 2px 0 #fff,inset -2px -2px 0 #cfc8b2,5px 5px 0 #000;color:#1b2040;">
  <div style="display:flex;align-items:center;justify-content:space-between;min-height:44px;padding-left:14px;background:${dm.bar};border-bottom:3px solid #1b2040;color:${dm.barTx};${FP}font-size:17px;font-weight:700;letter-spacing:2px;">
    <span>${esc(name)}</span>
    <button type="button" aria-label="Close" data-act="endChat" style="width:44px;height:44px;padding:0;border:0;border-left:3px solid #1b2040;background:#1b2040;cursor:pointer;display:flex;align-items:center;justify-content:center;">${CLOSE_X(dm.barTx)}</button>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:16px;padding:16px;">
    <div data-portrait-npc="${isPortal ? '' : ti}" style="flex:none;width:104px;height:104px;box-sizing:border-box;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;background:${dm.port};border:3px solid #1b2040;box-shadow:inset 2px 2px 0 ${dm.portHi};">${isPortal ? PORTAL_FIG : ''}</div>
    <div style="flex:1 1 220px;min-width:0;">
      <div style="${FP}font-size:13px;font-weight:700;letter-spacing:2px;color:#8a6400;text-transform:uppercase;">${esc(zone)}</div>
      <p style="margin:6px 0 0;font-size:14px;line-height:1.6;">${esc(line)}</p>
      ${quest}
    </div>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;padding:0 16px 16px;">${btns}</div>
</div>`;
}

// ---------- résumé overlay ----------
function syncResume(): void {
  const slot = slots.resume;
  if (!state.resumeOpen) { if (slot.firstChild) slot.innerHTML = ''; return; }
  if (slot.firstChild) return;
  slot.appendChild(el(`<div class="cq-resume" role="dialog" aria-modal="true" aria-label="Résumé">
  <div style="flex:none;display:flex;justify-content:flex-start;padding:12px 16px;background:#f6f3ea;border-bottom:2px solid #c9c2ad;">
    <button type="button" data-act="closeResume" style="display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;box-sizing:border-box;${FP}font-size:15px;font-weight:700;color:#ffd166;background:#1b2040;border:3px solid #1b2040;border-radius:0;cursor:pointer;box-shadow:3px 3px 0 #ffd166;">&#9664; Back to the game</button>
  </div>
  <iframe title="Résumé" src="resume/?embedded=1"></iframe>
</div>`));
  (slot.querySelector('[data-act="closeResume"]') as HTMLElement).focus();
}

// ---------- transient: banner, toast, JOB ADVANCED, reward ----------
function showBanner(map: number): void {
  const z = Math.max(0, Math.min(3, map));
  const bm = MAPS[z], st = STAGES[z];
  const n = el(`<div aria-hidden="true" style="flex:none;max-width:100%;min-width:min(250px,100%);padding:8px 22px 10px;text-align:center;box-sizing:border-box;background:rgba(15,18,38,0.92);border:3px solid ${bm.a};box-shadow:4px 4px 0 #000;animation:mapin 2.1s linear both;">
  <div style="${FP}font-size:12px;font-weight:700;letter-spacing:3px;color:${bm.tx};">MAP ${z + 1}</div>
  <div class="cq-bname" style="${FP}font-size:30px;font-weight:700;letter-spacing:3px;line-height:1.15;color:#f4f1e8;text-shadow:3px 3px 0 #000;">${esc(bm.name)}</div>
  <div style="margin-top:2px;font-size:12px;color:#f4f1e8;">${esc(st.jobTitle)} &middot; ${esc(st.org)}</div></div>`);
  slots.banner.replaceChildren(n);
  later('banner', 2100, () => slots.banner.replaceChildren());
}

function showToast(text: string): void {
  const m = /^(\[[^\]]+\])\s*(.*)$/.exec(text);
  const prefix = m ? m[1] : '';
  const color = prefix === '[System]' ? ACC : (prefix === '[Tip]' ? '#ef6f6c' : '#9cc7ff');
  const n = el(`<div style="display:block;max-width:100%;box-sizing:border-box;padding:6px 12px;text-align:center;background:rgba(15,18,38,0.92);border:2px solid #2a3166;box-shadow:3px 3px 0 #000;color:#f4f1e8;font-family:'Space Mono',monospace;font-size:12px;line-height:1.5;animation:toasta 2.5s linear both;"><span style="font-weight:700;color:${color};">${esc(prefix)}</span> ${esc(m ? m[2] : text)}</div>`);
  slots.toast.replaceChildren(n);
  later('toast', 2500, () => slots.toast.replaceChildren());
}

function showAdvance(tier: number): void {
  const z = Math.max(0, Math.min(3, tier));
  const n = el(`<div aria-hidden="true" style="position:absolute;left:0;right:0;top:max(304px,34%);z-index:13;pointer-events:none;text-align:center;padding:0 12px;box-sizing:border-box;animation:jobin 1.7s linear both;">
  <div style="${FP}font-size:clamp(30px,6vw,56px);font-weight:700;letter-spacing:4px;line-height:1.1;color:#ffd166;text-shadow:4px 4px 0 #0f1226,6px 6px 0 #000;">JOB ADVANCED!</div>
  <div style="display:inline-block;margin-top:10px;padding:6px 16px;background:rgba(15,18,38,0.94);border:3px solid #ffd166;box-shadow:4px 4px 0 #000;${FP}font-size:20px;font-weight:700;letter-spacing:1px;color:#f4f1e8;">${esc(STAGES[z].jobTitle)} &middot; ${esc(STAGES[z].cls)}</div></div>`);
  slots.job.replaceChildren(n);
  later('job', 1700, () => slots.job.replaceChildren());
}

// QUEST COMPLETE card (3.3s), then the crest flies to the PROFILE button (0.8s), then it lands.
function showReward(idx: number, bonus: number): void {
  const i = Math.max(0, Math.min(3, idx));
  const c = STAGES[i];
  const m = MAPS[Math.max(0, Math.min(3, state.zone))];

  const n = el(`<div role="status" style="position:absolute;left:0;right:0;margin:0 auto;top:126px;z-index:14;width:min(500px,94%);box-sizing:border-box;pointer-events:none;animation:cardin 0.5s ease-out both;">
  <div aria-hidden="true" data-fade style="position:absolute;inset:0;background:#f4f1e8;border:3px solid ${m.bar};box-shadow:inset 2px 2px 0 #fff,inset -2px -2px 0 #cfc8b2,5px 5px 0 #000;"></div>
  <div data-fade style="position:relative;display:flex;align-items:center;min-height:36px;padding:0 14px;background:${m.bar};border-bottom:3px solid #1b2040;color:${m.barTx};${FP}font-size:16px;font-weight:700;letter-spacing:3px;">QUEST COMPLETE</div>
  <div style="position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;padding:14px;color:#1b2040;">
    <div aria-hidden="true" data-crest-src style="position:relative;flex:none;z-index:2;"><img class="cq-crest" alt="" src="${crestDataURL(i)}" width="100" height="116"></div>
    <div data-fade style="flex:1 1 200px;min-width:0;">
      <div style="${FP}font-size:18px;font-weight:700;line-height:1.2;">Quest complete: ${esc(c.quest)}</div>
      <div style="margin-top:6px;${FP}font-size:15px;font-weight:700;letter-spacing:1px;color:#8a6400;">Reward: ${esc(c.crest)}</div>
      <div style="margin-top:4px;font-size:13px;line-height:1.5;">${esc(c.title)} &middot; ${esc(c.org)}</div>
      ${c.rewardExp ? `<div style="display:inline-block;margin-top:8px;padding:3px 10px;background:#1b2040;color:#ffd166;${FP}font-size:15px;font-weight:700;letter-spacing:1px;">${esc(c.rewardExp)}</div>` : ''}
      ${bonus > 0 ? `<div style="margin-top:6px;${FP}font-size:15px;font-weight:700;letter-spacing:1px;color:#a3262e;">Trial bonus: +${bonus} EXP</div>` : ''}
    </div>
  </div></div>`);
  slots.reward.replaceChildren(n);
  later('rewardFly', 3300, () => {

    const src = n.querySelector('[data-crest-src]') as HTMLElement;
    const tgt = ui.querySelector('[data-fly="status"]') as HTMLElement | null;
    let fx = 0, fy = 0;
    if (src && tgt) {
      const ra = src.getBoundingClientRect(), rb = tgt.getBoundingClientRect();
      fx = Math.round(rb.left + rb.width / 2 - (ra.left + ra.width / 2));
      fy = Math.round(rb.top + rb.height / 2 - (ra.top + ra.height / 2));
    }
    n.style.animation = 'none';
    n.querySelectorAll<HTMLElement>('[data-fade]').forEach((f) => { f.style.animation = 'cardout 0.35s ease-in both'; });
    src.style.setProperty('--fx', fx + 'px');
    src.style.setProperty('--fy', fy + 'px');
    src.style.animation = 'crestfly 0.8s ease-in both';
  });
  later('rewardLand', 4100, () => {
    slots.reward.replaceChildren();
  });
}

// ---------- title chip over the player (camera = mockup's CSS clamp: player near 40% of width) ----------
function syncTitleChip(): void {
  const chip = slots.title;
  const t = state.titles.length ? state.titles[state.titles.length - 1] : '';
  if (!t) { if (chip.firstChild) chip.innerHTML = ''; return; }
  if ((chip as any)._t !== t) {
    (chip as any)._t = t;
    const k = titleSkin(t);
    chip.innerHTML = `<div aria-hidden="true" style="position:absolute;left:0;bottom:0;translate:-50% 0;white-space:nowrap;padding:0 6px;height:16px;line-height:16px;background:${k.bg};color:${k.tx};border:2px solid ${k.bd};box-shadow:2px 2px 0 #000;${FP}font-size:11px;font-weight:700;letter-spacing:1px;animation:bob 0.9s steps(1) infinite;">${esc(t)}</div>`;
  }
  const W = ui.clientWidth || window.innerWidth;
  const camL = Math.max(W - WORLD.WMAX, Math.min(0.4 * W - state.px, 100));
  chip.style.transform = `translate(${Math.round(camL + state.px)}px, ${-Math.round(70 + state.py + 112)}px)`;
}

// ---------- main ----------
function render(): void {
  patch(slots.top, topHTML());
  const dot = slots.top.querySelector('[data-mini-dot]') as HTMLElement | null;
  if (dot) dot.style.left = 'calc(' + Math.max(0, Math.min(100, state.px / WORLD_W * 100)).toFixed(2) + '% - 5px)';
  patch(slots.legend, legendHTML());
  patch(slots.hint, hintHTML());
  patch(slots.talk, talkHTML());
  patch(slots.profile, profileHTML());
  slots.title.style.display = state.trial || state.profileOpen ? 'none' : '';
  syncTitleChip();
  syncResume();
}

function onClick(e: MouseEvent): void {
  const b = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
  if (!b || !ui.contains(b)) return;
  const act = b.dataset.act;
  const i = Number(b.dataset.i);
  switch (act) {
    case 'sound': emit('soundToggle', {}); break;
    case 'resume': e.preventDefault(); openResume(true); break;
    case 'closeResume': openResume(false); break;
    case 'profile': openProfile(!state.profileOpen); break;
    case 'closeProfile': openProfile(false); break;
    case 'tab': emit('sfx', { name: 'ui', a: true }); setState({ profileTab: b.dataset.tab as typeof state.profileTab }); break;
    case 'flip': toggleFlip(i); render(); break;
    case 'mini': emit('walkTo', { i, talk: false }); break;
    case 'endChat': closeTalk(); break;
    case 'next': {
      const t = state.talk;
      if (t !== null && t < 4) { setState({ talk: null }); emit('walkTo', { i: t + 1, talk: true }); }
      break;
    }
    case 'play': {
      const kind = b.dataset.kind as TrialKind;
      setState({ talk: null, profileOpen: false });
      emit('trialOffer', { kind, gate: false });
      break;
    }
  }
  // Mouse clicks hand focus back to the game so movement keys keep working (keyboard activation keeps focus).
  if (e.detail !== 0 && act !== 'resume' && !state.profileOpen && state.talk === null) {
    (document.querySelector('#game canvas') as HTMLElement | null)?.focus?.();
  }
}

function onKey(e: KeyboardEvent): void {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (state.trial) return; // trials own the keyboard
  if (e.code === 'Escape') {
    if (state.resumeOpen) { openResume(false); e.preventDefault(); }
    else if (state.profileOpen) { openProfile(false); e.preventDefault(); }
    else if (state.talk !== null) { closeTalk(); e.preventDefault(); }
    return;
  }
  if (state.resumeOpen || e.repeat) return;
  if (e.code === 'KeyP' || e.code === 'KeyH') { openProfile(!state.profileOpen); e.preventDefault(); }
}

/** Mount all DOM overlays into `root` (#ui). */
export function initUI(root: HTMLElement): void {
  ui = root;
  const mk = (name: string, style: string) => { const d = document.createElement('div'); d.dataset.slot = name; if (style) d.setAttribute('style', style); slots[name] = d; return d; };
  const center = mk('center', 'position:absolute;left:0;right:0;top:116px;z-index:12;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 12px;box-sizing:border-box;pointer-events:none;');
  center.append(mk('legend', 'display:contents;'), mk('banner', 'display:contents;'));
  const live = mk('toast', 'max-width:100%;');
  live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-label', 'System log');
  center.append(live);
  root.append(
    mk('title', 'position:absolute;left:0;top:100%;z-index:5;pointer-events:none;'),
    mk('top', ''), center, mk('hint', ''), mk('job', ''), mk('reward', ''),
    mk('talk', ''), mk('profile', ''), mk('resume', '')
  );
  root.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', render);

  on('log', (p) => { if (p && p.text) showToast(String(p.text)); });
  on('enterMap', (p) => showBanner(Number(p?.map) || 0));
  on('advance', (p) => showAdvance(Number(p?.tier) || 0));
  on('reward', (p) => p?.phase === 'card' && showReward(Number(p?.idx) || 0, Number(p?.bonus) || 0));
  on('talk', (p) => {
    const i = Number(p?.i);
    if (i >= 0 && i <= 4) { setState({ talk: i }); }
  });
  subscribe(render);
  render();
}
