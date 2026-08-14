/**
 * glitchtipService.ts — Self-Hosted Error Monitoring via GlitchTip (MIT)
 *
 * Drop-in Sentry replacement. Same SDK, same protocol, different DSN URL.
 * Zero code changes needed in existing @sentry/* calls — just change the DSN.
 *
 * This module provides:
 * - Centralized GlitchTip initialization for Master OS
 * - Custom context enrichment (studio, kiosk, session data)
 * - Performance monitoring integration
 *
 * @see https://glitchtip.com/documentation
 */
import { logger } from "../utils/logger";

// Sentry SDK is already installed — GlitchTip uses the same protocol
let Sentry: any = null;

interface GlitchTipConfig {
  dsn: string;
  environment: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
}

class GlitchTipService {
  private initialized = false;

  /**
   * Initialize GlitchTip using the existing Sentry SDK.
   * Simply point the DSN to the self-hosted GlitchTip instance.
   */
  async initialize(config?: Partial<GlitchTipConfig>): Promise<boolean> {
    const dsn = config?.dsn || process.env.SENTRY_DSN || "";
    if (!dsn) {
      logger.info("[GlitchTip] No DSN configured — error monitoring disabled");
      return false;
    }

    try {
      // Dynamic import to avoid bundling issues
      // @ts-ignore
      Sentry = await import("@sentry/node");

      Sentry.init({
        dsn,
        environment: config?.environment || process.env.NODE_ENV || "development",
        release: config?.release || `clickflash-master@${process.env.npm_package_version || "0.0.0"}`,
        sampleRate: config?.sampleRate ?? 1.0,
        tracesSampleRate: config?.tracesSampleRate ?? 0.1,
        // GlitchTip supports these Sentry features
        attachStacktrace: true,
        maxBreadcrumbs: 50,
      });

      // Tag with studio context
      Sentry.setTag("app", "clickflash-master");
      Sentry.setTag("engine", "fastify");

      this.initialized = true;
      logger.info(`[GlitchTip] Initialized — DSN: ${dsn.replace(/\/\/.*@/, "//<redacted>@")}`);
      return true;
    } catch (err: any) {
      logger.warn(`[GlitchTip] Init failed: ${err.message}`);
      return false;
    }
  }

  isReady(): boolean {
    return this.initialized && Sentry !== null;
  }

  /**
   * Capture an error with optional context.
   */
  captureError(error: Error, context?: Record<string, any>): string | null {
    if (!this.isReady()) return null;

    if (context) {
      Sentry.setContext("clickflash", context);
    }

    return Sentry.captureException(error) || null;
  }

  /**
   * Capture a message with severity level.
   */
  captureMessage(
    message: string,
    level: "info" | "warning" | "error" = "info"
  ): void {
    if (!this.isReady()) return;
    Sentry.captureMessage(message, level);
  }

  /**
   * Set user context for error tracking.
   */
  setUser(user: { id: string; email?: string; role?: string }): void {
    if (!this.isReady()) return;
    Sentry.setUser(user);
  }

  /**
   * Add a breadcrumb for debugging context.
   */
  addBreadcrumb(
    category: string,
    message: string,
    data?: Record<string, any>
  ): void {
    if (!this.isReady()) return;
    Sentry.addBreadcrumb({ category, message, data, level: "info" });
  }

  /**
   * Flush pending events before shutdown.
   */
  async flush(timeout: number = 2000): Promise<void> {
    if (!this.isReady()) return;
    await Sentry.flush(timeout);
  }
}

export const glitchtipService = new GlitchTipService();
export type { GlitchTipConfig };
