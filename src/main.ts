import * as Phaser from 'phaser';

class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  create() {
    this.add.text(20, 20, 'Career Quest: loading…', { fontFamily: 'monospace', color: '#f2b632' });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b1330',
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE },
  scene: [BootScene]
});
