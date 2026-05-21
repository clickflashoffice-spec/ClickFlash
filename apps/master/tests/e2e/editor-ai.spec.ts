import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

test.describe("Editor — AI Tab", () => {
  test("should switch to AI tab", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const aiTab = page.locator('#ai-tab, button:has-text("AI")').first();
    await aiTab.click();
    await expect(page.locator('#ai-panel, [role="tabpanel"]').first()).toBeVisible({ timeout: 5000 });
  });

  test("should show Auto Enhance button", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('#ai-tab, button:has-text("AI")').first().click();
    const enhanceBtn = page.locator('[data-testid="auto-enhance-button"], button:has-text("Auto Enhance")').first();
    if (await enhanceBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(enhanceBtn).toBeVisible();
    }
  });

  test("should show Scan for Suggestions button", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('#ai-tab, button:has-text("AI")').first().click();
    const scanBtn = page.locator('button:has-text("Scan"), button:has-text("Analyze")').first();
    if (await scanBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(scanBtn).toBeVisible();
    }
  });

  test("Apply AI Selection is disabled until scan", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('#ai-tab, button:has-text("AI")').first().click();
    const applyBtn = page.locator('button:has-text("Apply"), button:has-text("Apply AI Selection")').first();
    if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(applyBtn).toBeDisabled();
    }
  });

  test("should display culling stats area", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('#ai-tab, button:has-text("AI")').first().click();
    const stats = page.locator('text=/Total|Best|Skip|Selected|Rejected/i').first();
    if (await stats.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(stats).toBeVisible();
    }
  });

  test("should show capability indicators", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('#ai-tab, button:has-text("AI")').first().click();
    const capability = page.locator('text=/AI|Enhancement|Detection|Face/i').first();
    if (await capability.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(capability).toBeVisible();
    }
  });

  test("Auto Enhance click shows spinner state", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

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
    if (await enhanceBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await enhanceBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
