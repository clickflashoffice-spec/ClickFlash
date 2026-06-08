import Bonjour from "bonjour-service";
import { Logger } from "../shared/logger";

export interface DiscoveredDevice {
  name: string;
  type: "master" | "touch";
  host: string;
  port: number;
  txt: Record<string, string>;
  addresses: string[];
}

export class MasterMdnsDiscovery {
  private bonjour: Bonjour;
  private logger: Logger;
  private service?: ReturnType<Bonjour["publish"]>
  private browser?: ReturnType<Bonjour["find"]>
  private touchDevices: DiscoveredDevice[] = []

  constructor(logger: Logger) {
    this.bonjour = new Bonjour();
    this.logger = logger;
  }

  /**
   * Advertise this Master on the LAN
   */
  advertise(deskId: string, version: string, name: string): void {
    this.service = this.bonjour.publish({
      name: `ClickFlash-Master-${deskId}`,
      type: "clickflash",
      port: 8090,
      txt: {
        deskId,
        version,
        name,
        status: "ready",
        timestamp: Date.now().toString(),
      },
    });
    this.logger.info(`[mDNS] Advertising Master ${deskId} on port 8090`);
  }

  /**
   * Browse for Touch Kiosks on the LAN
   */
  browseForTouches(callback: (devices: DiscoveredDevice[]) => void): void {
    this.browser = this.bonjour.find({ type: "clickflash-touch" });
    this.browser.on("up", (service) => {
      const device: DiscoveredDevice = {
        name: service.name,
        type: "touch",
        host: service.host,
        port: service.port,
        txt: service.txt as Record<string, string>,
        addresses: service.addresses || [],
      };
      this.touchDevices.push(device);
      this.logger.info(`[mDNS] Touch Kiosk discovered: ${device.name} at ${device.addresses[0]}:${device.port}`);
      callback(this.touchDevices);
    });
    this.browser.on("down", (service) => {
      this.touchDevices = this.touchDevices.filter((d) => d.name !== service.name);
      callback(this.touchDevices);
    });
  }

  stop(): void {
    this.service?.stop();
    this.browser?.stop();
    this.bonjour.destroy();
    this.logger.info("[mDNS] Discovery stopped");
  }

  getTouchDevices(): DiscoveredDevice[] {
    return [...this.touchDevices];
  }
}
