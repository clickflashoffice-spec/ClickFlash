/**
 * ClickFlash Management Hub — OAuth Device Authorization Grant (RFC 8628)
 *
 * Implements the 4 endpoints the 1-click installer needs to link a Master
 * to a tenant without ever seeing an admin password:
 *
 *   POST /api/v1/oauth/device/code     (anonymous; installer requests a code)
 *   POST /api/v1/oauth/authorize       (admin session; approves a code)
 *   POST /api/v1/oauth/token           (anonymous; installer polls for token)
 *   GET  /api/v1/oauth/activate-info   (anonymous; web UI shows pending codes)
 *
 * Reference: https://www.rfc-editor.org/rfc/rfc8628
 * Threat model: §5.1.5, §5.1.7, §5.1.8
 */

import { z } from "zod";
import { createToken, verifyToken, extractTokenFromHeader } from "../jwt.js";
import DatabaseManager from "../db.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEVICE_CODE_TTL_SEC = 10 * 60;             // 10 min per RFC 8628 §4.1.2
const ACCESS_TOKEN_TTL_SEC = 2 * 60 * 60;         // 1h
const REFRESH_TOKEN_TTL_SEC = 90 * 24 * 60 * 60; // 90d
const ALLOWED_CLIENT_IDS = new Set(["clickflash-installer"]);
const INSTALLER_SCOPE = "fleet:write cloud:sync";

// User code alphabet: unambiguous, no 0/O/1/I/L.
const USER_CODE_ALPHABET = "BCDFGHJKMNPQRTVWXYZ23456789";
const USER_CODE_LEN = 8;                       // 4 + "-" + 4

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const DeviceCodeRequest = z.object({
  client_id: z.string().min(1).max(64),
  scope: z.string().max(256).optional(),
});

const AuthorizeRequest = z.object({
  user_code: z.string().regex(/^[A-Z0-9-]+$/i).min(4).max(16),
  tenant_id: z.string().min(1).max(64),
  admin_user_id: z.string().min(1).max(64),
});

const TokenRequest = z.object({
  grant_type: z.literal("urn:ietf:params:oauth:grant-type:device_code"),
  device_code: z.string().min(8).max(256),
});

// ============================================================================
// ROUTER
// ============================================================================

