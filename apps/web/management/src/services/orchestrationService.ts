/**
 * Global Orchestration Service
 * Manages discovery, registration, and load balancing of Master Portal instances
 */

import { EventEmitter } from "../utils/EventEmitter";
import { logger } from '@/utils/logger';

interface MasterInstance {
  id: string;
  name: string;
  url: string;
  ipAddress: string;
  port: number;
  destinationId: string;
  destinationName?: string;
  version: string;
  status: "online" | "offline" | "maintenance";
  lastHeartbeat: number;
  metrics?: {
    cpuUsage?: number;
    memoryUsage?: number;
    activeSessions?: number;
    totalPhotos?: number;
    queueSize?: number;
  };
  capabilities: string[];
  priority: number; // For load balancing
}

interface DiscoveryConfig {
  heartbeatInterval: number;
  pulseInterval: number; // Added for Phase 2
  timeoutThreshold: number;
  loadBalancingStrategy: "round-robin" | "least-connections" | "priority";
}

interface OrchestrationStats {
  totalMasters: number;
  onlineMasters: number;
  offlineMasters: number;
  totalPhotos: number;
  activeSessions: number;
  averageLoad: number;
}

class GlobalOrchestrationService extends EventEmitter {
  private masters: Map<string, MasterInstance> = new Map();
  private config: DiscoveryConfig;
  private heartbeatTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private pulseTimer: ReturnType<typeof setInterval> | null = null;
  private roundRobinIndex: number = 0;

  constructor(config: Partial<DiscoveryConfig> = {}) {
    super();
    this.config = {
      heartbeatInterval: 30000, // 30 seconds
      pulseInterval: 15000, // 15 seconds pulse for UI
      timeoutThreshold: 120000, // 2 minutes
      loadBalancingStrategy: "least-connections",
      ...config,
    };
  }

  /**
   * Register a new Master Portal instance
   */
  registerMaster(
    master: Omit<MasterInstance, "lastHeartbeat" | "status">,
  ): MasterInstance {
    const instance: MasterInstance = {
      ...master,
      lastHeartbeat: Date.now(),
      status: "online",
    };

    this.masters.set(master.id, instance);

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring(master.id);

    this.emit("master:registered", instance);
    logger.info(
      `[Orchestration] Master registered: ${master.name} (${master.id})`,
    );

    return instance;
  }

  /**
   * Process heartbeat from a Master instance
   */
  processHeartbeat(
    masterId: string,
    metrics: MasterInstance["metrics"],
    version?: string,
  ): boolean {
    const master = this.masters.get(masterId);
    if (!master) {
      logger.warn(
        `[Orchestration] Heartbeat from unknown master: ${masterId}`,
      );
      return false;
    }

    master.lastHeartbeat = Date.now();
    master.metrics = { ...master.metrics, ...metrics };
    if (version) master.version = version;

    if (master.status === "offline") {
      master.status = "online";
      this.emit("master:online", master);
      logger.info(`[Orchestration] Master back online: ${master.name}`);
    }

    this.emit("master:heartbeat", master);
    return true;
  }

