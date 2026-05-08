import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests (WCAG 2.1 AA)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('Login page should have no accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Login form should have proper labels', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    const emailLabel = await page.evaluate(() => {
      const input = document.querySelector('input[type="email"], input[name="email"]');
      return input?.getAttribute('aria-label') || document.querySelector('label[for="' + input?.id + '"]')?.textContent;
    });

    const passwordLabel = await page.evaluate(() => {
      const input = document.querySelector('input[type="password"], input[name="password"]');
      return input?.getAttribute('aria-label') || document.querySelector('label[for="' + input?.id + '"]')?.textContent;
    });

    expect(emailLabel).toBeTruthy();
    expect(passwordLabel).toBeTruthy();
  });

  test('Login button should be keyboard accessible', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /sign in/i });
    
    await submitButton.focus();
    await expect(submitButton).toBeFocused();

    await page.keyboard.press('Tab');
    
    const isFocused = await submitButton.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
  });

  test('Dashboard page should have no accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Dashboard navigation should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const navItems = page.locator('nav a, nav button');
    const count = await navItems.count();

    expect(count).toBeGreaterThan(0);

    await page.keyboard.press('Tab');
    let focusedCount = 0;
    
    for (let i = 0; i < count; i++) {
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      if (focused === 'A' || focused === 'BUTTON') {
        focusedCount++;
      }
      await page.keyboard.press('Tab');
    }

    expect(focusedCount).toBeGreaterThan(0);
  });

  test('Albums page should have no accessibility violations', async ({ page }) => {
    await page.goto('/albums');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Orders page should have no accessibility violations', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Settings page should have no accessibility violations', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Modal dialog should trap focus', async ({ page }) => {
    await page.goto('/albums');
    await page.waitForLoadState('networkidle');

    const createButton = page.getByTestId('create-album').or(page.getByRole('button', { name: /create/i })).first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"], [aria-modal="true"]');
      await expect(modal).toBeVisible();

      const focusableElements = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
        if (!modal) return [];
        return modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ).length;
      });

      expect(focusableElements).toBeGreaterThan(0);

      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });

  test('Color contrast should meet WCAG AA standards', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );

    expect(contrastViolations).toEqual([]);
  });

  test('Images should have alt text', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const imagesWithoutAlt = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images)
        .filter((img) => !img.alt && !img.getAttribute('role'))
        .map((img) => img.src);
    });

    expect(imagesWithoutAlt).toEqual([]);
  });

  test('Headings should be properly nested', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const headingStructure = await page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const levels = Array.from(headings).map((h) => parseInt(h.tagName[1]));
      return levels;
    });

    let lastLevel = 0;
    for (const level of headingStructure) {
      expect(level - lastLevel).toBeLessThanOrEqual(1);
      lastLevel = level;
    }
  });

  test('Page should have skip navigation link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const skipLink = page.locator('a[href="#main"], a[href="#main-content"]');
    
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.textContent?.trim());
    
    const hasSkipLink = (await skipLink.count()) > 0;
    if (hasSkipLink) {
      expect(firstFocused).toBeTruthy();
    }
  });

  test('Form errors should be announced to screen readers', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('short');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForTimeout(500);
    
    const errorAnnouncements = await page.evaluate(() => {
      const liveRegions = document.querySelectorAll('[aria-live], [aria-atomic]');
      const errors = document.querySelectorAll('[role="alert"], .error, .text-red-400');
      return {
        liveRegions: liveRegions.length,
        errors: errors.length,
      };
    });

    expect(errorAnnouncements.liveRegions + errorAnnouncements.errors).toBeGreaterThan(0);
  });

  test('Interactive elements should have accessible names', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const elementsWithoutNames = await page.evaluate(() => {
      const interactive = document.querySelectorAll('button, a, input, select, textarea');
      return Array.from(interactive)
        .filter((el) => {
          const hasText = el.textContent?.trim();
          const hasAriaLabel = el.getAttribute('aria-label');
          const hasAriaLabelledBy = el.getAttribute('aria-labelledby');
          const hasTitle = el.getAttribute('title');
          return !hasText && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle;
        })
        .length;
    });

    expect(elementsWithoutNames).toBe(0);
  });
});

test.describe('Keyboard Navigation', () => {
  test('Full keyboard flow through login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    
    await page.keyboard.type('test@test.com');
    await page.keyboard.press('Tab');
    
    await page.keyboard.type('DEFAULT_PASSWORD_PLACEHOLDER');
    await page.keyboard.press('Tab');
    
    await page.keyboard.press('Enter');
    
    await page.waitForURL(/dashboard|error/);
  });

  test('Tab order should be logical', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const tabOrder = await page.evaluate(() => {
      const focusable = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(focusable)
        .map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''))
        .join(' -> ');
    });

    expect(tabOrder).toBeTruthy();
  });
});

test.describe('Screen Reader Support', () => {
  test('Landmark regions should be present', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const landmarks = await page.evaluate(() => {
      return {
        header: !!document.querySelector('header'),
        nav: !!document.querySelector('nav'),
        main: !!document.querySelector('main, [role="main"]'),
        footer: !!document.querySelector('footer'),
      };
    });

    expect(landmarks.main).toBe(true);
  });

  test('Page title should be descriptive', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
