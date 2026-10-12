// Shared test setup: fakes for browser features jsdom lacks, and a clean game state per test.
import { vi, beforeEach } from 'vitest';

// Phaser needs a real canvas/WebGL; application logic never needs the engine in unit tests.
vi.mock('phaser', () => ({}));

// jsdom has no 2D canvas. A permissive fake context records nothing and returns safe values.
function fakeCtx(): CanvasRenderingContext2D {
  const target: Record<string, unknown> = {
    measureText: () => ({ width: 0 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({}),
  };
  return new Proxy(target, {
    get: (t, k) => (k in t ? t[k as string] : () => {}),
    set: (t, k, v) => { t[k as string] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
}
HTMLCanvasElement.prototype.getContext = function () { return fakeCtx(); } as any;
HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';

beforeEach(async () => {
  document.body.innerHTML = '';
  const { resetState } = await import('../src/state.ts');
  resetState();
});