export async function handleOAuth(
  request: Request,
  env: any,
  url: URL,
  dbManager: DatabaseManager,
  corsHeaders: any
): Promise<Response | null> {
  const path = url.pathname;
  const method = request.method;

  // ---- POST /api/v1/oauth/device/code ----
  if (path === "/api/v1/oauth/device/code" && method === "POST") {
    let body: z.infer<typeof DeviceCodeRequest>;
    try {
      const json = await request.json() as any;
      body = DeviceCodeRequest.parse(json);
    } catch (e: any) {
      return oauthError(400, "invalid_request", "Malformed body: " + (e?.message ?? "unknown"), corsHeaders);
    }

    if (!ALLOWED_CLIENT_IDS.has(body.client_id)) {
      return oauthError(400, "invalid_client", "Unknown client_id", corsHeaders);
    }

    const deviceCode = generateOpaque(48);    // 48 bytes → 64 char base64url
    const userCode = generateUserCode();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + DEVICE_CODE_TTL_SEC;

    try {
      await dbManager.run(
        `INSERT INTO oauth_codes
          (device_code, user_code, scope, client_id, expires_at, created_at, authorized, exchanged)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
        [deviceCode, userCode, body.scope ?? INSTALLER_SCOPE, body.client_id, expiresAt, now]
      );
    } catch (err: any) {
      return oauthError(500, "server_error", "Failed to issue device code", corsHeaders);
    }

    // Log audit event
    await logAuditEvent(dbManager, env, {
      tenant_id: "anonymous",
      actor: "installer",
      action: "oauth.device_code_issued",
      payload: { client_id: body.client_id, user_code: userCode, device_code: deviceCode.slice(0, 8) + "..." },
    });

    const frontendUrl = env.FRONTEND_URL || "https://hub.clickflash.app";

    return Response.json({
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: `${frontendUrl}/activate`,
      verification_uri_complete: `${frontendUrl}/activate?code=${userCode}`,
      expires_in: DEVICE_CODE_TTL_SEC,
      interval: 5,
    }, { headers: corsHeaders });
  }

  // ---- POST /api/v1/oauth/authorize ----
  // The admin is logged in (cookie session) and types the user_code.
  // We mark the oauth_codes row as authorized with their tenant.
  if (path === "/api/v1/oauth/authorize" && method === "POST") {
    // Verify the admin's own session first.
    const sessionAuth = await verifyAdminSession(request, env);
    if (!sessionAuth.ok) {
      return oauthError(401, "invalid_session", sessionAuth.error!, corsHeaders);
    }

    let body: z.infer<typeof AuthorizeRequest>;
    try {
      const json = await request.json() as any;
      body = AuthorizeRequest.parse(json);
    } catch (e: any) {
      return oauthError(400, "invalid_request", "Malformed body: " + (e?.message ?? "unknown"), corsHeaders);
    }

    // The admin must be authorized to act on this tenant.
    if (sessionAuth.tenantId !== body.tenant_id && sessionAuth.role !== "admin") {
      return oauthError(403, "forbidden", "Cannot authorize on behalf of another tenant", corsHeaders);
    }

    const now = Math.floor(Date.now() / 1000);

    try {
      const code = await dbManager.get(
        `SELECT device_code, expires_at, authorized, exchanged
         FROM oauth_codes WHERE user_code = ? LIMIT 1`,
        [body.user_code.toUpperCase()]
      );
      if (!code) {
        return oauthError(404, "invalid_grant", "user_code not found", corsHeaders);
      }
      if (code.exchanged === 1) {
        return oauthError(410, "invalid_grant", "user_code already exchanged", corsHeaders);
      }
      if (code.expires_at < now) {
        return oauthError(410, "expired_token", "user_code has expired", corsHeaders);
      }
      if (code.authorized === 1) {
        // Idempotent: re-authorize to same tenant returns 200.
        return Response.json({ success: true, idempotent: true }, { headers: corsHeaders });
      }

      await dbManager.run(
        `UPDATE oauth_codes
         SET authorized = 1, tenant_id = ?, admin_user_id = ?, authorized_at = ?
         WHERE user_code = ? AND authorized = 0`,
        [body.tenant_id, body.admin_user_id, now, body.user_code.toUpperCase()]
      );

      await logAuditEvent(dbManager, env, {
        tenant_id: body.tenant_id,
        actor: "admin",
        actor_id: body.admin_user_id,
        action: "oauth.authorize",
        target: body.user_code,
        payload: { user_code: body.user_code },
      });
    } catch (err: any) {
      return oauthError(500, "server_error", "Authorization failed", corsHeaders);
    }

    return Response.json({ success: true }, { headers: corsHeaders });
  }

  // ---- POST /api/v1/oauth/token ----
  // The installer polls this every 5 seconds.
  if (path === "/api/v1/oauth/token" && method === "POST") {
    let body: z.infer<typeof TokenRequest>;
    try {
      const json = await request.json() as any;
      body = TokenRequest.parse(json);
    } catch (e: any) {
      return oauthError(400, "invalid_request", "Malformed body: " + (e?.message ?? "unknown"), corsHeaders);
    }

    const now = Math.floor(Date.now() / 1000);

    let code: any;
    try {
      code = await dbManager.get(
        `SELECT device_code, user_code, tenant_id, scope, expires_at, authorized, exchanged
         FROM oauth_codes WHERE device_code = ? LIMIT 1`,
        [body.device_code]
      );
    } catch (err: any) {
      return oauthError(500, "server_error", "Lookup failed", corsHeaders);
    }

    if (!code) {
      return oauthError(400, "invalid_grant", "device_code not found", corsHeaders);
    }
    if (code.exchanged === 1) {
      return oauthError(410, "invalid_grant", "device_code already exchanged", corsHeaders);
    }
    if (code.expires_at < now) {
      return oauthError(410, "expired_token", "device_code has expired", corsHeaders);
    }
    if (code.authorized === 0 || !code.tenant_id) {
      // RFC 8628 §3.5: return authorization_pending; installer should keep polling.
      return oauthError(400, "authorization_pending", "Admin has not yet approved this code", corsHeaders, { interval: 5 });
    }

    // Mark as exchanged atomically.
    try {
      await dbManager.run(
        `UPDATE oauth_codes SET exchanged = 1, exchanged_at = ? WHERE device_code = ? AND exchanged = 0`,
        [now, body.device_code]
      );
    } catch (err: any) {
      return oauthError(500, "server_error", "Exchange failed", corsHeaders);
    }

    // Issue access token (HS256 JWT, 1h).
    const accessToken = await createToken(
      {
        tenant_id: code.tenant_id,
        scope: code.scope,
        sub: code.device_code.slice(0, 8),
        iss: "clickflash-hub",
        aud: "clickflash-master",
      },
      env.JWT_SECRET,
      ACCESS_TOKEN_TTL_SEC
    );

    // Issue refresh token (90d, type=refresh).
    const refreshToken = await createToken(
      {
        tenant_id: code.tenant_id,
        sub: code.device_code.slice(0, 8),
        type: "refresh",
        iss: "clickflash-hub",
      },
      env.JWT_SECRET,
      REFRESH_TOKEN_TTL_SEC
    );

    await logAuditEvent(dbManager, env, {
      tenant_id: code.tenant_id,
      actor: "installer",
      action: "oauth.exchange",
      target: code.user_code,
      payload: { device_code_prefix: code.device_code.slice(0, 8), scope: code.scope },
    });

    return Response.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SEC,
      scope: code.scope,
    }, { headers: corsHeaders });
  }

  // ---- GET /api/v1/oauth/activate-info?code=ABCD-1234 ----
  // The web UI polls this after the admin types the user_code.
  if (path === "/api/v1/oauth/activate-info" && method === "GET") {
    const userCode = url.searchParams.get("code")?.toUpperCase();
    if (!userCode) return oauthError(400, "invalid_request", "code query param required", corsHeaders);

    const now = Math.floor(Date.now() / 1000);

    let code: any;
    try {
      code = await dbManager.get(
        `SELECT user_code, expires_at, authorized, exchanged, tenant_id, scope, client_id
         FROM oauth_codes WHERE user_code = ? LIMIT 1`,
        [userCode]
      );
    } catch (err: any) {
      return oauthError(500, "server_error", "Lookup failed", corsHeaders);
    }

    if (!code) {
      return Response.json({ state: "not_found" }, { headers: corsHeaders });
    }
    if (code.exchanged === 1) {
      return Response.json({ state: "exchanged" }, { headers: corsHeaders });
    }
    if (code.expires_at < now) {
      return Response.json({ state: "expired" }, { headers: corsHeaders });
    }
    if (code.authorized === 1) {
      return Response.json({
        state: "authorized",
        tenant_id: code.tenant_id,
        scope: code.scope,
      }, { headers: corsHeaders });
    }
    return Response.json({ state: "pending", scope: code.scope, client_id: code.client_id }, { headers: corsHeaders });
  }

  return null;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Generate a URL-safe opaque secret. */
function generateOpaque(byteLen: number): string {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/** Generate a human-friendly user code: "ABCD-1234". */
function generateUserCode(): string {
  const bytes = new Uint8Array(USER_CODE_LEN);
  crypto.getRandomValues(bytes);
  const chars: string[] = [];
  for (let i = 0; i < USER_CODE_LEN; i++) {
    chars.push(USER_CODE_ALPHABET[bytes[i] % USER_CODE_ALPHABET.length]);
  }
  return chars.slice(0, 4).join("") + "-" + chars.slice(4, 8).join("");
}

function base64UrlEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Verify the admin's existing session cookie/JWT. Reuse the platform auth path. */
async function verifyAdminSession(
  request: Request,
  env: any
): Promise<{ ok: true; tenantId: string; role: string; userId: string } | { ok: false; error: string }> {
  const authHeader = request.headers.get("Authorization");
  const token = extractTokenFromHeader(authHeader);
  if (!token) {
    return { ok: false, error: "Missing or invalid Authorization header" };
  }
  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload) return { ok: false, error: "Invalid token" };
  const userId = payload.userId ?? payload.user_id;
  if (!userId || !payload.role) {
    return { ok: false, error: "Token missing user/role claim" };
  }
  if (payload.role !== "admin" && payload.role !== "tenant_admin") {
    return { ok: false, error: "Not an admin token" };
  }
  return { ok: true, tenantId: payload.tenant_id ?? "global", role: payload.role, userId: String(userId) };
}

/** Format an RFC 8628-style error response. */
function oauthError(
  status: number,
  errorCode: string,
  description: string,
  corsHeaders: any,
  extra: Record<string, any> = {}
): Response {
  return Response.json(
    { error: errorCode, error_description: description, ...extra },
    { status, headers: corsHeaders }
  );
}

/**
 * Write a single audit_events row. Never throws — auditing must not break
 * the request path. If the audit table doesn't exist yet (e.g. pre-migration),
 * we silently no-op.
 */
async function logAuditEvent(
  db: DatabaseManager,
  env: any,
  event: {
    tenant_id: string;
    desk_id?: string;
    actor: string;
    actor_id?: string;
    action: string;
    target?: string;
    payload?: Record<string, any>;
  }
): Promise<void> {
  try {
    const id = crypto.randomUUID();
    const ts = Math.floor(Date.now() / 1000);
    await db.run(
      `INSERT INTO audit_events
        (id, tenant_id, desk_id, actor, actor_id, action, target, payload_json, ts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        event.tenant_id,
        event.desk_id ?? null,
        event.actor,
        event.actor_id ?? null,
        event.action,
        event.target ?? null,
        event.payload ? JSON.stringify(event.payload) : null,
        ts,
      ]
    );
  } catch (err: any) {
    // Audit must never break the request.
    console.warn("[audit] failed to log event:", err?.message ?? err);
  }
}
