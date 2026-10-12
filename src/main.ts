import * as Phaser from 'phaser';
import './styles.css';
import { WorldScene } from './scenes/WorldScene.ts';
import { initUI, registerSW } from './ui/index.ts';
import { initTrials } from './trials/index.ts';
import { initAudio, toggleSound } from './audio/audio.ts';
import { on } from './state.ts';

const ui = document.getElementById('ui')!;
initUI(ui);
initTrials(ui);
initAudio();
on('soundToggle' as any, () => toggleSound());

// After a mouse/touch click on a button, drop its focus so Space jumps instead of re-pressing it.
// Keyboard activation (detail === 0) keeps focus for accessibility.
document.addEventListener('click', (e) => {
  if (e.detail === 0) return;
  setTimeout(() => {
    const a = document.activeElement as HTMLElement | null;
    if (a && a.closest('button, a') && !a.closest('[role="dialog"]')) a.blur();
  }, 0);
});

// Short screens (phone landscape): shrink the NPC dialogue and trial windows to fit the viewport
// instead of cutting them off. Profile and résumé scroll by design, so they're left alone.
function fitDialogs() {
  const avail = window.innerHeight - 16;
  document.querySelectorAll<HTMLElement>('#ui [role="dialog"]').forEach((d) => {
    const label = d.getAttribute('aria-label') || '';
    if (label === 'Character info' || label === 'Résumé') return;
    d.style.zoom = '1';
    const h = d.getBoundingClientRect().height;
    const z = h > avail ? Math.max(0.5, avail / h) : 1;
    d.style.zoom = z < 1 ? String(Math.floor(z * 100) / 100) : '';
  });
}
setInterval(fitDialogs, 250);
window.addEventListener('resize', fitDialogs);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b1330',
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [WorldScene]
});

registerSW();
