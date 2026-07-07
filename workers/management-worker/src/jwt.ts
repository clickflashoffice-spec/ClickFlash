/**
 * JWT Utilities for ClickFlash Management Hub Cloudflare Worker (using jose).
 *
 * Mirrors the canonical Gallery backend jwt.ts helper.  Management desk sessions
 * use a 1-hour access-token lifetime because they are operator-facing and rotated
 * via 7-day refresh tokens; Gallery customer sessions keep a 24-hour lifetime for
 * uninterrupted browsing/purchasing.
 */
import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const encoder = new TextEncoder();

export interface TokenPayload extends JWTPayload {
  id?: string | number;
  userId?: string | number;
  user_id?: string | number;
  email?: string;
  role?: string;
  desk_id?: string | null;
  tenant_id?: string;
  scope?: string;
  sub?: string;
  type?: string;
  iss?: string;
  aud?: string;
  jti?: string;
}

/**
 * Create a signed HS256 JWT.
 * @param payload - Token payload (iat/exp are added automatically).
 * @param secret - Signing secret.
 * @param expiresIn - Expiration time string or numeric epoch offset (default: '1h').
 * @returns Signed JWT string.
 */
export async function createToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: string | number = '1h'
): Promise<string> {
  const secretKey = encoder.encode(secret);

  const jwt = new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt();

  jwt.setExpirationTime(expiresIn);

  return await jwt.sign(secretKey);
}

/**
 * Verify and decode a JWT.
 * @param token - JWT string.
 * @param secret - Signing secret.
 * @returns Decoded payload or null if invalid/expired.
 */
export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const secretKey = encoder.encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    return payload as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract a Bearer token from an Authorization header.
 * @param authHeader - Raw Authorization header value.
 * @returns The token string or null.
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
