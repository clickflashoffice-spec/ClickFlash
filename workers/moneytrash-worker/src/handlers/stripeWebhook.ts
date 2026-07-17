import { logger } from "@clickflash/logger";
import type { Env } from "../index";
import { fulfillCheckoutSession, type StripeCheckoutSession } from "../services/checkoutService";

export async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  }

  const signature = request.headers.get("Stripe-Signature");
  if (!signature) return Response.json({ error: "Missing Stripe-Signature header" }, { status: 400 });
  const rawBody = await request.text();

  let event: { id: string; type: string; data: { object: StripeCheckoutSession } };
  try {
    const { default: Stripe } = await import("stripe") as any;
    const stripe = new Stripe(env.STRIPE_SECRET_KEY) as any;
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return Response.json(
      { error: `Webhook signature verification failed: ${error instanceof Error ? error.message : "invalid signature"}` },
      { status: 400 },
    );
  }

  try {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO webhook_events (id, type, payload, processed, created_at)
       VALUES (?, ?, ?, 0, datetime('now'))`,
    ).bind(event.id, event.type, rawBody).run();
    const stored = await env.DB.prepare(
      `SELECT processed FROM webhook_events WHERE id = ? LIMIT 1`,
    ).bind(event.id).first<{ processed: number }>();
    if (Number(stored?.processed) === 1) {
      return Response.json({ received: true, idempotent: true });
    }

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await fulfillCheckoutSession(event.data.object, env);
    } else if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const session = event.data.object;
      const metadata = session.metadata || {};
      if (metadata.commerce === "moneytrash" && metadata.orderId && metadata.galleryId) {
        await env.DB.prepare(
          `UPDATE orders SET status = ?, stripe_payment_status = ?, updated_at = datetime('now')
           WHERE id = ? AND gallery_id = ? AND stripe_checkout_session_id = ? AND status <> 'paid'`,
        ).bind(
          event.type === "checkout.session.expired" ? "expired" : "payment_failed",
          session.payment_status || "unpaid",
          metadata.orderId,
          metadata.galleryId,
          session.id,
        ).run();
      }
    }

    await env.DB.prepare(
      `UPDATE webhook_events SET processed = 1, processed_at = datetime('now'), error_message = NULL
       WHERE id = ?`,
    ).bind(event.id).run();
    return Response.json({ received: true });
  } catch (error) {
    logger.error("MoneyTrash Stripe webhook processing failed", { args: [error] });
    await env.DB.prepare(
      `UPDATE webhook_events SET error_message = ? WHERE id = ?`,
    ).bind(error instanceof Error ? error.message : "Unknown webhook error", event.id).run().catch(() => undefined);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
