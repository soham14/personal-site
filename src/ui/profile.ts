// CHARACTER INFO window (PROFILE button / P key): profile card + JOURNEY / SKILLS / TROPHIES tabs.
import { state } from '../state.ts';
import { PROFILE, STAGES, MENTORS, SKILLS, TRIALS, type TrialKind } from '../content.ts';
import { crestDataURL } from './crests.ts';
import { esc, ACC, FP, titleSkin, expPct } from './util.ts';

const flipped: Record<number, boolean> = {};
export function toggleFlip(i: number): void { flipped[i] = !flipped[i]; }

const CLOSE_X = (c: string) => `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges"><path d="M1 1 L13 13 M13 1 L1 13" style="stroke:${c};stroke-width:3;fill:none;"/></svg>`;

function journey(): string {
  const pct = expPct();
  const rows = [3, 2, 1, 0].map((i) => {
    const c = STAGES[i];
    const earned = i < 3 && i < state.earnedN;
    const equipped = i === 3 && state.maxTier >= 3;
    const on = earned || equipped;
    const cur = i === 3;
    const flip = !!flipped[i];
    const status = !on ? 'Locked' : (cur ? 'Current' : 'Completed');
    const row = cur && on ? 'background:#fff3cf;border:3px solid #8a6400;box-shadow:3px 3px 0 #1b2040;'
      : (on ? 'background:#f4f1e8;border:2px solid #1b2040;box-shadow:3px 3px 0 #1b2040;' : 'background:transparent;border:2px dashed #5a5560;');
    const chip = FP + 'flex:none;margin-left:auto;padding:3px 8px;font-size:12px;font-weight:700;letter-spacing:1px;' +
      (!on ? 'background:transparent;color:#3d3947;border:2px dashed #5a5560;' : (cur ? 'background:#1b2040;color:#ffd166;border:2px solid #1b2040;' : 'background:#f4f1e8;color:#1b2040;border:2px solid #1b2040;'));
    const aria = c.crest + ', ' + c.org + ', ' + c.title + ', ' + c.dates + ', ' + c.team + '. ' + (on ? '' : 'Not yet earned. ') + (flip ? 'Showing details. Press to flip back.' : 'Press to flip for details.');
    return `<div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:8px;padding:8px;box-sizing:border-box;color:#1b2040;${row}">
      <div style="display:flex;align-items:center;gap:12px;">
        <span aria-hidden="true" data-portrait="${i}" style="position:relative;display:block;flex:none;width:64px;height:64px;overflow:hidden;border:2px solid #1b2040;background:#2a3166;opacity:${on ? 1 : 0.45};"></span>
        <span style="position:relative;flex:none;width:76px;height:88px;perspective:400px;">
          <button type="button" class="cq-flip" data-act="flip" data-i="${i}" aria-pressed="${flip}" aria-label="${esc(aria)}">
            <span class="cq-face"><img class="cq-crest" alt="" src="${crestDataURL(i)}" width="70" height="81" style="opacity:${on ? 1 : 0.4};"></span>
            <span class="cq-face" style="transform:rotateY(180deg);background:#1b2040;border:2px solid ${on ? '#ffd166' : '#8d8798'};padding:4px;">
              <span style="${FP}font-size:11px;font-weight:700;line-height:1.2;text-align:center;color:#f4f1e8;">${esc(c.crest)}</span>
              <span style="${FP}font-size:11px;font-weight:700;letter-spacing:1px;text-align:center;color:#ffd166;">${esc(c.org)}</span>
            </span>
          </button>
        </span>
        <span style="${chip}">${status}</span>
      </div>
      <div style="min-width:0;">
        <div style="${FP}font-size:18px;font-weight:700;line-height:1.2;">${esc(c.title)} &middot; ${esc(c.org)}</div>
        <div style="${FP}font-size:13px;font-weight:700;letter-spacing:1px;color:#8a6400;">Class &middot; ${esc(c.cls)}</div>
        <div style="font-size:12px;margin-top:2px;color:#3d3947;">${esc(c.dates)}</div>
        <div style="font-size:12px;color:#1b2040;">${esc(c.team)}</div>
      </div>
    </div>`;
  }).join('');
  return `<div style="position:relative;display:flex;flex-direction:column;gap:12px;">
  <div style="position:relative;z-index:1;display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:8px;box-sizing:border-box;background:#e6e0cd;border:2px dashed #5a5560;color:#1b2040;">
    <span aria-hidden="true" style="display:flex;align-items:center;justify-content:center;flex:none;width:64px;height:64px;background:#1b2040;border:2px solid #1b2040;">
      <svg width="32" height="32" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7h1zm2 0h4V5a2 2 0 0 0-4 0v2z" fill="#ffd166" fill-rule="evenodd"/><rect x="7" y="10" width="2" height="3" fill="#1b2040"/></svg>
    </span>
    <div style="flex:1 1 180px;min-width:0;">
      <div style="${FP}font-size:18px;font-weight:700;line-height:1.2;">Next advancement &middot; ???</div>
      <div style="${FP}font-size:13px;font-weight:700;letter-spacing:1px;color:#8a6400;">Quest in progress</div>
      <div role="img" aria-label="Experience toward next advancement: ${pct.toFixed(2)} percent" style="margin-top:6px;height:14px;background:#1b2040;border:2px solid #1b2040;box-sizing:border-box;"><span style="display:block;height:100%;width:${pct}%;background:${ACC};box-shadow:inset 0 -4px 0 rgba(0,0,0,0.25);"></span></div>
      <div style="font-size:12px;margin-top:2px;">EXP ${pct.toFixed(2)}%</div>
    </div>
  </div>${rows}</div>`;
}

