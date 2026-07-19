import { z } from "zod";

import { createErrorResponse } from "../errorHandler.js";
import { LicenseService } from "../services/licenseService.js";
import type { Env } from "../server.js";

const licenseRequestSchema = z.object({
  resortName: z.string().trim().min(1).max(120),
  destinationId: z.string().trim().regex(/^[A-Za-z0-9_-]{3,64}$/),
  hardwareUuid: z.string().trim().regex(/^[A-Za-z0-9:._-]{3,128}$/),
  tier: z.enum(["STARTER", "PRO", "ENTERPRISE"]),
  expiresAt: z.string().trim().optional(),
});

const allowedRoles = new Set(["ADMIN", "CEO"]);

function expirationDays(expiresAt: string | undefined): number | null {
  if (!expiresAt) return 365;
  const expiration = new Date(`${expiresAt}T23:59:59.999Z`);
  if (Number.isNaN(expiration.getTime())) return null;
  const days = Math.ceil((expiration.getTime() - Date.now()) / 86_400_000);
  return days >= 1 && days <= 3_650 ? days : null;
}

export async function handleAdminLicenses(
  request: Request,
  env: Env,
  url: URL,
  corsHeaders: Record<string, string>,
  payload: { role?: string } | null,
): Promise<Response | null> {
  if (url.pathname !== "/api/admin/licenses" || request.method !== "POST") {
    return null;
  }

  if (!payload) {
    return createErrorResponse(401, "Unauthorized", "Authentication is required", undefined, undefined, corsHeaders);
  }
  if (!allowedRoles.has(String(payload.role || "").toUpperCase())) {
    return createErrorResponse(403, "Forbidden", "Administrator access is required", undefined, undefined, corsHeaders);
  }
  if (!env.LICENSE_PRIVATE_KEY) {
    return createErrorResponse(503, "Service Unavailable", "License signing is not configured", undefined, undefined, corsHeaders);
  }

  const parsed = licenseRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return createErrorResponse(400, "Bad Request", "Enter valid license details", undefined, undefined, corsHeaders);
  }

  const expiresDays = expirationDays(parsed.data.expiresAt);
  if (!expiresDays) {
    return createErrorResponse(400, "Bad Request", "Expiration must be 1-3650 days in the future", undefined, undefined, corsHeaders);
  }

  const plan = parsed.data.tier.toLowerCase() as "starter" | "pro" | "enterprise";
  const maxMasters = plan === "enterprise" ? 10 : plan === "pro" ? 5 : 2;
  const service = new LicenseService(env.DB, env.LICENSE_PRIVATE_KEY, env.LICENSE_PUBLIC_KEY);
  const [license] = await service.generateLicenseKeys({
    deskId: parsed.data.destinationId,
    plan,
    maxMasters,
    expiresDays,
    machineId: parsed.data.hardwareUuid,
  });

  return Response.json({
    success: true,
    license: {
      ...license,
      algorithm: "Ed25519",
      hardwareUuid: parsed.data.hardwareUuid,
      resortName: parsed.data.resortName,
    },
  }, { status: 201, headers: corsHeaders });
}
