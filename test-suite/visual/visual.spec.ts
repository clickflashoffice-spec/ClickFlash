import { test, expect } from '@playwright/test';

/**
 * Visual Regression E2E Tests
 * 
 * Screenshot comparison testing for UI consistency
 */

test.describe('Visual - Website', () => {
  test('homepage matches snapshot', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('pricing page matches snapshot', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev/pricing');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('pricing.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('mobile homepage matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('https://clickflash-website.pages.dev');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('dark mode homepage', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('https://clickflash-website.pages.dev');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage-dark.png', {
      fullPage: true,
      threshold: 0.2
    });
  });
});

test.describe('Visual - Master App', () => {
  test('dashboard matches snapshot', async ({ page }) => {
    await page.goto('http://localhost:8090');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    await expect(page).toHaveScreenshot('master-dashboard.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('album editor matches snapshot', async ({ page }) => {
    await page.goto('http://localhost:8090');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    await page.click('[data-testid="album-card"]:first-child');
    await page.waitForSelector('[data-testid="album-editor"]');
    
    await expect(page).toHaveScreenshot('master-album-editor.png', {
      fullPage: true,
      threshold: 0.2
    });
  });
});

test.describe('Visual - Touch App', () => {
  test('kiosk display matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('touch-kiosk.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('product grid matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3001');
    await page.waitForSelector('[data-testid="product-grid"]');
    
    await expect(page).toHaveScreenshot('touch-products.png', {
      fullPage: true,
      threshold: 0.2
    });
  });
});

test.describe('Visual - Gallery', () => {
  test('public gallery matches snapshot', async ({ page }) => {
    await page.goto('https://gallery-backend.clickflash-office.workers.dev/album/test-album');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('gallery-public.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('lightbox matches snapshot', async ({ page }) => {
    await page.goto('https://gallery-backend.clickflash-office.workers.dev/album/test-album');
    await page.click('[data-testid="gallery-photo"]:first-child');
    await page.waitForSelector('[data-testid="lightbox"]');
    
    await expect(page).toHaveScreenshot('gallery-lightbox.png', {
      threshold: 0.2
    });
  });
});

test.describe('Visual - Management Hub', () => {
  test('admin dashboard matches snapshot', async ({ page }) => {
    await page.goto('https://management-hub.clickflash-office.workers.dev');
    await page.fill('[data-testid="email-input"]', 'admin@clickflash.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    await expect(page).toHaveScreenshot('management-dashboard.png', {
      fullPage: true,
      threshold: 0.2
    });
  });
});

test.describe('Visual - Component States', () => {
  test('button states', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev');
    
    const button = await page.locator('[data-testid="hero-cta-button"]');
    
    // Default state
    await expect(button).toHaveScreenshot('button-default.png');
    
    // Hover state
    await button.hover();
    await expect(button).toHaveScreenshot('button-hover.png');
    
    // Focus state
    await button.focus();
    await expect(button).toHaveScreenshot('button-focus.png');
    
    // Active state
    await button.dispatchEvent('mousedown');
    await expect(button).toHaveScreenshot('button-active.png');
  });

  test('form validation states', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev/contact');
    
    const input = await page.locator('[data-testid="contact-email-input"]');
    
    // Empty state
    await expect(input).toHaveScreenshot('input-empty.png');
    
    // Invalid state
    await input.fill('invalid-email');
    await page.click('[data-testid="contact-submit-button"]');
    await expect(input).toHaveScreenshot('input-invalid.png');
    
    // Valid state
    await input.fill('valid@example.com');
    await expect(input).toHaveScreenshot('input-valid.png');
  });

  test('loading states', async ({ page }) => {
    await page.goto('http://localhost:8090');
    
    // Check loading spinner
    const spinner = await page.locator('[data-testid="loading-spinner"]');
    if (await spinner.count() > 0) {
      await expect(spinner).toHaveScreenshot('loading-spinner.png');
    }
  });

  test('empty states', async ({ page }) => {
    await page.goto('http://localhost:8090');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to empty section
    await page.click('[data-testid="orders-nav"]');
    
    // Filter to show no results
    await page.fill('[data-testid="search-input"]', 'nonexistent-order-12345');
    await page.click('[data-testid="search-button"]');
    
    const emptyState = await page.locator('[data-testid="empty-state"]');
    if (await emptyState.count() > 0) {
      await expect(emptyState).toHaveScreenshot('empty-state.png');
    }
  });
});

test.describe('Visual - Responsive', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'wide', width: 1920, height: 1080 }
  ];

  for (const viewport of viewports) {
    test(`website at ${viewport.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('https://clickflash-website.pages.dev');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot(`website-${viewport.name}.png`, {
        fullPage: true,
        threshold: 0.2
      });
    });
  }
});

test.describe('Visual - Animations', () => {
  test('page transitions', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev');
    await page.waitForLoadState('networkidle');
    
    // Capture transition frames
    const frames = [];
    
    await page.click('[data-testid="nav-pricing"]');
    
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(100);
      frames.push(await page.screenshot());
    }
    
    expect(frames.length).toBe(5);
  });

  test('modal animation', async ({ page }) => {
    await page.goto('http://localhost:8090');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    const frames = [];
    
    await page.click('[data-testid="new-album-button"]');
    
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(50);
      frames.push(await page.screenshot());
    }
    
    expect(frames.length).toBe(5);
  });
});
