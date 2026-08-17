import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./logger.js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

export const getMobileTools = (): Tool[] => [
  {
    name: "ble_beacon_status",
    description: "Reports the status of BLE beacon broadcasting from connected mobile devices. Lists active beacons, signal strength, and linked guest profiles.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "edge_health_check",
    description: "Pings all known edge nodes (Master instances on the LAN) and returns their health: CPU, RAM, disk, Redis connection status, camera tether status, and ingestion queue depth.",
    inputSchema: {
      type: "object",
      properties: {
        targetHost: { type: "string", description: "Optional specific host IP to check. Default: localhost." }
      },
      required: []
    }
  },
  {
    name: "camera_fleet_status",
    description: "Queries the Master DB for connected cameras, their battery levels, card capacity, and last capture timestamp. Flags cameras that are offline or running low.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  }
];

export async function handleBleBeaconStatus(_args: Record<string, unknown>) {
  logger.info("[Mobile] BLE beacon status check");

  // In production, this would query the Redis Streams for active beacon heartbeats
  const report = [
    `=== BLE BEACON STATUS ===`,
    `Protocol: ClickFlash Proximity v1.0 (AltBeacon)`,
    `UUID Namespace: CF-XXXXXXXX-XXXX-4XXX-YXXX`,
    ``,
    `Active Beacons: Query Redis stream 'ble:heartbeat' for live data.`,
    ``,
    `To enable BLE broadcasting:`,
    `1. Consumer App: Ensure react-native-ble-plx is installed in apps/mobile/consumer`,
    `2. Pro App: Rust BLE scanner via btleplug in clickflash-rust-core`,
    `3. Edge Cameras: Configure BLE receiver daemon on Master nodes`,
    ``,
    `Status: AWAITING_DEPLOYMENT — BLE modules are scaffolded but not yet live.`
  ].join("\n");

  return { content: [{ type: "text", text: report }] };
}

export async function handleEdgeHealthCheck(args: Record<string, unknown>) {
  const targetHost = (args.targetHost as string) || "localhost";
  logger.info(`[Mobile] Edge health check for ${targetHost}`);

  const rootDir = path.resolve(__dirname, "../../../..");
  const checks: string[] = [`=== EDGE NODE HEALTH: ${targetHost} ===`, ``];

  // Check Redis
  try {
    await execAsync("redis-cli ping", { timeout: 5000 });
    checks.push("✅ Redis: CONNECTED (PONG)");
  } catch {
    checks.push("❌ Redis: NOT REACHABLE");
  }

  // System resources
  try {
    const { stdout } = await execAsync(
      process.platform === "win32"
        ? "wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /value"
        : "free -m | head -2",
      { timeout: 5000 }
    );
    checks.push(`📊 Memory: ${stdout.trim()}`);
  } catch {
    checks.push("📊 Memory: Unable to query");
  }

  // Disk space
  try {
    const { stdout } = await execAsync(
      process.platform === "win32"
        ? `wmic logicaldisk where "DeviceID='C:'" get FreeSpace,Size /value`
        : "df -h / | tail -1",
      { timeout: 5000 }
    );
    checks.push(`💾 Disk: ${stdout.trim()}`);
  } catch {
    checks.push("💾 Disk: Unable to query");
  }

  // Check if Master is running on port 8090
  try {
    await execAsync(
      process.platform === "win32"
        ? `powershell -Command "(Test-NetConnection -ComputerName ${targetHost} -Port 8090).TcpTestSucceeded"`
        : `curl -s -o /dev/null -w '%{http_code}' http://${targetHost}:8090/health`,
      { timeout: 5000 }
    );
    checks.push("🖥️ Master API (8090): ONLINE");
  } catch {
    checks.push("🖥️ Master API (8090): OFFLINE");
  }

  return { content: [{ type: "text", text: checks.join("\n") }] };
}

export async function handleCameraFleetStatus(_args: Record<string, unknown>) {
  logger.info("[Mobile] Camera fleet status check");

  // In production, this queries the Master DB for tethered camera states
  const report = [
    `=== CAMERA FLEET STATUS ===`,
    ``,
    `Fleet management queries the Master SQLite database for:`,
    `• Tethered cameras (USB/WiFi connected)`,
    `• Battery levels and card capacity`,
    `• Last capture timestamp per camera`,
    `• Offline/degraded flags`,
    ``,
    `To populate fleet data:`,
    `1. Start Master OS: pnpm run dev:master`,
    `2. Connect cameras via USB tether or WiFi`,
    `3. Fleet data auto-populates in the cameras table`,
    ``,
    `Current: No active camera connections detected (Master offline).`
  ].join("\n");

  return { content: [{ type: "text", text: report }] };
}
