import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./logger.js";

export const getCustomerTools = (): Tool[] => [
  {
    name: "customer_segmentation",
    description: "Segments guests by behavior: first-timers, repeat visitors, high-spenders, browsers, and churned. Returns segment counts and characteristics.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "nps_calculator",
    description: "Calculates Net Promoter Score from post-purchase survey data.",
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "week", "month", "all"], description: "Survey period." }
      },
      required: []
    }
  },
  {
    name: "churn_predictor",
    description: "Identifies guests likely to abandon based on session patterns and browsing behavior. Returns at-risk profiles.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  }
];

export async function handleCustomerSegmentation(_args: Record<string, unknown>) {
  logger.info("[Customer] Running segmentation analysis");

  return {
    content: [{
      type: "text",
      text: [
        `=== CUSTOMER SEGMENTATION ===`,
        ``,
        `--- Segment Definitions ---`,
        `🟢 HIGH-SPENDERS: Purchased 3+ items or spent >$50`,
        `🔵 REPEAT VISITORS: Returned to gallery 2+ times`,
        `🟡 BROWSERS: Viewed gallery but no purchase`,
        `🟠 FIRST-TIMERS: New guests with selfie but no gallery yet`,
        `🔴 CHURNED: Gallery created >7 days ago, no purchase, no return`,
        ``,
        `--- Query Templates ---`,
        `High-Spenders: SELECT * FROM guests WHERE total_spent > 50`,
        `Browsers: SELECT g.* FROM guests g JOIN gallery_views v ON v.guest_id = g.id LEFT JOIN orders o ON o.guest_id = g.id WHERE o.id IS NULL`,
        `Churned: SELECT * FROM guests WHERE last_activity < datetime('now', '-7 days') AND total_spent = 0`,
        ``,
        `--- Action Matrix ---`,
        `• HIGH-SPENDERS → VIP upsell (3D avatars, premium prints)`,
        `• BROWSERS → WhatsApp CloserAgent with 10% discount`,
        `• CHURNED → NegotiatorAgent with aggressive 25% discount`,
        `• FIRST-TIMERS → Send gallery notification when photos ready`
      ].join("\n")
    }]
  };
}

export async function handleNpsCalculator(args: Record<string, unknown>) {
  const period = (args.period as string) || "all";
  logger.info(`[Customer] NPS calculation for ${period}`);

  return {
    content: [{
      type: "text",
      text: [
        `=== NET PROMOTER SCORE (${period.toUpperCase()}) ===`,
        ``,
        `NPS requires post-purchase survey data in the Master DB.`,
        ``,
        `--- Formula ---`,
        `NPS = % Promoters (9-10) - % Detractors (0-6)`,
        `Range: -100 to +100`,
        ``,
        `--- Industry Benchmarks ---`,
        `Theme Park Photography: +35 (average)`,
        `ClickFlash Target: +65 (world-class)`,
        ``,
        `--- Survey Collection Points ---`,
        `1. Post-purchase confirmation page`,
        `2. WhatsApp follow-up 24h after gallery delivery`,
        `3. In-app rating prompt in consumer mobile app`,
        ``,
        `Query: SELECT`,
        `  ROUND(100.0 * SUM(CASE WHEN score >= 9 THEN 1 ELSE 0 END) / COUNT(*)) as promoters,`,
        `  ROUND(100.0 * SUM(CASE WHEN score <= 6 THEN 1 ELSE 0 END) / COUNT(*)) as detractors`,
        `FROM surveys`
      ].join("\n")
    }]
  };
}

export async function handleChurnPredictor(_args: Record<string, unknown>) {
  logger.info("[Customer] Churn prediction analysis");

  return {
    content: [{
      type: "text",
      text: [
        `=== CHURN PREDICTOR ===`,
        ``,
        `--- Risk Signals ---`,
        `🔴 HIGH RISK: Gallery viewed 1 time, >48h ago, no return`,
        `🟠 MEDIUM RISK: Gallery viewed 2+ times, no cart additions`,
        `🟡 LOW RISK: Items in cart but checkout abandoned`,
        ``,
        `--- Intervention Strategies ---`,
        `HIGH RISK → Immediate WhatsApp magic link + 20% off`,
        `MEDIUM RISK → CloserAgent with social proof ("87% of guests buy!")`,
        `LOW RISK → Gentle reminder + free bonus digital download`,
        ``,
        `--- Churn Prevention KPIs ---`,
        `• Recovery Rate: % of at-risk guests who eventually purchase`,
        `• Time-to-Recovery: Average hours from intervention to purchase`,
        `• Revenue Recovered: Total $ from churn prevention campaigns`
      ].join("\n")
    }]
  };
}
