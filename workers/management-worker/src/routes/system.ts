import DatabaseManager from "../db.js";
import { createErrorResponse, sendAuthError } from "../errorHandler.js";

export async function handleSystem(
  request: Request,
  env: any,
  url: URL,
  dbManager: DatabaseManager,
  payload: any,
  corsHeaders: any
): Promise<Response | null> {
  // --- GET /api/health ---
  if (url.pathname === "/api/health" && request.method === "GET") {
    return Response.json({ status: "OK", timestamp: new Date() }, { headers: corsHeaders });
  }

  // --- POST /api/cloud/heartbeat ---
  if (url.pathname === "/api/cloud/heartbeat" && request.method === "POST") {
    if (!payload) return sendAuthError("Auth required");
    const deskId = payload.desk_id;
    const body = (await request.json()) as any;
    
    await dbManager.run(
      `INSERT INTO destinations (id, name, site_code, type, last_seen, status, health_metrics, version)
       VALUES (?, ?, ?, 'Master', CURRENT_TIMESTAMP, 'Online', ?, ?)
       ON CONFLICT(id) DO UPDATE SET last_seen = CURRENT_TIMESTAMP, status = 'Online', health_metrics = EXCLUDED.health_metrics, version = EXCLUDED.version`,
      [deskId, deskId, deskId, JSON.stringify(body.metrics || {}), body.version]
    );

    await dbManager.run(
      `INSERT INTO fleet_heartbeat_history (desk_id, timestamp, orders_today, photos_today, pending_sync, sync_status)
       VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?)`,
      [deskId, body.metrics?.orders_today || 0, body.metrics?.photos_today || 0, body.metrics?.pending_sync || 0, body.metrics?.sync_status || "unknown"]
    );

    return Response.json({ success: true }, { headers: corsHeaders });
  }

  return null;
}

export async function handleFiles(
    request: Request,
    env: any,
    url: URL,
    corsHeaders: any
): Promise<Response | null> {
    const fileMatch = url.pathname.match(/\/api\/files\/(.+)$/);
    if (fileMatch) {
        const key = fileMatch[1];
        const object = await env.GALLERY_BUCKET.get(key);
        if (!object) return createErrorResponse(404, "Not Found", "File not found in storage");
        
        const headers = new Headers(corsHeaders);
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        
        return new Response(object.body, { headers });
    }
    return null;
}
