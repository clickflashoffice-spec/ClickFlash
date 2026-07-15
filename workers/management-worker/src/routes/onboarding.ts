import { createErrorResponse } from "../errorHandler";
import { LicenseService } from "../services/licenseService";
import { logger } from "../utils/logger";

export async function handleOnboarding(
  request: Request,
  env: any,
  url: URL,
  dbManager: any,
  corsHeaders: any
): Promise<Response | null> {
  const licenseService = new LicenseService(
    dbManager || env.DB,
    env.LICENSE_PRIVATE_KEY,
    env.LICENSE_PUBLIC_KEY
  );

  // --- POST /api/v1/license/validate ---
  if (url.pathname === "/api/v1/license/validate" && request.method === "POST") {
    try {
      const body: any = await request.json().catch(() => ({}));
      const { key, desk_id } = body;

      if (!key) {
        return createErrorResponse(400, "Bad Request", "License key is required", undefined, undefined, corsHeaders);
      }

      const result = await licenseService.validateLicenseKey(key, desk_id);

      if (!result.valid) {
        return createErrorResponse(403, "Forbidden", result.error || "Invalid license key", undefined, undefined, corsHeaders);
      }

      return Response.json(
        {
          valid: true,
          plan: result.plan,
          maxMasters: result.maxMasters,
          expiresAt: result.expiresAt,
          serverTime: Date.now()
        },
        { headers: corsHeaders }
      );
    } catch (err: any) {
      logger.error(`Error validating license: ${err.message}`);
      return createErrorResponse(500, "Internal Server Error", err.message, undefined, undefined, corsHeaders);
    }
  }

  // --- POST /api/v1/onboarding/register ---
  if (url.pathname === "/api/v1/onboarding/register" && request.method === "POST") {
    try {
      const body: any = await request.json().catch(() => ({}));
      const { desk_id, name, country = "US", plan = "free", admin_email } = body;

      if (!desk_id || !name) {
        return createErrorResponse(400, "Bad Request", "desk_id and name are required", undefined, undefined, corsHeaders);
      }

      if (!/^[a-zA-Z0-9_-]{3,64}$/.test(desk_id)) {
        return createErrorResponse(400, "Validation Error", "desk_id must be 3-64 alphanumeric/underscore characters", undefined, undefined, corsHeaders);
      }

      const validPlans = ["free", "starter", "pro", "enterprise"];
      if (!validPlans.includes(plan)) {
        return createErrorResponse(400, "Validation Error", "Invalid plan type. Must be free, starter, pro, or enterprise", undefined, undefined, corsHeaders);
      }

      // Check existing destination/studio
      const existing = await dbManager.get("SELECT id FROM destinations WHERE id = ? LIMIT 1", [desk_id]);
      if (existing) {
        return createErrorResponse(409, "Conflict", `Desk ID '${desk_id}' is already registered`, undefined, undefined, corsHeaders);
      }

      // Create destination record
      await dbManager.run(
        `INSERT INTO destinations (id, name, country, type, status, created_at)
         VALUES (?, ?, ?, 'master', 'Offline', CURRENT_TIMESTAMP)`,
        [desk_id, name, country]
      );

      // Determine max masters by plan
      const maxMasters = plan === "enterprise" ? 10 : plan === "pro" ? 5 : plan === "starter" ? 2 : 1;

      // Generate license key
      const keys = await licenseService.generateLicenseKeys({
        deskId: desk_id,
        plan: plan as any,
        maxMasters,
        expiresDays: 365
      });

      const licenseKey = keys[0].key;

      // Update destination with assigned license key
      await dbManager.run(
        "UPDATE destinations SET licenseKey = ? WHERE id = ?",
        [licenseKey, desk_id]
      );

      logger.info(`Onboarded new studio '${name}' (${desk_id}) on plan '${plan}' with key ${licenseKey}`);

      return Response.json(
        {
          success: true,
          desk_id,
          name,
          plan,
          license_key: licenseKey,
          max_masters: maxMasters,
          message: "Studio onboarded successfully"
        },
        { headers: corsHeaders, status: 201 }
      );
    } catch (err: any) {
      logger.error(`Error during studio onboarding: ${err.message}`);
      return createErrorResponse(500, "Internal Server Error", err.message, undefined, undefined, corsHeaders);
    }
  }

  // --- POST /api/v1/onboarding/webhook ---
  if (url.pathname === "/api/v1/onboarding/webhook" && request.method === "POST") {
    try {
      const body: any = await request.json().catch(() => ({}));
      const { type, data } = body;

      if (!type || !data || !data.object) {
        return createErrorResponse(400, "Bad Request", "Invalid webhook payload structure", undefined, undefined, corsHeaders);
      }

      logger.info(`Received webhook event: ${type}`);

      if (type === "checkout.session.completed" || type === "invoice.payment_succeeded" || type === "customer.subscription.updated") {
        const obj = data.object;
        const deskId = obj.client_reference_id || obj.metadata?.desk_id;
        const newPlan = obj.metadata?.plan || "pro";

        if (deskId) {
          const validPlans = ["free", "starter", "pro", "enterprise"];
          if (validPlans.includes(newPlan)) {
            const maxMasters = newPlan === "enterprise" ? 10 : newPlan === "pro" ? 5 : newPlan === "starter" ? 2 : 1;
            
            await dbManager.run(
              "UPDATE licenses SET plan = ?, max_masters = ?, updated_at = CURRENT_TIMESTAMP WHERE desk_id = ?",
              [newPlan, maxMasters, deskId]
            );

            logger.info(`Updated desk ${deskId} to plan ${newPlan} via Stripe webhook`);
          }
        }
      }

      return Response.json({ received: true, status: "processed" }, { headers: corsHeaders });
    } catch (err: any) {
      logger.error(`Error processing onboarding webhook: ${err.message}`);
      return createErrorResponse(500, "Internal Server Error", err.message, undefined, undefined, corsHeaders);
    }
  }

  return null;
}
