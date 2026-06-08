import { test, expect } from "@playwright/test";

/**
 * ClickFlash Installer E2E Tests
 * Tests the full 1-click installation wizard flow
 */

test.describe("ClickFlash Installer Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5175");
  });

  test("Step 1: Welcome screen renders correctly", async ({ page }) => {
    await expect(page.locator("text=Welcome to ClickFlash Studio")).toBeVisible();
    await expect(page.locator("text=1-Click Setup")).toBeVisible();
    await expect(page.locator("text=Global Sync")).toBeVisible();
    await expect(page.locator("text=Enterprise Security")).toBeVisible();
    await expect(page.locator("button:has-text('Get Started')")).toBeEnabled();
  });

  test("Step 2: Prerequisites check runs and shows results", async ({ page }) => {
    await page.click("button:has-text('Get Started')");
    await expect(page.locator("text=System Prerequisites")).toBeVisible();
    
    await page.click("button:has-text('Run System Check')");
    await expect(page.locator("text=Checking...")).toBeVisible();
    
    await page.waitForSelector("text=Node.js Runtime", { timeout: 30000 });
    await expect(page.locator("text=Disk Space")).toBeVisible();
    await expect(page.locator("text=Network Ports")).toBeVisible();
    
    const nextBtn = page.locator("button:has-text('Next')").last();
    await expect(nextBtn).toBeEnabled();
  });

  test("Step 3: Cloudflare token validation", async ({ page }) => {
    await page.click("button:has-text('Get Started')");
    await page.click("button:has-text('Run System Check')");
    await page.waitForSelector("text=Node.js Runtime", { timeout: 30000 });
    await page.click("button:has-text('Next')").last();
    
    await expect(page.locator("text=Cloudflare Account")).toBeVisible();
    
    await page.fill("input[type='password']", "invalid-token");
    await page.click("button:has-text('Test')");
    await expect(page.locator("text=Invalid token")).toBeVisible();
    
    await page.fill("input[type='password']", "cfat_valid_mock_token");
    await page.click("button:has-text('Test')");
    await page.waitForSelector("text=Token valid", { timeout: 10000 });
    await expect(page.locator("text=Found")).toBeVisible();
  });

  test("Step 4: Studio profile configuration", async ({ page }) => {
    await page.click("button:has-text('Get Started')");
    await page.click("button:has-text('Run System Check')");
    await page.waitForSelector("text=Node.js Runtime", { timeout: 30000 });
    await page.click("button:has-text('Next')").last();
    await page.fill("input[type='password']", "cfat_valid_mock_token");
    await page.click("button:has-text('Test')");
    await page.waitForSelector("text=Token valid", { timeout: 10000 });
    await page.click("button:has-text('Register Fleet')");
    await page.waitForSelector("text=Fleet Registered", { timeout: 15000 });
    
    await expect(page.locator("text=Studio Profile")).toBeVisible();
    
    await page.fill("input[placeholder*='Bali Beach Photography']", "Test Studio Maldives");
    await page.fill("input[placeholder*='Bali, Indonesia']", "Maldives, North Atoll");
    await page.selectOption("select", "USD");
    
    await expect(page.locator("button:has-text('Next')").last()).toBeEnabled();
  });

  test("Step 5: Touch Kiosk pairing", async ({ page }) => {
    await page.click("button:has-text('Get Started')");
    await page.click("button:has-text('Run System Check')");
    await page.waitForSelector("text=Node.js Runtime", { timeout: 30000 });
    await page.click("button:has-text('Next')").last();
    await page.fill("input[type='password']", "cfat_valid_mock_token");
    await page.click("button:has-text('Test')");
    await page.waitForSelector("text=Token valid", { timeout: 10000 });
    await page.click("button:has-text('Register Fleet')");
    await page.waitForSelector("text=Fleet Registered", { timeout: 15000 });
    await page.click("button:has-text('Next')").last();
    await page.fill("input[placeholder*='Bali Beach Photography']", "Test Studio");
    await page.click("button:has-text('Next')").last();
    
    await expect(page.locator("text=Touch Kiosk Pairing")).toBeVisible();
    
    await page.click("button:has-text('Auto-Discover Kiosk')");
    await page.waitForSelector("text=Searching", { timeout: 5000 });
    await page.waitForSelector("text=Touch Kiosk", { timeout: 10000 });
  });

  test("Step 6: Health checks", async ({ page }) => {
    await page.click("button:has-text('Get Started')");
    await page.click("button:has-text('Run System Check')");
    await page.waitForSelector("text=Node.js Runtime", { timeout: 30000 });
    await page.click("button:has-text('Next')").last();
    await page.fill("input[type='password']", "cfat_valid_mock_token");
    await page.click("button:has-text('Test')");
    await page.waitForSelector("text=Token valid", { timeout: 10000 });
    await page.click("button:has-text('Register Fleet')");
    await page.waitForSelector("text=Fleet Registered", { timeout: 15000 });
    await page.click("button:has-text('Next')").last();
    await page.fill("input[placeholder*='Bali Beach Photography']", "Test Studio");
    await page.click("button:has-text('Next')").last();
    await page.click("button:has-text('Skip')");
    
    await expect(page.locator("text=Health Check")).toBeVisible();
    
    await page.click("button:has-text('Run Health Checks')");
    await page.waitForSelector("text=Master Backend", { timeout: 30000 });
    
    await expect(page.locator("text=Cloud Heartbeat")).toBeVisible();
    await expect(page.locator("text=D1 Database")).toBeVisible();
    await expect(page.locator("text=R2 Storage")).toBeVisible();
  });

  test("Step 7: Complete and launch", async ({ page }) => {
    await page.click("button:has-text('Get Started')");
    await page.click("button:has-text('Run System Check')");
    await page.waitForSelector("text=Node.js Runtime", { timeout: 30000 });
    await page.click("button:has-text('Next')").last();
    await page.fill("input[type='password']", "cfat_valid_mock_token");
    await page.click("button:has-text('Test')");
    await page.waitForSelector("text=Token valid", { timeout: 10000 });
    await page.click("button:has-text('Register Fleet')");
    await page.waitForSelector("text=Fleet Registered", { timeout: 15000 });
    await page.click("button:has-text('Next')").last();
    await page.fill("input[placeholder*='Bali Beach Photography']", "Test Studio");
    await page.click("button:has-text('Next')").last();
    await page.click("button:has-text('Skip')");
    await page.click("button:has-text('Run Health Checks')");
    await page.waitForSelector("text=Master Backend", { timeout: 30000 });
    await page.click("button:has-text('Next')").last();
    
    await expect(page.locator("text=Installation Complete")).toBeVisible();
    await expect(page.locator("text=Launch Studio")).toBeEnabled();
  });

  test("Full wizard flow: end-to-end installation", async ({ page }) => {
    await page.click("button:has-text('Get Started')");
    await page.click("button:has-text('Run System Check')");
    await page.waitForSelector("text=Node.js Runtime", { timeout: 30000 });
    await page.click("button:has-text('Next')").last();
    
    await page.fill("input[type='password']", "cfat_valid_mock_token");
    await page.click("button:has-text('Test')");
    await page.waitForSelector("text=Token valid", { timeout: 10000 });
    await page.click("button:has-text('Register Fleet')");
    await page.waitForSelector("text=Fleet Registered", { timeout: 15000 });
    await page.click("button:has-text('Next')").last();
    
    await page.fill("input[placeholder*='Bali Beach Photography']", "E2E Test Studio");
    await page.fill("input[placeholder*='Bali, Indonesia']", "Test Location");
    await page.click("button:has-text('Next')").last();
    
    await page.click("button:has-text('Skip')");
    await page.click("button:has-text('Run Health Checks')");
    await page.waitForSelector("text=Master Backend", { timeout: 30000 });
    await page.click("button:has-text('Next')").last();
    
    await expect(page.locator("text=Installation Complete")).toBeVisible();
    await expect(page.locator("text=E2E Test Studio")).toBeVisible();
  });
});
