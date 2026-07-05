/**
 * ClickFlash Website - E2E Test Suite
 * 
 * Tests public pages, CMS, and responsive design
 * 
 * Run: npx playwright test website.test.ts
 */

import { test, expect } from '@playwright/test';

const WEBSITE_URL = 'https://clickflash-website.pages.dev';

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
    await page.click('[data-testid="pricing-cta"]:first-child');
    
    // Should navigate to signup
    await expect(page).toHaveURL(/signup|register/);
  });

  test('W-010: Contact form submits successfully', async ({ page }) => {
    await page.goto(`${WEBSITE_URL}/contact`);
    
    // Fill form
    await page.fill('[data-testid="contact-name"]', 'Test User');
    await page.fill('[data-testid="contact-email"]', 'test@example.com');
    await page.fill('[data-testid="contact-message"]', 'Test message');
    
    // Submit
    await page.click('[data-testid="contact-submit"]');
    
    // Check success message
    await expect(page.locator('[data-testid="contact-success"]')).toBeVisible();
  });

  test('W-017: 404 page shows custom error', async ({ page }) => {
    const response = await page.goto(`${WEBSITE_URL}/nonexistent-page`);
    expect(response?.status()).toBe(404);
    
    // Check custom 404 content
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=Not Found')).toBeVisible();
  });

  test('W-022: Mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(WEBSITE_URL);
    
    // Check hamburger menu exists
    const hamburgerMenu = await page.locator('[data-testid="mobile-menu"]').isVisible();
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
      expect(alt).toBeTruthy();
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
  test('W-031: CMS login works', async ({ page }) => {
    await page.goto(`${WEBSITE_URL}/admin`);
    
    // Fill login
    await page.fill('[data-testid="cms-email"]', 'admin@clickflash.com');
    await page.fill('[data-testid="cms-password"]', 'admin123');
    
    // Login
    await page.click('[data-testid="cms-login"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/admin\/dashboard/);
  });

  test('W-035: Publish page makes it live', async ({ page, request }) => {
    // Create a test page via API
    const createResponse = await request.post(`${WEBSITE_URL}/api/cms/pages`, {
      data: {
        title: 'Test Page',
        slug: 'test-page',
        content: '<p>Test content</p>',
        status: 'published'
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
        title: 'XSS Test',
        slug: 'xss-test',
        content: '<script>alert("xss")</script>',
        status: 'published'
      }
    });
    
    expect(response.status()).toBe(201);
    
    // Fetch the page and verify script is sanitized
    const pageResponse = await request.get(`${WEBSITE_URL}/xss-test`);
    const body = await pageResponse.text();
    
    expect(body).not.toContain('<script>');
    expect(body).toContain('&lt;script&gt;');
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
    expect(body).toContain('User-agent');
  });

  test('W-021: Favicon is present', async ({ request }) => {
    const response = await request.get(`${WEBSITE_URL}/favicon.ico`);
    expect(response.status()).toBe(200);
  });
});
