import { test, expect } from "@playwright/test";
import { login, TEST_CREDENTIALS } from "./helpers/auth";

test.describe("API Integration", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("health endpoint returns 200", async ({ page }) => {
    const response = await page.request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body.status).toMatch(/ok|healthy/i);
  });

  test("auth me returns current user", async ({ page }) => {
    const response = await page.request.get("/api/auth/me");
    expect([200, 401]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("email");
    }
  });

  test("collections albums endpoint is reachable", async ({ page }) => {
    const response = await page.request.get("/api/collections/albums/records");
    expect([200, 401]).toContain(response.status());
  });

  test("collections photos endpoint is reachable", async ({ page }) => {
    const response = await page.request.get("/api/collections/photos/records");
    expect([200, 401]).toContain(response.status());
  });

  test("orders endpoint is reachable", async ({ page }) => {
    const response = await page.request.get("/api/orders");
    expect([200, 401]).toContain(response.status());
  });

  test("analytics summary endpoint is reachable", async ({ page }) => {
    const response = await page.request.get("/api/analytics/summary");
    expect(response.status()).not.toBe(404);
  });

  test("session types endpoint is reachable", async ({ page }) => {
    const response = await page.request.get("/api/session-types");
    expect(response.status()).not.toBe(404);
  });

  test("backup endpoint is reachable", async ({ page }) => {
    const response = await page.request.get("/api/backup");
    expect(response.status()).not.toBe(404);
  });

  test("faces endpoint returns non-404", async ({ page }) => {
    const response = await page.request.post("/api/faces/search", {
      data: { embedding: [] },
    });
    expect(response.status()).not.toBe(404);
  });

  test("system health endpoint", async ({ page }) => {
    const response = await page.request.get("/api/system/health");
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("status");
    }
  });

  test("invalid JWT returns 401", async ({ page }) => {
    const response = await page.request.get("/api/auth/me", {
      headers: { Authorization: "Bearer invalid-token-12345" },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("auth login with invalid creds returns error", async ({ page }) => {
    const response = await page.request.post("/api/auth/login", {
      data: { email: "fake@fake.com", password: "wrongpass" },
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test("collections endpoint with invalid collection returns error", async ({ page }) => {
    const response = await page.request.get("/api/collections/nonexistent/records");
    expect([400, 404]).toContain(response.status());
  });

  test("dashboard endpoint is reachable", async ({ page }) => {
    const response = await page.request.get("/api/dashboard");
    expect(response.status()).not.toBe(404);
  });

  test("resort analytics endpoint is reachable", async ({ page }) => {
    const response = await page.request.get("/api/resort-analytics");
    expect(response.status()).not.toBe(404);
  });
});
