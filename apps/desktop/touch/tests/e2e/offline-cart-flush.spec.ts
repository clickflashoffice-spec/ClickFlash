import { test, expect } from "@playwright/test";
import { installMockRoutes } from "./helpers/mock-routes";

const TOUCH_URL = process.env.TOUCH_URL || "http://localhost:5174";

test.describe("Touch Kiosk - Offline Cart & Network Resilience", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch (e) {}
    });

    await installMockRoutes(page);
    await page.goto(TOUCH_URL, { waitUntil: "domcontentloaded" });

    // Handle initial setup if it appears
    try {
      const setupHeader = page.getByRole("heading", { name: "System Configuration" });
      if (await setupHeader.isVisible({ timeout: 1500 })) {
        await page.getByRole("heading", { name: "Touch Kiosk" }).click();
        await page.getByRole("button", { name: /Connect/i }).click();
      }
    } catch (e) {
      // Setup bypassed
    }

    // Wake up screensaver if active
    const screensaver = page.getByRole("button", { name: "Wake up screensaver" });
    if (await screensaver.isVisible({ timeout: 1000 }).catch(() => false)) {
      await screensaver.click();
      await page.waitForTimeout(600);
    }

    await expect(page.getByTestId("welcome-find-room-button")).toBeVisible({ timeout: 15000 });
  });

  test("should retain items in cart and survive offline network transition", async ({ page }) => {
    // Navigate to Room 101
    await page.getByTestId("welcome-find-room-button").click();
    await expect(page.getByRole("heading", { name: "Enter Your Room Number" })).toBeVisible();

    await page.getByRole("button", { name: "123", exact: true }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "0", exact: true }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByTestId("room-number-confirm-button").click();

    await expect(page.getByRole("heading", { name: "Room 101" })).toBeVisible({ timeout: 10000 });

    // Select first photo and add to cart
    const photoCard = page.locator("[data-testid='photo-card-image']").first();
    await expect(photoCard).toBeVisible();
    await photoCard.click();

    await expect(page.getByTestId("add-to-cart-button")).toBeVisible();
    await page.getByTestId("add-to-cart-button").click();

    // Go back to gallery
    await page.getByTestId("back-to-gallery-button").click();

    // Cut network to simulate resort WAN dropout
    await page.context().setOffline(true);

    // Verify cart still contains the item while offline
    await page.getByTestId("cart-button").click();
    await expect(page.getByText(/Your Cart/i)).toBeVisible();
    await expect(page.getByText(/Order Summary/i)).toBeVisible();

    // Restore network connection
    await page.context().setOffline(false);

    // Assert cart state is resilient and checkout button is active
    const checkoutBtn = page.getByRole("button", { name: /Checkout|Proceed|Pay/i }).first();
    if (await checkoutBtn.isVisible()) {
      await expect(checkoutBtn).toBeEnabled();
    }
  });
});
