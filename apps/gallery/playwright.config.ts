import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for Customer Gallery App
 *
 * E2E testing for the customer-facing photo gallery and store
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
    baseURL: process.env.TEST_BASE_URL || "http://localhost:5176",
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
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5176",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  timeout: 120000, // Longer timeout for payment flows
  expect: {
    timeout: 10000,
  },
});
