/**
 * svixWebhookService.ts — Managed Webhooks via Svix (3.4K★, MIT)
 *
 * Replaces custom webhook dispatch with production-grade webhook management:
 * - Automatic retries with exponential backoff
 * - Payload signing (HMAC-SHA256)
 * - Delivery monitoring and customer portal
 * - Event type registration and filtering
 *
 * @see https://docs.svix.com/
 */
import { logger } from "../utils/logger";

const SVIX_URL = process.env.SVIX_API_URL || "http://localhost:8071";
const SVIX_TOKEN = process.env.SVIX_JWT_SECRET || "";

interface WebhookEndpoint {
  id: string;
  url: string;
  description?: string;
  filterTypes?: string[];
}

interface WebhookMessage {
  eventType: string;
  payload: Record<string, unknown>;
  eventId?: string;
}

class SvixWebhookService {
  private ready = false;

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SVIX_TOKEN}`,
    };
  }

  async initialize(): Promise<boolean> {
    try {
      const res = await fetch(`${SVIX_URL}/api/v1/health/`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(5000),
      });
      this.ready = res.ok;
      if (this.ready) logger.info("[Svix] Webhook service connected");
      return this.ready;
    } catch (err: any) {
      logger.warn(`[Svix] Not available: ${err.message}`);
      return false;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Create an application (one per resort/hotel).
   */
  async createApp(appId: string, name: string): Promise<string | null> {
    try {
      const res = await fetch(`${SVIX_URL}/api/v1/app/`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ uid: appId, name }),
      });
      const data = await res.json() as any;
      return data.id || null;
    } catch (err: any) {
      logger.error(`[Svix] Create app error: ${err.message}`);
      return null;
    }
  }

  /**
   * Register a webhook endpoint for an app.
   */
  async addEndpoint(
    appId: string,
    url: string,
    description?: string,
    filterTypes?: string[]
  ): Promise<WebhookEndpoint | null> {
    try {
      const res = await fetch(`${SVIX_URL}/api/v1/app/${appId}/endpoint/`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          url,
          description: description || `Webhook to ${url}`,
          filterTypes: filterTypes || [],
          version: 1,
        }),
      });
      return (await res.json()) as WebhookEndpoint;
    } catch (err: any) {
      logger.error(`[Svix] Add endpoint error: ${err.message}`);
      return null;
    }
  }

  /**
   * Send a webhook event to all registered endpoints for an app.
   * Svix handles retries, signing, and delivery automatically.
   */
  async send(appId: string, message: WebhookMessage): Promise<boolean> {
    try {
      const res = await fetch(`${SVIX_URL}/api/v1/app/${appId}/msg/`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          eventType: message.eventType,
          payload: message.payload,
          eventId: message.eventId,
        }),
      });
      return res.ok;
    } catch (err: any) {
      logger.error(`[Svix] Send webhook error: ${err.message}`);
      return false;
    }
  }

  /**
   * ClickFlash-specific webhook event types.
   */
  static readonly EVENT_TYPES = {
    // Photo lifecycle
    PHOTO_UPLOADED: "photo.uploaded",
    PHOTO_PROCESSED: "photo.processed",
    PHOTO_PUBLISHED: "photo.published",

    // Orders
    ORDER_CREATED: "order.created",
    ORDER_PAID: "order.paid",
    ORDER_FULFILLED: "order.fulfilled",
    ORDER_REFUNDED: "order.refunded",

    // Kiosks
    KIOSK_CONNECTED: "kiosk.connected",
    KIOSK_DISCONNECTED: "kiosk.disconnected",

    // Sessions
    SESSION_STARTED: "session.started",
    SESSION_ENDED: "session.ended",

    // AI events
    AI_CULLING_COMPLETE: "ai.culling_complete",
    AI_FACES_INDEXED: "ai.faces_indexed",
  } as const;
}

export const svixWebhookService = new SvixWebhookService();
export type { WebhookEndpoint, WebhookMessage };
