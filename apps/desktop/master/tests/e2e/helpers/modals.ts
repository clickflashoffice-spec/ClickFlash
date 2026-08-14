import { Page, expect } from "@playwright/test";

export async function expectModalOpen(page: Page) {
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
}

export async function closeModalByEsc(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
}

export async function closeModalByBackdrop(page: Page) {
  const backdrop = page.locator('[data-testid="modal-backdrop"], .fixed.inset-0').first();
  if (await backdrop.isVisible({ timeout: 2000 }).catch(() => false)) {
    await backdrop.click({ position: { x: 5, y: 5 }, force: true });
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
  }
}

export async function closeModalByCancel(page: Page) {
  const cancelBtn = page.locator('button:has-text("Cancel")').first();
  await cancelBtn.click();
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
}
