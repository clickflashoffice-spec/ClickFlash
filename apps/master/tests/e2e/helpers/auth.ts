import { Page } from "@playwright/test";

/**
 * Authentication helpers for E2E tests
 */

// These must match the DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD env vars
// used by init-default-user.ts when seeding the test database.
export const TEST_CREDENTIALS = {
  username: process.env.TEST_ADMIN_EMAIL ?? "admin@clickflash.local",
  password: process.env.TEST_ADMIN_PASSWORD ?? "ClickFlash2025!",
};

/**
 * Login with credentials
 */
export async function login(
  page: Page,
  username = TEST_CREDENTIALS.username,
  password = TEST_CREDENTIALS.password,
): Promise<void> {
  // Use "load" not "networkidle" — the app has background polling that keeps
  // the network busy indefinitely, which would cause networkidle to time out.
  await page.goto("/login", { waitUntil: "load" });
  
  // Wait for the login form elements to be visible
  await page.waitForSelector('[data-testid="username-input"]', { state: "visible", timeout: 10000 });
  await page.waitForSelector('[data-testid="password-input"]', { state: "visible", timeout: 10000 });
  await page.waitForSelector('[data-testid="login-button"]', { state: "visible", timeout: 10000 });
  
  // Fill in credentials
  await page.fill('[data-testid="username-input"]', username);
  await page.fill('[data-testid="password-input"]', password);
  
  // Click login and wait for navigation away from /login.
  // Use waitUntil:"commit" — the app has WebSocket + polling that keeps the
  // network busy indefinitely, which causes the default "load" waitUntil to
  // time out after 30 s on slow CI runs.
  await Promise.all([
    page.waitForURL(/^(?!.*\/login).*$/, { timeout: 30000, waitUntil: "commit" }),
    page.click('[data-testid="login-button"]'),
  ]);

  // Wait for main content to be rendered
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Navigate to a view via sidebar button click.
 * PIN lock has been removed — all views load directly now.
 */
export async function navigateToView(
  page: Page,
  viewLabel: string,
): Promise<void> {
  await page.click(`button:has-text("${viewLabel}")`);
}

/** @deprecated PIN lock removed — use navigateToView instead */
export const navigateToSensitiveView = navigateToView;

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
