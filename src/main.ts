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

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b1330',
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [WorldScene]
});

registerSW();
