import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "@clickflash/logger";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getRevenueTools = (): Tool[] => [
  {
    name: "yield_simulator",
    description: "Simulates dynamic pricing scenarios based on crowd density, time-of-day, and weather inputs. Returns optimal price points for digital downloads and prints.",
    inputSchema: {
      type: "object",
      properties: {
        basePrice: { type: "number", description: "Base price for a digital download in local currency." },
        crowdDensity: { type: "string", enum: ["low", "medium", "high", "peak"], description: "Current crowd level at the venue." },
        timeOfDay: { type: "string", enum: ["morning", "midday", "afternoon", "evening", "night"], description: "Time of day." },
        weather: { type: "string", enum: ["sunny", "cloudy", "rainy", "stormy"], description: "Current weather conditions." }
      },
      required: ["basePrice"]
    }
  },
  {
    name: "revenue_dashboard",
    description: "Aggregates sales data from the local SQLite database. Returns daily/weekly/monthly yield, conversion rates, average order value, and top-selling products.",
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "week", "month", "all"], description: "Reporting period. Default: today." }
      },
      required: []
    }
  },
  {
    name: "abandoned_cart_scan",
    description: "Scans the database for galleries that were viewed but not purchased within the last N hours. Returns 'hot leads' for the WhatsApp Sales Swarm.",
    inputSchema: {
      type: "object",
      properties: {
        hoursBack: { type: "number", description: "How many hours back to scan. Default: 24.", minimum: 1, maximum: 168 }
      },
      required: []
    }
  }
];

export async function handleYieldSimulator(args: Record<string, unknown>) {
  const basePrice = args.basePrice as number;
  const crowd = (args.crowdDensity as string) || "medium";
  const time = (args.timeOfDay as string) || "midday";
  const weather = (args.weather as string) || "sunny";

  logger.info(`[Revenue] Yield simulation: base=${basePrice}, crowd=${crowd}, time=${time}, weather=${weather}`);

  const crowdMultiplier: Record<string, number> = { low: 0.85, medium: 1.0, high: 1.25, peak: 1.60 };
  const timeMultiplier: Record<string, number> = { morning: 0.90, midday: 1.0, afternoon: 1.10, evening: 1.30, night: 0.75 };
  const weatherMultiplier: Record<string, number> = { sunny: 1.15, cloudy: 1.0, rainy: 0.80, stormy: 0.60 };

  const cm = crowdMultiplier[crowd] ?? 1.0;
  const tm = timeMultiplier[time] ?? 1.0;
  const wm = weatherMultiplier[weather] ?? 1.0;

  const optimalPrice = Math.round(basePrice * cm * tm * wm * 100) / 100;
  const projectedConversion = Math.round((0.35 / (cm * tm)) * 100) / 100;

  const report = [
    `=== YIELD SIMULATION REPORT ===`,
    `Base Price: ${basePrice}`,
    `Crowd: ${crowd} (×${cm}) | Time: ${time} (×${tm}) | Weather: ${weather} (×${wm})`,
    ``,
    `Optimal Price: ${optimalPrice}`,
    `Combined Multiplier: ×${Math.round(cm * tm * wm * 100) / 100}`,
    `Projected Conversion Rate: ${Math.round(projectedConversion * 100)}%`,
    `Projected Revenue per 100 guests: ${Math.round(optimalPrice * projectedConversion * 100)}`,
    ``,
    `Recommendation: ${cm * tm * wm > 1.3 ? "SURGE PRICING — maximize yield during high-demand window." : cm * tm * wm < 0.8 ? "DISCOUNT MODE — lower barriers to drive volume." : "STANDARD PRICING — balanced yield/volume."}`
  ].join("\n");

  return { content: [{ type: "text", text: report }] };
}

