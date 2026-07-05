import { createErrorResponse } from "../errorHandler.js";
import { WhiteLabelService } from "../services/whiteLabelService.js";

export async function handleWhiteLabel(
  request: Request,
  env: any,
  url: URL,
  whiteLabelService: WhiteLabelService,
  payload: any,
  corsHeaders: any
): Promise<Response | null> {
  const deskId = payload?.desk_id;
  if (!deskId) return null;

  // --- GET /api/whitelabel/config ---
  if (url.pathname === "/api/whitelabel/config" && request.method === "GET") {
    try {
      const config = await whiteLabelService.getConfig(deskId);
      return Response.json(config, { headers: corsHeaders });
    } catch (error: any) {
      return createErrorResponse(500, "Internal Error", error.message, undefined, undefined, corsHeaders);
    }
  }

  // --- PUT /api/whitelabel/config ---
  if (url.pathname === "/api/whitelabel/config" && request.method === "PUT") {
    try {
      const body: any = await request.json();
      const updated = await whiteLabelService.updateConfig(deskId, body);
      return Response.json(updated, { headers: corsHeaders });
    } catch (error: any) {
      return createErrorResponse(500, "Internal Error", error.message, undefined, undefined, corsHeaders);
    }
  }

  return null;
}
