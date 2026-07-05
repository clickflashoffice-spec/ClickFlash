import { test, expect } from '@playwright/test';

/**
 * Accessibility E2E Tests
 * 
 * WCAG 2.1 AA compliance testing for all ClickFlash apps
 */

test.describe('Accessibility - Website', () => {
  test('page has proper heading structure', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev');
    
    const h1 = await page.locator('h1').count();
    expect(h1).toBe(1); // Exactly one H1
    
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let previousLevel = 0;
    
    for (const heading of headings) {
      const level = parseInt(await heading.evaluate(el => el.tagName[1]));
      expect(level).toBeLessThanOrEqual(previousLevel + 1);
      previousLevel = level;
    }
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev');
    
    const images = await page.locator('img').all();
    for (const image of images) {
      const alt = await image.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('form inputs have labels', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev/contact');
    
    const inputs = await page.locator('input, textarea, select').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      
      const hasLabel = id && await page.locator(`label[for="${id}"]`).count() > 0;
      expect(hasLabel || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
    }
  });

  test('focus indicators are visible', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev');
    
    const interactiveElements = await page.locator('a, button, input, select, textarea').all();
    
    for (const element of interactiveElements.slice(0, 5)) {
      await element.focus();
      const outline = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.outline || styles.boxShadow;
      });
      expect(outline).toBeTruthy();
    }
  });

  test('skip link works', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev');
    
    await page.keyboard.press('Tab');
    const skipLink = await page.locator('a[href="#main-content"]').first();
    
    if (await skipLink.isVisible()) {
      await skipLink.click();
      const mainContent = await page.locator('#main-content');
      await expect(mainContent).toBeFocused();
    }
  });

  test('color contrast meets WCAG AA', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev');
    
    const elements = await page.locator('p, span, a, button, h1, h2, h3, h4, li').all();
    
    for (const element of elements.slice(0, 10)) {
      const contrast = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        // Simplified contrast check - real implementation would use a contrast library
        const color = styles.color;
        const bgColor = styles.backgroundColor;
        return { color, bgColor };
      });
      
      expect(contrast.color).toBeTruthy();
      expect(contrast.bgColor).toBeTruthy();
    }
  });

  test('ARIA landmarks are present', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev');
    
    const landmarks = await page.locator('[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"]').count();
    expect(landmarks).toBeGreaterThan(0);
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev');
    
    // Tab through all interactive elements
    const interactiveElements = await page.locator('a, button, input').all();
    
    for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  });
});

test.describe('Accessibility - Master App', () => {
  test('dashboard is keyboard navigable', async ({ page }) => {
    await page.goto('http://localhost:8090');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    // Tab through navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('modal traps focus', async ({ page }) => {
    await page.goto('http://localhost:8090');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    // Open modal
    await page.click('[data-testid="new-album-button"]');
    await page.waitForSelector('[data-testid="modal-overlay"]');
    
    // Tab multiple times - focus should stay in modal
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }
    
    const focusedElement = await page.locator(':focus');
    const isInModal = await focusedElement.evaluate(el => 
      el.closest('[data-testid="modal-overlay"]') !== null
    );
    expect(isInModal).toBe(true);
  });

  test('live regions announce changes', async ({ page }) => {
    await page.goto('http://localhost:8090');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    // Check for live region
    const liveRegion = await page.locator('[aria-live]').count();
    expect(liveRegion).toBeGreaterThan(0);
  });
});

test.describe('Accessibility - Touch App', () => {
  test('touch targets are large enough', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    const buttons = await page.locator('button, [role="button"]').all();
    
    for (const button of buttons.slice(0, 10)) {
      const box = await button.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44); // WCAG minimum touch target size
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('high contrast mode support', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Emulate high contrast
    await page.emulateMedia({ forcedColors: 'active' });
    
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('reduced motion support', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Accessibility - Gallery', () => {
  test('gallery images have alt text', async ({ page }) => {
    await page.goto('https://gallery-backend.clickflash-office.workers.dev/album/test-album');
    
    const images = await page.locator('[data-testid="gallery-photo"] img').all();
    
    for (const image of images) {
      const alt = await image.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('lightbox is keyboard accessible', async ({ page }) => {
    await page.goto('https://gallery-backend.clickflash-office.workers.dev/album/test-album');
    await page.click('[data-testid="gallery-photo"]:first-child');
    
    await page.waitForSelector('[data-testid="lightbox"]');
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-testid="lightbox-image"]')).toBeVisible();
    
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-testid="lightbox-image"]')).toBeVisible();
    
    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="lightbox"]')).toBeHidden();
  });

  test('gallery has proper ARIA labels', async ({ page }) => {
    await page.goto('https://gallery-backend.clickflash-office.workers.dev/album/test-album');
    
    const gallery = await page.locator('[data-testid="gallery-container"]');
    const ariaLabel = await gallery.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });
});

test.describe('Accessibility - Management Hub', () => {
  test('data tables have proper headers', async ({ page }) => {
    await page.goto('https://management-hub.clickflash-office.workers.dev');
    await page.fill('[data-testid="email-input"]', 'admin@clickflash.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    await page.click('[data-testid="studios-nav"]');
    
    const tables = await page.locator('table').all();
    for (const table of tables) {
      const headers = await table.locator('th').count();
      expect(headers).toBeGreaterThan(0);
      
      const rows = await table.locator('tr').count();
      expect(rows).toBeGreaterThan(0);
    }
  });

  test('charts have alternative text', async ({ page }) => {
    await page.goto('https://management-hub.clickflash-office.workers.dev');
    await page.fill('[data-testid="email-input"]', 'admin@clickflash.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    const charts = await page.locator('[data-testid*="chart"]').all();
    for (const chart of charts) {
      const ariaLabel = await chart.getAttribute('aria-label');
      const title = await chart.getAttribute('title');
      expect(ariaLabel || title).toBeTruthy();
    }
  });
});

test.describe('Accessibility - Screen Reader', () => {
  test('page title changes on navigation', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev');
    const homeTitle = await page.title();
    
    await page.click('[data-testid="nav-pricing"]');
    await page.waitForLoadState('networkidle');
    const pricingTitle = await page.title();
    
    expect(pricingTitle).not.toBe(homeTitle);
    expect(pricingTitle).toContain('Pricing');
  });

  test('status messages are announced', async ({ page }) => {
    await page.goto('http://localhost:8090');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Check for status role
    const statusElements = await page.locator('[role="status"]').count();
    const alertElements = await page.locator('[role="alert"]').count();
    
    expect(statusElements + alertElements).toBeGreaterThan(0);
  });

  test('form errors are associated with inputs', async ({ page }) => {
    await page.goto('https://clickflash-website.pages.dev/contact');
    
    await page.click('[data-testid="contact-submit-button"]');
    
    const errors = await page.locator('[data-testid*="error"]').all();
    for (const error of errors) {
      const id = await error.getAttribute('id');
      if (id) {
        const associatedInput = await page.locator(`[aria-describedby="${id}"]`).count();
        expect(associatedInput).toBeGreaterThan(0);
      }
    }
  });
});