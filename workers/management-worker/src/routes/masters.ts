/**
 * ClickFlash Management Hub — Master Fleet Routes (Enhanced)
 * Multi-master registration, heartbeat, and fleet coordination.
 */

import { verifyToken, extractTokenFromHeader } from "../jwt.js";
import DatabaseManager from "../db.js";
import FleetService from "../services/fleetService.js";
import {
  createErrorResponse,
  sendAuthError,
  sendNotFoundError,
  sendDatabaseError,
  sendInternalError,
} from "../errorHandler.js";

export async function handleMasters(
  request: Request,
  env: any,
  url: URL,
  dbManager: DatabaseManager,
  corsHeaders: any
): Promise<Response | null> {
  const { JWT_SECRET, PROVISIONING_SECRET } = env;
  const fleetService = new FleetService(dbManager, JWT_SECRET);

  // --- PUBLIC: Check desk_id availability ---
  if (url.pathname === "/api/masters/check-desk-id" && request.method === "GET") {
    const deskId = url.searchParams.get("desk_id")?.trim();
    if (!deskId || !/^[a-zA-Z0-9_-]{3,64}$/.test(deskId)) {
      return createErrorResponse(
        400,
        "Bad Request",
        "desk_id must be 3-64 alphanumeric/underscore characters",
      );
    }

    try {
      const existing = await dbManager.get(
        "SELECT id FROM destinations WHERE id = ? LIMIT 1",
        [deskId],
      );

      const suggestions: string[] = [];
      if (existing) {
        const base = deskId.replace(/-\d+$/, "");
        for (let i = 2; i <= 5; i++) {
          suggestions.push(`${base}-${i}`);
        }
      }

      return Response.json(
        {
          available: !existing,
          desk_id: deskId,
          suggestions: existing ? suggestions : undefined,
          message: existing
            ? `Desk ID '${deskId}' is already taken.`
            : `Desk ID '${deskId}' is available.`,
        },
        { headers: corsHeaders },
      );
    } catch (err: any) {
      return sendDatabaseError(err, "check-desk-id");
    }
  }

  // --- PUBLIC: Register new master in fleet ---
  if (url.pathname === "/api/masters/register" && request.method === "POST") {
    const body = (await request.json()) as {
      desk_id?: string;
      name?: string;
      location?: string;
      country?: string;
      timezone?: string;
      currency?: string;
      hardware_fingerprint?: string;
      version?: string;
      provisioning_secret?: string;
    };

    const {
      desk_id: deskId,
      name,
      location,
      country,
      timezone,
      currency,
      hardware_fingerprint,
      version,
      provisioning_secret,
    } = body;

    // Industrial Hardening: Enforce Provisioning Secret
    if (PROVISIONING_SECRET && provisioning_secret !== PROVISIONING_SECRET) {
      return createErrorResponse(
        403,
        "Forbidden",
        "Invalid provisioning secret. Fleet registration rejected.",
      );
    }

    if (!deskId || !name || !hardware_fingerprint) {
      return createErrorResponse(
        400,
        "Bad Request",
        "desk_id, name, and hardware_fingerprint are required",
      );
    }

    if (!/^[a-zA-Z0-9_-]{3,64}$/.test(deskId)) {
      return createErrorResponse(
        400,
        "Validation Error",
        "desk_id must be 3-64 alphanumeric/underscore characters",
      );
    }

    try {
      const result = await fleetService.handleRegistration(deskId, {
        name,
        location: location || "",
        country: country || "",
        timezone: timezone || "UTC",
        currency: currency || "USD",
        hardware_fingerprint,
        version: version || "unknown",
      });

      if (!result.success) {
        return createErrorResponse(
          409,
          "Conflict",
          result.error || "Registration failed",
        );
      }

      return Response.json(
        {
          success: true,
          desk_id: result.deskId,
          jwt_token: result.jwtToken,
          peers: result.peers,
          shared_config: result.sharedConfig,
          r2_prefix: result.r2Prefix,
          sync_endpoint: result.syncEndpoint,
          gallery_endpoint: result.galleryEndpoint,
          message: `Master '${deskId}' registered successfully in fleet.`,
        },
        { status: 201, headers: corsHeaders },
      );
    } catch (err: any) {
      return sendInternalError(err, "master-registration");
    }
  }

  // --- AUTHENTICATED: Heartbeat from master ---
  if (url.pathname === "/api/masters/heartbeat" && request.method === "POST") {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendAuthError("Missing or invalid Authorization header");
    }

    const token = extractTokenFromHeader(authHeader);
    const payload = token ? await verifyToken(token, JWT_SECRET) : null;
    if (!payload) {
      return sendAuthError("Invalid JWT token");
    }

    const deskId = payload.desk_id;
    if (!deskId) {
      return createErrorResponse(
        403,
        "Forbidden",
        "JWT missing desk_id claim",
      );
    }

    const body = (await request.json()) as {
      timestamp?: string;
      version?: string;
      uptime?: number;
      memory?: Record<string, any>;
      system?: Record<string, any>;
      metrics?: Record<string, any>;
    };

    try {
      const pendingCommands = await fleetService.handleHeartbeat(deskId, {
        timestamp: body.timestamp || new Date().toISOString(),
        version: body.version || "unknown",
        uptime: body.uptime || 0,
        memory: body.memory || {},
        system: body.system || {},
        metrics: body.metrics || {},
      });

      return Response.json(
        {
          success: true,
          desk_id: deskId,
          pending_commands: pendingCommands,
          server_time: new Date().toISOString(),
        },
        { headers: corsHeaders },
      );
    } catch (err: any) {
      return sendInternalError(err, "master-heartbeat");
    }
  }

  // --- AUTHENTICATED: List all masters in fleet (dashboard) ---
  if (url.pathname === "/api/masters/fleet" && request.method === "GET") {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendAuthError("Missing or invalid Authorization header");
    }

    const token = extractTokenFromHeader(authHeader);
    const payload = token ? await verifyToken(token, JWT_SECRET) : null;
    if (!payload) {
      return sendAuthError("Invalid JWT token");
    }
    // Allow admin or desk roles
    if (!payload.role || (payload.role !== "admin" && payload.role !== "desk")) {
      return sendAuthError("Insufficient privileges");
    }

    try {
      const fleet = await fleetService.getFleetStatus();
      return Response.json(
        {
          success: true,
          count: fleet.length,
          fleet,
        },
        { headers: corsHeaders },
      );
    } catch (err: any) {
      return sendInternalError(err, "fleet-list");
    }
  }

  // --- AUTHENTICATED: List peers for a specific master ---
  const peersMatch = url.pathname.match(/\/api\/masters\/peers\/([^/]+)$/);
  if (peersMatch && request.method === "GET") {
    const targetDeskId = peersMatch[1];

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendAuthError("Missing or invalid Authorization header");
    }

    const token = extractTokenFromHeader(authHeader);
    const payload = token ? await verifyToken(token, JWT_SECRET) : null;
    if (!payload) {
      return sendAuthError("Invalid JWT token");
    }

    // Desk can only query its own peers; admin can query any
    const callerDeskId = payload?.desk_id;
    const callerRole = payload?.role;
    if (callerRole !== "admin" && callerDeskId !== targetDeskId) {
      return createErrorResponse(
        403,
        "Forbidden",
        "You may only query peers for your own desk_id",
      );
    }

    try {
      const peers = await fleetService.getPeers(targetDeskId);
      return Response.json(
        {
          success: true,
          desk_id: targetDeskId,
          peers,
        },
        { headers: corsHeaders },
      );
    } catch (err: any) {
      return sendInternalError(err, "peers-list");
    }
  }

  // --- AUTHENTICATED: Deregister a master ---
  if (url.pathname === "/api/masters/deregister" && request.method === "POST") {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendAuthError("Missing or invalid Authorization header");
    }

    const token = extractTokenFromHeader(authHeader);
    const payload = token ? await verifyToken(token, JWT_SECRET) : null;
    if (!payload) return sendAuthError("Invalid JWT token");

    const body = (await request.json()) as { desk_id: string };
    if (payload.role !== "admin" && payload.desk_id !== body.desk_id) {
      return createErrorResponse(403, "Forbidden", "Can only deregister own desk");
    }

    try {
      await dbManager.run("DELETE FROM destinations WHERE id = ? AND type = 'Master'", [body.desk_id]);
      await dbManager.run("DELETE FROM fleet_heartbeats WHERE desk_id = ?", [body.desk_id]);
      return Response.json({ success: true, message: "Deregistered successfully" }, { headers: corsHeaders });
    } catch (err: any) {
      return sendInternalError(err, "deregister");
    }
  }

  // --- AUTHENTICATED: Transfer a master to another site_code/hub ---
  if (url.pathname === "/api/masters/transfer" && request.method === "POST") {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendAuthError("Missing or invalid Authorization header");
    }

    const token = extractTokenFromHeader(authHeader);
    const payload = token ? await verifyToken(token, JWT_SECRET) : null;
    if (!payload || payload.role !== "admin") return sendAuthError("Admin role required");

    const body = (await request.json()) as { desk_id: string; target_site_code: string };
    if (!body.desk_id || !body.target_site_code) {
      return createErrorResponse(400, "Bad Request", "desk_id and target_site_code required");
    }

    try {
      await dbManager.run(
        "UPDATE destinations SET site_code = ?, updated_at = ? WHERE id = ?",
        [body.target_site_code, new Date().toISOString(), body.desk_id]
      );
      return Response.json({ success: true, message: "Transferred successfully" }, { headers: corsHeaders });
    } catch (err: any) {
      return sendInternalError(err, "transfer");
    }
  }

  // --- AUTHENTICATED: Config Push to a specific desk ---
  const pushMatch = url.pathname.match(/\/api\/masters\/config-push\/([^/]+)$/);
  if (pushMatch && request.method === "GET") {
    const targetDeskId = pushMatch[1];
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendAuthError("Missing or invalid Authorization header");
    }

    const token = extractTokenFromHeader(authHeader);
    const payload = token ? await verifyToken(token, JWT_SECRET) : null;
    if (!payload) return sendAuthError("Invalid JWT token");

    if (payload.role !== "admin" && payload.desk_id !== targetDeskId) {
      return createErrorResponse(403, "Forbidden", "Can only pull config for own desk");
    }

    try {
      const sharedConfig = await fleetService.getSharedConfig(targetDeskId);
      return Response.json({ success: true, shared_config: sharedConfig }, { headers: corsHeaders });
    } catch (err: any) {
      return sendInternalError(err, "config-push");
    }
  }

  return null;
}
