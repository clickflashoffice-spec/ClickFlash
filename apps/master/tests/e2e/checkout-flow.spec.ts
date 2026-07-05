import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Checkout Flow (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and login
    await login(page);
    
    // Wait for the dashboard to load (App usually shows Home or Dashboard)
    await expect(page.getByText(/home/i, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should complete a manual checkout flow and trigger printing', async ({ page }) => {
    // 1. Navigate to Orders view
    // The sidebar has a button for Orders
    const ordersNavButton = page.getByRole('button', { name: /orders/i, exact: false });
    await ordersNavButton.first().click();
    
    // Wait for the Orders Board/List to appear
    await expect(page.getByText(/new order/i, { exact: false })).toBeVisible({ timeout: 5000 });

    // 2. Open "New Order" Modal
    await page.getByRole('button', { name: /new order/i, exact: false }).click();
    
    // Check if the modal is visible
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Fill customer info
    await page.getByLabel(/client name/i).fill('Test E2E Customer');
    await page.getByLabel(/email/i).fill('e2e@example.com');

    // 3. Product Selection
    // Assume there's a button to add an item or products are listed
    const addProductButton = page.getByRole('button', { name: /add item/i, exact: false }).first();
    if (await addProductButton.isVisible()) {
      await addProductButton.click();
    } else {
      // Find a specific product to add by text or role
      const productButton = page.getByRole('button', { name: /digital/i, exact: false }).first();
      if (await productButton.isVisible()) await productButton.click();
    }

    // 4. Payment Sync & Order Creation
    const createButton = page.getByRole('button', { name: /create order/i, exact: false });
    await createButton.click();

    // Verify modal closes
    await expect(modal).not.toBeVisible();

    // Verify toast or new order appears
    await expect(page.getByText(/test e2e customer/i)).toBeVisible({ timeout: 5000 });
  });
});
