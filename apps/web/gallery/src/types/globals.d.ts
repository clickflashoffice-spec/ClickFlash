/**
 * Ambient type declarations for browser APIs and runtime globals used by the
 * gallery app that aren't covered by the standard lib.dom typings.
 *
 * Anything declared here should be sourced from a real spec (W3C, WICG, or a
 * vendor-prefix Mozilla doc) — not made up. New entries should be commented
 * with the spec link or the third-party library that injects them.
 *
 * NOTE: Wrapped in `declare global { ... }` because this file also augments
 * `ImportMetaEnv` (which lives in module scope), so the file as a whole is
 * a module — globals must be declared explicitly.
 */

// ────────────────────────────────────────────────────────────────────────────
// Vite env vars used in the customer-facing app.
// Expand this list as more env vars are added rather than reaching for
// `(import.meta as any).env`.
// ────────────────────────────────────────────────────────────────────────────
interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  // ──────────────────────────────────────────────────────────────────────────
  interface NetworkInformation {
    readonly effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
    readonly downlink?: number;
    readonly rtt?: number;
    readonly saveData?: boolean;
  }

  interface Navigator {
    readonly connection?: NetworkInformation;
    readonly mozConnection?: NetworkInformation;
    readonly webkitConnection?: NetworkInformation;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Non-standard memory API exposed by Chromium-based browsers.
  // https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
  // ──────────────────────────────────────────────────────────────────────────
  interface PerformanceMemoryInfo {
    readonly jsHeapSizeLimit: number;
    readonly totalJSHeapSize: number;
    readonly usedJSHeapSize: number;
  }

  interface Performance {
    readonly memory?: PerformanceMemoryInfo;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Window globals injected by external scripts at runtime.
  // `gc` is exposed only when Chromium is launched with --js-flags="--expose-gc"
  // (used by the SystemStatusSettings GC button). Sentry / gtag come from the
  // snippets that load Sentry CDN bundle and Google Analytics 4 respectively.
  // ──────────────────────────────────────────────────────────────────────────
  interface SentryGlobal {
    captureException(error: Error): void;
    withScope(
      callback: (scope: {
        setTag(key: string, value: string): void;
        setExtra(key: string, value: unknown): void;
      }) => void,
    ): void;
  }

  interface Window {
    gc?: () => void;
    Sentry?: SentryGlobal;
    gtag?: (
      command: 'event',
      eventName: string,
      params?: Record<string, unknown>,
    ) => void;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Minimal ambient types for the `qrcode` package.
// https://github.com/soldair/node-qrcode
// ────────────────────────────────────────────────────────────────────────────
declare module 'qrcode' {
  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: Record<string, unknown>,
  ): Promise<void>;
  export function toDataURL(
    text: string,
    options?: Record<string, unknown>,
  ): Promise<string>;
}

export {};
