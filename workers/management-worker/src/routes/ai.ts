import { createErrorResponse, sendAuthError, sendNotFoundError } from "../errorHandler.js";
import type { PixelFounderService } from "../services/pixelFounderService.js";

interface AiRequestBody {
  location?: string;
  theme?: string;
  expertise?: string;
  images?: Array<{ mimeType?: string }>;
  imageMetadata?: Array<{ mimeType?: string }>;
  categories?: string[];
  metrics?: Record<string, unknown>;
  message?: string;
  context?: unknown;
}

export const handleAi = async (
  request: Request,
  url: URL,
  _env: unknown,
  _dbManager: unknown,
  corsHeaders: HeadersInit,
  _recordService: unknown,
  _analyticsService: unknown,
  _emailRelayService: unknown,
  _photoProcessor: unknown,
  pixelFounderService: PixelFounderService,
  payload: unknown,
) => {
  if (!payload) return sendAuthError("Auth required");

  try {
    if (url.pathname === "/api/ai/shoot-ideas" && request.method === "POST") {
      const body = (await request.json()) as AiRequestBody;
      const ideas = await pixelFounderService.generateShootIdeas(
        body.location ?? "",
        body.theme ?? "",
        body.expertise ?? "",
      );
      return Response.json({ success: true, ideas }, { headers: corsHeaders });
    }

    if (url.pathname === "/api/ai/album-suggestions" && request.method === "POST") {
      const body = (await request.json()) as AiRequestBody;
      const imageMetadata = body.imageMetadata ??
        body.images?.map((image) => ({ mimeType: image.mimeType })) ?? [];
      const suggestions = await pixelFounderService.generateAlbumSuggestions(
        imageMetadata,
        body.categories ?? [],
      );
      return Response.json({ success: true, ...suggestions }, { headers: corsHeaders });
    }

    if (url.pathname === "/api/ai/sales-forecast" && request.method === "POST") {
      const body = (await request.json()) as AiRequestBody;
      const forecast = await pixelFounderService.generateSalesForecast(body.metrics ?? {});
      return Response.json({ success: true, ...forecast }, { headers: corsHeaders });
    }

    if (url.pathname === "/api/ai/chat" && request.method === "POST") {
      const body = (await request.json()) as AiRequestBody;
      if (!body.message?.trim()) {
        return createErrorResponse(400, "Bad Request", "message is required");
      }
      const response = await pixelFounderService.generateResponse(body.message, body.context);
      return Response.json({ success: true, response }, { headers: corsHeaders });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(500, "PixelFounder Error", message);
  }

  return sendNotFoundError("Route", url.pathname);
};
