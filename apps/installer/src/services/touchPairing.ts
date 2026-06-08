import crypto from "crypto";
import { exec } from "child_process";
import os from "os";

export interface MasterInfo {
  deskId: string;
  ip: string;
  port: number;
  latencyMs: number;
  version: string;
  name: string;
}

export interface PairingResult {
  paired: boolean;
  masterIp: string | null;
  latencyMs: number | null;
  hmacSecret?: string;
  kioskId?: string;
  error?: string;
}

/**
 * Discover Master stations on the local network via mDNS/Bonjour
 */
export async function discoverMasters(): Promise<MasterInfo[]> {
  // In production, this uses the TouchMdnsDiscovery service
  // For the installer wizard, we do a quick HTTP sweep of common LAN ranges
  const interfaces = os.networkInterfaces();
  const localSubnet = getLocalSubnet(interfaces);
  if (!localSubnet) return [];

  const candidates: MasterInfo[] = [];
  const baseIp = localSubnet.replace(/\.\d+$/, "");

  // Scan .1 - .254 for /24 subnets (limited to avoid timeout)
  const promises = Array.from({ length: 10 }, (_, i) => {
    const ip = `${baseIp}.${100 + i}`;
    return probeMaster(ip, 8090);
  });

  const results = await Promise.all(promises);
  return results.filter((r): r is MasterInfo => r !== null);
}

async function probeMaster(ip: string, port: number): Promise<MasterInfo | null> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://${ip}:${port}/api/info`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { deskId?: string; version?: string; name?: string };
    return {
      deskId: data.deskId || "unknown",
      ip,
      port,
      latencyMs: 0, // Would be measured
      version: data.version || "unknown",
      name: data.name || "Unknown Master",
    };
  } catch {
    return null;
  }
}

function getLocalSubnet(interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>): string | null {
  for (const iface of Object.values(interfaces)) {
    for (const info of iface || []) {
      if (info.family === "IPv4" && !info.internal) {
        return info.address;
      }
    }
  }
  return null;
}

/**
 * Pair Touch Kiosk with a discovered Master
 */
export async function pairWithMaster(
  masterIp: string,
  pairingToken: string
): Promise<PairingResult> {
  try {
    // Step 1: Exchange pairing token for HMAC secret
    const res = await fetch(`http://${masterIp}:8090/api/pairing/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairingToken }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      return { paired: false, masterIp, latencyMs: null, error: err.error || `HTTP ${res.status}` };
    }

    const data = (await res.json()) as { hmacSecret: string; kioskId: string };

    // Step 2: Test sync
    const testRes = await fetch(`http://${masterIp}:8090/api/pairing/test-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kiosk-ID": data.kioskId,
        "X-Signature": generateTestSignature(data.hmacSecret, data.kioskId),
      },
      body: JSON.stringify({ test: true }),
    });

    return {
      paired: testRes.ok,
      masterIp,
      latencyMs: 0,
      hmacSecret: data.hmacSecret,
      kioskId: data.kioskId,
    };
  } catch (err: unknown) {
    return {
      paired: false,
      masterIp,
      latencyMs: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function generateTestSignature(secret: string, kioskId: string): string {
  const timestamp = Date.now().toString();
  const payload = `${kioskId}:${timestamp}:POST:/api/pairing/test-sync:{"test":true}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}
