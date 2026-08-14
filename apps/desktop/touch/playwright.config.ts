import { defineConfig, devices } from "@playwright/test";

// Force mock data for E2E testing to ensure albums and photos are available
process.env.VITE_USE_MOCK_DATA = "true";

/**
 * Playwright Configuration for Touch Kiosk App
 *
 * E2E testing for the customer-facing kiosk interface
 */

export default defineConfig({
  testDir: "./tests/e2e",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
    process.env.CI ? ["github"] : ["line"],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.TEST_BASE_URL || "http://localhost:5174",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on failure */
    video: "on-first-retry",

    /* Viewport size - typical kiosk display */
    viewport: { width: 1920, height: 1080 },

    /* Action timeout */
    actionTimeout: 15000,

    /* Navigation timeout */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        /* Kiosk mode settings */
        launchOptions: {
          args: [
            "--kiosk",
            "--fullscreen",
            "--disable-infobars",
            "--disable-features=Translate",
          ],
        },
      },
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : {
        command: "npm run dev:full",
        url: "http://localhost:5174",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        stdout: "pipe",
        stderr: "pipe",
      },

  /* Test timeout */
  timeout: 60000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },
});
