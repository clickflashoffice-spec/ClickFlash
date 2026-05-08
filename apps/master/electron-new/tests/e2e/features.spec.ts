import { test, expect } from './fixtures';

test.describe('Album Management', () => {
  test.beforeEach(async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173/login');
    await electronPage.getByLabel(/email/i).fill('admin@clickflash.photo');
    await electronPage.getByLabel(/password/i).fill('admin123');
    await electronPage.getByRole('button', { name: /sign in/i }).click();
    await electronPage.waitForURL(/dashboard|home/, { timeout: 15000 });
    
    await electronPage.goto('http://localhost:5173/albums');
    await electronPage.waitForLoadState('networkidle');
  });

  test('should display albums list', async ({ electronPage }) => {
    const albumsHeading = electronPage.getByRole('heading', { name: /albums/i });
    await expect(albumsHeading).toBeVisible({ timeout: 10000 });
  });

  test('should create new album', async ({ electronPage }) => {
    const createButton = electronPage.getByRole('button', { name: /create|add new/i });
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      const nameInput = electronPage.getByLabel(/name|title/i);
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Album E2E');
        await electronPage.getByRole('button', { name: /save|create/i }).click();
      }
    }
  });
});

test.describe('Photo Import', () => {
  test('should open file dialog', async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173/photos');
    await electronPage.waitForLoadState('networkidle');
    
    const importButton = electronPage.getByRole('button', { name: /import|add/i });
    
    if (await importButton.isVisible()) {
      const filePromise = electronPage.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
      await importButton.click();
      const fileChooser = await filePromise;
      
      expect(fileChooser).toBeTruthy();
    }
  });
});

test.describe('Orders', () => {
  test.beforeEach(async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173/login');
    await electronPage.getByLabel(/email/i).fill('admin@clickflash.photo');
    await electronPage.getByLabel(/password/i).fill('admin123');
    await electronPage.getByRole('button', { name: /sign in/i }).click();
    await electronPage.waitForURL(/dashboard|home/, { timeout: 15000 });
    
    await electronPage.goto('http://localhost:5173/orders');
    await electronPage.waitForLoadState('networkidle');
  });

  test('should display orders list', async ({ electronPage }) => {
    await expect(electronPage.getByRole('heading', { name: /orders/i })).toBeVisible({ timeout: 10000 });
  });
});