export async function handleRevenueDashboard(args: Record<string, unknown>) {
  const period = (args.period as string) || "today";
  logger.info(`[Revenue] Dashboard request for period: ${period}`);

  // Attempt to query the master SQLite DB
  const rootDir = path.resolve(__dirname, "../../../..");
  const dbPath = path.join(rootDir, "apps", "desktop", "master", "prisma", "dev.db");

  if (!fs.existsSync(dbPath)) {
    return { content: [{ type: "text", text: `Revenue Dashboard: Database not found at ${dbPath}. Ensure the Master app has been initialized.` }] };
  }

  try {
    const db = new Database(dbPath, { readonly: true });

    // Attempt to read from orders/sales tables
    let dateFilter = "";
    if (period === "today") dateFilter = "AND date(created_at) = date('now')";
    else if (period === "week") dateFilter = "AND created_at >= datetime('now', '-7 days')";
    else if (period === "month") dateFilter = "AND created_at >= datetime('now', '-30 days')";

    let totalRevenue = 0, orderCount = 0, avgOrder = 0;
    try {
      const row = db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as orders FROM orders WHERE 1=1 ${dateFilter}`).get() as any;
      totalRevenue = row?.revenue ?? 0;
      orderCount = row?.orders ?? 0;
      avgOrder = orderCount > 0 ? Math.round(totalRevenue / orderCount * 100) / 100 : 0;
    } catch {
      // Table might not exist yet
    }

    let galleryCount = 0;
    try {
      const row = db.prepare(`SELECT COUNT(*) as count FROM galleries WHERE 1=1 ${dateFilter}`).get() as any;
      galleryCount = row?.count ?? 0;
    } catch { /* table may not exist */ }

    db.close();

    const conversionRate = galleryCount > 0 ? Math.round((orderCount / galleryCount) * 100) : 0;

    const report = [
      `=== REVENUE DASHBOARD (${period.toUpperCase()}) ===`,
      `Total Revenue: $${totalRevenue.toFixed(2)}`,
      `Orders: ${orderCount}`,
      `Average Order Value: $${avgOrder.toFixed(2)}`,
      `Galleries Created: ${galleryCount}`,
      `Conversion Rate: ${conversionRate}%`,
      ``,
      conversionRate < 20 ? `⚠️ Low conversion. Consider deploying WhatsApp Sales Swarm.` : `✅ Conversion rate is healthy.`
    ].join("\n");

    return { content: [{ type: "text", text: report }] };
  } catch (e: any) {
    return { content: [{ type: "text", text: `Revenue Dashboard error: ${e.message}` }] };
  }
}

export async function handleAbandonedCartScan(args: Record<string, unknown>) {
  const hoursBack = (args.hoursBack as number) || 24;
  logger.info(`[Revenue] Scanning abandoned carts, ${hoursBack}h window`);

  const rootDir = path.resolve(__dirname, "../../../..");
  const dbPath = path.join(rootDir, "apps", "desktop", "master", "prisma", "dev.db");

  if (!fs.existsSync(dbPath)) {
    return { content: [{ type: "text", text: `Abandoned Cart Scan: Database not found. Initialize the Master app first.` }] };
  }

  try {
    const db = new Database(dbPath, { readonly: true });
    let leads: any[] = [];
    try {
      leads = db.prepare(`
        SELECT g.id, g.guest_name, g.guest_phone, g.photo_count, g.viewed_at, g.created_at
        FROM galleries g
        LEFT JOIN orders o ON o.gallery_id = g.id
        WHERE o.id IS NULL
          AND g.viewed_at IS NOT NULL
          AND g.viewed_at >= datetime('now', '-${Math.min(hoursBack, 168)} hours')
        ORDER BY g.viewed_at DESC
        LIMIT 50
      `).all();
    } catch { /* tables may not exist */ }
    db.close();

    if (leads.length === 0) {
      return { content: [{ type: "text", text: `No abandoned carts found in the last ${hoursBack} hours. Gallery funnel is clean.` }] };
    }

    let report = `=== ABANDONED CART SCAN (Last ${hoursBack}h) ===\nFound ${leads.length} hot leads:\n\n`;
    for (const lead of leads) {
      report += `• ${lead.guest_name || 'Unknown Guest'} | ${lead.guest_phone || 'No Phone'} | ${lead.photo_count} photos | Viewed: ${lead.viewed_at}\n`;
    }
    report += `\n→ Deploy WhatsApp Sales Swarm on these leads using sales_swarm_deploy.`;

    return { content: [{ type: "text", text: report }] };
  } catch (e: any) {
    return { content: [{ type: "text", text: `Abandoned Cart Scan error: ${e.message}` }] };
  }
}
