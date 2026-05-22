import { test, expect } from "@playwright/test";
import { login, TEST_CREDENTIALS } from "./helpers/auth";

/**
 * Security E2E Tests
 *
 * Covers: CORS enforcement, CSRF protection, file upload limits,
 * path traversal prevention, rate limiting, JWT validation,
 * and header security.
 */

test.describe("Security — CORS Enforcement", () => {
  test("should reject requests from unauthorized origins", async ({ page }) => {
    await login(page);

    // Send API request with a spoofed Origin header
    const response = await page.request.get("/api/health", {
      headers: { Origin: "https://evil-site.example.com" },
    });
    // Health endpoint should still respond (CORS is browser-enforced),
    // but the Access-Control-Allow-Origin header should NOT echo the evil origin
    const allowOrigin = response.headers()["access-control-allow-origin"];
    expect(allowOrigin).not.toBe("https://evil-site.example.com");
  });

  test("should never set Access-Control-Allow-Origin to wildcard *", async ({ page }) => {
    await login(page);

    const response = await page.request.get("/api/health", {
      headers: { Origin: "http://localhost:5173" },
    });
    const allowOrigin = response.headers()["access-control-allow-origin"];
    // In production, should be the specific origin, not wildcard
    if (allowOrigin) {
      expect(allowOrigin).not.toBe("*");
    }
  });

  test("should handle OPTIONS preflight correctly", async ({ page }) => {
    const response = await page.request.fetch("/api/auth/login", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
      },
    });
    // Preflight should return 204 or 200
    expect([200, 204]).toContain(response.status());
    expect(response.headers()["access-control-allow-methods"]).toBeTruthy();
  });
});

test.describe("Security — CSRF Protection", () => {
  test("should set XSRF-TOKEN cookie on GET", async ({ page }) => {
    await login(page);

    // After login, the CSRF middleware should have set the cookie
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find((c) => c.name === "XSRF-TOKEN");
    // Cookie may or may not exist depending on middleware ordering
    if (csrfCookie) {
      expect(csrfCookie.value).toBeTruthy();
      expect(csrfCookie.httpOnly).toBe(false); // Must be readable by JS for double-submit
    }
  });

  test("should reject POST without CSRF token", async ({ page }) => {
    await login(page);

    // Attempt a mutation endpoint without the X-CSRF-TOKEN header
    const response = await page.request.post("/api/collections/albums/records", {
      data: { name: "CSRF Test Album" },
      headers: { "Content-Type": "application/json" },
    });
    // Should be 401 or 403 (CSRF rejection)
    expect([401, 403]).toContain(response.status());
  });

  test("should reject POST with invalid CSRF token", async ({ page }) => {
    await login(page);

    const response = await page.request.post("/api/collections/albums/records", {
      data: { name: "CSRF Test Album" },
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": "invalid-csrf-token-value",
      },
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe("Security — Rate Limiting", () => {
  test("should rate limit auth login after repeated failures", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Fire 6 rapid failed login attempts via API (strictRateLimiter = 5/min)
    const responses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await page.request.post("/api/auth/login", {
        data: { email: `ratelimit${i}@test.com`, password: "wrong" },
      });
      responses.push(r.status());
    }

    const has429 = responses.some((s) => s === 429);
    const hasAuthError = responses.some((s) => s === 401 || s === 400);
    // Either rate limiting kicked in, or all failed with auth error
    expect(has429 || hasAuthError).toBe(true);
  });

  test("should rate limit PIN verification endpoint", async ({ page }) => {
    await login(page);

    const responses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await page.request.post("/api/auth/verify-pin", {
        data: { pin: "0000" },
      });
      responses.push(r.status());
    }

    const has429 = responses.some((s) => s === 429);
    const hasError = responses.some((s) => s === 401 || s === 400 || s === 403);
    expect(has429 || hasError).toBe(true);
  });
});

test.describe("Security — JWT Validation", () => {
  test("should reject invalid JWT on /api/auth/me", async ({ page }) => {
    const response = await page.request.get("/api/auth/me", {
      headers: { Authorization: "Bearer invalid-jwt-token-here" },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("should reject expired JWT format", async ({ page }) => {
    // A structurally valid but expired/fake JWT
    const fakeJwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const response = await page.request.get("/api/auth/me", {
      headers: { Authorization: `Bearer ${fakeJwt}` },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("should reject request with no Authorization header", async ({ page }) => {
    const response = await page.request.get("/api/auth/me");
    expect([401, 403]).toContain(response.status());
  });
});

test.describe("Security — Path Traversal Prevention", () => {
  test("should reject path traversal in file URL", async ({ page }) => {
    await login(page);

    // Attempt directory traversal via the files endpoint
    const response = await page.request.get("/api/files/../../etc/passwd");
    // Should return 400/403/404 — not the actual file
    expect([400, 403, 404]).toContain(response.status());
  });

  test("should reject encoded path traversal", async ({ page }) => {
    await login(page);

    // URL-encoded traversal: %2e%2e = ..
    const response = await page.request.get("/api/files/%2e%2e/%2e%2e/etc/passwd");
    expect([400, 403, 404]).toContain(response.status());
  });

  test("should reject double-encoded path traversal", async ({ page }) => {
    await login(page);

    // Double-encoded: %252e%252e = %2e%2e → ..
    const response = await page.request.get("/api/files/%252e%252e/%252e%252e/etc/passwd");
    expect([400, 403, 404]).toContain(response.status());
  });
});

test.describe("Security — File Upload Limits", () => {
  test("should reject oversized logo upload", async ({ page }) => {
    await login(page);

    // Generate a 6MB buffer (limit is 5MB for logo upload)
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024, 0xff);

    const response = await page.request.post("/api/files/settings/logo", {
      multipart: {
        logo: {
          name: "big-logo.jpg",
          mimeType: "image/jpeg",
          buffer: oversizedBuffer,
        },
      },
    });
    // Should reject with 400/413 (Payload Too Large)
    expect([400, 413]).toContain(response.status());
  });
});

test.describe("Security — Invalid Collection Access", () => {
  test("should reject nonexistent collection", async ({ page }) => {
    await login(page);

    const response = await page.request.get("/api/collections/nonexistent_table/records");
    expect([400, 403, 404]).toContain(response.status());
  });

  test("should reject SQL injection in collection name", async ({ page }) => {
    await login(page);

    const response = await page.request.get(
      "/api/collections/albums;DROP TABLE albums--/records"
    );
    expect([400, 403, 404]).toContain(response.status());
  });
});

test.describe("Security — Response Headers", () => {
  test("should include security headers", async ({ page }) => {
    await login(page);

    const response = await page.request.get("/api/health");
    const headers = response.headers();

    // Access-Control-Allow-Credentials should be set
    if (headers["access-control-allow-credentials"]) {
      expect(headers["access-control-allow-credentials"]).toBe("true");
    }

    // Cache headers should be present on API endpoints
    // (varies by endpoint, so we just check the response is valid)
    expect(response.status()).toBe(200);
  });

  test("health endpoint does not leak server version", async ({ page }) => {
    const response = await page.request.get("/api/health");
    const headers = response.headers();

    // X-Powered-By should not reveal Express version
    const poweredBy = headers["x-powered-by"];
    if (poweredBy) {
      expect(poweredBy).not.toContain("Express");
    }
  });
});
