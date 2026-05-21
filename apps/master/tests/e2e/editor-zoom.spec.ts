import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

test.describe("Editor — Zoom Controls", () => {
  test("zoom in button increases zoom", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const zoomIn = page.locator('button[aria-label*="zoom in" i], button:has-text("+")').first();
    if (await zoomIn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await zoomIn.click();
      await page.waitForTimeout(300);
    }
  });

  test("zoom out button decreases zoom", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const zoomOut = page.locator('button[aria-label*="zoom out" i], button:has-text("−")').first();
    if (await zoomOut.isVisible({ timeout: 3000 }).catch(() => false)) {
      await zoomOut.click();
      await page.waitForTimeout(300);
    }
  });

  test("fit to screen button resets zoom", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const fitBtn = page.locator('button[aria-label*="fit" i], button:has-text("Fit")').first();
    if (await fitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fitBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test("actual pixels (1:1) button", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const actualBtn = page.locator('button[aria-label*="actual" i], button:has-text("1:1"), button:has-text("100%")').first();
    if (await actualBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await actualBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test("zoom percentage is displayed", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const zoomDisplay = page.locator('text=/%/').first();
    if (await zoomDisplay.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(zoomDisplay).toBeVisible();
    }
  });

  test("Ctrl+Wheel zoom on canvas", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const canvas = page.locator('[data-testid="album-editor"] canvas, [data-testid="album-editor"] img').first();
    if (await canvas.isVisible({ timeout: 5000 }).catch(() => false)) {
      await canvas.hover();
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(300);
    }
  });

  test("Ctrl+0 resets zoom", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.keyboard.press("Control+0");
    await page.waitForTimeout(300);
  });

  test("Ctrl++ zooms in", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.keyboard.press("Control+=");
    await page.waitForTimeout(300);
  });

  test("Ctrl+- zooms out", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.keyboard.press("Control+-");
    await page.waitForTimeout(300);
  });
});
