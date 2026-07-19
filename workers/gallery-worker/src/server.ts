import DatabaseManager from "./db.js";
import PhotoProcessor from "./photoProcessor.js";
import { validateLogin } from "./validation.js";
import { verifyPassword } from "./auth.js";
import { createToken, verifyToken, extractTokenFromHeader } from "./jwt.js";
import { checkLoginRateLimit, recordLoginAttempt } from "./loginRateLimiter.js";
import { handleRest } from "./routes/rest.js";
import { handleWebsiteApi } from "./routes/website.js";
import { R2SignedUrlService } from "./services/r2SignedUrlService.js";
import {
  canOrderDownloadPhoto,
  canOrderViewPhoto,
  generateCustomerAccessPin,
  getPhotoStorageKey,
  isCustomerToken,
  isStaffToken,
  isValidCartSessionId,
  isValidStripeCheckoutSessionId,
  toCustomerOrder,
  updateOrderPhotoProofingStatus,
  type CustomerOrderRecord,
  type DownloadablePhotoRecord,
} from "./services/customerAccessService.js";
import { logger } from "@clickflash/logger";

export interface Env {
  GALLERY_DB: any; // D1 binding
  WEBSITE_DB: any; // D1 binding for Website
  GALLERY_BUCKET: any; // R2 binding
  JWT_SECRET: string; // JWT signing secret
  ALLOWED_ORIGINS: string; // Comma-separated list of allowed origins
  STRIPE_SECRET_KEY?: string; // Stripe secret key
  STRIPE_WEBHOOK_SECRET?: string; // Stripe webhook signing secret
  GALLERY_PUBLIC_URL?: string; // Public online Gallery root, including /gallery/
  SENTRY_DSN?: string; // Sentry DSN — optional; monitoring disabled when absent
  GEO_RESTRICTED?: string; // "true" to enable country allowlist enforcement
  ALLOWED_COUNTRIES?: string; // Comma-separated ISO-3166-1 alpha-2 codes, e.g. "MA,TN,FR,US"
  RESEND_API_KEY?: string; // Resend API key for transactional email notifications
  ADMIN_NOTIFICATION_EMAIL?: string;
  FROM_EMAIL?: string;
  NODE_ENV?: string;
}

/**
 * D1-backed per-IP rate limiter for public (unauthenticated) endpoints.
 * Returns false if the IP has exceeded `limit` requests within `windowMs`.
 */
