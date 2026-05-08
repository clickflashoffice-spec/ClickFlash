import { test, expect } from './fixtures';

const UPDATE_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS === 'true';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ electronPage }) => {
    await electronPage.setViewportSize({ width: 1920, height: 1080 });
  });

  test('login page visual snapshot', async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173/login');
    await electronPage.waitForLoadState('networkidle');
    
    const loginCard = electronPage.locator('main, .login, [role="main"]').first();
    
    await expect(loginCard).toHaveScreenshot('login-page.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

  test('dashboard visual snapshot', async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173/login');
    await electronPage.getByLabel(/email/i).fill('admin@clickflash.photo');
    await electronPage.getByLabel(/password/i).fill('admin123');
    await electronPage.getByRole('button', { name: /sign in/i }).click();
    await electronPage.waitForURL(/dashboard|home/, { timeout: 15000 });
    
    await electronPage.waitForLoadState('networkidle');
    
    const dashboard = electronPage.locator('main, .dashboard, [role="main"]').first();
    
    await expect(dashboard).toHaveScreenshot('dashboard.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

  test('albums page visual snapshot', async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173/login');
    await electronPage.getByLabel(/email/i).fill('admin@clickflash.photo');
    await electronPage.getByLabel(/password/i).fill('admin123');
    await electronPage.getByRole('button', { name: /sign in/i }).click();
    await electronPage.waitForURL(/dashboard|home/, { timeout: 15000 });
    
    await electronPage.goto('http://localhost:5173/albums');
    await electronPage.waitForLoadState('networkidle');
    
    const albumsGrid = electronPage.locator('.albums, [data-testid="albums-grid"]').first();
    
    await expect(albumsGrid).toHaveScreenshot('albums-page.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });
});

test.describe('Component Snapshots', () => {
  test('button component states', async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173/login');
    
    const button = electronPage.getByRole('button', { name: /sign in/i });
    
    await expect(button).toHaveScreenshot('button-default.png', {
      maxDiffPixelRatio: 0.05,
    });
    
    await button.hover();
    await expect(button).toHaveScreenshot('button-hover.png', {
      maxDiffPixelRatio: 0.05,
    });
    
    await button.click();
    await expect(button).toHaveScreenshot('button-active.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('input component states', async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173/login');
    
    const input = electronPage.getByLabel(/email/i);
    
    await expect(input).toHaveScreenshot('input-empty.png', {
      maxDiffPixelRatio: 0.05,
    });
    
    await input.fill('test@example.com');
    await expect(input).toHaveScreenshot('input-filled.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});
