import { test, expect } from "@playwright/test";

test("debug page state", async ({ page }) => {
  page.on("console", (msg) => console.log("[CONSOLE]", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("[PAGEERROR]", err.message));
  page.on("request", (req) => {
    if (req.url().includes("/api/")) {
      console.log("[REQUEST]", req.method(), req.url());
    }
  });
  page.on("response", (res) => {
    if (res.url().includes("/api/")) {
      console.log("[RESPONSE]", res.status(), res.url());
    }
  });
  await page.goto("/", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(5000);
  await expect(page.getByRole("heading", { name: "Welcome", exact: true })).toBeVisible({ timeout: 10000 });
});
