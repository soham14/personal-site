import * as Phaser from 'phaser';
import './fonts.css';
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

// Short screens (phone landscape): one shared scale for all pop-ups, sized so the tallest (Keep Leveling, ~520px) fits.
function setPopScale() {
  const z = Math.min(1, (window.innerHeight - 16) / 530);
  document.documentElement.style.setProperty('--pz', String(Math.floor(z * 100) / 100));
}
setPopScale();
window.addEventListener('resize', setPopScale);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b1330',
  pixelArt: true,
  fps: { smoothStep: false },
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [WorldScene]
});

registerSW();
