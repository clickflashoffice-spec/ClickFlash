import { jest } from "@jest/globals";

const createCheckoutSession = jest.fn<any>();
const handleWebhookEvent = jest.fn<any>();
const processStripeWebhookEvent = jest.fn<any>();

jest.unstable_mockModule("../services/stripeService.js", () => ({
  createCheckoutSession,
  handleWebhookEvent,
}));
jest.unstable_mockModule("../services/stripeWebhookService.js", () => ({
  processStripeWebhookEvent,
}));

const { handleBilling } = await import("../routes/billing.js");
const corsHeaders = { "Access-Control-Allow-Origin": "https://admin.clickflash.com" };

function databaseWithStudio(studio: any = null) {
  const prepare = jest.fn((sql: string) => {
    const statement: any = {
      bind: jest.fn(),
      first: jest.fn(),
      run: jest.fn(),
    };
    statement.bind.mockReturnValue(statement);
    statement.first.mockResolvedValue(sql.includes("FROM studios") ? studio : null);
    statement.run.mockResolvedValue({ meta: { changes: 1 } });
    return statement;
  });
  return { prepare };
}

function checkoutRequest(body: Record<string, unknown>) {
  return new Request("https://api.example/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const configuredEnv = (db: any) => ({
  DB: db,
  JWT_SECRET: "jwt-secret",
  STRIPE_SECRET_KEY: "sk_test",
  STRIPE_PRO_PRICE_ID: "price_pro_configured",
  BILLING_RETURN_URL: "https://admin.clickflash.com/manage",
  LICENSE_PRIVATE_KEY: "configured",
});

describe("billing boundaries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/test" });
  });

  it("requires an authenticated checkout", async () => {
    const db = databaseWithStudio();
    const request = checkoutRequest({ plan: "pro" });
    const response = await handleBilling(request, configuredEnv(db) as any, new URL(request.url), corsHeaders, null);

    expect(response?.status).toBe(401);
    expect(db.prepare).not.toHaveBeenCalled();
  });

  it("rejects caller-supplied prices and redirect URLs", async () => {
    const request = checkoutRequest({
      plan: "pro",
      priceId: "price_attacker",
      successUrl: "https://attacker.example/success",
      cancelUrl: "https://attacker.example/cancel",
    });
    const response = await handleBilling(
      request,
      configuredEnv(databaseWithStudio()) as any,
      new URL(request.url),
      corsHeaders,
      { email: "owner@example.com" },
    );

    expect(response?.status).toBe(400);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("uses only server-configured price and return URLs", async () => {
    const studio = { id: "studio-1", subscription_status: "incomplete", billing_tier: "Free" };
    const request = checkoutRequest({ plan: "pro", studioName: "Verified Studio" });
    const env = configuredEnv(databaseWithStudio(studio));
    const response = await handleBilling(
      request,
      env as any,
      new URL(request.url),
      corsHeaders,
      { email: "OWNER@EXAMPLE.COM" },
    );

    expect(response?.status).toBe(200);
    expect(createCheckoutSession).toHaveBeenCalledWith(
      env,
      "price_pro_configured",
      "https://admin.clickflash.com/manage?billing=success",
      "https://admin.clickflash.com/manage?billing=cancel",
      "studio-1",
      "owner@example.com",
      "management-subscription-studio-1-pro",
    );
  });

  it("fails closed when billing configuration is incomplete", async () => {
    const request = checkoutRequest({ plan: "pro" });
    const env = configuredEnv(databaseWithStudio());
    delete (env as any).STRIPE_PRO_PRICE_ID;
    const response = await handleBilling(
      request,
      env as any,
      new URL(request.url),
      corsHeaders,
      { email: "owner@example.com" },
    );
    expect(response?.status).toBe(503);
  });

  it("acknowledges an already completed signed webhook without fulfillment", async () => {
    handleWebhookEvent.mockResolvedValue({ id: "evt_1", type: "invoice.paid", data: { object: {} } });
    processStripeWebhookEvent.mockResolvedValue("duplicate");
    const request = new Request("https://api.example/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "signed" },
      body: "raw-event",
    });
    const response = await handleBilling(
      request,
      configuredEnv(databaseWithStudio()) as any,
      new URL(request.url),
      corsHeaders,
      null,
    );
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ received: true, duplicate: true });
  });
});
