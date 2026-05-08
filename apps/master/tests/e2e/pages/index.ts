import { test, expect, Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly url: string;

  constructor(page: Page) {
    this.page = page;
    this.url = '/login';
  }

  async goto() {
    await this.page.goto(this.url);
  }

  get emailInput() {
    return this.page.getByLabel(/email/i);
  }

  get passwordInput() {
    return this.page.getByLabel(/password/i);
  }

  get submitButton() {
    return this.page.getByRole('button', { name: /sign in|submit|log in/i });
  }

  get errorMessage() {
    return this.page.locator('[data-testid="error-message"], .text-red-400, [role="alert"]').first();
  }

  async login(email: string, password: string) {
    await this.goto();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoaded() {
    await expect(this.emailInput).toBeVisible({ timeout: 10000 });
    await expect(this.submitButton).toBeVisible();
  }

  async expectError() {
    await expect(this.errorMessage).toBeVisible({ timeout: 5000 });
  }
}

export class DashboardPage {
  readonly page: Page;
  readonly url: string;

  constructor(page: Page) {
    this.page = page;
    this.url = '/dashboard';
  }

  async goto() {
    await this.page.goto(this.url);
  }

  get navOrders() {
    return this.page.getByTestId('nav-orders').or(this.page.getByRole('link', { name: /orders/i })).first();
  }

  get navAlbums() {
    return this.page.getByTestId('nav-albums').or(this.page.getByRole('link', { name: /albums/i })).first();
  }

  get navPhotos() {
    return this.page.getByTestId('nav-photos').or(this.page.getByRole('link', { name: /photos/i })).first();
  }

  get navSettings() {
    return this.page.getByTestId('nav-settings').or(this.page.getByRole('link', { name: /settings/i })).first();
  }

  get syncStatus() {
    return this.page.getByTestId('sync-status').or(this.page.locator('[class*="sync"]').first());
  }

  get logoutButton() {
    return this.page.getByRole('button', { name: /log out|sign out|logout/i });
  }

  async gotoAlbums() {
    await this.navAlbums.click();
    await this.page.waitForURL(/albums/);
  }

  async gotoOrders() {
    await this.navOrders.click();
    await this.page.waitForURL(/orders/);
  }

  async gotoPhotos() {
    await this.navPhotos.click();
    await this.page.waitForURL(/photos/);
  }

  async logout() {
    await this.logoutButton.click();
    await this.page.waitForURL(/login/);
  }

  async expectLoaded() {
    await expect(this.syncStatus).toBeVisible({ timeout: 10000 });
  }

  async expectSynced() {
    await expect(this.syncStatus).toContainText(/synced|online|connected/i, { timeout: 10000 });
  }
}

export class AlbumsPage {
  readonly page: Page;
  readonly url: string;

  constructor(page: Page) {
    this.page = page;
    this.url = '/albums';
  }

  async goto() {
    await this.page.goto(this.url);
  }

  get createButton() {
    return this.page.getByTestId('create-album').or(this.page.getByRole('button', { name: /create|add new/i })).first();
  }

  get albumGrid() {
    return this.page.getByTestId('albums-grid').or(this.page.locator('[class*="album-grid"]')).first();
  }

  get albumCards() {
    return this.page.getByTestId('album-card').or(this.page.locator('[class*="album-card"]'));
  }

  get nameInput() {
    return this.page.getByTestId('album-name-input').or(this.page.getByLabel(/name/i)).first();
  }

  get saveButton() {
    return this.page.getByTestId('save-album').or(this.page.getByRole('button', { name: /save|create/i })).first();
  }

  async createAlbum(name: string) {
    await this.goto();
    await this.createButton.click();
    await this.nameInput.fill(name);
    await this.saveButton.click();
  }

  async expectLoaded() {
    await expect(this.albumGrid).toBeVisible({ timeout: 10000 });
  }

  async expectAlbumExists(name: string) {
    await expect(this.page.getByText(name)).toBeVisible({ timeout: 5000 });
  }
}

export class OrdersPage {
  readonly page: Page;
  readonly url: string;

  constructor(page: Page) {
    this.page = page;
    this.url = '/orders';
  }

  async goto() {
    await this.page.goto(this.url);
  }

  get createButton() {
    return this.page.getByTestId('create-order').or(this.page.getByRole('button', { name: /create|new order/i })).first();
  }

  get orderTable() {
    return this.page.getByTestId('orders-table').or(this.page.locator('table')).first();
  }

  get orderRows() {
    return this.page.locator('tbody tr');
  }

  get successToast() {
    return this.page.getByTestId('success-toast').or(this.page.locator('[class*="toast"][class*="success"]').first());
  }

  async createOrder(orderData: { clientName: string; email: string; items: string[] }) {
    await this.goto();
    await this.createButton.click();
    
    await this.page.getByLabel(/client name/i).fill(orderData.clientName);
    await this.page.getByLabel(/email/i).fill(orderData.email);
    
    await this.page.getByRole('button', { name: /save|create/i }).click();
  }

  async expectLoaded() {
    await expect(this.orderTable).toBeVisible({ timeout: 10000 });
  }

  async expectOrderExists(orderNumber: string) {
    await expect(this.page.getByText(orderNumber)).toBeVisible({ timeout: 5000 });
  }
}

export class PhotosPage {
  readonly page: Page;
  readonly url: string;

  constructor(page: Page) {
    this.page = page;
    this.url = '/photos';
  }

  async goto() {
    await this.page.goto(this.url);
  }

  get importButton() {
    return this.page.getByTestId('import-photos').or(this.page.getByRole('button', { name: /import/i })).first();
  }

  get photoGrid() {
    return this.page.getByTestId('photo-grid').or(this.page.locator('[class*="photo-grid"]')).first();
  }

  get photoCards() {
    return this.page.getByTestId('photo-card').or(this.page.locator('[class*="photo-card"]'));
  }

  get uploadProgress() {
    return this.page.getByTestId('upload-progress');
  }

  async expectLoaded() {
    await expect(this.photoGrid).toBeVisible({ timeout: 10000 });
  }

  async selectPhoto(id: string) {
    await this.page.getByTestId(`photo-${id}`).click();
  }

  async expectPhotoCount(count: number) {
    await expect(this.photoCards).toHaveCount(count, { timeout: 5000 });
  }
}

export class SettingsPage {
  readonly page: Page;
  readonly url: string;

  constructor(page: Page) {
    this.page = page;
    this.url = '/settings';
  }

  async goto() {
    await this.page.goto(this.url);
  }

  get locationNameInput() {
    return this.page.getByTestId('location-name').or(this.page.getByLabel(/location name/i)).first();
  }

  get saveButton() {
    return this.page.getByTestId('save-settings').or(this.page.getByRole('button', { name: /save/i })).first();
  }

  get backupButton() {
    return this.page.getByTestId('backup-now').or(this.page.getByRole('button', { name: /backup/i })).first();
  }

  get successToast() {
    return this.page.getByTestId('success-toast');
  }

  async updateLocationName(name: string) {
    await this.goto();
    await this.locationNameInput.clear();
    await this.locationNameInput.fill(name);
    await this.saveButton.click();
  }

  async expectLoaded() {
    await expect(this.locationNameInput).toBeVisible({ timeout: 10000 });
  }
}
