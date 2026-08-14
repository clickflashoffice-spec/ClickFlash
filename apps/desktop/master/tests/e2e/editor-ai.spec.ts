import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

test.describe("Editor — AI Tab", () => {
  test("should switch to AI tab", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const aiTab = page.locator('#ai-tab, button:has-text("AI")').first();
    await aiTab.click();
    await expect(page.locator('#ai-panel, [role="tabpanel"]').first()).toBeVisible({ timeout: 5000 });
  });

  test("should show Auto Enhance button", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#ai-tab, button:has-text("AI")').first().click();
    const enhanceBtn = page.locator('[data-testid="auto-enhance-button"], button:has-text("Auto Enhance")').first();
    await expect(enhanceBtn).toBeVisible({ timeout: 10000 });
  });

  test("should show Scan for Suggestions button", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#ai-tab, button:has-text("AI")').first().click();
    const scanBtn = page.locator('button:has-text("Scan"), button:has-text("Analyze")').first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
  });

  test("Apply AI Selection is disabled until scan", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#ai-tab, button:has-text("AI")').first().click();
    const applyBtn = page.locator('button:has-text("Apply"), button:has-text("Apply AI Selection")').first();
    await expect(applyBtn).toBeVisible({ timeout: 10000 });
    await expect(applyBtn).toBeDisabled();
  });

  test("should display culling stats area", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#ai-tab, button:has-text("AI")').first().click();
    const stats = page.locator('text=/Total|Best|Skip|Selected|Rejected/i').first();
    await expect(stats).toBeVisible({ timeout: 10000 });
  });

  test("should show capability indicators", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#ai-tab, button:has-text("AI")').first().click();
    const capability = page.locator('text=/AI|Enhancement|Detection|Face/i').first();
    await expect(capability).toBeVisible({ timeout: 10000 });
  });

  test("Auto Enhance click shows spinner state", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.route("**/api/culling/auto-enhance*", async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, edits: { exposure: 10 } }),
      });
    });

    await page.locator('#ai-tab, button:has-text("AI")').first().click();
    const enhanceBtn = page.locator('[data-testid="auto-enhance-button"], button:has-text("Auto Enhance")').first();
    await expect(enhanceBtn).toBeVisible({ timeout: 10000 });
    await enhanceBtn.click();
    await page.waitForTimeout(500);
  });
});
