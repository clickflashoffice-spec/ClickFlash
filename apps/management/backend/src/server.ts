import * as Sentry from "@sentry/cloudflare";
import { checkLoginRateLimit, recordLoginAttempt } from "./loginRateLimiter.js";
import { getEnv, TABLE_MAP } from "./config.js";
import DatabaseManager from "./db.js";
import RecordService from "./services/recordService.js";
import AnalyticsService from "./services/analyticsService.js";
import PhotoProcessor from "./photoProcessor.js";
import EmailRelayService from "./services/emailRelayService.js";
import { validateLogin } from "./validation.js";
import { verifyPassword, hashPassword } from "./auth.js";
import {
  sendAuthError,
  sendNotFoundError,
  sendInternalError,
  createErrorResponse,
  sendDatabaseError,
} from "./errorHandler.js";
import { sign, verify, decode } from "@tsndr/cloudflare-worker-jwt";
import { GeminiService } from "./services/geminiService.js";
import MarketingAutomationService from "./services/marketingAutomationService.js";

/**
 * Management Hub Cloudflare Worker
 */

export interface Env {
  DB: D1Database;
  GALLERY_BUCKET: R2Bucket;
  JWT_SECRET: string;
  PROVISIONING_SECRET?: string;
  ALLOWED_ORIGINS: string;
  RESEND_API_KEY?: string;
  FROM_EMAIL?: string;
  ADMIN_NOTIFICATION_EMAIL?: string;
  GOOGLE_API_KEY?: string;
  SENTRY_DSN?: string; // Sentry DSN — optional; monitoring disabled when absent
}

const managementHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check - public endpoint, no auth required
    if (url.pathname === "/api/health") {
      return Response.json(
        { status: "ok", timestamp: new Date().toISOString() },
      );
    }

    const { JWT_SECRET, ALLOWED_ORIGINS, PROVISIONING_SECRET } = env;
    
    // SECURITY: Fail-fast if JWT_SECRET not configured
    if (!JWT_SECRET) {
      return Response.json(
        { error: "Configuration Error", message: "JWT_SECRET environment variable is required" },
        { status: 500 }
      );
    }

    // Parse allowed origins from config
    const allowedOrigins = ALLOWED_ORIGINS ? ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [];
    const requestOrigin = request.headers.get('Origin');

    // SECURITY: Exact-match only — no wildcard patterns, no trailing-slash
    // normalisation tricks, no fallback. When origin is absent or not in the
    // allowlist, corsOrigin is '' so no ACAO header is emitted (fail-closed).
    const corsOrigin = (requestOrigin && allowedOrigins.includes(requestOrigin))
      ? requestOrigin
      : '';

    // CORS Headers with proper validation
    const corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const dbManager = new DatabaseManager(env.DB);
    DatabaseManager.setInstance(dbManager);

    const emailRelayService = new EmailRelayService(
      console,
      env.RESEND_API_KEY,
      env.FROM_EMAIL,
      env.ADMIN_NOTIFICATION_EMAIL,
    );
    const recordService = new RecordService(dbManager, emailRelayService);
    const analyticsService = new AnalyticsService(dbManager);
    const photoProcessor = new PhotoProcessor(env.GALLERY_BUCKET);
    const geminiService = new GeminiService(env.GOOGLE_API_KEY || "");

    const response = await (async () => {
      try {
      // --- PUBLIC: Check desk_id availability (no auth needed — pre-registration check) ---
      const checkDeskMatch = url.pathname.match(
        /\/api\/auth\/check-desk\/([^/]+)$/,
      );
      if (checkDeskMatch && request.method === "GET") {
        const deskId = checkDeskMatch[1].trim();
        if (!deskId || !/^[a-zA-Z0-9_-]{3,64}$/.test(deskId)) {
          return createErrorResponse(
            400,
            "Bad Request",
            "deskId must be 3-64 alphanumeric/underscore characters",
          );
        }
        const existing = await dbManager.get(
          "SELECT id FROM users WHERE desk_id = ? LIMIT 1",
          [deskId],
        );
        return Response.json(
          {
            available: !existing,
            deskId,
            message: existing
              ? "This Desk ID is already registered with the Hub."
              : "Desk ID is available.",
          },
          { headers: corsHeaders },
        );
      }

      // --- PUBLIC: Register a new Master Desk (no auth — first-time pairing) ---
      if (
        url.pathname === "/api/auth/register-desk" &&
        request.method === "POST"
      ) {
        const body = (await request.json()) as {
          deskId?: string;
          deskName?: string;
          deskLocation?: string;
          email?: string;
          password?: string;
          provisioningSecret?: string;
          machine_id?: string;
          is_auto_ztp?: boolean;
        };

        const { provisioningSecret, machine_id, is_auto_ztp } = body;
        let { deskId, deskName, email, password, deskLocation } = body;

        // Industrial Hardening: Enforce Provisioning Secret
        if (PROVISIONING_SECRET && provisioningSecret !== PROVISIONING_SECRET) {
          return createErrorResponse(
            403,
            "Forbidden",
            "Invalid provisioning secret. Zero-Touch Deployment rejected."
          );
        }

        // Industrial Hardening: Enforce Hardware Binding
        if (!machine_id) {
          return createErrorResponse(
            400,
            "Bad Request",
            "Hardware machine_id is required for station binding."
          );
        }

        // Phase 4: Auto-ZTP Identity Generation
        if (is_auto_ztp) {
          deskId = deskId || `station-${machine_id.slice(0, 8)}`;
          deskName = deskName || `Auto-Station (${machine_id.slice(0, 4)})`;
          email = email || `ztp-${machine_id}@clickflash.internal`;
          password = password || (PROVISIONING_SECRET || "clickflash_ztp_default");
        }

        // Validate required fields
        if (!deskId || !deskName || !email || !password) {
          return createErrorResponse(
            400,
            "Bad Request",
            "deskId, deskName, email, and password are required",
          );
        }
        if (!/^[a-zA-Z0-9_-]{3,64}$/.test(deskId)) {
          return createErrorResponse(
            400,
            "Validation Error",
            "deskId must be 3-64 alphanumeric/underscore characters",
          );
        }

        // Check uniqueness
        const existingDesk = await dbManager.get(
          "SELECT id FROM users WHERE desk_id = ? LIMIT 1",
          [deskId],
        );
        if (existingDesk) {
          // If auto-ZTP and UID matches, return the existing credentials (Idempotency)
          if (is_auto_ztp) {
             const existingUser = await dbManager.get(
                "SELECT id, email, desk_id FROM users WHERE machine_id = ? AND desk_id = ? LIMIT 1",
                [machine_id, deskId]
             );
             if (existingUser) {
                const jwtPayload = {
                  id: existingUser.id,
                  email: existingUser.email,
                  role: "desk",
                  desk_id: existingUser.desk_id,
                  exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                };
                const token = await sign(jwtPayload, JWT_SECRET);
                return Response.json({ 
                  success: true, 
                  token, 
                  desk: existingUser, 
                  message: "Station already registered. Identity recovered." 
                }, { headers: corsHeaders });
             }
          }

          return createErrorResponse(
            409,
            "Conflict",
            `Desk ID '${deskId}' is already registered. Choose a different ID.`,
          );
        }

        const existingEmail = await dbManager.get(
          "SELECT id FROM users WHERE email = ? LIMIT 1",
          [email],
        );
        if (existingEmail) {
          return createErrorResponse(
            409,
            "Conflict",
            `Email '${email}' is already in use by another desk.`,
          );
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const now = new Date().toISOString();

        const insertResult = await dbManager.run(
          `INSERT INTO users (email, password, role, desk_id, machine_id, name, location, created_at, updated_at)
           VALUES (?, ?, 'desk', ?, ?, ?, ?, ?, ?)`,
          [
            email,
            hashedPassword,
            deskId,
            machine_id,
            deskName,
            deskLocation || "",
            now,
            now,
          ],
        );
        const userId = insertResult?.meta?.last_row_id ?? insertResult?.lastInsertRowid ?? 0;

        // Issue JWT for the newly registered desk
        const jwtPayload = {
          id: userId,
          email,
          role: "desk",
          desk_id: deskId,
          exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
        };
        const token = await sign(jwtPayload, JWT_SECRET);

        console.log(
          `[Register Desk] New station registered: ${deskId} (${deskName}) machine: ${machine_id} at ${deskLocation || "unknown location"}`,
        );

        return Response.json(
          {
            success: true,
            token,
            desk: {
              id: userId,
              deskId,
              deskName,
              deskLocation,
              email,
              role: "desk",
            },
            message: `Station '${deskName}' registered and hardware-bound successfully.`,
          },
          { status: 201, headers: corsHeaders },
        );
      }

      // Login (Public)
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        const body = await request.json();
        const validation = validateLogin(body);
        if (!validation.success) {
          return createErrorResponse(
            400,
            "Validation Error",
            "Invalid credentials format",
          );
        }
        const { email, password, machine_id } = (validation as any).data;

        // Brute-force protection
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
                'Content-Type': 'application/json',
                'Retry-After': String(rateLimit.retryAfterSeconds ?? 900),
              },
            },
          );
        }

        let user;
        try {
          user = await dbManager.get(`SELECT * FROM users WHERE email = ?`, [
            email,
          ]);
        } catch (dbe) {
          console.error("DB GET ERROR on LOGIN:", dbe);
          throw dbe;
        }

        const passwordOk = user && (await verifyPassword(password, user.password));
        await recordLoginAttempt(dbManager, email, clientIp, !!passwordOk);

        if (!passwordOk) {
          return sendAuthError("Invalid email or password.");
        }

        // Phase 20: Hardware Fingerprinting & Session Locking
        // If it's a desk-bound account (Master Station), enforce hardware lock
        if (user.desk_id) {
          if (user.machine_id) {
            if (user.machine_id !== machine_id) {
              return createErrorResponse(
                423,
                "Locked",
                "Station is locked to another hardware device. Please contact support to reset.",
              );
            }
          } else if (machine_id) {
            // Pair with hardware on first login
            await dbManager.run(
              "UPDATE users SET machine_id = ? WHERE id = ?",
              [machine_id, user.id],
            );
            user.machine_id = machine_id;
          }
        }

        // Secure JWT Signing (Rule 01, Law 04)
        const payload = {
          id: user.id,
          email: user.email,
          role: user.role,
          desk_id: user.desk_id || null,
          exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year for stations
        };

        const token = await sign(payload, JWT_SECRET);

        delete user.password;
        return Response.json(
          { token, user, desk_id: user.desk_id },
          { headers: corsHeaders },
        );
      }

      // Auth Middleware check for other routes
      let payload: any = null;
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        const isValid = await verify(token, JWT_SECRET);
        if (isValid) {
          const { payload: decodedPayload } = decode(token) as any;
          payload = decodedPayload;
        }
      }

      // --- PUBLIC: Customer Order Lookup (Gallery Auth — no JWT required) ---
      // These endpoints authenticate customers using their order credentials.
      // Orders arrive here via Master → Cloud Sync, so ALL Masters' customers can log in.
      if (
        url.pathname === "/api/orders/by-credentials" &&
        request.method === "GET"
      ) {
        const pin = url.searchParams.get("pin");
        const email = url.searchParams.get("email");
        if (!pin || !email) {
          return createErrorResponse(
            400,
            "Bad Request",
            "pin and email are required",
          );
        }
        const order = await dbManager.get(
          `SELECT id, date, clientName, email, status, total, photographerId, destinationId, appliedDiscount, desk_id, items, access_pin, magic_link_token
           FROM orders WHERE access_pin = ? AND LOWER(email) = LOWER(?) LIMIT 1`,
          [pin.trim(), email.trim()],
        );
        if (!order) return sendNotFoundError("Order");
        if (typeof order.items === "string") {
          try {
            order.items = JSON.parse(order.items);
          } catch {
            order.items = [];
          }
        }
        return Response.json(order, { headers: corsHeaders });
      }

      if (url.pathname === "/api/orders/by-token" && request.method === "GET") {
        const token = url.searchParams.get("token");
        if (!token) {
          return createErrorResponse(
            400,
            "Bad Request",
            "magic link token is required",
          );
        }
        const order = await dbManager.get(
          `SELECT id, date, clientName, email, status, total, photographerId, destinationId, appliedDiscount, desk_id, items, access_pin, magic_link_token
           FROM orders WHERE magic_link_token = ? LIMIT 1`,
          [token.trim()],
        );
        if (!order) return sendNotFoundError("Order");
        if (typeof order.items === "string") {
          try {
            order.items = JSON.parse(order.items);
          } catch {
            order.items = [];
          }
        }
        return Response.json(order, { headers: corsHeaders });
      }

      if (url.pathname === "/api/orders/by-room" && request.method === "GET") {
        const roomNumber = url.searchParams.get("roomNumber");
        if (!roomNumber) {
          return createErrorResponse(
            400,
            "Bad Request",
            "roomNumber is required",
          );
        }
        const order = await dbManager.get(
          `SELECT id, date, clientName, email, status, total, photographerId, destinationId, appliedDiscount, desk_id, items
           FROM orders WHERE roomNumber = ? OR JSON_EXTRACT(items, '$[0].roomNumber') = ? LIMIT 1`,
          [roomNumber.trim(), roomNumber.trim()],
        );
        if (!order) return sendNotFoundError("Order");
        if (typeof order.items === "string") {
          try {
            order.items = JSON.parse(order.items);
          } catch {
            order.items = [];
          }
        }
        return Response.json(order, { headers: corsHeaders });
      }

      if (!payload) {
        // Skip auth for file serving (Public access for Gallery)
        if (!url.pathname.startsWith("/api/files/")) {
          return sendAuthError("Invalid or expired authentication token.");
        }
      }

      const deskId = payload?.desk_id || null;

      // Debug: Log incoming request path
      console.log(
        `[Router] Processing ${request.method} ${url.pathname} (Desk: ${deskId})`,
      );

      // Generic CRUD Records
      const collectionMatch = url.pathname.match(
        /\/api\/collections\/([^/]+)\/records(?:\/([^/]+))?/,
      );
      if (collectionMatch) {
        const collection = collectionMatch[1];
        const id = collectionMatch[2];

        if (request.method === "GET") {
          const data = await recordService.listRecords(
            collection,
            url.searchParams,
            deskId,
          );
          return Response.json(data, { headers: corsHeaders });
        }

        if (request.method === "POST" || request.method === "PATCH") {
          const body = (await request.json()) as any;
          if (id) body.id = id;
          const data = await recordService.processRecordCreation(
            request.method,
            collection,
            body,
            deskId,
          );
          return Response.json(data, {
            status: request.method === "POST" ? 201 : 200,
            headers: corsHeaders,
          });
        }

        if (request.method === "DELETE" && id) {
          await recordService.deleteRecord(collection, id, deskId);
          return Response.json({ success: true }, { headers: corsHeaders });
        }
      }

      // Analytics Routes
      if (
        url.pathname === "/api/analytics/dashboard" &&
        request.method === "GET"
      ) {
        const startDate = url.searchParams.get("startDate") || "";
        const endDate = url.searchParams.get("endDate") || "";
        const stats = await analyticsService.getDashboardStats(
          startDate,
          endDate,
          deskId,
        );
        const trend = await analyticsService.getRevenueTrend(
          startDate,
          endDate,
          deskId,
        );
        return Response.json({ stats, trend }, { headers: corsHeaders });
      }

      // --- Phase 70: Ingest Daily Audits from Master Apps ---
      if (
        url.pathname === "/api/analytics/daily-audit" &&
        request.method === "POST"
      ) {
        if (!deskId) return sendAuthError("Desk ID required to push audits.");

        try {
          const body = (await request.json()) as { audits: any[] };

          if (!body.audits || !Array.isArray(body.audits)) {
            return createErrorResponse(
              400,
              "Bad Request",
              "Missing audits array.",
            );
          }

          let processed = 0;

          // Process each photographer's audit
          for (const audit of body.audits) {
            const internalId = `${deskId}_${audit.photographer_id}_${audit.date}`;

            // Check existing audit
            const existing = await dbManager.get(
              "SELECT id, ai_audit_description FROM daily_photographer_audits WHERE desk_id = ? AND photographer_id = ? AND date = ?",
              [deskId, audit.photographer_id, audit.date],
            );

            let aiDesc = existing?.ai_audit_description || "";

            // Generate AI Audit Description if it doesn't exist and we have > 0 metrics to talk about
            if (
              !aiDesc &&
              (audit.total_customers > 0 || audit.imported_photos > 0)
            ) {
              try {
                const soldPercent =
                  audit.imported_photos > 0
                    ? Math.round(
                        (audit.sold_photos / audit.imported_photos) * 100,
                      )
                    : 0;
                const salesRate =
                  audit.total_customers > 0
                    ? Math.round(
                        (audit.sold_photos / audit.total_customers) * 100,
                      )
                    : 0;

                const promptText = `Analyze this daily performance data for photographer ${audit.photographer_id} on ${audit.date}.
Metrics: ${audit.imported_photos} imported photos, ${audit.sold_photos} sold photos (${soldPercent}% sold percent), ${audit.bad_quality_photos} flagged as bad quality, ${audit.total_customers} customers interacted (Sales Rate: ${salesRate}%), $${audit.sales_revenue} in revenue.
Write a very brief 2-sentence performance review. Explicitly note the sales rate and imported photo sold percent. State if quality is an issue, or if sales conversion is great/poor.`;

                // Quick call to Gemini without the complex structured JSON requirement of the sales forecast
                const aiRawResponse = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GOOGLE_API_KEY}`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      contents: [{ parts: [{ text: promptText }] }],
                    }),
                  },
                );

                if (aiRawResponse.ok) {
                  const jsonResp = (await aiRawResponse.json()) as any;
                  aiDesc =
                    jsonResp.candidates?.[0]?.content?.parts?.[0]?.text ||
                    "AI analysis unavailable.";
                }
              } catch (e) {
                console.error("AI Audit generation failed:", e);
              }
            }

            await dbManager.run(
              `INSERT INTO daily_photographer_audits
                (id, desk_id, photographer_id, date, total_customers, imported_photos, sold_photos, bad_quality_photos, sales_revenue, ai_audit_description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(desk_id, photographer_id, date) DO UPDATE SET
                total_customers = EXCLUDED.total_customers,
                imported_photos = EXCLUDED.imported_photos,
                sold_photos = EXCLUDED.sold_photos,
                bad_quality_photos = EXCLUDED.bad_quality_photos,
                sales_revenue = EXCLUDED.sales_revenue,
                ai_audit_description = COALESCE(daily_photographer_audits.ai_audit_description, EXCLUDED.ai_audit_description),
                updated_at = CURRENT_TIMESTAMP`,
              [
                internalId,
                deskId,
                audit.photographer_id,
                audit.date,
                audit.total_customers,
                audit.imported_photos,
                audit.sold_photos,
                audit.bad_quality_photos,
                audit.sales_revenue,
                aiDesc,
              ],
            );
            processed++;
          }

          return Response.json(
            { success: true, processed },
            { headers: corsHeaders },
          );
        } catch (error: any) {
          console.error("[Daily Audit Ingest Error]", error);
          return sendInternalError(error, "Daily Audit Processing");
        }
      }

      // --- Phase 75: Ingest Resort-level BI from Master Apps ---
      if (
        url.pathname === "/api/analytics/resort-ingest" &&
        request.method === "POST"
      ) {
        if (!deskId) return sendAuthError("Desk ID required to push BI.");

        try {
          const body = await request.json();
          await analyticsService.ingestResortBI(deskId, body);
          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (error: any) {
          console.error("[Resort BI Ingest Error]", error);
          return sendInternalError(error, "Resort BI Processing");
        }
      }

      // --- Phase 75: Retrieve Resort BI for Management UI ---
      if (
        url.pathname === "/api/analytics/resort-bi" &&
        request.method === "GET"
      ) {
        if (!payload || payload.role !== "admin")
          return sendAuthError("Admin access required.");

        const startDate = url.searchParams.get("startDate") || "";
        const endDate = url.searchParams.get("endDate") || "";
        const targetDeskId = url.searchParams.get("deskId");

        try {
          const data = await analyticsService.getResortBI(
            startDate,
            endDate,
            targetDeskId,
          );
          return Response.json(
            { success: true, ...data },
            { headers: corsHeaders },
          );
        } catch (error: any) {
          console.error("[Resort BI Retrieval Error]", error);
          return sendInternalError(error, "Resort BI Retrieval");
        }
      }

      // --- Phase 70: Retrieve Location Audits for Management UI ---
      if (
        url.pathname === "/api/analytics/location-audits" &&
        request.method === "GET"
      ) {
        if (!payload || payload.role !== "admin")
          return sendAuthError("Admin access required.");

        const dateFilter =
          url.searchParams.get("date") ||
          new Date().toISOString().split("T")[0];

        try {
          // Join the audits with destinations to get the hotel name
          // We calculate the sales_rate and sold_percent dynamically here to ensure UI has strict numbers
          const audits = await dbManager.query(
            `SELECT
               a.*,
               d.name as hotel_name,
               CASE WHEN a.imported_photos > 0 THEN ROUND((CAST(a.sold_photos AS REAL) / a.imported_photos) * 100, 1) ELSE 0 END as sold_percent,
               CASE WHEN a.total_customers > 0 THEN ROUND((CAST(a.sold_photos AS REAL) / a.total_customers) * 100, 1) ELSE 0 END as sales_rate
             FROM daily_photographer_audits a
             LEFT JOIN destinations d ON a.desk_id = d.id
             WHERE a.date = ?
             ORDER BY a.desk_id, a.photographer_id`,
            [dateFilter],
          );

          // We also need to compile a "Full Hotel AuditPlan" which aggregates the photographers per hotel.
          // This allows viewing the "Overall" hotel health
          const hotelAggregations: Record<string, any> = {};

          for (const row of audits) {
            const hId = row.desk_id;
            if (!hotelAggregations[hId]) {
              hotelAggregations[hId] = {
                desk_id: hId,
                hotel_name: row.hotel_name || hId,
                date: row.date,
                total_customers: 0,
                imported_photos: 0,
                sold_photos: 0,
                bad_quality_photos: 0,
                sales_revenue: 0,
                photographer_audits: [],
              };
            }
            hotelAggregations[hId].total_customers += row.total_customers;
            hotelAggregations[hId].imported_photos += row.imported_photos;
            hotelAggregations[hId].sold_photos += row.sold_photos;
            hotelAggregations[hId].bad_quality_photos += row.bad_quality_photos;
            hotelAggregations[hId].sales_revenue += row.sales_revenue;
            hotelAggregations[hId].photographer_audits.push(row);
          }

          // Format ratios for the full hotel
          const fullHotelAudits = Object.values(hotelAggregations).map(
            (h: any) => {
              h.sold_percent =
                h.imported_photos > 0
                  ? parseFloat(
                      ((h.sold_photos / h.imported_photos) * 100).toFixed(1),
                    )
                  : 0;
              h.sales_rate =
                h.total_customers > 0
                  ? parseFloat(
                      ((h.sold_photos / h.total_customers) * 100).toFixed(1),
                    )
                  : 0;
              return h;
            },
          );

          return Response.json(
            { success: true, audits: fullHotelAudits },
            { headers: corsHeaders },
          );
        } catch (error: any) {
          console.error("[Location Audits Retrieval Error]", error);
          return sendInternalError(error, "Location Audits Retrieval");
        }
      }

      if (
        url.pathname === "/api/analytics/top-albums" &&
        request.method === "GET"
      ) {
        const startDate = url.searchParams.get("startDate") || "";
        const endDate = url.searchParams.get("endDate") || "";
        const limit = parseInt(url.searchParams.get("limit") || "5", 10);
        const data = await analyticsService.getTopAlbums(
          startDate,
          endDate,
          deskId,
          limit,
        );
        return Response.json(data, { headers: corsHeaders });
      }

      if (
        url.pathname === "/api/analytics/forecast" &&
        request.method === "GET"
      ) {
        try {
          const metrics = await analyticsService.getForecastData(deskId);
          const forecast = await geminiService.generateSalesForecast(metrics);
          return Response.json(forecast, { headers: corsHeaders });
        } catch (err: any) {
          console.error("[Forecast Error]", err);
          return createErrorResponse(500, "AI Forecast Error", err.message);
        }
      }

      // --- Phase 30: Operation-Based Sync Endpoint ---
      if (url.pathname === "/api/cloud/sync/operations") {
        if (!deskId)
          return sendAuthError("Desk ID required for operation sync.");

        if (request.method === "POST") {
          const body = (await request.json()) as { operations: any[] };
          const processed = await recordService.applyOperations(
            deskId,
            body.operations || [],
          );
          return Response.json(
            { success: true, processed },
            { headers: corsHeaders },
          );
        }

        if (request.method === "GET") {
          const sinceHubIndex = parseInt(
            url.searchParams.get("since_hub_index") || "0",
            10,
          );
          const operations = await recordService.getRemoteOperations(
            deskId,
            sinceHubIndex,
          );
          return Response.json(
            { success: true, operations },
            { headers: corsHeaders },
          );
        }
      }

      // --- Phase 35: Fleet Heartbeat Endpoint ---
      if (
        url.pathname === "/api/cloud/heartbeat" &&
        request.method === "POST"
      ) {
        if (!deskId) return sendAuthError("Desk ID required for heartbeat.");

        try {
          const body = (await request.json()) as any;
          await recordService.updateFleetHeartbeat(deskId, body);
          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (hbErr: any) {
          console.error("[Heartbeat] Error:", hbErr.message);
          return sendInternalError(hbErr, "Heartbeat Processing");
        }
      }

      // --- Phase 35: Fleet Status Endpoint ---
      if (url.pathname === "/api/cloud/fleet" && request.method === "GET") {
        const fleet = await recordService.getFleetStatus();
        return Response.json(
          { success: true, fleet },
          { headers: corsHeaders },
        );
      }

      // --- Phase 35: Fleet Stations Endpoint (aliased for FleetService compatibility) ---
      if (
        (url.pathname === "/api/cloud/fleet/stations" ||
          url.pathname === "/api/cloud/fleet/status") &&
        request.method === "GET"
      ) {
        const fleet = await recordService.getFleetStatus();
        return Response.json(fleet, { headers: corsHeaders });
      }

      // --- Phase 35: Per-Station Detail Endpoint ---
      const stationDetailMatch = url.pathname.match(
        /\/api\/cloud\/fleet\/stations\/([^/]+)$/,
      );
      if (stationDetailMatch && request.method === "GET") {
        const stationDeskId = stationDetailMatch[1];
        const fleet = await recordService.getFleetStatus();
        const station = fleet.find((s: any) => s.id === stationDeskId);
        if (!station) return sendNotFoundError("Station");
        return Response.json(station, { headers: corsHeaders });
      }

      // --- Phase 35: Force Sync Endpoint ---
      const forceSyncMatch = url.pathname.match(
        /\/api\/cloud\/fleet\/stations\/([^/]+)\/sync$/,
      );
      if (
        (forceSyncMatch || url.pathname === "/api/cloud/fleet/sync-all") &&
        request.method === "POST"
      ) {
        // Stub: In production, sends a push signal to the target station
        return Response.json(
          { success: true, message: "Sync signal dispatched" },
          { headers: corsHeaders },
        );
      }

      // --- Phase 45: Dispatch Command Endpoint ---
      const commandMatch = url.pathname.match(
        /\/api\/admin\/desks\/([^/]+)\/command$/,
      );
      if (commandMatch && request.method === "POST") {
        if (!payload || payload.role !== "admin")
          return sendAuthError("Admin access required");

        const targetDeskId = commandMatch[1];
        const body = (await request.json()) as { command: string };

        if (!body.command) {
          return createErrorResponse(400, "Bad Request", "Missing command");
        }

        try {
          // Fetch existing commands
          const desk = (await dbManager.get(
            "SELECT pending_commands FROM desks WHERE id = ?",
            [targetDeskId],
          )) as { pending_commands: string } | null;

          if (!desk) return sendNotFoundError("Desk not found");

          const pending = JSON.parse(desk.pending_commands || "[]");
          pending.push(body.command);

          // Update desk record
          await dbManager.run(
            "UPDATE desks SET pending_commands = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [JSON.stringify(pending), targetDeskId],
          );

          return Response.json(
            { success: true, message: `Command ${body.command} queued` },
            { headers: corsHeaders },
          );
        } catch (err: any) {
          return createErrorResponse(500, "Database Error", err.message);
        }
      }

      // --- Settings Upsert Endpoint ---
      if (
        url.pathname === "/api/settings/upsert" &&
        request.method === "POST"
      ) {
        const body = (await request.json()) as { key: string; value: any };
        if (!body.key)
          return createErrorResponse(400, "Bad Request", "Missing setting key");
        await dbManager.run(
          `INSERT INTO settings (id, key, value, created_at, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT(id) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [body.key, body.key, JSON.stringify(body.value)],
        );
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // --- Phase 33: Email Relay Endpoint ---
      if (url.pathname === "/api/email/relay" && request.method === "POST") {
        if (!payload)
          return sendAuthError("Authentication required for email relay.");

        const body = (await request.json()) as any;
        const success = await emailRelayService.sendEmail({
          to: body.to,
          from: body.from,
          fromName: body.fromName,
          subject: body.subject,
          html: body.html,
          text: body.text,
        });

        return Response.json(
          { success },
          { status: success ? 200 : 500, headers: corsHeaders },
        );
      }

      // --- Phase 40: Generate Signed R2 Download URL ---
      const downloadMatch = url.pathname.match(
        /\/api\/photos\/([^/]+)\/download-url/,
      );
      if (downloadMatch && request.method === "GET") {
        const photoId = downloadMatch[1];
        // Determine auth mechanism. Since the user might be using magic link or pin,
        // we use the JWT, OR we require order id/magic link in query for this specific call.
        // For simplicity in the Customer Gallery, it passes standard headers via fetchFn,
        // but if it's not authenticated via central JWT, we'll need token verification.
        // Assuming the gallery sends the access token in Authorization header.

        if (!payload)
          return sendAuthError("Authentication required to download photos.");

        // Verify photo belongs to an order the user has access to.
        // (In a real system, you'd join orders with photos. For this demo architecture,
        // we just sign the URL if they are authenticated as a customer).

        // Generate a signed URL valid for 1 hour
        const expiresAt = Math.floor(Date.now() / 1000) + 3600;
        const secretKey = JWT_SECRET;

        const signaturePayload = `${photoId}:${expiresAt}:${secretKey}`;
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          "raw",
          encoder.encode(secretKey),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const signatureBuffer = await crypto.subtle.sign(
          "HMAC",
          keyMaterial,
          encoder.encode(signaturePayload),
        );
        const signatureArray = Array.from(new Uint8Array(signatureBuffer));
        const signatureHex = signatureArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        // The frontend will hit this URL to download
        const downloadUrl = `${url.origin}/api/files/download/${photoId}?expires=${expiresAt}&sig=${signatureHex}`;

        return Response.json(
          { success: true, downloadUrl },
          { headers: corsHeaders },
        );
      }

      // File Serving (R2)
      const fileMatch = url.pathname.match(
        /\/api\/files\/(download|photos)\/([^/]+)(?:\/([^/]+))?/,
      );
      if (fileMatch) {
        const [_, type, id, filename] = fileMatch;

        // If it's a direct secure download, verify signature
        if (type === "download") {
          const expires = parseInt(url.searchParams.get("expires") || "0", 10);
          const sig = url.searchParams.get("sig");

          if (!expires || !sig || expires < Math.floor(Date.now() / 1000)) {
            return createErrorResponse(
              403,
              "Forbidden",
              "Download link expired or invalid.",
            );
          }

          if (!env.JWT_SECRET) {
            return createErrorResponse(
              500,
              "InternalServerError",
              "JWT_SECRET environment variable not configured.",
            );
          }
          const secretKey = env.JWT_SECRET;
          const signaturePayload = `${id}:${expires}:${secretKey}`;
          const encoder = new TextEncoder();
          const keyMaterial = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secretKey),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"],
          );

          const sigBytes = new Uint8Array(
            sig.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
          );
          const isValid = await crypto.subtle.verify(
            "HMAC",
            keyMaterial,
            sigBytes,
            encoder.encode(signaturePayload),
          );

          if (!isValid) {
            return createErrorResponse(
              403,
              "Forbidden",
              "Invalid download signature.",
            );
          }
        }

        // For this demo, finding the file in R2 by ID.
        // Note: Real implementation uses deskId/albumId/originalName keys.
        // But the previous implementation mapped `id` to the bucket key directly.
        // We'll trust the previous mapping for `/api/files/:collection/:id/:filename`
        const r2Key = id; // Assuming id = deskId/albumId/originalName if structured correctly by previous dev, or just photoId

        let object = await env.GALLERY_BUCKET.get(r2Key);

        // Fallbacks for R2 key structures
        if (!object && filename) {
          object = await env.GALLERY_BUCKET.get(`${id}/${filename}`);
        }

        if (!object) return sendNotFoundError("File");

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Access-Control-Allow-Origin", "*");

        return new Response(object.body, { headers });
      }

      // ─────────────────────────────────────────────────────────────────────────
      // CLOUD SYNC ROUTES (bi-directional Master ↔ Hub data pipeline)
      // Called by cloudSyncService.ts on every sync cycle
      // ─────────────────────────────────────────────────────────────────────────

      // POST /api/cloud/sync/operations — push operation log batch from a Master desk
      if (
        url.pathname === "/api/cloud/sync/operations" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        const body = (await request.json()) as {
          desk_id: string;
          operations: any[];
        };
        const ops = body.operations || [];
        if (ops.length === 0)
          return Response.json(
            { success: true, processed: [] },
            { headers: corsHeaders },
          );

        const processed: string[] = [];
        for (const op of ops) {
          try {
            await dbManager.run(
              `INSERT OR IGNORE INTO operation_logs (id, desk_id, type, table_name, record_id, payload, timestamp, sequence_number)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                op.id,
                body.desk_id,
                op.type,
                op.table,
                op.record_id,
                typeof op.payload === "string"
                  ? op.payload
                  : JSON.stringify(op.payload),
                op.timestamp,
                op.sequence_number,
              ],
            );
            processed.push(op.id);
          } catch (err) {
            console.error(`[SyncOps] Failed to store op ${op.id}:`, err);
          }
        }
        return Response.json(
          { success: true, processed },
          { headers: corsHeaders },
        );
      }

      // GET /api/cloud/sync/operations?since_hub_index=N — pull remote ops for bi-directional sync
      // Excludes ops from the requesting desk to avoid echo
      if (
        url.pathname === "/api/cloud/sync/operations" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        const sinceIndex = parseInt(
          url.searchParams.get("since_hub_index") || "0",
          10,
        );
        const requestingDeskId = (payload as any).desk_id || "";
        const ops = await dbManager.query(
          `SELECT id, desk_id, type, table_name, record_id, payload, timestamp, sequence_number, rowid as hub_index
           FROM operation_logs
           WHERE rowid > ? AND desk_id != ?
           ORDER BY rowid ASC LIMIT 200`,
          [sinceIndex, requestingDeskId],
        );
        return Response.json(
          { success: true, operations: ops || [] },
          { headers: corsHeaders },
        );
      }

      // POST /api/cloud/sync/order — sync validated orders from Master and send gallery access email
      if (
        url.pathname === "/api/cloud/sync/order" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");

        try {
          const body = (await request.json()) as any;
          const deskId = body.desk_id || (payload as any).desk_id || "unknown";
          const order = body.order;

          if (!order || !order.id || !order.email) {
            return createErrorResponse(
              400,
              "Bad Request",
              "Order must include id and email",
            );
          }

          // Fetch existing order to see if credentials already exist
          const existingOrder = await dbManager.get(
            `SELECT access_pin, magic_link_token FROM orders WHERE id = ? LIMIT 1`,
            [order.id],
          );

          // Generate access credentials if not already assigned
          let accessPin = existingOrder?.access_pin || order.access_pin;
          let magicLinkToken =
            existingOrder?.magic_link_token || order.magic_link_token;
          let isNewAccess = false;

          if (!accessPin) {
            // Generate a secure 6-digit PIN
            accessPin = Math.floor(100000 + Math.random() * 900000).toString();
            // Generate a cryptographically random token for magic link
            magicLinkToken =
              crypto.randomUUID().replace(/-/g, "") +
              crypto.randomUUID().replace(/-/g, "");
            isNewAccess = true;
          }

          const itemsRaw =
            typeof order.items === "string"
              ? order.items
              : JSON.stringify(order.items || []);

          await dbManager.run(
            `INSERT INTO orders (id, date, clientName, email, status, fulfillment_status, total, totalAmount, photographerId, destinationId, paymentMethod, appliedDiscount, items, albumId, desk_id, original_id, access_pin, magic_link_token, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET 
                status = excluded.status, 
                fulfillment_status = excluded.fulfillment_status,
                items = excluded.items,
                updated_at = CURRENT_TIMESTAMP`,
            [
              order.id,
              order.date || new Date().toISOString(),
              order.clientName || "Guest",
              order.email,
              order.status || "paid",
              order.fulfillment_status || "synced",
              order.total || 0,
              order.totalAmount || 0,
              order.photographerId || "",
              order.destinationId || "",
              order.paymentMethod || "",
              order.appliedDiscount || 0,
              itemsRaw,
              order.albumId || "",
              deskId,
              order.original_id || order.id,
              accessPin,
              magicLinkToken,
            ],
          );

          // Send notification email if these are new credentials
          if (isNewAccess) {
            const galleryUrl = `https://gallery.clickflash.com`; // ToDo: Make environment variable if needed
            const magicLink = `${galleryUrl}/access?token=${magicLinkToken}`;

            const emailHtml = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                      <h2>Your Photos are Ready!</h2>
                      <p>Hi ${order.clientName || "Guest"},</p>
                      <p>Your high-resolution photos from your recent ClickFlash session are now available for download.</p>
                      <p><strong>Option 1:</strong> Access your gallery instantly via this secure link:</p>
                      <p><a href="${magicLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View My Photos</a></p>
                      <p><strong>Option 2:</strong> Go to <a href="${galleryUrl}">${galleryUrl}</a> and log in using your email and this secure PIN:</p>
                      <h3 style="letter-spacing: 5px; font-size: 24px; color: #007bff;">${accessPin}</h3>
                      <p>Thank you for choosing ClickFlash!</p>
                  </div>
              `;

            await emailRelayService.sendEmail({
              to: order.email,
              from: env.FROM_EMAIL || "support@clickflash.com",
              fromName: "ClickFlash Photography",
              subject: "Your High-Res Photos are Ready for Download",
              html: emailHtml,
              text: `Your photos are ready! View them here: ${magicLink} or use PIN: ${accessPin}`,
            });
          }

          return Response.json(
            { success: true, orderId: order.id, accessPin },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          console.error(`[SyncOrder] Failed to sync order:`, e);
          return sendDatabaseError(e);
        }
      }

      // POST /api/cloud/sync/batch — generic batch upsert for system_stats, retention stats, etc.
      if (
        url.pathname === "/api/cloud/sync/batch" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        const body = (await request.json()) as { table: string; items: any[] };
        const { table, items } = body;
        if (!table || !items?.length)
          return Response.json(
            { success: true, processed: 0 },
            { headers: corsHeaders },
          );

        // Allowlist of tables safe for generic upsert
        const ALLOWED = ["system_stats", "fleet_heartbeats", "retention_stats"];
        if (!ALLOWED.includes(table))
          return createErrorResponse(
            400,
            "Bad Request",
            `Table '${table}' not allowed for batch upsert`,
          );

        const ALLOWED_COLUMNS: Record<string, string[]> = {
          system_stats: ["desk_id", "retention_queue_size", "retention_potential_value", "retention_status", "last_updated"],
          fleet_heartbeats: ["desk_id", "last_seen", "metrics", "updated_at"],
          retention_stats: ["id", "desk_id", "month", "returning_customers", "new_customers", "retention_rate", "created_at"],
        };

        let count = 0;
        for (const item of items) {
          try {
            const keys = Object.keys(item).filter((k) => ALLOWED_COLUMNS[table].includes(k));
            if (keys.length === 0) continue;
            const placeholders = keys.map(() => "?").join(", ");
            const setClause = keys
              .map((k) => `${k} = excluded.${k}`)
              .join(", ");
            const values = keys.map((k) => (item as Record<string, unknown>)[k]);
            await dbManager.run(
              `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})
               ON CONFLICT(desk_id) DO UPDATE SET ${setClause}`,
              values,
            );
            count++;
          } catch (e) {
            console.error(`[SyncBatch] Failed to upsert into ${table}:`, e);
          }
        }
        return Response.json(
          { success: true, processed: count },
          { headers: corsHeaders },
        );
      }

      // POST /api/cloud/heartbeat — store fleet heartbeat per desk
      // ── Phase 51: Global Settings Propagation to Masters ──────────────
      // GET /api/cloud/sync/settings?hash=XXX — Masters pull global settings
      if (
        url.pathname === "/api/cloud/sync/settings" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        const clientHash = url.searchParams.get("hash") || "";

        try {
          // Fetch all propagatable settings (website_*, global_*, currency_*, receipt_*)
          const rows = (await dbManager.query(
            `SELECT id, value FROM settings 
             WHERE id LIKE 'website_%' 
                OR id LIKE 'global_%'
                OR id LIKE 'currency_%'
                OR id LIKE 'receipt_%'
                OR id LIKE 'session_type_%'
             ORDER BY id`,
          )) as Array<{ id: string; value: string }>;

          // Compute hash of all settings for change detection
          const settingsPayload = JSON.stringify(rows);
          const encoder = new TextEncoder();
          const hashBuffer = await crypto.subtle.digest(
            "SHA-256",
            encoder.encode(settingsPayload),
          );
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const serverHash = hashArray
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
            .substring(0, 16);

          if (clientHash === serverHash) {
            return Response.json(
              { changed: false, hash: serverHash },
              { headers: corsHeaders },
            );
          }

          return Response.json(
            { changed: true, hash: serverHash, settings: rows },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          console.error("[SyncSettings] Error:", e);
          return sendInternalError(e, "Settings Sync");
        }
      }

      // POST /api/cloud/heartbeat — store fleet heartbeat per desk
      if (
        url.pathname === "/api/cloud/heartbeat" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        const hb = (await request.json()) as any;
        const deskId = hb.desk_id || (payload as any).desk_id || "unknown";

        let commandsToDispatch: string[] = [];
        try {
          const deskData = (await dbManager.get(
            "SELECT pending_commands FROM desks WHERE id = ?",
            [deskId],
          )) as { pending_commands: string } | null;
          if (deskData && deskData.pending_commands) {
            const parsed = JSON.parse(deskData.pending_commands);
            if (Array.isArray(parsed) && parsed.length > 0) {
              commandsToDispatch = parsed;
              // Clear the queue so we don't send them twice
              await dbManager.run(
                "UPDATE desks SET pending_commands = '[]' WHERE id = ?",
                [deskId],
              );
            }
          }
        } catch (err) {
          console.error(
            `[Heartbeat] Failed to read pending commands for ${deskId}:`,
            err,
          );
        }

        await dbManager.run(
          `INSERT INTO fleet_heartbeats (desk_id, last_seen, metrics, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(desk_id) DO UPDATE SET last_seen = excluded.last_seen, metrics = excluded.metrics, updated_at = CURRENT_TIMESTAMP`,
          [
            deskId,
            hb.timestamp || new Date().toISOString(),
            JSON.stringify(hb.metrics || {}),
          ],
        );

        return Response.json(
          { success: true, commands: commandsToDispatch },
          { headers: corsHeaders },
        );
      }

      // POST /api/cloud/poll-orders — return paid orders for a requesting desk's fulfillment queue
      if (
        url.pathname === "/api/cloud/poll-orders" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        const deskId = (payload as any).desk_id || "";
        const rows = await dbManager.query(
          `SELECT id, orderNumber, items, status, clientName, email, albumId, totalAmount, deskId
           FROM orders
           WHERE status = 'paid' AND (deskId = ? OR desk_id = ?)
           ORDER BY created_at ASC LIMIT 20`,
          [deskId, deskId],
        );
        return Response.json(
          { success: true, items: rows || [] },
          { headers: corsHeaders },
        );
      }

      // POST /api/cloud/upload-photo/chunk — chunked R2 upload
      // R2 key format: {deskId}/{albumId}/{originalName} — prevents cross-master collision
      if (
        url.pathname === "/api/cloud/upload-photo/chunk" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const form = await request.formData();
          const deskId =
            (form.get("deskId") as string) ||
            (payload as any).desk_id ||
            "unknown";
          const albumId = (form.get("albumId") as string) || "unscoped";
          const photoId = form.get("photoId") as string;
          const orderId = form.get("orderId") as string;
          const originalName = (form.get("originalName") as string) || photoId;
          const chunkIndex = parseInt(form.get("chunkIndex") as string, 10);
          const totalChunks = parseInt(form.get("totalChunks") as string, 10);
          const file = form.get("file") as File | null;

          if (!file)
            return createErrorResponse(
              400,
              "Bad Request",
              "Missing file chunk",
            );

          // Build scoped R2 key — desk_id namespace prevents any cross-master collision
          const r2Key = `${deskId}/${albumId}/${originalName}`;

          if (totalChunks === 1 || chunkIndex === totalChunks - 1) {
            // Single chunk or final chunk — simple put
            const buf = await file.arrayBuffer();
            await env.GALLERY_BUCKET.put(r2Key, buf, {
              httpMetadata: { contentType: file.type || "image/webp" },
              customMetadata: {
                deskId,
                albumId,
                photoId,
                orderId: orderId || "",
              },
            });
            console.log(
              `[R2 Upload] Stored: ${r2Key} (${buf.byteLength} bytes)`,
            );
            return Response.json(
              { success: true, key: r2Key },
              { headers: corsHeaders },
            );
          }

          // Multi-chunk: store chunk temporarily with index suffix
          const chunkKey = `chunks/${r2Key}.chunk${chunkIndex}`;
          const buf = await file.arrayBuffer();
          await env.GALLERY_BUCKET.put(chunkKey, buf);
          return Response.json(
            { success: true, chunkKey },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          console.error("[R2 Upload] Error:", e);
          return createErrorResponse(500, "Upload Error", e.message);
        }
      }

      // ── Phase 45: Global Configuration Push ──────────────────────────────
      // GET /api/cloud/sync/settings — Master nodes poll this for global settings
      if (
        url.pathname === "/api/cloud/sync/settings" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const clientHash = url.searchParams.get("hash") || "";

          // Fetch propagatable settings
          const rows = await dbManager.query(
            `SELECT id, value FROM settings
             WHERE id LIKE 'global_%'
                OR id LIKE 'currency_%'
                OR id LIKE 'session_type_%'
                OR id LIKE 'receipt_%'
                OR id LIKE 'website_%'
             ORDER BY id`,
          );

          if (!rows || rows.length === 0) {
            return Response.json(
              { changed: false, hash: "" },
              { headers: corsHeaders },
            );
          }

          // Generate simple SHA-1 hash to avoid sending unchanged payloads
          const payloadString = JSON.stringify(rows);
          const encoder = new TextEncoder();
          const data = encoder.encode(payloadString);
          const hashBuffer = await crypto.subtle.digest("SHA-1", data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const currentHash = hashArray
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          if (clientHash === currentHash) {
            return Response.json(
              { changed: false, hash: currentHash },
              { headers: corsHeaders },
            );
          }

          return Response.json(
            { changed: true, hash: currentHash, settings: rows },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "Sync Settings GET");
        }
      }

      // GET /api/cloud/global-config — list all propagatable settings for admin UI
      if (
        url.pathname === "/api/cloud/global-config" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const rows = await dbManager.query(
            `SELECT id, value, updated_at FROM settings
             WHERE id LIKE 'global_%'
                OR id LIKE 'currency_%'
                OR id LIKE 'session_type_%'
             ORDER BY id`,
          );
          return Response.json(
            { success: true, settings: rows || [] },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "GlobalConfig GET");
        }
      }

      // PUT /api/cloud/global-config — admin writes a single key/value to D1
      // Masters will pick it up on their next heartbeat via GET /api/cloud/sync/settings
      if (
        url.pathname === "/api/cloud/global-config" &&
        request.method === "PUT"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const body = (await request.json()) as { key: string; value: string };
          const { key, value } = body;
          if (!key || value === undefined)
            return createErrorResponse(
              400,
              "Bad Request",
              "key and value are required",
            );

          // Allowlist: only global_*, currency_*, session_type_* keys
          const ALLOWED_PREFIXES = [
            "global_",
            "currency_",
            "session_type_",
            "receipt_",
            "website_",
          ];
          if (!ALLOWED_PREFIXES.some((p) => key.startsWith(p)))
            return createErrorResponse(
              400,
              "Bad Request",
              `Key '${key}' not allowed for global config push`,
            );

          await dbManager.run(
            `INSERT INTO settings (id, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
            [key, String(value)],
          );

          console.log(
            `[GlobalConfig] Set ${key} by desk ${(payload as any).desk_id || "admin"}`,
          );
          return Response.json(
            { success: true, key, value },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "GlobalConfig PUT");
        }
      }

      // ── Phase 45: Maintenance Command Queue ──────────────────────────────
      // POST /api/cloud/maintenance/command — hub admin queues a command for a specific Master
      if (
        url.pathname === "/api/cloud/maintenance/command" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const body = (await request.json()) as {
            desk_id: string;
            command: string;
            args?: Record<string, unknown>;
          };
          const { desk_id, command, args } = body;
          if (!desk_id || !command)
            return createErrorResponse(
              400,
              "Bad Request",
              "desk_id and command are required",
            );

          // Allowlist — only these commands can be queued
          const ALLOWED_COMMANDS = [
            "restart_backend",
            "clear_temp",
            "force_sync",
            "reindex_faces",
            "push_to_kiosk",
            "log_report",
          ];
          if (!ALLOWED_COMMANDS.includes(command))
            return createErrorResponse(
              400,
              "Bad Request",
              `Command '${command}' is not in the allowlist`,
            );

          const id = crypto.randomUUID();
          await dbManager.run(
            `INSERT INTO maintenance_commands (id, desk_id, command, args, status, created_at)
             VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [id, desk_id, command, JSON.stringify(args || {})],
          );

          return Response.json(
            { success: true, id, desk_id, command },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "Maintenance Command");
        }
      }

      // GET /api/cloud/maintenance/next?desk_id=X — Master polls for its pending commands
      if (
        url.pathname === "/api/cloud/maintenance/next" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const deskId =
            url.searchParams.get("desk_id") || (payload as any).desk_id || "";
          if (!deskId)
            return createErrorResponse(400, "Bad Request", "desk_id required");

          const row = await dbManager.get(
            `SELECT id, command, args FROM maintenance_commands
             WHERE desk_id = ? AND status = 'pending'
             ORDER BY created_at ASC LIMIT 1`,
            [deskId],
          );

          return Response.json(
            { success: true, command: row || null },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "Maintenance Next");
        }
      }

      // POST /api/cloud/maintenance/ack — Master reports result of executed command
      if (
        url.pathname === "/api/cloud/maintenance/ack" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const body = (await request.json()) as { id: string; result: string };
          const { id, result } = body;
          if (!id)
            return createErrorResponse(400, "Bad Request", "id required");

          await dbManager.run(
            `UPDATE maintenance_commands
             SET status = 'acked', result = ?, acked_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [result || "ok", id],
          );

          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (e: any) {
          return sendInternalError(e, "Maintenance Ack");
        }
      }

      // ── Phase 46: AI Sales Forecasting Endpoint ──────────────────────────
      // GET /api/cloud/analytics/forecast
      if (
        url.pathname === "/api/cloud/analytics/forecast" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const today = new Date().toISOString().split("T")[0];

          // 1. Today's aggregated metrics
          const todayRow = (await dbManager.get(
            `SELECT
              COUNT(*) as orders_today,
              COALESCE(SUM(total), 0) as revenue_today
             FROM orders
             WHERE date(created_at) = ?`,
            [today],
          )) as { orders_today: number; revenue_today: number } | null;

          const ordersToday = todayRow?.orders_today ?? 0;
          const revenueToday = todayRow?.revenue_today ?? 0;

          // 2. Rolling 7-day history for conversion baseline
          const historyRows = (await dbManager.query(
            `SELECT
              date(created_at) as day,
              COUNT(*) as orders,
              COALESCE(SUM(total), 0) as revenue
             FROM orders
             WHERE date(created_at) >= date('now', '-7 days')
               AND date(created_at) < date('now')
             GROUP BY day
             ORDER BY day DESC`,
          )) as { day: string; orders: number; revenue: number }[];

          // 3. Average Order Value from last 7 days
          const totalHistoricOrders = historyRows.reduce(
            (s, r) => s + r.orders,
            0,
          );
          const totalHistoricRevenue = historyRows.reduce(
            (s, r) => s + r.revenue,
            0,
          );
          const aov =
            totalHistoricOrders > 0
              ? totalHistoricRevenue / totalHistoricOrders
              : 0;

          // 4. Conversion rate = orders / day (7-day average)
          const avgDailyOrders =
            historyRows.length > 0
              ? totalHistoricOrders / historyRows.length
              : ordersToday;

          // 5. Hour-of-day extrapolation
          const nowHour = new Date().getUTCHours();
          const elapsedFraction = Math.max(nowHour / 24, 0.05); // avoid div by 0
          const projectedDailyOrders = Math.round(
            ordersToday / elapsedFraction,
          );
          const projectedDailyRevenue = projectedDailyOrders * aov;

          // 6. End-of-week projection (remaining days × avg)
          const dayOfWeek = new Date().getDay(); // 0=Sun, 6=Sat
          const remainingDays = Math.max(0, 7 - dayOfWeek);
          const projectedWeekRevenue =
            revenueToday + remainingDays * avgDailyOrders * aov;

          // 7. Trend direction vs yesterday
          const yesterdayRow = historyRows.find((r) => {
            const yesterday = new Date(Date.now() - 86400000)
              .toISOString()
              .split("T")[0];
            return r.day === yesterday;
          });
          const trendVsYesterday = yesterdayRow
            ? ((revenueToday - yesterdayRow.revenue) /
                Math.max(yesterdayRow.revenue, 1)) *
              100
            : 0;

          return Response.json(
            {
              success: true,
              today: {
                date: today,
                orders: ordersToday,
                revenue: revenueToday,
              },
              projections: {
                end_of_day_revenue:
                  Math.round(projectedDailyRevenue * 100) / 100,
                end_of_week_revenue:
                  Math.round(projectedWeekRevenue * 100) / 100,
                trend_vs_yesterday_pct: Math.round(trendVsYesterday * 10) / 10,
              },
              meta: {
                aov: Math.round(aov * 100) / 100,
                avg_daily_orders_7d: Math.round(avgDailyOrders * 10) / 10,
                history: historyRows,
              },
            },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "AI Forecast GET");
        }
      }

      // ── Phase 74 & 75: Resort BI Telemetry Ingestion ──────────────────────
      // POST /api/analytics/resort-ingest
      if (
        url.pathname === "/api/analytics/resort-ingest" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const body = (await request.json()) as any;
          const deskId = body.desk_id || (payload as any).desk_id || "unknown";

          await analyticsService.ingestResortBI(deskId, body);

          return Response.json(
            { success: true, message: "Resort BI Data Ingested" },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "Resort Ingest POST");
        }
      }

      // GET /api/analytics/resort-dashboard (Standard API)
      if (
        (url.pathname === "/api/analytics/resort-dashboard" ||
          url.pathname === "/api/analytics/dashboard") &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          // Determine date range. Default to last 30 days if not provided
          const today = new Date().toISOString().split("T")[0];
          const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

          const startDate = url.searchParams.get("startDate") || defaultStart;
          const endDate = url.searchParams.get("endDate") || today;
          // Desk ID filter (if admin wants to see a specific desk)
          const deskId = url.searchParams.get("deskId") || null;

          const data = await analyticsService.getResortBI(
            startDate,
            endDate,
            deskId,
          );

          return Response.json(
            { success: true, data },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "Resort Dashboard GET");
        }
      }

      // ── Phase 62: Centralized Email Relay ────────────────────────────────
      // POST /api/email/relay — securely forward emails from Master apps to Resend
      if (url.pathname === "/api/email/relay" && request.method === "POST") {
        if (!payload) return sendAuthError("Auth required");

        try {
          const body = (await request.json()) as {
            to: string;
            from?: string;
            fromName?: string;
            subject: string;
            html: string;
            text?: string;
            bcc?: string | string[];
          };

          if (!body.to || !body.subject || !body.html) {
            return createErrorResponse(
              400,
              "Bad Request",
              "to, subject, and html are required fields for email relay",
            );
          }

          console.log(
            `[EmailRelay] Forwarding email to ${body.to} on behalf of desk ${(payload as any).desk_id || "unknown"}`,
          );

          const success = await emailRelayService.sendEmail({
            to: body.to,
            from: body.from || "support@clickflash.com",
            fromName: body.fromName || "ClickFlash",
            subject: body.subject,
            html: body.html,
            text: body.text || body.html.replace(/<[^>]*>?/gm, ""),
            bcc: body.bcc,
          });

          if (!success) {
            return createErrorResponse(
              500,
              "Relay Error",
              "Failed to forward email via provider",
            );
          }

          return Response.json(
            { success: true, message: "Email relayed successfully" },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "Email Relay POST");
        }
      }


      // ==========================================
      // Missing Cloud Sync Endpoints
      // ==========================================

      // POST /api/cloud/sync/yield - Sync yield stats
      const yieldMatch = url.pathname.match(/^\/api\/cloud\/sync\/yield$/);
      if (yieldMatch && request.method === "POST") {
        if (!payload) return sendAuthError("Auth required");
        try {
          const { stats } = (await request.json()) as any;
          const deskId = (payload as any).desk_id || "UNKNOWN";

          await dbManager.run(`
            CREATE TABLE IF NOT EXISTS system_yield_stats (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              desk_id TEXT,
              date TEXT,
              total_orders INTEGER,
              paid_orders INTEGER,
              avg_order_value REAL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          for (const s of stats || []) {
            await dbManager.run(
              `INSERT INTO system_yield_stats (desk_id, date, total_orders, paid_orders, avg_order_value) VALUES (?, ?, ?, ?, ?)`,
              [deskId, s.date, s.total_orders, s.paid_orders, s.avg_order_value],
            );
          }

          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (e: any) {
          return createErrorResponse(500, "Sync Error", e.message);
        }
      }

      // GET /api/cloud/sync/yield - Get yield stats
      if (yieldMatch && request.method === "GET") {
        if (!payload) return sendAuthError("Auth required");
        const deskId = (payload as any).desk_id || "UNKNOWN";
        const rows = await dbManager.query(
          `SELECT * FROM system_yield_stats WHERE desk_id = ? ORDER BY date DESC LIMIT 30`,
          [deskId],
        );
        return Response.json(
          { success: true, stats: rows },
          { headers: corsHeaders },
        );
      }

      // POST /api/cloud/sync/crm - Sync CRM leads
      const crmMatch = url.pathname.match(/^\/api\/cloud\/sync\/crm$/);
      if (crmMatch && request.method === "POST") {
        if (!payload) return sendAuthError("Auth required");
        try {
          const { leads } = (await request.json()) as any;
          const deskId = (payload as any).desk_id || "UNKNOWN";

          await dbManager.run(`
            CREATE TABLE IF NOT EXISTS crm_leads (
              id TEXT PRIMARY KEY,
              desk_id TEXT,
              name TEXT,
              email TEXT,
              phone TEXT,
              company TEXT,
              status TEXT DEFAULT 'New',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          for (const lead of leads || []) {
            await dbManager.run(
              `INSERT OR REPLACE INTO crm_leads (id, desk_id, name, email, phone, company, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                lead.id || crypto.randomUUID(),
                deskId,
                lead.name,
                lead.email,
                lead.phone,
                lead.company,
                lead.status || "New",
              ],
            );
          }

          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (e: any) {
          return createErrorResponse(500, "CRM Sync Error", e.message);
        }
      }

      // GET /api/cloud/sync/crm - Get CRM leads
      if (crmMatch && request.method === "GET") {
        if (!payload) return sendAuthError("Auth required");
        const deskId = (payload as any).desk_id || "UNKNOWN";
        const rows = await dbManager.query(
          `SELECT * FROM crm_leads WHERE desk_id = ? ORDER BY created_at DESC`,
          [deskId],
        );
        return Response.json(
          { success: true, leads: rows },
          { headers: corsHeaders },
        );
      }

      // POST /api/cloud/sync/triage - Sync triage data
      const triageMatch = url.pathname.match(/^\/api\/cloud\/sync\/triage$/);
      if (triageMatch && request.method === "POST") {
        if (!payload) return sendAuthError("Auth required");
        try {
          const { triageItems } = (await request.json()) as any;
          const deskId = (payload as any).desk_id || "UNKNOWN";

          await dbManager.run(`
            CREATE TABLE IF NOT EXISTS triage_queue (
              id TEXT PRIMARY KEY,
              desk_id TEXT,
              item_type TEXT,
              priority TEXT DEFAULT 'Medium',
              status TEXT DEFAULT 'Pending',
              description TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          for (const item of triageItems || []) {
            await dbManager.run(
              `INSERT OR REPLACE INTO triage_queue (id, desk_id, item_type, priority, status, description) VALUES (?, ?, ?, ?, ?, ?)`,
              [
                item.id || crypto.randomUUID(),
                deskId,
                item.type,
                item.priority || "Medium",
                item.status || "Pending",
                item.description,
              ],
            );
          }

          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (e: any) {
          return createErrorResponse(500, "Triage Sync Error", e.message);
        }
      }

      // GET /api/cloud/sync/triage - Get triage items
      if (triageMatch && request.method === "GET") {
        if (!payload) return sendAuthError("Auth required");
        const deskId = (payload as any).desk_id || "UNKNOWN";
        const rows = await dbManager.query(
          `SELECT * FROM triage_queue WHERE desk_id = ? ORDER BY created_at DESC`,
          [deskId],
        );
        return Response.json(
          { success: true, items: rows },
          { headers: corsHeaders },
        );
      }

      // GET /api/cloud/inventory - Get inventory
      const inventoryMatch = url.pathname.match(/^\/api\/cloud\/inventory$/);
      if (inventoryMatch && request.method === "GET") {
        if (!payload) return sendAuthError("Auth required");
        const deskId = (payload as any).desk_id || "";
        const rows = await dbManager.query(
          `SELECT * FROM inventory WHERE desk_id = ? OR desk_id = '' ORDER BY name`,
          [deskId],
        );
        return Response.json(
          { success: true, inventory: rows },
          { headers: corsHeaders },
        );
      }

      // GET /api/cloud/equipment - Get equipment
      const equipmentMatch = url.pathname.match(/^\/api\/cloud\/equipment$/);
      if (equipmentMatch && request.method === "GET") {
        if (!payload) return sendAuthError("Auth required");
        const deskId = (payload as any).desk_id || "";
        const rows = await dbManager.query(
          `SELECT * FROM equipment WHERE desk_id = ? OR desk_id = '' ORDER BY name`,
          [deskId],
        );
        return Response.json(
          { success: true, equipment: rows },
          { headers: corsHeaders },
        );
      }

      // GET /api/cloud/maintenance/queue - Get maintenance queue
      const maintenanceMatch = url.pathname.match(
        /^\/api\/cloud\/maintenance\/queue$/,
      );
      if (maintenanceMatch && request.method === "GET") {
        if (!payload) return sendAuthError("Auth required");
        const deskId = (payload as any).desk_id || "";
        const rows = await dbManager.query(
          `SELECT * FROM equipment WHERE (desk_id = ? OR desk_id = '') AND status = 'Maintenance' ORDER BY updated`,
          [deskId],
        );
        return Response.json(
          { success: true, queue: rows },
          { headers: corsHeaders },
        );
      }

      // ==========================================
      // Missing Analytics Endpoints
      // ==========================================

      // GET /api/analytics/pixel-holiday - Get holiday analytics
      const holidayMatch = url.pathname.match(
        /^\/api\/analytics\/pixel-holiday$/,
      );
      if (holidayMatch && request.method === "GET") {
        if (!payload) return sendAuthError("Auth required");
        const deskId = (payload as any).desk_id || "";
        const stats = await dbManager.query(
          `SELECT date, SUM(total_orders) as orders, SUM(total_revenue) as revenue 
           FROM system_stats 
           WHERE desk_id = ? 
           GROUP BY date 
           ORDER BY date DESC LIMIT 30`,
          [deskId],
        );
        return Response.json(
          { success: true, stats },
          { headers: corsHeaders },
        );
      }

      // ==========================================
      // Missing AI Chat Endpoint
      // ==========================================

      // POST /api/ai/chat - AI chat with Gemini
      const chatMatch = url.pathname.match(/^\/api\/ai\/chat$/);
      if (chatMatch && request.method === "POST") {
        if (!payload) return sendAuthError("Auth required");
        try {
          const { message, context } = (await request.json()) as any;
          const aiResponse = await geminiService.generateResponse(
            message,
            context,
          );
          return Response.json(
            { success: true, response: aiResponse },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return createErrorResponse(500, "AI Error", e.message);
        }
      }

      // POST /api/ai/shoot-ideas
      if (url.pathname === "/api/ai/shoot-ideas" && request.method === "POST") {
        if (!payload) return sendAuthError("Auth required");
        try {
          const { location, theme, expertise } = (await request.json()) as any;
          const ideas = await geminiService.generateShootIdeas(location ?? "", theme ?? "", expertise ?? "");
          return Response.json({ success: true, ideas }, { headers: corsHeaders });
        } catch (e: any) {
          return createErrorResponse(500, "AI Error", e.message);
        }
      }

      // POST /api/ai/album-suggestions
      if (url.pathname === "/api/ai/album-suggestions" && request.method === "POST") {
        if (!payload) return sendAuthError("Auth required");
        try {
          const { images, categories } = (await request.json()) as any;
          const suggestions = await geminiService.generateAlbumSuggestions(images ?? [], categories ?? []);
          return Response.json({ success: true, ...suggestions }, { headers: corsHeaders });
        } catch (e: any) {
          return createErrorResponse(500, "AI Error", e.message);
        }
      }

      // POST /api/ai/sales-forecast
      if (url.pathname === "/api/ai/sales-forecast" && request.method === "POST") {
        if (!payload) return sendAuthError("Auth required");
        try {
          const { metrics } = (await request.json()) as any;
          const forecast = await geminiService.generateSalesForecast(metrics ?? {});
          return Response.json({ success: true, ...forecast }, { headers: corsHeaders });
        } catch (e: any) {
          return createErrorResponse(500, "AI Error", e.message);
        }
      }

      return sendNotFoundError("Route", url.pathname);
      } catch (e: any) {
        console.error("Worker Error:", e);
        if (e.status)
          return createErrorResponse(
            e.status,
            "Error",
            e.message,
            undefined,
            e.details,
          );
        return sendInternalError(e);
      }
    })();

    // Apply unified CORS + security headers to every response
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

    // Security headers — matches gallery worker hardening
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    headers.set("Content-Security-Policy",
      "default-src 'none'; img-src * data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },

  // Phase 62: System-Wide Email Architecture - Marketing Automation
  async scheduled(event: any, env: Env, ctx: ExecutionContext): Promise<void> {
    const dbManager = new DatabaseManager(env.DB);
    const emailRelayService = new EmailRelayService(
      console,
      env.RESEND_API_KEY,
      undefined,
      env.ADMIN_NOTIFICATION_EMAIL,
    );
    const marketingService = new MarketingAutomationService(
      dbManager,
      emailRelayService,
    );

    try {
      console.log("[Cron] Running Scheduled Maintenance tasks...");

      // Run MoneyTrash Campaigns
      await marketingService.processDailyCampaigns();

      // Task 1: Abandoned Cart Recovery (Existing Logic)
      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();

      // Select orders that have been viewed but not purchased in the last 24-48 hours.
      // We limit to 50 per run to prevent timeout/rate limits on Cloudflare/Resend.
      const abandonedCarts = (await dbManager.query(
        `
        SELECT id as order_id, customer_email, customer_name, gallery_pin
        FROM orders
        WHERE status = 'VIEWED_ONLY' 
          AND updated_at < ?
          AND marketing_emails_sent < 1
        LIMIT 50
        `,
        [twentyFourHoursAgo],
      )) as Array<{
        order_id: string;
        customer_email: string;
        customer_name: string;
        gallery_pin: string;
      }>;

      console.log(
        `[Cron] Found ${abandonedCarts?.length || 0} abandoned carts to process.`,
      );

      if (abandonedCarts && abandonedCarts.length > 0) {
        for (const cart of abandonedCarts) {
          try {
            // In a real app, this would route to their specific gallery URL
            const galleryUrl = `https://gallery.clicketflash.com/${cart.gallery_pin}`;

            const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 0;">
              <table width="100%" max-width="600" align="center" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; max-width: 600px; margin: 0 auto;">
                <tr>
                  <td style="background-color: #0f172a; padding: 32px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ClickFlash</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 32px;">
                    <h2 style="color: #0f172a; margin-top: 0;">Don't lose your vacation memories, ${cart.customer_name}!</h2>
                    <p style="color: #475569; font-size: 16px; line-height: 1.5;">We noticed you viewed your gallery but haven't unlocked your high-resolution photos yet. They are still securely stored and waiting for you.</p>
                    
                    <div style="background-color: #f0fdfa; border: 1px dashed #14b8a6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                      <p style="color: #0f766e; margin-top: 0; font-weight: bold;">Unlock them today and get 10% off!</p>
                      <p style="color: #0f766e; margin-bottom: 0;">Use code <strong>SAVE10</strong> at checkout.</p>
                    </div>

                    <a href="${galleryUrl}" style="display: inline-block; background-color: #06b6d4; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">Return to Gallery</a>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            `;

            // Note: Sending marketing emails from noreply
            const sent = await emailRelayService.sendEmail({
              to: cart.customer_email,
              from: "noreply@clicketflash.com",
              fromName: "ClickFlash Memories",
              subject: "Don't lose your vacation memories! (Get 10% Off)",
              html: html,
              text: `Don't lose your memories ${cart.customer_name}! Return to your gallery at ${galleryUrl} and use code SAVE10 for 10% off.`,
            });

            if (sent) {
              // Update D1 immediately so we don't double-email them next cron run
              await dbManager.run(
                "UPDATE orders SET marketing_emails_sent = marketing_emails_sent + 1, updated_at = ? WHERE id = ?",
                [new Date().toISOString(), cart.order_id],
              );
            }
          } catch (itemErr) {
            console.error(
              `[Cron] Failed to process cart ${cart.order_id}`,
              itemErr,
            );
          }
        }
      }
    } catch (err) {
      console.error("[Cron] Uncaught error during scheduled execution:", err);
    }
  },
};

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (!env.SENTRY_DSN) {
      return managementHandler.fetch(request, env);
    }
    const wrapped = Sentry.withSentry(
      () => ({
        dsn: env.SENTRY_DSN!,
        tracesSampleRate: 0.1,
        environment: "production",
        release: "clickflash-management@4.2.0",
      }),
      // Custom Env conflicts with Cloudflare.Env global — safe cast
      managementHandler as unknown as ExportedHandler,
    ) as unknown as { fetch: (r: Request, e: Env, c: ExecutionContext) => Promise<Response> };
    return wrapped.fetch(request, env, ctx);
  },
};
