import { test, expect } from "@playwright/test";

/**
 * End-to-end API tests for the Customer Gallery Stripe checkout routes.
 *
 * These tests exercise the live Cloudflare Worker backend. Set
 * GALLERY_BACKEND_URL to point at a running wrangler dev server or
 * deployed Worker. By default they target http://localhost:8787.
 *
 * Tests that require a real Stripe secret key are skipped when
 * STRIPE_SECRET_KEY is not provided.
 */

const baseURL = process.env.GALLERY_BACKEND_URL || "http://localhost:8787";
const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;

test.describe("Gallery payment API", () => {
  test("POST /api/payments/create-intent returns 503 when Stripe is not configured", async ({ request }) => {
    const response = await request.post(`${baseURL}/api/payments/create-intent`, {
      data: { orderId: "ord-e2e-1", amount: 1000, currency: "eur" },
    });
    expect(response.status()).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("Stripe not configured");
  });

  test("POST /api/payments/create-intent validates the request body", async ({ request }) => {
    const response = await request.post(`${baseURL}/api/payments/create-intent`, {
      data: { amount: -100 },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("POST /api/payments/create-session validates the request body", async ({ request }) => {
    const response = await request.post(`${baseURL}/api/payments/create-session`, {
      data: { currency: "INVALID" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("GET /api/payments/methods requires customerId", async ({ request }) => {
    const response = await request.get(`${baseURL}/api/payments/methods`);
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("POST /api/payments/create-intent creates a PaymentIntent when Stripe is configured", async ({ request }) => {
    test.skip(!hasStripeKey, "Requires STRIPE_SECRET_KEY");

    const response = await request.post(`${baseURL}/api/payments/create-intent`, {
      data: { orderId: `ord-e2e-${Date.now()}`, amount: 1000, currency: "eur", email: "test@clickflash.com" },
      headers: { "Idempotency-Key": `idem-${Date.now()}` },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.clientSecret).toBeDefined();
    expect(body.clientSecret).toContain("_secret_");
    expect(body.paymentIntentId).toMatch(/^pi_/);
  });

  test("POST /api/payments/create-session creates a Checkout Session when Stripe is configured", async ({ request }) => {
    test.skip(!hasStripeKey, "Requires STRIPE_SECRET_KEY");

    const response = await request.post(`${baseURL}/api/payments/create-session`, {
      data: { amount: 2000, currency: "usd", email: "test@clickflash.com", metadata: { albumId: "alb-1" } },
      headers: { "Idempotency-Key": `idem-${Date.now()}` },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.id).toMatch(/^cs_/);
    expect(body.url).toContain("checkout.stripe.com");
    expect(body.paymentIntentId).toMatch(/^pi_/);
  });
});
