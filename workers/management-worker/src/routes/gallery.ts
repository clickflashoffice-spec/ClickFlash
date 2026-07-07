import DatabaseManager from "../db.js";
import { createErrorResponse, sendNotFoundError } from "../errorHandler.js";
import { createGalleryCheckoutSession } from "../services/stripeService.js";

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

  // --- POST /api/gallery/checkout ---
  if (url.pathname === "/api/gallery/checkout" && request.method === "POST") {
    try {
      const body: any = await request.json().catch(() => ({}));
      const { items, successUrl, cancelUrl, clientName, email, photographerId, destinationId, total } = body;
      
      if (!items || !items.length || !successUrl || !cancelUrl) {
        return createErrorResponse(400, "Bad Request", "Missing required checkout parameters", undefined, undefined, corsHeaders);
      }

      // Generate a temporary order ID
      const orderId = crypto.randomUUID();
      
      // Save order to DB as 'Pending'
      await dbManager.run(`
        INSERT INTO orders (id, date, clientName, email, status, total, photographerId, destinationId, items, paymentMethod)
        VALUES (?, datetime('now'), ?, ?, 'Pending', ?, ?, ?, ?, 'Card')
      `, [orderId, clientName || 'Guest', email || '', total || 0, photographerId || 0, destinationId || '', JSON.stringify(items)]);

      // Create Stripe Line Items (Stripe requires price in cents)
      const lineItems = items.map((item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.photo ? `Photo: ${item.photo.title}` : undefined,
          },
          unit_amount: Math.round((item.price || 0) * 100), // convert to cents
        },
        quantity: item.quantity || 1,
      }));

      // Generate Checkout Session
      const session = await createGalleryCheckoutSession(
        env,
        lineItems,
        successUrl,
        cancelUrl,
        orderId, // pass orderId as clientReferenceId
        email
      );

      return Response.json({ url: session.url, orderId }, { headers: corsHeaders });
    } catch (error: any) {
      console.error('Gallery Checkout error:', error);
      return createErrorResponse(500, "Internal Server Error", "Failed to create gallery checkout session", undefined, undefined, corsHeaders);
    }
  }

  return null;
}
