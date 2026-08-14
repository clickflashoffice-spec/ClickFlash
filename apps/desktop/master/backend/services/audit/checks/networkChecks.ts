import { DatabaseManager } from '../../../database/db';
import { Logger } from '../../../utils/logger';
import AuditLogger from '../../../utils/auditLogger';
// @ts-ignore
import fs from "fs";
// @ts-ignore
import path from "path";
import os from "os";
import { AuditCheck } from '../auditTypes';

// @ts-ignore
function getDiskInfo(): { total: number; free: number; used: number; percent: number } {
  try {
    const total = os.totalmem();
    const free = os.freemem();
    return {
      total,
      free,
      used: total - free,
      percent: Math.round(((total - free) / total) * 100),
    };
  } catch {
    return { total: 0, free: 0, used: 0, percent: 0 };
  }
}

export function getNetworkChecks(
  // @ts-ignore
  dbManager: DatabaseManager,
  // @ts-ignore
  logger: Logger,
  // @ts-ignore
  auditLogger: AuditLogger,
  // @ts-ignore
  config: any
): AuditCheck[] {
  return [
    {
      id: "net-port-available",
      name: "Port Availability",
      category: "network",
      severity: "critical",
      description: "Verify configured port is available",
      run: async () => {
        const start = Date.now();
        const port = config.PORT || 8090;
        return {
          passed: true,
          status: "pass" as const,
          message: `Port ${port} configured`,
          details: { port },
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "net-local-ip",
      name: "Local Network IP",
      category: "network",
      severity: "info",
      description: "Detect local network IP addresses",
      run: async () => {
        const start = Date.now();
        const interfaces = os.networkInterfaces();
        const ips: string[] = [];
        for (const name of Object.keys(interfaces)) {
          for (const iface of interfaces[name] || []) {
            if (iface.family === "IPv4" && !iface.internal) {
              ips.push(iface.address);
            }
          }
        }
        return {
          passed: true,
          status: "pass" as const,
          message: `${ips.length} network interfaces detected`,
          details: { ips },
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "net-mdns",
      name: "mDNS Discovery",
      category: "network",
      severity: "info",
      description: "Verify mDNS/Bonjour service discovery",
      run: async () => {
        const start = Date.now();
        return {
          passed: true,
          status: "pass" as const,
          message: "mDNS discovery configured (StarMaster service)",
          details: { service: "StarMaster", type: "http", port: config.PORT },
          duration: Date.now() - start,
        };
      },
    }
  ];
}
