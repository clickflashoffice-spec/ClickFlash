import { createErrorResponse } from "../errorHandler.js";
import { ReferralService } from "../services/referralService.js";

export async function handleReferrals(
  request: Request,
  env: any,
  url: URL,
  referralService: ReferralService,
  payload: any,
  corsHeaders: any
): Promise<Response | null> {
  const deskId = payload?.desk_id;
  if (!deskId) return null;

  // --- GET /api/referrals/code ---
  if (url.pathname === "/api/referrals/code" && request.method === "GET") {
    try {
      const code = await referralService.getReferralCode(deskId);
      return Response.json({ code }, { headers: corsHeaders });
    } catch (error: any) {
      return createErrorResponse(500, "Internal Error", error.message, undefined, undefined, corsHeaders);
    }
  }

  // --- GET /api/referrals/stats ---
  if (url.pathname === "/api/referrals/stats" && request.method === "GET") {
    try {
      const stats = await referralService.getReferralStats(deskId);
      return Response.json({ items: stats }, { headers: corsHeaders });
    } catch (error: any) {
      return createErrorResponse(500, "Internal Error", error.message, undefined, undefined, corsHeaders);
    }
  }

  return null;
}
