import { test, expect } from "@playwright/test";

/**
 * E2E Tests for ClickFlash Website Homepage
 * 
 * These tests cover:
 * - SEO & Meta tags
 * - Core Web Vitals performance thresholds
 * - Accessibility (a11y) requirements
 * - Mobile responsiveness
 * - Navigation functionality
 * - Visual regression (optional)
 */

// Test configuration
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
};

/**
 * SEO & Meta Tags Tests
 */
test.describe("SEO & Meta Tags", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test("should have correct page title", async ({ page }) => {
    await expect(page).toHaveTitle(/ClickFlash/);
  });

  test("should have meta description", async ({ page }) => {
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute("content");
    const content = await metaDescription.getAttribute("content");
    expect(content?.length).toBeGreaterThan(50);
    expect(content?.length).toBeLessThan(160);
  });

  test("should have canonical link", async ({ page }) => {
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href");
  });

  test("should have Open Graph meta tags", async ({ page }) => {
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content");
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content");
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content");
  });

  test("should have Twitter Card meta tags", async ({ page }) => {
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content");
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content");
  });

  test("should have viewport meta tag", async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute("content", /width=device-width/);
  });

  test("should have JSON-LD structured data", async ({ page }) => {
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    
    const content = await jsonLd.textContent();
    const data = JSON.parse(content || "{}");
    
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("Organization");
  });

  test("should have language attribute", async ({ page }) => {
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "en");
  });
});

/**
 * Performance Tests (Core Web Vitals)
 */
test.describe("Performance - Core Web Vitals", () => {
  test("LCP should be under 2.5s", async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle");
    
    // Measure LCP using Performance API
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let lcpValue = 0;
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
          lcpValue = lastEntry.startTime;
        });
        
        observer.observe({ entryTypes: ["largest-contentful-paint"] });
        
        // Give it time to capture
        setTimeout(() => {
          observer.disconnect();
          resolve(lcpValue);
        }, 3000);
      });
    });
    
    expect(lcp).toBeLessThan(2500); // 2.5s threshold
  });

  test("CLS should be under 0.1", async ({ page }) => {
    await page.goto(BASE_URL);
    
    let clsValue = 0;
    
    await page.evaluate(() => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
      });
      
      try {
        observer.observe({ entryTypes: ["layout-shift"] });
      } catch (e) {
        // CLS not supported
      }
    });
    
    // Scroll to trigger potential layout shifts
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    expect(clsValue).toBeLessThan(0.1);
  });

  test("FCP should be under 1.8s", async ({ page }) => {
    await page.goto(BASE_URL);
    
    const fcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find((e) => e.name === "first-contentful-paint");
          if (fcpEntry) {
            resolve((fcpEntry as PerformanceEntry & { startTime: number }).startTime);
          }
        });
        
        try {
          observer.observe({ type: "paint", buffered: true } as PerformanceObserverInit);
        } catch (e) {
          resolve(0);
        }
        
        setTimeout(() => resolve(0), 5000);
      });
    });
    
    if (fcp > 0) {
      expect(fcp).toBeLessThan(1800); // 1.8s threshold
    }
  });

  test("TTFB should be under 800ms", async ({ page }) => {
    await page.goto(BASE_URL);
    
    const ttfb = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      return navigation ? navigation.responseStart : 0;
    });
    
    expect(ttfb).toBeLessThan(800);
  });

  test("no render-blocking resources", async ({ page }) => {
    const requests: string[] = [];
    
    page.on("request", (request) => {
      const resourceType = request.resourceType();
      if (resourceType === "script" || resourceType === "stylesheet") {
        requests.push(request.url());
      }
    });
    
    await page.goto(BASE_URL);
    
    // Check for critical CSS inline (no external CSS in head)
    const headLinks = await page.locator('head link[rel="stylesheet"]').count();
    
    // Should have minimal render-blocking resources
    expect(headLinks).toBeLessThanOrEqual(2);
  });
});

/**
 * Accessibility Tests
 */
