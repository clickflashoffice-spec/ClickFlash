import { createErrorResponse } from "../errorHandler.js";
import { BillingService } from "../services/billingService.js";

export async function handleBilling(
  request: Request,
  env: any,
  url: URL,
  billingService: BillingService,
  payload: any,
  corsHeaders: any
): Promise<Response | null> {
  const deskId = payload?.desk_id || url.searchParams.get("desk_id") || payload?.sub;
  if (!deskId) return null;

  // --- GET /api/billing/cap ---
  if (url.pathname === "/api/billing/cap" && request.method === "GET") {
    try {
      const quantity = parseInt(url.searchParams.get("quantity") || "1", 10);
      const capResult = await billingService.checkPhotoIngestionCap(deskId, quantity);
      return Response.json(capResult, { headers: corsHeaders });
    } catch (error: any) {
      return createErrorResponse(500, "Internal Error", error.message, undefined, undefined, corsHeaders);
    }
  }

  // --- GET /api/billing/usage ---
  if (url.pathname === "/api/billing/usage" && request.method === "GET") {
    try {
      const usage = await billingService.getUsage(deskId);
      const monthlyPhotos = await billingService.getMonthlyPhotoCount(deskId);
      return Response.json({ items: usage, monthlyPhotos }, { headers: corsHeaders });
    } catch (error: any) {
      return createErrorResponse(500, "Internal Error", error.message, undefined, undefined, corsHeaders);
    }
  }

  // --- GET /api/billing/invoice ---
  if (url.pathname === "/api/billing/invoice" && request.method === "GET") {
    try {
      const startDate = url.searchParams.get("startDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = url.searchParams.get("endDate") || new Date().toISOString();
      const invoice = await billingService.getInvoice(deskId, startDate, endDate);
      return Response.json(invoice || {}, { headers: corsHeaders });
    } catch (error: any) {
      return createErrorResponse(500, "Internal Error", error.message, undefined, undefined, corsHeaders);
    }
  }

  // --- POST /api/billing/event ---
  if (url.pathname === "/api/billing/event" && request.method === "POST") {
    try {
      const body: any = await request.json();
      if (!body.eventType) return createErrorResponse(400, "Bad Request", "Event type required", undefined, undefined, corsHeaders);
      
      const quantity = body.quantity || 1;
      if (body.eventType === "photo_ingested") {
        const capResult = await billingService.checkPhotoIngestionCap(deskId, quantity);
        if (!capResult.allowed) {
          return createErrorResponse(403, "Forbidden", capResult.reason || "Monthly photo cap reached", undefined, undefined, corsHeaders);
        }
      }

      await billingService.trackEvent({
        deskId,
        eventType: body.eventType,
        quantity
      });
      return Response.json({ success: true }, { headers: corsHeaders });
    } catch (error: any) {
      return createErrorResponse(500, "Internal Error", error.message, undefined, undefined, corsHeaders);
    }
  }

  return null;
}
