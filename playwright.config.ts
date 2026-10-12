import { defineConfig, devices } from '@playwright/test';

// End-to-end smoke tests against the production build (vite preview), in a desktop browser and two phones.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['json', { outputFile: 'e2e-results.json' }]],
  use: { baseURL: 'http://localhost:4173/', trace: 'off' },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173/', reuseExistingServer: false, timeout: 60_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 14'] } },
  ],
});
