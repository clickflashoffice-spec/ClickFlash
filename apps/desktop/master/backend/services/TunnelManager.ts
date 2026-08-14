import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";
import { Logger } from '../utils/logger';

export class TunnelManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private tunnelUrl: string | null = null;
  private isShuttingDown: boolean = false;
  private logger = new Logger("TunnelManager");
  private targetPort: number;
  private autoShutdownTimer: NodeJS.Timeout | null = null;
  private readonly AUTO_SHUTDOWN_MS = 60 * 60 * 1000; // 1 Hour

  constructor(targetPort: number = 3389) {
    super();
    this.targetPort = targetPort;
  }

  private findCloudflaredPath(): string {
    const commonPaths = [
      "cloudflared", // In PATH
      "C:\\Program Files\\Cloudflare\\cloudflared.exe",
      "C:\\cloudflared\\cloudflared.exe",
      "D:\\cloudflared\\cloudflared.exe",
      path.join(process.cwd(), "bin", "cloudflared.exe"),
      "D:\\master os\\setup\\cloudflared.exe",
    ];

    for (const p of commonPaths) {
      if (p === "cloudflared") continue; // Skip until used in spawn
      if (fs.existsSync(p)) {
        this.logger.info(`Found cloudflared at: ${p}`);
        return p;
      }
    }

    return "cloudflared"; // Default to PATH
  }

  public async start(): Promise<string | null> {
    if (this.process) {
      this.logger.warn("Tunnel is already running.");
      return this.tunnelUrl;
    }

    this.isShuttingDown = false;
    const binPath = this.findCloudflaredPath();

    // Check if cloudflared is actually available in the system
    // We attempt a simple version check to verify execution before starting the tunnel
    try {
      const { execSync } = require("child_process");
      execSync(`"${binPath}" --version`, { stdio: "ignore" });
    } catch (e) {
      this.logger.error(
        `[Tunnel] Quick tunnel disabled: cloudflared not found or not executable at ${binPath}`,
      );
      this.isShuttingDown = true; // Prevent auto-restart loop
      return null;
    }

    this.logger.info(
      `Starting cloudflared quick tunnel using ${binPath} to localhost:${this.targetPort}...`,
    );

    return new Promise((resolve) => {
      // Spawn cloudflared quick tunnel
      this.process = spawn(
        binPath,
        ["tunnel", "--url", `tcp://localhost:${this.targetPort}`],
        {
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      let urlFound = false;

      // cloudflared logs to stderr
      this.process.stderr?.on("data", (data: Buffer) => {
        const output = data.toString();

        // Match the trycloudflare.com URL pattern
        // Example: tcp://some-random-words.trycloudflare.com
        const urlMatch = output.match(
          /(tcp:\/\/[a-z0-9-]+\.trycloudflare\.com)/i,
        );

        if (urlMatch && !urlFound) {
          urlFound = true;
          this.tunnelUrl = urlMatch[1];
          this.logger.info(`Tunnel established at: ${this.tunnelUrl}`);

          // Phase 45: Start auto-shutdown timer for security
          if (this.autoShutdownTimer) clearTimeout(this.autoShutdownTimer);
          this.autoShutdownTimer = setTimeout(() => {
            this.logger.warn("Auto-shutting down tunnel after 1 hour limit.");
            this.stop();
          }, this.AUTO_SHUTDOWN_MS);

          this.emit("ready", this.tunnelUrl);
          resolve(this.tunnelUrl);
        }
      });

      this.process.on("close", (code) => {
        this.logger.info(`cloudflared process exited with code ${code}`);
        this.process = null;
        this.tunnelUrl = null;
        this.emit("close");

        // Auto-restart if not intentionally shutting down
        if (!this.isShuttingDown) {
          this.logger.warn("Tunnel crashed unexpectedly. Restarting in 5s...");
          setTimeout(() => this.start(), 5000);
        }
      });

      this.process.on("error", (err: any) => {
        this.logger.error(
          `cloudflared spawn error: ${err.message}. Ensuring auto-shutdown to prevent loop.`,
        );
        this.isShuttingDown = true; // Stop the auto-restart cycle on fatal spawn error
        resolve(null);
      });

      // Fallback timeout if URL is not parsed within 10 seconds
      setTimeout(() => {
        if (!urlFound) {
          this.logger.warn(
            "Timeout waiting for tunnel URL. Cloudflared might not be configured correctly or is offline.",
          );
          resolve(null);
        }
      }, 10000);
    });
  }

  public stop(): void {
    this.isShuttingDown = true;
    if (this.autoShutdownTimer) {
      clearTimeout(this.autoShutdownTimer);
      this.autoShutdownTimer = null;
    }

    if (this.process) {
      this.logger.info("Killing cloudflared process...");
      this.process.kill("SIGTERM");
      this.process = null;
      this.tunnelUrl = null;
    }
  }

  public getUrl(): string | null {
    return this.tunnelUrl;
  }
}

export const tunnelManager = new TunnelManager(3389); // Default to RDP port
