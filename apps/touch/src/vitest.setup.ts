/**
 * Vitest Setup for Touch App
 *
 * Configures the testing environment with necessary mocks and polyfills.
 * Migrated from Jest on 2026-06-14.
 */

import { vi } from 'vitest';
import "@testing-library/jest-dom/vitest";
import { logger } from '@/utils/logger';

// Intercept attempts to redefine window storage properties so test-local
// mocks can be detected by helpers that read from `window.__TEST_LOCAL_STORAGE`.
const _origDefineProperty = Object.defineProperty;
Object.defineProperty = function (
  obj: any,
  prop: string | symbol,
  descriptor: PropertyDescriptor,
) {
  try {
    if (
      obj === window &&
      (prop === "localStorage" || prop === "sessionStorage")
    ) {
      window.__TEST_LOCAL_STORAGE =
        descriptor && (descriptor as PropertyDescriptor).value;
    }
  } catch (e) {
    // ignore
  }
  return _origDefineProperty.call(Object, obj, prop, descriptor);
} as unknown as typeof Object.defineProperty;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  callback: IntersectionObserverCallback;
  root: Element | Document | null = null;
  rootMargin: string = "0px";
  thresholds: ReadonlyArray<number> = [0];

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
};

// Mock Canvas for Chart.js and image processing tests
HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
  if (contextId === "2d") {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn((x: number, y: number, w: number, h: number) => ({
        data: new Array(w * h * 4).fill(0),
      })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Array(4).fill(0) })),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      font: "",
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
  }
  if (contextId === "webgl" || contextId === "experimental-webgl") {
    return {
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      vertexAttribPointer: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      drawArrays: vi.fn(),
      viewport: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      getExtension: vi.fn(),
      getParameter: vi.fn(),
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      uniform1i: vi.fn(),
      getUniformLocation: vi.fn(() => ({})),
      ACTIVE_TEXTURE: 0x84e0,
      TEXTURE_2D: 0x0de1,
      TEXTURE_WRAP_S: 0x2802,
      TEXTURE_WRAP_T: 0x2803,
      CLAMP_TO_EDGE: 0x812f,
      TEXTURE_MIN_FILTER: 0x2801,
      TEXTURE_MAG_FILTER: 0x2800,
      LINEAR: 0x2601,
      RGBA: 0x1908,
      UNSIGNED_BYTE: 0x1401,
      COLOR_BUFFER_BIT: 0x4000,
    } as unknown as WebGLRenderingContext;
  }
  return null;
}) as typeof HTMLCanvasElement.prototype.getContext;

// Mock window.URL.createObjectURL and revokeObjectURL
Object.defineProperty(window.URL, "createObjectURL", {
  writable: true,
  value: vi.fn(() => "blob:mock-url"),
});

Object.defineProperty(window.URL, "revokeObjectURL", {
  writable: true,
  value: vi.fn(),
});

// Mock window.electron for Electron API
Object.defineProperty(window, "electron", {
  writable: true,
  value: {
    exitKiosk: vi.fn().mockResolvedValue(false),
    isElectron: false,
  },
});

// Mock BroadcastChannel
global.BroadcastChannel = class BroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  postMessage(): void {}
  close(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }
};

// Mock WebSocket — minimal jsdom shim; only the constants and ctor are exercised.
// Cast to typeof WebSocket so global typing accepts the partial implementation.
global.WebSocket = (class WebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = WebSocket.CONNECTING;
  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string | URL, protocols?: string | string[]) {
    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  send(): void {}
  close(): void {
    this.readyState = WebSocket.CLOSED;
  }
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }
}) as unknown as typeof WebSocket;

// Mock performance.now for consistent testing
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
} as unknown as Performance;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  return setTimeout(callback, 0) as unknown as number;
});

global.cancelAnimationFrame = vi.fn((id: number) => {
  clearTimeout(id);
});

// Mock localStorage only if the environment doesn't already provide one
if (typeof window.localStorage === "undefined" || window.localStorage == null) {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

// Mock sessionStorage only if the environment doesn't already provide one
if (
  typeof window.sessionStorage === "undefined" ||
  window.sessionStorage == null
) {
  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  Object.defineProperty(window, "sessionStorage", {
    value: sessionStorageMock,
    writable: true,
    configurable: true,
  });
}

// Mock global Image to trigger load/error quickly in tests
class MockImage {
  onload: ((this: GlobalEventHandlers, ev: Event) => any) | null = null;
  onerror: ((this: GlobalEventHandlers, ev: Event) => any) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  private _src = "";

  set src(value: string) {
    this._src = value;
    // Resolve quickly: simulate an error for blob/data/http URLs to
    // ensure getImageDimensions resolves promptly in tests.
    setTimeout(() => {
      if (this.onerror) {
        try {
          // The DOM HTMLImageElement onerror handler is typed as
          // OnErrorEventHandlerNonNull (string | Event); cast our Event so
          // the call site type-checks against either signature.
          (this.onerror as (e: Event) => unknown)(new Event("error"));
        } catch (e) {
          // swallow
        }
      }
    }, 0);
  }

  get src() {
    return this._src;
  }
}

Object.defineProperty(global, "Image", {
  value: MockImage,
  writable: true,
  configurable: true,
});

// Mock IndexedDB
const indexedDBMock = {
  open: vi.fn(() => ({
    onsuccess: null as ((event: Event) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
    result: {
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
            result: undefined,
          })),
          put: vi.fn(() => ({ onsuccess: null, onerror: null })),
          delete: vi.fn(() => ({ onsuccess: null, onerror: null })),
          getAll: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
            result: [],
          })),
          clear: vi.fn(() => ({ onsuccess: null, onerror: null })),
        })),
      })),
    },
  })),
  deleteDatabase: vi.fn(),
};

Object.defineProperty(window, "indexedDB", {
  value: indexedDBMock,
});

// Suppress console errors during tests unless explicitly enabled
const originalConsoleError = console.error;
beforeAll(() => {
  if (!process.env.ENABLE_CONSOLE_ERRORS) {
    console.error = vi.fn((...args: unknown[]) => {
      // Allow specific errors that are expected in tests
      const message = args[0]?.toString() || "";
      if (
        message.includes("Warning:") ||
        (message.includes("Error:") && message.includes("test"))
      ) {
        return;
      }
      originalConsoleError.apply(console, args);
    });
  }
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Extend vitest matchers
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeInTheDocument(): T;
    toHaveClass(className: string): T;
    toHaveStyle(style: Record<string, unknown>): T;
  }
  interface AsymmetricMatchersContaining {
    toBeInTheDocument(): any;
    toHaveClass(className: string): any;
    toHaveStyle(style: Record<string, unknown>): any;
  }
}

export {};
