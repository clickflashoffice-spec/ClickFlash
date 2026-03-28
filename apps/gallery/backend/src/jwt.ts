/**
 * JWT Utilities for Cloudflare Workers (using jose library)
 */
import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const encoder = new TextEncoder();

export interface TokenPayload extends JWTPayload {
  userId: string | number;
  email: string;
  role?: string;
}

export async function createToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, secret: string): Promise<string> {
  const secretKey = encoder.encode(secret);
  
  const token = await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);
  
  return token;
}

export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const secretKey = encoder.encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    return payload as TokenPayload;
  } catch (error) {
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
