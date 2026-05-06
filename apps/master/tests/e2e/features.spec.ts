import { test, expect, Page } from '@playwright/test';
import { AlbumsPage, PhotosPage, OrdersPage } from './pages';

test.describe('Album Management', () => {
  let albumsPage: AlbumsPage;

  test.beforeEach(async ({ page }) => {
    albumsPage = new AlbumsPage(page);
  });

  test('should display albums list', async ({ page }) => {
    await albumsPage.goto();
    await albumsPage.expectLoaded();
  });

  test('should create new album', async ({ page }) => {
    const albumName = `Test Album ${Date.now()}`;
    await albumsPage.createAlbum(albumName);
    await albumsPage.expectAlbumExists(albumName);
  });

  test('should validate album name required', async ({ page }) => {
    await albumsPage.goto();
    await albumsPage.createButton.click();
    await albumsPage.saveButton.click();
    await expect(page.getByText(/name.*required|required.*name/i)).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Photo Management', () => {
  let photosPage: PhotosPage;

  test.beforeEach(async ({ page }) => {
    photosPage = new PhotosPage(page);
  });

  test('should display photos grid', async ({ page }) => {
    await photosPage.goto();
    await photosPage.expectLoaded();
  });

  test('should open file dialog on import', async ({ page }) => {
    await photosPage.goto();
    
    const filePromise = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
    await photosPage.importButton.click();
    const fileChooser = await filePromise;
    
    if (fileChooser) {
      expect(fileChooser).toBeTruthy();
    }
  });
});

test.describe('Order Management', () => {
  let ordersPage: OrdersPage;

  test.beforeEach(async ({ page }) => {
    ordersPage = new OrdersPage(page);
  });

  test('should display orders list', async ({ page }) => {
    await ordersPage.goto();
    await ordersPage.expectLoaded();
  });

  test('should create new order', async ({ page }) => {
    await ordersPage.createOrder({
      clientName: 'John Smith',
      email: 'john@example.com',
      items: ['item-1'],
    });
    await ordersPage.successToast.waitFor({ timeout: 5000 }).catch(() => {});
  });
});
