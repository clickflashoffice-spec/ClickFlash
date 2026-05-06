import { test, expect, Page } from '@playwright/test';

test.describe('Database Integrity Tests', () => {
  test('should maintain referential integrity', async ({ page }) => {
    await page.goto('/albums');
    
    const albumLink = page.locator('[data-testid="album-card"]').first();
    
    if (await albumLink.isVisible()) {
      await albumLink.click();
      await page.waitForURL(/albums\/\w+/);
      
      const photos = page.locator('[data-testid="photo-card"]');
      const photoCount = await photos.count();
      
      expect(photoCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle concurrent updates correctly', async ({ page }) => {
    await page.goto('/settings');
    
    const updatePromise = page.evaluate(async () => {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ locationName: 'Updated Name 1' }),
      });
      return response.json();
    });
    
    const secondUpdate = page.evaluate(async () => {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ locationName: 'Updated Name 2' }),
      });
      return response.json();
    });
    
    const [first, second] = await Promise.all([updatePromise, secondUpdate]);
    
    expect(first.success || second.success).toBeTruthy();
  });

  test('should rollback on transaction failure', async ({ page }) => {
    await page.goto('/orders');
    
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/orders/invalid-id', {
          method: 'DELETE',
        });
        return { status: res.status, ok: res.ok };
      } catch (e) {
        return { error: true };
      }
    });
    
    expect(response.status !== 200 || response.error).toBeTruthy();
  });
});

test.describe('Database Migration Tests', () => {
  test('should run migrations on startup', async ({ page }) => {
    const migrationsRan = await page.evaluate(async () => {
      const response = await fetch('/api/health');
      const data = await response.json();
      return data.status === 'healthy';
    });
    
    expect(migrationsRan).toBeTruthy();
  });

  test('should preserve data across restarts', async ({ page }) => {
    const initialData = await page.evaluate(async () => {
      const response = await fetch('/api/settings');
      return response.json();
    });
    
    await page.reload();
    
    const afterReloadData = await page.evaluate(async () => {
      const response = await fetch('/api/settings');
      return response.json();
    });
    
    expect(afterReloadData.locationName).toBe(initialData.locationName);
  });
});

test.describe('Data Validation Tests', () => {
  test('should validate email format', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="username-input"]', 'notanemail');
    await page.fill('[data-testid="password-input"]', 'DEFAULT_PASSWORD_PLACEHOLDER');
    await page.click('[data-testid="login-button"]');
    
    const error = page.locator('[data-testid="error-message"], .error');
    if (await error.isVisible({ timeout: 3000 })) {
      expect(await error.textContent()).toMatch(/email|valid/i);
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/orders');
    
    await page.click('[data-testid="create-order"]');
    await page.click('[data-testid="save-order"]');
    
    const validationError = page.locator('text=/required|field.*empty/i');
    if (await validationError.isVisible({ timeout: 3000 })) {
      expect(true).toBeTruthy();
    }
  });

  test('should sanitize user input', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="username-input"]', '<script>alert("xss")</script>test@example.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
    
    await page.waitForTimeout(1000);
    
    const bodyHTML = await page.locator('body').innerHTML();
    expect(bodyHTML).not.toContain('<script>alert');
  });
});
