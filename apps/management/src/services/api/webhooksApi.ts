import { pb } from "../pb";
import { logger } from "../../utils/logger";
import { marketingAutomationService } from "../marketingAutomationService";

export interface WebhookEvent {
  id: string;
  topic: string;
  source: "stripe" | "gallery" | "master" | "kiosk" | "external";
  payload: Record<string, unknown>;
  receivedAt: Date;
  status: "success" | "failed" | "ignored";
  errorMessage?: string;
}

export interface WebhookSubscription {
  id: string;
  topic: string;
  endpointUrl: string;
  secret?: string;
  active: boolean;
  createdAt: Date;
}

// In-memory fallback ring buffer for webhook logs when offline/database tables are uninitialized
const inMemoryLogs: WebhookEvent[] = [];
const MAX_MEMORY_LOGS = 100;

export const webhooksApi = {
  /**
   * Receive and process an incoming webhook event from an external or internal source
   */
  async receiveWebhookEvent(
    rawTopic: string,
    payload: Record<string, unknown>,
    source: WebhookEvent["source"] = "external"
  ): Promise<WebhookEvent> {
    const eventId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const receivedAt = new Date();
    let status: WebhookEvent["status"] = "success";
    let errorMessage: string | undefined;

    // Normalize topic names across ecosystem systems (e.g. Stripe -> ClickFlash topic)
    let normalizedTopic = rawTopic.toLowerCase().trim();
    if (normalizedTopic === "stripe.checkout.session.completed" || normalizedTopic === "stripe.payment_succeeded" || normalizedTopic === "order.completed") {
      normalizedTopic = "order-completed";
    } else if (normalizedTopic === "gallery.created" || normalizedTopic === "album.created") {
      normalizedTopic = "gallery-created";
    } else if (normalizedTopic === "photos.archived" || normalizedTopic === "album.archived") {
      normalizedTopic = "photos-archived";
    } else if (normalizedTopic === "customer.inactive" || normalizedTopic === "no.activity") {
      normalizedTopic = "no-activity";
    }

    try {
      logger.info(`[WebhooksAPI] Received webhook event: ${normalizedTopic} (Source: ${source})`);

      // Trigger the marketing automation workflow service
      marketingAutomationService.triggerWorkflow(normalizedTopic, payload);
    } catch (error) {
      status = "failed";
      errorMessage = (error as Error).message;
      logger.error(`[WebhooksAPI] Error processing webhook ${normalizedTopic}: ${errorMessage}`);
    }

    const eventRecord: WebhookEvent = {
      id: eventId,
      topic: normalizedTopic,
      source,
      payload,
      receivedAt,
      status,
      errorMessage,
    };

    // Store in memory ring buffer
    inMemoryLogs.unshift(eventRecord);
    if (inMemoryLogs.length > MAX_MEMORY_LOGS) {
      inMemoryLogs.pop();
    }

    // Persist to PocketBase if available
    try {
      await pb.collection("webhook_logs").create({
        topic: normalizedTopic,
        source,
        payload: JSON.stringify(payload),
        status,
        error_message: errorMessage || "",
      });
    } catch {
      // Offline fallback: continue without blocking
    }

    return eventRecord;
  },

  /**
   * Get recent webhook event logs
   */
  async getWebhookLogs(limit: number = 20): Promise<WebhookEvent[]> {
    try {
      const records = await pb.collection("webhook_logs").getList(1, limit, {
        sort: "-created",
      });
      return records.items.map((item: any) => ({
        id: item.id,
        topic: item.topic,
        source: item.source as WebhookEvent["source"],
        payload: typeof item.payload === "string" ? JSON.parse(item.payload) : item.payload,
        receivedAt: new Date(item.created),
        status: item.status as WebhookEvent["status"],
        errorMessage: item.error_message,
      }));
    } catch {
      return inMemoryLogs.slice(0, limit);
    }
  },

  /**
   * Register a new webhook subscription endpoint
   */
  async registerWebhookSubscription(
    topic: string,
    endpointUrl: string,
    secret?: string
  ): Promise<WebhookSubscription> {
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sub: WebhookSubscription = {
      id: subId,
      topic,
      endpointUrl,
      secret,
      active: true,
      createdAt: new Date(),
    };

    try {
      await pb.collection("webhook_subscriptions").create({
        topic,
        endpoint_url: endpointUrl,
        secret: secret || "",
        active: true,
      });
    } catch {
      logger.warn(`[WebhooksAPI] Stored subscription in-memory only (PB uninitialized)`);
    }

    return sub;
  },

  /**
   * Test a marketing automation drip trigger with synthetic payload
   */
  async testMarketingDripTrigger(
    topic: "gallery-created" | "photos-archived" | "order-completed" | "no-activity",
    mockPayload: Record<string, unknown> = {}
  ): Promise<WebhookEvent> {
    const defaultPayloads: Record<string, Record<string, unknown>> = {
      "gallery-created": {
        galleryId: `gal_${Date.now()}`,
        customerName: "Alex Rivera",
        customerEmail: "alex.rivera@example.com",
        destinationId: "resort-alpha",
        photoCount: 24,
      },
      "photos-archived": {
        galleryId: `gal_${Date.now()}`,
        destinationId: "resort-alpha",
        photoCount: 15,
        archivedAt: new Date().toISOString(),
      },
      "order-completed": {
        orderId: `ord_${Date.now()}`,
        customerEmail: "alex.rivera@example.com",
        amountTotal: 129.99,
        items: ["Digital All-Inclusive Pack", "8x10 Print"],
        destinationId: "resort-alpha",
      },
      "no-activity": {
        customerId: `cust_${Date.now()}`,
        customerEmail: "inactive.guest@example.com",
        daysInactive: 14,
        lastGalleryId: `gal_old_${Date.now()}`,
      },
    };

    const payload = { ...defaultPayloads[topic], ...mockPayload };
    return this.receiveWebhookEvent(topic, payload, "external");
  },
};
