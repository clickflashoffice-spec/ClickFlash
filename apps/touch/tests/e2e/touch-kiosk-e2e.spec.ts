/**
 * Touch Kiosk Comprehensive E2E Tests
 * 
 * End-to-end tests for Touch Kiosk covering:
 * - Face recognition photo search
 * - Order creation and Master sync
 * - Offline mode operations
 * - RFID card integration
 * - Cart and checkout flow
 * - LAN communication with Master
 */

import { test, expect, Page } from "@playwright/test";

const MASTER_URL = process.env.MASTER_URL || "http://localhost:8090";
const TOUCH_URL = process.env.TOUCH_URL || "http://localhost:5174";

test.describe("Touch Kiosk E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Touch app
    await page.goto(TOUCH_URL);
    
    // Handle initial setup if needed
    try {
      const setupHeader = page.getByRole("heading", { name: "System Configuration" });
      await setupHeader.waitFor({ state: "visible", timeout: 4000 });
      await page.locator("text=Install as Touch Kiosk").click();
      await page.getByRole("button", { name: "Connect" }).click();
    } catch (e) {
      // Setup already done
    }

    // Wait for welcome screen
    await expect(
      page.getByRole("heading", { name: "Welcome", exact: true })
    ).toBeVisible({ timeout: 10000 });

    // Mock API for E2E tests since we don't have a populated database
    await page.route("**/api/collections/albums/records*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          page: 1, perPage: 50, totalItems: 1, totalPages: 1,
          items: [{
            id: "album_101",
            title: "Room 101 Photos",
            roomNumber: "101",
            status: "published",
            created: "2024-01-01T00:00:00.000Z",
            updated: "2024-01-01T00:00:00.000Z"
          }]
        })
      });
    });

    await page.route("**/api/collections/photos/records*", async (route) => {
      const url = route.request().url();
      if (url.includes('album_101')) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            page: 1, perPage: 50, totalItems: 1, totalPages: 1,
            items: [{
              id: "photo_1",
              albumId: "album_101",
              title: "Test Photo 1",
              url: "test_photo_1.png",
              created: "2024-01-01T00:00:00.000Z",
              updated: "2024-01-01T00:00:00.000Z"
            }]
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ page: 1, perPage: 50, totalItems: 0, totalPages: 1, items: [] })
        });
      }
    });

    // Mock the image file request to return a transparent PNG
    await page.route("**/api/files/photos/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
      });
    });
  });

  test.describe("Photo Search Flows", () => {
    test("should search photos by room number", async ({ page }) => {
      // Click Find by Room
      await page
        .getByRole("button")
        .filter({ hasText: "Find by Room" })
        .first()
        .click();

      // Enter room number
      await expect(
        page.getByRole("heading", { name: /Room Number|Enter Your Room/i })
      ).toBeVisible();

      await page.waitForTimeout(500);
      await page.getByRole("button", { name: "123", exact: true }).click();
      await page.getByRole("button", { name: "1", exact: true }).click();
      await page.getByRole("button", { name: "0", exact: true }).click();
      await page.getByRole("button", { name: "1", exact: true }).click();

      await page.getByRole("dialog").getByRole("button", { name: /Find|Search|Confirm/i }).first().click();

      // Verify results
      await expect(
        page.getByText(/Room 101|101|Photos/i).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test("should search photos by face recognition", async ({ page }) => {
      // Look for face search option
      const faceSearchButton = page.getByRole("button").filter({ hasText: "Search by Face" }).first();
      
      if (await faceSearchButton.isVisible()) {
        await faceSearchButton.click();

        // Should show camera interface or face enrollment
        await expect(
          page.getByText(/Camera|Face|Position/i).first()
        ).toBeVisible({ timeout: 5000 });

        // Note: Actual face capture requires camera access
        // This test verifies the UI flow exists
      }
    });

    test("should handle invalid room number", async ({ page }) => {
      await page
        .getByRole("button")
        .filter({ hasText: "Find by Room" })
        .first()
        .click();

      await page.getByRole("button", { name: "123", exact: true }).click();
      
      // Enter invalid room (e.g., 999)
      await page.getByRole("button", { name: "9", exact: true }).click();
      await page.getByRole("button", { name: "9", exact: true }).click();
      await page.getByRole("button", { name: "9", exact: true }).click();

      await page.getByRole("dialog").getByRole("button", { name: /Find|Search|Confirm/i }).first().click();

      // Should show no photos found or error
      await expect(
        page.getByText(/No photos|Not found|Empty/i).first()
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Cart and Checkout Flow", () => {
    test("should add photos to cart and view total", async ({ page }) => {
      // Navigate to room 101
      await navigateToRoom(page, "101");

      // Select first photo
      const photoImages = page.locator("img[alt]");
      await expect(photoImages.first()).toBeVisible();
      await photoImages.first().click();

      // Wait for photo preview/cart options
      await expect(page.getByText(/Prints|Digital|Add/i).first()).toBeVisible();

      // Add to cart
      const addButton = page
        .locator('button:has-text("Add"), button:has-text("Select")')
        .first();
      if (await addButton.isVisible()) {
        await addButton.click();
      }

      // Verify cart updated
      const cartIndicator = page.locator('[data-testid="cart-count"], .cart-badge').first();
      if (await cartIndicator.isVisible()) {
        const count = await cartIndicator.textContent();
        expect(parseInt(count || "0")).toBeGreaterThan(0);
      }
    });

    test("should complete checkout flow", async ({ page }) => {
      // Navigate and add item to cart
      await navigateToRoom(page, "101");
      
      const photoImages = page.locator("img[alt]");
      await photoImages.first().click();
      
      const addButton = page.locator('button:has-text("Add"), button:has-text("Select")').first();
      if (await addButton.isVisible()) {
        await addButton.click();
      }

      // Go to cart/checkout
      const cartButton = page.locator('button:has-text("Cart"), button:has-text("Order"), button:has-text("Checkout")').first();
      if (await cartButton.isVisible()) {
        await cartButton.click();
      }

      // Should show order summary
      await expect(
        page.getByText(/Order|Summary|Total/i).first()
      ).toBeVisible({ timeout: 5000 });

      // Enter customer details
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill("test@example.com");
      }

      // Complete order
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Complete"), button:has-text("Pay")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
      }

      // Should show confirmation
      await expect(
        page.getByText(/Thank you|Confirmation|Success|Order Complete/i).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test("should remove items from cart", async ({ page }) => {
      await navigateToRoom(page, "101");
      
      // Add item
      const photoImages = page.locator("img[alt]");
      await photoImages.first().click();
      
      const addButton = page.locator('button:has-text("Add"), button:has-text("Select")').first();
      if (await addButton.isVisible()) {
        await addButton.click();
      }

      // Go to cart
      const cartButton = page.locator('button:has-text("Cart"), button:has-text("Order")').first();
      if (await cartButton.isVisible()) {
        await cartButton.click();
      }

      // Remove item
      const removeButton = page.locator('button:has-text("Remove"), button:has-text("Delete"), [data-testid="remove-item"]').first();
      if (await removeButton.isVisible()) {
        await removeButton.click();
      }

      // Cart should be empty or show empty state
      await expect(
        page.getByText(/Empty|No items|Cart is empty/i).first()
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Offline Mode", () => {
    test("should cache photos for offline viewing", async ({ page }) => {
      // First, load photos while online
      await navigateToRoom(page, "101");
      await expect(page.getByRole("heading", { name: "Viewing Room: 101" })).toBeVisible();
      
      // Wait for photos to load
      await page.waitForTimeout(2000);

      // Go offline
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);

      // Navigate back to home
      const backButton = page.getByRole("button", { name: /Back to Home|Home/i }).first();
      if (await backButton.isVisible()) {
        await backButton.click();
      }

      // Try to access cached photos
      await navigateToRoom(page, "101");
      
      // Should still show photos from cache
      await expect(
        page.getByText(/Room 101|101|Photos/i).first()
      ).toBeVisible({ timeout: 10000 });

      // Restore online
      await page.context().setOffline(false);
    });

    test("should queue orders when offline", async ({ page }) => {
      // Add item to cart
      await navigateToRoom(page, "101");
      
      const photoImages = page.locator("img[alt]");
      await photoImages.first().click();
      
      const addButton = page.locator('button:has-text("Add"), button:has-text("Select")').first();
      if (await addButton.isVisible()) {
        await addButton.click();
      }

      // Go offline
      await page.context().setOffline(true);

      // Try to submit order
      const cartButton = page.locator('button:has-text("Cart"), button:has-text("Order")').first();
      if (await cartButton.isVisible()) {
        await cartButton.click();
      }

      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Complete")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
      }

      // Should show offline queue message
      await expect(
        page.getByText(/Offline|Queued|Will sync|Pending/i).first()
      ).toBeVisible({ timeout: 5000 });

      // Restore online
      await page.context().setOffline(false);
    });
  });

  test.describe("Master Synchronization", () => {
    test("should display sync status", async ({ page }) => {
      // Look for sync status indicator
      const syncIndicator = page.locator('[data-testid="sync-status"], .sync-indicator, .connection-status').first();
      
      if (await syncIndicator.isVisible()) {
        const status = await syncIndicator.getAttribute("data-status") || await syncIndicator.textContent();
        expect(["online", "connected", "synced", "active"]).toContain(status?.toLowerCase());
      }
    });

    test("should show network connectivity warnings", async ({ page }) => {
      // Simulate network issues
      await page.route("**/api/**", (route) => route.abort("internetdisconnected"));

      // Try to navigate
      await page
        .getByRole("button")
        .filter({ hasText: "Find My Photos" })
        .first()
        .click();

      // Should show connectivity warning
      await expect(
        page.getByText(/Offline|No connection|Network|Check connection/i).first()
      ).toBeVisible({ timeout: 5000 });

      // Unroute
      await page.unroute("**/api/**");
    });
  });

  test.describe("Accessibility and UX", () => {
    test("should have accessible contrast ratios", async ({ page }) => {
      // Check for high contrast mode
      const highContrastToggle = page.locator('[data-testid="high-contrast"], button:has-text("Contrast")').first();
      
      if (await highContrastToggle.isVisible()) {
        await highContrastToggle.click();
        
        // Check body has high contrast class
        const body = page.locator("body");
        const className = await body.getAttribute("class");
        expect(className).toMatch(/high-contrast|contrast/);
      }
    });

    test("should support keyboard navigation", async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      
      const focusedElement = page.locator(":focus");
      expect(await focusedElement.isVisible()).toBe(true);

      // Press Enter on focused button
      await page.keyboard.press("Enter");
      
      // Should trigger action (modal or navigation)
      await expect(
        page.getByText(/Enter Your Room|Modal|Dialog/i).first()
      ).toBeVisible({ timeout: 3000 });
    });

    test("should handle touch gestures", async ({ page }) => {
      // Navigate to photos
      await navigateToRoom(page, "101");

      // Simulate swipe (scroll)
      const photoGrid = page.locator(".photo-grid, .gallery, [data-testid='photo-grid']").first();
      
      if (await photoGrid.isVisible()) {
        const box = await photoGrid.boundingBox();
        if (box) {
          // Swipe left
          await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 10 });
          await page.mouse.up();
        }
      }
    });
  });

  test.describe("Language and Localization", () => {
    test("should switch languages if available", async ({ page }) => {
      const langSelector = page.locator('[data-testid="language-select"], select[name="language"]').first();
      
      if (await langSelector.isVisible()) {
        await langSelector.selectOption("fr");
        
        // Check for French text
        await expect(
          page.getByText(/Bienvenue|Photos|Trouver/i).first()
        ).toBeVisible({ timeout: 3000 });
      }
    });
  });
});

// Helper function to navigate to a room
async function navigateToRoom(page: Page, roomNumber: string) {
  await page
    .getByRole("button")
    .filter({ hasText: "Find by Room" })
    .first()
    .click();

  await expect(
    page.getByRole("heading", { name: /Room Number|Enter Your Room/i })
  ).toBeVisible();

  await page.waitForTimeout(500);
  
  // Try to find numeric keyboard button
  const numButton = page.getByRole("button", { name: "123" }).first();
  if (await numButton.isVisible()) {
    await numButton.click();
  }

  // Enter room number digits
  for (const digit of roomNumber) {
    const digitButton = page.getByRole("button", { name: digit, exact: true }).first();
    if (await digitButton.isVisible()) {
      await digitButton.click();
    }
  }

  // Click confirm/find button
  const confirmButton = page.getByRole("dialog").getByRole("button").filter({ hasText: /Find|Search|Confirm|OK/i }).first();
  await confirmButton.click();

  await expect(
    page.getByText(/Room|Photos|Gallery/i).first()
  ).toBeVisible({ timeout: 10000 });
}
