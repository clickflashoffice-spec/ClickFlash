import { sendAuthError, sendNotFoundError, sendInternalError, createErrorResponse } from "../errorHandler.js";
import { logger } from "@clickflash/logger";

export const handleEmail = async (request: Request, url: URL, env: any, dbManager: any, corsHeaders: any, recordService: any, analyticsService: any, emailRelayService: any, photoProcessor: any, geminiService: any, payload: any) => {


      // --- PUBLIC: Check desk_id availability (no auth needed — pre-registration check) ---
      // --- PUBLIC: Register a new Master Desk (no auth — first-time pairing) ---
      // Login (Public)
      // Auth Middleware check for other routes
      // --- PUBLIC: Customer Order Lookup (Gallery Auth — no JWT required) ---
      // These endpoints authenticate customers using their order credentials.
      // Orders arrive here via Master → Cloud Sync, so ALL Masters' customers can log in.
      // Debug: Log incoming request path
      // Generic CRUD Records
      // Analytics Routes
      // --- Phase 70: Ingest Daily Audits from Master Apps ---
      // --- Phase 75: Ingest Resort-level BI from Master Apps ---
      // --- Phase 75: Retrieve Resort BI for Management UI ---
      // --- Phase 70: Retrieve Location Audits for Management UI ---
      // --- Phase 30: Operation-Based Sync Endpoint ---
      // --- Phase 35: Fleet Heartbeat Endpoint ---
      // --- Phase 35: Fleet Status Endpoint ---
      // --- Phase 35: Fleet Stations Endpoint (aliased for FleetService compatibility) ---
      // --- Phase 35: Per-Station Detail Endpoint ---
      // --- Phase 35: Force Sync Endpoint ---
      // --- Phase 45: Dispatch Command Endpoint ---
      // --- Settings Upsert Endpoint ---
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
        const secretKey = env.JWT_SECRET;

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

          if (!env.env.JWT_SECRET) {
            return createErrorResponse(
              500,
              "InternalServerError",
              "env.JWT_SECRET environment variable not configured.",
            );
          }
          const secretKey = env.env.JWT_SECRET;
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
      // GET /api/cloud/sync/operations?since_hub_index=N — pull remote ops for bi-directional sync
      // Excludes ops from the requesting desk to avoid echo
      // POST /api/cloud/sync/order — sync validated orders from Master and send gallery access email
      // POST /api/cloud/sync/batch — generic batch upsert for system_stats, retention stats, etc.
      // POST /api/cloud/heartbeat — store fleet heartbeat per desk
      // ── Phase 51: Global Settings Propagation to Masters ──────────────
      // GET /api/cloud/sync/settings?hash=XXX — Masters pull global settings
      // POST /api/cloud/heartbeat — store fleet heartbeat per desk
      // POST /api/cloud/poll-orders — return paid orders for a requesting desk's fulfillment queue
      // POST /api/cloud/upload-photo/chunk — chunked R2 upload
      // R2 key format: {deskId}/{albumId}/{originalName} — prevents cross-master collision
      // ── Phase 45: Global Configuration Push ──────────────────────────────
      // GET /api/cloud/sync/settings — Master nodes poll this for global settings
      // GET /api/cloud/global-config — list all propagatable settings for admin UI
      // PUT /api/cloud/global-config — admin writes a single key/value to D1
      // Masters will pick it up on their next heartbeat via GET /api/cloud/sync/settings
      // ── Phase 45: Maintenance Command Queue ──────────────────────────────
      // POST /api/cloud/maintenance/command — hub admin queues a command for a specific Master
      // GET /api/cloud/maintenance/next?desk_id=X — Master polls for its pending commands
      // POST /api/cloud/maintenance/ack — Master reports result of executed command
      // ── Phase 46: AI Sales Forecasting Endpoint ──────────────────────────
      // GET /api/cloud/analytics/forecast
      // ── Phase 74 & 75: Resort BI Telemetry Ingestion ──────────────────────
      // POST /api/analytics/resort-ingest
      // GET /api/analytics/resort-dashboard (Standard API)
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

          logger.info(String(`[EmailRelay] Forwarding email to ${body.to} on behalf of desk ${(payload as any).desk_id || "unknown"}`));

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
  return null;
};
