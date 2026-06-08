/**
 * ClickFlash Installer — Token Encryption Service
 * Encrypts/decrypts API tokens using OS-native keychain or AES-256-GCM fallback.
 */

import crypto from "crypto";
import os from "os";
import path from "path";
import fs from "fs";

const SERVICE_NAME = "ClickFlashInstaller";
const ACCOUNT_NAME = "cloudflare_oauth";
const FALLBACK_KEY_FILE = path.join(os.homedir(), ".clickflash", ".key");

// --- OS-specific keychain wrappers (loaded dynamically) ---

let windowsSecurity: any = null;
let keychainService: any = null;
let libsecret: any = null;

function loadWindowsSecurity(): any {
  if (windowsSecurity) return windowsSecurity;
  try {
    windowsSecurity = require("node-windows-security");
  } catch {
    windowsSecurity = null;
  }
  return windowsSecurity;
}

function loadKeychainService(): any {
  if (keychainService) return keychainService;
  try {
    keychainService = require("keychain-service");
  } catch {
    keychainService = null;
  }
  return keychainService;
}

function loadLibsecret(): any {
  if (libsecret) return libsecret;
  try {
    libsecret = require("libsecret");
  } catch {
    libsecret = null;
  }
  return libsecret;
}

// --- Machine fingerprint for fallback key derivation ---

function getMachineFingerprint(): string {
  const parts = [
    os.hostname(),
    os.userInfo().username,
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || "unknown",
  ];
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
}

function deriveKeyFromFingerprint(): Buffer {
  const fingerprint = getMachineFingerprint();
  return crypto.createHash("sha256").update(fingerprint).digest();
}

// --- AES-256-GCM fallback ---

interface EncryptedPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

function aesEncrypt(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();
  const payload: EncryptedPayload = {
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: encrypted,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function aesDecrypt(encryptedBase64: string, key: Buffer): string {
  const payload: EncryptedPayload = JSON.parse(
    Buffer.from(encryptedBase64, "base64").toString("utf8")
  );
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(payload.ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// --- Platform detection ---

function getPlatform(): "win32" | "darwin" | "linux" | "unknown" {
  const p = os.platform();
  if (p === "win32") return "win32";
  if (p === "darwin") return "darwin";
  if (p === "linux") return "linux";
  return "unknown";
}

// --- Public API ---

/**
 * Encrypt a token using the OS keychain (or AES-256-GCM fallback).
 */
export async function encryptToken(token: string): Promise<string> {
  const platform = getPlatform();

  if (platform === "win32") {
    const win = loadWindowsSecurity();
    if (win && win.protectData) {
      const encrypted = win.protectData(Buffer.from(token, "utf8"));
      return `dpapi:${encrypted.toString("base64")}`;
    }
  }

  if (platform === "darwin") {
    const kc = loadKeychainService();
    if (kc && kc.setPassword) {
      await kc.setPassword(SERVICE_NAME, ACCOUNT_NAME, token);
      return "keychain:darwin";
    }
  }

  if (platform === "linux") {
    const secret = loadLibsecret();
    if (secret && secret.store) {
      await secret.store(SERVICE_NAME, ACCOUNT_NAME, token);
      return "libsecret:linux";
    }
  }

  // Fallback: AES-256-GCM with machine-derived key
  const key = deriveKeyFromFingerprint();
  const encrypted = aesEncrypt(token, key);
  return `aes:${encrypted}`;
}

/**
 * Decrypt a token using the OS keychain (or AES-256-GCM fallback).
 */
export async function decryptToken(encrypted: string): Promise<string> {
  const platform = getPlatform();

  if (encrypted.startsWith("dpapi:")) {
    if (platform !== "win32") {
      throw new Error("DPAPI-encrypted token cannot be decrypted on non-Windows platform.");
    }
    const win = loadWindowsSecurity();
    if (!win || !win.unprotectData) {
      throw new Error("node-windows-security not available for DPAPI decryption.");
    }
    const data = Buffer.from(encrypted.slice("dpapi:".length), "base64");
    const decrypted = win.unprotectData(data);
    return decrypted.toString("utf8");
  }

  if (encrypted === "keychain:darwin") {
    if (platform !== "darwin") {
      throw new Error("macOS Keychain token cannot be decrypted on non-macOS platform.");
    }
    const kc = loadKeychainService();
    if (!kc || !kc.getPassword) {
      throw new Error("keychain-service not available for Keychain decryption.");
    }
    return await kc.getPassword(SERVICE_NAME, ACCOUNT_NAME);
  }

  if (encrypted.startsWith("libsecret:")) {
    if (platform !== "linux") {
      throw new Error("libsecret token cannot be decrypted on non-Linux platform.");
    }
    const secret = loadLibsecret();
    if (!secret || !secret.retrieve) {
      throw new Error("libsecret not available for Secret Service decryption.");
    }
    return await secret.retrieve(SERVICE_NAME, ACCOUNT_NAME);
  }

  if (encrypted.startsWith("aes:")) {
    const key = deriveKeyFromFingerprint();
    return aesDecrypt(encrypted.slice("aes:".length), key);
  }

  throw new Error("Unknown token encryption format.");
}

/**
 * Delete a token from the OS keychain (or clear fallback storage).
 */
export async function deleteToken(encrypted: string): Promise<void> {
  const platform = getPlatform();

  if (encrypted.startsWith("dpapi:")) {
    // DPAPI doesn't have a "delete" API; just overwrite with empty data if needed
    return;
  }

  if (encrypted === "keychain:darwin") {
    if (platform === "darwin") {
      const kc = loadKeychainService();
      if (kc && kc.deletePassword) {
        await kc.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
      }
    }
    return;
  }

  if (encrypted.startsWith("libsecret:")) {
    if (platform === "linux") {
      const secret = loadLibsecret();
      if (secret && secret.clear) {
        await secret.clear(SERVICE_NAME, ACCOUNT_NAME);
      }
    }
    return;
  }

  if (encrypted.startsWith("aes:")) {
    // Nothing stored externally; just forget the encrypted string in memory
    return;
  }
}

/**
 * Store the encrypted token to a local file (convenience wrapper).
 * The file itself only contains the encrypted blob.
 */
export function saveEncryptedTokenToDisk(encrypted: string): void {
  const dir = path.dirname(FALLBACK_KEY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(FALLBACK_KEY_FILE, encrypted, { mode: 0o600 });
}

/**
 * Load the encrypted token from local disk.
 */
export function loadEncryptedTokenFromDisk(): string | null {
  if (!fs.existsSync(FALLBACK_KEY_FILE)) {
    return null;
  }
  return fs.readFileSync(FALLBACK_KEY_FILE, "utf8");
}
