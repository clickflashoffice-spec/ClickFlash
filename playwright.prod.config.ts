import { defineConfig, devices } from "@playwright/test";

/**
 * Production E2E Configuration
 * Tests the compiled/built applications rather than the dev servers.
 */
export default defineConfig({
  testDir: './',
  testMatch: [
    'tests/ecosystem/**/*.spec.ts',
  ],
  testIgnore: [
    '**/.claude/**',
    '**/node_modules/**'
  ],
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  timeout: 300000, 

  use: {
    baseURL: 'http://localhost:8090',
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Run the PRODUCTION built servers
  webServer: [
    {
      command: "cd apps/master && npm run start",
      url: "http://localhost:8090",
      reuseExistingServer: true,
      timeout: 180 * 1000,
      env: { NODE_ENV: "production" },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "cd apps/touch && npm run start",
      url: "http://localhost:8091",
      reuseExistingServer: true,
      timeout: 180 * 1000,
      env: { NODE_ENV: "production" },
      stdout: "pipe",
      stderr: "pipe",
    }
  ],
});
