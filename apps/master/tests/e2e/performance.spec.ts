import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Performance Tests", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("homepage should load within 3 seconds", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test("should meet Web Vitals thresholds", async ({ page }) => {
    await page.goto("/");

    // Check LCP
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcpEntry = entries[entries.length - 1];
          resolve(lcpEntry.startTime);
        }).observe({ entryTypes: ["largest-contentful-paint"] });
      });
    });

    expect(lcp).toBeLessThan(2500); // LCP < 2.5s
  });

  test("album grid should render 50 items efficiently", async ({ page }) => {
    await page.goto("/albums");

    // Wait for grid to render
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="album-grid"]');
    const renderTime = Date.now() - startTime;

    expect(renderTime).toBeLessThan(1000);

    // Check that items are rendered
    const items = page.locator('[data-testid="album-item"]');
    await expect(items).toHaveCount.greaterThan(0);
  });

  test("photo upload should handle large files", async ({ page }) => {
    await page.goto("/albums/test-album");

    // Create a large file (5MB)
    const largeFile = {
      name: "large-photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(5 * 1024 * 1024),
    };

    const fileInput = page.locator('[data-testid="photo-upload-input"]');

    const startTime = Date.now();
    await fileInput.setInputFiles(largeFile);
    await page.waitForSelector('[data-testid="upload-complete"]', {
      timeout: 30000,
    });

    const uploadTime = Date.now() - startTime;
    expect(uploadTime).toBeLessThan(30000); // Should complete within 30s
  });
});
