// apps/master/backend/services/tunnelService.ts
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

interface TunnelConfig {
  tunnelId: string;
  tunnelToken?: string;
  credentialsFile: string;
  cloudflaredPath: string;
  configFile: string;
}

interface TunnelStatus {
  running: boolean;
  pid?: number;
  uptime?: number;
  startedAt?: Date;
  error?: string;
}

class TunnelService {
  private process: ChildProcess | null = null;
  private config: TunnelConfig | null = null;
  private status: TunnelStatus = { running: false };
  private startTime: Date | null = null;
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || {
      info: (msg: string, ...args: any[]) => console.log('[Tunnel]', msg, ...args),
      error: (msg: string, ...args: any[]) => console.error('[Tunnel]', msg, ...args),
      warn: (msg: string, ...args: any[]) => console.warn('[Tunnel]', msg, ...args),
    };
  }

  async initialize(): Promise<boolean> {
    this.logger.info('Initializing tunnel service...');

    // Load tunnel config from environment
    const tunnelToken = process.env.TUNNEL_TOKEN;
    const tunnelId = process.env.TUNNEL_ID;
    const credentialsFile = process.env.TUNNEL_CREDENTIALS_FILE || './tunnels/credentials.json';
    const cloudflaredPath = process.env.CLOUDFLARED_PATH || this.findCloudflared();
    const configFile = process.env.CLOUDFLARED_CONFIG || './cloudflared.yml';

    if (!tunnelId) {
      this.logger.warn('Tunnel not configured (TUNNEL_ID not set)');
      return false;
    }

    if (!fs.existsSync(credentialsFile)) {
      this.logger.warn('Tunnel credentials file not found:', credentialsFile);
      return false;
    }

    if (!fs.existsSync(cloudflaredPath)) {
      this.logger.warn('cloudflared binary not found:', cloudflaredPath);
      return false;
    }

    this.config = {
      tunnelId,
      tunnelToken,
      credentialsFile,
      cloudflaredPath,
      configFile,
    };

    this.logger.info('Tunnel configuration loaded', {
      tunnelId: this.config.tunnelId,
      credentialsFile: this.config.credentialsFile,
      cloudflaredPath: this.config.cloudflaredPath,
    });

    return true;
  }

  private findCloudflared(): string {
    const possiblePaths = [
      path.join(process.cwd(), 'cloudflared'),
      path.join(process.cwd(), 'cloudflared.exe'),
      path.join(__dirname, '..', '..', 'cloudflared'),
      path.join(__dirname, '..', '..', 'cloudflared.exe'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Fallback to PATH
    return process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  }

  async start(): Promise<boolean> {
    if (!this.config) {
      const initialized = await this.initialize();
      if (!initialized) {
        this.logger.warn('Cannot start tunnel - initialization failed');
        return false;
      }
    }

    if (this.status.running) {
      this.logger.info('Tunnel already running');
      return true;
    }

    this.logger.info('Starting cloudflared tunnel...');

    const args: string[] = [];

    if (this.config!.tunnelToken) {
      // Use token-based authentication (recommended)
      args.push('tunnel', 'run', '--token', this.config!.tunnelToken!);
    } else {
      // Use credentials file
      args.push('tunnel', 'run', '--credentials', this.config!.credentialsFile!);
    }

    // Add config file if exists
    if (fs.existsSync(this.config!.configFile)) {
      args.push('--config', this.config!.configFile);
    }

    this.logger.info('Starting cloudflared with args:', args);

    return new Promise((resolve) => {
      try {
        this.process = spawn(this.config!.cloudflaredPath, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
          cwd: process.cwd(),
        });

        this.process.stdout?.on('data', (data: Buffer) => {
          const line = data.toString().trim();
          this.logger.info('[cloudflared]', line);
        });

        this.process.stderr?.on('data', (data: Buffer) => {
          const line = data.toString().trim();
          // cloudflared outputs some info on stderr that isn't actually errors
          if (line.includes('融合') || line.includes('Ready to connect') || line.includes('Connection established')) {
            this.logger.info('[cloudflared]', line);
          } else if (line.includes('error') || line.includes('Error') || line.includes('failed')) {
            this.logger.error('[cloudflared]', line);
          }
        });

        this.process.on('error', (err) => {
          this.logger.error('Tunnel process error:', err.message);
          this.status = { running: false, error: err.message };
          this.scheduleRestart();
        });

        this.process.on('exit', (code, signal) => {
          this.logger.warn(`Tunnel exited with code ${code}, signal ${signal}`);
          this.status = { running: false };
          if (code !== 0) {
            this.scheduleRestart();
          }
        });

        // Give it a moment to start
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.status = {
              running: true,
              pid: this.process.pid,
              startedAt: new Date(),
            };
            this.startTime = new Date();
            this.logger.info('Tunnel started successfully, PID:', this.process.pid);
            resolve(true);
          } else {
            this.logger.error('Tunnel failed to start');
            resolve(false);
          }
        }, 3000);

      } catch (err: any) {
        this.logger.error('Failed to start tunnel:', err.message);
        this.status = { running: false, error: err.message };
        this.scheduleRestart();
        resolve(false);
      }
    });
  }

  private scheduleRestart(delayMs: number = 5000): void {
    if (this.status.running) return;

    this.logger.info(`Scheduling tunnel restart in ${delayMs / 1000}s...`);
    setTimeout(() => {
      if (!this.status.running) {
        this.logger.info('Attempting tunnel restart...');
        this.start();
      }
    }, delayMs);
  }

  async stop(): Promise<void> {
    if (!this.process) {
      this.logger.info('No tunnel process to stop');
      return;
    }

    this.logger.info('Stopping tunnel...');

    try {
      this.process.kill('SIGTERM');
      
      // Force kill after 5s
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    } catch (err: any) {
      this.logger.error('Error stopping tunnel:', err.message);
    }

    this.status = { running: false };
    this.process = null;
  }

  getStatus(): TunnelStatus {
    return {
      ...this.status,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : undefined,
    };
  }

  isRunning(): boolean {
    return this.status.running;
  }
}

// Singleton instance
export const tunnelService = new TunnelService();

export default TunnelService;
