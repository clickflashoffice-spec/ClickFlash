import path from "path";
import { fileURLToPath } from "url";
import { isIP } from "net";

const MAX_URL_LENGTH = 2_048;

export function isTrustedRendererUrl(
  value: string,
  packaged: boolean,
  developmentOrigin: string,
  packagedEntryPath?: string,
): boolean {
  try {
    const url = new URL(value);
    if (packaged) {
      if (url.protocol !== "file:" || !packagedEntryPath) return false;
      return path.resolve(fileURLToPath(url)).toLowerCase() === path.resolve(packagedEntryPath).toLowerCase();
    }
    return url.origin === developmentOrigin;
  } catch {
    return false;
  }
}

export function getSafeExternalUrl(value: unknown, allowedHosts: readonly string[]): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_URL_LENGTH) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (!allowedHosts.some((host) => host.toLowerCase() === url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function getApprovedDirectory(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) return null;
  if (!path.isAbsolute(value)) return null;
  return path.resolve(value);
}

export function getApprovedExecutable(
  value: unknown,
  approvedDirectory: string | null,
  expectedFilename: string,
): string | null {
  if (!approvedDirectory || typeof value !== "string" || value.includes("\0")) return null;

  const candidate = path.resolve(value);
  const approved = path.resolve(approvedDirectory);
  const sameDirectory = path.dirname(candidate).toLowerCase() === approved.toLowerCase();
  const expectedName = path.basename(candidate).toLowerCase() === expectedFilename.toLowerCase();
  return sameDirectory && expectedName ? candidate : null;
}

export function getSafeCloudBaseUrl(value: unknown, allowedHosts: readonly string[]): string | null {
  const safeUrl = getSafeExternalUrl(value, allowedHosts);
  if (!safeUrl) return null;

  const url = new URL(safeUrl);
  if (url.pathname !== "/" || url.search || url.hash) return null;
  return url.origin;
}

export function getPrivateLanHost(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const host = value.trim().toLowerCase();
  if (!host || host.length > 253) return null;

  if (host === "localhost") return host;
  if (/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*local$/.test(host)) return host;
  if (isIP(host) !== 4) return null;

  return isPrivateIpv4(host) ? host : null;
}

export function isPrivateIpv4(value: unknown): value is string {
  if (typeof value !== "string" || isIP(value) !== 4) return false;
  const [a, b] = value.split(".").map(Number);
  return a === 10
    || a === 127
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 169 && b === 254);
}

export function getPinnedPrivateIpv4(
  host: unknown,
  resolvedAddresses: readonly string[],
): string | null {
  const safeHost = getPrivateLanHost(host);
  if (!safeHost) return null;
  if (isPrivateIpv4(safeHost)) return safeHost;
  if (resolvedAddresses.length === 0 || !resolvedAddresses.every(isPrivateIpv4)) return null;
  return resolvedAddresses[0];
}

export function getValidPort(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 65_535
    ? Number(value)
    : null;
}

export function getBoundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\0\r\n]/.test(normalized)) return null;
  return normalized;
}
