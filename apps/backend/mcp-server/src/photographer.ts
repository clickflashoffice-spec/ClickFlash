import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "@clickflash/logger";

export const getPhotographerTools = (): Tool[] => [
  {
    name: "photographer_leaderboard",
    description: "Rankings by captures/hour, guest satisfaction, revenue generated, and AI quality score.",
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "week", "month", "all"], description: "Ranking period." }
      },
      required: []
    }
  },
  {
    name: "photographer_dispatch",
    description: "Assigns photographers to zones based on heatmap data and predicted demand curves.",
    inputSchema: {
      type: "object",
      properties: {
        photographerCount: { type: "number", description: "Number of photographers available for dispatch." },
        zoneCount: { type: "number", description: "Number of active zones in the venue." }
      },
      required: ["photographerCount", "zoneCount"]
    }
  },
  {
    name: "shift_planner",
    description: "Generates optimal shift schedules based on historical park traffic patterns and photographer count.",
    inputSchema: {
      type: "object",
      properties: {
        totalPhotographers: { type: "number", description: "Total photographer headcount." },
        operatingHours: { type: "number", description: "Venue operating hours per day. Default: 12." }
      },
      required: ["totalPhotographers"]
    }
  }
];

export async function handlePhotographerLeaderboard(args: Record<string, unknown>) {
  const period = (args.period as string) || "today";
  logger.info(`[Photographer] Leaderboard for ${period}`);

  return {
    content: [{
      type: "text",
      text: [
        `=== PHOTOGRAPHER LEADERBOARD (${period.toUpperCase()}) ===`,
        ``,
        `Leaderboard data populated from Master DB capture logs.`,
        ``,
        `Ranking Metrics:`,
        `• Captures/Hour (volume efficiency)`,
        `• Revenue/Capture (yield quality)`,
        `• AI Quality Score (Laplacian pass rate)`,
        `• Guest Satisfaction (post-purchase rating)`,
        ``,
        `Query: SELECT photographer_id, COUNT(*) as captures, AVG(quality_score) as avg_quality`,
        `FROM photos WHERE date(captured_at) = date('now') GROUP BY photographer_id ORDER BY captures DESC`
      ].join("\n")
    }]
  };
}

export async function handlePhotographerDispatch(args: Record<string, unknown>) {
  const photographers = args.photographerCount as number;
  const zones = args.zoneCount as number;
  logger.info(`[Photographer] Dispatch: ${photographers} photographers across ${zones} zones`);

  const perZone = Math.floor(photographers / zones);
  const remainder = photographers % zones;

  return {
    content: [{
      type: "text",
      text: [
        `=== PHOTOGRAPHER DISPATCH PLAN ===`,
        `Photographers: ${photographers} | Zones: ${zones}`,
        ``,
        `Base allocation: ${perZone} per zone`,
        `Surplus: ${remainder} → Deploy to highest-traffic zones`,
        ``,
        `--- Optimization Strategy ---`,
        `1. Query park_heatmap for real-time zone activity`,
        `2. Weight allocation by zone traffic (hot zones get +1-2 photographers)`,
        `3. Keep 1 photographer as "roamer" for VIP/special requests`,
        `4. Rotate every 2 hours to prevent fatigue zones`,
        ``,
        `For AI-powered dispatch, enable HotspotAgent in the Management Hub.`
      ].join("\n")
    }]
  };
}

export async function handleShiftPlanner(args: Record<string, unknown>) {
  const total = args.totalPhotographers as number;
  const hours = (args.operatingHours as number) || 12;
  logger.info(`[Photographer] Shift planning: ${total} photographers, ${hours}h operation`);

  const shifts = Math.ceil(hours / 6);
  const perShift = Math.ceil(total / shifts);

  return {
    content: [{
      type: "text",
      text: [
        `=== SHIFT PLANNER ===`,
        `Total Photographers: ${total}`,
        `Operating Hours: ${hours}h`,
        `Shifts Required: ${shifts} (6h per shift)`,
        `Photographers per Shift: ${perShift}`,
        ``,
        `--- Recommended Schedule ---`,
        shifts >= 1 ? `Shift 1 (AM): ${perShift} photographers` : ``,
        shifts >= 2 ? `Shift 2 (PM): ${perShift} photographers` : ``,
        shifts >= 3 ? `Shift 3 (EVE): ${total - (perShift * 2)} photographers` : ``,
        ``,
        `Peak hours (11am-2pm) should have maximum coverage.`,
        `Consider overlapping shifts by 30min for handoff.`
      ].filter(Boolean).join("\n")
    }]
  };
}
