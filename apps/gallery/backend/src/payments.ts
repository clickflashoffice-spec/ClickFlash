import { z } from "zod";
import {
  createPaymentIntentSchema,
  createCheckoutSessionSchema,
  getPaymentMethodsSchema,
} from "./validation.js";

function jsonResponse(body: any, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function stripeFetch(
  path: string,
  init: RequestInit,
  secretKey: string,
): Promise<Response> {
  return fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init.headers || {}),
    },
  });
}

function parseJsonSafely(request: Request): Promise<any> {
  return request.json().catch(() => null);
}

/**
 * Handles /api/payments/* routes for the Customer Gallery.
 *
 * Provides:
 * - POST /api/payments/create-intent
 * - POST /api/payments/create-session
 * - GET  /api/payments/methods
 */
export async function handlePayments(
  request: Request,
  env: { STRIPE_SECRET_KEY?: string },
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const url = new URL(request.url);
  const pathName = url.pathname;

  if (!pathName.startsWith("/api/payments")) return null;

  if (!env.STRIPE_SECRET_KEY) {
    return jsonResponse({ error: "Stripe not configured" }, 503, corsHeaders);
  }

  const idempotencyKey =
    request.headers.get("Idempotency-Key") ?? crypto.randomUUID();

  // POST /api/payments/create-intent
  if (pathName === "/api/payments/create-intent" && request.method === "POST") {
    const body = await parseJsonSafely(request);
    if (!body) {
      return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders);
    }

    const parsed = createPaymentIntentSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        { error: "Validation failed", details: parsed.error.flatten() },
        400,
        corsHeaders,
      );
    }

    const { orderId, amount, currency, email, tipAmount } = parsed.data;

    const params = new URLSearchParams();
    params.append("amount", String(amount));
    params.append("currency", currency.toLowerCase());
    params.append("automatic_payment_methods[enabled]", "true");
    params.append("metadata[orderId]", orderId);
    if (tipAmount !== undefined) {
      params.append("metadata[tipAmount]", String(tipAmount));
    }
    if (email) params.append("receipt_email", email);

    const stripeRes = await stripeFetch(
      "/payment_intents",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: params.toString(),
      },
      env.STRIPE_SECRET_KEY,
    );

    const data = (await stripeRes.json()) as any;
    if (!stripeRes.ok) {
      return jsonResponse(
        { error: data?.error?.message || "Stripe error" },
        stripeRes.status,
        corsHeaders,
      );
    }

    return jsonResponse(
      {
        clientSecret: data.client_secret,
        paymentIntentId: data.id,
        dpmCheckerLink: "https://dashboard.stripe.com/settings/payments/dpm",
      },
      200,
      corsHeaders,
    );
  }

  // POST /api/payments/create-session
  if (pathName === "/api/payments/create-session" && request.method === "POST") {
    const body = await parseJsonSafely(request);
    if (!body) {
      return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders);
    }

    const parsed = createCheckoutSessionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        { error: "Validation failed", details: parsed.error.flatten() },
        400,
        corsHeaders,
      );
    }

    const { amount, currency, email, metadata, mode } = parsed.data;

    const params = new URLSearchParams();
    params.append("mode", mode);
    params.append(
      "success_url",
      "https://gallery.clickflash.com/success?session_id={CHECKOUT_SESSION_ID}",
    );
    params.append("cancel_url", "https://gallery.clickflash.com/cancel");
    params.append("line_items[0][price_data][currency]", currency.toLowerCase());
    params.append(
      "line_items[0][price_data][product_data][name]",
      metadata?.description || "Gallery purchase",
    );
    params.append("line_items[0][price_data][unit_amount]", String(amount));
    params.append("line_items[0][quantity]", "1");
    if (email) params.append("customer_email", email);
    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        params.append(`metadata[${key}]`, value);
      }
    }

    const stripeRes = await stripeFetch(
      "/checkout/sessions",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: params.toString(),
      },
      env.STRIPE_SECRET_KEY,
    );

    const data = (await stripeRes.json()) as any;
    if (!stripeRes.ok) {
      return jsonResponse(
        { error: data?.error?.message || "Stripe error" },
        stripeRes.status,
        corsHeaders,
      );
    }

    return jsonResponse(
      {
        id: data.id,
        url: data.url,
        paymentIntentId: data.payment_intent,
      },
      200,
      corsHeaders,
    );
  }

  // GET /api/payments/methods
  if (pathName === "/api/payments/methods" && request.method === "GET") {
    const customerId = url.searchParams.get("customerId");
    const parsed = getPaymentMethodsSchema.safeParse({ customerId });
    if (!parsed.success) {
      return jsonResponse(
        { error: "Validation failed", details: parsed.error.flatten() },
        400,
        corsHeaders,
      );
    }

    const stripeRes = await stripeFetch(
      `/payment_methods?customer=${encodeURIComponent(
        parsed.data.customerId,
      )}&type=card`,
      { method: "GET" },
      env.STRIPE_SECRET_KEY,
    );

    const data = (await stripeRes.json()) as any;
    if (!stripeRes.ok) {
      return jsonResponse(
        { error: data?.error?.message || "Stripe error" },
        stripeRes.status,
        corsHeaders,
      );
    }

    const paymentMethods = (data.data || []).map((pm: any) => ({
      id: pm.id,
      type: pm.type,
      card: pm.card
        ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
        : undefined,
    }));

    return jsonResponse({ paymentMethods }, 200, corsHeaders);
  }

  return jsonResponse({ error: "Not found" }, 404, corsHeaders);
}
