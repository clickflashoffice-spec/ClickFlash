import { vi } from 'vitest';
import si from 'systeminformation';
import { HardwareService } from '../SystemHardwareService';

// Mock systeminformation
vi.mock('systeminformation', () => ({
  default: {
    system: vi.fn(),
    uuid: vi.fn(),
    baseboard: vi.fn(),
    currentLoad: vi.fn(),
    mem: vi.fn(),
    fsSize: vi.fn(),
    cpuTemperature: vi.fn(),
    disksIO: vi.fn()
  }
}));

describe('HardwareService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the cached machineId
    (HardwareService as any).machineId = null;
  });

  describe('getMachineId', () => {
    it('should generate a consistent machine ID based on hardware specs', async () => {
      (si.system as any).mockResolvedValue({ uuid: 'sys-uuid-123', serial: 'sys-serial-456' });
      (si.uuid as any).mockResolvedValue({ hardware: 'hw-uuid-123', os: 'os-uuid-789' });
      (si.baseboard as any).mockResolvedValue({ serial: 'board-serial-999' });

      const machineId1 = await HardwareService.getMachineId();
      expect(machineId1).toBeDefined();
      expect(typeof machineId1).toBe('string');
      expect(machineId1.length).toBe(64); // SHA-256 hex length

      // Call it again and verify it's the exact same string (cached)
      const machineId2 = await HardwareService.getMachineId();
      expect(machineId2).toBe(machineId1);
      
      // Ensure systeminformation methods were only called once (since it's cached)
      expect(si.system).toHaveBeenCalledTimes(1);
    });

    it('should fallback to OS level identifiers when hardware identifiers are missing', async () => {
      (si.system as any).mockResolvedValue({ uuid: 'None', serial: '-' });
      (si.uuid as any).mockResolvedValue({ hardware: '', os: 'os-uuid-fallback' });
      (si.baseboard as any).mockResolvedValue({ serial: 'To be filled by O.E.M.' });

      const machineId = await HardwareService.getMachineId();
      expect(machineId).toBeDefined();
      expect(typeof machineId).toBe('string');
      expect(machineId.length).toBe(64);
    });
  });

  describe('getHealthStatus', () => {
    it('should fetch and return formatted system health metrics', async () => {
      (si.currentLoad as any).mockResolvedValue({ currentLoad: 45.6 });
      (si.mem as any).mockResolvedValue({ active: 8000000000, total: 16000000000 });
      (si.fsSize as any).mockResolvedValue([{ use: 60.5, used: 500000000000, size: 1000000000000 }]);
      (si.cpuTemperature as any).mockResolvedValue({ main: 55.2 });
      (si.disksIO as any).mockResolvedValue({ tIO: 120 });

      const health = await HardwareService.getHealthStatus();
      
      expect(health).toEqual({
        cpuUsage: 46,
        cpuTemp: 55.2,
        memoryPercent: 50,
        memoryUsed: 7629, // 8000000000 / (1024 * 1024)
        memoryTotal: 15259, // 16000000000 / (1024 * 1024)
        diskPercent: 61,
        diskUsed: 466, // 500000000000 / (1024^3)
        diskTotal: 931, // 1000000000000 / (1024^3)
        diskIO: 120,
        networkLatency: 0
      });
    });

    it('should return null when si throws an error', async () => {
      (si.currentLoad as any).mockRejectedValue(new Error('SI failed'));

      const health = await HardwareService.getHealthStatus();
      expect(health).toBeNull();
    });
  });
});
