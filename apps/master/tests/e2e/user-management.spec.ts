import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("User Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should create a new user", async ({ page }) => {
    await page.click('[data-testid="nav-users"]');
    await page.click('[data-testid="create-user-button"]');

    await page.fill('[data-testid="username-input"]', "newoperator");
    await page.fill('[data-testid="password-input"]', "SecurePass123!");
    await page.fill('[data-testid="email-input"]', "newoperator@test.com");
    await page.selectOption('[data-testid="role-select"]', "operator");

    await page.click('[data-testid="save-user-button"]');

    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator("text=newoperator")).toBeVisible();
  });

  test("should edit user role", async ({ page }) => {
    await page.click('[data-testid="nav-users"]');

    // Find user and edit
    await page.click(
      '[data-testid="user-item-operator"]:first-child [data-testid="edit-button"]',
    );
    await page.selectOption('[data-testid="role-select"]', "manager");
    await page.click('[data-testid="save-user-button"]');

    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test("should deactivate user", async ({ page }) => {
    await page.click('[data-testid="nav-users"]');

    await page.click(
      '[data-testid="user-item"]:nth-child(2) [data-testid="deactivate-button"]',
    );
    await page.click('[data-testid="confirm-deactivate"]');

    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="user-inactive-badge"]'),
    ).toBeVisible();
  });

  test("should validate password strength", async ({ page }) => {
    await page.click('[data-testid="nav-users"]');
    await page.click('[data-testid="create-user-button"]');

    await page.fill('[data-testid="password-input"]', "weak");
    await expect(page.locator('[data-testid="password-error"]')).toContainText(
      "Password must be at least 8 characters",
    );
  });

  test("should prevent duplicate usernames", async ({ page }) => {
    await page.click('[data-testid="nav-users"]');
    await page.click('[data-testid="create-user-button"]');

    await page.fill('[data-testid="username-input"]', "admin"); // Existing user
    await page.fill('[data-testid="password-input"]', "SecurePass123!");
    await page.click('[data-testid="save-user-button"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      "Username already exists",
    );
  });
});
