/**
 * Login Rate Limiter — D1-backed, Cloudflare Worker compatible.
 *
 * Strategy:
 *   - Per-email: 5 failed attempts within 15 minutes → 429 for 15 minutes
 *   - Per-IP:    20 failed attempts within 15 minutes → 429 for 15 minutes
 *
 * Uses the login_attempts table (migration 012_add_login_attempts.sql).
 */

import DatabaseManager from './db.js';

const MAX_ATTEMPTS_EMAIL = 5;
const MAX_ATTEMPTS_IP    = 20;
const WINDOW_MINUTES     = 15;

export interface RateLimitResult {
  allowed: boolean;
  remainingEmail: number;
  remainingIp: number;
  retryAfterSeconds?: number;
}

/**
 * Check whether a login attempt should be allowed.
 * Call this BEFORE verifying the password.
 */
export async function checkLoginRateLimit(
  db: DatabaseManager,
  email: string,
  ip: string,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const [emailRow, ipRow] = await Promise.all([
    db.get(
      `SELECT COUNT(*) AS cnt FROM login_attempts
       WHERE email = ? AND success = 0 AND created_at >= ?`,
      [email, since],
    ) as Promise<{ cnt: number } | undefined>,
    db.get(
      `SELECT COUNT(*) AS cnt FROM login_attempts
       WHERE ip = ? AND success = 0 AND created_at >= ?`,
      [ip, since],
    ) as Promise<{ cnt: number } | undefined>,
  ]);

  const emailCount = emailRow?.cnt ?? 0;
  const ipCount    = ipRow?.cnt ?? 0;

  if (emailCount >= MAX_ATTEMPTS_EMAIL || ipCount >= MAX_ATTEMPTS_IP) {
    return {
      allowed:              false,
      remainingEmail:       Math.max(0, MAX_ATTEMPTS_EMAIL - emailCount),
      remainingIp:          Math.max(0, MAX_ATTEMPTS_IP - ipCount),
      retryAfterSeconds:    WINDOW_MINUTES * 60,
    };
  }

  return {
    allowed:        true,
    remainingEmail: MAX_ATTEMPTS_EMAIL - emailCount,
    remainingIp:    MAX_ATTEMPTS_IP - ipCount,
  };
}

/**
 * Record the outcome of a login attempt.
 * Call this AFTER the password check (success or failure).
 */
export async function recordLoginAttempt(
  db: DatabaseManager,
  email: string,
  ip: string,
  success: boolean,
): Promise<void> {
  await db.run(
    `INSERT INTO login_attempts (email, ip, success, created_at)
     VALUES (?, ?, ?, datetime('now'))`,
    [email, ip, success ? 1 : 0],
  );
}
