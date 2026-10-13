// Trial controller: prompt -> play -> results for Hex Lock, Lantern Match, Five-Star Rush and Keep Leveling.
// DOM overlay in #ui. Listens for 'trialOffer' {kind, gate, direct?}; emits 'trialDone', 'titleUnlocked', 'sfx', 'log', 'walkTo'.
import './trials.css';
import { TRIALS, MENTORS, MAPS, type TrialKind } from '../content.ts';
import { state, setState, on, emit } from '../state.ts';
import { el, fontP, log } from './dom.ts';
import { titleSkin } from '../ui/util.ts';
import { palette, stdWindow, btnP, btnS, button } from './shell.ts';
import type { TrialGame, TrialResult } from './types.ts';
import { createHex } from './hex.ts';
import { createLan } from './lan.ts';
import { createRush } from './rush.ts';
import { createStk, stkExpBonus } from './stk.ts';
import { npcCanvas, heroCrop } from '../render/textures.ts';

const KIND_NAME: Record<TrialKind, string> = { hex: 'Hex Lock', lan: 'Lantern Match', rush: 'Five-Star Rush', stk: 'Keep Leveling' };
const START_LOG: Record<TrialKind, string> = {
  hex: '[Hug] The final exam begins!', lan: '[Amelia] Light them all, Mage!', rush: '[Tirumal] The trial begins!', stk: '[Darragh] Keep leveling!'
};
const PROMPT_TEXT: Record<TrialKind, string> = {
  hex: 'Your final exam, apprentice. Route the light through the seal and the Citadel will open. Mind the candle.',
  stk: 'The next advancement is still being written. Until then: keep leveling. Stack the spire as high as you can.',
  lan: 'The grove ahead is dark. Light the lanterns in matching pairs and the path will open. Quick eyes, Mage!',
  rush: 'Before you advance, show me you can spot quality. Catch the five-star reviews, dodge the one-star pebbles. Twenty seconds!'
};

/** Title chip colours come from the one shared helper, so the results window matches the chip over the hero. */
function skinCss(title: string): string {
  const k = titleSkin(title);
  return 'background:' + k.bg + ';color:' + k.tx + ';border:2px solid ' + k.bd + ';';
}

