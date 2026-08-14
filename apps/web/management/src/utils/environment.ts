/**
 * Utilities for environment detection and configuration.
 * preventing local network access on public domains.
 */

export const isPublicDomain = (): boolean => {
  const hostname = window.location.hostname;
  return (
    hostname !== "localhost" &&
    hostname !== "127.0.0.1" &&
    !hostname.startsWith("192.168.") &&
    !hostname.endsWith(".local")
  ); // Catch mDNS
};

export const getCloudBaseUrl = (): string => {
  return "https://management-hub.clickflash-office.workers.dev";
};

/**
 * Validates if a URL is safe to connect to in the current environment.
 * Returns true if safe, false if it violates safety rules (e.g. connecting to local from public).
 */
export const isSafeConnection = (url: string): boolean => {
  if (!url) return false;

  if (isPublicDomain()) {
    // block localhost, 127.0.0.1, 192.168.x.x
    if (
      url.includes("localhost") ||
      url.includes("127.0.0.1") ||
      url.includes("192.168.")
    ) {
      return false;
    }
  }
  return true;
};
