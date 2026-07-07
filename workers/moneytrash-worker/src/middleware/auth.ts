/**
 * Authentication Middleware
 * Verifies JWT tokens and extracts office info
 */

import { verifyJWT } from '../utils/jwt';

export async function authMiddleware(
  request: Request,
  env: { JWT_SECRET: string }
): Promise<Response | null> {
  // Skip auth for public routes (handled in router)
  const url = new URL(request.url);
  const publicPaths = ['/api/office/register', '/api/office/verify', '/api/health'];
  
  if (publicPaths.some(path => url.pathname.startsWith(path))) {
    return null; // Continue to route handler
  }
  
  // Get Authorization header
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json(
      { error: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }
  
  const token = authHeader.substring(7);
  
  try {
    // Verify JWT
    const payload = await verifyJWT(token, env.JWT_SECRET);
    
    // Add office info to request headers for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-Office-Id', payload.officeId);
    requestHeaders.set('X-Desk-Id', payload.deskId);
    requestHeaders.set('X-Office-Type', payload.type);

    // Create a new Request with the modified headers so downstream
    // handlers can read X-Office-Id / X-Desk-Id / X-Office-Type.
    // (The original Request is immutable; the Router will thread this
    // new request through to the matching route handler.)
    const newRequest = new Request(request, { headers: requestHeaders });
    // Also stash the full payload for handlers that need it
    (newRequest as any).office = payload;

    return newRequest;

  } catch (error) {
    console.error('JWT verification failed:', error);
    return Response.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
