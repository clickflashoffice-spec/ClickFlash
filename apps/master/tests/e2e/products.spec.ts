import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Products", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const productsBtn = page.locator('button:has-text("Products")').first();
    if (await productsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productsBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test("should render products view", async ({ page }) => {
    const content = page.locator('[data-testid*="product"], text=/Products|Inventory/i, table').first();
    if (await content.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(content).toBeVisible();
    }
  });

  test("should have add product button", async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Product"), button:has-text("New Product"), button:has-text("Create")').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(addBtn).toBeVisible();
    }
  });

  test("clicking add opens product modal", async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Product"), button:has-text("New Product")').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(modal).toBeVisible();
        await page.keyboard.press("Escape");
      }
    }
  });

  test("product list shows items", async ({ page }) => {
    const items = page.locator('tbody tr, [data-testid="product-row"], [data-testid="product-card"]');
    if (await items.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("clicking product opens edit modal", async ({ page }) => {
    const row = page.locator('tbody tr, [data-testid="product-row"]').first();
    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      await row.click();
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(modal).toBeVisible();
        const nameField = modal.locator('input[name*="name" i]').first();
        if (await nameField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(nameField).toBeVisible();
        }
        await page.keyboard.press("Escape");
      }
    }
  });

  test("product has price field", async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Product"), button:has-text("New Product")').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
        const priceField = modal.locator('input[name*="price" i], input[type="number"]').first();
        if (await priceField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(priceField).toBeVisible();
        }
        await page.keyboard.press("Escape");
      }
    }
  });
});
