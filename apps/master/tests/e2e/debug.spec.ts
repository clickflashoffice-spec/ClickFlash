import { test, expect } from "@playwright/test";

test("debug page load", async ({ page }) => {
  // Try to navigate without waiting for any event
  const response = await page.goto("http://127.0.0.1:5174/login", {
    timeout: 30000,
    waitUntil: "commit", // Just wait for navigation to commit
  });

  console.log("Response status:", response?.status());
  console.log("Response URL:", response?.url());

  // Wait a bit for the page to load
  await page.waitForTimeout(2000);

  // Take a screenshot to see what's on the page
  await page.screenshot({
    path: "test-results/debug-screenshot.png",
    fullPage: true,
  });

  // Get page content
  const content = await page.content();
  console.log("Page content length:", content.length);
  console.log("Page content snippet:", content.substring(0, 1000));

  // Check page title
  const title = await page.title();
  console.log("Page title:", title);
});
