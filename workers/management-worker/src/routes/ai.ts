import { sendAuthError, sendNotFoundError, createErrorResponse } from "../errorHandler.js";

export const handleAi = async (request: Request, url: URL, env: any, dbManager: any, corsHeaders: any, recordService: any, analyticsService: any, emailRelayService: any, photoProcessor: any, geminiService: any, payload: any) => {


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
      // --- Phase 40: Generate Signed R2 Download URL ---
      // File Serving (R2)
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
      // ==========================================
      // Missing Cloud Sync Endpoints
      // ==========================================

      // POST /api/cloud/sync/yield - Sync yield stats
      // GET /api/cloud/sync/yield - Get yield stats
      // POST /api/cloud/sync/crm - Sync CRM leads
      // GET /api/cloud/sync/crm - Get CRM leads
      // POST /api/cloud/sync/triage - Sync triage data
      // GET /api/cloud/sync/triage - Get triage items
      // GET /api/cloud/inventory - Get inventory
      // GET /api/cloud/equipment - Get equipment
      // GET /api/cloud/maintenance/queue - Get maintenance queue
      // ==========================================
      // Missing Analytics Endpoints
      // ==========================================

      // GET /api/analytics/pixel-holiday - Get holiday analytics
      // ==========================================
      // Missing AI Chat Endpoint
      // ==========================================

      // POST /api/ai/chat - AI chat with Gemini
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
  return null;
};
