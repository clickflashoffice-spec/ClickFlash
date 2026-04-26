import * as Sentry from "@sentry/cloudflare";
import DatabaseManager from "./db.js";
import PhotoProcessor from "./photoProcessor.js";
import { validateLogin } from "./validation.js";
import { verifyPassword } from "./auth.js";
import { createToken, verifyToken, extractTokenFromHeader } from "./jwt.js";
import { checkLoginRateLimit, recordLoginAttempt } from "./loginRateLimiter.js";

export interface Env {
  GALLERY_DB: any; // D1 binding
  WEBSITE_DB: any; // D1 binding for Website
  GALLERY_BUCKET: any; // R2 binding
  JWT_SECRET: string; // JWT signing secret
  ALLOWED_ORIGINS: string; // Comma-separated list of allowed origins
  STRIPE_SECRET_KEY?: string; // Stripe secret key
  STRIPE_WEBHOOK_SECRET?: string; // Stripe webhook signing secret
  SENTRY_DSN?: string; // Sentry DSN — optional; monitoring disabled when absent
}

const galleryHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathName = url.pathname;

    // Parse allowed origins from env var (comma-separated string)
    const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [];
    const requestOrigin = request.headers.get('Origin');
    
    // Determine CORS origin - reflect origin only if it is in the allowlist
    const corsOrigin = (requestOrigin && allowedOrigins.some(o =>
      o === requestOrigin || (o.startsWith('*') && requestOrigin.endsWith(o.slice(1)))
    ) ? requestOrigin : (allowedOrigins[0] ?? ''));

    // CORS Handling with proper validation
    const corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
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

        // Public: Stripe Checkout (no auth required for customers)
        if (pathName === "/api/checkout" && request.method === "POST") {
          if (!env.STRIPE_SECRET_KEY) {
            return new Response(
              JSON.stringify({ error: "Stripe not configured" }),
              { status: 503, headers: { "Content-Type": "application/json" } }
            );
          }

          let body;
          try {
            body = await request.json();
          } catch {
            return new Response(
              JSON.stringify({ error: "Invalid JSON" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const { items, customerEmail, albumId } = body || {};
          const total = items ? items.reduce((sum: number, item: any) => sum + (item.price * item.quantity || 0), 0) : 0;

          try {
            const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                'payment_method_types[]': 'card',
                'line_items[][price_data][currency]': 'usd',
                'line_items[][price_data][product_data][name]': `Photo Package - ${albumId || 'Gallery'}`,
                'line_items[][price_data][unit_amount]': String(Math.round(total * 100)),
                'line_items[][quantity]': '1',
                'mode': 'payment',
                'success_url': `https://gallery.clickflash.com/success?session_id={CHECKOUT_SESSION_ID}`,
                'cancel_url': `https://gallery.clickflash.com/cancel`,
                'customer_email': customerEmail || '',
              }),
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
            return new Response(
              JSON.stringify({ error: e.message }),
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
            const event = await request.json() as any;

            if (event.type === 'checkout.session.completed') {
              const session = event.data.object;
              
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

          // Records CRUD with SQL Injection protection
          if (pathName.includes("/records")) {
            const collection = pathName.split("/")[3];
            
            // Whitelist of allowed tables - prevents SQL injection
            const ALLOWED_TABLES: Record<string, string> = {
              albums: "albums",
              photos: "photos",
              orders: "orders",
              users: "users",
              products: "products",
              bookings: "bookings",
              destinations: "destinations",
            };
            
            // Strict validation - reject unknown tables
            if (!ALLOWED_TABLES[collection]) {
              return new Response(
                JSON.stringify({
                  error: "Bad Request",
                  message: "Invalid collection: " + collection,
                }),
                {
                  status: 400,
                },
              );
            }
            
            const table = ALLOWED_TABLES[collection];

            if (request.method === "GET") {
              const url = new URL(request.url);
              const filterParam = url.searchParams.get("filter");
              const limit = parseInt(url.searchParams.get("limit") || "100", 10);
              const offset = parseInt(url.searchParams.get("offset") || "0", 10);

              // Build parameterized query
              let query = `SELECT * FROM ${table}`;
              const params: any[] = [];

              if (filterParam) {
                const filters = filterParam.split("&&").map((f) => f.trim());
                filters.forEach((f) => {
                  const match = f.match(
                    /([a-zA-Z0-9_]+)\s*=\s*["']?([^"']+)["']?/,
                  );
                  if (match) {
                    const key = match[1];
                    const val = match[2];
                    // Validate column name against whitelist pattern
                    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                      query +=
                        (params.length === 0 ? " WHERE " : " AND ") +
                        `${key} = ?`;
                      params.push(val);
                    }
                  }
                });
              }

              // Add pagination
              query += ` LIMIT ? OFFSET ?`;
              params.push(Math.min(limit, 100), offset); // Cap at 100 records

              const records = await dbManager.query(query, params);
              return new Response(
                JSON.stringify({ results: records, count: records.length }),
                {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }

            // POST - Create record
            if (request.method === "POST") {
              try {
                const body = await request.json() as any;
                
                // Get column names from body
                const columns = Object.keys(body).filter(k => 
                  /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)
                );
                
                if (columns.length === 0) {
                  return new Response(
                    JSON.stringify({ error: "Bad Request", message: "No valid fields provided" }),
                    { status: 400 }
                  );
                }
                
                const placeholders = columns.map(() => "?").join(", ");
                const values = columns.map(c => body[c]);
                
                const query = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
                await dbManager.run(query, values);
                
                return new Response(
                  JSON.stringify({ success: true, message: "Record created" }),
                  { status: 201 }
                );
              } catch (e: any) {
                return new Response(
                  JSON.stringify({ error: "Create Error", message: e.message }),
                  { status: 500 }
                );
              }
            }

            // PATCH - Update record
            if (request.method === "PATCH") {
              try {
                const body = await request.json() as any;
                const id = body.id;
                
                if (!id) {
                  return new Response(
                    JSON.stringify({ error: "Bad Request", message: "ID required" }),
                    { status: 400 }
                  );
                }
                
                const columns = Object.keys(body)
                  .filter(k => k !== "id" && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k));
                
                if (columns.length === 0) {
                  return new Response(
                    JSON.stringify({ error: "Bad Request", message: "No valid fields to update" }),
                    { status: 400 }
                  );
                }
                
                const setClause = columns.map(c => `${c} = ?`).join(", ");
                const values = [...columns.map(c => body[c]), id];
                
                const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
                await dbManager.run(query, values);
                
                return new Response(
                  JSON.stringify({ success: true, message: "Record updated" }),
                  { status: 200 }
                );
              } catch (e: any) {
                return new Response(
                  JSON.stringify({ error: "Update Error", message: e.message }),
                  { status: 500 }
                );
              }
            }

            // DELETE - Delete record
            if (request.method === "DELETE") {
              try {
                const body = await request.json() as any;
                const id = body.id;
                
                if (!id) {
                  return new Response(
                    JSON.stringify({ error: "Bad Request", message: "ID required" }),
                    { status: 400 }
                  );
                }
                
                const query = `DELETE FROM ${table} WHERE id = ?`;
                await dbManager.run(query, [id]);
                
                return new Response(
                  JSON.stringify({ success: true, message: "Record deleted" }),
                  { status: 200 }
                );
              } catch (e: any) {
                return new Response(
                  JSON.stringify({ error: "Delete Error", message: e.message }),
                  { status: 500 }
                );
              }
            }
          }

          // File Serving (R2) with Law 13 Hardware Hardening
          if (pathName.startsWith("/api/files/")) {
            const storageKey = pathName.replace("/api/files/", "");

            // SECURITY GUARD: Check if requesting high-resolution asset
            const isHighRes = storageKey.includes("/highres/");

            if (isHighRes) {
              // Extract photo ID from key: <album>/highres/<photoId>.jpg
              const segments = storageKey.split("/");
              const filename = segments[segments.length - 1];
              const photoId = filename.split(".")[0];

              // Verify payment status in D1
              // We check 'moneytrash_purchases' for MoneyTrash or 'orders' json_each for main gallery
              const access = (await dbManager.get(
                `
                              SELECT 'purchased' as status FROM moneytrash_purchases WHERE photo_id = ?
                              UNION ALL
                              SELECT 'paid' as status FROM orders, json_each(orders.items) 
                              WHERE json_extract(json_each.value, '$.id') = ? AND (orders.status = 'completed' OR orders.status = 'paid')
                              LIMIT 1
                          `,
                [photoId, photoId],
              )) as any;

              const isPurchased =
                access &&
                (access.status === "purchased" || access.status === "paid");

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
            const file = formData.get("file") as File;
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
            console.error("[Upload] Error:", err.message);
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
          const booking = (await request.json()) as any;
          const fullName = `${booking.firstName} ${booking.lastName}`;

          const stmt = env.WEBSITE_DB.prepare(`
                      INSERT INTO bookings (name, email, phone, service_type, event_date, event_location, message, status)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `);

          await stmt
            .bind(fullName, booking.email, booking.phone || null, booking.sessionType, booking.date, booking.location || null, booking.message || null, "pending")
            .run();

          return new Response(
            JSON.stringify({ success: true, message: "Booking received" }),
            {
              status: 201,
              headers: { "Content-Type": "application/json" },
            },
          );
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

    // Apply CORS headers to every response
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      ...response,
      status: response.status,
      headers,
    });
  },
};

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (!env.SENTRY_DSN) {
      // Sentry DSN not configured — run without instrumentation
      return galleryHandler.fetch(request, env);
    }
    return Sentry.withSentry(
      () => ({
        dsn: env.SENTRY_DSN!,
        tracesSampleRate: 0.1,
        environment: "production",
        release: "clickflash-gallery@4.2.0",
      }),
      galleryHandler,
    ).fetch(request, env, ctx);
  },
};
