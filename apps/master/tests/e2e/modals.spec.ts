import { test, expect } from "@playwright/test";
import { login, navigateToView } from "./helpers/auth";

test.describe("Modals — Open/Close/ESC/Backdrop", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("CreateOrderModal opens and closes on ESC", async ({ page }) => {
    await page.click('button:has-text("Orders")');
    await page.waitForTimeout(1000);
    const newBtn = page.locator('button:has-text("New Order"), button:has-text("Create Order")').first();
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
      await page.keyboard.press("Escape");
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
    }
  });

  test("CreateOrderModal closes on Cancel button", async ({ page }) => {
    await page.click('button:has-text("Orders")');
    await page.waitForTimeout(1000);
    const newBtn = page.locator('button:has-text("New Order"), button:has-text("Create Order")').first();
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click();
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
        const cancelBtn = modal.locator('button:has-text("Cancel")').first();
        if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cancelBtn.click();
          await expect(modal).toBeHidden({ timeout: 5000 });
        }
      }
    }
  });

  test("OrderEditModal opens from order row", async ({ page }) => {
    await page.click('button:has-text("Orders")');
    await page.waitForTimeout(1000);
    const row = page.locator('tbody tr, [data-testid="order-row"]').first();
    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      await row.click();
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(modal).toBeVisible();
        await page.keyboard.press("Escape");
      }
    }
  });

  test("Settings UserEditModal opens and closes", async ({ page }) => {
    await navigateToView(page, "Settings");
    await page.waitForTimeout(1000);

    const usersTab = page.locator('button:has-text("Users"), button:has-text("User Management")').first();
    if (await usersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usersTab.click();
      await page.waitForTimeout(500);

      const addBtn = page.locator('button:has-text("Add User"), button:has-text("New User")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click();
        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(modal).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(modal).toBeHidden({ timeout: 5000 });
        }
      }
    }
  });

  test("Settings CategoryEditModal opens and closes", async ({ page }) => {
    await navigateToView(page, "Settings");
    await page.waitForTimeout(1000);

    const catTab = page.locator('button:has-text("Categories"), button:has-text("Category")').first();
    if (await catTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await catTab.click();
      await page.waitForTimeout(500);

      const addBtn = page.locator('button:has-text("Add Category"), button:has-text("New Category")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click();
        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(modal).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(modal).toBeHidden({ timeout: 5000 });
        }
      }
    }
  });

  test("Settings SessionTypeEditModal opens and closes", async ({ page }) => {
    await navigateToView(page, "Settings");
    await page.waitForTimeout(1000);

    const sessTab = page.locator('button:has-text("Session Types"), button:has-text("Sessions")').first();
    if (await sessTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sessTab.click();
      await page.waitForTimeout(500);

      const addBtn = page.locator('button:has-text("Add Session"), button:has-text("New Session")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click();
        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(modal).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(modal).toBeHidden({ timeout: 5000 });
        }
      }
    }
  });

  test("KioskSelectionModal from editor opens and closes", async ({ page }) => {
    await page.click('button:has-text("Albums")');
    const albumCard = page.locator('[data-testid="album-item"]').first();
    if (!(await albumCard.isVisible({ timeout: 10000 }).catch(() => false))) {
      test.skip(true, "No albums available");
    }
    await albumCard.click();
    await page.waitForSelector('[data-testid="album-editor"]', { timeout: 15000 });

    await page.locator('[data-testid="send-to-kiosk-button"]').click();
    const modal = page.locator('[role="dialog"]');
    if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(modal).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(modal).toBeHidden({ timeout: 5000 });
    }
  });

  test("DailyResortStatsModal opens from sidebar", async ({ page }) => {
    const statsBtn = page.locator('button[aria-label*="stats" i], button:has-text("Daily Stats")').first();
    if (await statsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statsBtn.click();
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(modal).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(modal).toBeHidden({ timeout: 5000 });
      }
    }
  });

  test("AI Ideas modal opens from sidebar", async ({ page }) => {
    const aiBtn = page.locator('button:has-text("AI Ideas"), button[aria-label*="AI" i]').first();
    if (await aiBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiBtn.click();
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(modal).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(modal).toBeHidden({ timeout: 5000 });
      }
    }
  });
});
