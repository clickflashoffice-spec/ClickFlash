/**
 * Rate Limiting Middleware
 * Prevents abuse of upload endpoints
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (use Redis or similar in production)
const rateLimitStore: RateLimitStore = {};

// Rate limits per endpoint
const RATE_LIMITS = {
  default: { requests: 100, window: 60 }, // 100 requests per minute
  upload: { requests: 20, window: 60 },   // 20 uploads per minute
  chunk: { requests: 100, window: 60 },   // 100 chunks per minute
};

export async function rateLimitMiddleware(request: Request): Promise<Response | null> {
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
  const now = Date.now();
  
  // Clean up expired entries
  if (rateLimitStore[key] && rateLimitStore[key].resetTime < now) {
    delete rateLimitStore[key];
  }
  
  // Initialize or increment counter
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + (limit.window * 1000),
    };
  } else {
    rateLimitStore[key].count++;
  }
  
  // Check if limit exceeded
  if (rateLimitStore[key].count > limit.requests) {
    const retryAfter = Math.ceil((rateLimitStore[key].resetTime - now) / 1000);
    
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
    remaining: limit.requests - rateLimitStore[key].count,
    reset: rateLimitStore[key].resetTime,
  };
  
  return null; // Continue to next middleware/route
}

function getClientId(request: Request): string {
  // Use IP address or API key as client identifier
  const forwarded = request.headers.get('CF-Connecting-IP');
  const realIp = request.headers.get('X-Real-IP');
  
  return forwarded || realIp || 'unknown';
}
