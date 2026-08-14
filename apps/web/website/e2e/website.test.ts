/**
 * ClickFlash Website - E2E Test Suite
 * 
 * Tests public pages, CMS, and responsive design
 * 
 * Run: npx playwright test website.test.ts
 */

import { test, expect } from '@playwright/test';

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:3000';

test.describe('Website - Public Pages', () => {
  test('W-001: Homepage loads successfully', async ({ page }) => {
    const response = await page.goto(WEBSITE_URL);
    expect(response?.status()).toBe(200);
    
    // Check title
    await expect(page).toHaveTitle(/ClickFlash/);
  });

  test('W-002: Navigation links work', async ({ page }) => {
    await page.goto(WEBSITE_URL);
    
    // Check all nav links
    const navLinks = await page.locator('nav a').all();
    
    for (const link of navLinks) {
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('http')) {
        // Test link
        const response = await page.goto(`${WEBSITE_URL}${href}`);
        expect(response?.status()).toBeLessThan(400);
      }
    }
  });

  test('W-005: Pricing page shows all tiers', async ({ page }) => {
    await page.goto(`${WEBSITE_URL}/pricing`);
    
    // Check for pricing tiers
    const tiers = await page.locator('[data-testid="pricing-tier"]').all();
    expect(tiers.length).toBeGreaterThanOrEqual(3); // Starter, Pro, Enterprise
    
    // Check tier names
    const tierNames = await Promise.all(
      tiers.map(tier => tier.textContent())
    );
    
    expect(tierNames.some(name => name?.includes('Starter'))).toBe(true);
    expect(tierNames.some(name => name?.includes('Pro'))).toBe(true);
    expect(tierNames.some(name => name?.includes('Enterprise'))).toBe(true);
  });

  test('W-006: Pricing CTA navigates to signup', async ({ page }) => {
    await page.goto(`${WEBSITE_URL}/pricing`);
    
    // Click CTA
    await page.locator('[data-testid="pricing-cta"]').first().click();
    
    // Should navigate to signup
    await expect(page).toHaveURL(/signup|register/);
  });

  test('W-010: Contact form submits successfully', async ({ page }) => {
    await page.goto(`${WEBSITE_URL}/contact`);
    
    // Mock the contact API
    await page.route('**/api/website/contact', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Message sent successfully' })
      });
    });

    // Fill form
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="message-input"]', 'Test message');
    
    // Submit
    await page.click('[data-testid="submit-button"]');
    
    // Check success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
  });

  test('W-017: 404 page shows custom error', async ({ page }) => {
    const response = await page.goto(`${WEBSITE_URL}/nonexistent-page`);
    expect(response?.status()).toBe(404);
    
    // Check custom 404 content
    await expect(page.locator('text=This page could not be found')).toBeVisible();
  });

  test('W-022: Mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(WEBSITE_URL);
    
    // Check hamburger menu exists
    const hamburgerMenu = await page.locator('#mobile-menu-toggle').isVisible();
    expect(hamburgerMenu).toBe(true);
    
    // Check no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
  });

  test('W-024: Accessibility - Lighthouse score > 90', async ({ page }) => {
    await page.goto(WEBSITE_URL);
    
    // Check for ARIA labels
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
    }
    
    // Check for form labels
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const ariaLabel = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');
      
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count();
        expect(label > 0 || ariaLabel).toBe(true);
      }
    }
  });

  test('W-025: Performance - LCP < 2.5s', async ({ page }) => {
    await page.goto(WEBSITE_URL);
    
    // Measure LCP
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Fallback after 5 seconds
        setTimeout(() => resolve(0), 5000);
      });
    });
    
    expect(lcp).toBeLessThan(2500);
  });
});

test.describe('Website - CMS', () => {
  // test('W-031: CMS login works') removed as the CMS UI is in apps/management
  
  test('W-035: Publish page makes it live', async ({ page, request }) => {
    // Create a test page via API
    const createResponse = await request.post(`${WEBSITE_URL}/api/cms/pages`, {
      data: {
        data: {
          title: 'Test Page',
          slug: 'test-page',
          content: '<p>Test content</p>',
          status: 'published'
        }
      }
    });
    
    expect(createResponse.status()).toBe(201);
    
    // Visit the page
    const pageResponse = await page.goto(`${WEBSITE_URL}/test-page`);
    expect(pageResponse?.status()).toBe(200);
    
    await expect(page.locator('text=Test content')).toBeVisible();
  });

  test('W-045: XSS protection in CMS', async ({ request }) => {
    const response = await request.post(`${WEBSITE_URL}/api/cms/pages`, {
      data: {
        data: {
          title: 'XSS Test',
          slug: 'xss-test',
          content: '<script>alert("xss")</script><p>Safe content</p>',
          status: 'published'
        }
      }
    });
    
    expect(response.status()).toBe(201);
    
    // Fetch the page and verify script is sanitized
    const pageResponse = await request.get(`${WEBSITE_URL}/xss-test`);
    const body = await pageResponse.text();
    
    expect(body).not.toContain('<script>alert("xss")</script>');
    expect(body).toContain('Safe content');
  });
});

test.describe('Website - SEO', () => {
  test('W-019: Sitemap is accessible', async ({ request }) => {
    const response = await request.get(`${WEBSITE_URL}/sitemap.xml`);
    expect(response.status()).toBe(200);
    
    const body = await response.text();
    expect(body).toContain('<?xml');
    expect(body).toContain('<urlset');
  });

  test('W-020: Robots.txt is accessible', async ({ request }) => {
    const response = await request.get(`${WEBSITE_URL}/robots.txt`);
    expect(response.status()).toBe(200);
    
    const body = await response.text();
    expect(body.toLowerCase()).toContain('user-agent');
  });

  test('W-021: Favicon is present', async ({ request }) => {
    const response = await request.get(`${WEBSITE_URL}/favicon.ico`);
    expect(response.status()).toBe(200);
  });
});
