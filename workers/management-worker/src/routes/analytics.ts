import { sendAuthError, sendInternalError, createErrorResponse } from "../errorHandler.js";
import { logger } from "@clickflash/logger";

export const handleAnalytics = async (request: Request, url: URL, env: any, dbManager: any, corsHeaders: any, recordService: any, analyticsService: any, emailRelayService: any, photoProcessor: any, geminiService: any, payload: any) => {
  const deskId = payload?.desk_id || "UNKNOWN";



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

      // --- Phase 4: Financial Analytics (MoneyTrash) ---
      if (
        url.pathname === "/api/analytics/financials" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        const startDate = url.searchParams.get("startDate") || "";
        const endDate = url.searchParams.get("endDate") || "";
        const targetDeskId = url.searchParams.get("deskId") || null;
        try {
          const financials = await analyticsService.getFinancialAnalytics(
            startDate,
            endDate,
            targetDeskId
          );
          return Response.json({ success: true, ...financials }, { headers: corsHeaders });
        } catch (error: any) {
          logger.error("[Financial Analytics Error]", { args: [error] });
          return sendInternalError(error, "Financial Analytics");
        }
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
                logger.error("AI Audit generation failed:", { args: [e] });
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
          logger.error("[Daily Audit Ingest Error]", { args: [error] });
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
          logger.error("[Resort BI Ingest Error]", { args: [error] });
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
          logger.error("[Resort BI Retrieval Error]", { args: [error] });
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
          logger.error("[Location Audits Retrieval Error]", { args: [error] });
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
          logger.error("[Forecast Error]", { args: [err] });
          return createErrorResponse(500, "AI Forecast Error", err.message);
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
  return null;
};
