/**
 * ClickFlash Layer 4 – E2E Integration Test Utilities
 *
 * Shared helpers for cross-app integration tests.
 * Provides service-availability checks, typed API wrappers,
 * and common test data factories.
 */

import { test, Page } from '@playwright/test';

// ─── Service URLs ───────────────────────────────────────────────────────────────
export const SERVICES = {
  master: process.env.MASTER_URL ?? 'http://127.0.0.1:8090',
  touch: process.env.TOUCH_URL ?? 'http://127.0.0.1:8091',
  installer: process.env.INSTALLER_URL ?? 'http://127.0.0.1:5175',
  licenseGenerator: process.env.LICENSE_GENERATOR_URL ?? 'http://127.0.0.1:5176',
} as const;

// ─── Service Health ─────────────────────────────────────────────────────────────

/**
 * Returns `true` when the given URL responds with a 2xx status.
 * Silently returns `false` on network errors.
 */
export async function isServiceOnline(url: string, timeoutMs = 5_000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Marks the calling test as *skipped* when `url` is unreachable.
 * Returns the availability flag so callers can branch.
 */
export async function skipIfOffline(
  testCtx: typeof test,
  serviceName: string,
  url: string,
): Promise<boolean> {
  const online = await isServiceOnline(url);
  if (!online) {
    testCtx.skip(`${serviceName} not running at ${url}`);
  }
  return online;
}

// ─── Wait Helpers ───────────────────────────────────────────────────────────────

/** Wait until the network is idle or `timeoutMs` elapses. Never throws. */
export async function waitForNetworkIdle(page: Page, timeoutMs = 5_000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {
    /* network may never fully idle – acceptable */
  });
}

/** Simple promise-based delay. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Test Data Factories ────────────────────────────────────────────────────────

export function uniqueTestId(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniqueTestEmail(): string {
  return `e2e-${Date.now()}@clickflash-test.local`;
}