  /**
   * Start heartbeat monitoring for a master
   */
  private startHeartbeatMonitoring(masterId: string): void {
    // Clear existing timer if any
    this.stopHeartbeatMonitoring(masterId);

    const timer = setInterval(() => {
      const master = this.masters.get(masterId);
      if (!master) return;

      const timeSinceLastHeartbeat = Date.now() - master.lastHeartbeat;

      if (timeSinceLastHeartbeat > this.config.timeoutThreshold) {
        if (master.status === "online") {
          master.status = "offline";
          this.emit("master:offline", master);
          logger.warn(
            `[Orchestration] Master offline (timeout): ${master.name}`,
          );
        }
      }
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(masterId, timer);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeatMonitoring(masterId: string): void {
    const timer = this.heartbeatTimers.get(masterId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(masterId);
    }
  }

  /**
   * Unregister a Master instance
   */
  unregisterMaster(masterId: string): boolean {
    const master = this.masters.get(masterId);
    if (!master) return false;

    this.stopHeartbeatMonitoring(masterId);
    this.masters.delete(masterId);

    this.emit("master:unregistered", master);
    logger.info(`[Orchestration] Master unregistered: ${master.name}`);

    return true;
  }

  /**
   * Get all registered masters
   */
  getAllMasters(): MasterInstance[] {
    return Array.from(this.masters.values());
  }

  /**
   * Get masters by destination
   */
  getMastersByDestination(destinationId: string): MasterInstance[] {
    return this.getAllMasters().filter(
      (m) => m.destinationId === destinationId,
    );
  }

  /**
   * Get online masters only
   */
  getOnlineMasters(): MasterInstance[] {
    return this.getAllMasters().filter((m) => m.status === "online");
  }

  /**
   * Get master by ID
   */
  getMaster(masterId: string): MasterInstance | undefined {
    return this.masters.get(masterId);
  }

  /**
   * Select best master for load balancing
   */
  selectMaster(
    destinationId?: string,
    requiredCapabilities?: string[],
  ): MasterInstance | null {
    let candidates = this.getOnlineMasters();

    // Filter by destination if specified
    if (destinationId) {
      candidates = candidates.filter((m) => m.destinationId === destinationId);
    }

    // Filter by capabilities if specified
    if (requiredCapabilities && requiredCapabilities.length > 0) {
      candidates = candidates.filter((m) =>
        requiredCapabilities.every((cap) => m.capabilities.includes(cap)),
      );
    }

    if (candidates.length === 0) return null;

    switch (this.config.loadBalancingStrategy) {
      case "round-robin":
        return this.roundRobinSelect(candidates);

      case "least-connections":
        return this.leastConnectionsSelect(candidates);

      case "priority":
        return this.prioritySelect(candidates);

      default:
        return candidates[0];
    }
  }

  /**
   * Round-robin selection
   */
  private roundRobinSelect(candidates: MasterInstance[]): MasterInstance {
    this.roundRobinIndex = (this.roundRobinIndex + 1) % candidates.length;
    return candidates[this.roundRobinIndex];
  }

  /**
   * Least connections selection
   */
  private leastConnectionsSelect(candidates: MasterInstance[]): MasterInstance {
    return candidates.reduce((best, current) =>
      (current.metrics?.activeSessions || 0) <
      (best.metrics?.activeSessions || 0)
        ? current
        : best,
    );
  }

  /**
   * Priority-based selection
   */
  private prioritySelect(candidates: MasterInstance[]): MasterInstance {
    return candidates.reduce((best, current) =>
      current.priority > best.priority ? current : best,
    );
  }

  /**
   * Get orchestration statistics
   */
  getStats(): OrchestrationStats {
    const masters = this.getAllMasters();
    const online = masters.filter((m) => m.status === "online");

    const totalPhotos = online.reduce(
      (sum, m) => sum + (m.metrics?.totalPhotos || 0),
      0,
    );
    const activeSessions = online.reduce(
      (sum, m) => sum + (m.metrics?.activeSessions || 0),
      0,
    );
    const avgLoad =
      online.length > 0
        ? online.reduce((sum, m) => sum + (m.metrics?.cpuUsage || 0), 0) /
          online.length
        : 0;

    return {
      totalMasters: masters.length,
      onlineMasters: online.length,
      offlineMasters: masters.filter((m) => m.status === "offline").length,
      totalPhotos,
      activeSessions,
      averageLoad: Math.round(avgLoad * 100) / 100,
    };
  }

  /**
   * Start the global heartbeat pulse for the UI
   */
  startGlobalPulse(): void {
    this.stopGlobalPulse();
    this.pulseTimer = setInterval(() => {
      this.triggerPulse();
    }, this.config.pulseInterval);
    logger.info("[Orchestration] Global pulse started");
  }

  /**
   * Stop the global pulse
   */
  stopGlobalPulse(): void {
    if (this.pulseTimer) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
  }

  /**
   * Manually trigger a health check pulse to all masters
   */
  async triggerPulse(): Promise<void> {
    const onlineCount = this.getOnlineMasters().length;
    if (onlineCount === 0) return;

    this.emit("pulse", { timestamp: Date.now(), onlineCount });

    // Send a lightweight health check to all online masters
    await this.broadcast({
      type: "HEALTH_CHECK",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast message to all online masters
   */
  async broadcast(
    message: Record<string, unknown>,
    destinationId?: string,
  ): Promise<{ success: number; failed: number }> {
    const masters = destinationId
      ? this.getMastersByDestination(destinationId).filter(
          (m) => m.status === "online",
        )
      : this.getOnlineMasters();

    let success = 0;
    let failed = 0;

    const promises = masters.map(async (master) => {
      try {
        const response = await fetch(`${master.url}/api/broadcast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        });

        if (response.ok) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        logger.error(
          `[Orchestration] Failed to broadcast to ${master.name}:`,
          error,
        );
        failed++;
      }
    });

    await Promise.all(promises);
    return { success, failed };
  }

  /**
   * Send command to specific master
   */
  async sendCommand(
    masterId: string,
    command: string,
    payload?: Record<string, unknown>,
  ): Promise<boolean> {
    const master = this.masters.get(masterId);
    if (!master || master.status !== "online") return false;

    try {
      const response = await fetch(`${master.url}/api/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, payload }),
      });

      return response.ok;
    } catch (error) {
      logger.error(
        `[Orchestration] Command failed for ${master.name}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Update master configuration
   */
  updateMasterConfig(
    masterId: string,
    updates: Partial<MasterInstance>,
  ): boolean {
    const master = this.masters.get(masterId);
    if (!master) return false;

    Object.assign(master, updates);
    this.emit("master:updated", master);
    return true;
  }

  /**
   * Set master maintenance mode
   */
  setMaintenanceMode(masterId: string, enabled: boolean): boolean {
    const master = this.masters.get(masterId);
    if (!master) return false;

    master.status = enabled ? "maintenance" : "online";
    this.emit(enabled ? "master:maintenance" : "master:online", master);
    return true;
  }

  /**
   * Get health summary for all masters
   */
  getHealthSummary(): Array<{
    id: string;
    name: string;
    status: string;
    health: number;
  }> {
    return this.getAllMasters().map((master) => {
      // Calculate health score (0-100)
      let health = 100;

      if (master.status !== "online") {
        health = 0;
      } else {
        // Reduce health based on resource usage
        if ((master.metrics?.cpuUsage || 0) > 80) health -= 20;
        if ((master.metrics?.memoryUsage || 0) > 80) health -= 20;
        if ((master.metrics?.queueSize || 0) > 100) health -= 10;

        // Check heartbeat freshness
        const heartbeatAge = Date.now() - master.lastHeartbeat;
        if (heartbeatAge > this.config.heartbeatInterval * 2) {
          health -= 30;
        }
      }

      return {
        id: master.id,
        name: master.name,
        status: master.status,
        health: Math.max(0, health),
      };
    });
  }

  /**
   * Cleanup offline masters that haven't responded in a long time
   */
  cleanup(maxOfflineAge: number = 86400000): number {
    // 24 hours default
    const cutoff = Date.now() - maxOfflineAge;
    let removed = 0;

    for (const [id, master] of this.masters.entries()) {
      if (master.status === "offline" && master.lastHeartbeat < cutoff) {
        this.unregisterMaster(id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    // Stop all heartbeat timers
    for (const [id] of this.heartbeatTimers) {
      this.stopHeartbeatMonitoring(id);
    }

    this.masters.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance with default config
export const orchestrationService = new GlobalOrchestrationService();
export type { MasterInstance, DiscoveryConfig, OrchestrationStats };
