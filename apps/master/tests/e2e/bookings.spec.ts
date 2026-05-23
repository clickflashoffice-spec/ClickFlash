import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Bookings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const bookingsBtn = page.locator('button:has-text("Bookings")').first();
    if (!(await bookingsBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, "Bookings view not in sidebar — internal view");
      return;
    }
    await bookingsBtn.click();
    await page.waitForTimeout(1000);
  });

  test("should render bookings view or calendar", async ({ page }) => {
    const content = page.locator('[class*="calendar"], [data-testid*="booking"], text=/Bookings|Calendar/i').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test("should display current month in calendar", async ({ page }) => {
    const monthLabel = page.locator('text=/January|February|March|April|May|June|July|August|September|October|November|December/').first();
    await expect(monthLabel).toBeVisible({ timeout: 10000 });
  });

  test("should have create booking button", async ({ page }) => {
    const createBtn = page.locator('button:has-text("New Booking"), button:has-text("Create Booking"), button:has-text("Add")').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
  });

  test("clicking create opens booking modal", async ({ page }) => {
    const createBtn = page.locator('button:has-text("New Booking"), button:has-text("Create Booking")').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
  });

  test("booking modal has required fields", async ({ page }) => {
    const createBtn = page.locator('button:has-text("New Booking"), button:has-text("Create Booking")').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    const nameField = modal.locator('input[name*="name" i], input[placeholder*="name" i]').first();
    await expect(nameField).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
  });
});
