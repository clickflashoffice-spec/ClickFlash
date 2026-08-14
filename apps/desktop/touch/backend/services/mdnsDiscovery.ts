import Bonjour from "bonjour-service";
import { Logger } from "../shared/logger";

export interface DiscoveredMaster {
  name: string;
  host: string;
  port: number;
  deskId: string;
  version: string;
  addresses: string[];
  latencyMs?: number;
}

export class TouchMdnsDiscovery {
  private bonjour: any;
  private logger: Logger;
  private service?: any;
  private browser?: any;
  private masters: DiscoveredMaster[] = []

  constructor(logger: Logger) {
    const BonjourClass = (Bonjour as any).default || Bonjour;
    this.bonjour = new BonjourClass();
    this.logger = logger;
  }

  advertise(kioskId: string, version: string): void {
    this.service = this.bonjour.publish({
      name: `ClickFlash-Touch-${kioskId}`,
      type: "clickflash-touch",
      port: 8091,
      txt: {
        kioskId,
        version,
        status: "ready",
        timestamp: Date.now().toString(),
      },
    });
    this.logger.info(`[mDNS] Advertising Touch ${kioskId} on port 8091`);
  }

  browseForMasters(callback: (masters: DiscoveredMaster[]) => void): void {
    this.browser = this.bonjour.find({ type: "clickflash" });
    this.browser.on("up", async (service: any) => {
      const txt = service.txt as Record<string, string>;
      const master: DiscoveredMaster = {
        name: service.name,
        host: service.host,
        port: service.port,
        deskId: txt.deskId || "unknown",
        version: txt.version || "unknown",
        addresses: service.addresses || [],
      };
      // Measure latency
      if (master.addresses[0]) {
        master.latencyMs = await this.pingMaster(master.addresses[0], master.port);
      }
      this.masters.push(master);
      // Sort by latency
      this.masters.sort((a, b) => (a.latencyMs || Infinity) - (b.latencyMs || Infinity));
      callback([...this.masters]);
    });
    this.browser.on("down", (service: any) => {
      this.masters = this.masters.filter((m) => m.name !== service.name);
      callback([...this.masters]);
    });
  }

  private async pingMaster(host: string, port: number): Promise<number> {
    const start = Date.now();
    try {
      const res = await fetch(`http://${host}:${port}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return Date.now() - start;
    } catch {}
    return Infinity;
  }

  stop(): void {
    this.service?.stop();
    this.browser?.stop();
    this.bonjour.destroy();
    this.logger.info("[mDNS] Discovery stopped");
  }

  getMasters(): DiscoveredMaster[] {
    return [...this.masters];
  }
}
