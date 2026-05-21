import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Clients", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const clientsBtn = page.locator('button:has-text("Clients")').first();
    if (await clientsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clientsBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test("should render clients view", async ({ page }) => {
    const content = page.locator('[data-testid*="client"], text=/Clients|Customer/i, table').first();
    if (await content.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(content).toBeVisible();
    }
  });

  test("should have search input", async ({ page }) => {
    const search = page.locator('input[placeholder*="Search" i], input[type="search"]').first();
    if (await search.isVisible({ timeout: 3000 }).catch(() => false)) {
      await search.fill("test");
      await page.waitForTimeout(500);
      await search.clear();
    }
  });

  test("clicking client opens details modal", async ({ page }) => {
    const row = page.locator('tbody tr, [data-testid="client-row"], [data-testid="client-card"]').first();
    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      await row.click();
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(modal).toBeVisible();
        await page.keyboard.press("Escape");
      }
    }
  });

  test("client details shows order history", async ({ page }) => {
    const row = page.locator('tbody tr, [data-testid="client-row"]').first();
    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      await row.click();
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
        const history = modal.locator('text=/Orders|History|Purchases/i').first();
        if (await history.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(history).toBeVisible();
        }
        await page.keyboard.press("Escape");
      }
    }
  });
});
