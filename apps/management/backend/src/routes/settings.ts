import { createErrorResponse } from "../errorHandler.js";

export const handleSettings = async (request: Request, url: URL, env: any, dbManager: any, corsHeaders: any, recordService: any, analyticsService: any, emailRelayService: any, photoProcessor: any, geminiService: any, payload: any) => {


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
  return null;
};
