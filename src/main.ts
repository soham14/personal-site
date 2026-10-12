import * as Phaser from 'phaser';
import './fonts.css';
import './styles.css';
import { WorldScene } from './scenes/WorldScene.ts';
import { initUI, registerSW } from './ui/index.ts';
import { initTrials } from './trials/index.ts';
import { initAudio, toggleSound } from './audio/audio.ts';
import { on, state, setState, emit } from './state.ts';
import { initSim, sim } from './game/sim.ts';
import { installBlurAfterClick, installPopScale } from './app.ts';

const ui = document.getElementById('ui')!;
initUI(ui);
initTrials(ui);
initAudio();
on('soundToggle' as any, () => toggleSound());

installBlurAfterClick();
installPopScale();

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

// End-to-end test hook: only with ?e2e in the URL, so automated browser tests can set up a scenario
// (e.g. start next to a gate). Tests still assert through the real page, not through this hook.
if (new URLSearchParams(location.search).has('e2e')) (window as any).__cq = { state, setState, emit, initSim, sim };
