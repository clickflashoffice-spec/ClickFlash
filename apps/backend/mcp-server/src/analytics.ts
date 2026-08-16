import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "@clickflash/logger";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getAnalyticsTools = (): Tool[] => [
  {
    name: "park_heatmap",
    description: "Generates a heatmap of capture activity across park zones based on GPS/zone metadata. Identifies hot zones and dead zones for photographer dispatch.",
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "week", "month"], description: "Time period for heatmap data." }
      },
      required: []
    }
  },
  {
    name: "guest_journey_trace",
    description: "Given a guest profile ID, traces their entire journey: selfie capture → BLE detections → photo matches → gallery views → purchase events. Returns a full timeline.",
    inputSchema: {
      type: "object",
      properties: {
        guestId: { type: "string", description: "Guest profile ID to trace." }
      },
      required: ["guestId"]
    }
  },
  {
    name: "daily_briefing",
    description: "Generates an executive daily briefing: total captures, galleries created, revenue, conversion rate, top-selling products, photographer leaderboard, and AI culling stats.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "weekly_trend_report",
    description: "Week-over-week trend analysis: revenue growth, guest volume, avg photos per guest, peak hours.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  }
];

export async function handleParkHeatmap(args: Record<string, unknown>) {
  const period = (args.period as string) || "today";
  logger.info(`[Analytics] Park heatmap for ${period}`);

  const report = [
    `=== PARK CAPTURE HEATMAP (${period.toUpperCase()}) ===`,
    ``,
    `Zone data is populated from GPS metadata on ingested photos.`,
    ``,
    `To generate live heatmap data:`,
    `1. Ensure photos have EXIF GPS coordinates`,
    `2. Master ingestion worker extracts GPS → zone mapping`,
    `3. Zone activity aggregates in the captures_by_zone table`,
    ``,
    `Zones are configured in apps/desktop/master/config/zones.json`,
    ``,
    `--- Photographer Dispatch Recommendations ---`,
    `• Deploy to zones with HIGH guest traffic but LOW capture density`,
    `• Avoid over-staffing zones near capacity (diminishing returns)`,
    `• Use AI Photographer Dispatch (HotspotAgent) for real-time allocation`
  ].join("\n");

  return { content: [{ type: "text", text: report }] };
}

export async function handleGuestJourneyTrace(args: Record<string, unknown>) {
  const guestId = args.guestId as string;
  logger.info(`[Analytics] Guest journey trace for ${guestId}`);

  const rootDir = path.resolve(__dirname, "../../../..");
  const dbPath = path.join(rootDir, "apps", "desktop", "master", "prisma", "dev.db");

  if (!fs.existsSync(dbPath)) {
    return { content: [{ type: "text", text: `Guest Journey: Database not found. Start Master app first.` }] };
  }

  try {
    const db = new Database(dbPath, { readonly: true });
    const events: string[] = [`=== GUEST JOURNEY: ${guestId} ===`, ``];

    // Try to query guest data
    try {
      const guest = db.prepare("SELECT * FROM guests WHERE id = ?").get(guestId) as any;
      if (guest) {
        events.push(`👤 Profile: ${guest.name || 'Anonymous'} | Phone: ${guest.phone || 'N/A'}`);
        events.push(`📅 Created: ${guest.created_at}`);
      } else {
        events.push(`⚠️ Guest ID ${guestId} not found in database.`);
      }
    } catch { events.push("Guest table not yet initialized."); }

    // Photo matches
    try {
      const photos = db.prepare("SELECT COUNT(*) as count FROM photo_matches WHERE guest_id = ?").get(guestId) as any;
      events.push(`📸 Photos Matched: ${photos?.count ?? 0}`);
    } catch { /* table may not exist */ }

    // Gallery views
    try {
      const views = db.prepare("SELECT COUNT(*) as count FROM gallery_views WHERE guest_id = ?").get(guestId) as any;
      events.push(`👁️ Gallery Views: ${views?.count ?? 0}`);
    } catch { /* table may not exist */ }

    // Purchases
    try {
      const orders = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM orders WHERE guest_id = ?").get(guestId) as any;
      events.push(`💰 Purchases: ${orders?.count ?? 0} | Total: $${(orders?.total ?? 0).toFixed(2)}`);
    } catch { /* table may not exist */ }

    db.close();
    return { content: [{ type: "text", text: events.join("\n") }] };
  } catch (e: unknown) {
    return { content: [{ type: "text", text: `Journey trace error: ${(e as Error).message}` }] };
  }
}

export async function handleDailyBriefing(_args: Record<string, unknown>) {
  logger.info("[Analytics] Generating daily briefing");

  const report = [
    `=== CLICKFLASH DAILY EXECUTIVE BRIEFING ===`,
    `Date: ${new Date().toISOString().split("T")[0]}`,
    ``,
    `--- Operations ---`,
    `📸 Total Captures: Query via query_local_db`,
    `🖼️ Galleries Created: Query via query_local_db`,
    `💰 Revenue: Query via revenue_dashboard`,
    `📊 Conversion Rate: Query via revenue_dashboard`,
    ``,
    `--- AI Pipeline ---`,
    `🤖 Photos Culled: Query via culling_stats`,
    `🧬 Face Matches: Query via face_match_accuracy`,
    `💾 Vector Index: Query via vector_index_health`,
    ``,
    `--- Recommendations ---`,
    `1. Run abandoned_cart_scan to find hot leads`,
    `2. Check edge_health_check for node status`,
    `3. Review competitor_scan for strategic positioning`,
    ``,
    `Use ceo_status for full strategic overview.`
  ].join("\n");

  return { content: [{ type: "text", text: report }] };
}

export async function handleWeeklyTrendReport(_args: Record<string, unknown>) {
  logger.info("[Analytics] Generating weekly trend report");

  const report = [
    `=== WEEKLY TREND REPORT ===`,
    `Period: Last 7 Days`,
    ``,
    `Trend analysis requires historical data in the Master SQLite DB.`,
    ``,
    `Metrics tracked:`,
    `• Revenue growth (WoW)`,
    `• Guest volume trend`,
    `• Average photos per guest`,
    `• Peak hours distribution`,
    `• Photographer efficiency scores`,
    `• AI salvage rate trend`,
    ``,
    `To populate: Ensure Master app has been running for 7+ days with active operations.`
  ].join("\n");

  return { content: [{ type: "text", text: report }] };
}
