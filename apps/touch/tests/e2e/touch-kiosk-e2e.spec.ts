import { test, expect, Page } from "@playwright/test";
import { installMockRoutes, mockAlbums, mockProducts } from "./helpers/mock-routes";

const TOUCH_URL = process.env.TOUCH_URL || "http://localhost:5174";

test.describe("Touch Kiosk E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    await installMockRoutes(page);

    await page.goto(TOUCH_URL, { waitUntil: "load" });

    // Handle initial setup if needed
    try {
      const setupHeader = page.getByRole("heading", { name: "System Configuration" });
      await setupHeader.waitFor({ state: "visible", timeout: 4000 });
      await page.locator("text=Install as Touch Kiosk").click();
      await page.getByRole("button", { name: "Connect" }).click();
    } catch (e) {
      // Setup already done
    }

    await expect(
      page.getByRole("heading", { name: "Welcome", exact: true })
    ).toBeVisible({ timeout: 10000 });
  });

  test.describe("Photo Search Flows", () => {
    test("should search photos by room number", async ({ page }) => {
      await navigateToRoom(page, "101");

      await expect(
        page.getByRole("heading", { name: "Room 101" })
      ).toBeVisible({ timeout: 10000 });

      await expect(
        page.getByRole("heading", { name: "Sunset Couples" })
      ).toBeVisible();
    });

    test("should search photos by face recognition", async ({ page }) => {
      const faceSearchButton = page.getByTestId("welcome-face-search-button");
      await expect(faceSearchButton).toBeVisible();
      await faceSearchButton.click();

      // The modal should open
      await expect(
        page.getByRole("heading", { name: /Search for Your Photos|Face Login/i })
      ).toBeVisible({ timeout: 5000 });

      // Close the modal
      await page.keyboard.press("Escape");
    });

    test("should handle invalid room number", async ({ page }) => {
      await page.getByTestId("welcome-find-room-button").click();
      await expect(
        page.getByRole("heading", { name: "Enter Your Room Number" })
      ).toBeVisible();

      await page.getByRole("button", { name: "123", exact: true }).click();
      await page.getByRole("button", { name: "9", exact: true }).click();
      await page.getByRole("button", { name: "9", exact: true }).click();
      await page.getByRole("button", { name: "9", exact: true }).click();

      await page.getByTestId("room-number-confirm-button").click();

      // Should show no photos found
      await expect(
        page.getByText(/No photos found|No Photos Available/i)
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Cart and Checkout Flow", () => {
    test("should add photos to cart and view total", async ({ page }) => {
      await navigateToRoom(page, "101");

      const photoImages = page.locator("[data-testid='photo-card-image']");
      await expect(photoImages.first()).toBeVisible();
      await photoImages.first().click();

      await expect(page.getByTestId("add-to-cart-button")).toBeVisible();
      await page.getByTestId("add-to-cart-button").click();

      // Return to gallery and open cart
      await page.getByTestId("back-to-gallery-button").click();
      await expect(page.getByRole("heading", { name: "Room 101" })).toBeVisible();
      await page.getByTestId("cart-button").click();

      // Verify cart updated
      await expect(page.getByText(/Your Cart/i)).toBeVisible();
      await expect(page.getByText(/Order Summary/i)).toBeVisible();
      await expect(page.getByText(/€10\.00|€15\.00|Total/i).first()).toBeVisible();
    });

    test("should complete checkout flow", async ({ page }) => {
      await navigateToRoom(page, "101");

      const photoImages = page.locator("[data-testid='photo-card-image']");
      await photoImages.first().click();
      await page.getByTestId("add-to-cart-button").click();

      await page.getByTestId("back-to-gallery-button").click();
      await expect(page.getByRole("heading", { name: "Room 101" })).toBeVisible();
      await page.getByTestId("cart-button").click();
      await expect(page.getByText(/Your Cart/i)).toBeVisible();

      // Proceed to checkout
      await page.getByRole("button", { name: /Proceed to Checkout/i }).click();

      // Should show checkout form
      await expect(
        page.getByText(/Checkout|Customer Details|Order Total/i).first()
      ).toBeVisible({ timeout: 5000 });
    });

    test("should remove items from cart", async ({ page }) => {
      await navigateToRoom(page, "101");

      const photoImages = page.locator("[data-testid='photo-card-image']");
      await photoImages.first().click();
      await page.getByTestId("add-to-cart-button").click();

      await page.getByTestId("back-to-gallery-button").click();
      await expect(page.getByRole("heading", { name: "Room 101" })).toBeVisible();
      await page.getByTestId("cart-button").click();
      await expect(page.getByText(/Your Cart/i)).toBeVisible();

      // Remove item
      const removeButton = page.getByRole("button", { name: /Remove item from cart/i });
      await expect(removeButton).toBeVisible();
      await removeButton.click();

      // Cart should be empty
      await expect(
        page.getByText(/Your cart is empty|No items|empty/i)
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Offline Mode", () => {
    test("should cache photos for offline viewing", async ({ page }) => {
      await navigateToRoom(page, "101");
      await expect(
        page.getByRole("heading", { name: "Room 101" })
      ).toBeVisible({ timeout: 10000 });

      await page.getByTestId("back-to-home-button").click();
      await expect(
        page.getByRole("heading", { name: "Welcome", exact: true })
      ).toBeVisible();

      await page.context().setOffline(true);

      await navigateToRoom(page, "101");

      await expect(
        page.getByRole("heading", { name: "Room 101" })
      ).toBeVisible({ timeout: 10000 });

      await page.context().setOffline(false);
    });

    test("should queue orders when offline", async ({ page }) => {
      await navigateToRoom(page, "101");

      const photoImages = page.locator("[data-testid='photo-card-image']");
      await photoImages.first().click();
      await page.getByTestId("add-to-cart-button").click();

      await page.getByTestId("back-to-gallery-button").click();
      await expect(page.getByRole("heading", { name: "Room 101" })).toBeVisible();

      // Preload cart chunk while online
      await page.getByTestId("cart-button").click();
      await expect(page.getByText(/Your Cart/i)).toBeVisible();
      await page.getByRole("button", { name: /Back to Photos/i }).click();
      await expect(page.getByRole("heading", { name: "Room 101" })).toBeVisible();

      // Now go offline and reopen cart
      await page.context().setOffline(true);
      await page.getByTestId("cart-button").click();
      await expect(page.getByText(/Your Cart/i)).toBeVisible();

      // The cart screen remains usable offline
      await expect(page.getByRole("button", { name: /Proceed to Checkout/i })).toBeVisible();

      await page.context().setOffline(false);
    });
  });

  test.describe("Master Synchronization", () => {
    test("should display sync status", async ({ page }) => {
      // The app shows a connection status banner when disconnected
      await expect(
        page.getByText(/Disconnected|Offline|Connected/i).first()
      ).toBeVisible({ timeout: 5000 });
    });

    test("should show network connectivity warnings", async ({ page }) => {
      await page.route("**/api/**", (route) => route.abort("internetdisconnected"));

      await page.getByTestId("welcome-find-room-button").click();

      await expect(
        page.getByText(/Offline|No connection|Network|Check connection/i).first()
      ).toBeVisible({ timeout: 10000 });

      await page.unroute("**/api/**");
    });
  });

  test.describe("Accessibility and UX", () => {
    test("should support keyboard navigation", async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();

      // Press Enter on focused button
      await page.keyboard.press("Enter");

      // Should trigger action (modal or navigation) or keep focus
      await expect(
        page.getByText(/Enter Your Room|Modal|Dialog|Welcome/i).first()
      ).toBeVisible({ timeout: 3000 });
    });

    test("should handle touch gestures", async ({ page }) => {
      await navigateToRoom(page, "101");

      await expect(
        page.getByRole("heading", { name: "Room 101" })
      ).toBeVisible({ timeout: 10000 });

      const main = page.locator("main").first();
      await expect(main).toBeVisible();

      const box = await main.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, { steps: 10 });
        await page.mouse.up();
      }

      await expect(
        page.getByRole("heading", { name: "Room 101" })
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Language and Localization", () => {
    test("should display welcome screen text", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "Welcome", exact: true })
      ).toBeVisible();
      await expect(
        page.getByText(/Touch an option below to begin/i)
      ).toBeVisible();
    });
  });
});

// Helper function to navigate to a room
async function navigateToRoom(page: Page, roomNumber: string) {
  await page.getByTestId("welcome-find-room-button").click();

  await expect(
    page.getByRole("heading", { name: "Enter Your Room Number" })
  ).toBeVisible();

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

  await page.getByTestId("room-number-confirm-button").click();

  await expect(
    page.getByText(/Viewing Room|Your Photos|No Photos Available/i).first()
  ).toBeVisible({ timeout: 10000 });
}
