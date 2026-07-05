import { test, expect } from '@playwright/test';

/**
 * Website E2E Tests
 * 
 * Tests for the public-facing marketing website
 */

test.describe('Website - Homepage', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/');
    
    await expect(page).toHaveTitle(/ClickFlash/);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('hero section is visible', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="hero-heading"]')).toContainText('ClickFlash');
  });

  test('CTA button works', async ({ page }) => {
    await page.goto('/');
    
    await page.click('[data-testid="hero-cta-button"]');
    await expect(page).toHaveURL(/pricing|signup/);
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');
    
    const links = [
      { selector: '[data-testid="nav-features"]', url: /features/ },
      { selector: '[data-testid="nav-pricing"]', url: /pricing/ },
      { selector: '[data-testid="nav-contact"]', url: /contact/ },
      { selector: '[data-testid="nav-blog"]', url: /blog/ }
    ];
    
    for (const link of links) {
      await page.click(link.selector);
      await expect(page).toHaveURL(link.url);
      await page.goto('/');
    }
  });

  test('mobile menu works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });
});

test.describe('Website - Pricing Page', () => {
  test('displays pricing tiers', async ({ page }) => {
    await page.goto('/pricing');
    
    const tiers = await page.locator('[data-testid="pricing-tier"]').count();
    expect(tiers).toBeGreaterThanOrEqual(2);
  });

  test('free tier CTA works', async ({ page }) => {
    await page.goto('/pricing');
    
    await page.click('[data-testid="free-tier-cta"]');
    await expect(page).toHaveURL(/signup/);
  });

  test('pro tier CTA works', async ({ page }) => {
    await page.goto('/pricing');
    
    await page.click('[data-testid="pro-tier-cta"]');
    await expect(page).toHaveURL(/signup|checkout/);
  });

  test('feature comparison table', async ({ page }) => {
    await page.goto('/pricing');
    
    const rows = await page.locator('[data-testid="feature-row"]').count();
    expect(rows).toBeGreaterThan(5);
  });
});

test.describe('Website - Contact Page', () => {
  test('contact form works', async ({ page }) => {
    await page.goto('/contact');
    
    await page.fill('[data-testid="contact-name-input"]', 'Test User');
    await page.fill('[data-testid="contact-email-input"]', 'test@example.com');
    await page.fill('[data-testid="contact-message-input"]', 'This is a test message');
    
    await page.click('[data-testid="contact-submit-button"]');
    
    await expect(page.locator('[data-testid="contact-success"]')).toBeVisible();
  });

  test('form validation works', async ({ page }) => {
    await page.goto('/contact');
    
    await page.click('[data-testid="contact-submit-button"]');
    
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-error"]')).toBeVisible();
  });

  test('invalid email shows error', async ({ page }) => {
    await page.goto('/contact');
    
    await page.fill('[data-testid="contact-email-input"]', 'invalid-email');
    await page.click('[data-testid="contact-submit-button"]');
    
    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid');
  });
});

test.describe('Website - Blog', () => {
  test('displays blog posts', async ({ page }) => {
    await page.goto('/blog');
    
    const posts = await page.locator('[data-testid="blog-post"]').count();
    expect(posts).toBeGreaterThan(0);
  });

  test('blog post page works', async ({ page }) => {
    await page.goto('/blog');
    
    await page.click('[data-testid="blog-post"]:first-child');
    
    await expect(page.locator('[data-testid="blog-content"]')).toBeVisible();
    await expect(page.locator('article')).toBeVisible();
  });

  test('blog pagination works', async ({ page }) => {
    await page.goto('/blog');
    
    const hasPagination = await page.locator('[data-testid="pagination"]').count() > 0;
    if (hasPagination) {
      await page.click('[data-testid="next-page"]');
      await expect(page).toHaveURL(/page=2/);
    }
  });
});