const SKILL_ICONS = [
  'M2 3h12v10H2z M5 6l-2 2 2 2 M11 6l2 2-2 2',
  'M2 11h12v3H2z M2 6h12v3H2z M2 1h12v3H2z',
  'M3 13V8h3v5z M7 13V3h3v10z M11 13V6h3v7z',
  'M3 14V2h2v12z M5 2h8l-2 3 2 3H5z'
];

function skills(): string {
  const ink = '#1b2040';
  const f = "font-family:'Pixelify Sans',monospace;";
  const m = "font-family:'Space Mono',monospace;";
  const head = f + 'display:flex;align-items:center;gap:8px;min-height:40px;padding:6px 10px;box-sizing:border-box;background:' + ACC + ';color:' + ink + ';border:3px solid ' + ink + ';box-shadow:3px 3px 0 ' + ink + ';font-size:15px;font-weight:700;letter-spacing:1px;';
  const node = m + 'display:flex;align-items:center;gap:8px;min-height:36px;padding:6px 10px;box-sizing:border-box;background:#fffdf5;color:' + ink + ';border:3px solid ' + ink + ';box-shadow:3px 3px 0 ' + ink + ';font-size:12px;font-weight:700;line-height:1.25;';
  const conn = 'width:2px;height:12px;background:' + ink + ';margin:0 0 0 20px;';
  const pip = 'flex:none;width:8px;height:8px;background:' + ACC + ';border:2px solid ' + ink + ';';
  const cols = SKILLS.map((b, bi) => `<div style="display:flex;flex-direction:column;align-items:stretch;min-width:0;">
      <div style="${head}"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1b2040" stroke-width="2" stroke-linejoin="miter" style="flex:none;"><path d="${SKILL_ICONS[bi % SKILL_ICONS.length]}"></path></svg><span>${esc(b.name.toUpperCase())}</span></div>
      ${b.nodes.map((n) => `<div style="${conn}"></div><div style="${node}"><span style="${pip}"></span><span>${esc(n)}</span></div>`).join('')}
    </div>`).join('');
  return `<div style="padding:4px 2px;">
  <h3 style="${f}font-size:22px;font-weight:700;color:${ink};letter-spacing:1px;margin:0;">SKILL TREE</h3>
  <p style="${m}font-size:12px;color:#4a4f6e;margin:2px 0 14px;">All nodes unlocked.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:20px 16px;align-items:start;">${cols}</div>
</div>`;
}

const starsOf = (n: number) => (n >= 5 ? '5 stars' : (n === 1 ? '1 star' : n + ' stars'));
const RATE: Record<TrialKind, (v: number) => string> = {
  hex: (s) => s + ' pts · ' + starsOf(s >= 300 ? 5 : s >= 220 ? 4 : s >= 140 ? 3 : s >= 60 ? 2 : 1),
  lan: (s) => s + ' pts · ' + starsOf(s >= 330 ? 5 : s >= 260 ? 4 : s >= 190 ? 3 : s >= 110 ? 2 : 1),
  rush: (s) => s + ' caught · ' + starsOf(s >= 25 ? 5 : s >= 18 ? 4 : s >= 12 ? 3 : s >= 6 ? 2 : 1),
  stk: (v) => v + (v === 1 ? ' floor' : ' floors')
};

