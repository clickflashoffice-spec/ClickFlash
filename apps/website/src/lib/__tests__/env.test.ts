import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getApiBaseUrl, validateWebsiteEnv } from "../env";

describe("env", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("NEXT_PUBLIC_API_URL", undefined);
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns NEXT_PUBLIC_API_URL when valid", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com/");
    expect(getApiBaseUrl()).toBe("https://api.example.com");
  });

  it("throws in production when NEXT_PUBLIC_API_URL is missing", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() => getApiBaseUrl()).toThrow(
      "NEXT_PUBLIC_API_URL is required in production",
    );
  });

  it("falls back to localhost with a warning in development", () => {
    expect(getApiBaseUrl()).toBe("http://localhost:8092");
    expect(console.warn).toHaveBeenCalled();
  });

  it("validateWebsiteEnv runs without throwing when env is set", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    expect(() => validateWebsiteEnv()).not.toThrow();
  });
});
