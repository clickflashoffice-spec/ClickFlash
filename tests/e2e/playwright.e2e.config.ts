import { defineConfig, devices } from '@playwright/test';

/**
 * ClickFlash Layer 4 – Cross-App Integration E2E Configuration
 *
 * Runs headlessly by default; validates IPC contracts, license key
 * round-trips, and cross-app data flow between Master, Touch, Installer,
 * and License Generator.
 *
 * Usage:
 *   npx playwright test --config=tests/e2e/playwright.e2e.config.ts
 */
export default defineConfig({
  testDir: './',
  testMatch: ['**/*.spec.ts'],
  testIgnore: ['**/node_modules/**'],

  /* Sequential execution – cross-app tests have shared state */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  /* Generous timeout for Electron-backed apps */
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: '../../playwright-report/e2e', open: 'never' }],
  ],

  use: {
    baseURL: 'http://127.0.0.1:8090',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },

  projects: [
    {
      name: 'e2e-integration',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
