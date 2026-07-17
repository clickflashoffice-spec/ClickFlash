/**
 * JWT utilities for authenticated MoneyTrash office sessions.
 */

const JWT_ISSUER = "clickflash-moneytrash";
const JWT_AUDIENCE = "moneytrash-api";
const encoder = new TextEncoder();

export interface JWTPayload {
  officeId: string;
  deskId: string;
  type: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

export async function createJWT(
  payload: Omit<JWTPayload, "iss" | "aud" | "iat" | "exp">,
  secret: string,
  expiresIn = 86400,
): Promise<string> {
  assertSecret(secret);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload: JWTPayload = {
    ...payload,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    iat: now,
    exp: now + expiresIn,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  return `${signatureInput}.${await sign(signatureInput, secret)}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  assertSecret(secret);
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const [encodedHeader, encodedPayload, signature] = parts;
  const header = parseSegment<{ alg?: string; typ?: string }>(encodedHeader);
  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new Error("Unsupported token header");
  }

  const key = await importKey(secret, ["verify"]);
  const signatureBytes = base64UrlDecodeBytes(signature);
  const signatureBuffer = signatureBytes.slice().buffer as ArrayBuffer;
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBuffer,
    encoder.encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!isValid) throw new Error("Invalid signature");

  const payload = parseSegment<JWTPayload>(encodedPayload);
  const now = Math.floor(Date.now() / 1000);
  if (
    payload.iss !== JWT_ISSUER ||
    payload.aud !== JWT_AUDIENCE ||
    typeof payload.officeId !== "string" ||
    typeof payload.deskId !== "string" ||
    typeof payload.type !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number" ||
    payload.exp <= now ||
    payload.iat > now + 60
  ) {
    throw new Error("Invalid token claims");
  }
  return payload;
}

async function importKey(
  secret: string,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

async function sign(data: string, secret: string): Promise<string> {
  const key = await importKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bytesToBase64Url(new Uint8Array(signature));
}

function assertSecret(secret: string): void {
  if (!secret || encoder.encode(secret).byteLength < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes");
  }
}

function parseSegment<T>(segment: string): T {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecodeBytes(segment))) as T;
  } catch {
    throw new Error("Invalid token encoding");
  }
}

function base64UrlEncode(value: string): string {
  return bytesToBase64Url(encoder.encode(value));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecodeBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid token encoding");
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const decoded = atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}
