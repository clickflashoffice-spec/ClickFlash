import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "@clickflash/logger";

export const getGlobalTools = (): Tool[] => [
  {
    name: "multi_venue_overview",
    description: "Aggregates KPIs across all deployed ClickFlash venues worldwide. Returns a global operations dashboard.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "currency_converter",
    description: "Converts revenue figures between currencies for multi-region reporting.",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount to convert." },
        from: { type: "string", description: "Source currency code (e.g., USD, EUR, GBP)." },
        to: { type: "string", description: "Target currency code." }
      },
      required: ["amount", "from", "to"]
    }
  },
  {
    name: "venue_comparison",
    description: "Side-by-side comparison of two venues: revenue, volume, conversion, average order value.",
    inputSchema: {
      type: "object",
      properties: {
        venueA: { type: "string", description: "First venue name or ID." },
        venueB: { type: "string", description: "Second venue name or ID." }
      },
      required: ["venueA", "venueB"]
    }
  }
];

export async function handleMultiVenueOverview(_args: Record<string, unknown>) {
  logger.info("[Global] Multi-venue overview");

  return {
    content: [{
      type: "text",
      text: [
        `=== GLOBAL MULTI-VENUE OVERVIEW ===`,
        ``,
        `Multi-venue aggregation requires the Cloud Backend (Cloudflare Worker)`,
        `to collect telemetry from all deployed Master edge nodes.`,
        ``,
        `--- Architecture ---`,
        `Edge Node (Master) → Redis Streams → Cloud Backend (D1) → Global Dashboard`,
        ``,
        `--- Per-Venue Metrics ---`,
        `• Daily captures, galleries, revenue`,
        `• Photographer headcount and efficiency`,
        `• Edge node health and uptime`,
        `• Guest satisfaction (NPS)`,
        ``,
        `--- Global Aggregation ---`,
        `• Total revenue across all venues`,
        `• Best/worst performing venue`,
        `• Global conversion rate benchmark`,
        `• Cross-venue guest recognition (repeat visitors)`,
        ``,
        `Deploy: apps/backend/cloud-backend handles global aggregation via D1 database.`
      ].join("\n")
    }]
  };
}

export async function handleCurrencyConverter(args: Record<string, unknown>) {
  const amount = args.amount as number;
  const from = (args.from as string).toUpperCase();
  const to = (args.to as string).toUpperCase();
  logger.info(`[Global] Currency conversion: ${amount} ${from} → ${to}`);

  // Static rates for offline operation (edge-first principle)
  const rates: Record<string, number> = {
    USD: 1.0, EUR: 0.92, GBP: 0.79, AED: 3.67, SAR: 3.75,
    JPY: 149.5, CNY: 7.24, AUD: 1.54, CAD: 1.36, INR: 83.1,
    MXN: 17.2, BRL: 4.97, THB: 35.8, SGD: 1.34, KRW: 1320
  };

  const fromRate = rates[from];
  const toRate = rates[to];

  if (!fromRate || !toRate) {
    return { content: [{ type: "text", text: `Unknown currency: ${!fromRate ? from : to}. Supported: ${Object.keys(rates).join(", ")}` }] };
  }

  const usdAmount = amount / fromRate;
  const converted = Math.round(usdAmount * toRate * 100) / 100;

  return {
    content: [{
      type: "text",
      text: [
        `=== CURRENCY CONVERSION ===`,
        `${amount} ${from} = ${converted} ${to}`,
        `Rate: 1 ${from} = ${Math.round((toRate / fromRate) * 10000) / 10000} ${to}`,
        ``,
        `⚠️ Using offline static rates. For live rates, integrate with an exchange rate API.`
      ].join("\n")
    }]
  };
}

export async function handleVenueComparison(args: Record<string, unknown>) {
  const venueA = args.venueA as string;
  const venueB = args.venueB as string;
  logger.info(`[Global] Venue comparison: ${venueA} vs ${venueB}`);

  return {
    content: [{
      type: "text",
      text: [
        `=== VENUE COMPARISON ===`,
        `${venueA} vs ${venueB}`,
        ``,
        `Comparison data requires the Cloud Backend D1 database`,
        `with telemetry from both venue edge nodes.`,
        ``,
        `--- Comparison Dimensions ---`,
        `| Metric              | ${venueA.padEnd(20)} | ${venueB.padEnd(20)} |`,
        `|---------------------|${"".padEnd(22, "-")}|${"".padEnd(22, "-")}|`,
        `| Daily Revenue       | Query D1             | Query D1             |`,
        `| Conversion Rate     | Query D1             | Query D1             |`,
        `| Avg Order Value     | Query D1             | Query D1             |`,
        `| Captures/Day        | Query D1             | Query D1             |`,
        `| Photographer Count  | Query D1             | Query D1             |`,
        `| Guest Satisfaction  | Query D1             | Query D1             |`,
        ``,
        `Populate via: apps/backend/cloud-backend → venue_metrics table`
      ].join("\n")
    }]
  };
}
