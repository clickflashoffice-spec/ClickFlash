import type { Env } from "../index";

interface CheckoutOrderRow {
  id: string;
  gallery_id: string;
  client_session_id: string;
  total_amount: number;
  currency: string;
  status: string;
  stripe_checkout_session_id: string | null;
}

export interface StripeCheckoutSession {
  id: string;
  payment_status?: string;
  status?: string;
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
}

export function getBearerToken(request: Request): string | null {
  const value = request.headers.get("Authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

export async function retrieveStripeCheckoutSession(
  sessionId: string,
  secretKey: string,
): Promise<StripeCheckoutSession> {
  if (!secretKey) throw new Error("Stripe is not configured");
  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  const payload = await response.json().catch(() => ({})) as StripeCheckoutSession & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Stripe session lookup failed (${response.status})`);
  }
  return payload;
}

export async function fulfillCheckoutSession(
  session: StripeCheckoutSession,
  env: Env,
): Promise<boolean> {
  const metadata = session.metadata || {};
  if (metadata.commerce !== "moneytrash") return false;
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return false;
  }

  const orderId = metadata.orderId;
  const galleryId = metadata.galleryId;
  const cartSessionId = metadata.cartSessionId;
  if (!orderId || !galleryId || !cartSessionId || !session.id) {
    throw new Error("Stripe session is missing MoneyTrash reconciliation metadata");
  }

  const order = await env.DB.prepare(
    `SELECT id, gallery_id, client_session_id, total_amount, currency, status,
            stripe_checkout_session_id
     FROM orders
     WHERE id = ? AND gallery_id = ? AND client_session_id = ?
     LIMIT 1`,
  ).bind(orderId, galleryId, cartSessionId).first<CheckoutOrderRow>();
  if (!order || order.stripe_checkout_session_id !== session.id) {
    throw new Error("Stripe session does not match the MoneyTrash order");
  }

  const expectedAmount = Math.round(Number(order.total_amount) * 100);
  if (
    Number(session.amount_total) !== expectedAmount ||
    String(session.currency || "").toUpperCase() !== String(order.currency).toUpperCase()
  ) {
    throw new Error("Stripe session amount or currency does not match the MoneyTrash order");
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id || null;

  // D1 batch statements execute atomically. The stats marker makes retries and
  // concurrent webhook/return reconciliation safe to run more than once.
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE orders
       SET status = 'paid', stripe_payment_status = ?, stripe_payment_intent_id = ?,
           paid_at = COALESCE(paid_at, datetime('now')), updated_at = datetime('now')
       WHERE id = ? AND gallery_id = ?`,
    ).bind(session.payment_status || "paid", paymentIntentId, orderId, galleryId),
    env.DB.prepare(
      `UPDATE galleries
       SET purchase_count = COALESCE(purchase_count, 0) + 1,
           revenue = COALESCE(revenue, 0) + ?, updated_at = datetime('now')
       WHERE id = ?
         AND EXISTS (
           SELECT 1 FROM orders
           WHERE id = ? AND gallery_id = ? AND status = 'paid' AND stats_recorded_at IS NULL
         )`,
    ).bind(Number(order.total_amount), galleryId, orderId, galleryId),
    env.DB.prepare(
      `UPDATE orders SET stats_recorded_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND gallery_id = ? AND status = 'paid' AND stats_recorded_at IS NULL`,
    ).bind(orderId, galleryId),
  ]);
  return true;
}
