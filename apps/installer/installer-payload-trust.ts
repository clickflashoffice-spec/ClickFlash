import type { PayloadTrustRoots } from "./installer-payload-verification";

// Production payload keys must be approved and embedded here. Keeping this empty
// makes packaged installers fail closed until the release-signing ceremony exists.
export const PACKAGED_PAYLOAD_TRUST_ROOTS: PayloadTrustRoots = Object.freeze({
  "payload-key-v1-1784572878559": "11n4Xq1EA9xX2EGCGmSaCpsiFmbyq2qTIS0dXegCJUI=",
});

export function getDevelopmentPayloadTrustRoots(
  environment: NodeJS.ProcessEnv,
): PayloadTrustRoots {
  const keyId = environment.CLICKFLASH_PAYLOAD_KEY_ID?.trim();
  const publicKey = environment.CLICKFLASH_PAYLOAD_PUBLIC_KEY?.trim();
  if (!keyId && !publicKey) return Object.freeze({});
  if (!keyId || !publicKey) {
    throw new Error("Both development payload key ID and public key must be configured");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(keyId)) {
    throw new Error("Development payload key ID is invalid");
  }
  return Object.freeze({ [keyId]: publicKey });
}
