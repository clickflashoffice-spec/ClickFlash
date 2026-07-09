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
  timeout: 15000, 
  expect: { timeout: 5000 },

  use: {
    baseURL: 'http://127.0.0.1:8090',
    actionTimeout: 5000,
    navigationTimeout: 10000,
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
      url: "http://127.0.0.1:8090/api/health",
      reuseExistingServer: true,
      timeout: 180 * 1000,
      env: { NODE_ENV: "production", TEST_E2E: "1" },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "cd apps/touch && npm run start",
      url: "http://127.0.0.1:8091/api/health",
      reuseExistingServer: true,
      timeout: 180 * 1000,
      env: { NODE_ENV: "production", TEST_E2E: "1" },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "cd apps/website && npm run start -- -H 127.0.0.1",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: true,
      timeout: 180 * 1000,
      env: { NODE_ENV: "production" },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "cd apps/gallery && npm run preview -- --port 3001 --strictPort --host 127.0.0.1",
      url: "http://127.0.0.1:3001",
      reuseExistingServer: true,
      timeout: 180 * 1000,
      env: { NODE_ENV: "production" },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "cd apps/management && npm run preview -- --port 5173 --strictPort --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      timeout: 180 * 1000,
      env: { NODE_ENV: "production" },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "cd apps/moneytrash && npm run preview -- --port 3002 --strictPort --host 127.0.0.1",
      url: "http://127.0.0.1:3002",
      reuseExistingServer: true,
      timeout: 180 * 1000,
      env: { NODE_ENV: "production" },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "cd workers/management-worker && npm run start -- --port 8787",
      url: "http://127.0.0.1:8787/api/health",
      reuseExistingServer: true,
      timeout: 180 * 1000,
      env: { NODE_ENV: "production" },
      stdout: "pipe",
      stderr: "pipe",
    }
  ],
});
