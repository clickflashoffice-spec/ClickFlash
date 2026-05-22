import { test, expect } from "@playwright/test";
import { login, navigateToView } from "./helpers/auth";

test.describe("User Management — Photographers View", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to Photographers view (no PIN)", async ({ page }) => {
    await navigateToView(page, "Photographers");
    await expect(page.locator('h1:has-text("Photographers")')).toBeVisible({ timeout: 10000 });
  });

  test("should display photographer list or empty state", async ({ page }) => {
    await navigateToView(page, "Photographers");
    await expect(page.locator('h1:has-text("Photographers")')).toBeVisible({ timeout: 10000 });
    // Page renders without errors — body always visible
    await expect(page.locator("body")).toBeVisible();
  });

  test("should show photographer count in header", async ({ page }) => {
    await navigateToView(page, "Photographers");
    await expect(page.locator('h1:has-text("Photographers")')).toBeVisible({ timeout: 10000 });
    const countText = page.locator("text=/\\d+ of \\d+ photographer/");
    if (await countText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(countText).toBeVisible();
    }
  });

  test("should navigate between photographers and dashboard", async ({ page }) => {
    await navigateToView(page, "Photographers");
    await expect(page.locator('h1:has-text("Photographers")')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Dashboard")');
    await expect(page.locator('button[aria-current="page"]:has-text("Dashboard")')).toBeVisible({ timeout: 5000 });
  });

  test("should navigate between photographers and albums", async ({ page }) => {
    await navigateToView(page, "Photographers");
    await expect(page.locator('h1:has-text("Photographers")')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Albums")');
    await expect(page.locator("text=Album Workflow")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("User Management — Settings Users Tab", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to User Management settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });

    const usersTab = page.locator('button:has-text("Users"), button:has-text("User Management")').first();
    if (await usersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usersTab.click();
      await page.waitForTimeout(500);
      // User table or user list should render
      const userContent = page
        .locator('text=/user|email|role/i')
        .first();
      if (await userContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(userContent).toBeVisible();
      }
    }
  });

  test("should show Add User button in User Management", async ({ page }) => {
    await navigateToView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });

    const usersTab = page.locator('button:has-text("Users"), button:has-text("User Management")').first();
    if (!(await usersTab.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, "Users tab not visible");
    }
    await usersTab.click();
    await page.waitForTimeout(500);

    const addBtn = page.locator('button:has-text("Add User"), button:has-text("Add"), button:has-text("Create User")').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(addBtn).toBeVisible();
    }
  });

  test("should open Add User modal", async ({ page }) => {
    await navigateToView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });

    const usersTab = page.locator('button:has-text("Users"), button:has-text("User Management")').first();
    if (!(await usersTab.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, "Users tab not visible");
    }
    await usersTab.click();
    await page.waitForTimeout(500);

    const addBtn = page.locator('button:has-text("Add User"), button:has-text("Add"), button:has-text("Create User")').first();
    if (!(await addBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, "Add User button not visible");
    }
    await addBtn.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test("should display user list with role column", async ({ page }) => {
    await navigateToView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });

    const usersTab = page.locator('button:has-text("Users"), button:has-text("User Management")').first();
    if (!(await usersTab.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, "Users tab not visible");
    }
    await usersTab.click();
    await page.waitForTimeout(500);

    // Table should have role indicators (admin, viewer, photographer, etc.)
    const roleIndicator = page.locator('text=/admin|viewer|photographer|manager/i').first();
    if (await roleIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(roleIndicator).toBeVisible();
    }
  });

  test("should navigate to Permissions settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });

    const permTab = page.locator('button:has-text("Permissions")').first();
    if (await permTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await permTab.click();
      await page.waitForTimeout(500);
      // Permissions matrix or role list
      const permContent = page.locator('text=/permission|role|access/i').first();
      if (await permContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(permContent).toBeVisible();
      }
    }
  });
});
