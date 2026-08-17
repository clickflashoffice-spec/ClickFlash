import { SyncPipeline, SyncContext, PipelineResult } from '../SyncPipeline';
import { HardwareService } from '../../SystemHardwareService';

const fetchFn = (...args: any[]) => ((globalThis as any).fetch)(...args);

export class HeartbeatPipeline implements SyncPipeline {
  name = 'heartbeat';

  async execute(context: SyncContext): Promise<PipelineResult> {
    try {
      const today = new Date().toISOString().split("T")[0];
      const ordersToday =
        context.dbManager.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM orders WHERE date = ?`,
          [today],
        )?.count || 0;

      const photosToday =
        context.dbManager.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM photos WHERE date(created_at) = ?`,
          [today],
        )?.count || 0;

      const pendingOps =
        context.dbManager.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM operation_logs WHERE status = 'pending'`,
        )?.count || 0;

      const health = await HardwareService.getHealthStatus();

      const tunnelManager = (globalThis as any).tunnelManager;

      const heartbeat = {
        desk_id: context.deskId,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
        uptime: process.uptime(),
        memory:
          context.resourceMonitor?.getStatus().memory || process.memoryUsage(),
        system: {
          hardware: health
            ? {
                cpu: health.cpuUsage,
                disk: health.diskPercent,
                memory_percent: health.memoryPercent,
              }
            : null,
          resource_monitor: context.resourceMonitor?.getStatus() || null,
        },
        metrics: {
          orders_today: ordersToday,
          photos_today: photosToday,
          pending_sync: pendingOps,
          sync_status: "syncing", // we are in the orchestrator
          tunnel_url:
            typeof tunnelManager !== "undefined"
              ? tunnelManager.getUrl()
              : null,
        },
      };

      const headers = await context.getHeaders();
      const res = await fetchFn(`${context.cloudApiUrl}/api/cloud/heartbeat`, {
        method: "POST",
        headers,
        body: JSON.stringify(heartbeat),
      });

      if (res.ok) {
        context.logger.debug(`[CloudSync] Heartbeat sent successfully`);

        const resData = (await res.json()) as {
          success: boolean;
          commands?: string[];
        };
        if (resData.commands && Array.isArray(resData.commands)) {
          for (const cmd of resData.commands) {
            context.logger.info(`[CloudSync] Received command from Hub: ${cmd}`);
            if (cmd === "START_TUNNEL" && tunnelManager) {
              tunnelManager.start().catch((err: unknown) => {
                context.logger.error(
                  `[TunnelManager] Failed to start tunnel: ${err}`,
                );
              });
            } else if (cmd === "STOP_TUNNEL" && tunnelManager) {
              tunnelManager.stop();
            }
          }
        }
        return { name: this.name, success: true };
      } else {
        const txt = await res.text();
        context.logger.warn(
          `[CloudSync] Heartbeat failed: ${res.status} - ${txt}`,
        );
        throw new Error(`Heartbeat failed: ${res.status}`);
      }
    } catch (e: any) {
      context.logger.error(`[CloudSync] Heartbeat Error: ${e.message || String(e)}`);
      throw e;
    }
  }
}
