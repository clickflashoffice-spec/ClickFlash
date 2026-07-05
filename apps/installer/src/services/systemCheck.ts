/**
 * ClickFlash Installer — System Check Service
 * Detects OS, Node.js, disk space, ports, and hardware capabilities
 */

import os from "os";
import { exec } from "child_process";
import http from "http";

export interface SystemCheckResult {
  nodeVersion: string | null;
  nodeInstalled: boolean;
  diskSpaceGB: number;
  portsAvailable: Record<number, boolean>;
  os: string;
  arch: string;
  totalMemoryGB: number;
  cpuCount: number;
  recommended: boolean;
  warnings: string[];
}

export async function runSystemCheck(): Promise<SystemCheckResult> {
  const warnings: string[] = [];

  // Node.js check
  let nodeVersion: string | null = null;
  let nodeInstalled = false;
  try {
    const nodePath = await which("node");
    if (nodePath) {
      const version = await execPromise("node --version");
      nodeVersion = version.trim();
      const major = parseInt(nodeVersion.replace("v", "").split(".")[0], 10);
      nodeInstalled = major >= 20;
      if (!nodeInstalled) {
        warnings.push(`Node.js ${nodeVersion} found, but 20+ is required. Will bundle runtime.`);
      }
    } else {
      warnings.push("Node.js not found. Will bundle runtime with installer.");
    }
  } catch {
    warnings.push("Node.js not found. Will bundle runtime with installer.");
  }

  // Disk space
  let diskSpaceGB = 0;
  try {
    diskSpaceGB = await getFreeSpaceGB();
    if (diskSpaceGB < 2) {
      warnings.push(`Only ${diskSpaceGB} GB free. Recommended: 10+ GB for photo storage.`);
    }
  } catch {
    warnings.push("Could not determine disk space.");
  }

  // Port availability
  const portsAvailable: Record<number, boolean> = {};
  for (const port of [8090, 8091, 5353]) {
    portsAvailable[port] = await isPortAvailable(port);
    if (!portsAvailable[port]) {
      warnings.push(`Port ${port} is in use. Another ClickFlash instance may be running.`);
    }
  }

  // Memory
  const totalMemoryGB = Math.round(os.totalmem() / 1024 / 1024 / 1024);
  if (totalMemoryGB < 4) {
    warnings.push(`${totalMemoryGB} GB RAM detected. 8+ GB recommended for photo processing.`);
  }

  // CPU
  const cpuCount = os.cpus().length;
  if (cpuCount < 2) {
    warnings.push(`${cpuCount} CPU core(s). 4+ cores recommended for parallel processing.`);
  }

  const recommended =
    nodeInstalled &&
    diskSpaceGB >= 2 &&
    Object.values(portsAvailable).every(Boolean) &&
    totalMemoryGB >= 4 &&
    cpuCount >= 2;

  return {
    nodeVersion,
    nodeInstalled,
    diskSpaceGB,
    portsAvailable,
    os: process.platform,
    arch: process.arch,
    totalMemoryGB,
    cpuCount,
    recommended,
    warnings,
  };
}

function which(cmd: string): Promise<string | null> {
  return new Promise((resolve) => {
    exec(`${process.platform === "win32" ? "where" : "which"} ${cmd}`, (err, stdout) => {
      if (err || !stdout.trim()) return resolve(null);
      resolve(stdout.trim().split("\n")[0]);
    });
  });
}

function execPromise(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 10000 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}

function getFreeSpaceGB(): Promise<number> {
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      exec("wmic logicaldisk get size,freespace,caption", (err, stdout) => {
        if (err) return resolve(0);
        const lines = stdout.trim().split("\n").slice(1);
        let totalFree = 0;
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const free = parseInt(parts[1], 10);
            if (!isNaN(free)) totalFree += free;
          }
        }
        resolve(Math.round(totalFree / 1024 / 1024 / 1024));
      });
    } else {
      exec("df -k / | tail -1 | awk '{print $4}'", (err, stdout) => {
        if (err) return resolve(0);
        const kb = parseInt(stdout.trim(), 10);
        resolve(Math.round(kb / 1024 / 1024));
      });
    }
  });
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}