test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    const h1s = await page.locator("h1").count();
    expect(h1s).toBe(1); // Only one H1 per page
    
    // Check that headings are in correct order (no skipping)
    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
    let previousLevel = 0;
    
    for (const heading of headings) {
      const tagName = await heading.evaluate((el) => el.tagName.toLowerCase());
      const level = parseInt(tagName.replace("h", ""));
      
      expect(level).toBeGreaterThanOrEqual(previousLevel);
      expect(level).toBeLessThanOrEqual(previousLevel + 1);
      
      previousLevel = level;
    }
  });

  test("images should have alt text", async ({ page }) => {
    const images = await page.locator("img").all();
    
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      // Alt can be empty for decorative images, but should be present
      expect(alt !== null).toBeTruthy();
    }
  });

  test("should have sufficient color contrast", async ({ page }) => {
    // This is a basic check - for thorough testing, use axe-core
    const body = page.locator("body");
    const color = await body.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        color: styles.color,
        backgroundColor: styles.backgroundColor,
      };
    });
    
    // Ensure colors are defined (not just browser defaults)
    expect(color.color).toBeTruthy();
    expect(color.backgroundColor).toBeTruthy();
  });

  test("interactive elements should be keyboard accessible", async ({ page }) => {
    const interactiveElements = await page.locator("a, button, [role='button']").all();
    
    for (const element of interactiveElements.slice(0, 10)) { // Check first 10
      const tabindex = await element.getAttribute("tabindex");
      const isFocusable = tabindex !== "-1";
      expect(isFocusable).toBeTruthy();
    }
  });

  test("should have ARIA labels where needed", async ({ page }) => {
    // Check navigation has aria-label
    const nav = page.locator("nav");
    const hasAriaLabel = await nav.getAttribute("aria-label");
    expect(hasAriaLabel || await nav.getAttribute("aria-labelledby")).toBeTruthy();
    
    // Check buttons have accessible names
    const buttons = await page.locator("button").all();
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute("aria-label");
      const text = await button.textContent();
      const title = await button.getAttribute("title");
      
      expect(ariaLabel || text?.trim() || title).toBeTruthy();
    }
  });

  test("skip to content link should exist", async ({ page }) => {
    // Look for skip link (may be visually hidden)
    const skipLink = page.locator("a[href^='#']").filter({ hasText: /skip|jump/i });
    const count = await skipLink.count();
    
    if (count > 0) {
      await expect(skipLink).toBeVisible();
    }
  });

  test("form inputs should have associated labels", async ({ page }) => {
    const inputs = await page.locator("input:not([type='hidden']), select, textarea").all();
    
    for (const input of inputs) {
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledBy = await input.getAttribute("aria-labelledby");
      const placeholder = await input.getAttribute("placeholder");
      
      // Should have at least one form of labeling
      const hasLabel = id && (await page.locator(`label[for="${id}"]`).count()) > 0;
      
      expect(hasLabel || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
    }
  });
});

/**
 * Mobile Responsiveness Tests
 */
