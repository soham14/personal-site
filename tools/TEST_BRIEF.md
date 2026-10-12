# Unit test brief (parallel agents)

Repo: /home/claude/personal-site. Phaser 3 + Vite + TypeScript game (see src/). Tests use **Vitest 2.1 + jsdom** (`vitest.config.ts`, `tests/setup.ts`). Example: `tests/app.test.ts`.

## Goal
100% statement/branch/function/line coverage of the files you own, with tests that check **application behavior**, are **not brittle**, and make future changes safe.

Rules (from the site owner — follow strictly):
- Test happy paths AND edge cases of OUR logic. Never test Phaser/browser/library behavior.
- Not brittle: no snapshot tests; no exact tuning numbers, thresholds, colors, copy text or timings hard-coded in tests. Prefer relationships/invariants ("rating is 1–5 and non-decreasing in score", "moving right increases x", "title unlocks exactly at the threshold read from content.ts"). When a value is needed, import it from the source (`content.ts`, exported constants) instead of repeating a literal.
- No dates relative to "now". Control time with `vi.useFakeTimers()`; control randomness with `vi.spyOn(Math, 'random')` (seeded sequence).
- Each test independent. `tests/setup.ts` resets the shared state/event bus before every test (`resetState()`), clears `document.body`, mocks `phaser`, and fakes canvas 2D. Module-level state elsewhere (e.g. sim) must be reset in your tests (`initSim()`, `disposeSim()`, or a small reset export you add).
- For code that genuinely can't run in jsdom or is a pure safety net (e.g. "Web Audio unavailable", iOS-only workaround, `requestIdleCallback` fallback), you may add `/* v8 ignore next */` (or `/* v8 ignore start */ … /* v8 ignore stop */`) **with a one-line reason comment**. Use sparingly; prefer real tests.
- You may make **small, behavior-preserving** refactors in the source files you own to make them testable (e.g. export a pure helper like a star-rating function, add a reset function). Do not change behavior, visuals, or other agents' files. `src/state.ts`, `src/app.ts`, `vitest.config.ts`, `tests/setup.ts` are owned by the lead — ask in your report if you need changes.
- Use `.ts` extensions in relative imports (`import { x } from '../../src/game/sim.ts'`).
- Tests live under `tests/` mirroring `src/` (e.g. `tests/game/sim.test.ts`). Name tests as behavior sentences.

## Running (no npm locally — tests run on GitHub Actions)
1. Work on your own branch from `tests`: `git fetch -q origin tests && git checkout -q -b tests-<you> origin/tests` (in a separate worktree dir to avoid clashing with other agents: `git worktree add ../ps-<you> -b tests-<you> origin/tests` and work THERE).
2. Commit and `git push -q -u origin tests-<you>`. CI runs `tsc`, then `vitest run --coverage`.
3. Wait ~90s, then read the plain-text report: `git fetch -q origin ci-report/tests-<you> && git show FETCH_HEAD:ci-report.txt` (and `FETCH_HEAD:sha.txt` must equal your pushed commit — otherwise wait and refetch). It lists failing tests with messages and uncovered lines/branches/functions **per file**. Global 100% threshold will fail until all agents merge — ignore that; make YOUR files reach 100% and all YOUR tests pass. If the job died before tests (e.g. tsc error), the report says "no test-results.json"; `gh run list -R soham14/personal-site --branch tests-<you> -L 1` and `gh run view <id> -R soham14/personal-site` show annotations.
4. Iterate until your files are 100% and green. Local `bash tools/devcheck.sh` still type-checks src.
5. Commit messages end with:
   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   Claude-Session: https://claude.ai/code/session_01RUXdF73qRZadnvXDgaH4xJ
6. Final report (short): branch name, files added/changed, test count, coverage of your files, any source refactors and any v8-ignore lines with reasons, anything you couldn't cover.
