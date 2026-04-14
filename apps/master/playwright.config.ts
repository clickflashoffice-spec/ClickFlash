import { defineConfig, devices } from "@playwright/test";
import path from "path";

const isCI = process.env.CI === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: !isCI,
  forbidOnly: !!process.env.CI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI 
    ? [["github"], ["html", { open: "never" }], ["junit", { outputFile: "test-results/junit.xml" }]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 45000,
    launchOptions: {
      slowMo: isCI ? 0 : 50,
    },
  },

  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
          ],
        },
      },
    },
    {
      name: "electron",
      use: {
        browserName: "chromium",
        channel: undefined,
        launchOptions: {
          executablePath: process.env.ELECTRON_PATH,
          args: [
            "--disable-dev-shm-usage",
            "--no-sandbox",
          ],
        },
      },
      testMatch: /.*\.electron\.spec\.ts/,
    },
  ],

  webServer: isCI ? undefined : {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    stdout: "pipe",
    stderr: "pipe",
  },

  timeout: 60000,
  expect: {
    timeout: 15000,
  },

  outputDir: "test-results/playwright",
  preserveOutput: "always",
});
