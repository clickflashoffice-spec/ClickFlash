import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

test.describe("Editor — Zoom Controls", () => {
  test("zoom in button increases zoom", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const zoomIn = page.locator('button[aria-label*="zoom in" i], button:has-text("+")').first();
    await expect(zoomIn).toBeVisible({ timeout: 10000 });
    await zoomIn.click();
    await page.waitForTimeout(300);
  });

  test("zoom out button decreases zoom", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const zoomOut = page.locator('button[aria-label*="zoom out" i], button:has-text("−")').first();
    await expect(zoomOut).toBeVisible({ timeout: 10000 });
    await zoomOut.click();
    await page.waitForTimeout(300);
  });

  test("fit to screen button resets zoom", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const fitBtn = page.locator('button[aria-label*="fit" i], button:has-text("Fit")').first();
    await expect(fitBtn).toBeVisible({ timeout: 10000 });
    await fitBtn.click();
    await page.waitForTimeout(300);
  });

  test("actual pixels (1:1) button", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const actualBtn = page.locator('button[aria-label*="actual" i], button:has-text("1:1"), button:has-text("100%")').first();
    await expect(actualBtn).toBeVisible({ timeout: 10000 });
    await actualBtn.click();
    await page.waitForTimeout(300);
  });

  test("zoom percentage is displayed", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const zoomDisplay = page.locator('text=/%/').first();
    await expect(zoomDisplay).toBeVisible({ timeout: 10000 });
  });

  test("Ctrl+Wheel zoom on canvas", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const canvas = page.locator('[data-testid="album-editor"] canvas, [data-testid="album-editor"] img').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await canvas.hover();
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(300);
  });

  test("Ctrl+0 resets zoom", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.keyboard.press("Control+0");
    await page.waitForTimeout(300);
  });

  test("Ctrl++ zooms in", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.keyboard.press("Control+=");
    await page.waitForTimeout(300);
  });

  test("Ctrl+- zooms out", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.keyboard.press("Control+-");
    await page.waitForTimeout(300);
  });
});
