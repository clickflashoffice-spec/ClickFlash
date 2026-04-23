import { test, expect } from '@playwright/test';

test.describe('Contact Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('should submit contact form successfully', async ({ page }) => {
    await page.fill('[data-testid="name-input"]', 'John Doe');
    await page.fill('[data-testid="email-input"]', 'john@example.com');
    await page.fill('[data-testid="subject-input"]', 'General Inquiry');
    await page.fill('[data-testid="message-input"]', 'This is a test message for the contact form.');

    await page.click('[data-testid="submit-button"]');

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Thank you');
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('[data-testid="submit-button"]');

    await expect(page.locator('[data-testid="name-error"]')).toContainText('required');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('required');
    await expect(page.locator('[data-testid="message-error"]')).toContainText('required');
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="name-input"]', 'John');
    await page.click('[data-testid="submit-button"]');

    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');
  });

  test('should disable submit while processing', async ({ page }) => {
    await page.fill('[data-testid="name-input"]', 'John Doe');
    await page.fill('[data-testid="email-input"]', 'john@example.com');
    await page.fill('[data-testid="message-input"]', 'Test message');

    await page.click('[data-testid="submit-button"]');
    
    // Button should be disabled during submission
    await expect(page.locator('[data-testid="submit-button"]')).toBeDisabled();
  });
});

test.describe('Demo Request Form', () => {
  test('should submit demo request', async ({ page }) => {
    await page.goto('/demo');

    await page.fill('[data-testid="company-input"]', 'Test Studio');
    await page.fill('[data-testid="name-input"]', 'Jane Smith');
    await page.fill('[data-testid="email-input"]', 'jane@teststudio.com');
    await page.fill('[data-testid="phone-input"]', '555-1234');
    await page.selectOption('[data-testid="studio-size-select"]', 'small');

    await page.click('[data-testid="submit-demo-button"]');

    await expect(page.locator('[data-testid="demo-request-success"]')).toBeVisible();
  });
});
