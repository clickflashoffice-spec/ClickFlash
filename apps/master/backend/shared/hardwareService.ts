import si from "systeminformation";
import crypto from "crypto";

export class HardwareService {
  private static machineId: string | null = null;

  /**
   * Generates a stable hardware fingerprint for the machine.
   * Uses system UUID, baseboard serial, and system serial for high collision resistance.
   */
  static async getMachineId(): Promise<string> {
    if (this.machineId) return this.machineId;

    try {
      // Get multiple hardware vectors for redundancy and stability
      const [system, uuid, baseboard] = await Promise.all([
        si.system(),
        si.uuid(),
        si.baseboard(),
      ]);

      // Construct raw ID components - prioritize hardware-level constants over OS level
      const components = [
        system.uuid, // Hardware/BIOS UUID
        uuid.hardware, // Redundant HW check
        baseboard.serial, // Motherboard Serial (Most stable on clones)
        system.serial, // Chassis/System Serial
      ].filter(
        (v) =>
          v &&
          v !== "-" &&
          v !== "None" &&
          v.toLowerCase() !== "to be filled by o.e.m." &&
          v.trim().length > 0,
      );

      // If hardware constants are masked (common in VMs), fallback to OS-level identifiers
      if (components.length === 0) {
        components.push(uuid.os);
        components.push(process.platform);
        components.push(process.arch);
      }

      const rawId = components.join("|");

      // Hash the combined string to create a fixed-length machine fingerprint
      this.machineId = crypto.createHash("sha256").update(rawId).digest("hex");

      return this.machineId;
    } catch (e) {
      console.error(
        "[HardwareService] Error generating hardware fingerprint:",
        e,
      );
      // Emergency fallback for service continuity
      return `hw_fallback_${process.platform}_${process.arch}`;
    }
  }

  /**
   * Synchronous check if ID is already cached.
   */
  /**
   * Gathers real-time performance and health metrics.
   */
  static async getHealthStatus() {
    try {
      const [cpu, mem, disk, temp, io] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.cpuTemperature(),
        si.disksIO(),
      ]);

      return {
        cpuUsage: Math.round(cpu.currentLoad),
        cpuTemp: temp.main || 0,
        memoryPercent: Math.round((mem.active / mem.total) * 100),
        memoryUsed: Math.round(mem.active / (1024 * 1024)),
        memoryTotal: Math.round(mem.total / (1024 * 1024)),
        diskPercent: disk[0] ? Math.round(disk[0].use) : 0,
        diskUsed: disk[0] ? Math.round(disk[0].used / (1024 * 1024 * 1024)) : 0,
        diskTotal: disk[0]
          ? Math.round(disk[0].size / (1024 * 1024 * 1024))
          : 0,
        diskIO: io.tIO || 0,
        networkLatency: 0, // Placeholder or implement ping
      };
    } catch (e) {
      console.error("[HardwareService] Failed to gather health metrics:", e);
      return null;
    }
  }
}
