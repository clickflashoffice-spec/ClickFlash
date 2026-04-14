/**
 * Jest Setup for Touch App
 *
 * Configures the testing environment with necessary mocks and polyfills.
 * Aligned with Master App implementation for consistency.
 */

import "@testing-library/jest-dom";

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
      (window as any).__TEST_LOCAL_STORAGE =
        descriptor && (descriptor as any).value;
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
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
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
HTMLCanvasElement.prototype.getContext = jest.fn((contextId: string) => {
  if (contextId === "2d") {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn((x: number, y: number, w: number, h: number) => ({
        data: new Array(w * h * 4).fill(0),
      })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({ data: new Array(4).fill(0) })),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      fillStyle: "",
      strokeStyle: "",
      font: "",
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
  }
  if (contextId === "webgl" || contextId === "experimental-webgl") {
    return {
      createShader: jest.fn(),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      createProgram: jest.fn(),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      useProgram: jest.fn(),
      createBuffer: jest.fn(),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      getAttribLocation: jest.fn(() => 0),
      vertexAttribPointer: jest.fn(),
      enableVertexAttribArray: jest.fn(),
      drawArrays: jest.fn(),
      viewport: jest.fn(),
      clearColor: jest.fn(),
      clear: jest.fn(),
      getExtension: jest.fn(),
      getParameter: jest.fn(),
      createTexture: jest.fn(),
      bindTexture: jest.fn(),
      texParameteri: jest.fn(),
      texImage2D: jest.fn(),
      uniform1i: jest.fn(),
      getUniformLocation: jest.fn(() => ({})),
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
  value: jest.fn(() => "blob:mock-url"),
});

Object.defineProperty(window.URL, "revokeObjectURL", {
  writable: true,
  value: jest.fn(),
});

// Mock window.electron for Electron API
Object.defineProperty(window, "electron", {
  writable: true,
  value: {
    exitKiosk: jest.fn(),
    logger: {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
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

// Mock WebSocket
// @ts-ignore — mock doesn't implement full WebSocket interface
global.WebSocket = class WebSocket {
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
};

// Mock performance.now for consistent testing
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
} as unknown as Performance;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  return setTimeout(callback, 0) as unknown as number;
});

global.cancelAnimationFrame = jest.fn((id: number) => {
  clearTimeout(id);
});

// Mock localStorage only if the environment doesn't already provide one
if (typeof window.localStorage === "undefined" || window.localStorage == null) {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
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
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
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
          // @ts-ignore — MockImage.onerror type mismatch in tests
          this.onerror(new Event("error"));
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
  open: jest.fn(() => ({
    onsuccess: null as ((event: Event) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
    result: {
      createObjectStore: jest.fn(),
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          get: jest.fn(() => ({
            onsuccess: null,
            onerror: null,
            result: undefined,
          })),
          put: jest.fn(() => ({ onsuccess: null, onerror: null })),
          delete: jest.fn(() => ({ onsuccess: null, onerror: null })),
          getAll: jest.fn(() => ({
            onsuccess: null,
            onerror: null,
            result: [],
          })),
          clear: jest.fn(() => ({ onsuccess: null, onerror: null })),
        })),
      })),
    },
  })),
  deleteDatabase: jest.fn(),
};

Object.defineProperty(window, "indexedDB", {
  value: indexedDBMock,
});

// Suppress console errors during tests unless explicitly enabled
const originalConsoleError = console.error;
beforeAll(() => {
  if (!process.env.ENABLE_CONSOLE_ERRORS) {
    console.error = jest.fn((...args: unknown[]) => {
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
  jest.clearAllMocks();
});

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: Record<string, unknown>): R;
    }
  }
}

export {};
