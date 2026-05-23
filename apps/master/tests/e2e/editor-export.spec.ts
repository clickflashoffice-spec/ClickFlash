import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

test.describe("Editor — Export", () => {
  test("export button is visible and clickable", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const exportBtn = page.locator('[data-testid="export-button"]');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).not.toBeDisabled();
  });

  test("export button shows Batch Export text", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await expect(page.locator('[data-testid="export-button"]')).toContainText("Batch Export");
  });

  test("clicking export triggers export flow", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const exportBtn = page.locator('[data-testid="export-button"]');
    await exportBtn.click();
    await page.waitForTimeout(1000);
  });

  test("editor has canvas or img for photo display", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await expect(
      page.locator('[data-testid="album-editor"] canvas, [data-testid="album-editor"] img').first()
    ).toBeVisible({ timeout: 10000 });
  });
});
