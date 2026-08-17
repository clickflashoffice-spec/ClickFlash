import { describe, it, expect } from 'vitest';
import { RoboticRoverSwarmService } from '../RoboticRoverSwarmService';

describe('RoboticRoverSwarmService', () => {
  const service = RoboticRoverSwarmService.getInstance();

  it('updates rover telemetry and triggers auto-docking when battery is low', () => {
    service.updateTelemetry({
      id: 'rover-alpha',
      roverId: 'rover-alpha',
      batteryPercent: 12,
      dockingState: 'PATROLLING',
      currentZone: 'plaza_north',
      capturesToday: 42,
      lidarHealth: 'OPERATIONAL',
      dockId: 'dock_central_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const rovers = service.getAllRovers();
    const rover = rovers.find(r => r.roverId === 'rover-alpha');
    expect(rover).toBeDefined();
    expect(rover?.dockingState).toBe('CHARGING');
  });

  it('dispatches a rover for group portrait composition in a designated zone', () => {
    service.updateTelemetry({
      id: 'rover-beta',
      roverId: 'rover-beta',
      batteryPercent: 88,
      dockingState: 'PATROLLING',
      currentZone: 'fountain_square',
      capturesToday: 10,
      lidarHealth: 'OPERATIONAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const result = service.dispatchPortraitMission('rover-beta', 'adventure_lagoon');
    expect(result.success).toBe(true);
    expect(result.status).toContain('adventure_lagoon');

    const rovers = service.getAllRovers();
    const rover = rovers.find(r => r.roverId === 'rover-beta');
    expect(rover?.dockingState).toBe('COMPOSING_SHOT');
    expect(rover?.currentZone).toBe('adventure_lagoon');
    expect(rover?.capturesToday).toBe(11);
  });
});
