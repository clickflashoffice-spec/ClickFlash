/**
 * Live WebRTC Edge Fleet Telemetry & Remote FOTA Controller
 * Tracks real-time edge node hardware metrics (CPU temps, shutter count, battery) and orchestrates
 * zero-downtime hot-swappable Firmware Over-The-Air updates.
 */
import { Logger } from '../utils/logger';
import { FotaTelemetryHeartbeat } from '@clickflash/types';

export class EdgeFleetFotaController {
  private static instance: EdgeFleetFotaController | null = null;
  private logger: Logger;
  private nodes: Map<string, FotaTelemetryHeartbeat> = new Map();

  private constructor() {
    this.logger = new Logger('EdgeFleetFotaController');
  }

  public static getInstance(): EdgeFleetFotaController {
    if (!EdgeFleetFotaController.instance) {
      EdgeFleetFotaController.instance = new EdgeFleetFotaController();
    }
    return EdgeFleetFotaController.instance;
  }

  /**
   * Records a live heartbeat from a field hardware node
   */
  public recordHeartbeat(heartbeat: FotaTelemetryHeartbeat): void {
    this.nodes.set(heartbeat.nodeId, {
      ...heartbeat,
      lastPingTimestamp: Date.now()
    });

    if (heartbeat.cpuTempCelsius > 80) {
      this.logger.warn(`[FleetTelemetry] Node ${heartbeat.nodeId} temperature alert: ${heartbeat.cpuTempCelsius}°C`);
    }
  }

  /**
   * Dispatches a zero-downtime FOTA firmware upgrade to target node
   */
  public dispatchFotaUpdate(nodeId: string, targetVersion: string): { success: boolean; status: string } {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return { success: false, status: 'Node not found in active fleet registry' };
    }

    node.pendingUpdateVersion = targetVersion;
    this.logger.info(`[FOTA] Dispatched firmware upgrade ${targetVersion} to Node ${nodeId}`);
    return { success: true, status: `FOTA upgrade ${targetVersion} scheduled for Node ${nodeId}` };
  }

  public getAllNodes(): FotaTelemetryHeartbeat[] {
    return Array.from(this.nodes.values());
  }
}
