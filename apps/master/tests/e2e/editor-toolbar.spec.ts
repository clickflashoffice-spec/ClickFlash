import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

test.describe("Editor Toolbar", () => {
  test("should show all toolbar buttons", async ({ page }) => {
    await openFirstAlbumEditor(page);

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
    await openFirstAlbumEditor(page);

    await expect(page.locator('[data-testid="undo-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="redo-button"]')).toBeDisabled();
  });

  test("save button disabled when no changes", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await expect(page.locator('[data-testid="save-button"]')).toBeDisabled();
  });

  test("before/after button toggles on mousedown/mouseup", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const baBtn = page.locator('[data-testid="before-after-button"]');
    await expect(baBtn).toContainText("B/A");

    await baBtn.dispatchEvent("mousedown");
    await expect(baBtn).toContainText("Before");

    await baBtn.dispatchEvent("mouseup");
    await expect(baBtn).toContainText("B/A");
  });

  test("export button is visible and enabled", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const exportBtn = page.locator('[data-testid="export-button"]');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).not.toBeDisabled();
    await expect(exportBtn).toContainText("Batch Export");
  });

  test("send to kiosk button opens kiosk modal", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('[data-testid="send-to-kiosk-button"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
  });

  test("back button navigates to albums when no unsaved changes", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.click('[data-testid="back-button"]');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
  });

  test("back button confirms when dirty", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const exposureSlider = page.locator('[data-testid="exposure-slider"]');
    await expect(exposureSlider).toBeVisible({ timeout: 10000 });
    await exposureSlider.fill("20");
    await page.waitForTimeout(300);

    const backBtn = page.locator('[data-testid="back-button"]');
    page.once("dialog", (dialog) => dialog.dismiss());
    await backBtn.click();

    await expect(page.locator('[data-testid="album-editor"]')).toBeVisible();
  });

  test("album title is displayed", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const title = page.locator('[data-testid="album-title"]');
    await expect(title).toBeVisible();
    const text = await title.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  });

  test("zoom controls are visible", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const zoomIn = page.locator('button[aria-label*="zoom in" i], button:has-text("+")').first();
    const zoomOut = page.locator('button[aria-label*="zoom out" i], button:has-text("−")').first();

    await expect(zoomIn).toBeVisible({ timeout: 10000 });
    await expect(zoomOut).toBeVisible({ timeout: 10000 });
  });
});
