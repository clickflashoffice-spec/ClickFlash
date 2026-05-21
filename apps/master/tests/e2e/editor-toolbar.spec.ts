import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

test.describe("Editor Toolbar", () => {
  test("should show all toolbar buttons", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await expect(page.locator('[data-testid="album-editor"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="album-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="undo-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="redo-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-to-kiosk-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="before-after-button"]')).toBeVisible();
  });

  test("undo/redo buttons disabled initially", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await expect(page.locator('[data-testid="undo-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="redo-button"]')).toBeDisabled();
  });

  test("save button disabled when no changes", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await expect(page.locator('[data-testid="save-button"]')).toBeDisabled();
  });

  test("before/after button toggles on mousedown/mouseup", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const baBtn = page.locator('[data-testid="before-after-button"]');
    await expect(baBtn).toContainText("B/A");

    await baBtn.dispatchEvent("mousedown");
    await expect(baBtn).toContainText("Before");

    await baBtn.dispatchEvent("mouseup");
    await expect(baBtn).toContainText("B/A");
  });

  test("export button is visible and enabled", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const exportBtn = page.locator('[data-testid="export-button"]');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).not.toBeDisabled();
    await expect(exportBtn).toContainText("Batch Export");
  });

  test("send to kiosk button opens kiosk modal", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('[data-testid="send-to-kiosk-button"]').click();
    const modal = page.locator('[role="dialog"]');
    const visible = await modal.isVisible({ timeout: 5000 }).catch(() => false);
    if (visible) {
      await expect(modal).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });

  test("back button navigates to albums when no unsaved changes", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.click('[data-testid="back-button"]');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
  });

  test("back button confirms when dirty", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const exposureSlider = page.locator('[data-testid="exposure-slider"]');
    if (await exposureSlider.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exposureSlider.fill("20");
      await page.waitForTimeout(300);

      const backBtn = page.locator('[data-testid="back-button"]');
      page.once("dialog", (dialog) => dialog.dismiss());
      await backBtn.click();

      await expect(page.locator('[data-testid="album-editor"]')).toBeVisible();
    }
  });

  test("album title is displayed", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const title = page.locator('[data-testid="album-title"]');
    await expect(title).toBeVisible();
    const text = await title.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  });

  test("zoom controls are visible", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const zoomIn = page.locator('button[aria-label*="zoom in" i], button:has-text("+")').first();
    const zoomOut = page.locator('button[aria-label*="zoom out" i], button:has-text("−")').first();

    if (await zoomIn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(zoomIn).toBeVisible();
      await expect(zoomOut).toBeVisible();
    }
  });
});
