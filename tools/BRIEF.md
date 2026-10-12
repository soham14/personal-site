# Port brief (for parallel module work)

Porting the approved mockup `reference/CareerQuest.dc.html` (logic in `class Component extends DCLogic`, line ~871) to Phaser 3.90 + Vite + TypeScript. Faithfulness to the mockup's look, feel, text and behavior is the goal. Do not invent content; all strings come from `src/content.ts`.

Key mockup locations: audioEnsure 1029, songs 1405, sfx 1695, trials ~1842–2660, gameDecor 2658, cfg 2683, tiers 2687, maps 2697, npcData 2715, platData 2748, v2Sprites 2796, v2Pose 3312, v2Runs 3340, heroParts 3363, npcSprites 3478, beginAdvance 3543, scheduleReward 3561, credData 3582, crestRaw 3596, crestView 3652, tickPhysics 3709, camCenter 3918, blend 3926, onKeyDown 3946, onPtrDown 4057, world 4158, layers 4407, journeyVals 4585, skillsVals 4638, renderVals 4746. The template/CSS is lines 1–870. Also `reference/npc_*.json`, `SohamBody.txt`, `SohamHead.txt`, `Resume.dc.html`.

Rules:
- `import * as Phaser from 'phaser'` (no default import). Relative imports use `.ts` extensions (`import { state } from '../state.ts'`).
- Shared contracts: `src/content.ts` (data) and `src/state.ts` (state + `setState`/`subscribe`/`inputLocked` + event bus `on`/`emit`). You may ADD fields/events to state.ts if needed; never rename existing ones. Note additions in your final report.
- DOM UI is mounted in `#ui` (fixed overlay above the `#game` canvas). Phaser canvas is in `#game`.
- Only touch files you own (listed in your task). Don't edit main.ts; export an init function and report its signature.
- Verify: `bash tools/devcheck.sh` must pass (tsc strict). No npm available; Phaser types at node_modules/phaser/types.
- Don't commit; the lead integrates.
- Final report: files, exported API, state/event additions, known gaps. Keep it short.
