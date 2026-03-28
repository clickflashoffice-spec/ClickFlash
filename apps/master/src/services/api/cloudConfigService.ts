/**
 * cloudConfigService.ts — Unified Cloud Configuration Service
 *
 * Single source of truth for all Master Station cloud settings.
 * Eliminates the dual localStorage vs SQLite config split.
 */
import { pb } from '../pb';

export interface CloudConfig {
  deskId: string;
  deskName: string;
  deskLocation: string;
  hubUrl: string;
  hubEmail: string;
  hubPassword: string;
  /** JWT token issued by the Hub after register-desk — stored in SQLite */
  deskToken?: string;
  /** Customer Gallery Configuration (Law 02/08) */
  galleryUrl?: string;
  galleryApiKey?: string;
  /** Moneytrash / retention config */
  moneytrash: {
    enabled: boolean;
    retentionDays: number;
    price: string;
  };
}

export const DEFAULT_HUB_URL = "https://management-hub.clickflash.photo";
export const DEFAULT_GALLERY_URL = "https://gallery.clickflash.photo";

const DEFAULTS: CloudConfig = {
  deskId: "",
  deskName: "",
  deskLocation: "",
  hubUrl: DEFAULT_HUB_URL,
  hubEmail: "",
  hubPassword: "",
  deskToken: "",
  galleryUrl: DEFAULT_GALLERY_URL,
  galleryApiKey: "",
  moneytrash: { enabled: true, retentionDays: 7, price: "15.00" },
};

export const cloudConfigService = {
  /** Load the full config from the Master backend (SQLite via /api/network-settings) */
  async load(): Promise<CloudConfig> {
    try {
      const res = await fetch("/api/network-settings");
      if (res.ok) {
        const data = await res.json();
        return {
          ...DEFAULTS,
          ...data,
          moneytrash: {
            ...DEFAULTS.moneytrash,
            ...(data.moneytrash || {}),
            retentionDays: Math.round(data.moneytrash?.retentionDays ?? 7),
          },
        };
      }
    } catch (e) {
      console.warn("[CloudConfig] Failed to load from backend:", e);
    }
    return { ...DEFAULTS };
  },

  /** Persist config to Master backend */
  async save(config: CloudConfig): Promise<void> {
    const sanitized = {
      ...config,
      moneytrash: {
        ...config.moneytrash,
        retentionDays: Math.round(config.moneytrash.retentionDays),
      },
    };
    const csrfToken = await pb.getCsrfToken();
    const res = await fetch("/api/network-settings", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {})
      },
      body: JSON.stringify(sanitized),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Save failed (HTTP ${res.status})`);
    }
  },

  /** Test connection to Hub and return status. */
  async testConnection(
    hubUrl: string,
    email: string,
    password: string,
  ): Promise<{
    ok: boolean;
    latencyMs?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      // Attempt to ping the Hub health endpoint
      const healthRes = await fetch(`${hubUrl}/api/health`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!healthRes.ok)
        return { ok: false, error: `Hub returned HTTP ${healthRes.status}` };

      // If health passes, attempt login to validate credentials
      if (email && password) {
        const loginRes = await fetch(`${hubUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          signal: AbortSignal.timeout(8000),
        });
        if (!loginRes.ok) {
          const body = await loginRes.json().catch(() => ({}));
          return { ok: false, error: body.error || "Invalid credentials" };
        }
      }

      return { ok: true, latencyMs: Date.now() - start };
    } catch (e: unknown) {
      const err = e as Error;
      if (err.name === "TimeoutError")
        return { ok: false, error: "Connection timed out. Check Hub URL." };
      return { ok: false, error: err.message || "Network error" };
    }
  },

  /** Check if a desk_id is available on the Hub */
  async checkDeskId(
    hubUrl: string,
    deskId: string,
  ): Promise<{ available: boolean; message: string }> {
    try {
      const res = await fetch(
        `${hubUrl}/api/auth/check-desk/${encodeURIComponent(deskId)}`,
        {
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!res.ok)
        return {
          available: false,
          message: "Could not reach Hub to validate desk ID.",
        };
      return await res.json();
    } catch {
      return {
        available: false,
        message: "Hub unreachable. Save locally and validate later.",
      };
    }
  },

  /** Register this desk with the Hub (Step 3 of Setup Wizard) */
  async registerDesk(
    hubUrl: string,
    payload: {
      deskId: string;
      deskName: string;
      deskLocation?: string;
      email: string;
      password: string;
    },
  ): Promise<{ token: string; desk: Record<string, unknown> }> {
    const res = await fetch(`${hubUrl}/api/auth/register-desk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(body.error || `Registration failed (HTTP ${res.status})`);
    return body;
  },

  /** Quick hub ping for RTT measurement */
  async ping(hubUrl: string): Promise<number | null> {
    try {
      const start = Date.now();
      await fetch(`${hubUrl}/api/health`, {
        signal: AbortSignal.timeout(4000),
      });
      return Date.now() - start;
    } catch {
      return null;
    }
  },
};
