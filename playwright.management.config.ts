import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: './apps/management/tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:5175',
  },
  webServer: {
    command: 'pnpm --filter @clickflash/management run dev',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
