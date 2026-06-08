import DatabaseManager from "../db.js";
import { createErrorResponse, sendNotFoundError } from "../errorHandler.js";

export async function handleGalleryAccess(request: Request, env: any, url: URL, dbManager: DatabaseManager, corsHeaders: any): Promise<Response | null> {
  // --- PUBLIC: Customer Order Lookup (Gallery Auth) ---
  if (url.pathname === "/api/orders/by-credentials" && request.method === "GET") {
    const pin = url.searchParams.get("pin");
    const email = url.searchParams.get("email");
    if (!pin || !email) {
      return createErrorResponse(400, "Bad Request", "pin and email are required");
    }
    const order = await dbManager.get(
      `SELECT id, date, clientName, email, status, total, photographerId, destinationId, appliedDiscount, desk_id, items, access_pin, magic_link_token
       FROM orders WHERE access_pin = ? AND LOWER(email) = LOWER(?) LIMIT 1`,
      [pin.trim(), email.trim()],
    );
    if (!order) return sendNotFoundError("Order");
    if (typeof order.items === "string") {
      try { order.items = JSON.parse(order.items); } catch { order.items = []; }
    }
    return Response.json(order, { headers: corsHeaders });
  }

  if (url.pathname === "/api/orders/by-token" && request.method === "GET") {
    const token = url.searchParams.get("token");
    if (!token) {
      return createErrorResponse(400, "Bad Request", "magic link token is required");
    }
    const order = await dbManager.get(
      `SELECT id, date, clientName, email, status, total, photographerId, destinationId, appliedDiscount, desk_id, items, access_pin, magic_link_token
       FROM orders WHERE magic_link_token = ? LIMIT 1`,
      [token.trim()],
    );
    if (!order) return sendNotFoundError("Order");
    if (typeof order.items === "string") {
      try { order.items = JSON.parse(order.items); } catch { order.items = []; }
    }
    return Response.json(order, { headers: corsHeaders });
  }

  if (url.pathname === "/api/orders/by-room" && request.method === "GET") {
    const roomNumber = url.searchParams.get("roomNumber");
    if (!roomNumber) {
      return createErrorResponse(400, "Bad Request", "roomNumber is required");
    }
    const order = await dbManager.get(
      `SELECT id, date, clientName, email, status, total, photographerId, destinationId, appliedDiscount, desk_id, items
       FROM orders WHERE roomNumber = ? OR JSON_EXTRACT(items, '$[0].roomNumber') = ? LIMIT 1`,
      [roomNumber.trim(), roomNumber.trim()],
    );
    if (!order) return sendNotFoundError("Order");
    if (typeof order.items === "string") {
      try { order.items = JSON.parse(order.items); } catch { order.items = []; }
    }
    return Response.json(order, { headers: corsHeaders });
  }

  return null;
}
