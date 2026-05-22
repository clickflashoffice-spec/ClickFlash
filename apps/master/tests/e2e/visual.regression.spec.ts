import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Visual Regression — Login Page", () => {
  test("Login page visual snapshot", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveScreenshot("login-page.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("Login page with error state", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible({ timeout: 15000 });

    await page.fill('[data-testid="username-input"]', "test@test.com");
    await page.fill('[data-testid="password-input"]', "wrongpassword");
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot("login-page-error.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("Login button states", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const button = page.locator('[data-testid="login-button"]');
    await expect(button).toBeVisible({ timeout: 15000 });

    await expect(button).toHaveScreenshot("login-button-default.png");

    await button.hover();
    await expect(button).toHaveScreenshot("login-button-hover.png");
  });

  test("Login input states", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const emailInput = page.locator('[data-testid="username-input"]');
    await expect(emailInput).toBeVisible({ timeout: 15000 });

    await expect(emailInput).toHaveScreenshot("input-default.png");

    await emailInput.focus();
    await expect(emailInput).toHaveScreenshot("input-focus.png");

    await emailInput.fill("test@test.com");
    await expect(emailInput).toHaveScreenshot("input-filled.png");
  });
});

test.describe("Visual Regression — Authenticated Pages", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // Standard viewport: 1920x1080
  test("Dashboard at 1920x1080", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("dashboard-1920x1080.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  // Common laptop: 1366x768
  test("Dashboard at 1366x768", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("dashboard-1366x768.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  // iPad: 1024x768
  test("Dashboard at 1024x768", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("dashboard-1024x768.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  // Mobile: 375x667
  test("Dashboard at 375x667 (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("dashboard-mobile-375.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  // Tablet: 768x1024 portrait
  test("Dashboard at 768x1024 (tablet portrait)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("dashboard-tablet-portrait.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("Albums page snapshot", async ({ page }) => {
    await page.click('button:has-text("Albums")');
    await expect(page.locator("text=Album Workflow")).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveScreenshot("albums-page.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("Orders page snapshot", async ({ page }) => {
    await page.click('button:has-text("Orders")');
    await expect(page.locator('button[aria-current="page"]:has-text("Orders")')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveScreenshot("orders-page.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("Settings page snapshot", async ({ page }) => {
    await page.click('button:has-text("Settings")');
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveScreenshot("settings-page.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("Editor full width snapshot", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.click('button:has-text("Albums")');
    await expect(page.locator("text=Album Workflow")).toBeVisible({ timeout: 10000 });

    const albumCard = page.locator('[data-testid="album-item"]').first();
    if (!(await albumCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "No albums available for editor snapshot");
    }
    await albumCard.click();
    await page.waitForSelector('[data-testid="album-editor"]', { timeout: 15000 });
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("editor-full-width.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("Dark mode dashboard", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("dashboard-dark-mode.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("Dark mode albums", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.click('button:has-text("Albums")');
    await expect(page.locator("text=Album Workflow")).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveScreenshot("albums-dark-mode.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("Sidebar collapsed snapshot", async ({ page }) => {
    const collapseBtn = page
      .locator('button[aria-label*="Collapse"], button[aria-label*="collapse"], button:has-text("≪")')
      .first();
    if (await collapseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await collapseBtn.click();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot("sidebar-collapsed.png", {
        maxDiffPixelRatio: 0.01,
      });
    }
  });

  test("Growth page snapshot (no PIN)", async ({ page }) => {
    const growthBtn = page.locator('button:has-text("Growth")');
    if (await growthBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await growthBtn.click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot("growth-page.png", {
        maxDiffPixelRatio: 0.01,
      });
    }
  });

  test("Photographers page snapshot (no PIN)", async ({ page }) => {
    const photogBtn = page.locator('button:has-text("Photographers")');
    if (await photogBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await photogBtn.click();
      await expect(page.locator('h1:has-text("Photographers")')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveScreenshot("photographers-page.png", {
        maxDiffPixelRatio: 0.01,
      });
    }
  });
});
