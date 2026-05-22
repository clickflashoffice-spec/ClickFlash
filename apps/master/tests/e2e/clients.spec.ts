import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Clients", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const clientsBtn = page.locator('button:has-text("Clients")').first();
    if (!(await clientsBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, "Clients view not in sidebar — internal view");
      return;
    }
    await clientsBtn.click();
    await page.waitForTimeout(1000);
  });

  test("should render clients view", async ({ page }) => {
    const content = page.locator('[data-testid*="client"], text=/Clients|Customer/i, table').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test("should have search input", async ({ page }) => {
    const search = page.locator('input[placeholder*="Search" i], input[type="search"]').first();
    await expect(search).toBeVisible({ timeout: 10000 });
    await search.fill("test");
    await page.waitForTimeout(500);
    await search.clear();
  });

  test("clicking client opens details modal", async ({ page }) => {
    const row = page.locator('tbody tr, [data-testid="client-row"], [data-testid="client-card"]').first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
  });

  test("client details shows order history", async ({ page }) => {
    const row = page.locator('tbody tr, [data-testid="client-row"]').first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    const history = modal.locator('text=/Orders|History|Purchases/i').first();
    await expect(history).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
  });
});
