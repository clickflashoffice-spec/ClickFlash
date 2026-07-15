import { createToken, verifyToken, extractTokenFromHeader } from "../jwt.js";
import { checkLoginRateLimit, recordLoginAttempt } from "../loginRateLimiter.js";
import { validateLogin } from "../validation.js";
import { verifyPassword } from "../auth.js";
import { handlePayments } from "../payments.js";

import { checkPublicRateLimit } from "../server.js";
import { logger } from "@clickflash/logger";

export const handlePublic = async (request: Request, url: URL, pathName: string, env: any, dbManager: any, corsHeaders: any, photoProcessor: any) => {

        // Public Routes
        if (pathName === "/api/health") {
          return new Response(
            JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        }


        // Public: Stripe Checkout (no auth required for customers)
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

          const { items, customerEmail, albumId, currency: rawCurrency } = body || {};

          // Validate currency — Stripe ISO 4217 lowercase codes
          const ALLOWED_CURRENCIES = ["eur", "usd", "gbp", "tnd"];
          const currency = ALLOWED_CURRENCIES.includes(String(rawCurrency).toLowerCase())
            ? String(rawCurrency).toLowerCase()
            : "eur";

          // SECURITY: Server-side price validation — never trust client prices
          if (!items || !Array.isArray(items) || items.length === 0) {
            return new Response(
              JSON.stringify({ error: "At least one item is required" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          try {
            // Look up canonical prices from D1 products table
            const productIds = items.map((item: any) => item.productId || item.id).filter(Boolean);
            if (productIds.length === 0) {
              return new Response(
                JSON.stringify({ error: "Each item must have a productId" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            const placeholders = productIds.map(() => "?").join(", ");
            const dbProducts = await env.GALLERY_DB.prepare(
              `SELECT id, name, price, category FROM products WHERE id IN (${placeholders}) AND (status IS NULL OR status = 'Active')`
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
            for (const item of items as any[]) {
              const pid = item.productId || item.id;
              const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));

              // Try product catalog first
              const product = productMap.get(pid);
              if (product) {
                lineItems.push({
                  name: product.name,
                  unitAmount: Math.round(product.price * 100),
                  quantity,
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
                continue;
              }
              if (albumPricing && pid === "album_single" && albumPricing.price_single > 0) {
                lineItems.push({
                  name: `Single Photo - ${albumPricing.title}`,
                  unitAmount: Math.round(albumPricing.price_single * 100),
                  quantity,
                });
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
            const stripeParams = new URLSearchParams();
            stripeParams.append("payment_method_types[]", "card");
            stripeParams.append("mode", "payment");
            stripeParams.append("success_url", `https://gallery.clickflash.com/success?session_id={CHECKOUT_SESSION_ID}`);
            stripeParams.append("cancel_url", `https://gallery.clickflash.com/cancel`);
            if (customerEmail) stripeParams.append("customer_email", customerEmail);
            if (albumId) stripeParams.append("metadata[albumId]", albumId);

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

            return new Response(
              JSON.stringify({ sessionId: session.id, url: session.url }),
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
                logger.info(String(`[Webhook] Order already exists for session ${session.id} (dedup)`));
              } else {
                await env.GALLERY_DB.prepare(`
                  INSERT INTO orders (id, clientName, email, status, totalAmount, albumId, stripe_session_id, created_at)
                  VALUES (?, ?, ?, 'paid', ?, ?, ?, CURRENT_TIMESTAMP)
                `).bind(
                  crypto.randomUUID(),
                  session.customer_details?.name || 'Guest',
                  session.customer_email,
                  session.amount_total ? session.amount_total / 100 : 0,
                  session.metadata?.albumId || '',
                  session.id
                ).run();
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


        // Money Trash Public Gallery Endpoint
        const mtMatch = pathName.match(/^\/api\/moneytrash\/gallery\/([^/]+)$/);

        if (mtMatch && request.method === "GET") {
          const accessCode = mtMatch[1].trim();
          const photos = await dbManager.query(
            "SELECT * FROM photos WHERE access_code = ? AND status = 'available'",
            [accessCode],
          );
          if (!photos || photos.length === 0) {
            return new Response(JSON.stringify({ error: "No photos found" }), {
              status: 404,
            });
          }
          return new Response(
            JSON.stringify({
              id: `MT-${accessCode}`,
              eventName: "Archived Event",
              eventDate:
                (photos[0] as any).created_at || new Date().toISOString(),
              photos: photos,
              discountPercentage: 50,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }


        // Website Portfolio (Public)
        if (pathName === "/api/website/portfolio" && request.method === "GET") {
          const url = new URL(request.url);
          const category = url.searchParams.get("category");
          const featured = url.searchParams.get("featured") === "true";

          let query = "SELECT * FROM portfolio_items WHERE 1=1";
          const params: any[] = [];

          if (category && category !== "All") {
            query += " AND category = ?";
            params.push(category);
          }
          if (featured) {
            query += " AND is_featured = 1";
          }
          query += " ORDER BY created_at DESC";

          const stmt = env.WEBSITE_DB.prepare(query);
          const result = await stmt.bind(...params).all();

          return new Response(
            JSON.stringify({
              items: result.results || [],
              count: result.results?.length || 0,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }


        // Website Access Code Validation (Public)
        if (pathName === "/api/website/access-code" && request.method === "POST") {
          const { code } = (await request.json()) as any;

          if (!code) {
            return new Response(
              JSON.stringify({
                error: "Validation Error",
                message: "Code is required",
              }),
              {
                status: 400,
              },
            );
          }

          const accessCode = await env.WEBSITE_DB.prepare(
            `SELECT * FROM access_codes WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))`
          ).bind(code.trim().toUpperCase()).first();

          if (!accessCode) {
            return new Response(
              JSON.stringify({
                error: "Invalid Code",
                message: "Invalid or expired access code",
              }),
              {
                status: 401,
              },
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: "Access granted",
              redirectUrl: accessCode.redirect_url || `https://gallery.clickflash.com/album/${accessCode.album_id}`,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }


        // Public: Abandoned Cart Snapshot (no auth — customers don't have accounts)
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

          const { email, albumId, items, total, currency, sessionId } = body || {};
          if (!email || !items || !Array.isArray(items) || items.length === 0 || !sessionId) {
            return new Response(
              JSON.stringify({ error: "email, items[], and sessionId are required" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          try {
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
              String(email).toLowerCase().trim(),
              albumId || null,
              JSON.stringify(items),
              Number(total) || 0,
              String(currency || "eur").toLowerCase(),
              String(sessionId)
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


        // Public: Mark cart as recovered (called after successful checkout)
        if (pathName === "/api/cart/recovered" && request.method === "POST") {
          let body: any;
          try {
            body = await request.json();
          } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
          }

          const { sessionId } = body || {};
          if (!sessionId) {
            return new Response(JSON.stringify({ error: "sessionId required" }), { status: 400 });
          }

          try {
            await env.GALLERY_DB.prepare(`
              UPDATE abandoned_carts SET recovered = 1, recovered_at = CURRENT_TIMESTAMP
              WHERE session_id = ?
            `).bind(String(sessionId)).run();
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


        // --- Phase 61: High-Volume Photo Upload (Sync Engine) ---
        if (pathName === "/api/cloud/upload-photo" && request.method === "POST") {
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
            const deskId = formData.get("desk_id") as string;

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

            // Process photo (Saves to R2)
            const arrayBuffer = await file.arrayBuffer();
            const metadata = await photoProcessor.processPhoto(
              arrayBuffer,
              file.name,
              albumId,
              photoId,
            );

            // Insert/Update in D1
            // Track source desk for auditing
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

            return new Response(JSON.stringify({ success: true, metadata }), {
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


        // --- Website API Routes (Public) ---
        // Contact Form
        if (pathName === "/api/website/contact" && request.method === "POST") {
          // Rate limit: 5 contact form submissions per 10 minutes per IP
          const contactIp = request.headers.get("CF-Connecting-IP") ?? "unknown";
          if (!await checkPublicRateLimit(env.WEBSITE_DB, contactIp, "contact", 5, 600_000)) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded", message: "Too many requests. Please try again later." }), {
              status: 429,
              headers: { "Content-Type": "application/json", "Retry-After": "600", ...corsHeaders },
            });
          }
          const { name, email, service, message } = (await request.json()) as any;

          if (!name || !email || !message) {
            return new Response(
              JSON.stringify({
                error: "Validation Error",
                message: "Missing required fields",
              }),
              {
                status: 400,
              },
            );
          }

          const stmt = env.WEBSITE_DB.prepare(`
                      INSERT INTO contact_submissions (name, email, service, message)
                      VALUES (?, ?, ?, ?)
                  `);

          await stmt.bind(name, email, service || null, message).run();

          return new Response(
            JSON.stringify({ success: true, message: "Message received" }),
            {
              status: 201,
              headers: { "Content-Type": "application/json" },
            },
          );
        }


        // Bookings
        if (pathName === "/api/website/bookings" && request.method === "POST") {
          // Rate limit: 3 booking submissions per 10 minutes per IP
          const bookingIp = request.headers.get("CF-Connecting-IP") ?? "unknown";
          if (!await checkPublicRateLimit(env.WEBSITE_DB, bookingIp, "bookings", 3, 600_000)) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded", message: "Too many booking requests. Please try again later." }), {
              status: 429,
              headers: { "Content-Type": "application/json", "Retry-After": "600", ...corsHeaders },
            });
          }
          const booking = (await request.json()) as any;

          // Normalise fields — website form sends name/service_type/event_date/event_location
          const name = booking.name || `${booking.firstName ?? ""} ${booking.lastName ?? ""}`.trim();
          const email = booking.email ?? "";
          const phone = booking.phone ?? null;
          const serviceType = booking.service_type || booking.sessionType || null;
          const eventDate = booking.event_date || booking.date || null;
          const location = booking.event_location || booking.location || null;
          const message = booking.message || null;

          await env.WEBSITE_DB.prepare(
            `INSERT INTO bookings (name, email, phone, service_type, event_date, event_location, message, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(name, email, phone, serviceType, eventDate, location, message, "pending").run();

          // Email notification via Resend — non-fatal, booking is already saved if this fails
          if (env.RESEND_API_KEY) {
            const html = `
              <h2 style="font-family:sans-serif;color:#0f172a;">New Booking Request</h2>
              <table style="font-family:sans-serif;border-collapse:collapse;width:100%;max-width:560px;">
                <tr><td style="padding:6px 12px;font-weight:bold;color:#475569;">Name</td><td style="padding:6px 12px;">${name}</td></tr>
                <tr style="background:#f8fafc;"><td style="padding:6px 12px;font-weight:bold;color:#475569;">Email</td><td style="padding:6px 12px;"><a href="mailto:${email}" style="color:#06b6d4;">${email}</a></td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;color:#475569;">Phone</td><td style="padding:6px 12px;">${phone ?? "—"}</td></tr>
                <tr style="background:#f8fafc;"><td style="padding:6px 12px;font-weight:bold;color:#475569;">Service</td><td style="padding:6px 12px;">${serviceType ?? "—"}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;color:#475569;">Date</td><td style="padding:6px 12px;">${eventDate ?? "—"}</td></tr>
                <tr style="background:#f8fafc;"><td style="padding:6px 12px;font-weight:bold;color:#475569;">Location</td><td style="padding:6px 12px;">${location ?? "—"}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;color:#475569;">Message</td><td style="padding:6px 12px;">${message ?? "—"}</td></tr>
              </table>
              <p style="font-family:sans-serif;font-size:12px;color:#94a3b8;margin-top:24px;">Sent by ClickFlash Booking System</p>
            `;
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "ClickFlash Bookings <onboarding@resend.dev>",
                to: ["clickflash.office@gmail.com"],
                reply_to: email || undefined,
                subject: `New Booking — ${name} (${serviceType ?? "Photography"})`,
                html,
              }),
            }).catch(() => {}); // swallow — booking is already persisted
          }

          return new Response(
            JSON.stringify({ success: true, message: "Booking received" }),
            {
              status: 201,
              headers: { "Content-Type": "application/json" },
            },
          );
        }


        return new Response("Not Found", { status: 404 });
  return null;
};
