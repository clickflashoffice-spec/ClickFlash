import { defineConfig, devices } from "@playwright/test";

/**
 * Ecosystem-wide Playwright configuration.
 * Validates data flow across all 6 applications.
 */
export default defineConfig({
  testDir: './',
  testMatch: [
    'tests/ecosystem/**/*.spec.ts',
    'apps/master/tests/e2e/**/*.spec.ts',
    'apps/touch/tests/e2e/**/*.spec.ts'
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
    baseURL: 'http://localhost:5173',
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
  // 5173: Master Frontend
  // 5174: Touch Frontend
  // 5175: Management Hub
  // 5176: Gallery
  // 1420: MoneyTrash (Tauri Web)
  // 3000: Website (Next.js)

  webServer: [
    {
      command: "npm run dev:master",
      url: "http://localhost:8090",
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
      env: { NODE_ENV: "test" },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "npm run dev:touch",
      url: "http://localhost:8091",
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
      env: { NODE_ENV: "test" },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "npm run dev:management",
      url: "http://localhost:5175",
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
      env: { NODE_ENV: "test" },
      stdout: "pipe",
      stderr: "pipe",
    }
  ],
});
