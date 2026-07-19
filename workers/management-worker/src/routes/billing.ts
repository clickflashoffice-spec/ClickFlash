import { z } from "zod";
import { createErrorResponse } from "../errorHandler";
import type { TokenPayload } from "../jwt";
import { createCheckoutSession, handleWebhookEvent } from "../services/stripeService";
import { processStripeWebhookEvent } from "../services/stripeWebhookService";
import type { Env } from "../types";
import { logger } from "@clickflash/logger";

const checkoutSchema = z.object({
  plan: z.literal("pro"),
  studioName: z.string().trim().min(2).max(120).optional(),
}).strict();

function billingConfiguration(env: Env) {
  const priceId = env.STRIPE_PRO_PRICE_ID?.trim();
  const configuredReturnUrl = env.BILLING_RETURN_URL?.trim();
  if (!priceId || !/^price_[A-Za-z0-9_]+$/.test(priceId) || !configuredReturnUrl) {
    return null;
  }

  try {
    const returnUrl = new URL(configuredReturnUrl);
    if (returnUrl.protocol !== "https:" || returnUrl.username || returnUrl.password) return null;
    returnUrl.hash = "";
    const successUrl = new URL(returnUrl);
    const cancelUrl = new URL(returnUrl);
    successUrl.searchParams.set("billing", "success");
    cancelUrl.searchParams.set("billing", "cancel");
    return { priceId, successUrl: successUrl.toString(), cancelUrl: cancelUrl.toString() };
  } catch {
    return null;
  }
}

export async function handleBilling(
  request: Request,
  env: Env,
  url: URL,
  corsHeaders: Record<string, string>,
  payload: TokenPayload | null,
): Promise<Response | null> {
  if (url.pathname === "/api/billing/checkout" && request.method === "POST") {
    if (!payload?.email) {
      return createErrorResponse(401, "Unauthorized", "Authentication required", undefined, undefined, corsHeaders);
    }

    const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return createErrorResponse(400, "Bad Request", "Invalid checkout request", undefined, undefined, corsHeaders);
    }
    const config = billingConfiguration(env);
    if (!config || !env.STRIPE_SECRET_KEY || !env.LICENSE_PRIVATE_KEY) {
      return createErrorResponse(503, "Unavailable", "Billing is not configured", undefined, undefined, corsHeaders);
    }

    try {
      const email = z.string().email().parse(payload.email.trim().toLowerCase());
      const studioName = parsed.data.studioName ?? `Studio ${email.split("@")[0]}`;
      let studio = await env.DB.prepare(
        "SELECT id, subscription_status, billing_tier FROM studios WHERE email = ? LIMIT 1",
      ).bind(email).first<{ id: string; subscription_status: string; billing_tier: string }>();

      if (studio?.subscription_status === "active" && studio.billing_tier === "Pro") {
        return createErrorResponse(409, "Conflict", "Studio already has an active Pro subscription", undefined, undefined, corsHeaders);
      }
      if (!studio) {
        const candidateId = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT OR IGNORE INTO studios
            (id, name, email, subscription_status, billing_tier)
           VALUES (?, ?, ?, 'incomplete', 'Free')`,
        ).bind(candidateId, studioName, email).run();
        studio = await env.DB.prepare(
          "SELECT id, subscription_status, billing_tier FROM studios WHERE email = ? LIMIT 1",
        ).bind(email).first();
      }
      if (!studio?.id) throw new Error("Unable to provision billing studio");

      const session = await createCheckoutSession(
        env,
        config.priceId,
        config.successUrl,
        config.cancelUrl,
        studio.id,
        email,
        `management-subscription-${studio.id}-pro`,
      );
      if (!session.url) throw new Error("Stripe did not return a checkout URL");
      return Response.json({ url: session.url }, { headers: corsHeaders });
    } catch (error) {
      logger.error("Checkout error", { args: [error] });
      return createErrorResponse(500, "Internal Server Error", "Failed to create checkout session", undefined, undefined, corsHeaders);
    }
  }

  if (url.pathname === "/api/billing/webhook" && request.method === "POST") {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return createErrorResponse(400, "Bad Request", "Missing Stripe signature", undefined, undefined, corsHeaders);
    }

    let event: any;
    try {
      event = await handleWebhookEvent(env, await request.text(), signature);
    } catch (error) {
      logger.error("Webhook signature verification error", { args: [error] });
      return createErrorResponse(400, "Bad Request", "Invalid Stripe signature", undefined, undefined, corsHeaders);
    }
    if (!event?.id || !event?.type) {
      return createErrorResponse(400, "Bad Request", "Invalid Stripe event", undefined, undefined, corsHeaders);
    }

    try {
      const result = await processStripeWebhookEvent(env, event);
      if (result === "duplicate") return Response.json({ received: true, duplicate: true }, { headers: corsHeaders });
      if (result === "processing") {
        return createErrorResponse(409, "Conflict", "Stripe event is already processing", undefined, undefined, corsHeaders);
      }
      return Response.json({ received: true }, { headers: corsHeaders });
    } catch (error) {
      logger.error("Webhook processing error", { args: [error] });
      return createErrorResponse(500, "Internal Server Error", "Failed to process webhook", undefined, undefined, corsHeaders);
    }
  }

  return null;
}
