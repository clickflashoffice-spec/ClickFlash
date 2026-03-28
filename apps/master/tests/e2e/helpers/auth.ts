import { Page } from "@playwright/test";

/**
 * Authentication helpers for E2E tests
 */

export const TEST_CREDENTIALS = {
  username: "admin@starmaster.photo",
  password: "admin123", // Default test password
};

/**
 * Login with credentials
 */
export async function login(
  page: Page,
  username = TEST_CREDENTIALS.username,
  password = TEST_CREDENTIALS.password,
): Promise<void> {
  // Navigate to login and wait for network idle
  await page.goto("/login", { waitUntil: "networkidle" });
  
  // Wait for the login form elements to be visible
  await page.waitForSelector('[data-testid="username-input"]', { state: "visible", timeout: 10000 });
  await page.waitForSelector('[data-testid="password-input"]', { state: "visible", timeout: 10000 });
  await page.waitForSelector('[data-testid="login-button"]', { state: "visible", timeout: 10000 });
  
  // Fill in credentials
  await page.fill('[data-testid="username-input"]', username);
  await page.fill('[data-testid="password-input"]', password);
  
  // Click login and wait for navigation
  await Promise.all([
    page.waitForURL("/", { waitUntil: "networkidle", timeout: 30000 }),
    page.click('[data-testid="login-button"]'),
  ]);
  
  // Additional wait for dashboard to be ready
  await page.waitForLoadState("networkidle");
}

/**
 * Logout current user
 */
export async function logout(page: Page): Promise<void> {
  await page.click("text=Switch User");
  await page.waitForURL(/login/);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const currentUrl = page.url();
  return !currentUrl.includes("/login");
}
