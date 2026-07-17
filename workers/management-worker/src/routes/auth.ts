import { sendAuthError, createErrorResponse } from "../errorHandler.js";
import { createToken, verifyToken, extractTokenFromHeader } from "../jwt.js";
import { verifyPassword, hashPassword } from "../auth.js";
import { checkLoginRateLimit, recordLoginAttempt } from "../loginRateLimiter.js";
import { validateLogin } from "../validation.js";
import { logger } from "@clickflash/logger";

export const handleAuth = async (request: Request, url: URL, env: any, dbManager: any, corsHeaders: any, recordService: any, analyticsService: any, emailRelayService: any, photoProcessor: any, _pixelFounderService: any, payload: any) => {


      // --- PUBLIC: Check desk_id availability (no auth needed — pre-registration check) ---
      const checkDeskMatch = url.pathname.match(
        /\/api\/auth\/check-desk\/([^/]+)$/,
      );

      if (checkDeskMatch && request.method === "GET") {
        const deskId = checkDeskMatch[1].trim();
        if (!deskId || !/^[a-zA-Z0-9_-]{3,64}$/.test(deskId)) {
          return createErrorResponse(
            400,
            "Bad Request",
            "deskId must be 3-64 alphanumeric/underscore characters",
          );
        }
        const existing = await dbManager.get(
          "SELECT id FROM users WHERE desk_id = ? LIMIT 1",
          [deskId],
        );
        return Response.json(
          {
            available: !existing,
            deskId,
            message: existing
              ? "This Desk ID is already registered with the Hub."
              : "Desk ID is available.",
          },
          { headers: corsHeaders },
        );
      }


      // --- PUBLIC: Register a new Master Desk (no auth — first-time pairing) ---
      if (
        url.pathname === "/api/auth/register-desk" &&
        request.method === "POST"
      ) {
        const body = (await request.json()) as {
          deskId?: string;
          deskName?: string;
          deskLocation?: string;
          email?: string;
          password?: string;
          provisioningSecret?: string;
          machine_id?: string;
          is_auto_ztp?: boolean;
        };

        const { provisioningSecret, machine_id, is_auto_ztp } = body;
        let { deskId, deskName, email, password, deskLocation } = body;

        // Industrial Hardening: Enforce Provisioning Secret
        if (env.PROVISIONING_SECRET && provisioningSecret !== env.PROVISIONING_SECRET) {
          return createErrorResponse(
            403,
            "Forbidden",
            "Invalid provisioning secret. Zero-Touch Deployment rejected."
          );
        }

        // Industrial Hardening: Enforce Hardware Binding
        if (!machine_id) {
          return createErrorResponse(
            400,
            "Bad Request",
            "Hardware machine_id is required for station binding."
          );
        }

        // Phase 4: Auto-ZTP Identity Generation
        if (is_auto_ztp) {
          deskId = deskId || `station-${machine_id.slice(0, 8)}`;
          deskName = deskName || `Auto-Station (${machine_id.slice(0, 4)})`;
          email = email || `ztp-${machine_id}@clickflash.internal`;
          password = password || env.PROVISIONING_SECRET;
        }

        // Validate required fields
        if (!deskId || !deskName || !email || !password) {
          return createErrorResponse(
            400,
            "Bad Request",
            "deskId, deskName, email, and password are required",
          );
        }
        if (!/^[a-zA-Z0-9_-]{3,64}$/.test(deskId)) {
          return createErrorResponse(
            400,
            "Validation Error",
            "deskId must be 3-64 alphanumeric/underscore characters",
          );
        }

        // Check uniqueness
        const existingDesk = await dbManager.get(
          "SELECT id FROM users WHERE desk_id = ? LIMIT 1",
          [deskId],
        );
        if (existingDesk) {
          // If auto-ZTP and UID matches, return the existing credentials (Idempotency)
          if (is_auto_ztp) {
             const existingUser = await dbManager.get(
                "SELECT id, email, desk_id FROM users WHERE machine_id = ? AND desk_id = ? LIMIT 1",
                [machine_id, deskId]
             );
             if (existingUser) {
                const token = await createToken(
                  {
                    id: existingUser.id,
                    email: existingUser.email,
                    role: "desk",
                    desk_id: existingUser.desk_id,
                  },
                  env.JWT_SECRET,
                  "1y"
                );
                return Response.json({ 
                  success: true, 
                  token, 
                  desk: existingUser, 
                  message: "Station already registered. Identity recovered." 
                }, { headers: corsHeaders });
             }
          }

          return createErrorResponse(
            409,
            "Conflict",
            `Desk ID '${deskId}' is already registered. Choose a different ID.`,
          );
        }

        const existingEmail = await dbManager.get(
          "SELECT id FROM users WHERE email = ? LIMIT 1",
          [email],
        );
        if (existingEmail) {
          return createErrorResponse(
            409,
            "Conflict",
            `Email '${email}' is already in use by another desk.`,
          );
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const now = new Date().toISOString();

        const insertResult = await dbManager.run(
          `INSERT INTO users (email, password, role, desk_id, machine_id, name, location, created_at, updated_at)
           VALUES (?, ?, 'desk', ?, ?, ?, ?, ?, ?)`,
          [
            email,
            hashedPassword,
            deskId,
            machine_id,
            deskName,
            deskLocation || "",
            now,
            now,
          ],
        );
        const userId = insertResult?.meta?.last_row_id ?? insertResult?.lastInsertRowid ?? 0;

        // Issue JWT for the newly registered desk
        const token = await createToken(
          {
            id: userId,
            email,
            role: "desk",
            desk_id: deskId,
          },
          env.JWT_SECRET,
          "1y"
        );

        logger.info(String(`[Register Desk] New station registered: ${deskId} (${deskName}) machine: ${machine_id} at ${deskLocation || "unknown location"}`));

        return Response.json(
          {
            success: true,
            token,
            desk: {
              id: userId,
              deskId,
              deskName,
              deskLocation,
              email,
              role: "desk",
            },
            message: `Station '${deskName}' registered and hardware-bound successfully.`,
          },
          { status: 201, headers: corsHeaders },
        );
      }


      // Login (Public)
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        const body = await request.json();
        const validation = validateLogin(body);
        if (!validation.success) {
          return createErrorResponse(
            400,
            "Validation Error",
            "Invalid credentials format",
          );
        }
        const { email, password, machine_id } = (validation as any).data;

        // Brute-force protection
        const clientIp = request.headers.get('CF-Connecting-IP') ??
                         request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
                         'unknown';
        const rateLimit = await checkLoginRateLimit(dbManager, email, clientIp);
        if (!rateLimit.allowed) {
          return new Response(
            JSON.stringify({
              error: "Too Many Requests",
              message: "Too many failed login attempts. Please try again later.",
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(rateLimit.retryAfterSeconds ?? 900),
              },
            },
          );
        }

        let user;
        try {
          user = await dbManager.get(`SELECT * FROM users WHERE email = ?`, [
            email,
          ]);
        } catch (dbe) {
          logger.error("DB GET ERROR on LOGIN:", { args: [dbe] });
          throw dbe;
        }

        const passwordOk = user && (await verifyPassword(password, user.password));
        await recordLoginAttempt(dbManager, email, clientIp, !!passwordOk);

        if (!passwordOk) {
          return sendAuthError("Invalid email or password.");
        }

        // Phase 20: Hardware Fingerprinting & Session Locking
        // If it's a desk-bound account (Master Station), enforce hardware lock
        if (user.desk_id) {
          if (user.machine_id) {
            if (user.machine_id !== machine_id) {
              return createErrorResponse(
                423,
                "Locked",
                "Station is locked to another hardware device. Please contact support to reset.",
              );
            }
          } else if (machine_id) {
            // Pair with hardware on first login
            await dbManager.run(
              "UPDATE users SET machine_id = ? WHERE id = ?",
              [machine_id, user.id],
            );
            user.machine_id = machine_id;
          }
        }

        // Secure JWT Signing (Rule 01, Law 04)
        const token = await createToken(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            desk_id: user.desk_id || null,
          },
          env.JWT_SECRET,
          "1y"
        );

        delete user.password;
        return Response.json(
          { token, user, desk_id: user.desk_id },
          { headers: corsHeaders },
        );
      }


        return null;
};
