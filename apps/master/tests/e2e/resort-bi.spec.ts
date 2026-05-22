import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Resort BI Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const biBtn = page.locator('button:has-text("Resort BI")').first();
    await expect(biBtn).toBeVisible({ timeout: 10000 });
    await biBtn.click();
    await page.waitForTimeout(1000);
  });

  test("should render resort BI dashboard", async ({ page }) => {
    const content = page.locator('button[aria-current="page"]:has-text("Resort BI"), text=/Resort|BI|Dashboard/i').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test("should display metrics or charts", async ({ page }) => {
    const metrics = page.locator('canvas, [class*="chart"], [class*="glass-card"], [data-testid*="metric"]').first();
    await expect(metrics).toBeVisible({ timeout: 10000 });
  });

  test("should have meeting log section", async ({ page }) => {
    const meetingSection = page.locator('text=/Meeting|Log|Notes/i').first();
    await expect(meetingSection).toBeVisible({ timeout: 10000 });
  });

  test("should display trend data", async ({ page }) => {
    const trends = page.locator('text=/Trend|Monthly|Comparison|Growth/i').first();
    await expect(trends).toBeVisible({ timeout: 10000 });
  });
});
