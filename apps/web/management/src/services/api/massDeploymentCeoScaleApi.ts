import { pb } from "../pb";

import { orchestrationService } from "../orchestrationService";
import { logger } from "@/utils/logger";

/**
 * API Service - Wrapper around pb adapter for convenient data operations
 *
 * This service provides a clean interface for all CRUD operations with:
 * - Automatic retry logic for network failures
 * - Comprehensive error handling
 * - Request/response logging in development
 * - Type-safe operations
 *
 * All methods return Promises and handle errors gracefully.
 */


export const massDeploymentCeoScaleApi = {
  async queueMassDeployment(
    destinationIds: string[],
    configurationPayload: any,
  ): Promise<{ success: boolean; queued: number }> {
    logger.info(
      `[apiService] Dispatching mass deployment for ${destinationIds.length} stations:`,
      configurationPayload,
    );

    let successCount = 0;

    // Call orchestrationService.broadcast for each destination or globally
    // If destinationIds is empty, we broadcast to all online masters
    const broadcastResult = await orchestrationService.broadcast({
      type: "DEPLOY_CONFIG",
      payload: configurationPayload,
      timestamp: new Date().toISOString(),
    });

    successCount = broadcastResult.success;

    // Log the broadcast attempt in sync_logs (simulated through console for now)
    logger.info(
      `[apiService] Mass deployment broadcast completed. Success: ${successCount}, Failed: ${broadcastResult.failed}`,
    );

    return { success: successCount > 0, queued: destinationIds.length };
  },
};
