import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for Management Hub App
 *
 * E2E testing for the web-based management portal
 */

export default defineConfig({
  testDir: "./tests/e2e",

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
    process.env.CI ? ["github"] : ["line"],
  ],

  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:5175",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5175",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },

  timeout: 60000,
  expect: {
    timeout: 10000,
  },
});
