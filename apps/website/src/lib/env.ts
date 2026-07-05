function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the configured gallery backend API base URL.
 *
 * In production, NEXT_PUBLIC_API_URL is required. During development or
 * static prerender without the env var, a warning is logged and a safe
 * localhost placeholder is returned so the build does not hard-fail.
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;

  if (isValidUrl(raw)) {
    return raw.replace(/\/$/, "");
  }

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is required in production. Set it in your environment or CI pipeline.",
    );
  }

  // Fallback for local development / offline prerender only.
  const fallback = "http://localhost:8092";
  console.warn(
    `[website/env] NEXT_PUBLIC_API_URL is not set or invalid. Using fallback ${fallback}. Set NEXT_PUBLIC_API_URL for real API calls.`,
  );
  return fallback;
}

/**
 * Validates that all required public environment variables are present.
 * Call this early (e.g. in a root layout or middleware) to fail fast at runtime.
 */
export function validateWebsiteEnv(): void {
  getApiBaseUrl();
}
