import { defineConfig, devices } from "@playwright/test";

/**
 * Ecosystem-wide Playwright configuration.
 * Validates data flow across all 6 applications.
 */
export default defineConfig({
  testDir: './',
  testMatch: [
    'tests/ecosystem/**/*.spec.ts',
    'apps/desktop/master/tests/e2e/**/*.spec.ts',
    'apps/desktop/touch/tests/e2e/**/*.spec.ts',
    'e2e/comprehensive-flows.spec.ts',
    'e2e/accessibility/**/*.spec.ts',
    'e2e/visual-regression/**/*.spec.ts',
    'e2e/integration/**/*.spec.ts',
    'e2e/resilience/**/*.spec.ts'
  ],
  testIgnore: [
    '**/.claude/**',
    '**/.kilo/**',
    '**/.git/**',
    '**/node_modules/**'
  ],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: 'list',
  timeout: 300000, 


  use: {
    baseURL: 'http://127.0.0.1:8090',
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Port Mapping:
  // 8090: Master Frontend
  // 8091: Touch Frontend
  // 5175: Management Hub
  // 5176: Gallery
  // 1420: MoneyTrash (Tauri Web)
  // 3000: Website (Next.js)

  webServer: [
    {
      command: 'npm run dev:master',
      url: 'http://127.0.0.1:8090/api/health',
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: {
        TEST_E2E: '1'
      },
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'npm run dev:touch',
      url: 'http://127.0.0.1:5174', // Touch Vite port or whatever Touch expects
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: {
        TEST_E2E: '1'
      },
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'npm run dev:management',
      url: 'http://127.0.0.1:5175',
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: { TEST_E2E: '1' },
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'npm run dev:gallery',
      url: 'http://127.0.0.1:5176/api/health',
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: { TEST_E2E: '1' },
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'pnpm --filter moneytrash-uploader run dev',
      url: 'http://127.0.0.1:1420',
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: { TEST_E2E: '1' },
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ]
});
