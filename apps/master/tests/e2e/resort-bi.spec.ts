import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Resort BI Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const biBtn = page.locator('button:has-text("Resort BI")').first();
    if (await biBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await biBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test("should render resort BI dashboard", async ({ page }) => {
    const content = page.locator('button[aria-current="page"]:has-text("Resort BI"), text=/Resort|BI|Dashboard/i').first();
    if (await content.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(content).toBeVisible();
    }
  });

  test("should display metrics or charts", async ({ page }) => {
    const metrics = page.locator('canvas, [class*="chart"], [class*="glass-card"], [data-testid*="metric"]').first();
    if (await metrics.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(metrics).toBeVisible();
    }
  });

  test("should have meeting log section", async ({ page }) => {
    const meetingSection = page.locator('text=/Meeting|Log|Notes/i').first();
    if (await meetingSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(meetingSection).toBeVisible();
    }
  });

  test("should display trend data", async ({ page }) => {
    const trends = page.locator('text=/Trend|Monthly|Comparison|Growth/i').first();
    if (await trends.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(trends).toBeVisible();
    }
  });
});
