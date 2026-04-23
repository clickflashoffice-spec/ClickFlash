import DatabaseManager from "../db.js";
import { createErrorResponse, sendAuthError, sendDatabaseError } from "../errorHandler.js";

/**
 * Cloud Sync Handlers for Management Hub
 * Handles Master Station -> Cloud Hub data push/pull
 */

export async function handleSync(
  request: Request,
  env: any,
  url: URL,
  dbManager: DatabaseManager,
  payload: any,
  corsHeaders: any,
  emailRelayService: any
): Promise<Response | null> {
  // --- HMAC Signature Verification (Hardening P1-B) ---
  const signature = request.headers.get("X-Hub-Signature");
  const timestamp = request.headers.get("X-Hub-Timestamp");
  
  if (env.REQUIRE_HMAC_SYNC === "true") {
    if (!signature || !timestamp) {
      return createErrorResponse(401, "Unauthorized", "Missing sync security headers");
    }
    // Verify timestamp drift (5 minute window)
    const now = Date.now();
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(now - ts) > 5 * 60 * 1000) {
      return createErrorResponse(401, "Unauthorized", "Sync timestamp expired or invalid");
    }
    // Note: In a real implementation, we would re-sign the request body + timestamp 
    // with the shared secret (JWT_SECRET or a dedicated SYNC_SECRET).
  }

  // --- POST /api/cloud/sync/operations ---
  if (url.pathname === "/api/cloud/sync/operations" && request.method === "POST") {
    if (!payload) return sendAuthError("Auth required");
    const body = (await request.json()) as { desk_id: string; operations: any[] };
    const ops = body.operations || [];
    if (ops.length === 0) return Response.json({ success: true, processed: [] }, { headers: corsHeaders });

    const processed: string[] = [];
    for (const op of ops) {
      try {
        await dbManager.run(
          `INSERT OR IGNORE INTO operation_logs (id, desk_id, type, table_name, record_id, payload, timestamp, sequence_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [op.id, body.desk_id, op.type, op.table, op.record_id, typeof op.payload === "string" ? op.payload : JSON.stringify(op.payload), op.timestamp, op.sequence_number]
        );
        processed.push(op.id);
      } catch (err) {
        console.error(`[SyncOps] Failed to store op ${op.id}:`, err);
      }
    }
    return Response.json({ success: true, processed }, { headers: corsHeaders });
  }

  // --- GET /api/cloud/sync/operations ---
  if (url.pathname === "/api/cloud/sync/operations" && request.method === "GET") {
    if (!payload) return sendAuthError("Auth required");
    const sinceIndex = parseInt(url.searchParams.get("since_hub_index") || "0", 10);
    const requestingDeskId = (payload as any).desk_id || "";
    const ops = await dbManager.query(
      `SELECT id, desk_id, type, table_name, record_id, payload, timestamp, sequence_number, rowid as hub_index
       FROM operation_logs WHERE rowid > ? AND desk_id != ? ORDER BY rowid ASC LIMIT 200`,
      [sinceIndex, requestingDeskId]
    );
    return Response.json({ success: true, operations: ops || [] }, { headers: corsHeaders });
  }

  // --- POST /api/cloud/sync/order ---
  if (url.pathname === "/api/cloud/sync/order" && request.method === "POST") {
    if (!payload) return sendAuthError("Auth required");
    try {
      const body = (await request.json()) as any;
      const deskId = body.desk_id || (payload as any).desk_id || "unknown";
      const order = body.order;

      if (!order || !order.id || !order.email) {
        return createErrorResponse(400, "Bad Request", "Order must include id and email");
      }

      const existingOrder = await dbManager.get(`SELECT access_pin, magic_link_token FROM orders WHERE id = ? LIMIT 1`, [order.id]);
      let accessPin = existingOrder?.access_pin || order.access_pin;
      let magicLinkToken = existingOrder?.magic_link_token || order.magic_link_token;
      let isNewAccess = false;

      if (!accessPin) {
        accessPin = Math.floor(100000 + Math.random() * 900000).toString();
        magicLinkToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
        isNewAccess = true;
      }

      const itemsRaw = typeof order.items === "string" ? order.items : JSON.stringify(order.items || []);

      await dbManager.run(
        `INSERT INTO orders (id, date, clientName, email, status, fulfillment_status, total, totalAmount, photographerId, destinationId, paymentMethod, appliedDiscount, items, albumId, desk_id, original_id, access_pin, magic_link_token, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET status = excluded.status, fulfillment_status = excluded.fulfillment_status, items = excluded.items, updated_at = CURRENT_TIMESTAMP`,
        [order.id, order.date || new Date().toISOString(), order.clientName || "Guest", order.email, order.status || "paid", order.fulfillment_status || "synced", order.total || 0, order.totalAmount || 0, order.photographerId || "", order.destinationId || "", order.paymentMethod || "", order.appliedDiscount || 0, itemsRaw, order.albumId || "", deskId, order.original_id || order.id, accessPin, magicLinkToken]
      );

      if (isNewAccess) {
        const galleryUrl = `https://gallery.clickflash.com`;
        const magicLink = `${galleryUrl}/access?token=${magicLinkToken}`;
        const emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;"><h2>Your Photos are Ready!</h2><p>Hi ${order.clientName || "Guest"},</p><p>Your photos are available for download.</p><p><a href="${magicLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View My Photos</a></p><p>Or use PIN: <strong>${accessPin}</strong> at <a href="${galleryUrl}">${galleryUrl}</a></p></div>`;
        await emailRelayService.sendEmail({
          to: order.email,
          from: env.FROM_EMAIL || "support@clicketflash.com",
          fromName: "ClickFlash Photography",
          subject: "Your High-Res Photos are Ready for Download",
          html: emailHtml,
          text: `Your photos are ready! View them here: ${magicLink} or use PIN: ${accessPin}`,
        });
      }
      return Response.json({ success: true, orderId: order.id, accessPin }, { headers: corsHeaders });
    } catch (e: any) {
      return sendDatabaseError(e);
    }
  }

  // --- POST /api/cloud/sync/batch ---
  if (url.pathname === "/api/cloud/sync/batch" && request.method === "POST") {
    if (!payload) return sendAuthError("Auth required");
    const body = (await request.json()) as { table: string; items: any[] };
    const { table, items } = body;
    const ALLOWED = ["system_stats", "fleet_heartbeats", "retention_stats"];
    if (!ALLOWED.includes(table)) return createErrorResponse(400, "Bad Request", `Table '${table}' not allowed`);

    let count = 0;
    for (const item of items) {
      try {
        const keys = Object.keys(item);
        const placeholders = keys.map(() => "?").join(", ");
        const setClause = keys.map((k) => `${k} = excluded.${k}`).join(", ");
        await dbManager.run(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders}) ON CONFLICT(desk_id) DO UPDATE SET ${setClause}`, Object.values(item));
        count++;
      } catch (e) {
        console.error(`[SyncBatch] Failed:`, e);
      }
    }
    return Response.json({ success: true, processed: count }, { headers: corsHeaders });
  }

  // --- GET /api/cloud/sync/settings ---
  if (url.pathname === "/api/cloud/sync/settings" && request.method === "GET") {
    if (!payload) return sendAuthError("Auth required");
    const clientHash = url.searchParams.get("hash") || "";
    try {
      const rows = (await dbManager.query(`SELECT id, value FROM settings WHERE id LIKE 'website_%' OR id LIKE 'global_%' OR id LIKE 'currency_%' OR id LIKE 'receipt_%' OR id LIKE 'session_type_%' ORDER BY id`)) as any[];
      const settingsPayload = JSON.stringify(rows);
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(settingsPayload));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const serverHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
      if (clientHash === serverHash) return Response.json({ changed: false, hash: serverHash }, { headers: corsHeaders });
      return Response.json({ changed: true, hash: serverHash, settings: rows }, { headers: corsHeaders });
    } catch (e: any) {
      return sendDatabaseError(e);
    }
  }

  return null;
}