export async function checkPublicRateLimit(
  db: any,
  ip: string,
  endpoint: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const row = (await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM rate_limit_events WHERE ip=? AND endpoint=? AND ts>?`,
    )
    .bind(ip, endpoint, since)
    .first()) as { cnt: number } | null;
  if ((row?.cnt ?? 0) >= limit) return false;
  await db
    .prepare(`INSERT INTO rate_limit_events (ip, endpoint, ts) VALUES (?,?,?)`)
    .bind(ip, endpoint, new Date().toISOString())
    .run();
  return true;
}

const galleryHandler = {
  async fetch(request: Request, env: Env, _ctx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathName = url.pathname;

    // Parse allowed origins from env var (comma-separated string)
    const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [];
    const requestOrigin = request.headers.get('Origin');

    const isClickFlashOrigin = (origin: string | null): boolean => {
      if (!origin) return true;
      if (allowedOrigins.includes(origin)) return true;
      if (env.NODE_ENV === "production") return false;
      try {
        const { hostname } = new URL(origin);
        return hostname === "localhost" || hostname === "127.0.0.1";
      } catch {
        return false;
      }
    };

    const corsOrigin = isClickFlashOrigin(requestOrigin)
      ? (requestOrigin || "*")
      : "";

    // CORS Handling with proper validation
    const corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    if (requestOrigin && !corsOrigin) {
      return new Response(JSON.stringify({ error: "Origin is not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Geo-restriction enforcement — reads CF's auto-populated country field.
    // Only active when GEO_RESTRICTED="true" and ALLOWED_COUNTRIES is set in wrangler.toml.
    // Health-check bypass keeps uptime monitors working from any region.
    if (
      env.GEO_RESTRICTED === "true" &&
      env.ALLOWED_COUNTRIES &&
      pathName !== "/api/health"
    ) {
      const country = (request as any).cf?.country as string | undefined;
      const allowedCountries = env.ALLOWED_COUNTRIES.split(",").map((c) => c.trim());
      if (country && !allowedCountries.includes(country)) {
        return new Response(
          JSON.stringify({ error: "Service not available in your region." }),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }
    }

    // Initialize Services with Worker Env
    const dbManager = new DatabaseManager(env.GALLERY_DB);
    const photoProcessor = new PhotoProcessor(env.GALLERY_BUCKET);

    const response = await (async () => {
      try {
        // Public Routes
        if (pathName === "/api/health") {
          return new Response(
            JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const websiteResponse = await handleWebsiteApi(
          request,
          pathName,
          env,
          corsHeaders,
          checkPublicRateLimit,
        );
        if (websiteResponse) return websiteResponse;

        // Public: Signed R2 High-Res URLs (/v1/<storageKey>?e=...&s=...)
        if (pathName.startsWith("/v1/")) {
          if (!env.JWT_SECRET) {
            return new Response(JSON.stringify({ error: "Signed downloads are not configured" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            });
          }
          const signedUrlService = new R2SignedUrlService({
            secret: env.JWT_SECRET,
            defaultTtlSeconds: 900,
          });
          const validation = await signedUrlService.validateSignedUrl(request.url);
          if (!validation.valid || !validation.path) {
            return new Response(
              JSON.stringify({ error: validation.error || "Invalid or expired signed URL" }),
              { status: 403, headers: { "Content-Type": "application/json" } },
            );
          }
          const object = await env.GALLERY_BUCKET.get(validation.path);
          if (!object) {
            return new Response(
              JSON.stringify({ error: "File not found in storage" }),
              { status: 404, headers: { "Content-Type": "application/json" } },
            );
          }
          const headers = new Headers();
          object.writeHttpMetadata(headers);
          headers.set("Cache-Control", "private, max-age=900");
          return new Response(object.body, { headers });
        }

        // Customer checkout: the route is public-facing but requires an order JWT.
        if (pathName === "/api/checkout" && request.method === "POST") {
          // Rate limit: 10 Stripe session creations per minute per IP
          const checkoutIp = request.headers.get("CF-Connecting-IP") ?? "unknown";
          if (!await checkPublicRateLimit(env.WEBSITE_DB, checkoutIp, "checkout", 10, 60_000)) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
              status: 429,
              headers: { "Content-Type": "application/json", "Retry-After": "60", ...corsHeaders },
            });
          }
          if (!env.STRIPE_SECRET_KEY) {
            return new Response(
              JSON.stringify({ error: "Stripe not configured" }),
              { status: 503, headers: { "Content-Type": "application/json" } }
            );
          }

          let body: any;
          try {
            body = await request.json();
          } catch {
            return new Response(
              JSON.stringify({ error: "Invalid JSON" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const { items } = body || {};
          const cartSessionId = body?.cartSessionId;

          if (!env.JWT_SECRET) {
            return new Response(JSON.stringify({ error: "Checkout authentication is not configured" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            });
          }

          const checkoutToken = extractTokenFromHeader(request.headers.get("Authorization"));
          const checkoutPayload = checkoutToken
            ? await verifyToken(checkoutToken, env.JWT_SECRET)
            : null;

          if (!checkoutPayload || !isCustomerToken(checkoutPayload) || !checkoutPayload.orderId) {
            return new Response(JSON.stringify({ error: "Customer authentication is required" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const currentOrder = await dbManager.get<CustomerOrderRecord>(
            "SELECT * FROM orders WHERE id = ? AND LOWER(email) = ? LIMIT 1",
            [checkoutPayload.orderId, String(checkoutPayload.email || "").toLowerCase()],
          );
          if (!currentOrder) {
            return new Response(JSON.stringify({ error: "Customer order was not found" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (cartSessionId !== undefined && !isValidCartSessionId(cartSessionId)) {
            return new Response(JSON.stringify({ error: "Invalid cart session" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const customerEmail = String(currentOrder.email || "").toLowerCase();
          const albumId = String(currentOrder.albumId || "");
          const currency = "eur";

          // SECURITY: Server-side price validation — never trust client prices
          if (!items || !Array.isArray(items) || items.length === 0 || items.length > 100) {
            return new Response(
              JSON.stringify({ error: "Checkout requires between 1 and 100 items" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          try {
            // Look up canonical prices from D1 products table
            const productIds = items
              .map((item: any) => String(item.productId || item.id || "").trim())
              .filter(Boolean);
            if (productIds.length === 0) {
              return new Response(
                JSON.stringify({ error: "Each item must have a productId" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            const requestedPhotoIds = items
              .map((item: any) => String(item.photoId || "").trim())
              .filter(Boolean);
            if (!albumId || requestedPhotoIds.length !== items.length) {
              return new Response(
                JSON.stringify({ error: "Each checkout item must reference a photo in the customer album" }),
                { status: 400, headers: { "Content-Type": "application/json" } },
              );
            }

            const photoPlaceholders = requestedPhotoIds.map(() => "?").join(", ");
            const photoRows = await env.GALLERY_DB.prepare(
              `SELECT id FROM photos WHERE albumId = ? AND id IN (${photoPlaceholders})`,
            ).bind(albumId, ...requestedPhotoIds).all();
            const validPhotoIds = new Set((photoRows.results || []).map((photo: any) => String(photo.id)));
            if (requestedPhotoIds.some((photoId: string) => !validPhotoIds.has(photoId))) {
              return new Response(
                JSON.stringify({ error: "One or more photos do not belong to this customer album" }),
                { status: 403, headers: { "Content-Type": "application/json" } },
              );
            }

            const productPlaceholders = productIds.map(() => "?").join(", ");
            const dbProducts = await env.GALLERY_DB.prepare(
              `SELECT id, name, price, category FROM products WHERE id IN (${productPlaceholders}) AND (status IS NULL OR status = 'Active')`
            ).bind(...productIds).all();

            const productMap = new Map<string, { name: string; price: number; category: string }>();
            if (dbProducts.results) {
              for (const p of dbProducts.results as any[]) {
                productMap.set(p.id, { name: p.name, price: p.price, category: p.category });
              }
            }

            // Also check album-level pricing if albumId is provided
            let albumPricing: { price_single: number; price_full: number; title: string } | null = null;
            if (albumId) {
              const album = await env.GALLERY_DB.prepare(
                "SELECT title, price_single, price_full, pricePerPhoto, fullGalleryPrice FROM albums WHERE id = ? LIMIT 1"
              ).bind(albumId).first() as any;
              if (album) {
                albumPricing = {
                  title: album.title || "Gallery",
                  price_single: album.price_single || album.pricePerPhoto || 0,
                  price_full: album.price_full || album.fullGalleryPrice || 0,
                };
              }
            }

            // Build verified line items with server-side prices
            const lineItems: Array<{ name: string; unitAmount: number; quantity: number }> = [];
            const verifiedItems: Array<Record<string, unknown>> = [];
            for (const item of items as any[]) {
              const pid = String(item.productId || item.id || "").trim();
              const photoId = String(item.photoId);
              const quantity = Math.min(100, Math.max(1, Math.floor(Number(item.quantity) || 1)));

              // Try product catalog first
              const product = productMap.get(pid);
              if (product) {
                lineItems.push({
                  name: product.name,
                  unitAmount: Math.round(product.price * 100),
                  quantity,
                });
                verifiedItems.push({
                  productId: pid,
                  photoId,
                  name: product.name,
                  quantity,
                  price: product.price,
                  deliveryType: product.category === "Digital" ? "digital" : "print",
                });
                continue;
              }

              // Try album-based pricing for special product types
              if (albumPricing && pid === "album_full" && albumPricing.price_full > 0) {
                lineItems.push({
                  name: `Full Album - ${albumPricing.title}`,
                  unitAmount: Math.round(albumPricing.price_full * 100),
                  quantity: 1,
                });
                verifiedItems.push({ productId: pid, photoId, name: `Full Album - ${albumPricing.title}`, quantity: 1, price: albumPricing.price_full, type: "album_full" });
                continue;
              }
              if (albumPricing && pid === "album_single" && albumPricing.price_single > 0) {
                lineItems.push({
                  name: `Single Photo - ${albumPricing.title}`,
                  unitAmount: Math.round(albumPricing.price_single * 100),
                  quantity,
                });
                verifiedItems.push({ productId: pid, photoId, name: `Single Photo - ${albumPricing.title}`, quantity, price: albumPricing.price_single, deliveryType: "digital" });
                continue;
              }

              // Unknown product — reject
              return new Response(
                JSON.stringify({ error: `Unknown product: ${pid}` }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            // Verify total is positive
            const serverTotal = lineItems.reduce((sum, li) => sum + li.unitAmount * li.quantity, 0);
            if (serverTotal <= 0) {
              return new Response(
                JSON.stringify({ error: "Order total must be greater than zero" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            // Build Stripe checkout session with per-line-item pricing
            const purchaseOrderId = crypto.randomUUID();
            const stripeParams = new URLSearchParams();
            stripeParams.append("payment_method_types[]", "card");
            stripeParams.append("mode", "payment");
            const galleryPublicUrl = (env.GALLERY_PUBLIC_URL || "https://gallery.clickflash.com/gallery/")
              .replace(/\/+$/, "/");
            stripeParams.append("success_url", `${galleryPublicUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
            stripeParams.append("cancel_url", `${galleryPublicUrl}?checkout=cancelled`);
            if (customerEmail) stripeParams.append("customer_email", customerEmail);
            if (albumId) stripeParams.append("metadata[albumId]", albumId);
            stripeParams.append("metadata[orderId]", purchaseOrderId);
            if (cartSessionId) stripeParams.append("metadata[cartSessionId]", cartSessionId);
            stripeParams.append("client_reference_id", purchaseOrderId);

            for (let i = 0; i < lineItems.length; i++) {
              stripeParams.append(`line_items[${i}][price_data][currency]`, currency);
              stripeParams.append(`line_items[${i}][price_data][product_data][name]`, lineItems[i].name);
              stripeParams.append(`line_items[${i}][price_data][unit_amount]`, String(lineItems[i].unitAmount));
              stripeParams.append(`line_items[${i}][quantity]`, String(lineItems[i].quantity));
            }

            const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: stripeParams,
            });

            const session = await stripeResponse.json() as any;

            if (session.error) {
              return new Response(
                JSON.stringify({ error: session.error.message }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            const accessPin = generateCustomerAccessPin();
            const magicLinkToken = crypto.randomUUID();
            await dbManager.run(
              `INSERT INTO orders (
                id, date, clientName, email, status, total, totalAmount,
                photographerId, destinationId, paymentMethod, items, albumId,
                access_pin, magic_link_token, stripe_session_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, 'Payment Pending', ?, ?, ?, ?, 'Card', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [
                purchaseOrderId,
                new Date().toISOString(),
                currentOrder.clientName || "Customer",
                customerEmail,
                serverTotal / 100,
                serverTotal / 100,
                currentOrder.photographerId || null,
                currentOrder.destinationId || null,
                JSON.stringify(verifiedItems),
                albumId,
                accessPin,
                magicLinkToken,
                session.id,
              ],
            );

            return new Response(
              JSON.stringify({ sessionId: session.id, orderId: purchaseOrderId, url: session.url }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          } catch (e: any) {
            logger.error("[Checkout] Error:", { args: [e] });
            return new Response(
              JSON.stringify({ error: "Checkout failed. Please try again." }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }
        }

        // Public: Stripe Webhook
        if (pathName === "/api/webhook" && request.method === "POST") {
          if (!env.STRIPE_WEBHOOK_SECRET) {
            return new Response(
              JSON.stringify({ error: "Webhook not configured" }),
              { status: 503 }
            );
          }

          try {
            const body = await request.text();
            const sigHeader = request.headers.get('stripe-signature');
            if (!sigHeader) {
              return new Response(
                JSON.stringify({ error: 'Missing Stripe-Signature header' }),
                { status: 400 }
              );
            }

            const { default: Stripe } = await import('stripe') as any;
            const stripe = new Stripe(env.STRIPE_SECRET_KEY) as any;
            let event: any;
            try {
              event = await stripe.webhooks.constructEventAsync(body, sigHeader, env.STRIPE_WEBHOOK_SECRET);
            } catch (verifyErr: any) {
              return new Response(
                JSON.stringify({ error: `Webhook signature verification failed: ${verifyErr.message}` }),
                { status: 400 }
              );
            }

            // P0-3: Idempotency guard. Stripe may retry the same event (network
            // hiccup, 5xx, etc.). Without this, we'd create a duplicate order
            // per delivery, charging the customer for multiple fulfilments.
            //
            // The webhook_events table is created by schema.sql with a
            // UNIQUE constraint on stripe_event_id. We insert before processing
            // — if the insert fails with UNIQUE violation, this event was
            // already handled. Returning 200 prevents Stripe from retrying.
            try {
              await env.GALLERY_DB.prepare(`
                INSERT INTO webhook_events (stripe_event_id, event_type, payload, processed)
                VALUES (?, ?, ?, 0)
              `).bind(event.id, event.type, JSON.stringify(event)).run();
            } catch (insertErr: any) {
              if (String(insertErr?.message || "").includes("UNIQUE")) {
                logger.info(String(`[Webhook] Duplicate event ${event.id} ignored (already processed)`));
                return new Response(
                  JSON.stringify({ received: true, idempotent: true }),
                  { status: 200, headers: { "Content-Type": "application/json" } }
                );
              }
              // Real DB error — surface it
              throw insertErr;
            }

            if (event.type === 'checkout.session.completed') {
              const session = event.data.object;

              // Idempotency: also dedup on stripe_session_id in the orders table
              // (in case webhook_events was pruned/cleaned but orders remain).
              const existing = await env.GALLERY_DB.prepare(
                `SELECT id FROM orders WHERE stripe_session_id = ? LIMIT 1`
              ).bind(session.id).first();

              if (existing) {
                await env.GALLERY_DB.prepare(
                  `UPDATE orders
                   SET status = 'paid', total = ?, totalAmount = ?, stripe_payment_intent = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?`,
                ).bind(
                  session.amount_total ? session.amount_total / 100 : 0,
                  session.amount_total ? session.amount_total / 100 : 0,
                  session.payment_intent || null,
                  (existing as any).id,
                ).run();
                logger.info(String(`[Webhook] Marked order ${(existing as any).id} paid`));
              } else {
                await env.GALLERY_DB.prepare(`
                  INSERT INTO orders (id, clientName, email, status, totalAmount, albumId, stripe_session_id, created_at)
                  VALUES (?, ?, ?, 'paid', ?, ?, ?, CURRENT_TIMESTAMP)
                `).bind(
                  session.metadata?.orderId || crypto.randomUUID(),
                  session.customer_details?.name || 'Guest',
                  session.customer_email,
                  session.amount_total ? session.amount_total / 100 : 0,
                  session.metadata?.albumId || '',
                  session.id
                ).run();
              }

              const cartSessionId = session.metadata?.cartSessionId;
              const sessionEmail = String(session.customer_email || session.customer_details?.email || "").toLowerCase();
              if (isValidCartSessionId(cartSessionId) && sessionEmail) {
                await env.GALLERY_DB.prepare(`
                  UPDATE abandoned_carts
                  SET recovered = 1, recovered_at = CURRENT_TIMESTAMP
                  WHERE session_id = ? AND LOWER(email) = ?
                `).bind(cartSessionId, sessionEmail).run();
              }
            }

            // Mark the event as processed (best-effort; not critical)
            await env.GALLERY_DB.prepare(
              `UPDATE webhook_events SET processed = 1 WHERE stripe_event_id = ?`
            ).bind(event.id).run().catch(() => {});

            return new Response(
              JSON.stringify({ received: true }),
              { status: 200 }
            );
          } catch (e: any) {
            return new Response(
              JSON.stringify({ error: e.message }),
              { status: 500 }
            );
          }
        }

        // MoneyTrash public gallery lookup. Access codes scope every query;
        // empty or invalid galleries never receive fabricated sample photos.
        const mtMatch = pathName.match(/^\/api\/moneytrash\/gallery\/([^/]+)$/);
        if (mtMatch && request.method === "GET") {
          const accessCode = decodeURIComponent(mtMatch[1]).trim().toUpperCase();
          if (!/^[A-Z0-9_-]{4,64}$/.test(accessCode)) {
            return new Response(JSON.stringify({ error: "Invalid access code" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const access = await dbManager.get<{ code: string; album_id?: string; expires_at?: string }>(
            `SELECT code, album_id, expires_at
             FROM access_codes
             WHERE code = ? AND is_active = 1
               AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
             LIMIT 1`,
            [accessCode],
          );
          if (!access) {
            return new Response(JSON.stringify({ error: "Gallery not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          const photos = await dbManager.query<any>(
            `SELECT id, albumId, title, url, thumbnailUrl, watermarkUrl,
                    price, originalPrice, expires_at, created_at
             FROM photos
             WHERE access_code = ?
             ORDER BY created_at DESC
             LIMIT 250`,
            [accessCode],
          );

          const formattedPhotos = photos.map((photo: any) => {
            const previewUrl = photo.watermarkUrl || photo.thumbnailUrl || photo.url;
            return {
              id: photo.id,
              url: previewUrl,
              thumbnailUrl: photo.thumbnailUrl || previewUrl,
              title: photo.title || "Event photo",
              albumId: photo.albumId || access.album_id || accessCode,
              price: Number(photo.price) || 0,
              originalPrice: Number(photo.originalPrice) || Number(photo.price) || 0,
              discountPercentage: Number(photo.originalPrice) > 0
                ? Math.max(0, Math.round((1 - Number(photo.price) / Number(photo.originalPrice)) * 100))
                : 0,
              expiresAt: photo.expires_at || access.expires_at,
              created_at: photo.created_at,
            };
          });

          return new Response(
            JSON.stringify({
              id: `MT-${accessCode}`,
              eventName: "ClickFlash Event Gallery",
              eventDate: formattedPhotos[0]?.created_at || null,
              photos: formattedPhotos,
              totalPhotos: formattedPhotos.length,
              discountPercentage: formattedPhotos[0]?.discountPercentage || 0,
              expiresAt: access.expires_at || null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        // Customer Order Login (/api/gallery-auth/order-login)
        if (pathName === "/api/gallery-auth/order-login" && request.method === "POST") {
          const loginIp = request.headers.get("CF-Connecting-IP") ?? "unknown";
          if (!await checkPublicRateLimit(env.WEBSITE_DB, loginIp, "gallery-order-login", 10, 60_000)) {
            return new Response(JSON.stringify({ error: "Too many login attempts" }), {
              status: 429,
              headers: { "Content-Type": "application/json", "Retry-After": "60" },
            });
          }

          let body: any = {};
          try {
            body = await request.json();
          } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const accessPin = String(body.orderId || body.pin || "").trim();
          const customerEmail = String(body.customerEmail || body.email || "").trim().toLowerCase();

          if (
            !/^\d{6}$/.test(accessPin) ||
            customerEmail.length > 254 ||
            !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail)
          ) {
            return new Response(
              JSON.stringify({ success: false, error: "A 6-digit PIN and valid Email are required" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          if (!env.JWT_SECRET) {
            return new Response(JSON.stringify({ success: false, error: "Customer login is not configured" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            });
          }

          const order = await dbManager.get<CustomerOrderRecord>(
            `SELECT * FROM orders WHERE access_pin = ? AND LOWER(email) = ? LIMIT 1`,
            [accessPin, customerEmail],
          );

          if (!order) {
            return new Response(JSON.stringify({ success: false, error: "Invalid PIN or email" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const tokenPayload = {
            orderId: order.id,
            email: String(order.email || customerEmail).toLowerCase(),
            role: "customer",
            type: "order",
          };
          const token = await createToken(tokenPayload, env.JWT_SECRET);

          return new Response(
            JSON.stringify({
              success: true,
              token,
              access: "order",
              order: toCustomerOrder(order),
            }),
            { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
          );
        }

        // Customer Token Verify. POST keeps bearer material out of API URLs and caches.
        if (pathName === "/api/gallery-auth/token-verify" && request.method === "POST") {
          const verifyIp = request.headers.get("CF-Connecting-IP") ?? "unknown";
          if (!await checkPublicRateLimit(env.WEBSITE_DB, verifyIp, "gallery-token-verify", 30, 60_000)) {
            return new Response(JSON.stringify({ error: "Too many token verification attempts" }), {
              status: 429,
              headers: { "Content-Type": "application/json", "Retry-After": "60" },
            });
          }

          let verifyBody: { token?: unknown } = {};
          try {
            verifyBody = await request.json();
          } catch {
            return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
              status: 400,
              headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            });
          }
          const token = String(verifyBody.token || "").trim();
          if (!token || token.length > 2048 || !env.JWT_SECRET) {
            return new Response(JSON.stringify({ success: false, error: "Invalid or expired token" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const payload = await verifyToken(token, env.JWT_SECRET);
          let order: CustomerOrderRecord | null | undefined;

          if (payload && isCustomerToken(payload) && payload.orderId) {
            order = await dbManager.get<CustomerOrderRecord>(
              `SELECT * FROM orders WHERE id = ? AND LOWER(email) = ? LIMIT 1`,
              [payload.orderId, String(payload.email || "").toLowerCase()],
            );
          } else {
            order = await dbManager.get<CustomerOrderRecord>(
              `SELECT * FROM orders WHERE magic_link_token = ? LIMIT 1`,
              [token],
            );
          }

          if (!order) {
            return new Response(JSON.stringify({ success: false, error: "Invalid or expired token" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const sessionToken = await createToken(
            {
              orderId: order.id,
              email: String(order.email || "").toLowerCase(),
              role: "customer",
              type: "order",
            },
            env.JWT_SECRET,
          );

          return new Response(
            JSON.stringify({ success: true, token: sessionToken, access: "order", order: toCustomerOrder(order) }),
            { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
          );
        }

        // Public storefront catalog. Prices are authoritative D1 values and
        // checkout revalidates every product before creating a Stripe session.
        if (pathName === "/api/gallery/products" && request.method === "GET") {
          const productIp = request.headers.get("CF-Connecting-IP") ?? "unknown";
          if (!await checkPublicRateLimit(env.WEBSITE_DB, productIp, "gallery-products", 60, 60_000)) {
            return new Response(JSON.stringify({ error: "Too many catalog requests" }), {
              status: 429,
              headers: { "Content-Type": "application/json", "Retry-After": "60" },
            });
          }

          const products = await dbManager.query<{
            id: string;
            name: string;
            category?: string;
            price: number;
            stock?: number;
            isFeatured?: number;
          }>(
            `SELECT id, name, category, price, stock, isFeatured
             FROM products
             WHERE status IS NULL OR status = 'Active'
             ORDER BY isFeatured DESC, name ASC`,
          );

          return new Response(
            JSON.stringify({
              items: products.map((product) => ({
                ...product,
                isFeatured: Boolean(product.isFeatured),
              })),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        // Authenticated abandoned-cart snapshot. The customer order JWT owns
        // the email and album; D1 owns product names and prices.
        if (pathName === "/api/cart/snapshot" && request.method === "POST") {
          const cartIp = request.headers.get("CF-Connecting-IP") ?? "unknown";
          if (!await checkPublicRateLimit(env.WEBSITE_DB, cartIp, "cart_snapshot", 30, 60_000)) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
              status: 429,
              headers: { "Content-Type": "application/json", "Retry-After": "60" },
            });
          }

          let body: any;
          try {
            body = await request.json();
          } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
          }

          if (!env.JWT_SECRET) {
            return new Response(JSON.stringify({ error: "Cart synchronization is not configured" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            });
          }

          const cartToken = extractTokenFromHeader(request.headers.get("Authorization"));
          const cartPayload = cartToken ? await verifyToken(cartToken, env.JWT_SECRET) : null;
          if (!cartPayload || !isCustomerToken(cartPayload) || !cartPayload.orderId) {
            return new Response(JSON.stringify({ error: "Customer authentication is required" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const { items, sessionId } = body || {};
          if (!Array.isArray(items) || items.length === 0 || items.length > 100 || !isValidCartSessionId(sessionId)) {
            return new Response(
              JSON.stringify({ error: "A valid session and 1-100 cart items are required" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          try {
            const order = await dbManager.get<CustomerOrderRecord>(
              "SELECT id, email, albumId FROM orders WHERE id = ? AND LOWER(email) = ? LIMIT 1",
              [cartPayload.orderId, String(cartPayload.email || "").toLowerCase()],
            );
            const albumId = String(order?.albumId || "");
            const email = String(order?.email || "").toLowerCase();
            if (!order || !albumId || !email) {
              return new Response(JSON.stringify({ error: "Customer order was not found" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
              });
            }

            const normalizedItems = items.map((item: any) => ({
              productId: String(item?.productId || "").trim(),
              photoId: String(item?.photoId || "").trim(),
              quantity: Math.min(100, Math.max(1, Math.floor(Number(item?.quantity) || 1))),
            }));
            if (normalizedItems.some((item) => !item.productId || !item.photoId)) {
              return new Response(JSON.stringify({ error: "Every cart item requires a product and photo" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }

            const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
            const photoIds = [...new Set(normalizedItems.map((item) => item.photoId))];
            const productRows = await dbManager.query<{ id: string; name: string; price: number }>(
              `SELECT id, name, price FROM products
               WHERE id IN (${productIds.map(() => "?").join(", ")})
                 AND (status IS NULL OR status = 'Active')`,
              productIds,
            );
            const photoRows = await dbManager.query<{ id: string }>(
              `SELECT id FROM photos
               WHERE albumId = ? AND id IN (${photoIds.map(() => "?").join(", ")})`,
              [albumId, ...photoIds],
            );
            const productMap = new Map(productRows.map((product) => [product.id, product]));
            const validPhotoIds = new Set(photoRows.map((photo) => photo.id));
            if (normalizedItems.some((item) => !productMap.has(item.productId) || !validPhotoIds.has(item.photoId))) {
              return new Response(JSON.stringify({ error: "Cart contains an unavailable product or photo" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }

            const safeItems = normalizedItems.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: item.productId,
                photoId: item.photoId,
                name: product.name,
                price: Number(product.price),
                quantity: item.quantity,
              };
            });
            const total = safeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const existingCart = await env.GALLERY_DB.prepare(
              "SELECT email FROM abandoned_carts WHERE session_id = ? LIMIT 1",
            ).bind(sessionId).first() as { email?: string } | null;
            if (existingCart && String(existingCart.email || "").toLowerCase() !== email) {
              return new Response(JSON.stringify({ error: "Cart session is already in use" }), {
                status: 409,
                headers: { "Content-Type": "application/json" },
              });
            }

            // Upsert by session_id — only one active cart per browser session
            await env.GALLERY_DB.prepare(`
              INSERT INTO abandoned_carts (id, email, album_id, items, total, currency, session_id, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(session_id) DO UPDATE SET
                email = excluded.email,
                album_id = excluded.album_id,
                items = excluded.items,
                total = excluded.total,
                currency = excluded.currency,
                updated_at = CURRENT_TIMESTAMP
            `).bind(
              crypto.randomUUID(),
              email,
              albumId,
              JSON.stringify(safeItems),
              total,
              "eur",
              sessionId,
            ).run();

            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          } catch (e: any) {
            logger.error("[CartSnapshot] Error:", { args: [e] });
            return new Response(
              JSON.stringify({ error: "Failed to save cart snapshot" }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }
        }

        // Authenticated recovery acknowledgement for the current browser cart.
        if (pathName === "/api/cart/recovered" && request.method === "POST") {
          let body: any;
          try {
            body = await request.json();
          } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
          }

          const { sessionId } = body || {};
          if (!isValidCartSessionId(sessionId) || !env.JWT_SECRET) {
            return new Response(JSON.stringify({ error: "Valid sessionId required" }), { status: 400 });
          }

          const cartToken = extractTokenFromHeader(request.headers.get("Authorization"));
          const cartPayload = cartToken ? await verifyToken(cartToken, env.JWT_SECRET) : null;
          if (!cartPayload || !isCustomerToken(cartPayload) || !cartPayload.email) {
            return new Response(JSON.stringify({ error: "Customer authentication is required" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          try {
            await env.GALLERY_DB.prepare(`
              UPDATE abandoned_carts SET recovered = 1, recovered_at = CURRENT_TIMESTAMP
              WHERE session_id = ? AND LOWER(email) = ?
            `).bind(sessionId, String(cartPayload.email).toLowerCase()).run();
            return new Response(JSON.stringify({ success: true }), { status: 200 });
          } catch {
            return new Response(JSON.stringify({ error: "Failed" }), { status: 500 });
          }
        }

        // Public: Resolve effective prices for a hotel (dynamic pricing)
        if (pathName === "/api/pricing" && request.method === "GET") {
          const hotelId = url.searchParams.get("hotelId") || null;
          const dateStr = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

          try {
            // 1. Fetch all active products
            const productsResult = await env.GALLERY_DB.prepare(
              `SELECT id, name, category, price, tier, description FROM products WHERE status = 'Active' OR status IS NULL`
            ).all();
            const products = (productsResult.results || []) as any[];

            // 2. Fetch hotel-specific overrides (if hotelId provided)
            let overrideMap = new Map<string, number>();
            if (hotelId) {
              const overrides = await env.GALLERY_DB.prepare(
                `SELECT product_id, price FROM pricing_overrides WHERE hotel_id = ?`
              ).bind(hotelId).all();
              for (const o of (overrides.results || []) as any[]) {
                overrideMap.set(o.product_id, o.price);
              }
            }

            // 3. Find applicable seasonal rate (highest priority wins)
            let multiplier = 1.0;
            const seasonQuery = hotelId
              ? `SELECT multiplier FROM seasonal_rates WHERE is_active = 1 AND start_date <= ? AND end_date >= ? AND (hotel_id IS NULL OR hotel_id = ?) ORDER BY priority DESC LIMIT 1`
              : `SELECT multiplier FROM seasonal_rates WHERE is_active = 1 AND start_date <= ? AND end_date >= ? AND hotel_id IS NULL ORDER BY priority DESC LIMIT 1`;
            const seasonParams = hotelId ? [dateStr, dateStr, hotelId] : [dateStr, dateStr];
            const seasonResult = (await env.GALLERY_DB.prepare(seasonQuery).bind(...seasonParams).first()) as { multiplier: number } | null;
            if (seasonResult?.multiplier) {
              multiplier = seasonResult.multiplier;
            }

            // 4. Compute effective prices
            const resolved = products.map((p: any) => {
              const basePrice = overrideMap.has(p.id) ? overrideMap.get(p.id)! : p.price;
              return {
                id: p.id,
                name: p.name,
                category: p.category,
                tier: p.tier,
                description: p.description,
                basePrice: p.price,
                effectivePrice: Math.round(basePrice * multiplier * 100) / 100,
                multiplier,
                hasOverride: overrideMap.has(p.id),
              };
            });

            return new Response(JSON.stringify({ products: resolved, date: dateStr, hotelId, multiplier }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          } catch (e: any) {
            logger.error("[Pricing] Error:", { args: [e] });
            return new Response(JSON.stringify({ error: "Failed to resolve pricing" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        if (pathName === "/api/auth/login" && request.method === "POST") {
          const parsed = (await request.json()) as any;
          const validation = validateLogin(parsed);
          if (!validation.success || !validation.data) {
            return new Response(
              JSON.stringify({
                error: "Validation Error",
                message: validation.error || "Invalid credentials",
              }),
              { status: 400 },
            );
          }
          const { email, password } = validation.data;

          // Brute-force protection — check before touching the DB for the user
          const clientIp = request.headers.get('CF-Connecting-IP') ??
                           request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
                           'unknown';
          const rateLimit = await checkLoginRateLimit(dbManager, email, clientIp);
          if (!rateLimit.allowed) {
            return new Response(
              JSON.stringify({
                error: "Too Many Requests",
                message: "Too many failed login attempts. Please try again later.",
              }),
              {
                status: 429,
                headers: {
                  'Retry-After': String(rateLimit.retryAfterSeconds ?? 900),
                  'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + (rateLimit.retryAfterSeconds ?? 900)),
                },
              },
            );
          }

          const user = (await dbManager.get(
            "SELECT * FROM users WHERE email = ?",
            [email],
          )) as any;
          const passwordOk = user && (await verifyPassword(password, user.password));

          // Record attempt before returning to prevent timing oracle
          await recordLoginAttempt(dbManager, email, clientIp, !!passwordOk);

          if (!passwordOk) {
            return new Response(
              JSON.stringify({
                error: "Auth Error",
                message: "Invalid email or password",
              }),
              { status: 401 },
            );
          }

          // Generate proper JWT token
          const token = await createToken(
            {
              userId: user.id,
              email: user.email,
              role: user.role,
            },
            env.JWT_SECRET
          );

          delete user.password;
          return new Response(JSON.stringify({ token, user }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Protected Routes Middleware Pattern
        if (pathName.startsWith("/api/")) {
          const authHeader = request.headers.get("Authorization");
          const token = extractTokenFromHeader(authHeader);
          
          if (!token) {
            return new Response(
              JSON.stringify({
                error: "Auth Error",
                message: "Authentication required",
              }),
              {
                status: 401,
              },
            );
          }
          
          // Verify JWT token
          const payload = await verifyToken(token, env.JWT_SECRET);
          if (!payload) {
            return new Response(
              JSON.stringify({
                error: "Auth Error",
                message: "Invalid or expired token",
              }),
              {
                status: 401,
              },
            );
          }
          
          // Attach user context for use in route handlers
          const userContext = { user: payload };

          // Short-lived (15-min) Signed High-Res Download URL
          const downloadMatch = pathName.match(/^\/api\/photos\/([^/]+)\/download-url$/);
          if (downloadMatch && request.method === "GET") {
            const photoId = downloadMatch[1];
            const photos = await dbManager.query<DownloadablePhotoRecord>(
              "SELECT id, albumId, url, storagePath FROM photos WHERE id = ?",
              [photoId],
            );
            if (photos.length === 0) {
              return new Response(JSON.stringify({ error: "Photo not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
              });
            }
            const photo = photos[0];
            let authorized = isStaffToken(payload);

            if (!authorized && isCustomerToken(payload) && payload.orderId) {
              const sessionOrder = await dbManager.get<CustomerOrderRecord>(
                "SELECT id, email, albumId, items FROM orders WHERE id = ? AND LOWER(email) = ? LIMIT 1",
                [payload.orderId, String(payload.email || "").toLowerCase()],
              );
              if (sessionOrder && canOrderViewPhoto(sessionOrder, photo)) {
                const customerOrders = await dbManager.query<CustomerOrderRecord>(
                  "SELECT id, email, status, albumId, items FROM orders WHERE LOWER(email) = ?",
                  [String(payload.email || "").toLowerCase()],
                );
                authorized = customerOrders.some((order) => canOrderDownloadPhoto(order, photo));
              }
            }

            if (!authorized) {
              return new Response(JSON.stringify({ error: "This order does not include the requested photo" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
              });
            }

            const storageKey = getPhotoStorageKey(photo);
            if (!storageKey) {
              return new Response(JSON.stringify({ error: "Photo storage path is invalid" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              });
            }

            const signedUrlService = new R2SignedUrlService({
              secret: env.JWT_SECRET,
              defaultTtlSeconds: 900,
            });
            const signedPath = await signedUrlService.generateSignedUrl(storageKey, 900);
            const downloadUrl = `https://${url.host}${signedPath}`;
            return new Response(
              JSON.stringify({
                success: true,
                downloadUrl,
                expiresInSeconds: 900,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
              },
            );
          }

          // Stripe return reconciliation. The session must belong to the
          // authenticated customer; Stripe remains the payment source of truth.
          const checkoutSessionMatch = pathName.match(/^\/api\/checkout\/sessions\/([^/]+)$/);
          if (checkoutSessionMatch && request.method === "GET") {
            const sessionId = decodeURIComponent(checkoutSessionMatch[1]);
            if (!isCustomerToken(payload) || !payload.email || !isValidStripeCheckoutSessionId(sessionId)) {
              return new Response(JSON.stringify({ error: "Invalid checkout session" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }

            const checkoutOrder = await dbManager.get<CustomerOrderRecord & { stripe_session_id?: string }>(
              `SELECT id, email, status, total, totalAmount, albumId, stripe_session_id
               FROM orders
               WHERE stripe_session_id = ? AND LOWER(email) = ?
               LIMIT 1`,
              [sessionId, String(payload.email).toLowerCase()],
            );
            if (!checkoutOrder) {
              return new Response(JSON.stringify({ error: "Checkout session not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
              });
            }

            let status = String(checkoutOrder.status || "").toLowerCase();
            if (!new Set(["paid", "completed", "delivered", "fulfilled"]).has(status) && env.STRIPE_SECRET_KEY) {
              const stripeResponse = await fetch(
                `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
                { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } },
              );
              if (stripeResponse.ok) {
                const stripeSession = await stripeResponse.json() as any;
                const referencesOrder = stripeSession.client_reference_id === checkoutOrder.id &&
                  stripeSession.metadata?.orderId === checkoutOrder.id;
                if (referencesOrder && stripeSession.payment_status === "paid") {
                  await env.GALLERY_DB.prepare(`
                    UPDATE orders
                    SET status = 'paid', total = ?, totalAmount = ?,
                        stripe_payment_intent = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND stripe_session_id = ?
                  `).bind(
                    Number(stripeSession.amount_total || 0) / 100,
                    Number(stripeSession.amount_total || 0) / 100,
                    stripeSession.payment_intent || null,
                    checkoutOrder.id,
                    sessionId,
                  ).run();

                  const cartSessionId = stripeSession.metadata?.cartSessionId;
                  if (isValidCartSessionId(cartSessionId)) {
                    await env.GALLERY_DB.prepare(`
                      UPDATE abandoned_carts
                      SET recovered = 1, recovered_at = CURRENT_TIMESTAMP
                      WHERE session_id = ? AND LOWER(email) = ?
                    `).bind(cartSessionId, String(payload.email).toLowerCase()).run();
                  }
                  status = "paid";
                }
              }
            }

            return new Response(
              JSON.stringify({
                success: true,
                orderId: checkoutOrder.id,
                status,
                paid: new Set(["paid", "completed", "delivered", "fulfilled"]).has(status),
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
              },
            );
          }

          // Customer proofing is stored on this order's photo snapshot so each
          // customer can review only the images included in their own gallery.
          const proofingMatch = pathName.match(
            /^\/api\/gallery\/orders\/([^/]+)\/photos\/([^/]+)\/proofing$/,
          );
          if (proofingMatch && request.method === "PATCH") {
            const [, orderId, photoId] = proofingMatch.map((value) => decodeURIComponent(value));
            if (!isCustomerToken(payload) || payload.orderId !== orderId) {
              return new Response(JSON.stringify({ error: "This order is outside the authenticated gallery" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
              });
            }

            let proofingBody: { status?: unknown } = {};
            try {
              proofingBody = await request.json();
            } catch {
              return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }

            const status = String(proofingBody.status || "");
            if (!new Set(["approved", "rejected", "pending"]).has(status)) {
              return new Response(JSON.stringify({ error: "Invalid proofing status" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }

            const order = await dbManager.get<CustomerOrderRecord>(
              "SELECT id, email, items FROM orders WHERE id = ? AND LOWER(email) = ? LIMIT 1",
              [orderId, String(payload.email || "").toLowerCase()],
            );
            if (!order) {
              return new Response(JSON.stringify({ error: "Order not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
              });
            }

            const update = updateOrderPhotoProofingStatus(
              order.items,
              photoId,
              status as "approved" | "rejected" | "pending",
            );
            if (!update.found) {
              return new Response(JSON.stringify({ error: "Photo is outside the authenticated order" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
              });
            }

            await dbManager.run(
              "UPDATE orders SET items = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              [JSON.stringify(update.items), orderId],
            );
            return new Response(JSON.stringify({ success: true, photoId, status }), {
              status: 200,
              headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            });
          }

          // Modern REST endpoints
          const restResponse = await handleRest(request, url, pathName, dbManager, payload);
          if (restResponse) {
            return restResponse;
          }

          // File Serving (R2) with Law 13 Hardware Hardening
          if (pathName.startsWith("/api/files/")) {
            const storageKey = pathName.replace("/api/files/", "");

            const segments = storageKey.split("/");
            const filename = segments[segments.length - 1];
            const photoId = filename
              .replace(/\.[^.]+$/, "")
              .replace(/_(preview|preview_wm|thumb|tiny|watermarked)$/, "");
            const photo = await dbManager.get<DownloadablePhotoRecord>(
              "SELECT id, albumId, url, storagePath FROM photos WHERE id = ? LIMIT 1",
              [photoId],
            );

            let customerOrders: CustomerOrderRecord[] = [];
            if (isCustomerToken(payload) && payload.orderId) {
              const sessionOrder = await dbManager.get<CustomerOrderRecord>(
                "SELECT id, email, status, albumId, items FROM orders WHERE id = ? AND LOWER(email) = ? LIMIT 1",
                [payload.orderId, String(payload.email || "").toLowerCase()],
              );
              if (!sessionOrder || !photo || !canOrderViewPhoto(sessionOrder, photo)) {
                return new Response(JSON.stringify({ error: "This photo is outside the authenticated gallery" }), {
                  status: 403,
                  headers: { "Content-Type": "application/json" },
                });
              }
              customerOrders = await dbManager.query<CustomerOrderRecord>(
                "SELECT id, email, status, albumId, items FROM orders WHERE LOWER(email) = ?",
                [String(payload.email || "").toLowerCase()],
              );
            } else if (!isStaffToken(payload)) {
              return new Response(JSON.stringify({ error: "Gallery or staff access is required" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
              });
            }

            // Raw uploads and explicit highres paths are originals. Only named
            // preview/thumbnail variants may be served before purchase.
            const isPreview =
              /\/(thumbs?|previews?|tiny|watermarked)\//.test(storageKey) ||
              /_(preview|preview_wm|thumb|tiny|watermarked)\.[^.]+$/.test(filename);
            const isHighRes = !isPreview;

            if (isHighRes) {
              const isPurchased = isStaffToken(payload) || Boolean(
                photo && customerOrders.some((order) => canOrderDownloadPhoto(order, photo)),
              );

              if (!isPurchased) {
                // FALLBACK Logic: If not purchased, try to serve the watermarked preview
                const wmKey = storageKey
                  .replace("/highres/", "/thumbs/")
                  .replace(/\.[^.]+$/, "_preview_wm.webp");
                const wmObject = await env.GALLERY_BUCKET.get(wmKey);

                if (wmObject) {
                  const headers = new Headers();
                  wmObject.writeHttpMetadata(headers);
                  headers.set("Cache-Control", "public, max-age=3600"); // Shorter cache for previews
                  headers.set("X-Access-Target", "preview-watermarked");
                  return new Response(wmObject.body, { headers });
                }

                // If no watermark exists, return Paywall required
                return new Response(
                  JSON.stringify({
                    error: "Payment Required",
                    message: "High-resolution access requires a completed order.",
                    photoId: photoId,
                  }),
                  {
                    status: 402,
                    headers: {
                      "Content-Type": "application/json",
                    },
                  },
                );
              }
            }

            // Authorized or Low-Res (Preview/Thumb): Proceed to R2
            const object = await env.GALLERY_BUCKET.get(storageKey);

            if (!object) {
              return new Response(
                JSON.stringify({
                  error: "Not Found",
                  message: "File not found in storage",
                }),
                {
                  status: 404,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }

            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set("etag", object.httpEtag);
            headers.set("Cache-Control", "public, max-age=31536000, immutable");

            return new Response(object.body, { headers });
          }
        }

        // --- Phase 61: High-Volume Photo Upload & Chunked Upload (Sync Engine) ---
        if ((pathName === "/api/cloud/upload-photo" || pathName === "/api/cloud/upload-photo/chunk") && request.method === "POST") {
          const contentType = request.headers.get("content-type") || "";
          if (!contentType.includes("multipart/form-data")) {
            return new Response(
              JSON.stringify({
                error: "Bad Request",
                message: "Multipart form data required",
              }),
              {
                status: 400,
              },
            );
          }

          try {
            const formData = await request.formData();
            const file = formData.get("file") as unknown as File;
            const photoId = formData.get("photoId") as string;
            const albumId = formData.get("albumId") as string;
            const deskId = (formData.get("deskId") || formData.get("desk_id") || "unknown") as string;
            const chunkIndex = parseInt((formData.get("chunkIndex") || "0") as string, 10);
            const totalChunks = parseInt((formData.get("totalChunks") || "1") as string, 10);
            const originalName = (formData.get("originalName") || (file && file.name) || photoId) as string;

            if (!file || !photoId || !albumId) {
              return new Response(
                JSON.stringify({
                  error: "Bad Request",
                  message: "Missing required fields",
                }),
                {
                  status: 400,
                },
              );
            }

            if (totalChunks > 1) {
              // Chunked upload flow
              if (chunkIndex < totalChunks - 1) {
                const chunkKey = `_chunks/${deskId}/${albumId}/${photoId}.part_${chunkIndex}`;
                await env.GALLERY_BUCKET.put(chunkKey, await file.arrayBuffer());
                return new Response(JSON.stringify({ success: true, chunkIndex, completed: false }), {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                });
              }

              // Final chunk: reassemble all chunks
              const chunkBuffers: Uint8Array[] = [];
              let totalSize = 0;
              for (let i = 0; i < totalChunks - 1; i++) {
                const partKey = `_chunks/${deskId}/${albumId}/${photoId}.part_${i}`;
                const obj = await env.GALLERY_BUCKET.get(partKey);
                if (!obj) {
                  return new Response(
                    JSON.stringify({ error: "Missing chunk", message: `Chunk ${i} not found in storage` }),
                    { status: 400, headers: { "Content-Type": "application/json" } },
                  );
                }
                const buf = new Uint8Array(await obj.arrayBuffer());
                chunkBuffers.push(buf);
                totalSize += buf.byteLength;
              }
              const finalBuf = new Uint8Array(await file.arrayBuffer());
              chunkBuffers.push(finalBuf);
              totalSize += finalBuf.byteLength;

              const merged = new Uint8Array(totalSize);
              let offset = 0;
              for (const b of chunkBuffers) {
                merged.set(b, offset);
                offset += b.byteLength;
              }

              // Cleanup temporary chunks
              for (let i = 0; i < totalChunks - 1; i++) {
                const partKey = `_chunks/${deskId}/${albumId}/${photoId}.part_${i}`;
                await env.GALLERY_BUCKET.delete(partKey).catch(() => {});
              }

              const metadata = await photoProcessor.processPhoto(
                merged.buffer,
                originalName,
                albumId,
                photoId,
              );

              await env.GALLERY_DB.prepare(
                `
                            INSERT INTO photos (id, albumId, url, status, desk_id, created_at)
                            VALUES (?, ?, ?, 'available', ?, CURRENT_TIMESTAMP)
                            ON CONFLICT(id) DO UPDATE SET
                                url = EXCLUDED.url,
                                status = EXCLUDED.status,
                                desk_id = EXCLUDED.desk_id,
                                updated_at = CURRENT_TIMESTAMP
                        `,
              )
                .bind(photoId, albumId, metadata.url, deskId || "unknown")
                .run();

              return new Response(JSON.stringify({ success: true, metadata, completed: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }

            // Single-part upload flow
            const arrayBuffer = await file.arrayBuffer();
            const metadata = await photoProcessor.processPhoto(
              arrayBuffer,
              originalName,
              albumId,
              photoId,
            );

            // Insert/Update in D1
            await env.GALLERY_DB.prepare(
              `
                          INSERT INTO photos (id, albumId, url, status, desk_id, created_at)
                          VALUES (?, ?, ?, 'available', ?, CURRENT_TIMESTAMP)
                          ON CONFLICT(id) DO UPDATE SET
                              url = EXCLUDED.url,
                              status = EXCLUDED.status,
                              desk_id = EXCLUDED.desk_id,
                              updated_at = CURRENT_TIMESTAMP
                      `,
            )
              .bind(photoId, albumId, metadata.url, deskId || "unknown")
              .run();

            return new Response(JSON.stringify({ success: true, metadata, completed: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          } catch (err: any) {
            logger.error("[Upload] Error:", { args: [err.message] });
            return new Response(
              JSON.stringify({ error: "Upload Error", message: err.message }),
              {
                status: 500,
              },
            );
          }
        }

        return new Response("Not Found", { status: 404 });
      } catch (e: any) {
        return new Response(
          JSON.stringify({ error: "Server Error", message: e.message }),
          {
            status: 500,
          },
        );
      }
    })();

    // Apply CORS headers + security hardening headers to every response
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    // Security headers — this worker serves JSON APIs, not HTML pages
    const securityHeaders: Record<string, string> = {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy":
        "default-src 'none'; img-src * data: blob:; " +
        "connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    };
    Object.entries(securityHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      ...response,
      status: response.status,
      headers,
    });
  },
};

/**
 * P0-4: MoneyTrash R2 Auto-Deletion
 *
 * Finds photos whose access code has expired (access_codes.expires_at < now)
 * AND the photo has not been purchased (status='available'). For each, deletes
 * the R2 object (preview, thumb, watermarked, highres) and marks the photo
 * as expired. Audit row recorded in moneytrash_deletion_log.
 *
 * Runs hourly via the Cloudflare Cron Trigger. Limit: 100 photos per run to
 * stay within Worker CPU budget. Unprocessed photos are picked up next run.
 */
async function purgeExpiredMoneyTrashPhotos(env: Env): Promise<void> {
  if (!env.GALLERY_BUCKET) {
    logger.info(String("[MoneyTrash] GALLERY_BUCKET not bound — skipping R2 purge"));
    return;
  }

  const nowIso = new Date().toISOString();

  // Find candidate photos:
  //   - photo.status = 'available' (not purchased)
  //   - photo.access_code IS NOT NULL (it's a MoneyTrash upload, not a regular photo)
  //   - access_codes.expires_at < now
  //   - AND the access code itself is still active (don't double-process)
  const candidates = await env.GALLERY_DB.prepare(`
    SELECT p.id, p.url, p.thumbnailUrl, p.storagePath, p.access_code
      FROM photos p
      JOIN access_codes ac ON ac.code = p.access_code
     WHERE p.status = 'available'
       AND p.access_code IS NOT NULL
       AND ac.expires_at IS NOT NULL
       AND ac.expires_at < ?
     LIMIT 100
  `).bind(nowIso).all() as any;

  if (!candidates.results || candidates.results.length === 0) {
    return;
  }

  logger.info(String(`[MoneyTrash] Purging ${candidates.results.length} expired photo(s)`));

  // Ensure audit table exists (idempotent)
  await env.GALLERY_DB.prepare(`
    CREATE TABLE IF NOT EXISTS moneytrash_deletion_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_id TEXT NOT NULL,
      access_code TEXT,
      r2_keys_deleted TEXT,
      deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL,
      error TEXT
    )
  `).run();

  for (const photo of candidates.results) {
    const r2Keys: string[] = [];
    const errors: string[] = [];
    try {
      // Derive R2 keys from the photo URL pattern: photos are stored at
      //   photos/{id}/highres.jpg
      //   photos/{id}/thumb.jpg
      //   photos/{id}/preview.jpg
      // The `storagePath` column may carry the canonical key; fall back to URL parsing.
      const baseKey = (photo.storagePath && photo.storagePath.startsWith("photos/"))
        ? photo.storagePath
        : `photos/${photo.id}/highres.jpg`;
      // Extract the photos/<id> prefix and try common variants
      const photosPrefix = baseKey.replace(/\/[^/]+$/, "");  // strip filename
      const candidateKeys = [
        `${photosPrefix}/highres.jpg`,
        `${photosPrefix}/preview.jpg`,
        `${photosPrefix}/thumb.jpg`,
        `${photosPrefix}/tiny.jpg`,
        `${photosPrefix}/preview_wm.webp`,
      ];

      for (const key of candidateKeys) {
        try {
          await env.GALLERY_BUCKET.delete(key);
          r2Keys.push(key);
        } catch (r2err: any) {
          // Per-key failures are not fatal — the photo row is updated regardless.
          // We log so an operator can investigate stale R2 objects later.
          errors.push(`${key}: ${r2err?.message || String(r2err)}`);
        }
      }

      // Mark photo as expired (do NOT delete the row — keep for audit trail)
      await env.GALLERY_DB.prepare(
        `UPDATE photos SET status = 'expired', updated_at = ? WHERE id = ?`
      ).bind(nowIso, photo.id).run();

      // Audit log
      await env.GALLERY_DB.prepare(`
        INSERT INTO moneytrash_deletion_log (photo_id, access_code, r2_keys_deleted, status, error)
        VALUES (?, ?, ?, 'success', ?)
      `).bind(photo.id, photo.access_code, JSON.stringify(r2Keys), errors.length > 0 ? errors.join("; ") : null).run();

      logger.info(String(`[MoneyTrash] Purged ${photo.id} (${r2Keys.length} R2 objects)`));
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      await env.GALLERY_DB.prepare(`
        INSERT INTO moneytrash_deletion_log (photo_id, access_code, r2_keys_deleted, status, error)
        VALUES (?, ?, ?, 'failed', ?)
      `).bind(photo.id, photo.access_code, JSON.stringify(r2Keys), errMsg).run();
      logger.error(String(`[MoneyTrash] Failed to purge ${photo.id}:`) + ' ' + String(errMsg));
    }
  }
}

/**
 * Abandoned Cart Recovery — Cron Trigger
 * Runs hourly to find carts idle for >1 hour and sends recovery emails via Resend.
 */
async function handleScheduled(env: Env): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await env.WEBSITE_DB.prepare("DELETE FROM rate_limit_events WHERE ts < ?").bind(cutoff).run();
    await env.GALLERY_DB.prepare("DELETE FROM login_attempts WHERE created_at < ?").bind(cutoff).run();
  } catch (e: any) {
    logger.warn("[Cron] Rate-limit cleanup failed", { args: [e] });
  }

  // P0-4: MoneyTrash R2 auto-deletion runs FIRST, regardless of RESEND_API_KEY.
  // Expired photos need to be reaped even if the email job is disabled.
  try {
    await purgeExpiredMoneyTrashPhotos(env);
  } catch (e: any) {
    logger.error(`[Cron] MoneyTrash purge failed:`, { args: [e] });
  }

  if (!env.RESEND_API_KEY) {
    logger.info(String("[Cron] RESEND_API_KEY not set — skipping abandoned cart emails"));
    return;
  }

  // Find carts that are:
  // - older than 1 hour (customer had time to come back)
  // - not yet recovered (recovered = 0)
  // - first email not yet sent (recovery_sent = 0)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const result = await env.GALLERY_DB.prepare(`
    SELECT id, email, album_id, items, total, currency
    FROM abandoned_carts
    WHERE recovery_sent = 0 AND recovered = 0 AND updated_at < ?
    LIMIT 20
  `).bind(oneHourAgo).all();

  if (!result.results || result.results.length === 0) return;

  for (const cart of result.results as any[]) {
    try {
      const items = JSON.parse(cart.items || "[]");
      const itemSummary = items.slice(0, 3).map((i: any) => i.name || "Photo").join(", ");
      const currencySymbol = cart.currency === "usd" ? "$" : cart.currency === "gbp" ? "£" : cart.currency === "tnd" ? "TND " : "€";
      const totalFormatted = `${currencySymbol}${Number(cart.total).toFixed(2)}`;

      const galleryLink = cart.album_id
        ? `https://gallery.clickflash.com/album/${cart.album_id}`
        : "https://gallery.clickflash.com";

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e293b;">You left something behind!</h2>
          <p style="color: #475569; font-size: 16px;">
            Hi there! We noticed you had some beautiful photos in your cart but didn't complete your purchase.
          </p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Your items:</p>
            <p style="margin: 0; font-weight: 600; color: #1e293b;">${itemSummary}${items.length > 3 ? ` + ${items.length - 3} more` : ""}</p>
            <p style="margin: 8px 0 0; font-size: 20px; font-weight: 700; color: #16a34a;">${totalFormatted}</p>
          </div>
          <a href="${galleryLink}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Complete Your Purchase
          </a>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
            Your photos are waiting for you. If you have any questions, just reply to this email.
          </p>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "ClickFlash Gallery <gallery@clickflash.com>",
          to: [cart.email],
          subject: "Your photos are still waiting for you!",
          html: emailHtml,
        }),
      });

      // Mark as sent
      await env.GALLERY_DB.prepare(
        `UPDATE abandoned_carts SET recovery_sent = 1 WHERE id = ?`
      ).bind(cart.id).run();
    } catch (e) {
      logger.error(String(`[Cron] Failed to send recovery email to ${cart.email}:`) + ' ' + String(e));
    }
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return galleryHandler.fetch(request, env);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },
};
