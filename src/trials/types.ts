export interface TrialResult {
  won: boolean; score: number; stars: number; bonus: number;
  secs?: number; moves?: number; pairs?: number; floors?: number; exp?: number; capped?: boolean; title?: boolean;
}

export interface TrialCtx {
  gate: boolean;
  /** Quit (X / Esc) during play. */
  close: () => void;
  /** Round over: show results. */
  finish: (r: TrialResult) => void;
}

export interface TrialGame {
  root: HTMLElement;
  /** One frame; false once the loop should stop. */
  step(dt: number): boolean;
  key(e: KeyboardEvent, direct: boolean): void;
  keyUp?(e: KeyboardEvent): void;
  destroy?(): void;
}

export interface Pal { bar: string; tx: string; x: string; btn: string; btnTx: string; hi: string; head: string }
