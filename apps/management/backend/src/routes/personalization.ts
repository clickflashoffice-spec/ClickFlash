import { createErrorResponse } from "../errorHandler.js";
import { PersonalizationService } from "../services/personalizationService.js";

export async function handlePersonalization(
  request: Request,
  env: any,
  url: URL,
  personalizationService: PersonalizationService,
  payload: any,
  corsHeaders: any
): Promise<Response | null> {
  const deskId = payload?.desk_id;
  if (!deskId) return null;

  // --- GET /api/personalization/optimal-time ---
  if (url.pathname === "/api/personalization/optimal-time" && request.method === "GET") {
    try {
      const customerId = url.searchParams.get("customerId");
      if (!customerId) return createErrorResponse(400, "Bad Request", "customerId required", undefined, undefined, corsHeaders);
      
      const hour = await personalizationService.getOptimalSendTime(customerId);
      return Response.json({ optimalHour: hour }, { headers: corsHeaders });
    } catch (error: any) {
      return createErrorResponse(500, "Internal Error", error.message, undefined, undefined, corsHeaders);
    }
  }

  // --- POST /api/personalization/engagement ---
  if (url.pathname === "/api/personalization/engagement" && request.method === "POST") {
    try {
      const body: any = await request.json();
      if (!body.customerId || !body.campaignId || !body.eventType) {
        return createErrorResponse(400, "Bad Request", "Missing required fields", undefined, undefined, corsHeaders);
      }
      
      await personalizationService.recordEngagement(
        body.customerId,
        body.campaignId,
        body.eventType,
        body.metadata
      );
      return Response.json({ success: true }, { headers: corsHeaders });
    } catch (error: any) {
      return createErrorResponse(500, "Internal Error", error.message, undefined, undefined, corsHeaders);
    }
  }

  // --- GET /api/personalization/recommendations ---
  if (url.pathname === "/api/personalization/recommendations" && request.method === "GET") {
    try {
      const customerId = url.searchParams.get("customerId");
      const limitStr = url.searchParams.get("limit");
      const limit = limitStr ? parseInt(limitStr) : 5;
      
      if (!customerId) return createErrorResponse(400, "Bad Request", "customerId required", undefined, undefined, corsHeaders);
      
      const recommendations = await personalizationService.getRecommendations(customerId, limit);
      return Response.json({ recommendations }, { headers: corsHeaders });
    } catch (error: any) {
      return createErrorResponse(500, "Internal Error", error.message, undefined, undefined, corsHeaders);
    }
  }

  return null;
}
