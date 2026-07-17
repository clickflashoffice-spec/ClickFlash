import { describe, expect, it, vi } from "vitest";

import {
  fetchBoundedJson,
  readBoundedJson,
} from "./electron-network-security";

describe("Installer bounded network responses", () => {
  it("reads JSON only within the configured byte limit", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });

    await expect(readBoundedJson(response, 64)).resolves.toEqual({ ok: true });
  });

  it("rejects declared and streamed oversized responses", async () => {
    const declared = new Response("{}", {
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "1000",
      },
    });
    const streamed = new Response(JSON.stringify({ value: "too large" }), {
      headers: { "Content-Type": "application/json" },
    });

    await expect(readBoundedJson(declared, 16)).rejects.toThrow("exceeds");
    await expect(readBoundedJson(streamed, 8)).rejects.toThrow("exceeds");
  });

  it("disables redirects and applies an abort signal", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.redirect).toBe("error");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return new Response("{}", {
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    await expect(fetchBoundedJson("https://hub.clickflash.app/test", {}, { fetchImpl }))
      .resolves.toMatchObject({ data: {} });
  });
});
