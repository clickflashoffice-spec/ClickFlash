import {
  createPublicKey,
  verify as verifySignature,
} from "crypto";
import si from "systeminformation";
import { z } from "zod";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

const signedLicenseSchema = z.object({
  plan: z.enum(["starter", "pro", "enterprise", "trial"]),
  maxMasters: z.number().int().min(1).max(10_000),
  expiresAt: z.string().refine((value) => Number.isFinite(Date.parse(value))).nullable(),
  createdAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  machineId: z.string().trim().min(1).max(256),
  destinationId: z.string().trim().min(1).max(256).optional(),
  nonce: z.string().min(1).max(128).optional(),
}).strict();

export interface DesktopLicenseResult {
  valid: boolean;
  error?: string;
  license?: {
    plan: "starter" | "pro" | "enterprise" | "trial";
    maxMasters: number;
    expiresAt: string | null;
    machineId: string;
  };
}

export function isValidEd25519PublicKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value.trim())) return false;
  return Buffer.from(value.trim(), "base64").length === 32;
}

function decodeBase64Url(value: string): Buffer {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Invalid base64url value");
  }
  return Buffer.from(value, "base64url");
}

export function verifySignedDesktopLicense(
  key: string,
  publicKeyB64: string,
): DesktopLicenseResult {
  if (!key.startsWith("CF-LIVE-")) {
    return { valid: false, error: "License prefix is invalid" };
  }
  if (!isValidEd25519PublicKey(publicKeyB64)) {
    return { valid: false, error: "License public key is not configured" };
  }

  const parts = key.slice("CF-LIVE-".length).split(".");
  if (parts.length !== 2) return { valid: false, error: "License format is invalid" };

  try {
    const payloadBytes = decodeBase64Url(parts[0]);
    const signatureBytes = decodeBase64Url(parts[1]);
    const rawPublicKey = Buffer.from(publicKeyB64, "base64");
    if (rawPublicKey.length !== 32 || signatureBytes.length !== 64) {
      return { valid: false, error: "License cryptographic material is invalid" };
    }

    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, rawPublicKey]),
      format: "der",
      type: "spki",
    });
    if (!verifySignature(null, payloadBytes, publicKey, signatureBytes)) {
      return { valid: false, error: "License signature is invalid" };
    }

    const payload = signedLicenseSchema.safeParse(JSON.parse(payloadBytes.toString("utf8")));
    if (!payload.success) return { valid: false, error: "Signed license payload is invalid" };

    if (payload.data.expiresAt) {
      const expiration = new Date(payload.data.expiresAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiration < today) return { valid: false, error: "License has expired" };
    }

    return { valid: true, license: payload.data };
  } catch {
    return { valid: false, error: "License data is malformed" };
  }
}

export async function getLicenseMachineId(): Promise<string> {
  const uuid = await si.uuid();
  const machineId = uuid.os || uuid.hardware;
  if (!machineId || machineId === "-") throw new Error("Stable hardware identity is unavailable");
  return machineId;
}
