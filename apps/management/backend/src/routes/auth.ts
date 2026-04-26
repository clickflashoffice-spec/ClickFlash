import { sign, verify, decode } from "@tsndr/cloudflare-worker-jwt";
import { hashPassword, verifyPassword } from "../auth.js";
import { createErrorResponse, sendAuthError, sendNotFoundError } from "../errorHandler.js";
import { validateLogin } from "../validation.js";
import DatabaseManager from "../db.js";

export async function handleAuth(request: Request, env: any, url: URL, dbManager: DatabaseManager, corsHeaders: any): Promise<Response | null> {
  const { JWT_SECRET } = env;

  // --- PUBLIC: Check desk_id availability ---
  const checkDeskMatch = url.pathname.match(/\/api\/auth\/check-desk\/([^/]+)$/);
  if (checkDeskMatch && request.method === "GET") {
    const deskId = checkDeskMatch[1].trim();
    if (!deskId || !/^[a-zA-Z0-9_-]{3,64}$/.test(deskId)) {
      return createErrorResponse(400, "Bad Request", "deskId must be 3-64 alphanumeric/underscore characters");
    }
    const existing = await dbManager.get("SELECT id FROM users WHERE desk_id = ? LIMIT 1", [deskId]);
    return Response.json({
      available: !existing,
      deskId,
      message: existing ? "This Desk ID is already registered with the Hub." : "Desk ID is available.",
    }, { headers: corsHeaders });
  }

  // --- PUBLIC: Register a new Master Desk ---
  if (url.pathname === "/api/auth/register-desk" && request.method === "POST") {
    const body = (await request.json()) as any;
    const { deskId, deskName, email, password, deskLocation } = body;

    if (!deskId || !deskName || !email || !password) {
      return createErrorResponse(400, "Bad Request", "deskId, deskName, email, and password are required");
    }
    if (!/^[a-zA-Z0-9_-]{3,64}$/.test(deskId)) {
      return createErrorResponse(400, "Validation Error", "deskId must be 3-64 alphanumeric/underscore characters");
    }

    const existingDesk = await dbManager.get("SELECT id FROM users WHERE desk_id = ? LIMIT 1", [deskId]);
    if (existingDesk) {
      return createErrorResponse(409, "Conflict", `Desk ID '${deskId}' is already registered. Choose a different ID.`);
    }

    const existingEmail = await dbManager.get("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existingEmail) {
      return createErrorResponse(409, "Conflict", `Email '${email}' is already in use by another desk.`);
    }

    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    await dbManager.run(
      `INSERT INTO users (id, email, password, role, desk_id, name, location, created_at, updated_at)
       VALUES (?, ?, ?, 'desk', ?, ?, ?, ?, ?)`,
      [userId, email, hashedPassword, deskId, deskName, deskLocation || "", now, now]
    );

    // Generate Access JWT (Short-lived: 1h)
    const jwtPayload = {
      id: userId,
      email,
      role: "desk",
      desk_id: deskId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    };
    const token = await sign(jwtPayload, JWT_SECRET);

    // Generate Refresh Token
    const refreshToken = crypto.randomUUID() + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await dbManager.run(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), userId, refreshToken, expiresAt]
    );

    const response = Response.json({
      success: true,
      token,
      desk: { id: userId, deskId, deskName, deskLocation, email, role: "desk" },
      message: `Station '${deskName}' registered successfully. Session active for 1 hour.`,
    }, { status: 201, headers: corsHeaders });

    response.headers.append("Set-Cookie", `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/api/auth`);
    return response;
  }

  // --- PUBLIC: Login ---
  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    const body = await request.json();
    const validation = validateLogin(body);
    if (!validation.success) {
      return createErrorResponse(400, "Validation Error", "Invalid credentials format");
    }
    const { email, password, machine_id } = (validation as any).data;
    const user = await dbManager.get(`SELECT * FROM users WHERE email = ?`, [email]);

    if (!user || !(await verifyPassword(password, user.password))) {
      return sendAuthError("Invalid email or password.");
    }

    if (user.desk_id) {
      if (user.machine_id) {
        if (user.machine_id !== machine_id) {
          return createErrorResponse(423, "Locked", "Station is locked to another hardware device. Please contact support to reset.");
        }
      } else if (machine_id) {
        await dbManager.run("UPDATE users SET machine_id = ? WHERE id = ?", [machine_id, user.id]);
        user.machine_id = machine_id;
      }
    }

    // Generate Access JWT
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      desk_id: user.desk_id || null,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };

    const token = await sign(payload, JWT_SECRET);

    // Generate Refresh Token
    const refreshToken = crypto.randomUUID() + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await dbManager.run(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), user.id, refreshToken, expiresAt]
    );

    delete user.password;
    const response = Response.json({ token, user, desk_id: user.desk_id }, { headers: corsHeaders });
    response.headers.append("Set-Cookie", `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/api/auth`);
    return response;
  }

  // --- PUBLIC: Refresh Token ---
  if (url.pathname === "/api/auth/refresh" && request.method === "POST") {
    const cookieHeader = request.headers.get("Cookie") || "";
    const refreshToken = cookieHeader.match(/refreshToken=([^;]+)/)?.[1];

    if (!refreshToken) {
      return createErrorResponse(401, "Unauthorized", "Refresh token missing");
    }

    const tokenData = await dbManager.get('SELECT * FROM refresh_tokens WHERE token = ?', [refreshToken]);

    if (!tokenData) {
      return createErrorResponse(401, "Unauthorized", "Invalid refresh token");
    }

    // Reuse detection
    if (tokenData.revoked === 1) {
      await dbManager.run('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [tokenData.user_id]);
      const res = createErrorResponse(401, "Unauthorized", "Token reuse detected. All sessions revoked.");
      res.headers.append("Set-Cookie", `refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/api/auth`);
      return res;
    }

    // Expiry check
    if (new Date() > new Date(tokenData.expires_at)) {
      await dbManager.run('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?', [tokenData.id]);
      return createErrorResponse(401, "Unauthorized", "Refresh token expired");
    }

    const user = await dbManager.get('SELECT * FROM users WHERE id = ?', [tokenData.user_id]);
    if (!user) {
      return createErrorResponse(401, "Unauthorized", "User not found");
    }

    // Rotate Token
    const newToken = crypto.randomUUID() + crypto.randomUUID();
    const newId = crypto.randomUUID();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await dbManager.run(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [newId, user.id, newToken, newExpiresAt]
    );

    await dbManager.run(
      'UPDATE refresh_tokens SET revoked = 1, replaced_by = ? WHERE id = ?',
      [newId, tokenData.id]
    );

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      desk_id: user.desk_id || null,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };

    const token = await sign(payload, JWT_SECRET);
    const response = Response.json({ token, user: { id: user.id, email: user.email, role: user.role } }, { headers: corsHeaders });
    response.headers.append("Set-Cookie", `refreshToken=${newToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/api/auth`);
    return response;
  }

  // --- PUBLIC: Logout ---
  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    const cookieHeader = request.headers.get("Cookie") || "";
    const refreshToken = cookieHeader.match(/refreshToken=([^;]+)/)?.[1];

    if (refreshToken) {
      await dbManager.run('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?', [refreshToken]);
    }

    const response = Response.json({ success: true }, { headers: corsHeaders });
    response.headers.append("Set-Cookie", `refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/api/auth`);
    return response;
  }

  return null;
}

export async function authenticate(request: Request, env: any): Promise<any> {
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const isValid = await verify(token, env.JWT_SECRET);
      if (isValid) {
        const { payload } = decode(token) as any;
        return payload;
      }
    }
    return null;
}
