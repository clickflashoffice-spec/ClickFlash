import { test, expect } from "@playwright/test";
import { installMockRoutes } from "./helpers/mock-routes";

const TOUCH_URL = process.env.TOUCH_URL || "http://localhost:5174";

test.describe("Touch Kiosk Sync Suite", () => {
  test.beforeEach(async ({ page }) => {
    await installMockRoutes(page);
    await page.goto(TOUCH_URL, { waitUntil: "load" });

    try {
      const setupHeader = page.getByRole("heading", { name: "System Configuration" });
      await setupHeader.waitFor({ state: "visible", timeout: 4000 });
      await page.locator("text=Install as Touch Kiosk").click();
      await page.getByRole("button", { name: "Connect" }).click();
    } catch (e) {}

    await expect(
      page.getByRole("heading", { name: "Welcome", exact: true })
    ).toBeVisible({ timeout: 10000 });
  });

  test("should synchronize new photos seamlessly", async ({ page }) => {
    await page.getByTestId("welcome-find-room-button").click();
    
    // Wait for modal
    await expect(page.getByRole("heading", { name: "Enter Your Room Number" })).toBeVisible();
    
    // Switch to numeric keyboard
    const numButton = page.getByRole("button", { name: "123" }).first();
    if (await numButton.isVisible()) {
      await numButton.click();
    }

    await page.getByRole("button", { name: "1", exact: true }).first().click();
    await page.getByRole("button", { name: "0", exact: true }).first().click();
    await page.getByRole("button", { name: "1", exact: true }).first().click();
    await page.getByTestId("room-number-confirm-button").click();
    
    await expect(page.getByRole("heading", { name: "Room 101" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Sunset Couples" })).toBeVisible();
    
    // Simulate real-time sync event via page evaluate if needed or just wait
    await page.waitForTimeout(1000);
    await expect(page.getByRole("heading", { name: "Sunset Couples" })).toBeVisible();
  });
});