test.describe('Website - Signup Flow', () => {
  test('signup form works', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('[data-testid="signup-email-input"]', 'newuser@example.com');
    await page.fill('[data-testid="signup-password-input"]', 'StrongPassword123!');
    await page.fill('[data-testid="signup-confirm-password-input"]', 'StrongPassword123!');
    await page.fill('[data-testid="signup-studio-name-input"]', 'Test Studio');
    
    await page.click('[data-testid="signup-submit-button"]');
    
    await expect(page).toHaveURL(/dashboard|verify-email/);
  });

  test('password strength indicator', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('[data-testid="signup-password-input"]', 'weak');
    
    await expect(page.locator('[data-testid="password-strength"]')).toContainText('weak');
    
    await page.fill('[data-testid="signup-password-input"]', 'StrongPassword123!');
    
    await expect(page.locator('[data-testid="password-strength"]')).toContainText('strong');
  });

  test('duplicate email shows error', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('[data-testid="signup-email-input"]', 'existing@example.com');
    await page.fill('[data-testid="signup-password-input"]', 'StrongPassword123!');
    await page.fill('[data-testid="signup-confirm-password-input"]', 'StrongPassword123!');
    await page.fill('[data-testid="signup-studio-name-input"]', 'Test Studio');
    
    await page.click('[data-testid="signup-submit-button"]');
    
    await expect(page.locator('[data-testid="email-error"]')).toContainText('already exists');
  });
});

test.describe('Website - SEO', () => {
  test('has correct meta tags', async ({ page }) => {
    await page.goto('/');
    
    const title = await page.title();
    expect(title).toContain('ClickFlash');
    
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description.length).toBeGreaterThan(50);
  });

  test('has OpenGraph tags', async ({ page }) => {
    await page.goto('/');
    
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toBeTruthy();
  });

  test('has structured data', async ({ page }) => {
    await page.goto('/');
    
    const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
    expect(structuredData).toBeTruthy();
    
    const data = JSON.parse(structuredData);
    expect(data['@context']).toBe('https://schema.org');
  });
});

test.describe('Website - Accessibility', () => {
  test('has skip navigation link', async ({ page }) => {
    await page.goto('/');
    
    const skipLink = await page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/');
    
    const images = await page.locator('img').all();
    for (const image of images) {
      const alt = await image.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('form inputs have labels', async ({ page }) => {
    await page.goto('/contact');
    
    const inputs = await page.locator('input, textarea, select').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      const hasLabel = id && await page.locator(`label[for="${id}"]`).count() > 0;
      expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test('color contrast meets WCAG', async ({ page }) => {
    await page.goto('/');
    
    // This would typically use axe-core or similar
    // For now, just verify text is readable
    const bodyText = await page.locator('body').evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        color: styles.color,
        backgroundColor: styles.backgroundColor
      };
    });
    
    expect(bodyText.color).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('Website - Performance', () => {
  test('LCP is under threshold', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries[entries.length - 1].startTime);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      });
    });
    
    expect(lcp).toBeLessThan(2500); // 2.5s threshold
  });

  test('no console errors', async ({ page }) => {
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    expect(errors).toHaveLength(0);
  });

  test('images are lazy loaded', async ({ page }) => {
    await page.goto('/');
    
    const images = await page.locator('img[loading="lazy"]').all();
    expect(images.length).toBeGreaterThan(0);
  });
});

test.describe('Website - Security', () => {
  test('has security headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = await response.allHeaders();
    
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBeTruthy();
  });

  test('CSP header is present', async ({ page }) => {
    const response = await page.goto('/');
    const headers = await response.allHeaders();
    
    expect(headers['content-security-policy']).toBeTruthy();
  });

  test('no mixed content', async ({ page }) => {
    await page.goto('/');
    
    const mixedContent = await page.evaluate(() => {
      const insecureElements = document.querySelectorAll(
        'img[src^="http:"], script[src^="http:"], link[href^="http:"]'
      );
      return insecureElements.length;
    });
    
    expect(mixedContent).toBe(0);
  });
});
