const encoder = new TextEncoder();

export async function signPurchaseDownload(
  orderId: string,
  assetId: string,
  expires: number,
  secret: string,
): Promise<string> {
  const key = await importKey(secret, ["sign"]);
  const payload = encoder.encode(`${orderId}\n${assetId}\n${expires}`);
  const signature = await crypto.subtle.sign("HMAC", key, payload);
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function verifyPurchaseDownload(
  orderId: string,
  assetId: string,
  expires: number,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!Number.isInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  try {
    const key = await importKey(secret, ["verify"]);
    const signatureBytes = base64UrlToBytes(signature);
    return crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes.slice().buffer as ArrayBuffer,
      encoder.encode(`${orderId}\n${assetId}\n${expires}`),
    );
  } catch {
    return false;
  }
}

async function importKey(secret: string, usages: KeyUsage[]): Promise<CryptoKey> {
  if (!secret || encoder.encode(secret).byteLength < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes");
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid signature");
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const decoded = atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}
