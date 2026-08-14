import type { PhotoCategory, ShootIdea } from "../types.ts";
import { logger } from "@/utils/logger";

type UnknownRecord = Record<string, unknown>;

const API = import.meta.env.VITE_API_BASE_URL ?? "";

const authHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${sessionStorage.getItem("authToken") ?? ""}`,
});

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

const contextName = (context: unknown): string => {
  const selected = asRecord(context)?.selectedContext;
  return typeof selected === "string" && selected.trim()
    ? selected.trim()
    : "Global / Enterprise";
};

export async function generateShootIdeas(
  location: string,
  theme: string,
  photographerExpertise: string,
): Promise<ShootIdea[]> {
  try {
    const response = await fetch(`${API}/api/ai/shoot-ideas`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ location, theme, expertise: photographerExpertise }),
    });
    if (!response.ok) throw new Error(`Backend error: ${response.status}`);
    const data = (await response.json()) as { ideas?: ShootIdea[] };
    return data.ideas ?? [];
  } catch (error) {
    logger.error("Error generating shoot ideas:", error);
    return [];
  }
}

export async function editImageWithAI(
  _base64Image: string,
  _mimeType: string,
  _prompt: string,
): Promise<{ data: string; mimeType: string }> {
  throw new Error("Image editing is not supported by the metadata-only PixelFounder service.");
}

export async function generateAlbumSuggestions(
  images: Array<{ mimeType: string; data: string }>,
  availableCategories: string[] = [
    "Beach & Pool",
    "Photo Session",
    "Evening",
    "Activities",
    "Restaurant",
  ],
): Promise<{
  title: string;
  description: string;
  categories: PhotoCategory[];
  coverPhotoIndex: number;
}> {
  if (images.length === 0) throw new Error("At least one image is required.");

  try {
    const response = await fetch(`${API}/api/ai/album-suggestions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        imageMetadata: images.map(({ mimeType }) => ({ mimeType })),
        categories: availableCategories,
      }),
    });
    if (!response.ok) throw new Error(`Backend error: ${response.status}`);
    const data = (await response.json()) as {
      title?: string;
      description?: string;
      categories?: PhotoCategory[];
      coverPhotoIndex?: number;
    };
    return {
      title: data.title ?? "Photo Collection",
      description: data.description ?? "",
      categories: data.categories ?? [],
      coverPhotoIndex: data.coverPhotoIndex ?? 0,
    };
  } catch (error) {
    logger.error("Error generating album suggestions:", error);
    throw new Error("Failed to generate album suggestions.");
  }
}

export async function generateSalesForecast(metrics: Record<string, unknown>): Promise<{
  end_of_week_revenue: number;
  end_of_month_revenue: number;
  insights: string[];
}> {
  try {
    const response = await fetch(`${API}/api/ai/sales-forecast`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ metrics }),
    });
    if (!response.ok) throw new Error(`Backend error: ${response.status}`);
    const data = (await response.json()) as {
      end_of_week_revenue?: number;
      end_of_month_revenue?: number;
      insights?: string[];
    };
    return {
      end_of_week_revenue: data.end_of_week_revenue ?? 0,
      end_of_month_revenue: data.end_of_month_revenue ?? 0,
      insights: data.insights ?? ["Not enough supplied data."],
    };
  } catch (error) {
    logger.error("Error generating sales forecast:", error);
    throw new Error("Failed to generate sales forecast.");
  }
}

export async function sendChatMessage(message: string, context: unknown): Promise<string> {
  try {
    const response = await fetch(`${API}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message, context }),
    });

    if (!response.ok) return executeLocalChatFallback(message, context);

    const data = (await response.json()) as { response?: string };
    return data.response ?? "PixelFounder returned no guidance.";
  } catch (error) {
    logger.warn("PixelFounder Worker unavailable; using browser rules.", error);
    return executeLocalChatFallback(message, context);
  }
}

function executeLocalChatFallback(message: string, context: unknown): string {
  const normalizedMessage = message.toLowerCase();
  const activeContext = contextName(context);

  if (/revenue|income|money|sales/.test(normalizedMessage)) {
    const revenue = readMetric(context, ["revenueToday", "totalRevenue", "revenue"]);
    const orders = readMetric(context, ["totalOrders", "total_orders"]);
    if (revenue === undefined) {
      return `No live revenue metric was supplied for ${activeContext}. Open the Revenue dashboard before making a financial decision.`;
    }
    const orderSummary = orders === undefined
      ? "No order count was supplied."
      : `${Math.round(orders)} orders were supplied.`;
    return `Supplied revenue for ${activeContext}: $${revenue.toFixed(2)}. ${orderSummary}`;
  }

  if (/hotel|resort|context/.test(normalizedMessage)) {
    return `The active Management scope is ${activeContext}. Use the context switcher to select a specific resort.`;
  }

  if (/station|kiosk|fleet|ping|monitor|sync/.test(normalizedMessage)) {
    return `No live fleet heartbeat was supplied for ${activeContext}. Use Fleet Status to inspect connectivity and pending sync work.`;
  }

  if (/rfid|wristband|face/.test(normalizedMessage)) {
    return "Customer identification supports RFID mappings and client-side face descriptors. Verify customer and consent records before acting on a match.";
  }

  return `PixelFounder browser rules are active for ${activeContext}. Ask about supplied revenue, fleet status, resort context, or customer identification.`;
}
