import { jest } from "@jest/globals";
import { handlePayments } from "./payments.js";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

describe("handlePayments", () => {
  const env = { STRIPE_SECRET_KEY: "sk_test_xxx" };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 503 when Stripe is not configured", async () => {
    const request = new Request("http://localhost/api/payments/create-intent", {
      method: "POST",
      body: JSON.stringify({ orderId: "ord-1", amount: 1000 }),
    });
    const response = await handlePayments(request, {}, corsHeaders);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(503);
    const body = await response!.json() as any;
    expect(body.error).toBe("Stripe not configured");
  });

  it("returns 400 for invalid create-intent payload", async () => {
    const request = new Request("http://localhost/api/payments/create-intent", {
      method: "POST",
      body: JSON.stringify({ amount: -100 }),
    });
    const response = await handlePayments(request, env, corsHeaders);
    expect(response!.status).toBe(400);
  });

  it("creates a payment intent and returns clientSecret", async () => {
    const mockFetch = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "pi_123",
          client_secret: "pi_123_secret",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const request = new Request("http://localhost/api/payments/create-intent", {
      method: "POST",
      body: JSON.stringify({ orderId: "ord-1", amount: 1000, currency: "eur" }),
    });
    const response = await handlePayments(request, env, corsHeaders);

    expect(response!.status).toBe(200);
    const body = await response!.json() as any;
    expect(body.clientSecret).toBe("pi_123_secret");
    expect(body.paymentIntentId).toBe("pi_123");

    const stripeCall = mockFetch.mock.calls[0];
    expect(stripeCall[0]).toBe("https://api.stripe.com/v1/payment_intents");
    expect((stripeCall[1]?.method)).toBe("POST");
  });

  it("creates a checkout session and returns session id/url", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "cs_123",
          url: "https://checkout.stripe.com/cs_123",
          payment_intent: "pi_456",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const request = new Request(
      "http://localhost/api/payments/create-session",
      {
        method: "POST",
        body: JSON.stringify({ amount: 2000, currency: "usd", email: "test@clickflash.com" }),
      },
    );
    const response = await handlePayments(request, env, corsHeaders);

    expect(response!.status).toBe(200);
    const body = await response!.json() as any;
    expect(body.id).toBe("cs_123");
    expect(body.url).toBe("https://checkout.stripe.com/cs_123");
    expect(body.paymentIntentId).toBe("pi_456");
  });

  it("returns saved payment methods for a customer", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "pm_1",
              type: "card",
              card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030 },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const request = new Request(
      "http://localhost/api/payments/methods?customerId=cus_1",
      { method: "GET" },
    );
    const response = await handlePayments(request, env, corsHeaders);

    expect(response!.status).toBe(200);
    const body = await response!.json() as any;
    expect(body.paymentMethods).toHaveLength(1);
    expect(body.paymentMethods[0].id).toBe("pm_1");
  });
});
