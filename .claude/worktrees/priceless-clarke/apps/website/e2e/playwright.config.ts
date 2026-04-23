import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for ClickFlash Website E2E Tests
 * 
 * This configuration supports:
 * - Multiple browsers (Chromium, Firefox, WebKit)
 * - Mobile device testing
 * - Parallel execution
 * - Screenshot and video capture on failure
 * - HTML report generation
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./",
  
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
    ["html", { outputFolder: "../../playwright-report/website", open: "never" }],
    ["list"],
    process.env.CI ? ["github"] : ["line"],
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: BASE_URL,
    
    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",
    
    /* Take screenshot on failure */
    screenshot: "only-on-failure",
    
    /* Record video on failure */
    video: "on-first-retry",
    
    /* Viewport size */
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
        launchOptions: {
          args: [
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
          ],
        },
      },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },

    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },

    /* Test against branded browsers */
    {
      name: "Microsoft Edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },

    {
      name: "Google Chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },

  /* Global setup and teardown */
  globalSetup: undefined,
  globalTeardown: undefined,
});
