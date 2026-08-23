import { AnalyticsClient, AnalyticsTransport, AnalyticsEvent } from "@clickflash/analytics";

class PwaTransport implements AnalyticsTransport {
  async queueEvent(event: AnalyticsEvent) {
    console.log("[Analytics] Tracked event:", event);
    // In a real app, this would use IndexedDB or fetch() to send to Cloudflare D1
  }
  async sync() {
    // Sync logic
  }
}

export const analytics = new AnalyticsClient(new PwaTransport());
