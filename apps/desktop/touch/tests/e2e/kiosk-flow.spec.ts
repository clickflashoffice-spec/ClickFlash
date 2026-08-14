import { test, expect } from "@playwright/test";
import { installMockRoutes } from "./helpers/mock-routes";

test.describe("Kiosk User Flow", () => {
  test.beforeEach(async ({ page }) => {
    await installMockRoutes(page);

    // Navigate to the root
    await page.goto("/", { waitUntil: "load" });

    // Handle initial setup if it appears (fresh browser instance)
    try {
      const setupHeader = page.getByRole("heading", {
        name: "System Configuration",
      });
      await setupHeader.waitFor({ state: "visible", timeout: 4000 });
      await page.locator("text=Install as Touch Kiosk").click();
      await page.getByRole("button", { name: "Connect" }).click();
    } catch (e) {
      // Setup already done or bypassed
    }

    // Wait for Welcome screen to fully load
    await expect(
      page.getByRole("heading", { name: "Welcome", exact: true }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should complete full customer journey", async ({ page }) => {
    // Click 'Find by Room'
    await page.getByTestId("welcome-find-room-button").click();

    // Enter Room Number '101' using on-screen keyboard
    await expect(
      page.getByRole("heading", { name: "Enter Your Room Number" }),
    ).toBeVisible();

    // Switch to numeric layout
    await page.getByRole("button", { name: "123", exact: true }).click();

    // Click 1, 0, 1
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "0", exact: true }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();

    await expect(page.getByTestId("room-number-input")).toHaveValue("101");

    // Click confirm
    await page.getByTestId("room-number-confirm-button").click();

    // Expect to be on Photo Selection Screen for room 101
    await expect(
      page.getByRole("heading", { name: "Room 101" }),
    ).toBeVisible({ timeout: 10000 });

    // The mock data for room 101 is "Sunset Couples"
    await expect(
      page.getByRole("heading", { name: "Sunset Couples" }),
    ).toBeVisible();

    // Click the first photo to open preview
    const photoImages = page.locator("[data-testid='photo-card-image']");
    await expect(photoImages.first()).toBeVisible();
    await photoImages.first().click();

    // Wait for photo preview with add to cart
    await expect(page.getByTestId("add-to-cart-button")).toBeVisible();

    // Add to cart
    await page.getByTestId("add-to-cart-button").click();

    // Go back to gallery
    await page.getByTestId("back-to-gallery-button").click();

    // Back on the selection screen
    await expect(
      page.getByRole("heading", { name: "Room 101" }),
    ).toBeVisible();

    // Open cart and verify item is present
    await page.getByTestId("cart-button").click();
    await expect(page.getByText(/Your Cart/i)).toBeVisible();
    await expect(page.getByText(/Order Summary/i)).toBeVisible();
  });

  test("should work offline when data is cached", async ({ page }) => {
    // Navigate to room 101 once while online to cache data
    await page.getByTestId("welcome-find-room-button").click();
    await expect(
      page.getByRole("heading", { name: "Enter Your Room Number" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "123", exact: true }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "0", exact: true }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByTestId("room-number-confirm-button").click();

    await expect(
      page.getByRole("heading", { name: "Room 101" }),
    ).toBeVisible({ timeout: 10000 });

    // Go back to home
    await page.getByTestId("back-to-home-button").click();
    await expect(
      page.getByRole("heading", { name: "Welcome", exact: true }),
    ).toBeVisible();

    // Set offline
    await page.context().setOffline(true);

    // Attempt to select room 101 again
    await page.getByTestId("welcome-find-room-button").click();
    await expect(
      page.getByRole("heading", { name: "Enter Your Room Number" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "123", exact: true }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "0", exact: true }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByTestId("room-number-confirm-button").click();

    // Still able to see the album offline since it's cached in memory
    await expect(
      page.getByRole("heading", { name: "Room 101" }),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: "Sunset Couples" }),
    ).toBeVisible();

    // Restore online
    await page.context().setOffline(false);
  });
});
