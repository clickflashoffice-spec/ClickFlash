import { defineConfig, devices } from '@playwright/test';

/**
 * ClickFlash Ecosystem - Playwright E2E Configuration
 * 
 * Tests all 7 apps across multiple browsers and devices
 */

export default defineConfig({
  // Look for test files in all app e2e directories
  testDir: './test-suite/apps',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit-report.xml' }],
    ['list']
  ],
  
  // Global setup and teardown
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  
  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:8090',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'on-first-retry',
    
    // Action timeout
    actionTimeout: 15000,
    
    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Configure projects for major browsers and apps
  projects: [
    // ==================== MASTER APP ====================
    {
      name: 'master-chromium',
      testDir: './test-suite/apps/master',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.MASTER_URL || 'http://localhost:8090',
      },
    },
    {
      name: 'master-firefox',
      testDir: './test-suite/apps/master',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: process.env.MASTER_URL || 'http://localhost:8090',
      },
    },
    {
      name: 'master-webkit',
      testDir: './test-suite/apps/master',
      use: {
        ...devices['Desktop Safari'],
        baseURL: process.env.MASTER_URL || 'http://localhost:8090',
      },
    },

    // ==================== TOUCH APP ====================
    {
      name: 'touch-chromium',
      testDir: './test-suite/apps/touch',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.TOUCH_URL || 'http://localhost:3001',
        viewport: { width: 1920, height: 1080 }, // Kiosk resolution
      },
    },
    {
      name: 'touch-firefox',
      testDir: './test-suite/apps/touch',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: process.env.TOUCH_URL || 'http://localhost:3001',
        viewport: { width: 1920, height: 1080 },
      },
    },

    // ==================== WEBSITE ====================
    {
      name: 'website-chromium',
      testDir: './test-suite/apps/website',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.WEBSITE_URL || 'https://clickflash-website.pages.dev',
      },
    },
    {
      name: 'website-firefox',
      testDir: './test-suite/apps/website',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: process.env.WEBSITE_URL || 'https://clickflash-website.pages.dev',
      },
    },
    {
      name: 'website-webkit',
      testDir: './test-suite/apps/website',
      use: {
        ...devices['Desktop Safari'],
        baseURL: process.env.WEBSITE_URL || 'https://clickflash-website.pages.dev',
      },
    },
    // Mobile browsers for website
    {
      name: 'website-mobile-chrome',
      testDir: './test-suite/apps/website',
      use: {
        ...devices['Pixel 5'],
        baseURL: process.env.WEBSITE_URL || 'https://clickflash-website.pages.dev',
      },
    },
    {
      name: 'website-mobile-safari',
      testDir: './test-suite/apps/website',
      use: {
        ...devices['iPhone 12'],
        baseURL: process.env.WEBSITE_URL || 'https://clickflash-website.pages.dev',
      },
    },

    // ==================== MONEYTRASH API ====================
    {
      name: 'moneytrash-api',
      testDir: './test-suite/apps/moneytrash',
      use: {
        baseURL: process.env.MONEYTRASH_URL || 'https://moneytrash-api.clickflash-office.workers.dev',
      },
    },

    // ==================== GALLERY ====================
    {
      name: 'gallery-chromium',
      testDir: './test-suite/apps/gallery',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.GALLERY_URL || 'https://gallery-backend.clickflash-office.workers.dev',
      },
    },

    // ==================== MANAGEMENT ====================
    {
      name: 'management-chromium',
      testDir: './test-suite/apps/management',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.MANAGEMENT_URL || 'https://management-hub.clickflash-office.workers.dev',
      },
    },

    // ==================== INSTALLER ====================
    {
      name: 'installer-chromium',
      testDir: './test-suite/apps/installer',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.INSTALLER_URL || 'http://localhost:3002',
      },
    },

    // ==================== 9-LAYER QA GAUNTLET ====================
    {
      name: 'ecosystem',
      testDir: './tests/ecosystem',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.MASTER_URL || 'http://localhost:8090',
      },
    },
    {
      name: 'security',
      testDir: './test-suite/security',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.MASTER_URL || 'http://localhost:8090',
      },
    },
    {
      name: 'accessibility',
      testDir: './test-suite/accessibility',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.WEBSITE_URL || 'https://clickflash-website.pages.dev',
      },
    },
    {
      name: 'visual',
      testDir: './test-suite/visual',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.MASTER_URL || 'http://localhost:8090',
      },
    },
    {
      name: 'smoke',
      testDir: './test-suite/smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.MASTER_URL || 'http://localhost:8090',
      },
    },
  ],

  // Run local dev server before starting tests
  // webServer: [
  //   {
  //     command: 'cd apps/master && npm run dev',
  //     url: 'http://localhost:8090/api/health',
  //     timeout: 120000,
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: 'cd apps/touch && npm run dev',
  //     url: 'http://localhost:3001',
  //     timeout: 120000,
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: 'cd apps/website && npm run dev',
  //     url: 'http://localhost:3000',
  //     timeout: 120000,
  //     reuseExistingServer: !process.env.CI,
  //   },
  // ],
});