export function initTrials(root: HTMLElement): void {
  const overlay = el('div', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:40;background:rgba(15,18,38,0.72);pointer-events:auto;display:none;outline:none;');
  overlay.dataset.noWalk = '1';
  overlay.tabIndex = -1;
  overlay.className = 'cq-trials';
  root.appendChild(overlay);

  let kind: TrialKind = 'rush';
  let gate = false;
  let game: TrialGame | null = null;
  let raf: number | null = null;
  let last: number | null = null;
  let result: TrialResult | null = null;

  const stopLoop = () => { if (raf !== null) cancelAnimationFrame(raf); raf = null; last = null; };
  const startLoop = () => {
    stopLoop();
    const tick = (ts: number) => {
      if (last === null) last = ts;
      const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
      last = ts;
      const go = game ? game.step(dt) : false;
      raf = go ? requestAnimationFrame(tick) : null;
    };
    raf = requestAnimationFrame(tick);
  };

  const mount = (node: HTMLElement) => {
    overlay.replaceChildren(node);
    overlay.style.display = 'block';
    overlay.focus({ preventScroll: true });
  };

  const close = () => {
    stopLoop();
    game?.destroy?.();
    game = null; result = null;
    overlay.replaceChildren();
    overlay.style.display = 'none';
    setState({ trial: null });
  };

  // ---- prompt ----
  const showPrompt = () => {
    const P = palette(kind);
    const info = MENTORS[TRIALS[kind].mentor];
    const isStk = kind === 'stk';
    const w = stdWindow(P, 'Trial from ' + info.name, 'TRIAL · ' + info.name, isStk ? 'Not now' : 'Skip trial', close);
    const top = el('div', 'display:flex;flex-wrap:wrap;gap:16px;padding:16px;');
    const m = MAPS[TRIALS[kind].mentor];
    const port = el('div', 'flex:none;width:104px;height:104px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden;background:' + m.port + ';border:3px solid #1b2040;box-shadow:inset 2px 2px 0 ' + m.portHi + ';');
    {
      // Mentor portrait, framed the same way as the dialogue box
      const mi = TRIALS[kind].mentor;
      const cr = heroCrop(3, 3, 98, 98);
      cr.t -= [10, 20, 20, 18][mi];
      const c = npcCanvas(mi, 3, cr);
      c.style.cssText = 'display:block;width:100%;height:100%;image-rendering:pixelated;';
      port.append(c);
    }
    port.setAttribute('aria-hidden', 'true');
    const txtBox = el('div', 'flex:1 1 220px;min-width:0;');
    txtBox.append(
      el('div', fontP + 'font-size:13px;font-weight:700;letter-spacing:2px;color:#8a6400;text-transform:uppercase;', kind === 'hex' ? 'Graduation trial' : (isStk ? 'Endless trial' : 'Job advancement trial')),
      el('p', 'margin:6px 0 0;font-size:14px;line-height:1.6;', PROMPT_TEXT[kind])
    );
    top.append(port, txtBox);
    const btns = el('div', 'display:flex;flex-wrap:wrap;gap:10px;padding:0 16px 16px;');
    btns.append(button('Start trial', btnP(P), () => begin(false)), button(isStk ? 'Not now' : 'Skip trial', btnS, close));
    w.append(top, btns);
    mount(w);
    setState({ trial: { kind, phase: 'prompt', gate }, talk: null, half: null });
  };

  // ---- play ----
  const begin = (quiet: boolean) => {
    stopLoop();
    result = null;
    const ctx = { gate, close, finish };
    game = kind === 'hex' ? createHex(ctx) : kind === 'lan' ? createLan(ctx) : kind === 'stk' ? createStk(ctx) : createRush(ctx);
    mount(game.root);
    if (!quiet) log(START_LOG[kind]);
    setState({ trial: { kind, phase: 'play', gate }, talk: null, half: null });
    startLoop();
  };

  // ---- results ----
  function finish(r: TrialResult) {
    stopLoop();
    result = r;
    const best = Object.assign({}, state.best);
    best[kind] = Math.max(best[kind], r.score);
    const patch: Partial<typeof state> = { best };
    if (kind === 'stk') patch.expBonus = stkExpBonus(state.expBonus, r.floors || 0);
    const unlocked = kind === 'stk' ? !!r.title : r.stars === 5;
    const title = TRIALS[kind].title;
    if (unlocked) patch.titles = state.titles.filter((t) => t !== title).concat([title]);
    setState(patch);
    if (unlocked) { log('[System] Title unlocked: ' + title); emit('titleUnlocked', { title }); }
    emit('trialDone', { kind, score: r.score, stars: r.stars, gate, bonus: gate && r.won ? r.bonus : 0, won: r.won });
    showResult();
  }

  const showResult = () => {
    const r = result!;
    const P = palette(kind);
    const isStk = kind === 'stk';
    const won = r.won;
    const w = stdWindow(P, kind === 'hex' ? 'Final exam results' : KIND_NAME[kind] + (kind === 'rush' ? '' : ' results'),
      kind === 'hex' ? 'FINAL EXAM' : KIND_NAME[kind].toUpperCase(), isStk ? 'Done' : 'Continue', cont);
    const box = el('div', 'min-height:369px;box-sizing:border-box;padding:18px 16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;');
    box.setAttribute('role', 'status');
    const head = kind === 'hex' ? (won ? 'Exam passed!' : 'The candle burned out')
      : kind === 'lan' ? (won ? 'Path lit!' : 'The lanterns went cold')
      : isStk ? 'The spire stands ' + (r.floors || 0) + ' floors tall.' : 'Trial complete!';
    box.appendChild(el('div', fontP + 'font-size:30px;font-weight:700;letter-spacing:2px;line-height:1.1;color:' + P.head + ';', head));
    if (won && !isStk) {
      box.appendChild(el('div', fontP + 'font-size:22px;font-weight:700;letter-spacing:1px;', 'Score: ' + r.score));
      const stars = el('div', 'display:flex;gap:6px;');
      stars.setAttribute('role', 'img');
      stars.setAttribute('aria-label', r.stars + ' out of 5 stars');
      stars.innerHTML = [0, 1, 2, 3, 4].map((i) => '<svg aria-hidden="true" width="44" height="44" viewBox="0 0 44 44" shape-rendering="crispEdges"><polygon points="22,2 28,16 43,16 31,26 36,41 22,32 8,41 13,26 1,16 16,16" style="' +
        (i < r.stars ? 'fill:#ffd166;stroke:#b8841c;stroke-width:3;' : 'fill:#e6e0cd;stroke:#8d8798;stroke-width:3;') + '"/></svg>').join('');
      box.appendChild(stars);
    }
    const detailSt = fontP + 'font-size:14px;letter-spacing:1px;color:#3d3947;line-height:1.4;';
    const detail = kind === 'hex' ? (won ? r.secs + 's left · ' + r.moves + ' moves' : 'Out of time before the light reached the seal.')
      : kind === 'lan' ? (won ? r.secs + 's left · ' + r.moves + ' moves' : 'Time ran out with ' + r.pairs + ' of 6 pairs lit.')
      : isStk ? 'EXP toward next advancement: +' + (r.exp || 0) : '';
    if (detail) box.appendChild(el('div', detailSt, detail));
    box.appendChild(el('div', fontP + 'font-size:16px;font-weight:700;letter-spacing:1px;color:#3d3947;', 'Best: ' + state.best[kind]));
    if (!isStk && (won || !gate)) {
      const acc = MAPS[state.zone]?.a || '#f2b632';
      box.appendChild(el('div', fontP + 'display:inline-block;padding:3px 10px;font-size:15px;font-weight:700;letter-spacing:1px;' +
        (gate && won ? 'background:#1b2040;color:' + acc + ';' : 'background:transparent;color:#3d3947;border:2px dashed #5a5560;'),
      gate ? 'Trial bonus: +' + r.bonus + ' EXP' : 'Practice run · no bonus'));
    }
    const note = isStk ? (r.capped ? 'Almost there… the gate holds. (Quest in progress)' : '') : (!won && gate ? 'You can still pass the gate, without a bonus.' : '');
    if (note) box.appendChild(el('div', detailSt, note));
    if (isStk ? !!r.title : r.stars === 5) {
      box.appendChild(el('div', fontP + 'display:inline-block;padding:3px 10px;font-size:14px;font-weight:700;letter-spacing:1px;box-shadow:2px 2px 0 #000;' + skinCss(TRIALS[kind].title), 'Title unlocked: ' + TRIALS[kind].title));
    }
    const btns = el('div', 'display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:6px;');
    btns.append(button(isStk ? 'Done' : 'Continue', btnP(P), cont), button('Retry', btnS, () => begin(true)));
    box.appendChild(btns);
    w.appendChild(box);
    game = null;
    mount(w);
    setState({ trial: { kind, phase: 'result', gate } });
  };

  // Continue after the results: a gate trial walks the player through the gate so normal advancement plays.
  function cont() {
    const r = result!;
    const wasGate = gate;
    close();
    if (wasGate) emit('walkTo', { x: TRIALS[kind].gateX + 20, bonus: r.won ? r.bonus : 0, kind });
  }

  // Close X / Esc: prompt = skip, play = quit (discard), results = continue.
  const trialClose = () => {
    const t = state.trial;
    if (t && t.phase === 'result') cont(); else close();
  };

  on('trialOffer', (p: { kind: TrialKind; gate?: boolean; direct?: boolean }) => {
    if (!p || !TRIALS[p.kind]) return;
    stopLoop();
    kind = p.kind;
    gate = p.kind === 'stk' ? false : !!p.gate;
    if (p.direct) begin(false); else showPrompt();
  });

  // Keyboard routing while a trial window is open (captured so the world doesn't also react).
  window.addEventListener('keydown', (e) => {
    if (!state.trial || overlay.style.display === 'none') return;
    if (e.code === 'Tab') return;
    e.stopImmediatePropagation();
    const direct = !(e.target instanceof HTMLButtonElement);
    if (e.code === 'Escape') { e.preventDefault(); if (!e.repeat) trialClose(); return; }
    const ph = state.trial.phase;
    if (ph === 'play' && game) { game.key(e, direct); return; }
    if (ph === 'prompt' && e.code === 'Enter' && direct && !e.repeat) { e.preventDefault(); begin(false); return; }
    if (e.code === 'Space' && direct) e.preventDefault();
  }, true);
  window.addEventListener('keyup', (e) => {
    if (!state.trial || !game) return;
    e.stopImmediatePropagation();
    game.keyUp?.(e);
  }, true);
  window.addEventListener('blur', () => { if (game?.keyUp) { ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].forEach((code) => game!.keyUp!(new KeyboardEvent('keyup', { code }))); } });

}
