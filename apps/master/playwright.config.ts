import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Disable parallel to avoid backend overload
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry once on failure
  workers: 1, // Single worker to avoid DB conflicts
  reporter: "list", // Use list reporter for better visibility



  /* Global timeout */
  timeout: 120000, // 2 minutes per test

  expect: {
    timeout: 15000,
  },

  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    /* Increase navigation timeout */
    navigationTimeout: 30000,
    actionTimeout: 15000,
    /* Add longer timeouts for stability */
    launchOptions: {
      slowMo: 100, // Slow down actions for stability
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run preview:full",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 300 * 1000, // 5 minutes to start
    stdout: "pipe",
    stderr: "pipe",
    env: {
      NODE_ENV: "test",
      // Keep these in sync with TEST_CREDENTIALS in tests/e2e/helpers/auth.ts
      DEFAULT_ADMIN_EMAIL: process.env.TEST_ADMIN_EMAIL ?? "admin@clickflash.local",
      DEFAULT_ADMIN_PASSWORD: process.env.TEST_ADMIN_PASSWORD ?? "ClickFlash2025!",
    },
  },
});