// Achievement copy is from the approved mockup (not yet in content.ts).
const ACHIEVEMENTS = [
  { title: 'Golden Bear Graduate', desc: 'Finished the academy at UC Berkeley.', on: true, now: false, crest: 0 },
  { title: 'Led a Cross-Org Feature', desc: 'Led the creation of a large, cross-organizational feature with the Roblox guild.', on: true, now: false, crest: 3 },
  { title: 'Managed a New Mage', desc: 'Managed an intern with the Roblox guild.', on: true, now: false, crest: 3 },
  { title: 'Reached Archmage', desc: 'Became a Senior Software Engineer with the Roblox guild.', on: true, now: true, crest: 3 },
  { title: '???', desc: 'Behind the sealed gate.', on: false, now: false, crest: 4 }
];

function trophies(): string {
  const owned = state.titles;
  const shown = owned.length ? owned[owned.length - 1] : '';
  const head = FP + 'font-size:14px;font-weight:700;letter-spacing:2px;color:#8a6400;margin:0 0 8px;';
  const kinds = Object.keys(TRIALS) as TrialKind[];
  const titles = kinds.map((k) => {
    const d = TRIALS[k];
    const on = owned.indexOf(d.title) >= 0;
    const tile = 'display:flex;flex-direction:column;gap:6px;padding:10px 12px;min-width:0;' +
      (on ? 'background:#fff3cf;border:2px solid #1b2040;box-shadow:3px 3px 0 #1b2040;color:#1b2040;' : 'background:transparent;border:2px dashed #5a5560;color:#3d3947;');
    const badge = FP + 'align-self:flex-start;padding:2px 8px;font-size:14px;font-weight:700;letter-spacing:1px;' +
      (on ? 'background:#1b2040;color:' + ACC + ';border:2px solid #1b2040;' : 'background:transparent;color:#3d3947;border:2px dashed #5a5560;');
    return `<div style="${tile}">
      <span style="${badge}">${esc(d.title)}</span>
      <span style="${FP}font-size:12px;font-weight:700;letter-spacing:1px;color:${on ? '#8a6400' : '#3d3947'};">${on ? 'Unlocked' : 'Locked'}</span>
      ${on && d.title === shown ? `<span style="${FP}font-size:12px;font-weight:700;letter-spacing:1px;color:#1b2040;background:${ACC};border:2px solid #1b2040;padding:1px 6px;align-self:flex-start;">Shown above your head</span>` : ''}
      ${on ? '' : `<span style="font-size:12px;line-height:1.5;">How to earn: ${esc(d.how)}.</span>`}
    </div>`;
  }).join('');
  const games = kinds.map((k) => {
    const d = TRIALS[k];
    const best = state.best[k] || 0;
    const has = best > 0;
    return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 12px;background:#f4f1e8;border:2px solid #1b2040;box-shadow:3px 3px 0 #1b2040;color:#1b2040;">
      <div style="flex:1 1 160px;min-width:0;">
        <div style="${FP}font-size:17px;font-weight:700;">${esc(d.name)}</div>
        <div style="font-size:12px;line-height:1.5;color:#3d3947;">Mentor: ${esc(MENTORS[d.mentor].name)}</div>
        <div style="font-size:13px;line-height:1.4;font-weight:700;color:${has ? '#1b2040' : '#3d3947'};">${has ? 'Best this session: ' + esc(RATE[k](best)) : 'No run yet'}</div>
      </div>
      <button type="button" data-act="play" data-kind="${k}" aria-label="Play ${esc(d.name)}" style="${FP}flex:none;min-height:44px;padding:6px 14px;font-size:14px;font-weight:700;letter-spacing:1px;cursor:pointer;background:#1b2040;color:${ACC};border:2px solid #1b2040;box-shadow:3px 3px 0 #000;">Play</button>
    </div>`;
  }).join('');
  const tOn = 'background:#f4f1e8;border:2px solid #1b2040;box-shadow:3px 3px 0 #1b2040;color:#1b2040;';
  const tNow = 'background:#fff3cf;border:2px solid #1b2040;box-shadow:3px 3px 0 #1b2040;color:#1b2040;';
  const tOff = 'background:transparent;border:2px dashed #5a5560;color:#3d3947;';
  const bOn = 'background:#1b2040;color:' + ACC + ';border:2px solid #1b2040;';
  const bOff = 'background:transparent;color:#3d3947;border:2px dashed #5a5560;';
  const ach = ACHIEVEMENTS.map((a) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 12px;${a.on ? (a.now ? tNow : tOn) : tOff}">
      <div aria-hidden="true" style="flex:none;width:44px;height:44px;display:flex;align-items:center;justify-content:center;${FP}font-size:12px;font-weight:700;letter-spacing:1px;${a.on ? '' : bOff}">${a.on ? `<img alt="" src="${crestDataURL(a.crest, false)}" width="40" height="40" style="display:block;image-rendering:pixelated;">` : 'LOCK'}</div>
      <div style="flex:1 1 160px;min-width:0;"><div style="${FP}font-size:17px;font-weight:700;">${esc(a.title)}</div><div style="font-size:12px;line-height:1.5;">${esc(a.desc)}</div></div>
      <span style="flex:none;padding:3px 8px;${FP}font-size:12px;font-weight:700;letter-spacing:1px;${a.on ? bOn : bOff}">${a.on ? 'UNLOCKED' : 'LOCKED'}</span>
    </div>`).join('');
  return `<div style="display:flex;flex-direction:column;gap:18px;">
  <section aria-label="Titles"><h3 style="${head}">TITLES</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">${titles}</div></section>
  <section aria-label="Trial records"><h3 style="${head}">TRIAL RECORDS</h3><div style="display:flex;flex-direction:column;gap:10px;">${games}</div></section>
  <section aria-label="Achievements"><h3 style="${head}">ACHIEVEMENTS</h3><div style="display:flex;flex-direction:column;gap:10px;">${ach}</div></section>
</div>`;
}

/** Full CHARACTER INFO window HTML (empty string when closed). */
export function profileHTML(): string {
  if (!state.profileOpen) return '';
  const tab = state.profileTab;
  const tier = Math.max(0, Math.min(3, state.zone));
  const st = STAGES[tier];
  const pct = expPct();
  const latest = state.titles.length ? state.titles[state.titles.length - 1] : '';
  const sk = titleSkin(latest);
  const tabs = ([['journey', 'JOURNEY'], ['skills', 'SKILLS'], ['trophies', 'TROPHIES']] as const).map(([id, label]) =>
    `<button type="button" role="tab" aria-selected="${tab === id}" data-act="tab" data-tab="${id}" style="min-height:44px;padding:0 12px;${FP}font-size:14px;font-weight:700;letter-spacing:1px;border:3px solid #1b2040;border-radius:0;cursor:pointer;${tab === id ? 'background:#1b2040;color:' + ACC + ';box-shadow:inset 2px 2px 0 #000;' : 'background:#e6e0cd;color:#1b2040;box-shadow:inset 2px 2px 0 #fff,3px 3px 0 #1b2040;'}">${label}</button>`).join('');
  const body = tab === 'skills' ? skills() : tab === 'trophies' ? trophies() : journey();
  return `<div class="cq-modal" data-no-walk="1" style="position:absolute;inset:0;z-index:30;background:rgba(15,18,38,0.72);">
  <div role="dialog" aria-label="Character info" style="position:absolute;left:0;right:0;margin:0 auto;top:20px;bottom:20px;width:min(900px,94%);display:flex;flex-direction:column;box-sizing:border-box;background:#f4f1e8;border:3px solid #1b2040;box-shadow:inset 2px 2px 0 #fff,inset -2px -2px 0 #cfc8b2,6px 6px 0 #000;color:#1b2040;">
    <div style="flex:none;display:flex;align-items:center;justify-content:space-between;min-height:44px;padding-left:14px;background:#2a3166;border-bottom:3px solid #1b2040;color:${ACC};${FP}font-size:17px;font-weight:700;letter-spacing:2px;">
      <span>CHARACTER INFO</span>
      <button type="button" aria-label="Close" data-act="closeProfile" style="width:44px;height:44px;padding:0;border:0;border-left:3px solid #1b2040;background:#1b2040;cursor:pointer;display:flex;align-items:center;justify-content:center;">${CLOSE_X(ACC)}</button>
    </div>
    <div data-scroll="profile" style="flex:1 1 auto;min-height:0;overflow-y:auto;display:flex;flex-wrap:wrap;align-content:flex-start;gap:16px;padding:16px;">
      <div style="flex:28 1 210px;min-width:0;display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px;background:#2a3166;border:3px solid #1b2040;box-shadow:inset 2px 2px 0 #3d4691;">
          <span aria-hidden="true" data-avatar="${tier}" style="position:relative;display:block;width:123px;height:158px;"></span>
          <span style="${FP}font-size:17px;font-weight:700;letter-spacing:2px;color:${ACC};">${esc(PROFILE.name.toUpperCase())} &middot; Lv. ??</span>
          <span style="font-size:12px;text-align:center;color:#f4f1e8;">Wearing: ${esc(st.cls)} &middot; ${esc(st.outfit)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;padding:14px;background:#fbf9f2;border:3px solid #1b2040;box-shadow:inset 2px 2px 0 #fff;">
          <div style="${FP}font-size:24px;font-weight:700;line-height:1.1;color:#1b2040;">${esc(PROFILE.name)}</div>
          <div style="${FP}font-size:14px;font-weight:700;letter-spacing:1px;color:#8a6400;">${esc(STAGES[3].title)} &middot; ${esc(STAGES[3].org)}</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="flex:none;padding:2px 8px;background:#1b2040;color:${ACC};${FP}font-size:14px;font-weight:700;letter-spacing:1px;">LV. ??</span>
            <span style="font-size:12px;color:#3d3947;">To next advancement</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="position:relative;flex:1 1 auto;min-width:40px;height:14px;box-sizing:border-box;background:#cfc8b2;border:2px solid #1b2040;"><div style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:#ef6f6c;"></div></div>
            <span style="flex:none;font-size:12px;font-weight:700;">${pct.toFixed(0)}%</span>
          </div>
          <div style="font-family:'Space Mono',monospace;font-size:13px;line-height:1.5;color:#1b2040;">${esc(PROFILE.summary)}</div>
          ${latest ? `<div><span style="${FP}display:inline-block;padding:2px 8px;font-size:12px;font-weight:700;letter-spacing:1px;background:${sk.bg};color:${sk.tx};border:2px solid ${sk.bd};">${esc(latest)}</span></div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:2px;">
            <button type="button" data-act="resume" style="min-height:44px;padding:0 14px;${FP}font-size:15px;font-weight:700;letter-spacing:1px;color:#1b2040;background:${ACC};border:3px solid #1b2040;border-radius:0;cursor:pointer;box-shadow:inset 2px 2px 0 rgba(255,255,255,0.5),3px 3px 0 #1b2040;">R&eacute;sum&eacute;</button>
            <a href="mailto:${esc(PROFILE.email)}" style="display:inline-flex;align-items:center;min-height:44px;padding:0 14px;box-sizing:border-box;${FP}font-size:15px;font-weight:700;letter-spacing:1px;color:#1b2040;text-decoration:none;background:#e6e0cd;border:3px solid #1b2040;box-shadow:inset 2px 2px 0 #fff,3px 3px 0 #1b2040;">Contact</a>
          </div>
        </div>
      </div>
      <div style="flex:72 1 340px;min-width:0;display:flex;flex-direction:column;gap:14px;">
        <div role="tablist" aria-label="Character sections" style="display:flex;flex-wrap:wrap;gap:8px;">${tabs}</div>
        <div style="padding:14px;background:#fbf9f2;border:3px solid #1b2040;box-shadow:inset 2px 2px 0 #fff;min-height:260px;box-sizing:border-box;">${body}</div>
      </div>
    </div>
    <div style="flex:none;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;padding:10px 16px;background:#e6e0cd;border-top:3px solid #1b2040;font-size:13px;">
      <span>Contact: <a href="mailto:${esc(PROFILE.email)}" style="color:#1b2040;font-weight:700;">${esc(PROFILE.email)}</a></span>
      <span style="${FP}font-size:12px;letter-spacing:1px;">Close this window to keep exploring.</span>
    </div>
  </div>
</div>`;
}

