import { logger } from "@clickflash/logger";
import type { Env } from "../../index";
import {
  fulfillCheckoutSession,
  getBearerToken,
  retrieveStripeCheckoutSession,
} from "../../services/checkoutService";
import { verifyGalleryPurchaseToken } from "../../utils/galleryPurchaseToken";
import { signPurchaseDownload } from "../../utils/purchaseDownloadSignature";

interface OrderStatusRow {
  id: string;
  gallery_id: string;
  status: string;
  total_amount: number;
  currency: string;
  stripe_checkout_session_id: string;
}

interface PurchasedDownloadRow {
  asset_id: string;
  original_name: string;
}

export async function handleGalleryCheckoutStatus(
  request: Request,
  env: Env,
  params: Record<string, string>,
): Promise<Response> {
  try {
    const token = getBearerToken(request);
    if (!token) return Response.json({ error: "Missing gallery purchase token" }, { status: 401 });
    const claims = await verifyGalleryPurchaseToken(token, env.JWT_SECRET);
    const sessionId = decodeURIComponent(params.id || "");
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      return Response.json({ error: "Invalid checkout session" }, { status: 400 });
    }

    let order = await getOrder(env, claims.galleryId, sessionId);
    if (!order) return Response.json({ error: "Checkout session not found" }, { status: 404 });

    if (order.status !== "paid") {
      const stripeSession = await retrieveStripeCheckoutSession(sessionId, env.STRIPE_SECRET_KEY);
      await fulfillCheckoutSession(stripeSession, env);
      order = await getOrder(env, claims.galleryId, sessionId);
    }

    const downloads = order?.status === "paid"
      ? await createDownloadLinks(request, env, order.id)
      : [];
    return Response.json({
      success: true,
      orderId: order?.id,
      status: order?.status || "pending",
      paid: order?.status === "paid",
      amount: Number(order?.total_amount || 0),
      currency: order?.currency || "EUR",
      downloads,
    });
  } catch (error) {
    if (String(error).includes("purchase token")) {
      return Response.json({ error: "Invalid or expired gallery purchase token" }, { status: 401 });
    }
    logger.error("MoneyTrash checkout status failed", { args: [error] });
    return Response.json({ error: "Checkout status is temporarily unavailable" }, { status: 502 });
  }
}

async function createDownloadLinks(
  request: Request,
  env: Env,
  orderId: string,
): Promise<Array<{ photoId: string; filename: string; url: string; expiresAt: string }>> {
  const result = await env.DB.prepare(
    `SELECT oi.asset_id, a.original_name
     FROM order_items oi
     JOIN assets a ON a.id = oi.asset_id
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.order_id = ? AND o.status = 'paid'
     ORDER BY oi.created_at ASC`,
  ).bind(orderId).all<PurchasedDownloadRow>();
  const expires = Math.floor(Date.now() / 1000) + 900;
  const origin = new URL(request.url).origin;
  return Promise.all((result.results || []).map(async (item) => {
    const signature = await signPurchaseDownload(orderId, item.asset_id, expires, env.JWT_SECRET);
    const url = new URL(
      `/api/gallery-purchases/${encodeURIComponent(orderId)}/assets/${encodeURIComponent(item.asset_id)}`,
      origin,
    );
    url.searchParams.set("expires", String(expires));
    url.searchParams.set("signature", signature);
    return {
      photoId: item.asset_id,
      filename: item.original_name,
      url: url.toString(),
      expiresAt: new Date(expires * 1000).toISOString(),
    };
  }));
}

async function getOrder(env: Env, galleryId: string, sessionId: string): Promise<OrderStatusRow | null> {
  return env.DB.prepare(
    `SELECT id, gallery_id, status, total_amount, currency, stripe_checkout_session_id
     FROM orders WHERE gallery_id = ? AND stripe_checkout_session_id = ? LIMIT 1`,
  ).bind(galleryId, sessionId).first<OrderStatusRow>();
}
