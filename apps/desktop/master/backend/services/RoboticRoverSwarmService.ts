/**
 * Autonomous Self-Charging Robotic Rover Camera Swarm Service
 * Manages autonomous ground rovers, group selfie detection, automatic composition, and inductive wireless charging.
 */
import { Logger } from '../utils/logger';
import { RoboticRoverTelemetry } from '@clickflash/types';

export class RoboticRoverSwarmService {
  private static instance: RoboticRoverSwarmService | null = null;
  private logger: Logger;
  private rovers: Map<string, RoboticRoverTelemetry> = new Map();

  private constructor() {
    this.logger = new Logger('RoboticRoverSwarmService');
  }

  public static getInstance(): RoboticRoverSwarmService {
    if (!RoboticRoverSwarmService.instance) {
      RoboticRoverSwarmService.instance = new RoboticRoverSwarmService();
    }
    return RoboticRoverSwarmService.instance;
  }

  /**
   * Registers or updates telemetry from an autonomous ground rover
   */
  public updateTelemetry(telemetry: RoboticRoverTelemetry): void {
    this.rovers.set(telemetry.roverId, telemetry);

    if (telemetry.batteryPercent < 15 && telemetry.dockingState !== 'CHARGING') {
      this.logger.warn(`[RoverSwarm] Rover ${telemetry.roverId} low battery (${telemetry.batteryPercent}%). Routing to charging dock ${telemetry.dockId || 'dock_central_01'}`);
      telemetry.dockingState = 'CHARGING';
    }
  }

  /**
   * Dispatches a rover to capture a group portrait in a designated plaza zone
   */
  public dispatchPortraitMission(roverId: string, zone: string): { success: boolean; status: string } {
    const rover = this.rovers.get(roverId);
    if (!rover) {
      return { success: false, status: `Rover ${roverId} not found` };
    }

    rover.dockingState = 'COMPOSING_SHOT';
    rover.currentZone = zone;
    rover.capturesToday += 1;
    this.logger.info(`[RoverSwarm] Rover ${roverId} dispatched for portrait composition in ${zone}`);

    return { success: true, status: `Rover ${roverId} active in ${zone}` };
  }

  public getAllRovers(): RoboticRoverTelemetry[] {
    return Array.from(this.rovers.values());
  }
}
