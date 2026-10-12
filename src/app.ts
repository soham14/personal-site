// Small page-level behaviors used by main.ts, kept here so they can be unit tested.

/** After a mouse/touch click on a button or link, drop its focus so Space jumps instead of re-pressing it.
 *  Keyboard activation (detail === 0) keeps focus for accessibility. Dialog controls keep focus too. */
export function installBlurAfterClick(doc: Document = document): void {
  doc.addEventListener('click', (e) => {
    if ((e as MouseEvent).detail === 0) return;
    setTimeout(() => {
      const a = doc.activeElement as HTMLElement | null;
      if (a && a.closest('button, a') && !a.closest('[role="dialog"]')) a.blur();
    }, 0);
  });
}

/** Height (px) the tallest pop-up (Keep Leveling) needs; shorter screens scale all pop-ups by one shared factor. */
export const POP_REF_H = 530;

/** Shared pop-up scale for a viewport height: 1 on tall screens, smaller (2 decimals, floored) on short ones. */
export function popScale(viewH: number): number {
  const z = Math.min(1, (viewH - 16) / POP_REF_H);
  return Math.floor(z * 100) / 100;
}

/** Keep the --pz CSS variable in sync with the window height. */
export function installPopScale(win: Window = window): void {
  const apply = () => win.document.documentElement.style.setProperty('--pz', String(popScale(win.innerHeight)));
  apply();
  win.addEventListener('resize', apply);
}
