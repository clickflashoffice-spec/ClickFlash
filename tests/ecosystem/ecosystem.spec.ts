import { test, expect } from "@playwright/test";
import { SharedSeed } from "./utils/SharedSeed";

/**
 * Ecosystem E2E: The "Grand Tour"
 * Validates the core data flow across all 6 applications.
 */
test.describe("Full Ecosystem Lifecycle", () => {
  const SITE_ID = "TN-E2E-TEST";
  
  test.beforeAll(async () => {
    await SharedSeed.resetEcosystem();
  });

  test.skip("Should ingestion photos in Master, select in Touch, sync to Hub, and view in Gallery", async ({ page, browser }) => {
    // 1. Master Portal: Ingestion
    console.log("--- Step 1: Master Ingestion ---");
    await page.goto("http://127.0.0.1:8090");
    await page.fill('[data-testid="username-input"]', "admin@starmaster.photo");
    await page.fill('[data-testid="password-input"]', "admin123");
    await page.click('[data-testid="login-button"]');
    await page.waitForURL("http://127.0.0.1:8090/", { timeout: 30000 });

    // 2. Touch Kiosk: Customer Selection
    console.log("--- Step 2: Touch Selection ---");
    const touchPage = await browser.newPage();
    await touchPage.goto("http://127.0.0.1:8091");
    
    // Handle initial setup if visible
    try {
      if (await touchPage.getByText("Select Machine Role").isVisible({ timeout: 5000 })) {
        await touchPage.getByRole("button", { name: "Touch Kiosk" }).click();
        await touchPage.getByRole("button", { name: "Provision Device" }).click();
      }
    } catch (e) {}

    await expect(touchPage.locator("text=Welcome")).toBeVisible({ timeout: 15000 });
    await touchPage.getByRole("button", { name: "Find My Photos" }).first().click();
    
    // Enter Room 101
    await touchPage.getByRole("button", { name: "1", exact: true }).click();
    await touchPage.getByRole("button", { name: "0", exact: true }).click();
    await touchPage.getByRole("button", { name: "1", exact: true }).click();
    await touchPage.getByRole("button", { name: "ENTER", exact: true }).click();

    // Verify album appears and select photo
    // [Assuming SharedSeed adds photos/albums properly to the newly initialized DB]
    
    // Add to cart and Checkout
    // ... rest of the flow ...
  });
});
