import { logger } from "@clickflash/logger";
import type { Env } from "../../index";
import { getBearerToken } from "../../services/checkoutService";
import { verifyGalleryPurchaseToken } from "../../utils/galleryPurchaseToken";

interface GalleryRow {
  id: string;
  office_id: string;
  access_code: string;
  name: string;
  single_photo_price: number | null;
}

interface AssetRow {
  id: string;
  original_name: string;
}

interface ExistingOrderRow {
  id: string;
  cart_fingerprint: string;
  stripe_checkout_session_id: string | null;
  stripe_checkout_url: string | null;
  status: string;
}

interface StripeCreateResponse {
  id?: string;
  url?: string;
  payment_status?: string;
  error?: { message?: string };
}

export async function handleGalleryCheckoutCreate(request: Request, env: Env): Promise<Response> {
  try {
    const token = getBearerToken(request);
    if (!token) return Response.json({ error: "Missing gallery purchase token" }, { status: 401 });
    const claims = await verifyGalleryPurchaseToken(token, env.JWT_SECRET);

    const body = await request.json().catch(() => null) as {
      items?: Array<{ photoId?: unknown }>;
      cartSessionId?: unknown;
    } | null;
    const cartSessionId = typeof body?.cartSessionId === "string" ? body.cartSessionId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(cartSessionId)) {
      return Response.json({ error: "Invalid cart session" }, { status: 400 });
    }
    if (!Array.isArray(body?.items) || body.items.length === 0 || body.items.length > 100) {
      return Response.json({ error: "Checkout requires 1 to 100 photos" }, { status: 400 });
    }
    const photoIds = [...new Set(body.items.map((item) => item.photoId))];
    if (
      photoIds.length !== body.items.length ||
      photoIds.some((id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id))
    ) {
      return Response.json({ error: "Invalid or duplicate checkout photos" }, { status: 400 });
    }
    const normalizedPhotoIds = (photoIds as string[]).sort();
    const cartFingerprint = await sha256(normalizedPhotoIds.join("\n"));

    const gallery = await env.DB.prepare(
      `SELECT g.id, g.office_id, g.access_code, g.name, gs.single_photo_price
       FROM galleries g
       JOIN gallery_settings gs ON gs.gallery_id = g.id
       WHERE g.id = ? AND g.status = 'active'
         AND (g.expires_at IS NULL OR g.expires_at > datetime('now'))
       LIMIT 1`,
    ).bind(claims.galleryId).first<GalleryRow>();
    if (!gallery) return Response.json({ error: "Gallery is unavailable" }, { status: 404 });

    const unitAmount = Math.round(Number(gallery.single_photo_price) * 100);
    if (!Number.isSafeInteger(unitAmount) || unitAmount <= 0) {
      return Response.json({ error: "Gallery pricing is not configured" }, { status: 409 });
    }

    const placeholders = normalizedPhotoIds.map(() => "?").join(",");
    const assetResult = await env.DB.prepare(
      `SELECT id, original_name FROM assets
       WHERE gallery_id = ? AND status = 'ready' AND id IN (${placeholders})`,
    ).bind(gallery.id, ...normalizedPhotoIds).all<AssetRow>();
    const assets = assetResult.results || [];
    if (assets.length !== normalizedPhotoIds.length) {
      return Response.json({ error: "One or more photos are unavailable" }, { status: 409 });
    }

    const existing = await env.DB.prepare(
      `SELECT id, cart_fingerprint, stripe_checkout_session_id, stripe_checkout_url, status
       FROM orders WHERE gallery_id = ? AND client_session_id = ? LIMIT 1`,
    ).bind(gallery.id, cartSessionId).first<ExistingOrderRow>();
    if (existing?.cart_fingerprint && existing.cart_fingerprint !== cartFingerprint) {
      return Response.json({ error: "Cart changed; start a new checkout session" }, { status: 409 });
    }
    if (existing?.stripe_checkout_session_id && existing.stripe_checkout_url) {
      return Response.json({
        success: true,
        orderId: existing.id,
        sessionId: existing.stripe_checkout_session_id,
        url: existing.stripe_checkout_url,
        reused: true,
      });
    }

    const orderId = existing?.id || crypto.randomUUID();
    const totalAmount = (unitAmount * assets.length) / 100;
    if (!existing) {
      const now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO orders (
             id, office_id, access_code, total_amount, currency, status,
             gallery_id, client_session_id, cart_fingerprint, created_at, updated_at
           ) VALUES (?, ?, ?, ?, 'EUR', 'pending', ?, ?, ?, ?, ?)`,
        ).bind(
          orderId, gallery.office_id, gallery.access_code, totalAmount,
          gallery.id, cartSessionId, cartFingerprint, now, now,
        ),
        ...normalizedPhotoIds.map((assetId) => env.DB.prepare(
          `INSERT INTO order_items (id, order_id, asset_id, type, price, created_at)
           VALUES (?, ?, ?, 'single_photo', ?, ?)`,
        ).bind(crypto.randomUUID(), orderId, assetId, unitAmount / 100, now)),
      ]);
    }

    const successUrl = appendReturnParams(
      env.GALLERY_APP_URL,
      "moneytrash_checkout=success&session_id={CHECKOUT_SESSION_ID}",
    );
    const cancelUrl = appendReturnParams(env.GALLERY_APP_URL, "moneytrash_checkout=cancelled");
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("client_reference_id", orderId);
    params.set("metadata[commerce]", "moneytrash");
    params.set("metadata[orderId]", orderId);
    params.set("metadata[galleryId]", gallery.id);
    params.set("metadata[cartSessionId]", cartSessionId);
    assets.forEach((asset, index) => {
      params.set(`line_items[${index}][price_data][currency]`, "eur");
      params.set(`line_items[${index}][price_data][unit_amount]`, String(unitAmount));
      params.set(`line_items[${index}][price_data][product_data][name]`, asset.original_name || "Digital photo");
      params.set(`line_items[${index}][quantity]`, "1");
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `moneytrash-${gallery.id}-${cartSessionId}`,
      },
      body: params,
    });
    const stripeSession = await stripeResponse.json().catch(() => ({})) as StripeCreateResponse;
    if (!stripeResponse.ok || !stripeSession.id || !stripeSession.url) {
      await env.DB.prepare(
        `UPDATE orders SET status = 'checkout_failed', updated_at = datetime('now') WHERE id = ?`,
      ).bind(orderId).run();
      throw new Error(stripeSession.error?.message || `Stripe checkout failed (${stripeResponse.status})`);
    }

    await env.DB.prepare(
      `UPDATE orders SET status = 'pending', stripe_checkout_session_id = ?,
         stripe_checkout_url = ?, stripe_payment_status = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).bind(stripeSession.id, stripeSession.url, stripeSession.payment_status || "unpaid", orderId).run();

    return Response.json({
      success: true,
      orderId,
      sessionId: stripeSession.id,
      url: stripeSession.url,
      amount: totalAmount,
      currency: "EUR",
    });
  } catch (error) {
    if (String(error).includes("purchase token")) {
      return Response.json({ error: "Invalid or expired gallery purchase token" }, { status: 401 });
    }
    logger.error("MoneyTrash checkout create failed", { args: [error] });
    return Response.json({ error: "Payment could not be initialized" }, { status: 502 });
  }
}

function appendReturnParams(baseUrl: string, query: string): string {
  return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${query}`;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
