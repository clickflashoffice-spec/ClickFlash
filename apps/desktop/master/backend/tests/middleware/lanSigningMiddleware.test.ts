import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "crypto";
import {
  verifyLanSignatureCore,
  canonicalJson,
  lanSigningMiddleware,
  createFastifyLanSigningHook,
} from "../../middleware/lanSigningMiddleware.ts";

describe("lanSigningMiddleware & verifyLanSignatureCore (SEC-003)", () => {
  const kioskId = "kiosk-unit-alpha";
  const signingSecret = "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b";
  const getSigningSecret = vi.fn((id: string) => (id === kioskId ? signingSecret : null));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canonicalJson", () => {
    it("should sort object keys deterministically", () => {
      const obj1 = { z: 1, a: 2, m: { y: "b", x: "a" } };
      const obj2 = { a: 2, m: { x: "a", y: "b" }, z: 1 };
      expect(canonicalJson(obj1)).toBe(canonicalJson(obj2));
      expect(canonicalJson(obj1)).toBe('{"a":2,"m":{"x":"a","y":"b"},"z":1}');
    });

    it("should handle empty or falsy objects", () => {
      expect(canonicalJson(null)).toBe("");
      expect(canonicalJson(undefined)).toBe("");
      expect(canonicalJson({})).toBe("{}");
    });
  });

  describe("verifyLanSignatureCore", () => {
    it("should accept valid signature from private IP within clock skew", () => {
      const timestamp = String(Date.now());
      const method = "POST";
      const path = "/api/kiosk/sync";
      const body = { albumId: "alb-123", photoCount: 5 };
      const bodyStr = canonicalJson(body);
      const payload = `${kioskId}:${timestamp}:${method}:${path}:${bodyStr}`;
      const signature = crypto.createHmac("sha256", signingSecret).update(payload).digest("hex");

      const result = verifyLanSignatureCore({
        clientIp: "192.168.1.50",
        kioskId,
        timestamp,
        signature,
        method,
        path,
        body,
        getSigningSecret,
      });

      expect(result.valid).toBe(true);
    });

    it("should accept localhost IPv4 and IPv6", () => {
      const timestamp = String(Date.now());
      const method = "GET";
      const path = "/api/kiosk/ping";
      const payload = `${kioskId}:${timestamp}:${method}:${path}:`;
      const signature = crypto.createHmac("sha256", signingSecret).update(payload).digest("hex");

      const result127 = verifyLanSignatureCore({
        clientIp: "127.0.0.1",
        kioskId,
        timestamp,
        signature,
        method,
        path,
        getSigningSecret,
      });
      expect(result127.valid).toBe(true);

      const resultIpv6 = verifyLanSignatureCore({
        clientIp: "::1",
        kioskId,
        timestamp,
        signature,
        method,
        path,
        getSigningSecret,
      });
      expect(resultIpv6.valid).toBe(true);
    });

    it("should reject non-private public IP addresses with 403 Forbidden", () => {
      const timestamp = String(Date.now());
      const result = verifyLanSignatureCore({
        clientIp: "203.0.113.195",
        kioskId,
        timestamp,
        signature: "abc",
        method: "POST",
        path: "/api/sync",
        getSigningSecret,
      });

      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.error).toBe("Forbidden");
    });

    it("should reject requests with missing headers with 401 Unauthorized", () => {
      const result = verifyLanSignatureCore({
        clientIp: "192.168.1.10",
        kioskId: undefined,
        timestamp: String(Date.now()),
        signature: "dummy",
        method: "GET",
        path: "/api/status",
        getSigningSecret,
      });

      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it("should reject requests outside ±5 minute clock skew with 401", () => {
      const sixMinutesAgo = String(Date.now() - 6 * 60 * 1000);
      const result = verifyLanSignatureCore({
        clientIp: "10.0.0.5",
        kioskId,
        timestamp: sixMinutesAgo,
        signature: "dummy",
        method: "POST",
        path: "/api/sync",
        getSigningSecret,
      });

      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.message).toContain("timestamp is invalid or too old");
    });

    it("should reject unknown kiosk with 401", () => {
      const timestamp = String(Date.now());
      const result = verifyLanSignatureCore({
        clientIp: "10.0.0.5",
        kioskId: "unknown-kiosk-999",
        timestamp,
        signature: "dummy",
        method: "POST",
        path: "/api/sync",
        getSigningSecret,
      });

      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.message).toContain("Kiosk not registered");
    });

    it("should reject tampered signature with 401 in constant time", () => {
      const timestamp = String(Date.now());
      const method = "POST";
      const path = "/api/sync";
      const body = { test: true };
      const bodyStr = canonicalJson(body);
      const payload = `${kioskId}:${timestamp}:${method}:${path}:${bodyStr}`;
      const signature = crypto.createHmac("sha256", signingSecret).update(payload).digest("hex");

      // Tamper last hex character
      const tampered = signature.slice(0, -1) + (signature.endsWith("0") ? "1" : "0");

      const result = verifyLanSignatureCore({
        clientIp: "192.168.1.50",
        kioskId,
        timestamp,
        signature: tampered,
        method,
        path,
        body,
        getSigningSecret,
      });

      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.message).toBe("Invalid request signature.");
    });
  });

  describe("lanSigningMiddleware (Express adapter)", () => {
    it("should call next() for valid signed requests", async () => {
      const timestamp = String(Date.now());
      const method = "POST";
      const path = "/api/kiosk/order";
      const body = { orderId: "ord-456" };
      const bodyStr = canonicalJson(body);
      const payload = `${kioskId}:${timestamp}:${method}:${path}:${bodyStr}`;
      const signature = crypto.createHmac("sha256", signingSecret).update(payload).digest("hex");

      const mockDbManager: any = {
        get: vi.fn().mockReturnValue({ signingSecret }),
      };
      const mockLogger: any = {
        warn: vi.fn(),
        error: vi.fn(),
      };

      const middleware = lanSigningMiddleware(mockDbManager, mockLogger);

      const req: any = {
        ip: "192.168.1.100",
        method,
        originalUrl: path,
        headers: {
          "x-kiosk-id": kioskId,
          "x-timestamp": timestamp,
          "x-signature": signature,
        },
        body,
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should return 401 if signature does not match", async () => {
      const mockDbManager: any = {
        get: vi.fn().mockReturnValue({ signingSecret }),
      };
      const mockLogger: any = {
        warn: vi.fn(),
        error: vi.fn(),
      };

      const middleware = lanSigningMiddleware(mockDbManager, mockLogger);

      const req: any = {
        ip: "192.168.1.100",
        method: "GET",
        originalUrl: "/api/secure",
        headers: {
          "x-kiosk-id": kioskId,
          "x-timestamp": String(Date.now()),
          "x-signature": "badf00d".repeat(9).slice(0, 64),
        },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Unauthorized" }));
    });
  });

  describe("createFastifyLanSigningHook (Fastify adapter)", () => {
    it("should allow valid signed request to pass without sending error reply", async () => {
      const timestamp = String(Date.now());
      const method = "POST";
      const path = "/api/ai/pipeline/run";
      const body = { test: 123 };
      const bodyStr = canonicalJson(body);
      const payload = `${kioskId}:${timestamp}:${method}:${path}:${bodyStr}`;
      const signature = crypto.createHmac("sha256", signingSecret).update(payload).digest("hex");

      const mockDbManager: any = {
        get: vi.fn().mockReturnValue({ signingSecret }),
      };
      const mockLogger: any = {
        warn: vi.fn(),
        error: vi.fn(),
      };

      const hook = createFastifyLanSigningHook(mockDbManager, mockLogger);

      const request: any = {
        ip: "127.0.0.1",
        method,
        url: path,
        headers: {
          "x-kiosk-id": kioskId,
          "x-timestamp": timestamp,
          "x-signature": signature,
        },
        body,
      };
      const reply: any = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await hook(request, reply);
      expect(reply.status).not.toHaveBeenCalled();
      expect(reply.send).not.toHaveBeenCalled();
    });
  });
});
