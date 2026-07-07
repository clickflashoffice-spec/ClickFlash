/**
 * JWT Utilities for Cloudflare Workers
 * Uses Web Crypto API
 */

export interface JWTPayload {
  officeId: string;
  deskId: string;
  type: string;
  iat?: number;
  exp?: number;
}

export async function createJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: number = 86400 // 24 hours
): Promise<string> {
  const encoder = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await sign(signatureInput, secret);
  
  return `${signatureInput}.${signature}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  
  const [encodedHeader, encodedPayload, signature] = parts;
  
  // Verify signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = await sign(signatureInput, secret);
  
  if (signature !== expectedSignature) {
    throw new Error('Invalid signature');
  }
  
  // Decode payload
  const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }
  
  return payload;
}

async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  // Add padding
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
  
  return atob(base64);
}
