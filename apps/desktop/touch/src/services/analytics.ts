import { AnalyticsClient, AnalyticsTransport, AnalyticsEvent } from "@clickflash/analytics";

class DesktopTransport implements AnalyticsTransport {
  async queueEvent(event: AnalyticsEvent) {
    console.log("[Desktop Analytics] Queued event:", event);
    // In production, sync to Master OS via IPC or Redis
  }
  async sync() {
    // Sync logic
  }
}

export const analytics = new AnalyticsClient(new DesktopTransport());