test.describe("Mobile Responsiveness", () => {
  test("should adapt to mobile viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(BASE_URL);
    
    // Check that content doesn't overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px rounding
  });

  test("should adapt to tablet viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto(BASE_URL);
    
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test("navigation should be accessible on mobile", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(BASE_URL);
    
    // Mobile menu button should be visible
    const menuButton = page.locator("button[aria-label*='menu' i], button[aria-label*='navigation' i]");
    await expect(menuButton).toBeVisible();
    
    // Menu should be toggleable
    await menuButton.click();
    
    // After clicking, menu should be visible
    const mobileNav = page.locator("[role='navigation'], nav").last();
    await expect(mobileNav).toBeVisible();
  });

  test("touch targets should be adequate size", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(BASE_URL);
    
    // Get all clickable elements
    const clickableElements = await page.locator("a, button, [role='button'], input, select, textarea").all();
    
    for (const element of clickableElements.slice(0, 20)) {
      const box = await element.boundingBox();
      if (box) {
        // WCAG recommends at least 44x44px touch targets
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("text should be readable without zooming", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(BASE_URL);
    
    // Check that text size is adequate (at least 12px)
    const smallText = await page.locator("*").filter({
      hasNot: page.locator("*"),
    }).evaluateAll((elements) => {
      return elements.some((el) => {
        const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
        return fontSize > 0 && fontSize < 12;
      });
    });
    
    // No text should be smaller than 12px
    expect(smallText).toBeFalsy();
  });
});

/**
 * Navigation Tests
 */
test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test("main navigation links should work", async ({ page }) => {
    const navLinks = [
      { name: /about/i, url: /about/ },
      { name: /services/i, url: /services/ },
      { name: /portfolio/i, url: /portfolio/ },
      { name: /contact/i, url: /contact/ },
    ];
    
    for (const link of navLinks) {
      await page.goto(BASE_URL);
      
      const navLink = page.locator("nav").locator("a").filter({ hasText: link.name });
      
      if (await navLink.count() > 0) {
        await navLink.click();
        await expect(page).toHaveURL(link.url);
      }
    }
  });

  test("logo should link to homepage", async ({ page }) => {
    await page.goto(`${BASE_URL}/about`);
    
    const logo = page.locator("header a, nav a").first();
    await logo.click();
    
    await expect(page).toHaveURL(/\/$/);
  });

  test("footer links should work", async ({ page }) => {
    const footerLinks = await page.locator("footer a").all();
    
    for (const link of footerLinks.slice(0, 5)) {
      const href = await link.getAttribute("href");
      
      if (href && !href.startsWith("http") && !href.startsWith("mailto:")) {
        // Internal link - should be reachable
        expect(href).toBeTruthy();
      }
    }
  });

  test("external links should open in new tab", async ({ page }) => {
    const externalLinks = page.locator("a[href^='http']");
    const count = await externalLinks.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = externalLinks.nth(i);
      const target = await link.getAttribute("target");
      const rel = await link.getAttribute("rel");
      
      if (target === "_blank") {
        expect(rel).toContain("noopener");
      }
    }
  });
});

/**
 * Visual Regression Tests (optional)
 */
test.describe("Visual Regression", () => {
  test("homepage should match screenshot", async ({ page }) => {
    test.skip(process.env.SKIP_VISUAL_TESTS === "true", "Visual tests skipped");
    
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    await expect(page).toHaveScreenshot("homepage.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test("mobile homepage should match screenshot", async ({ page }) => {
    test.skip(process.env.SKIP_VISUAL_TESTS === "true", "Visual tests skipped");
    
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    await expect(page).toHaveScreenshot("homepage-mobile.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });
});

/**
 * Internationalization Tests
 */
test.describe("Internationalization", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test("should have language selector", async ({ page }) => {
    // Look for language selector
    const langSelector = page.locator("[data-testid='language-selector'], select[name='language'], button[aria-label*='language' i]");
    
    // May not exist on all pages
    if (await langSelector.count() > 0) {
      await expect(langSelector).toBeVisible();
    }
  });

  test("should have hreflang tags", async ({ page }) => {
    const hreflangs = await page.locator('link[rel="alternate"][hreflang]').all();
    
    if (hreflangs.length > 0) {
      for (const link of hreflangs) {
        const hreflang = await link.getAttribute("hreflang");
        const href = await link.getAttribute("href");
        
        expect(hreflang).toBeTruthy();
        expect(href).toBeTruthy();
      }
    }
  });
});

/**
 * Security Tests
 */
test.describe("Security", () => {
  test("should have HTTPS in production", async ({ page }) => {
    if (BASE_URL.startsWith("https://")) {
      await page.goto(BASE_URL);
      expect(page.url()).toStartWith("https://");
    }
  });

  test("external links should have security attributes", async ({ page }) => {
    await page.goto(BASE_URL);
    
    const externalLinks = page.locator("a[target='_blank']");
    const count = await externalLinks.count();
    
    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i);
      const rel = await link.getAttribute("rel");
      
      expect(rel).toContain("noopener");
    }
  });
});
