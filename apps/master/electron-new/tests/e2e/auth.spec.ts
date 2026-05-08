import { test, expect } from './fixtures';

test.describe('Login Flow', () => {
  test('should display login page', async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173/login');
    
    const loginButton = electronPage.getByRole('button', { name: /sign in/i });
    await expect(loginButton).toBeVisible({ timeout: 10000 });
  });

  test('should login with valid credentials', async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173/login');
    
    await electronPage.getByLabel(/email/i).fill('admin@clickflash.photo');
    await electronPage.getByLabel(/password/i).fill('admin123');
    await electronPage.getByRole('button', { name: /sign in/i }).click();
    
    await expect(electronPage).toHaveURL(/dashboard|home/, { timeout: 15000 });
  });

  test('should reject invalid credentials', async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173/login');
    
    await electronPage.getByLabel(/email/i).fill('invalid@test.com');
    await electronPage.getByLabel(/password/i).fill('wrongpassword');
    await electronPage.getByRole('button', { name: /sign in/i }).click();
    
    const errorMessage = electronPage.getByText(/invalid|error|unauthorized/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173/login');
    await electronPage.getByLabel(/email/i).fill('admin@clickflash.photo');
    await electronPage.getByLabel(/password/i).fill('admin123');
    await electronPage.getByRole('button', { name: /sign in/i }).click();
    await electronPage.waitForURL(/dashboard|home/, { timeout: 15000 });
  });

  test('should navigate to albums', async ({ electronPage }) => {
    await electronPage.getByRole('link', { name: /albums/i }).click();
    await expect(electronPage).toHaveURL(/albums/, { timeout: 10000 });
  });

  test('should navigate to photos', async ({ electronPage }) => {
    await electronPage.getByRole('link', { name: /photos/i }).click();
    await expect(electronPage).toHaveURL(/photos/, { timeout: 10000 });
  });

  test('should navigate to orders', async ({ electronPage }) => {
    await electronPage.getByRole('link', { name: /orders/i }).click();
    await expect(electronPage).toHaveURL(/orders/, { timeout: 10000 });
  });
});
