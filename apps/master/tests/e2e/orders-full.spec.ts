import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Orders — Full Coverage", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Orders")');
    await expect(page.locator('button[aria-current="page"]:has-text("Orders")')).toBeVisible({ timeout: 10000 });
  });

  test("should display orders view", async ({ page }) => {
    await expect(page.locator('button[aria-current="page"]:has-text("Orders")')).toBeVisible();
  });

  test("should show order list or empty state", async ({ page }) => {
    // Use .or() instead of comma-mixing CSS and text selectors
    const content = page
      .locator('table, [data-testid="orders-list"]')
      .or(page.getByText(/No orders|Create your first/i))
      .first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test("should have search/filter input", async ({ page }) => {
    const search = page.locator('input[placeholder*="Search" i], input[type="search"]').first();
    await expect(search).toBeVisible({ timeout: 10000 });
    await search.fill("test");
    await page.waitForTimeout(500);
    await search.clear();
  });

  test("should have status filter", async ({ page }) => {
    const statusFilter = page.locator('select, [data-testid="status-filter"], button:has-text("Status")').first();
    await expect(statusFilter).toBeVisible({ timeout: 10000 });
  });

  test("should have New Order button", async ({ page }) => {
    const newBtn = page.locator('button:has-text("New Order"), button:has-text("Create Order")').first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
  });

  test("clicking New Order opens create modal", async ({ page }) => {
    const newBtn = page.locator('button:has-text("New Order"), button:has-text("Create Order")').first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
    await newBtn.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
  });

  test("should have view toggle (list/board)", async ({ page }) => {
    const viewToggle = page.locator('button[aria-label*="list" i], button[aria-label*="board" i], button:has-text("Board")').first();
    await expect(viewToggle).toBeVisible({ timeout: 10000 });
    await viewToggle.click();
    await page.waitForTimeout(500);
  });

  test("order row click opens detail modal", async ({ page }) => {
    const row = page.locator('tbody tr, [data-testid="order-row"]').first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
  });

  test("print layout accessible from order", async ({ page }) => {
    const row = page.locator('tbody tr, [data-testid="order-row"]').first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();
    const printBtn = page.locator('button:has-text("Print"), button[aria-label*="print" i]').first();
    await expect(printBtn).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
  });
});
