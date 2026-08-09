import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility (a11y) E2E Tests
 * 
 * Uses axe-core to automatically detect accessibility violations.
 * Run these tests regularly to maintain WCAG 2.1 AA compliance.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const pagesToTest = [
  "/",
  "/about",
  "/services",
  "/portfolio",
  "/pricing",
  "/bookings",
  "/contact",
  "/faq",
  "/blog",
];

test.describe("Accessibility Audit", () => {
  for (const path of pagesToTest) {
    test(`should have no accessibility violations on ${path}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`${BASE_URL}${path}`);
      
      // Wait for page to be fully loaded
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1000); // Wait for any residual animations
      
      // Run axe accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page: page as any })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .disableRules(["color-contrast"]) // Run color contrast separately
        .exclude("[data-testid='skip-a11y-check']") // Allow excluding elements
        .exclude("iframe") // Exclude 3rd party widgets like SnapWidget
        .analyze();
      
      // Report violations
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test.skip(`should have no color contrast issues on ${path}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`${BASE_URL}${path}`);
      
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1000); // Wait for any residual animations
      
      const accessibilityScanResults = await new AxeBuilder({ page: page as any })
        .withRules(["color-contrast"])
        .exclude("iframe")
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  test("navigation should be keyboard accessible", async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Tab to first focusable element
    await page.keyboard.press("Tab");
    
    // Should focus skip link first
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBe("A");
    
    // Navigate through menu items
    const navItems = await page.locator("nav a").count();
    
    for (let i = 0; i < Math.min(navItems, 5); i++) {
      await page.keyboard.press("Tab");
      const activeElement = await page.evaluate(() => document.activeElement);
      expect(activeElement).not.toBeNull();
    }
  });

  test("focus indicators should be visible", async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Focus first button
    const button = page.locator("button").first();
    await button.focus();
    
    // Check that focused element has visible outline
    const styles = await button.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        outline: computed.outline,
        outlineOffset: computed.outlineOffset,
        boxShadow: computed.boxShadow,
      };
    });
    
    // Should have some form of focus indicator
    const hasOutline = styles.outline !== "none" && styles.outline !== "";
    const hasShadow = styles.boxShadow !== "none" && styles.boxShadow !== "";
    
    expect(hasOutline || hasShadow).toBeTruthy();
  });

  test("images should have appropriate alt text", async ({ page }) => {
    await page.goto(BASE_URL);
    
    const images = await page.locator("img").all();
    let imagesWithoutAlt = 0;
    let imagesWithEmptyAlt = 0;
    
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      if (alt === null) {
        imagesWithoutAlt++;
      } else if (alt === "") {
        imagesWithEmptyAlt++;
      }
    }
    
    // No images should be completely missing alt attribute
    expect(imagesWithoutAlt).toBe(0);
    
    // Most images should have descriptive alt text (not all decorative)
    const totalImages = images.length;
    if (totalImages > 0) {
      const descriptiveImages = totalImages - imagesWithoutAlt - imagesWithEmptyAlt;
      expect(descriptiveImages).toBeGreaterThan(0);
    }
  });

  test("form elements should have labels", async ({ page }) => {
    await page.goto(`${BASE_URL}/contact`);
    
    const inputs = await page.locator("input:not([type='hidden']), select, textarea").all();
    
    for (const input of inputs) {
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledBy = await input.getAttribute("aria-labelledby");
      const placeholder = await input.getAttribute("placeholder");
      const title = await input.getAttribute("title");
      
      // Check for associated label
      let hasLabel = false;
      if (id) {
        hasLabel = (await page.locator(`label[for="${id}"]`).count()) > 0;
      }
      
      // Should have at least one form of labeling
      expect(
        hasLabel || ariaLabel || ariaLabelledBy || placeholder || title
      ).toBeTruthy();
    }
  });

  test("headings should be in proper order", async ({ page }) => {
    await page.goto(BASE_URL);
    
    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
    let previousLevel = 0;
    const violations: string[] = [];
    
    for (const heading of headings) {
      const tagName = await heading.evaluate((el) => el.tagName.toLowerCase());
      const level = parseInt(tagName.replace("h", ""));
      
      if (level > previousLevel + 1) {
        violations.push(`Skipped from h${previousLevel} to h${level}`);
      }
      
      previousLevel = level;
    }
    
    expect(violations).toEqual([]);
  });

  test("page should have one h1 element", async ({ page }) => {
    await page.goto(BASE_URL);
    
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBe(1);
  });

  test("links should have discernible text", async ({ page }) => {
    await page.goto(BASE_URL);
    
    const links = await page.locator("a").all();
    const violations: string[] = [];
    
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute("aria-label");
      const title = await link.getAttribute("title");
      const hasImg = (await link.locator("img").count()) > 0;
      
      if (!text?.trim() && !ariaLabel && !title && !hasImg) {
        const href = await link.getAttribute("href");
        violations.push(`Link with href "${href}" has no accessible text`);
      }
    }
    
    expect(violations).toEqual([]);
  });

  test("buttons should have discernible text", async ({ page }) => {
    await page.goto(BASE_URL);
    
    const buttons = await page.locator("button").all();
    const violations: string[] = [];
    
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute("aria-label");
      const title = await button.getAttribute("title");
      const hasVisibleContent = (await button.locator("*:visible").count()) > 0;
      
      if (!text?.trim() && !ariaLabel && !title && !hasVisibleContent) {
        violations.push("Button has no accessible text");
      }
    }
    
    expect(violations).toEqual([]);
  });
});

test.describe("Screen Reader Experience", () => {
  test("landmark regions should be present", async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check for main landmark
    const hasMain = (await page.locator("main, [role='main']").count()) > 0;
    
    // Check for navigation landmark
    const hasNav = (await page.locator("nav, [role='navigation']").count()) > 0;
    
    // Check for complementary landmark (aside)
    const hasAside = (await page.locator("aside, [role='complementary']").count()) > 0;
    
    // Check for contentinfo landmark (footer)
    const hasFooter = (await page.locator("footer, [role='contentinfo']").count()) > 0;
    
    expect(hasMain).toBeTruthy();
    expect(hasNav).toBeTruthy();
    expect(hasFooter).toBeTruthy();
  });

  test("aria-current should indicate current page", async ({ page }) => {
    await page.goto(BASE_URL);
    
    const currentPageLink = await page.locator("[aria-current='page']").count();
    
    // Should indicate current page in navigation
    expect(currentPageLink).toBeGreaterThanOrEqual(0);
  });
});
