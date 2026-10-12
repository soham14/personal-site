import { defineConfig } from 'vitest/config';

// Unit tests cover application logic only. Engine/browser plumbing and visual data are excluded
// below, each with a reason; everything in scope must stay at 100% coverage.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/env.d.ts',                 // type declarations only
        'src/main.ts',                  // bootstrap: wires modules together and starts Phaser
        'src/scenes/**',                // Phaser scene: drawing and engine calls (verified by playing)
        'src/render/legacy.ts',         // sprite pixel data and scenery layouts ported from the mockup
        'src/render/textures.ts',       // turns sprite data into Phaser textures/canvases
        'src/render/scenery.ts',        // turns scenery boxes into Phaser objects
        'src/ui/sw.ts',                 // service-worker registration (browser API)
        'src/audio/songs.ts',           // song note data (the parser in it is tested; data isn't)
      ],
      reporter: ['text', 'json-summary', 'json'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
