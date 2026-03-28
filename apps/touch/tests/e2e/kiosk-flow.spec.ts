import { test, expect } from "@playwright/test";

test.describe("Kiosk User Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the root instead of /scan directly
    await page.goto("/");

    try {
      // If this is a fresh browser instance, DeviceSetup UI will show up.
      // We wait for it briefly, if it's there we configure the kiosk.
      const setupHeader = page.getByRole("heading", {
        name: "System Configuration",
      });
      await setupHeader.waitFor({ state: "visible", timeout: 4000 });

      // Click the Touch Kiosk option
      await page.locator("text=Install as Touch Kiosk").click();

      // Click connect on the IP step
      await page.getByRole("button", { name: "Connect" }).click();
    } catch (e) {
      // Setup might already be done or bypassed, continue.
    }

    // Wait for Welcome screen to fully load
    await expect(
      page.getByRole("heading", { name: "Welcome", exact: true }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should complete full customer journey", async ({ page }) => {
    // Wait for animations to settle
    await page.waitForTimeout(2000);

    // Click 'Find My Photos' (using specific matching to avoid ambiguity)
    await page
      .getByRole("button")
      .filter({ hasText: "Find My Photos" })
      .first()
      .click();

    // Enter Room Number '101' using on-screen keyboard
    await expect(
      page.getByRole("heading", { name: "Enter Your Room Number" }),
    ).toBeVisible();

    // Wait for Modal to animate in
    await page.waitForTimeout(1000);

    // Switch to numeric layout
    await page.getByRole("button", { name: "123", exact: true }).click();

    // Click 1, 0, 1
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "0", exact: true }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();

    // Click "Find My Photos" to confirm the modal
    await page
      .getByRole("button", { name: "Find My Photos", exact: true })
      .click();

    // Expect to be on Photo Selection Screen for room 101
    await expect(
      page.getByRole("heading", { name: "Viewing Room: 101" }),
    ).toBeVisible({ timeout: 10000 });

    // The mock data for room 101 is "Sunset Couples"
    await expect(
      page.getByRole("heading", { name: "Sunset Couples" }),
    ).toBeVisible();

    // Click a photo to open preview (just click the first img)
    const photoImages = page.locator("img[alt]");
    await expect(photoImages.first()).toBeVisible();
    await photoImages.first().click();

    // Expecting to open photo preview/cart operations
    // Wait for the modal or screen displaying photo controls
    await expect(page.getByText(/Prints|Digital|Add/i).first()).toBeVisible();

    // Add to cart by clicking the first applicable "Add" or "Select" button
    const addButton = page
      .locator('button:has-text("Add"), button:has-text("Select")')
      .first();
    if (await addButton.isVisible()) {
      await addButton.click();
    }

    // Go back to gallery
    await page.getByRole("button", { name: /back/i }).first().click();

    // View Cart (Submit Order or View Order)
    const cartButton = page
      .locator('button:has-text("Cart"), button:has-text("Order")')
      .first();
    if (await cartButton.isVisible()) {
      await cartButton.click();
    }
  });

  test("should work offline when data is cached", async ({ page }) => {
    // Ensure we are fully loaded and online to cache things
    await expect(
      page.getByRole("heading", { name: "Welcome", exact: true }),
    ).toBeVisible({ timeout: 10000 });

    // IMPORTANT: Wait for the app to fetch albums from the local backend
    // and save them to IndexedDB before we sever the network connection.
    // Playwright isolates IndexedDB per test.
    await page.waitForTimeout(3000);

    // --- PRELOAD CHUNKS (Online) ---
    // Navigate into the target screen once while online to ensure Vite dev server
    // serves the JS modules to the browser cache.
    // 1. Click Find My Photos
    await page
      .getByRole("button")
      .filter({ hasText: "Find My Photos" })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Enter Your Room Number" }),
    ).toBeVisible();
    await page.waitForTimeout(1000);

    // 2. Enter Room 101
    await page.getByRole("button", { name: "123", exact: true }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "0", exact: true }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page
      .getByRole("button", { name: "Find My Photos", exact: true })
      .click();

    // 4. Wait for screen to load and ensure it works online
    await expect(
      page.getByRole("heading", { name: "Viewing Room: 101" }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // 5. Go back to Home
    await page.getByRole("button", { name: /Back to Home/i }).click();
    await expect(
      page.getByRole("heading", { name: "Welcome", exact: true }),
    ).toBeVisible();

    // --- OFFLINE TEST ---
    // Now set offline
    await page.context().setOffline(true);
    await page.waitForTimeout(1000);

    // Attempt to select room 101 again (Offline mode)
    await page
      .getByRole("button")
      .filter({ hasText: "Find My Photos" })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Enter Your Room Number" }),
    ).toBeVisible();
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "123", exact: true }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "0", exact: true }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page
      .getByRole("button", { name: "Find My Photos", exact: true })
      .click();

    // Still able to see the album offline since it's cached in memory/storage
    await expect(
      page.getByRole("heading", { name: "Viewing Room: 101" }),
    ).toBeVisible({ timeout: 10000 });
  });
});
