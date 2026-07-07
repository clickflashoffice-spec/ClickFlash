/**
 * Rate Limiting Middleware
 * Prevents abuse of upload endpoints using a shared D1-backed counter.
 * Falls back to an in-memory store when D1 is unavailable.
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory fallback store (per-Worker instance)
const rateLimitStore: RateLimitStore = {};

// Rate limits per endpoint
const RATE_LIMITS = {
  default: { requests: 100, window: 60 }, // 100 requests per minute
  upload: { requests: 20, window: 60 },   // 20 uploads per minute
  chunk: { requests: 100, window: 60 },   // 100 chunks per minute
};

interface RateLimitEnv {
  DB?: D1Database;
}

function getClientId(request: Request): string {
  // Use IP address or API key as client identifier
  const forwarded = request.headers.get('CF-Connecting-IP');
  const realIp = request.headers.get('X-Real-IP');

  return forwarded || realIp || 'unknown';
}

function getWindowStart(windowSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  return new Date(windowStart * 1000).toISOString();
}

async function getDbCount(
  db: D1Database,
  key: string,
  windowStart: string,
): Promise<number | null> {
  try {
    const row = await db
      .prepare('SELECT count FROM rate_limits WHERE key = ? AND window_start = ?')
      .bind(key, windowStart)
      .first<{ count: number }>();
    return row?.count ?? null;
  } catch {
    return null;
  }
}

async function incrementDbCount(
  db: D1Database,
  key: string,
  windowStart: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = count + 1`,
    )
    .bind(key, windowStart)
    .run();

  // Best-effort cleanup of old windows with probabilistic execution (5%)
  // This massively reduces D1 write contention compared to running on every request.
  if (Math.random() < 0.05) {
    await db
      .prepare('DELETE FROM rate_limits WHERE window_start < ?')
      .bind(windowStart)
      .run()
      .catch(() => {});
  }
}

export async function rateLimitMiddleware(
  request: Request,
  env?: RateLimitEnv,
): Promise<Response | null> {
  const url = new URL(request.url);
  const clientId = getClientId(request);

  // Determine rate limit based on endpoint
  let limit = RATE_LIMITS.default;
  if (url.pathname.includes('/upload/chunk') && request.method === 'PUT') {
    limit = RATE_LIMITS.chunk;
  } else if (url.pathname.includes('/upload')) {
    limit = RATE_LIMITS.upload;
  }

  const key = `${clientId}:${url.pathname}`;
  const windowSeconds = limit.window;
  const windowStart = getWindowStart(windowSeconds);
  const now = Date.now();
  const resetTime = now + (limit.window * 1000);

  let count: number;
  const db = env?.DB;

  if (db) {
    const dbCount = await getDbCount(db, key, windowStart);
    if (dbCount === null) {
      await incrementDbCount(db, key, windowStart);
      count = 1;
    } else {
      count = dbCount + 1;
      await incrementDbCount(db, key, windowStart);
    }
  } else {
    // Fallback to in-memory store
    if (rateLimitStore[key] && rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }

    if (!rateLimitStore[key]) {
      rateLimitStore[key] = {
        count: 1,
        resetTime,
      };
    } else {
      rateLimitStore[key].count++;
    }

    count = rateLimitStore[key].count;
  }

  // Check if limit exceeded
  if (count > limit.requests) {
    const retryAfter = Math.ceil((resetTime - now) / 1000);

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter,
        limit: limit.requests,
        window: limit.window,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  // Add rate limit headers to response (will be applied in main handler)
  (request as any).rateLimit = {
    limit: limit.requests,
    remaining: Math.max(0, limit.requests - count),
    reset: resetTime,
  };

  return null; // Continue to next middleware/route
}
