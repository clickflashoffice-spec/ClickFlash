/**
 * Process Manager for Phase 71
 * Manages the backend server process with health monitoring and auto-recovery
 */

import { ChildProcess, fork } from 'child_process';
import * as path from 'path';
import * as http from 'http';
import { EventEmitter } from 'events';
import { getLogger } from '../utils/logger';
import { MEMORY_LIMITS, HEALTH_CHECK, RECOVERY, PATHS } from '../utils/constants';
import type { BackendStatus } from '../types/electron';

const logger = getLogger('process');

interface ProcessManagerEvents {
  'started': () => void;
  'stopped': () => void;
  'restarting': () => void;
  'unresponsive': () => void;
  'crashed': (exitCode: number | null) => void;
  'error': (error: Error) => void;
}

export declare interface ProcessManager {
  on<K extends keyof ProcessManagerEvents>(event: K, listener: ProcessManagerEvents[K]): this;
  emit<K extends keyof ProcessManagerEvents>(event: K, ...args: Parameters<ProcessManagerEvents[K]>): boolean;
}

export class ProcessManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private status: BackendStatus;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;
  private isRestarting = false;
  private startTime: number = 0;
  private isExternalMode = false; // true when backend is started externally (dev mode)

  constructor() {
    super();
    this.status = {
      pid: 0,
      status: 'stopped',
      memoryMB: 0,
      cpuPercent: 0,
      uptimeSeconds: 0,
      lastHeartbeat: 0,
      port: HEALTH_CHECK.BACKEND_PORT,
      version: '1.0.0',
      health: 'unhealthy',
    };
  }

  /**
   * Start the backend server process
   * In development mode, the backend is expected to be running externally
   * In production mode, we fork and manage the backend process
   */
  async start(): Promise<void> {
    if (this.process && !this.process.killed) {
      logger.warn('Backend process already running');
      return;
    }

    if (this.isRestarting) {
      logger.warn('Backend is restarting, wait...');
      return;
    }

    logger.info('Starting backend process');
    this.isRestarting = true;

    try {
      // Check if server file exists
      const serverPath = this.getServerPath();
      
      if (!serverPath) {
        // Server not built - assume dev mode where backend is started externally
        logger.info('Backend server not found - assuming external mode (dev mode)');
        logger.info('Waiting for externally started backend on port ' + HEALTH_CHECK.BACKEND_PORT);
        this.isExternalMode = true;
        this.status.status = 'waiting_external';
        this.emit('started');
        this.isRestarting = false;
        return;
      }

      logger.info('Using server path', { path: serverPath });

      // Fork the server process with memory limits
      this.process = fork(serverPath, [], {
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          NODE_ENV: process.env.NODE_ENV || 'production',
        },
        execArgv: [
          `--max-old-space-size=${MEMORY_LIMITS.BACKEND_PROCESS}`,
          '--max-semi-space-size=512',
          '--optimize-for-size',
        ],
        silent: false,
      });

      this.startTime = Date.now();
      this.status.pid = this.process.pid || 0;
      this.status.status = 'starting';
      this.isExternalMode = false;
      
      logger.info('Backend process forked', { pid: this.process.pid });

      // Setup process event handlers
      this.setupProcessHandlers();

      // Start health monitoring
      this.startHealthMonitoring();

      this.emit('started');
    } catch (error) {
      logger.error('Failed to start backend process', error);
      this.status.status = 'crashed';
      this.emit('error', error as Error);
      throw error;
    } finally {
      this.isRestarting = false;
    }
  }

  /**
   * Stop the backend server process
   */
  async stop(): Promise<void> {
    if (this.isExternalMode) {
      logger.info('External mode - nothing to stop');
      this.status.status = 'stopped';
      this.status.health = 'unhealthy';
      return;
    }

    if (!this.process) return;

    logger.info('Stopping backend process');

    // Stop health monitoring
    this.stopHealthMonitoring();

    // Graceful shutdown
    this.process.send?.({ type: 'shutdown' });

    // Wait for graceful shutdown
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        logger.warn('Backend did not shutdown gracefully, killing...');
        this.process?.kill('SIGTERM');
        resolve();
      }, 5000);

      this.process?.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    // Force kill if still running
    if (!this.process.killed) {
      this.process.kill('SIGKILL');
    }

    this.process = null;
    this.status.status = 'stopped';
    this.status.health = 'unhealthy';
    
    logger.info('Backend process stopped');
    this.emit('stopped');
  }

  /**
   * Restart the backend server process
   */
  async restart(): Promise<void> {
    if (this.isRestarting) {
      logger.warn('Already restarting');
      return;
    }

    if (this.isExternalMode) {
      logger.warn('External mode - cannot restart, waiting for external process');
      return;
    }

    logger.info('Restarting backend process');
    this.emit('restarting');

    try {
      await this.stop();
      await new Promise(resolve => setTimeout(resolve, RECOVERY.BACKEND_RESTART_DELAY_MS));
      await this.start();
      logger.info('Backend process restarted successfully');
    } catch (error) {
      logger.error('Failed to restart backend process', error);
      throw error;
    }
  }

  /**
   * Wait for backend to be healthy
   */
  async waitForHealthy(timeoutMs: number = 60000): Promise<boolean> {
    const start = Date.now();
    const checkInterval = 500;
    
    logger.info('Waiting for backend health check...', { timeoutMs });
    
    while (Date.now() - start < timeoutMs) {
      const health = await this.healthCheck();
      if (health.healthy) {
        logger.info('Backend is healthy', { latencyMs: health.latencyMs });
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    logger.warn('Backend health check timed out', { elapsed: Date.now() - start });
    return false;
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    
    try {
      const response = await this.makeHealthRequest();
      const latencyMs = Date.now() - start;
      
      if (response.statusCode === 200) {
        this.lastHeartbeat = Date.now();
        this.status.lastHeartbeat = this.lastHeartbeat;
        this.status.health = 'healthy';
        this.status.status = 'running';
        
        return { healthy: true, latencyMs };
      }
      
      return { healthy: false, latencyMs };
    } catch (error) {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }

  /**
   * Get current process status
   */
  getStatus(): BackendStatus {
    // Update uptime
    if (this.status.status === 'running' && this.startTime > 0) {
      this.status.uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    }
    
    return { ...this.status };
  }

  /**
   * Get the server entry path - returns null if not found (dev mode)
   */
  private getServerPath(): string | null {
    const fs = require('fs');
    
    // Try multiple possible locations
    const possiblePaths = [
      // From app.asar (production packaged)
      path.join(process.resourcesPath || '', 'app.asar/dist/backend/server.js'),
      path.join(process.resourcesPath || '', 'app/dist/backend/server.js'),
      // From electron-new structure
      path.join(__dirname, '../../../dist/backend/server.js'),
      path.join(__dirname, '../../../../dist/backend/server.js'),
      // From CWD (development / unpackaged)
      path.join(process.cwd(), PATHS.BACKEND_ENTRY),
      path.join(process.cwd(), 'dist/backend/server.js'),
      // From resources directory (extraResources)
      path.join(process.resourcesPath || '', 'backend/server.js'),
    ];

    logger.debug('Searching for backend server...');
    for (const p of possiblePaths) {
      logger.debug('Checking path', { path: p, exists: fs.existsSync(p) });
      if (fs.existsSync(p)) {
        logger.info('Found backend server at', { path: p });
        return p;
      }
    }

    logger.warn('Backend server not found in any location');
    return null;
  }

  /**
   * Setup process event handlers
   */
  private setupProcessHandlers(): void {
    if (!this.process) return;

    // Handle messages from backend
    this.process.on('message', (message: any) => {
      if (message.type === 'heartbeat') {
        this.lastHeartbeat = Date.now();
        this.status.lastHeartbeat = this.lastHeartbeat;
      } else if (message.type === 'status') {
        this.status.memoryMB = message.memoryMB || 0;
        this.status.cpuPercent = message.cpuPercent || 0;
      }
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      logger.info('Backend process exited', { code, signal });
      this.status.status = 'stopped';
      
      if (!this.isRestarting && code !== 0) {
        this.emit('crashed', code);
      }
    });

    // Handle errors
    this.process.on('error', (error) => {
      logger.error('Backend process error', error);
      this.status.status = 'crashed';
      this.emit('error', error);
    });

    // Capture stdout/stderr
    this.process.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        logger.debug('[Backend stdout]', { output });
      }
    });

    this.process.stderr?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        logger.warn('[Backend stderr]', { output });
      }
    });
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.healthCheck();
      
      if (!health.healthy) {
        const timeSinceLastHeartbeat = this.lastHeartbeat > 0 ? Date.now() - this.lastHeartbeat : 0;
        
        if (this.lastHeartbeat > 0 && timeSinceLastHeartbeat > HEALTH_CHECK.UNRESPONSIVE_THRESHOLD_MS) {
          logger.error('Backend unresponsive for too long', { 
            timeSinceLastHeartbeatMs: timeSinceLastHeartbeat 
          });
          this.status.status = 'unresponsive';
          this.emit('unresponsive');
        }
      } else {
        this.status.status = 'running';
      }
    }, HEALTH_CHECK.INTERVAL_MS);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Make HTTP health request
   */
  private makeHealthRequest(): Promise<{ statusCode: number }> {
    return new Promise((resolve, reject) => {
      const req = http.get(
        `http://localhost:${HEALTH_CHECK.BACKEND_PORT}/api/health`,
        { timeout: 5000 },
        (res) => {
          res.resume();
          resolve({ statusCode: res.statusCode || 0 });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
    });
  }
}
