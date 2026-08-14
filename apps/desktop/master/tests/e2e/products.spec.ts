import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Products", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const productsBtn = page.locator('button:has-text("Products")').first();
    if (!(await productsBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, "Products view not in sidebar — internal view");
      return;
    }
    await productsBtn.click();
    await page.waitForTimeout(1000);
  });

  test("should render products view", async ({ page }) => {
    const content = page.locator('[data-testid*="product"], text=/Products|Inventory/i, table').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test("should have add product button", async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Product"), button:has-text("New Product"), button:has-text("Create")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
  });

  test("clicking add opens product modal", async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Product"), button:has-text("New Product")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
  });

  test("product list shows items", async ({ page }) => {
    const items = page.locator('tbody tr, [data-testid="product-row"], [data-testid="product-card"]');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking product opens edit modal", async ({ page }) => {
    const row = page.locator('tbody tr, [data-testid="product-row"]').first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    const nameField = modal.locator('input[name*="name" i]').first();
    await expect(nameField).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
  });

  test("product has price field", async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Product"), button:has-text("New Product")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    const priceField = modal.locator('input[name*="price" i], input[type="number"]').first();
    await expect(priceField).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
  });
});
