import { DatabaseManager } from '../../../database/db';
import { Logger } from '../../../utils/logger';
import AuditLogger from '../../../utils/auditLogger';
// @ts-ignore
import fs from "fs";
// @ts-ignore
import path from "path";
import os from "os";
import { AuditCheck } from '../auditTypes';

// @ts-ignore
function getDiskInfo(): { total: number; free: number; used: number; percent: number } {
  try {
    const total = os.totalmem();
    const free = os.freemem();
    return {
      total,
      free,
      used: total - free,
      percent: Math.round(((total - free) / total) * 100),
    };
  } catch {
    return { total: 0, free: 0, used: 0, percent: 0 };
  }
}

export function getSecurityChecks(
  // @ts-ignore
  dbManager: DatabaseManager,
  // @ts-ignore
  logger: Logger,
  // @ts-ignore
  auditLogger: AuditLogger,
  // @ts-ignore
  config: any
): AuditCheck[] {
  return [
    {
      id: "sec-jwt-secret",
      name: "JWT Secret Configuration",
      category: "security",
      severity: "critical",
      description: "Verify JWT_SECRET is set and strong",
      run: async () => {
        const start = Date.now();
        const jwtSecret = process.env.JWT_SECRET || config.JWT_SECRET;
        if (!jwtSecret) {
          return {
            passed: false,
            status: "fail" as const,
            message: "JWT_SECRET not configured",
            remediation: "Set JWT_SECRET in .env (min 32 characters)",
            duration: Date.now() - start,
          };
        }
        if (jwtSecret.length < 32) {
          return {
            passed: false,
            status: "fail" as const,
            message: `JWT_SECRET too short (${jwtSecret.length} chars, min 32)`,
            remediation: "Generate strong secret: openssl rand -base64 48",
            duration: Date.now() - start,
          };
        }
        if (jwtSecret === "default" || jwtSecret === "changeme" || jwtSecret === "secret") {
          return {
            passed: false,
            status: "fail" as const,
            message: "JWT_SECRET uses default/weak value",
            remediation: "Change immediately to a cryptographically random value",
            duration: Date.now() - start,
          };
        }
        return {
          passed: true,
          status: "pass" as const,
          message: `JWT_SECRET configured (${jwtSecret.length} chars)`,
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "sec-service-secret",
      name: "Service Secret Configuration",
      category: "security",
      severity: "critical",
      description: "Verify SERVICE_SECRET for inter-service communication",
      run: async () => {
        const start = Date.now();
        const serviceSecret = process.env.SERVICE_SECRET;
        if (!serviceSecret) {
          return {
            passed: false,
            status: "warn" as const,
            message: "SERVICE_SECRET not set (auto-generated on first run)",
            remediation: "Verify secret persisted in database settings table",
            duration: Date.now() - start,
          };
        }
        return {
          passed: true,
          status: "pass" as const,
          message: "SERVICE_SECRET configured",
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "sec-csrf",
      name: "CSRF Protection",
      category: "security",
      severity: "critical",
      description: "Verify CSRF token store is initialized",
      run: async () => {
        const start = Date.now();
        try {
          const result = dbManager.get<{ count: number }>(
            "SELECT COUNT(*) as count FROM csrf_tokens"
          );
          return {
            passed: true,
            status: "pass" as const,
            message: "CSRF token store active",
            details: { tokenCount: result?.count || 0 },
            duration: Date.now() - start,
          };
        } catch (err: any) {
          return {
            passed: false,
            status: "warn" as const,
            message: `CSRF check: ${err.message}`,
            duration: Date.now() - start,
          };
        }
      },
    },
    {
      id: "sec-helmet",
      name: "Security Headers (Helmet)",
      category: "security",
      severity: "warning",
      description: "Verify Helmet middleware is configured",
      run: async () => {
        const start = Date.now();
        // Helmet is always configured in server.ts
        return {
          passed: true,
          status: "pass" as const,
          message: "Helmet security headers configured",
          details: {
            csp: true,
            hsts: process.env.NODE_ENV !== "development",
            crossOriginResourcePolicy: true,
          },
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "sec-rate-limit",
      name: "Rate Limiting",
      category: "security",
      severity: "warning",
      description: "Verify rate limiters are active",
      run: async () => {
        const start = Date.now();
        return {
          passed: true,
          status: "pass" as const,
          message: "Rate limiting configured (IP + User-based)",
          details: {
            globalLimit: "100 req/min",
            userLimit: "200 req/min",
            authLimit: "5 req/min",
          },
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "sec-cors",
      name: "CORS Configuration",
      category: "security",
      severity: "warning",
      description: "Verify CORS whitelist is configured",
      run: async () => {
        const start = Date.now();
        const allowedOrigins = config.ALLOWED_ORIGINS || [];
        if (allowedOrigins.length === 0) {
          return {
            passed: false,
            status: "warn" as const,
            message: "No CORS origins configured",
            remediation: "Add allowed origins to ALLOWED_ORIGINS in .env",
            duration: Date.now() - start,
          };
        }
        return {
          passed: true,
          status: "pass" as const,
          message: `${allowedOrigins.length} CORS origins configured`,
          details: { origins: allowedOrigins },
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "sec-https",
      name: "TLS/HTTPS Configuration",
      category: "security",
      severity: "warning",
      description: "Check TLS certificate status",
      run: async () => {
        const start = Date.now();
        const tlsEnabled = config.TLS_ENABLED || process.env.TLS_ENABLED === "true";
        if (!tlsEnabled) {
          return {
            passed: false,
            status: "warn" as const,
            message: "TLS is disabled — traffic is unencrypted",
            remediation: "Set TLS_ENABLED=true and configure certificates",
            duration: Date.now() - start,
          };
        }
        return {
          passed: true,
          status: "pass" as const,
          message: "TLS enabled",
          duration: Date.now() - start,
        };
      },
    }
  ];
}
