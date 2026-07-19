import type { Env } from "../types";

const BILLING_SOURCE = "clickflash_management";
type EventClaim = "claimed" | "completed" | "processing";
export type WebhookResult = "processed" | "duplicate" | "processing";

function changeCount(result: any): number {
  return Number(result?.meta?.changes ?? result?.changes ?? 0);
}

async function claimEvent(env: Env, eventId: string, eventType: string): Promise<EventClaim> {
  const insert = await env.DB.prepare(
    `INSERT OR IGNORE INTO stripe_webhook_events
      (event_id, event_type, status, attempts, created_at, updated_at)
     VALUES (?, ?, 'processing', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  ).bind(eventId, eventType).run();
  if (changeCount(insert) > 0) return "claimed";

  const existing = await env.DB.prepare(
    "SELECT status FROM stripe_webhook_events WHERE event_id = ? LIMIT 1",
  ).bind(eventId).first<{ status: string }>();
  if (existing?.status === "completed") return "completed";

  if (existing?.status === "failed") {
    const retry = await env.DB.prepare(
      `UPDATE stripe_webhook_events
       SET status = 'processing', attempts = attempts + 1, last_error = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE event_id = ? AND status = 'failed'`,
    ).bind(eventId).run();
    if (changeCount(retry) > 0) return "claimed";
  }
  if (existing?.status === "processing") {
    const staleRetry = await env.DB.prepare(
      `UPDATE stripe_webhook_events
       SET attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
       WHERE event_id = ? AND status = 'processing'
         AND updated_at < datetime('now', '-5 minutes')`,
    ).bind(eventId).run();
    if (changeCount(staleRetry) > 0) return "claimed";
  }
  return "processing";
}

async function finishEvent(env: Env, eventId: string, error?: unknown): Promise<void> {
  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    await env.DB.prepare(
      `UPDATE stripe_webhook_events
       SET status = 'failed', last_error = ?, updated_at = CURRENT_TIMESTAMP
       WHERE event_id = ?`,
    ).bind(message.slice(0, 500), eventId).run();
    return;
  }
  await env.DB.prepare(
    `UPDATE stripe_webhook_events
     SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE event_id = ?`,
  ).bind(eventId).run();
}

function stripeId(value: unknown): string | null {
  if (typeof value === "string" && value.length <= 255) return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return null;
}

async function fulfillEvent(env: Env, event: any): Promise<void> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.mode !== "subscription" || session.metadata?.source !== BILLING_SOURCE) return;
    if (session.metadata?.plan !== "pro") throw new Error("Unsupported subscription plan");

    const studioId = typeof session.client_reference_id === "string" ? session.client_reference_id : null;
    const customerId = stripeId(session.customer);
    const subscriptionId = stripeId(session.subscription);
    if (!studioId || !customerId || !session.id) throw new Error("Subscription checkout is missing identifiers");

    await env.DB.prepare(
      `UPDATE studios SET stripe_customer_id = ?, stripe_subscription_id = ?,
       subscription_status = 'active', billing_tier = 'Pro', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).bind(customerId, subscriptionId, studioId).run();

    const destinationId = `stripe-${session.id}`;
    const existing = await env.DB.prepare(
      "SELECT id FROM destinations WHERE id = ? LIMIT 1",
    ).bind(destinationId).first();
    if (!existing) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO destinations
          (id, name, country, type, studio_id)
         VALUES (?, 'Main HQ', 'US', 'Headquarters', ?)`,
      ).bind(destinationId, studioId).run();
    }
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const customerId = stripeId(event.data.object.customer);
    if (!customerId) throw new Error("Canceled subscription is missing a customer");
    await env.DB.prepare(
      `UPDATE licenses SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
       WHERE desk_id IN (SELECT id FROM destinations WHERE studio_id IN
         (SELECT id FROM studios WHERE stripe_customer_id = ?))`,
    ).bind(customerId).run();
    await env.DB.prepare(
      `UPDATE studios SET subscription_status = 'canceled', billing_tier = 'Free',
       updated_at = CURRENT_TIMESTAMP WHERE stripe_customer_id = ?`,
    ).bind(customerId).run();
  }
}

export async function processStripeWebhookEvent(env: Env, event: any): Promise<WebhookResult> {
  const claim = await claimEvent(env, event.id, event.type);
  if (claim === "completed") return "duplicate";
  if (claim === "processing") return "processing";
  try {
    await fulfillEvent(env, event);
    await finishEvent(env, event.id);
    return "processed";
  } catch (error) {
    await finishEvent(env, event.id, error).catch(() => undefined);
    throw error;
  }
}
