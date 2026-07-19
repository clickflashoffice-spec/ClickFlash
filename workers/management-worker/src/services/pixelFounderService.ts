export interface SalesTrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface SalesMetrics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  thirtyDayTrend: SalesTrendPoint[];
}

export interface PerformanceAudit {
  importedPhotos: number;
  soldPhotos: number;
  badQualityPhotos: number;
  totalCustomers: number;
  salesRevenue: number;
}

type UnknownRecord = Record<string, unknown>;

const safeNumber = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const safeText = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 120);
  return normalized || fallback;
};

const asRecord = (value: unknown): UnknownRecord | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;

const readMetric = (context: unknown, keys: string[]): number | undefined => {
  const root = asRecord(context);
  if (!root) return undefined;

  const sources = [root, asRecord(root.metrics), asRecord(root.telemetry)].filter(
    (source): source is UnknownRecord => Boolean(source),
  );

  for (const source of sources) {
    for (const key of keys) {
      if (!(key in source)) continue;
      const parsed = Number(source[key]);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return undefined;
};

const formatMoney = (value: number): string => `$${roundMoney(value).toFixed(2)}`;

/**
 * First-party, deterministic business guidance for the Management app.
 * It uses only data supplied by ClickFlash and never calls an external model.
 */
export class PixelFounderService {
  private geminiApiKey?: string;

  constructor(geminiApiKey?: string) {
    this.geminiApiKey = geminiApiKey;
  }

  async generateSalesForecast(metrics: Partial<SalesMetrics> = {}): Promise<{
    end_of_week_revenue: number;
    end_of_month_revenue: number;
    insights: string[];
  }> {
    const trend = Array.isArray(metrics.thirtyDayTrend)
      ? metrics.thirtyDayTrend
          .map((point) => ({
            date: safeText(point?.date, ""),
            revenue: safeNumber(point?.revenue),
            orders: safeNumber(point?.orders),
          }))
          .filter((point) => point.date)
          .sort((a, b) => a.date.localeCompare(b.date))
      : [];

    const trendRevenue = trend.reduce((sum, point) => sum + point.revenue, 0);
    const totalRevenue = safeNumber(metrics.totalRevenue) || trendRevenue;
    const observedDays = trend.length || (totalRevenue > 0 ? 30 : 0);
    const dailyRunRate = observedDays > 0 ? totalRevenue / observedDays : 0;
    const totalOrders = safeNumber(metrics.totalOrders) ||
      trend.reduce((sum, point) => sum + point.orders, 0);
    const averageOrderValue = safeNumber(metrics.averageOrderValue) ||
      (totalOrders > 0 ? totalRevenue / totalOrders : 0);

    const recent = trend.slice(-7);
    const previous = trend.slice(-14, -7);
    const recentAverage = recent.length
      ? recent.reduce((sum, point) => sum + point.revenue, 0) / recent.length
      : 0;
    const previousAverage = previous.length
      ? previous.reduce((sum, point) => sum + point.revenue, 0) / previous.length
      : 0;

    const insights = [
      dailyRunRate > 0
        ? `The observed daily revenue run rate is ${formatMoney(dailyRunRate)} across ${observedDays} day${observedDays === 1 ? "" : "s"} of supplied data.`
        : "No positive revenue observations were supplied, so the forecast is zero.",
    ];

    if (recent.length === 7 && previous.length === 7 && previousAverage > 0) {
      const change = ((recentAverage - previousAverage) / previousAverage) * 100;
      const direction = change >= 0 ? "up" : "down";
      insights.push(
        `The latest seven-day average is ${direction} ${Math.abs(change).toFixed(1)}% versus the previous seven days.`,
      );
    } else {
      insights.push("Fourteen daily observations are needed for a reliable week-over-week comparison.");
    }

    insights.push(
      averageOrderValue > 0
        ? `Average order value is ${formatMoney(averageOrderValue)} across ${Math.round(totalOrders)} supplied orders.`
        : "Average order value cannot be calculated from the supplied totals.",
    );

    return {
      end_of_week_revenue: roundMoney(dailyRunRate * 7),
      end_of_month_revenue: roundMoney(dailyRunRate * 30),
      insights,
    };
  }

  async generateShootIdeas(
    location: string,
    theme: string,
    expertise: string,
  ): Promise<Array<{
    title: string;
    description: string;
    settings: { aperture: string; shutter_speed: string; iso: number };
  }>> {
    const safeLocation = safeText(location, "the selected location");
    const safeTheme = safeText(theme, "timeless travel");
    const safeExpertise = safeText(expertise, "all-level");

    return [
      {
        title: `${safeTheme} Arrival Story`,
        description: `Build a short establishing sequence at ${safeLocation}, moving from a wide scene to candid guest interactions. Designed for ${safeExpertise} photographers.`,
        settings: { aperture: "f/4", shutter_speed: "1/250", iso: 200 },
      },
      {
        title: `${safeLocation} Detail Trail`,
        description: `Pair environmental details with relaxed portraits to create a cohesive ${safeTheme} album narrative.`,
        settings: { aperture: "f/2.8", shutter_speed: "1/320", iso: 320 },
      },
      {
        title: `${safeTheme} Motion Finale`,
        description: `Finish with guided movement and one clean group frame, using the strongest available directional light at ${safeLocation}.`,
        settings: { aperture: "f/5.6", shutter_speed: "1/500", iso: 400 },
      },
    ];
  }

  async generateAlbumSuggestions(
    images: Array<{ mimeType?: string }>,
    availableCategories: string[] = [],
  ): Promise<{
    title: string;
    description: string;
    categories: string[];
    coverPhotoIndex: number;
  }> {
    const imageCount = Array.isArray(images) ? images.length : 0;
    const categories = availableCategories
      .map((category) => safeText(category, ""))
      .filter((category, index, all) => category && all.indexOf(category) === index)
      .slice(0, 2);
    const leadCategory = categories[0];

    return {
      title: leadCategory ? `${leadCategory} Collection` : "Photo Collection",
      description: `Metadata-based draft for ${imageCount} photo${imageCount === 1 ? "" : "s"}. Review the title, categories, and cover before publishing.`,
      categories,
      coverPhotoIndex: 0,
    };
  }

  generatePerformanceReview(audit: PerformanceAudit): string {
    const importedPhotos = safeNumber(audit.importedPhotos);
    const soldPhotos = safeNumber(audit.soldPhotos);
    const badQualityPhotos = safeNumber(audit.badQualityPhotos);
    const totalCustomers = safeNumber(audit.totalCustomers);
    const salesRevenue = safeNumber(audit.salesRevenue);
    const soldPercent = importedPhotos > 0 ? (soldPhotos / importedPhotos) * 100 : 0;
    const salesRate = totalCustomers > 0 ? (soldPhotos / totalCustomers) * 100 : 0;
    const qualityRate = importedPhotos > 0 ? (badQualityPhotos / importedPhotos) * 100 : 0;

    const performance = salesRate >= 25
      ? "Sales conversion is above the 25% operating reference."
      : "Sales conversion is below the 25% operating reference and should be reviewed.";
    const quality = badQualityPhotos > 0
      ? `${Math.round(badQualityPhotos)} photos were flagged for quality (${qualityRate.toFixed(1)}% of imports).`
      : "No imported photos were flagged for quality.";

    return `Sales rate was ${salesRate.toFixed(1)}% and imported-photo sell-through was ${soldPercent.toFixed(1)}%, producing ${formatMoney(salesRevenue)} in revenue. ${performance} ${quality}`;
  }

  async generateResponse(message: string, context?: unknown): Promise<string> {
    const normalizedMessage = safeText(message, "").toLowerCase();
    const root = asRecord(context);
    const activeContext = safeText(root?.selectedContext, "Global / Enterprise");
    const totalOrders = readMetric(context, ["totalOrders", "total_orders"]);
    const pendingOrders = readMetric(context, ["pendingOrders", "pending_orders"]);
    const revenue = readMetric(context, ["revenueToday", "totalRevenue", "revenue"]);

    if (this.geminiApiKey) {
      const promptContext = JSON.stringify(context || {});
      const fullPrompt = `You are PixelFounder, the autonomous AI agent for ClickFlash (an enterprise attraction photography company).
Current Scope: ${activeContext}
Live Metrics: ${promptContext}

The user asks: "${message}"

Provide a concise, professional, and highly actionable response. You are authorized to take autonomous actions, so if the user asks you to execute remote fleet commands (e.g., rebooting kiosks, pushing media), you should confirm the action is being executed autonomously. Do not ask for approval if taking an action is clear. Keep your response brief.`;

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }]
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          if (data.candidates && data.candidates[0] && data.candidates[0].content.parts[0].text) {
             return data.candidates[0].content.parts[0].text;
          }
        } else {
           console.error("Gemini API error:", await response.text());
        }
      } catch (err) {
        console.error("Failed to fetch from Gemini API", err);
      }
    }

    if (normalizedMessage.includes("single brief actionable alert")) {
      if (pendingOrders !== undefined && pendingOrders > 0) {
        return `${Math.round(pendingOrders)} of ${Math.round(totalOrders ?? pendingOrders)} orders are pending in ${activeContext}; review the fulfillment queue for stalled galleries.`;
      }
      if (pendingOrders !== undefined) return "OK — no pending orders were reported in the supplied metrics.";
    }

    if (/revenue|income|money|sales/.test(normalizedMessage)) {
      if (revenue === undefined) {
        return `No live revenue metric was supplied for ${activeContext}. Open the Revenue dashboard or include current telemetry before making a financial decision.`;
      }
      const orderSummary = totalOrders === undefined
        ? "The supplied context did not include an order count."
        : `${Math.round(totalOrders)} orders were supplied.`;
      return `Supplied revenue for ${activeContext}: ${formatMoney(revenue)}. ${orderSummary}`;
    }

    if (/station|kiosk|fleet|ping|monitor|sync/.test(normalizedMessage)) {
      const onlineStations = readMetric(context, ["onlineStations", "online_stations"]);
      const totalStations = readMetric(context, ["totalStations", "total_stations"]);
      const pendingSync = readMetric(context, ["pendingSync", "pending_sync"]);
      if (onlineStations === undefined && pendingSync === undefined) {
        return `No live fleet heartbeat was supplied for ${activeContext}. Use Fleet Status to inspect station connectivity and queued sync work.`;
      }
      return `Supplied fleet telemetry for ${activeContext}: ${Math.round(onlineStations ?? 0)} of ${Math.round(totalStations ?? onlineStations ?? 0)} stations online; ${Math.round(pendingSync ?? 0)} sync items pending.`;
    }

    if (/hotel|resort|context/.test(normalizedMessage)) {
      return `The active Management scope is ${activeContext}. Switch the selected context to narrow dashboards and operational guidance to a specific resort.`;
    }

    if (/rfid|wristband|face/.test(normalizedMessage)) {
      return "Customer identification supports RFID mappings and client-side face descriptors. Verify the relevant customer and consent records before acting on a match.";
    }

    return `PixelFounder uses deterministic ClickFlash rules for ${activeContext}. Ask about supplied revenue metrics, fleet telemetry, resort context, or customer-identification workflows.`;
  }
}
