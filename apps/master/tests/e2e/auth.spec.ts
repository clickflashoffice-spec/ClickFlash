import { test, expect } from "@playwright/test";
import { TEST_CREDENTIALS } from "./helpers/auth";

/**
 * Authentication E2E Tests
 * 
 * Note: These tests require both frontend and backend servers.
 * The webServer config in playwright.config.ts starts the frontend.
 * Backend must be running separately or via npm run dev:full
 */

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log(`BROWSER ERROR: ${msg.text()}`);
      }
    });
    
    page.on("pageerror", (err) => {
      console.log(`PAGE ERROR: ${err.message}`);
    });
  });

  test("should display login page with form elements", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Wait for form inputs to be visible
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible({ timeout: 5000 });
  });

  test("should show system status indicator", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Wait for status indicator - check for ONLINE or OFFLINE MODE text
    await expect(
      page.locator("text=SYSTEM ONLINE").or(page.locator("text=OFFLINE MODE"))
    ).toBeVisible({ timeout: 30000 });
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Wait for form
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible({ timeout: 30000 });

    // Fill invalid credentials
    await page.fill('[data-testid="username-input"]', "invalid@test.com");
    await page.fill('[data-testid="password-input"]', "wrongpassword");
    await page.click('[data-testid="login-button"]');

    // Error message should appear (either from invalid creds or backend not running)
    const errorLocator = page.locator('[data-testid="error-message"]');
    await expect(errorLocator).toBeVisible({ timeout: 15000 });
  });

  test("should have email input with correct attributes", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const emailInput = page.locator('[data-testid="username-input"]');
    await expect(emailInput).toBeVisible({ timeout: 30000 });
    
    // Check it's an email input type
    const inputType = await emailInput.getAttribute("type");
    expect(inputType).toBe("email");
  });

  test("should have password input with correct attributes", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const passwordInput = page.locator('[data-testid="password-input"]');
    await expect(passwordInput).toBeVisible({ timeout: 30000 });
    
    // Check it's a password input type
    const inputType = await passwordInput.getAttribute("type");
    expect(inputType).toBe("password");
  });

  test("should have submit button with correct text", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const submitButton = page.locator('[data-testid="login-button"]');
    await expect(submitButton).toBeVisible({ timeout: 30000 });
    
    // Check button shows AUTHENTICATE text
    await expect(submitButton).toContainText("AUTHENTICATE");
  });
});
