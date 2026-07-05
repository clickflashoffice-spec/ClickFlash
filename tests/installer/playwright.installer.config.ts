import { defineConfig, devices } from "@playwright/test";

/**
 * Installer E2E test config.
 * Drives the actual Electron app via _electron.launch().
 * Starts the Vite dev server (port 5175) and the Electron main process.
 */
export default defineConfig({
  testDir: ".",
  testMatch: ["**/wizard-9step.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "electron", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: "cd ../../apps/installer && pnpm run dev",
      url: "http://127.0.0.1:5175",
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 60_000,
    },
  ],
});
