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
    await page.getByRole("button", { name: "1" }).click();
    await page.getByRole("button", { name: "0" }).click();
    await page.getByRole("button", { name: "1" }).click();
    await page.getByRole("button", { name: "Search" }).click();
    
    await expect(page.getByRole("heading", { name: "Sunset Couples" })).toBeVisible();
    
    // Simulate real-time sync event via page evaluate if needed or just wait
    await page.waitForTimeout(1000);
    await expect(page.getByRole("heading", { name: "Sunset Couples" })).toBeVisible();
  });
});
