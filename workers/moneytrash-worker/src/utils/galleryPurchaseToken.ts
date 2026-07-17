const encoder = new TextEncoder();
const TOKEN_SCOPE = "gallery:purchase";

export interface GalleryPurchaseClaims {
  galleryId: string;
  scope: typeof TOKEN_SCOPE;
  iat: number;
  exp: number;
}

export async function createGalleryPurchaseToken(
  galleryId: string,
  secret: string,
  expiresInSeconds = 3600,
): Promise<{ token: string; expiresAt: string }> {
  assertSecret(secret);
  if (!galleryId) throw new Error("Gallery ID is required");

  const now = Math.floor(Date.now() / 1000);
  const claims: GalleryPurchaseClaims = {
    galleryId,
    scope: TOKEN_SCOPE,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify(claims)));
  const signature = await sign(payload, secret);
  return {
    token: `${payload}.${signature}`,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  };
}

export async function verifyGalleryPurchaseToken(
  token: string,
  secret: string,
): Promise<GalleryPurchaseClaims> {
  assertSecret(secret);
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) throw new Error("Invalid purchase token");

  const key = await importKey(secret, ["verify"]);
  const signatureBytes = base64UrlToBytes(signature);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes.slice().buffer as ArrayBuffer,
    encoder.encode(payload),
  );
  if (!valid) throw new Error("Invalid purchase token signature");

  let claims: GalleryPurchaseClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as GalleryPurchaseClaims;
  } catch {
    throw new Error("Invalid purchase token payload");
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    claims.scope !== TOKEN_SCOPE ||
    typeof claims.galleryId !== "string" ||
    !claims.galleryId ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    claims.iat > now + 60
  ) {
    throw new Error("Expired or invalid purchase token");
  }
  return claims;
}

function assertSecret(secret: string): void {
  if (!secret || encoder.encode(secret).byteLength < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes");
  }
}

async function importKey(secret: string, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await importKey(secret, ["sign"]);
  const result = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(result));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid token encoding");
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const decoded = atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}
