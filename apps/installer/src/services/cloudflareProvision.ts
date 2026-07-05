/**
 * ClickFlash Installer — Cloudflare Provisioning Service
 * Automates D1, R2, KV, Workers, and Pages provisioning for new studios
 */

import crypto from "crypto";

const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";

export interface CloudflareResourceConfig {
  accountId: string;
  apiToken: string;
  deskId: string;
  studioName: string;
}

export interface ProvisionResult {
  success: boolean;
  resources?: {
    d1Database?: { id: string; name: string };
    r2Bucket?: { name: string };
    kvNamespace?: { id: string; title: string };
  };
  error?: string;
  warnings: string[];
}

export async function provisionCloudflareResources(
  config: CloudflareResourceConfig
): Promise<ProvisionResult> {
  const warnings: string[] = [];

  try {
    // 1. Verify token permissions
    const tokenValid = await verifyToken(config.apiToken);
    if (!tokenValid) {
      return { success: false, error: "API token invalid or insufficient permissions", warnings };
    }

    // 2. Check if D1 database exists (global, shared across all desks)
    const d1Databases = await listD1Databases(config.accountId, config.apiToken);
    const d1Database = d1Databases.find((db) => db.name === "clickflash-hub-db");

    if (!d1Database) {
      warnings.push("D1 database 'clickflash-hub-db' not found. Please create it manually or run the Management Hub deploy first.");
    }

    // 3. Check if R2 bucket exists
    const r2Buckets = await listR2Buckets(config.accountId, config.apiToken);
    const bucketName = `clickflash-uploads`;
    let r2Bucket = r2Buckets.find((b) => b.name === bucketName);

    if (!r2Bucket) {
      try {
        await createR2Bucket(config.accountId, config.apiToken, bucketName);
        r2Bucket = { name: bucketName };
      } catch (e: unknown) {
        warnings.push(`Could not create R2 bucket: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 4. Verify KV namespace
    const kvNamespaces = await listKVNamespaces(config.accountId, config.apiToken);
    const kvName = "CLICKFLASH_SESSIONS";
    const kvNamespace = kvNamespaces.find((ns) => ns.title === kvName);

    if (!kvNamespace) {
      warnings.push(`KV namespace '${kvName}' not found. Sessions may use in-memory fallback.`);
    }

    return {
      success: true,
      resources: {
        d1Database: d1Database ? { id: d1Database.uuid, name: d1Database.name } : undefined,
        r2Bucket: r2Bucket ? { name: r2Bucket.name } : undefined,
        kvNamespace: kvNamespace ? { id: kvNamespace.id, title: kvNamespace.title } : undefined,
      },
      warnings,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      warnings,
    };
  }
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${CLOUDFLARE_API}/accounts`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const data = (await res.json()) as { success: boolean };
    return data.success;
  } catch {
    return false;
  }
}

export async function listAccounts(token: string): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(`${CLOUDFLARE_API}/accounts`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = (await res.json()) as { success: boolean; result?: Array<{ id: string; name: string }> };
  return data.success && data.result ? data.result : [];
}

async function listD1Databases(accountId: string, token: string): Promise<Array<{ uuid: string; name: string }>> {
  const res = await fetch(`${CLOUDFLARE_API}/accounts/${accountId}/d1/database`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = (await res.json()) as { success: boolean; result?: Array<{ uuid: string; name: string }> };
  return data.success && data.result ? data.result : [];
}

async function listR2Buckets(accountId: string, token: string): Promise<Array<{ name: string }>> {
  const res = await fetch(`${CLOUDFLARE_API}/accounts/${accountId}/r2/buckets`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = (await res.json()) as { success: boolean; result?: { buckets: Array<{ name: string }> } };
  return data.success && data.result ? data.result.buckets : [];
}

async function createR2Bucket(accountId: string, token: string, name: string): Promise<void> {
  const res = await fetch(`${CLOUDFLARE_API}/accounts/${accountId}/r2/buckets`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { errors?: Array<{ message: string }> };
    throw new Error(err.errors?.[0]?.message || `Failed to create R2 bucket ${name}`);
  }
}

async function listKVNamespaces(accountId: string, token: string): Promise<Array<{ id: string; title: string }>> {
  const res = await fetch(`${CLOUDFLARE_API}/accounts/${accountId}/storage/kv/namespaces`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = (await res.json()) as { success: boolean; result?: Array<{ id: string; title: string }> };
  return data.success && data.result ? data.result : [];
}

export function generateDeskId(location?: string): string {
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  if (location) {
    const clean = location.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
    return `MASTER_${clean}_${rand}`;
  }
  return `MASTER_${rand}`;
}

export function checkDeskIdCollision(deskId: string, existingDesks: string[]): boolean {
  return existingDesks.includes(deskId);
}

export function suggestAlternativeDeskId(deskId: string, existingDesks: string[]): string {
  let attempt = 2;
  let candidate = deskId;
  while (existingDesks.includes(candidate) && attempt < 100) {
    candidate = `${deskId}-${attempt}`;
    attempt++;
  }
  return candidate;
}
