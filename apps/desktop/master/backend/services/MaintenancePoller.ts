/**
 * MaintenancePoller — Phase 45: Advanced Global Fleet Controls
 *
 * Polls the Management Hub every 60s for pending maintenance commands queued by admins.
 * Executes from a strict safe allowlist — never runs arbitrary code.
 * ACKs result back to Hub after execution.
 *
 * Law 09: Master monitors for incoming commands and acts as fleet management relay.
 */

import fs from "fs";
import path from "path";
import { Logger } from '../utils/logger';
import { DatabaseManager } from '../database/db';

const ALLOWED_COMMANDS = new Set([
  "restart_backend",
  "clear_temp",
  "force_sync",
  "reindex_faces",
  "push_to_kiosk",
  "log_report",
  "suspend_kiosk",
] as const);

type AllowedCommand = typeof ALLOWED_COMMANDS extends Set<infer T> ? T : never;

interface MaintenanceCommand {
  id: string;
  command: string;
  args?: Record<string, unknown>;
}

interface MaintenancePollerOptions {
  hubUrl: string;
  hubToken: string;
  deskId: string;
  dataDir: string;
  logger: Logger;
  dbManager: DatabaseManager;
  cloudSyncService?: { sync: () => void };
  faceService?: { reindex: () => Promise<void> };
  transferService?: {
    pushAlbumToKiosk: (kioskId: string, albumId: string) => Promise<void>;
  };
  intervalMs?: number;
}

export class MaintenancePoller {
  private opts: MaintenancePollerOptions;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(opts: MaintenancePollerOptions) {
    this.opts = { intervalMs: 60_000, ...opts };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.opts.logger.info(
      "[MaintenancePoller] Started — polling interval: " +
        this.opts.intervalMs +
        "ms",
    );
    this.poll().catch(() => {});
    this.timer = setInterval(
      () => this.poll().catch(() => {}),
      this.opts.intervalMs!,
    );
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.running = false;
    this.opts.logger.info("[MaintenancePoller] Stopped");
  }

  private async poll(): Promise<void> {
    const { hubUrl, hubToken, deskId, logger } = this.opts;
    if (!hubUrl || !hubToken || !deskId) return;

    try {
      const res = await fetch(
        `${hubUrl}/api/cloud/maintenance/next?desk_id=${encodeURIComponent(deskId)}`,
        {
          headers: {
            Authorization: `Bearer ${hubToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!res.ok) return;

      const data = (await res.json()) as {
        success: boolean;
        command: MaintenanceCommand | null;
      };
      if (!data.success || !data.command) return;

      const cmd = data.command;
      logger.info(`[MaintenancePoller] Processing command: ${cmd.command}`, {
        id: cmd.id,
      });

      const result = await this.execute(cmd);
      await this.ack(cmd.id, result);
    } catch (e: any) {
      // Swallow — Hub may be unreachable during offline operation (Law 01: offline-first)
    }
  }

  private async execute(cmd: MaintenanceCommand): Promise<string> {
    const { logger, dataDir, cloudSyncService, faceService, transferService } =
      this.opts;

    if (!ALLOWED_COMMANDS.has(cmd.command as AllowedCommand)) {
      logger.warn(
        `[MaintenancePoller] Rejected unknown command: ${cmd.command}`,
      );
      return `rejected: command '${cmd.command}' not in allowlist`;
    }

    try {
      switch (cmd.command as AllowedCommand) {
        case "restart_backend":
          logger.info(
            "[MaintenancePoller] Executing restart_backend — exiting for Electron restart",
          );
          // Defer so ACK can be sent first
          setTimeout(() => process.exit(0), 1500);
          return "ok: restart initiated";

        case "clear_temp":
          const tempDir = path.join(dataDir, "import", "temp");
          if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            for (const f of files) {
              try {
                fs.unlinkSync(path.join(tempDir, f));
              } catch {}
            }
            logger.info(
              `[MaintenancePoller] Cleared ${files.length} temp files`,
            );
            return `ok: cleared ${files.length} temp files`;
          }
          return "ok: temp dir empty";

        case "force_sync":
          if (cloudSyncService) {
            cloudSyncService.sync();
            return "ok: sync triggered";
          }
          return "skipped: cloudSyncService unavailable";

        case "reindex_faces":
          if (faceService) {
            await faceService.reindex();
            return "ok: face reindex complete";
          }
          return "skipped: faceService unavailable";

        case "push_to_kiosk":
          const { kioskId, albumId } = (cmd.args || {}) as {
            kioskId?: string;
            albumId?: string;
          };
          if (!kioskId || !albumId)
            return "error: kioskId and albumId required in args";
          if (transferService) {
            await transferService.pushAlbumToKiosk(kioskId, albumId);
            return `ok: pushed album ${albumId} to kiosk ${kioskId}`;
          }
          return "skipped: transferService unavailable";

        case "log_report":
          const errorsFile = path.join(dataDir, "logs", "errors.jsonl");
          if (!fs.existsSync(errorsFile)) return "ok: no errors.jsonl";
          const lines = fs
            .readFileSync(errorsFile, "utf8")
            .split("\n")
            .filter(Boolean);
          const last50 = lines.slice(-50).join("\n");
          return `ok: last ${Math.min(50, lines.length)} error entries:\n${last50}`;

        case "suspend_kiosk":
          // Kill the C# Guardian process so remote VNC inputs aren't blocked
          const { exec } = require("child_process");
          return new Promise<string>((resolve, reject) => {
            exec("taskkill /F /IM KioskGuardian.exe", (error: any, _stdout: string, stderr: string) => {
              if (error) {
                if (error.message.includes("not found") || stderr.includes("not found")) {
                  resolve("ok: kiosk was not locked");
                } else {
                  reject(error);
                }
              } else {
                logger.info("[MaintenancePoller] Suspended KioskGuardian OS locks.");
                resolve("ok: kiosk suspended");
              }
            });
          });

        default:
          return `rejected: unhandled command`;
      }
    } catch (err: any) {
      logger.error(`[MaintenancePoller] Command ${cmd.command} failed`, {
        error: err.message,
      });
      return `error: ${err.message}`;
    }
  }

  private async ack(id: string, result: string): Promise<void> {
    const { hubUrl, hubToken, logger } = this.opts;
    try {
      await fetch(`${hubUrl}/api/cloud/maintenance/ack`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, result }),
      });
      logger.info(`[MaintenancePoller] ACKed command ${id}`);
    } catch (e: any) {
      logger.warn(`[MaintenancePoller] Failed to ACK command ${id}`, {
        error: e.message,
      });
    }
  }
}
