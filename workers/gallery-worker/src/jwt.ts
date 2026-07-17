/**
 * JWT Utilities for ClickFlash Gallery Cloudflare Worker (using jose).
 *
 * This is the canonical JWT helper for Cloudflare Worker backends.  The
 * Management backend mirrors this module.  Gallery customer sessions intentionally
 * keep a 24-hour access-token lifetime so paying customers are not interrupted
 * while browsing/purchasing photos; Management desk sessions use a shorter 1-hour
 * lifetime because they are operator-facing and rotated via refresh tokens.
 */
import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const encoder = new TextEncoder();
const TOKEN_ISSUER = 'clickflash-gallery';
const TOKEN_AUDIENCE = 'clickflash-gallery-api';

export interface TokenPayload extends JWTPayload {
  userId?: string | number;
  email?: string;
  role?: string;
  destinationId?: string;
  orderId?: string;
  type?: string;
}

/**
 * Create a signed HS256 JWT.
 * @param payload - Token payload (iat/exp are added automatically).
 * @param secret - Signing secret.
 * @param expiresIn - Expiration time string or numeric epoch offset (default: '24h').
 * @returns Signed JWT string.
 */
export async function createToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: string | number = '24h'
): Promise<string> {
  const secretKey = encoder.encode(secret);

  const token = await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);

  return token;
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
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
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
