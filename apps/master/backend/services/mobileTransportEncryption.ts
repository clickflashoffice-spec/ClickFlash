import crypto from "crypto";

import {
  MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM,
  MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
} from "./mobileCaptureProtocol";

const AES_KEY_BYTES = 32;
const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;
const BASE64_32_BYTE_PATTERN = /^[A-Za-z0-9+/]{43}=$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export interface MobileAeadEnvelope {
  protocol: typeof MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL;
  algorithm: typeof MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM;
  iv: string;
  ciphertext: string;
  tag: string;
}

function deriveKey(secretBase64: string, keyInfo: string): Buffer {
  if (!BASE64_32_BYTE_PATTERN.test(secretBase64)) {
    throw new Error("Paired-device secret is invalid.");
  }
  if (!keyInfo || keyInfo.length > 2_048) {
    throw new Error("AEAD key context is invalid.");
  }
  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      Buffer.from(secretBase64, "base64"),
      Buffer.alloc(0),
      Buffer.from(keyInfo, "utf8"),
      AES_KEY_BYTES
    )
  );
}

export function encryptMobileAeadUtf8(
  secretBase64: string,
  keyInfo: string,
  aad: string,
  plaintext: string
): MobileAeadEnvelope {
  const key = deriveKey(secretBase64, keyInfo);
  const iv = crypto.randomBytes(GCM_IV_BYTES);
  try {
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, {
      authTagLength: GCM_TAG_BYTES,
    });
    cipher.setAAD(Buffer.from(aad, "utf8"));
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    return {
      protocol: MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
      algorithm: MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM,
      iv: iv.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
    };
  } finally {
    key.fill(0);
  }
}

export function decryptMobileAeadUtf8(
  secretBase64: string,
  keyInfo: string,
  aad: string,
  envelope: MobileAeadEnvelope
): string {
  if (
    envelope.protocol !== MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL ||
    envelope.algorithm !== MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM ||
    !BASE64_PATTERN.test(envelope.iv) ||
    !BASE64_PATTERN.test(envelope.ciphertext) ||
    !BASE64_PATTERN.test(envelope.tag)
  ) {
    throw new Error("Encrypted mobile payload is invalid.");
  }
  const iv = Buffer.from(envelope.iv, "base64");
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");
  const tag = Buffer.from(envelope.tag, "base64");
  if (iv.length !== GCM_IV_BYTES || tag.length !== GCM_TAG_BYTES) {
    throw new Error("Encrypted mobile payload is invalid.");
  }

  const key = deriveKey(secretBase64, keyInfo);
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, {
      authTagLength: GCM_TAG_BYTES,
    });
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } finally {
    key.fill(0);
  }
}

export function decryptMobileAeadBuffer(
  secretBase64: string,
  keyInfo: string,
  aad: string,
  ivBase64: string,
  ciphertext: Buffer,
  tagBase64: string
): Buffer {
  if (!BASE64_PATTERN.test(ivBase64) || !BASE64_PATTERN.test(tagBase64)) {
    throw new Error("Encrypted mobile payload is invalid.");
  }
  const iv = Buffer.from(ivBase64, "base64");
  const tag = Buffer.from(tagBase64, "base64");
  if (iv.length !== GCM_IV_BYTES || tag.length !== GCM_TAG_BYTES) {
    throw new Error("Encrypted mobile payload is invalid.");
  }

  const key = deriveKey(secretBase64, keyInfo);
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, {
      authTagLength: GCM_TAG_BYTES,
    });
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } finally {
    key.fill(0);
  }
}
