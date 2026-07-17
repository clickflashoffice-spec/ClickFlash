const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createSignature(
  assetId: string,
  expires: number,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${assetId}.${expires}`),
  );
  return toBase64Url(new Uint8Array(signature));
}

export async function signGalleryAssetUrl(
  assetId: string,
  expires: number,
  secret: string,
): Promise<string> {
  return createSignature(assetId, expires, secret);
}

export async function verifyGalleryAssetSignature(
  assetId: string,
  expires: number,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = await createSignature(assetId, expires, secret);
  if (expected.length !== signature.length) return false;

  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return difference === 0;
}
