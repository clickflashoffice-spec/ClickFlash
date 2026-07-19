/**
 * Login Rate Limiter — D1-backed, Cloudflare Worker compatible.
 * Management Hub login rate limiter.
 *
 * Limits: 5 failed/email and 20 failed/IP within 15 minutes → HTTP 429.
 * Requires: login_attempts table (migration 022_add_login_attempts.sql).
 */

import type DatabaseManager from './db.js';

const MAX_ATTEMPTS_EMAIL = 5;
const MAX_ATTEMPTS_IP    = 20;
const WINDOW_MINUTES     = 15;

export interface RateLimitResult {
  allowed: boolean;
  remainingEmail: number;
  remainingIp: number;
  retryAfterSeconds?: number;
}

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
      allowed:           false,
      remainingEmail:    Math.max(0, MAX_ATTEMPTS_EMAIL - emailCount),
      remainingIp:       Math.max(0, MAX_ATTEMPTS_IP - ipCount),
      retryAfterSeconds: WINDOW_MINUTES * 60,
    };
  }

  return {
    allowed:        true,
    remainingEmail: MAX_ATTEMPTS_EMAIL - emailCount,
    remainingIp:    MAX_ATTEMPTS_IP - ipCount,
  };
}

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
