import { test, expect, Page } from "@playwright/test";
import { installMockRoutes } from "./helpers/mock-routes";

async function enterPasswordViaKeyboard(page: Page, password: string) {
  const numericToggle = page.getByRole("button", { name: "123", exact: true });
  if (await numericToggle.isVisible().catch(() => false)) {
    await numericToggle.click();
  }
  for (const digit of password) {
    const digitButton = page.getByRole("button", { name: digit, exact: true }).first();
    if (await digitButton.isVisible().catch(() => false)) {
      await digitButton.click();
    }
  }
}

async function openAdminSettings(page: Page, password: string) {
  const settingsButton = page.getByTestId("settings-button");
  await expect(settingsButton).toBeVisible();
  await settingsButton.click({ force: true });

  // Wait for the password modal to appear and unlock it
  const adminPasswordInput = page.getByTestId("admin-password-input");
  await expect(adminPasswordInput).toBeVisible({ timeout: 10000 });
  await enterPasswordViaKeyboard(page, password);
  await page.getByTestId("admin-password-submit").click();

  // The Kiosk Settings modal has its own auth gate
  await expect(
    page.getByRole("heading", { name: "Admin Authorization" })
  ).toBeVisible({ timeout: 10000 });
  await page.getByTestId("settings-password-input").fill(password);
  await page.getByTestId("settings-authorize-button").click();

  await expect(
    page.getByRole("heading", { name: "Kiosk Settings" })
  ).toBeVisible({ timeout: 10000 });
}

const ADMIN_PASSWORD = "1234";

test.describe("Admin Settings Flow", () => {
  test.beforeEach(async ({ page }) => {
    await installMockRoutes(page);
    await page.goto("/", { waitUntil: "load" });

    try {
      const setupHeader = page.getByRole("heading", { name: "System Configuration" });
      await setupHeader.waitFor({ state: "visible", timeout: 4000 });
      await page.locator("text=Install as Touch Kiosk").click();
      await page.getByRole("button", { name: "Connect" }).click();
    } catch (e) {
      // Setup already done
    }

    await expect(
      page.getByRole("heading", { name: /Welcome/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("should authenticate and change a setting", async ({ page }) => {
    await openAdminSettings(page, ADMIN_PASSWORD);

    // Change the welcome message
    const welcomeInput = page.getByTestId("settings-welcome-message-input");
    await expect(welcomeInput).toBeVisible();
    await welcomeInput.fill("Welcome to ClickFlash");

    // Toggle RFID off then back on to verify interaction
    const rfidCheckbox = page.getByTestId("settings-enable-rfid-checkbox");
    const rfidToggle = page.getByTestId("settings-enable-rfid-toggle");
    await expect(rfidCheckbox).toBeChecked();

    await rfidToggle.click();
    await expect(rfidCheckbox).not.toBeChecked();

    await rfidToggle.click();
    await expect(rfidCheckbox).toBeChecked();

    // Save and reload
    const saveButton = page.getByTestId("settings-save-button");
    await saveButton.scrollIntoViewIfNeeded();

    // The app reloads the page ~500ms after save; wait for that navigation
    // before interacting with elements again.
    const reloadPromise = page.waitForEvent("framenavigated", { timeout: 20000 });
    await saveButton.click();
    await reloadPromise;
    await page.waitForLoadState("load");

    // After reload, the welcome message should persist
    await expect(
      page.getByRole("heading", { name: "Welcome to ClickFlash", exact: true })
    ).toBeVisible({ timeout: 20000 });

    // Re-open settings and verify the change persisted
    await openAdminSettings(page, ADMIN_PASSWORD);

    await expect(page.getByTestId("settings-welcome-message-input")).toHaveValue("Welcome to ClickFlash");
    await expect(page.getByTestId("settings-enable-rfid-toggle")).toBeVisible();
    await expect(page.getByTestId("settings-enable-rfid-checkbox")).toBeChecked();
  });

  test("should reject invalid admin password", async ({ page }) => {
    const settingsButton = page.getByTestId("settings-button");
    await expect(settingsButton).toBeVisible();
    await settingsButton.click({ force: true });

    const adminPasswordInput = page.getByTestId("admin-password-input");
    await expect(adminPasswordInput).toBeVisible({ timeout: 10000 });
    await enterPasswordViaKeyboard(page, "9999");
    await page.getByTestId("admin-password-submit").click();

    // Should remain on the auth modal
    await expect(
      page.getByRole("heading", { name: "Administrator Access" })
    ).toBeVisible({ timeout: 5000 });
  });
});
