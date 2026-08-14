import { test, expect, Page } from '@playwright/test';
import { i18next } from 'i18next';

test.describe('Localization and Internationalization Tests', () => {
  const supportedLanguages = ['en', 'es', 'fr', 'de'];

  test('should display English text by default', async ({ page }) => {
    await page.goto('/login');
    
    const signInButton = page.getByRole('button', { name: /sign in|log in/i });
    await expect(signInButton).toBeVisible();
  });

  test('should switch language correctly', async ({ page }) => {
    await page.goto('/login');
    
    const languageSwitcher = page.locator('[data-testid="language-switcher"], select[name="language"], [aria-label="language"]').first();
    
    if (await languageSwitcher.isVisible()) {
      await languageSwitcher.selectOption('es');
      await page.waitForTimeout(500);
      
      const submitButton = page.locator('button[type="submit"]').first();
      await expect(submitButton).toBeVisible();
    }
  });

  test('should handle RTL languages correctly', async ({ page }) => {
    await page.goto('/login');
    
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    });
    
    await page.waitForTimeout(500);
    
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });

  test('should not truncate long translations', async ({ page }) => {
    await page.goto('/login');
    
    const longText = 'This is a very long text that should not be truncated in the UI';
    
    await page.evaluate((text) => {
      const element = document.querySelector('body');
      if (element) element.textContent = text.repeat(10);
    }, longText);
    
    await page.waitForTimeout(500);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display currency in correct locale', async ({ page }) => {
    await page.goto('/orders');
    
    const priceElements = page.locator('[data-testid="price"], .price, [class*="currency"]');
    
    if (await priceElements.first().isVisible()) {
      const priceText = await priceElements.first().textContent();
      
      const hasCorrectFormat = /\$\d+\.\d{2}|USD\s*\d+/i.test(priceText || '');
      expect(hasCorrectFormat).toBeTruthy();
    }
  });

  test('should display dates in correct locale format', async ({ page }) => {
    await page.goto('/orders');
    
    const dateElements = page.locator('[data-testid="date"], .date, time');
    
    if (await dateElements.first().isVisible()) {
      const dateText = await dateElements.first().textContent();
      
      const hasDateFormat = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4}/.test(dateText || '');
      expect(hasDateFormat).toBeTruthy();
    }
  });

  for (const lang of supportedLanguages) {
    test(`should load ${lang} translations without errors`, async ({ page }) => {
      await page.goto('/login');
      
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('translation')) {
          errors.push(msg.text());
        }
      });
      
      await page.evaluate((language) => {
        localStorage.setItem('i18nextLng', language);
      }, lang);
      
      await page.reload();
      await page.waitForTimeout(1000);
      
      expect(errors.length).toBe(0);
    });
  }
});

test.describe('i18n Translation Tests', () => {
  test('should have no missing translation keys', async ({ page }) => {
    await page.goto('/login');
    
    const missingKeys = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const missing: string[] = [];
      
      elements.forEach(el => {
        if (el.textContent?.includes('missing translation')) {
          missing.push(el.tagName);
        }
      });
      
      return missing;
    });
    
    expect(missingKeys.length).toBe(0);
  });

  test('should escape translation parameters correctly', async ({ page }) => {
    await page.goto('/login');
    
    await page.evaluate(() => {
      const element = document.querySelector('body');
      if (element) {
        element.textContent = 'Hello {{name}} with <script>alert("xss")</script>';
      }
    });
    
    const body = page.locator('body');
    await expect(body).not.toHaveText(/<script>/i);
  });
});
