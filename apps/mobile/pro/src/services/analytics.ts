import { AnalyticsClient, AnalyticsTransport, AnalyticsEvent } from "@clickflash/analytics";

class MobileTransport implements AnalyticsTransport {
  async queueEvent(event: AnalyticsEvent) {
    console.log("[Mobile Analytics] Queued event:", event);
    // In production, save to local SQLite and sync when online
  }
  async sync() {
    // Sync logic
  }
}

export const analytics = new AnalyticsClient(new MobileTransport());
