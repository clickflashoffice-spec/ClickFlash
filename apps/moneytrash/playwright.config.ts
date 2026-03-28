import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for MoneyTrash Uploader App
 * 
 * E2E testing for the Tauri-based desktop uploader
 */

export default defineConfig({
  testDir: './tests/e2e',
  
  fullyParallel: false, // Tauri tests should run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for Tauri
  
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    process.env.CI ? ['github'] : ['line'],
  ],
  
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:1420',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Tauri-specific settings
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
          ],
        },
      },
    },
  ],

  // Note: For Tauri, we don't auto-start the dev server
  // Tests should connect to an already running Tauri dev instance
  // or use the built application
  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:1420',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },

  timeout: 180000, // Longer timeout for upload operations
  expect: {
    timeout: 15000,
  },
});
