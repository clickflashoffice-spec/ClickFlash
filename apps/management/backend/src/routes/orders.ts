import { sendAuthError, sendNotFoundError, createErrorResponse } from "../errorHandler.js";

export const handleOrders = async (request: Request, url: URL, env: any, dbManager: any, corsHeaders: any, recordService: any, analyticsService: any, emailRelayService: any, photoProcessor: any, geminiService: any, payload: any) => {


      // --- PUBLIC: Check desk_id availability (no auth needed — pre-registration check) ---
      // --- PUBLIC: Register a new Master Desk (no auth — first-time pairing) ---
      // Login (Public)
      // Auth Middleware check for other routes
      // --- PUBLIC: Customer Order Lookup (Gallery Auth — no JWT required) ---
      // These endpoints authenticate customers using their order credentials.
      // Orders arrive here via Master → Cloud Sync, so ALL Masters' customers can log in.
      if (
        url.pathname === "/api/orders/by-credentials" &&
        request.method === "GET"
      ) {
        const pin = url.searchParams.get("pin");
        const email = url.searchParams.get("email");
        if (!pin || !email) {
          return createErrorResponse(
            400,
            "Bad Request",
            "pin and email are required",
          );
        }
        const order = await dbManager.get(
          `SELECT id, date, clientName, email, status, total, photographerId, destinationId, appliedDiscount, desk_id, items, access_pin, magic_link_token
           FROM orders WHERE access_pin = ? AND LOWER(email) = LOWER(?) LIMIT 1`,
          [pin.trim(), email.trim()],
        );
        if (!order) return sendNotFoundError("Order");
        if (typeof order.items === "string") {
          try {
            order.items = JSON.parse(order.items);
          } catch {
            order.items = [];
          }
        }
        return Response.json(order, { headers: corsHeaders });
      }


      if (url.pathname === "/api/orders/by-token" && request.method === "GET") {
        const token = url.searchParams.get("token");
        if (!token) {
          return createErrorResponse(
            400,
            "Bad Request",
            "magic link token is required",
          );
        }
        const order = await dbManager.get(
          `SELECT id, date, clientName, email, status, total, photographerId, destinationId, appliedDiscount, desk_id, items, access_pin, magic_link_token
           FROM orders WHERE magic_link_token = ? LIMIT 1`,
          [token.trim()],
        );
        if (!order) return sendNotFoundError("Order");
        if (typeof order.items === "string") {
          try {
            order.items = JSON.parse(order.items);
          } catch {
            order.items = [];
          }
        }
        return Response.json(order, { headers: corsHeaders });
      }


      if (url.pathname === "/api/orders/by-room" && request.method === "GET") {
        const roomNumber = url.searchParams.get("roomNumber");
        if (!roomNumber) {
          return createErrorResponse(
            400,
            "Bad Request",
            "roomNumber is required",
          );
        }
        const order = await dbManager.get(
          `SELECT id, date, clientName, email, status, total, photographerId, destinationId, appliedDiscount, desk_id, items
           FROM orders WHERE roomNumber = ? OR JSON_EXTRACT(items, '$[0].roomNumber') = ? LIMIT 1`,
          [roomNumber.trim(), roomNumber.trim()],
        );
        if (!order) return sendNotFoundError("Order");
        if (typeof order.items === "string") {
          try {
            order.items = JSON.parse(order.items);
          } catch {
            order.items = [];
          }
        }
        return Response.json(order, { headers: corsHeaders });
      }


      if (!payload) {
        // Skip auth for file serving (Public access for Gallery)
        if (!url.pathname.startsWith("/api/files/")) {
          return sendAuthError("Invalid or expired authentication token.");
        }
      }


      const deskId = payload?.desk_id || null;


      // Debug: Log incoming request path
      console.log(
        `[Router] Processing ${request.method} ${url.pathname} (Desk: ${deskId})`,
      );


      // Generic CRUD Records
      const collectionMatch = url.pathname.match(
        /\/api\/collections\/([^/]+)\/records(?:\/([^/]+))?/,
      );

      if (collectionMatch) {
        const collection = collectionMatch[1];
        const id = collectionMatch[2];

        if (request.method === "GET") {
          const data = await recordService.listRecords(
            collection,
            url.searchParams,
            deskId,
          );
          return Response.json(data, { headers: corsHeaders });
        }

        if (request.method === "POST" || request.method === "PATCH") {
          const body = (await request.json()) as any;
          if (id) body.id = id;
          const data = await recordService.processRecordCreation(
            request.method,
            collection,
            body,
            deskId,
          );
          return Response.json(data, {
            status: request.method === "POST" ? 201 : 200,
            headers: corsHeaders,
          });
        }

        if (request.method === "DELETE" && id) {
          await recordService.deleteRecord(collection, id, deskId);
          return Response.json({ success: true }, { headers: corsHeaders });
        }
      }
  return null;
};
