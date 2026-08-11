import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { networkRoutingService } from '../services/NetworkRoutingService';
import { logger } from "@/utils/logger";

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  logger.info(`[BackgroundSync] Executing background sync task...`);
  try {
    const { processed, failed } = await networkRoutingService.flushOfflineQueue();
    if (processed > 0) {
      logger.info(`[BackgroundSync] Processed ${processed} items.`);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    if (failed > 0) {
      logger.warn(`[BackgroundSync] Failed to process ${failed} items.`);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    logger.info(`[BackgroundSync] No new items to sync.`);
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    logger.error('[BackgroundSync] Task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSyncAsync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false, // android only
        startOnBoot: true, // android only
      });
      logger.info('[BackgroundSync] Task registered successfully.');
    }
  } catch (err) {
    logger.error('[BackgroundSync] Registration failed:', err);
  }
}

export async function unregisterBackgroundSyncAsync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    }
  } catch (err) {
    logger.error('[BackgroundSync] Unregistration failed:', err);
  }
}
