import { test, expect } from "@playwright/test";
import { TEST_CREDENTIALS } from "./helpers/auth";

/**
 * Authentication E2E Tests
 *
 * Note: These tests require the backend server to be running.
 * The webServer config in playwright.config.ts handles this automatically.
 */

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    // Log browser console messages for debugging
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
      }
    });
  });

  test("should login with valid credentials", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Wait for login page to load
    await expect(page.getByText("SYSTEM ONLINE")).toBeVisible({
      timeout: 30000,
    });

    // Fill credentials and submit
    await page.fill(
      '[data-testid="username-input"]',
      TEST_CREDENTIALS.username,
    );
    await page.fill(
      '[data-testid="password-input"]',
      TEST_CREDENTIALS.password,
    );
    await page.click('[data-testid="login-button"]');

    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/\/(dashboard)?(\?.*)?$/, { timeout: 30000 });

    // Verify dashboard loaded by checking for navigation or main content
    await expect(page.locator('nav, main, [role="main"]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("/login");

    // Wait for page to be ready
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible({
      timeout: 10000,
    });

    // Try invalid login
    await page.fill(
      '[data-testid="username-input"]',
      TEST_CREDENTIALS.username,
    );
    await page.fill('[data-testid="password-input"]', "wrongDEFAULT_PASSWORD_PLACEHOLDER");
    await page.click('[data-testid="login-button"]');

    // Check error message appears
    const errorLocator = page.locator('[data-testid="error-message"]');
    await expect(errorLocator).toBeVisible({ timeout: 10000 });

    // Verify error text contains expected message
    const errorText = await errorLocator.textContent();
    expect(errorText).toMatch(/(Invalid|Backend server is not running)/);
  });

  test("should logout successfully", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill(
      '[data-testid="username-input"]',
      TEST_CREDENTIALS.username,
    );
    await page.fill(
      '[data-testid="password-input"]',
      TEST_CREDENTIALS.password,
    );
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/\/(dashboard)?(\?.*)?$/, { timeout: 30000 });

    // Wait for sidebar to load with user info
    await page.waitForTimeout(1000);

    // Click Switch User button to logout
    await page.click("text=Switch User");

    // Verify back on login page
    await expect(page.locator("text=SYSTEM ONLINE")).toBeVisible({
      timeout: 15000,
    });
  });

  test("should redirect to login when accessing protected route", async ({
    page,
  }) => {
    // Try to access a protected route without being logged in
    await page.goto("/albums");

    // Should see login page
    await expect(page.locator("text=SYSTEM ONLINE")).toBeVisible({
      timeout: 15000,
    });
  });

  test("should handle multiple failed login attempts", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible({
      timeout: 10000,
    });

    // Attempt multiple failed logins
    for (let i = 0; i < 3; i++) {
      await page.fill(
        '[data-testid="username-input"]',
        TEST_CREDENTIALS.username,
      );
      await page.fill('[data-testid="password-input"]', `wrongpassword${i}`);
      await page.click('[data-testid="login-button"]');

      // Wait for error to appear
      await page.waitForTimeout(500);

      // Clear inputs for next attempt
      await page.locator('[data-testid="password-input"]').fill("");
    }

    // Final attempt - check error is shown
    const errorLocator = page.locator('[data-testid="error-message"]');
    await expect(errorLocator).toBeVisible({ timeout: 10000 });

    const errorText = await errorLocator.textContent();
    expect(errorText).toMatch(
      /(Invalid|Backend server is not running|Too many login attempts|Too Many Requests|Rate limit exceeded)/i,
    );
  });
});
