import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { randomUUID } from "crypto";
import { verifyPassword } from "../shared/auth";
import {
  sendAuthError,
  sendAuthorizationError,
  sendInternalError,
  sendValidationError,
  sendNotFoundError,
} from "../shared/errorHandler";
import { strictRateLimiter } from "../shared/rateLimiter";

// JWT Secret imported from constants below

import { JWT_SECRET } from "../config/constants";
import { User } from "../types/shared";

import { Logger } from "../shared/logger";
import { DatabaseManager } from "../shared/db";
import AuditLogger from "../shared/auditLogger";

interface AppContext {
  dbManager: DatabaseManager;
  logger: Logger;
  auditLogger: AuditLogger;
}

export default function authRoutes(context: AppContext) {
  const { dbManager, logger, auditLogger } = context;
  const router = express.Router();

  /**
   * @route POST /login
   * @description Authenticate user and return JWT
   * @access Public
   */
  router.post(
    "/login",
    strictRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;
        const clientIp = req.socket.remoteAddress || "unknown";

        if (!email || !password) {
          sendValidationError(res, "Email and password are required");
          return;
        }

        const user = dbManager.get<User>(
          "SELECT * FROM users WHERE email = ?",
          [email],
        );

        if (!user) {
          auditLogger.logLoginAttempt(email, false, clientIp, "USER_NOT_FOUND");
          sendAuthError(
            res,
            "Invalid email or password. Please check your credentials and try again.",
          );
          return;
        }
        let isValidPassword = false;
        if (user.password) {
          const isPasswordHashed =
            user.password.startsWith("$2a$") ||
            user.password.startsWith("$2b$") ||
            user.password.startsWith("$2y$");
          if (isPasswordHashed) {
            isValidPassword = await verifyPassword(password, user.password);
          }
        }

        if (!isValidPassword) {
          auditLogger.logLoginAttempt(
            email,
            false,
            clientIp,
            "INVALID_PASSWORD",
          );
          sendAuthError(
            res,
            "Invalid email or password. Please check your credentials and try again.",
          );
          return;
        }

        auditLogger.logLoginAttempt(email, true, clientIp);

        // Create session
        if (req.session) {
          (req.session as any).user = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
          } as Record<string, any>;
        }

        // Generate JWT
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: "7d" },
        );

        // Track session for concurrent session management (Phase 5-D)
        try {
          const sessionId = randomUUID();
          const tokenHash = crypto.createHash("sha256").update(token).digest("hex").slice(0, 16);
          const ua = (req.headers["user-agent"] ?? "").slice(0, 200);
          const now = new Date().toISOString();
          dbManager.run(
            `INSERT INTO user_sessions (id, user_id, user_email, token_hash, device_info, ip_address, created_at, last_seen)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [sessionId, user.id, user.email, tokenHash, ua, clientIp, now, now],
          );
          if (req.session) {
            (req.session as any).sessionId = sessionId;
          }
        } catch (sessionErr: any) {
          // Non-fatal — login still succeeds even if session tracking fails
          logger.warn("[Auth] Failed to record user session", { error: sessionErr.message });
        }

        delete user.password;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ user, token }));
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        const clientIp = req.socket.remoteAddress || "unknown";
        logger.error("Login error", {
          error: error.message,
          stack: error.stack,
          ip: clientIp,
        });
        sendInternalError(res, error, "login endpoint");
      }
    },
  );

  /**
   * @route POST /signup
   * @description Create a new user account — requires Admin or Manager session
   * @access Admin, Manager
   */
  router.post(
    "/signup",
    strictRateLimiter,
    (req: Request, res: Response, next: NextFunction) => {
      const user = (req.session as any)?.user || (req as any).user;
      const elevatedRoles = ['Admin', 'CEO', 'Manager'];
      if (!user || !elevatedRoles.includes(user.role)) {
        sendAuthorizationError(res, 'Creating user accounts requires Admin or Manager privileges.');
        return;
      }
      next();
    },
    async (req: Request, res: Response) => {
      try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
          sendValidationError(res, "Missing required fields", {
            email: !email,
            password: !password,
            name: !name,
          });
          return;
        }

        if (password.length < 8) {
          sendValidationError(res, "Password must be at least 8 characters");
          return;
        }

        // Check if user already exists
        const existingUser = dbManager.get<User>(
          "SELECT * FROM users WHERE email = ?",
          [email],
        );
        if (existingUser) {
          sendValidationError(res, "User with this email already exists");
          return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const now = new Date().toISOString();

        // Insert user
        const result = dbManager.run(
          "INSERT INTO users (email, password, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          [email, hashedPassword, name, "user", now, now],
        );

        // Fetch created user
        const user = dbManager.get<User>("SELECT * FROM users WHERE id = ?", [
          result.lastInsertRowid,
        ]);

        if (!user) {
          sendInternalError(res, new Error("Failed to create user"), "signup");
          return;
        }

        // Generate JWT
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: "7d" },
        );

        delete user.password;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ user, token }));
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        logger.error("Signup error", {
          error: error.message,
          stack: error.stack,
        });
        sendInternalError(res, error, "signup endpoint");
      }
    },
  );

  /**
   * @route POST /verify-pin
   * @description Re-verify the logged-in user's password before accessing sensitive views
   *              (Settings, Growth, Photographers). Uses the same bcrypt hash as login.
   * @access Requires authentication
   */
  router.post("/verify-pin", strictRateLimiter, async (req: Request, res: Response) => {
    const sessionUser = (req.session as any)?.user || (req as any).user;
    if (!sessionUser?.id) {
      sendAuthError(res, "Not authenticated");
      return;
    }
    const { pin } = req.body;
    if (!pin || typeof pin !== "string") {
      sendValidationError(res, "pin is required");
      return;
    }
    try {
      const user = dbManager.get<User & { password: string }>(
        "SELECT id, email, password FROM users WHERE id = ?",
        [sessionUser.id],
      );
      if (!user) {
        sendAuthError(res, "User not found");
        return;
      }
      const ok = await verifyPassword(pin, user.password);
      if (!ok) {
        res.status(401).json({ success: false, error: "Incorrect password" });
        return;
      }
      auditLogger.logSecurityEvent("SETTINGS_ACCESS_GRANTED", { userId: user.id, email: user.email });
      res.json({ success: true });
    } catch (e) {
      sendInternalError(res, e as Error, "verify-pin");
    }
  });

  /**
   * @route POST /logout
   * @description Logout endpoint - destroys user session and revokes tracked session record
   * @access Public
   */
  router.post("/logout", (req: Request, res: Response) => {
    // Revoke the tracked session record (Phase 5-D)
    const trackedSessionId = (req.session as any)?.sessionId;
    if (trackedSessionId) {
      try {
        dbManager.run(
          "UPDATE user_sessions SET is_active = 0, revoked_at = ? WHERE id = ?",
          [new Date().toISOString(), trackedSessionId],
        );
      } catch (e: any) {
        logger.warn("[Auth] Failed to revoke session record", { error: e.message });
      }
    }

    if (req.session) {
      req.session.destroy((err: any) => {
        if (err) {
          logger.error("Logout error", { error: err.message });
          sendInternalError(res, err, "logout");
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      });
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    }
  });

  /**
   * @route GET /me
   * @description Get current user from session
   * @access Requires authentication
   */
  router.get("/me", async (req: Request, res: Response) => {
    const sessionUser = (req.session as any)?.user || (req as any).user;
    if (!sessionUser || !sessionUser.id) {
      sendAuthError(res, "Not authenticated");
      return;
    }

    try {
      const user = dbManager.get<User>(
        "SELECT id, email, role, name, avatarUrl FROM users WHERE id = ?",
        [sessionUser.id],
      );
      if (!user) {
        sendAuthError(res, "User session valid but user not found in database");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ user }));
    } catch (e) {
      logger.error(
        "Error fetching current user in /me",
        e instanceof Error ? e : undefined,
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ user: sessionUser }));
    }
  });

  /**
   * @route DELETE /me
   * @description Delete user account and all associated data (GDPR Art. 17 - Right to Deletion)
   * @access Requires authentication
   */
  router.delete("/me", async (req: Request, res: Response) => {
    const sessionUser = (req.session as any)?.user || (req as any).user;
    if (!sessionUser || !sessionUser.id) {
      sendAuthError(res, "Not authenticated");
      return;
    }

    try {
      const userId = sessionUser.id;

      const user = dbManager.get<User>(
        "SELECT id, email, role FROM users WHERE id = ?",
        [userId],
      );
      if (!user) {
        sendAuthError(res, "User not found");
        return;
      }

      if (user.role === "Admin") {
        sendValidationError(res, "Admin accounts cannot be deleted via self-service");
        return;
      }

      dbManager.transaction(() => {
        dbManager.run("DELETE FROM sessions WHERE user_id = ?", [userId]);
        dbManager.run("DELETE FROM consent_records WHERE user_id = ?", [userId]);
        dbManager.run("DELETE FROM audit_logs WHERE user_id = ?", [userId]);
        dbManager.run("DELETE FROM orders WHERE customer_email = ?", [user.email]);
        dbManager.run("DELETE FROM gallery_customers WHERE email = ?", [user.email]);
        dbManager.run("DELETE FROM users WHERE id = ?", [userId]);
      });

      auditLogger.logSecurityEvent("USER_ACCOUNT_DELETION", {
        action: "USER_ACCOUNT_DELETION",
        details: `User account ${user.email} deleted by user (self-service)`,
        userId: userId,
        email: user.email,
      });

      if (req.session) {
        req.session.destroy((_err: any) => {});
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        success: true, 
        message: "Your account and all associated data have been deleted" 
      }));
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error("Account deletion error", {
        error: error.message,
        stack: error.stack,
      });
      sendInternalError(res, error, "account deletion endpoint");
    }
  });

  /**
   * @route POST /me/export
   * @description Export user data for data portability (GDPR Art. 20)
   * @access Requires authentication
   */
  router.post("/me/export", async (req: Request, res: Response) => {
    const sessionUser = (req.session as any)?.user || (req as any).user;
    if (!sessionUser || !sessionUser.id) {
      sendAuthError(res, "Not authenticated");
      return;
    }

    try {
      const userId = sessionUser.id;
      const user = dbManager.get<User>(
        "SELECT id, email, name, role, created_at FROM users WHERE id = ?",
        [userId],
      );

      if (!user) {
        sendAuthError(res, "User not found");
        return;
      }

      const consents = dbManager.query(
        "SELECT * FROM consent_records WHERE user_id = ?",
        [userId],
      );

      const orders = dbManager.query(
        "SELECT * FROM orders WHERE customer_email = ?",
        [user.email],
      );

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.created_at,
        },
        consents: consents || [],
        orders: orders || [],
      };

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="my-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      });
      res.end(JSON.stringify(exportData, null, 2));
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error("Data export error", {
        error: error.message,
        stack: error.stack,
      });
      sendInternalError(res, error, "data export endpoint");
    }
  });

  // ---------------------------------------------------------------------------
  // Session Management (Phase 5-D) — concurrent session listing & revocation
  // ---------------------------------------------------------------------------

  /**
   * @route GET /sessions
   * @description List all active sessions for the authenticated user
   * @access Requires authentication
   */
  router.get("/sessions", (req: Request, res: Response) => {
    const sessionUser = (req.session as any)?.user ?? (req as any).user;
    if (!sessionUser?.id) {
      sendAuthError(res, "Not authenticated");
      return;
    }
    try {
      const sessions = dbManager.query<{
        id: string;
        token_hash: string;
        device_info: string | null;
        ip_address: string | null;
        created_at: string;
        last_seen: string;
      }>(
        `SELECT id, token_hash, device_info, ip_address, created_at, last_seen
         FROM user_sessions
         WHERE user_id = ? AND is_active = 1
         ORDER BY last_seen DESC`,
        [sessionUser.id],
      );
      const currentSessionId = (req.session as any)?.sessionId ?? null;
      res.json({ sessions, currentSessionId });
    } catch (e) {
      sendInternalError(res, e as Error, "sessions list");
    }
  });

  /**
   * @route DELETE /sessions/:id
   * @description Revoke a specific session by ID (log out that device)
   * @access Requires authentication — users can only revoke their own sessions
   */
  router.delete("/sessions/:id", (req: Request, res: Response) => {
    const sessionUser = (req.session as any)?.user ?? (req as any).user;
    if (!sessionUser?.id) {
      sendAuthError(res, "Not authenticated");
      return;
    }
    const { id } = req.params;
    try {
      const session = dbManager.get<{ id: string; user_id: number }>(
        "SELECT id, user_id FROM user_sessions WHERE id = ? AND is_active = 1",
        [id],
      );
      if (!session) {
        sendNotFoundError(res, "Session");
        return;
      }
      // Prevent revoking another user's session
      if (String(session.user_id) !== String(sessionUser.id)) {
        sendAuthorizationError(res, "Cannot revoke another user's session");
        return;
      }
      dbManager.run(
        "UPDATE user_sessions SET is_active = 0, revoked_at = ? WHERE id = ?",
        [new Date().toISOString(), id],
      );
      auditLogger.logSecurityEvent("SESSION_REVOKED", {
        revokedSessionId: id,
        byUserId: sessionUser.id,
        byEmail: sessionUser.email,
      });
      res.json({ success: true });
    } catch (e) {
      sendInternalError(res, e as Error, "session revoke");
    }
  });

  /**
   * @route DELETE /sessions
   * @description Revoke ALL other sessions (log out all other devices)
   * @access Requires authentication
   */
  router.delete("/sessions", (req: Request, res: Response) => {
    const sessionUser = (req.session as any)?.user ?? (req as any).user;
    if (!sessionUser?.id) {
      sendAuthError(res, "Not authenticated");
      return;
    }
    const currentSessionId = (req.session as any)?.sessionId ?? null;
    try {
      const result = dbManager.run(
        `UPDATE user_sessions
         SET is_active = 0, revoked_at = ?
         WHERE user_id = ? AND is_active = 1${currentSessionId ? " AND id != ?" : ""}`,
        currentSessionId
          ? [new Date().toISOString(), sessionUser.id, currentSessionId]
          : [new Date().toISOString(), sessionUser.id],
      );
      auditLogger.logSecurityEvent("ALL_OTHER_SESSIONS_REVOKED", {
        byUserId: sessionUser.id,
        byEmail: sessionUser.email,
        revokedCount: result.changes,
      });
      res.json({ success: true, revokedCount: result.changes });
    } catch (e) {
      sendInternalError(res, e as Error, "revoke all sessions");
    }
  });

  return router;
}
