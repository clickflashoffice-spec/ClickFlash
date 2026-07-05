import { test, expect } from '@playwright/test';

/**
 * Smoke Tests
 * 
 * Quick health checks for all services
 */

test.describe('Smoke - All Services', () => {
  test('Master app is alive', async ({ page }) => {
    const response = await page.goto('http://localhost:8090/api/health');
    expect(response?.status()).toBeLessThan(500);
  });

  test('Touch app is alive', async ({ page }) => {
    const response = await page.goto('http://localhost:3001');
    expect(response?.status()).toBeLessThan(500);
  });

  test('MoneyTrash API is alive', async ({ request }) => {
    const response = await request.get('https://moneytrash-api.clickflash-office.workers.dev/health');
    expect(response.status()).toBeLessThan(500);
  });

  test('Gallery is alive', async ({ request }) => {
    const response = await request.get('https://gallery-backend.clickflash-office.workers.dev/health');
    expect(response.status()).toBeLessThan(500);
  });

  test('Management Hub is alive', async ({ request }) => {
    const response = await request.get('https://management-hub.clickflash-office.workers.dev/health');
    expect(response.status()).toBeLessThan(500);
  });

  test('Website is alive', async ({ request }) => {
    const response = await request.get('https://clickflash-website.pages.dev');
    expect(response.status()).toBeLessThan(500);
  });
});
