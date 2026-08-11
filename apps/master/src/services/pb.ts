/**
 * pb.ts — Custom HTTP Adapter (NOT PocketBase)
 *
 * Despite the name, this file has no PocketBase dependency.
 * It is a custom fetch-based HTTP adapter that mimics the PocketBase client API
 * surface so that existing service code using `pb.collection(...)` can remain
 * unchanged while targeting the local Express backend.
 *
 * The `authStore` object is a mock shim — authentication state is managed via
 * httpOnly session cookies and Bearer tokens on the server, not here.
 */
import { CollectionOptions, PocketRecord, AuthResponse } from "./pbTypes";
import { logger } from "../utils/logger";
import { DEFAULT_MASTER_PORT, DEFAULT_TOUCH_PORT } from "../constants";
import { safeStorage } from "../utils/safeStorage";
import { useConnectionStore } from "../store/connectionStore";

/** Custom API error with additional metadata */
interface ApiError extends Error {
  status?: number;
  code?: string;
  response?: { status: number; data: Record<string, unknown> };
  isNetworkError?: boolean;
  originalError?: Error;
}

/** Auth model representing a logged-in user */
type AuthModel = { id: string; email: string; [key: string]: unknown };

// Master handles cloud sync for specific collections (Orders, Money Trash, etc.)
// Touch is strictly offline.

// 1. Load Connection Settings
// Moved to utils/appMode.ts to prevent circular dependencies
const savedCloudSettings = safeStorage.getItem("masterCloudSettings");
const cloudConfig = savedCloudSettings
  ? JSON.parse(savedCloudSettings)
  : { url: "", key: "" };

import { DEFAULT_API_URL } from "../config";
import { networkManager } from "./networkManager";
import { isCloudMode } from "../utils/appMode";

export { isCloudMode };

const getBaseUrl = () => {
  // Cloud Management Hub (Cloudflare Worker)
  if (isCloudMode && cloudConfig.url) return cloudConfig.url;

  // Fallback to local API
  return DEFAULT_API_URL;
};

class CustomPocketBaseAdapter {
  baseUrl: string;
  authStore: {
    isValid: boolean;
    isAdmin: boolean;
    model: AuthModel;
    token: string;
    onChange: (
      callback?: (token: string, model: AuthModel | null) => void,
    ) => () => void;
    clear: () => void;
  };
  private _authToken: string = "";
  private _csrfToken: string | null = null;
  private _sharedEventSource: EventSource | null = null;
  private _sseListeners: Set<(payload: any) => void> = new Set();
  private _sseRetryCount: number = 0;
  private _sseIsClosed: boolean = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Tokens are now stored in httpOnly cookies, not localStorage
    // No need to load from localStorage
    // this._authToken = null;

    // Mock AuthStore to satisfy TS/UI checks
    // Token is now in httpOnly cookie, so we can't read it from JS
    // But we can check authentication status via API
    const self = this;
    this.authStore = {
      isValid: true,
      isAdmin: true,
      model: { id: "admin", email: "admin@local" },
      get token() {
        return self._authToken;
      },
      onChange:
        (_callback?: (token: string, model: AuthModel | null) => void) =>
        () => {}, // No-op unsubscribe
      clear: () => {
        self._authToken = "";
        self._csrfToken = null;
        safeStorage.removeItem("authToken");
        safeStorage.removeItem("masterPortalUser");
      },
    };
  }

  async logout(): Promise<void> {
    try {
      const csrfToken = await this.getCsrfToken();
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        credentials: "include",
      });
    } catch (e) {
      logger.warn("Failed to clear session on logout", e);
    } finally {
      this.authStore.clear();
    }
  }

  setAuthToken(token: string | null): void {
    this._authToken = token || "";
  }

  setCsrfToken(token: string | null): void {
    this._csrfToken = token;
  }

  async getCsrfToken(): Promise<string | null> {
    // Prefer explicit token from body-based retrieval (bypasses cross-origin cookie issues)
    if (this._csrfToken) return this._csrfToken;

    // Fallback: Read the XSRF-TOKEN cookie set by the server
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  private getAuthHeaders(): HeadersInit {
    // Prefer Bearer token if available (for API compatibility)
    // Otherwise fall back to cookies (browser default)
    const headers: HeadersInit = {};
    if (this.authStore.token) {
      headers["Authorization"] = `Bearer ${this.authStore.token}`;
    }
    return headers;
  }

  async request(
    path: string,
    options: RequestInit & { timeoutMs?: number } = {},
    retryCount = 0,
  ): Promise<Response> {
    const { timeoutMs, ...fetchOptions } = options as RequestInit & { timeoutMs?: number };
    const url = `${this.baseUrl}${path}`;
    // Mutations (POST/PATCH/DELETE) use a fixed 60s floor so bulk imports don't abort
    // under SQLite write pressure. GET requests use the adaptive timeout.
    const isMutation = !!fetchOptions.method && fetchOptions.method !== "GET";
    const timeout = timeoutMs ?? (isMutation ? 60000 : networkManager.getAdaptiveTimeout(15000));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const authHeaders = this.getAuthHeaders();
      const additionalHeaders: Record<string, string> = {};

      // Add CSRF for mutations if needed (though the mock says not needed, keeping for robustness)
      if (fetchOptions.method && fetchOptions.method !== "GET") {
        const csrfToken = await this.getCsrfToken();
        if (csrfToken) {
          additionalHeaders["X-CSRF-Token"] = csrfToken;
        }
      }

      // [IPC BRIDGE INTERCEPTION]
      // Route through Electron IPC if available, avoiding local network stack
      if (typeof window !== "undefined" && (window as any).electron?.api?.invoke) {
        let ipcBody = fetchOptions.body;
        let isFormData = false;
        
        if (ipcBody instanceof FormData) {
           isFormData = true;
           const formDataObj: any = {};
           for (const [key, value] of (ipcBody as any).entries()) {
              if (value instanceof File && (value as any).path) {
                 formDataObj[key] = { type: 'file', path: (value as any).path, name: value.name, mime: value.type };
              } else if (value instanceof Blob) {
                 const arrayBuffer = await value.arrayBuffer();
                 formDataObj[key] = { type: 'blob', buffer: new Uint8Array(arrayBuffer), name: (value as any).name || 'blob.jpg', mime: value.type };
              } else {
                 formDataObj[key] = value;
              }
           }
           ipcBody = formDataObj;
        }

        const ipcOptions = {
           method: fetchOptions.method || "GET",
           headers: {
             ...authHeaders,
             ...additionalHeaders,
             ...fetchOptions.headers,
           },
           body: ipcBody,
           isFormData
        };
        
        const ipcResult = await (window as any).electron.api.invoke(path, ipcOptions);
        
        clearTimeout(timeoutId);

        if (ipcResult.status === 401) {
           this.logout().catch(e => logger.warn('Logout failed on 401', e));
        }

        // Return a mock Response object matching standard fetch API
        return new Response(typeof ipcResult.data === 'string' ? ipcResult.data : JSON.stringify(ipcResult.data), {
           status: ipcResult.status,
           statusText: ipcResult.statusText || (ipcResult.ok ? 'OK' : 'Error')
        });
      }

      // Fallback: Standard fetch
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...authHeaders,
          ...additionalHeaders,
          ...fetchOptions.headers,
        },
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized globally
      if (response.status === 401) {
        this.logout().catch(e => logger.warn('Logout failed on 401', e));
        // Continue to return the response so the caller can throw its own ApiError
      }

      // Handle server-side errors that might be transient in cloud mode
      if (!response.ok && isCloudMode && retryCount < 2) {
        if (response.status >= 500 || response.status === 429) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.request(path, { ...fetchOptions, timeoutMs } as RequestInit & { timeoutMs?: number }, retryCount + 1);
        }
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Retry network errors and timeouts in all modes (not just cloud).
      // AbortError = our own timeout fired; TypeError = network-level failure.
      // Both are transient and safe to retry up to 2 times.
      if (retryCount < 2) {
        const isRetryable =
          error instanceof TypeError ||
          (error instanceof Error && error.name === "AbortError");
        if (isRetryable) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.request(path, { ...fetchOptions, timeoutMs } as RequestInit & { timeoutMs?: number }, retryCount + 1);
        }
      }
      throw error;
    }
  }

  // Helper to support dynamic URL switching
  set baseUrlValue(url: string) {
    this.baseUrl = url;
  }

  get baseUrlValue() {
    return this.baseUrl;
  }

  autoCancellation(_enable: boolean) {
    return this;
  }

  // Mocking the 'collection' interface
  collection(name: string) {
    return {
      getFullList: async (options?: CollectionOptions) => {
        try {
          let query = "";
          const params = [];
          if (options) {
            if (options.sort)
              params.push(`sort=${encodeURIComponent(options.sort)}`);
            if (options.filter)
              params.push(`filter=${encodeURIComponent(options.filter)}`);
            if (options.expand)
              params.push(`expand=${encodeURIComponent(options.expand)}`);
            if (options.page) params.push(`page=${options.page}`);
            if (options.perPage) params.push(`perPage=${options.perPage}`);
          }
          if (params.length > 0) query = `?${params.join("&")}`;

          const res = await this.request(
            `/api/collections/${name}/records${query}`,
          );
          if (!res.ok) {
            logger.warn(
              `[CustomAdapter] Collection ${name} fetch failed: ${res.status} ${res.statusText}`,
              { url: res.url },
            );
            if (res.status === 401) {
              const error: ApiError = new Error("Authentication required");
              error.status = 401;
              error.code = "AUTHENTICATION_ERROR";
              throw error;
            }
            throw new Error(res.statusText);
          }
          const data = await res.json();
          if (data == null || typeof data !== "object") {
            return [];
          }
          return Array.isArray(data.items) ? data.items : [];
        } catch (e) {
          if (e instanceof Error && (e as ApiError).status === 401) {
            throw e;
          }
          const isNetworkError =
            e instanceof TypeError &&
            (e.message.includes("Failed to fetch") ||
              e.message.includes("NetworkError") ||
              e.message.includes("ERR_CONNECTION_REFUSED"));

          if (!isNetworkError) {
            logger.warn(`[CustomAdapter] Failed to fetch list for ${name}`, e);
          }
          return [];
        }
      },
      getList: async (
        page: number,
        perPage: number,
        options?: CollectionOptions,
      ) => {
        const query = `?page=${page}&perPage=${perPage}${options?.sort ? `&sort=${encodeURIComponent(options.sort)}` : ""}${options?.filter ? `&filter=${encodeURIComponent(options.filter)}` : ""}${options?.expand ? `&expand=${encodeURIComponent(options.expand)}` : ""}`;

        const res = await this.request(
          `/api/collections/${name}/records${query}`,
        );

        if (!res.ok) {
          if (res.status === 401) {
            const error: ApiError = new Error("Authentication required");
            error.status = 401;
            error.code = "AUTHENTICATION_ERROR";
            throw error;
          }
          throw new Error(res.statusText);
        }
        const data = await res.json();
        return {
          items: data.items || [],
          totalItems: data.totalItems || data.items?.length || 0,
          page: data.page || page,
          perPage: data.perPage || perPage,
          totalPages:
            data.totalPages ||
            Math.ceil((data.totalItems || data.items?.length || 0) / perPage),
        };
      },
      getOne: async (id: string, options?: CollectionOptions) => {
        const filter = `id="${id}"`;
        let query = `?filter=${encodeURIComponent(filter)}`;
        if (options && options.expand) {
          query += `&expand=${encodeURIComponent(options.expand)}`;
        }

        try {
          const res = await this.request(
            `/api/collections/${name}/records${query}`,
          );
          if (!res.ok) {
            if (res.status === 401) {
              const error = new Error("Authentication required");
              (error as any).status = 401;
              (error as any).code = "AUTHENTICATION_ERROR";
              throw error;
            }
            return null;
          }

          let data: PocketRecord | null = null;
          try {
            const responseText = await res.text();
            if (responseText) {
              data = JSON.parse(responseText);
            }
          } catch (parseError) {
            logger.warn(
              `[CustomAdapter] Failed to parse JSON response for ${name}.getOne`,
              parseError,
            );
            return null;
          }

          if (!data || typeof data !== "object") {
            return null;
          }

          if (
            data.items &&
            Array.isArray(data.items) &&
            data.items.length > 0
          ) {
            return data.items[0];
          }

          return null;
        } catch (error) {
          if (error instanceof Error && (error as any).status === 401) {
            throw error;
          }
          const isNetworkError =
            error instanceof TypeError &&
            (error.message.includes("Failed to fetch") ||
              error.message.includes("NetworkError") ||
              error.message.includes("ERR_CONNECTION_REFUSED"));

          if (!isNetworkError) {
            logger.warn(`[CustomAdapter] Error in getOne for ${name}`, error);
          }
          return null;
        }
      },
      create: async (data: Partial<PocketRecord> | FormData) => {
        let body;
        let headers: { [key: string]: string } = {};

        if (data instanceof FormData) {
          body = data;
        } else {
          let hasFile = false;
          if (data && typeof data === "object" && !Array.isArray(data)) {
            try {
              hasFile = Object.values(data).some(
                (val) => val instanceof File || val instanceof Blob,
              );
            } catch (error) {
              logger.warn(
                "[CustomAdapter] Error checking for files in create",
                error,
              );
              hasFile = false;
            }
          }

          if (hasFile) {
            body = new FormData();
            for (const key in data) {
              body.append(
                key,
                (data as Record<string, unknown>)[key] as string | Blob,
              );
            }
          } else {
            body = JSON.stringify(data);
            headers = { "Content-Type": "application/json" };
          }
        }

        try {
          // P0 Fix: Use 60s timeout for mutations to handle SQLite write pressure during bulk imports
          const res = await this.request(
            `/api/collections/${name}/records`,
            {
              method: "POST",
              headers,
              body,
              timeoutMs: 60000, // timeoutMs override
            },
            0,
          );
          if (!res.ok) {
            let errorMessage = `Create failed (HTTP ${res.status})`;
            let errorData: { message: string; [key: string]: unknown } = {
              message: errorMessage,
            };
            try {
              const responseText = await res.text();
              try {
                errorData = JSON.parse(responseText);
                const errorMsg =
                  (errorData as { message?: string; error?: string }).message ||
                  (errorData as { message?: string; error?: string }).error;
                if (errorMsg) {
                  errorMessage = errorMsg;
                } else {
                  errorMessage = responseText || errorMessage;
                }
              } catch (parseError) {
                errorMessage = responseText || res.statusText || errorMessage;
                errorData = { message: errorMessage };
              }
            } catch (e) {
              errorMessage = res.statusText || `HTTP ${res.status} error`;
              errorData = { message: errorMessage };
            }
            const error = new Error(errorMessage) as ApiError;
            logger.error(
              `[PB Adapter] Create failed for ${name}`,
              error instanceof Error ? error : new Error(String(error)),
              {
                status: res.status,
                statusText: res.statusText,
                errorData,
                errorMessage,
              },
            );
            error.status = res.status;
            error.response = { status: res.status, data: errorData };
            throw error;
          }
          return await res.json();
        } catch (error: unknown) {
          if (
            error instanceof TypeError &&
            (error.message.includes("fetch") ||
              error.message.includes("Failed to fetch"))
          ) {
            const port = this.baseUrl.includes(`:${DEFAULT_MASTER_PORT}`)
              ? String(DEFAULT_MASTER_PORT)
              : this.baseUrl.includes(`:${DEFAULT_TOUCH_PORT}`)
                ? String(DEFAULT_TOUCH_PORT)
                : "unknown";
            const networkError = new Error(
              `Cannot connect to backend server at ${this.baseUrl}. Please ensure the server is running on port ${port}.`,
            ) as ApiError;
            networkError.isNetworkError = true;
            networkError.originalError =
              error instanceof Error ? error : new Error(String(error));
            throw networkError;
          }
          throw error;
        }
      },
      update: async (id: string, data: Partial<PocketRecord>) => {
        try {
          // P0 Fix: Use 60s timeout for mutations to handle SQLite write pressure
          const res = await this.request(
            `/api/collections/${name}/records/${id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
              timeoutMs: 60000, // timeoutMs override
            },
            0,
          );
          if (!res.ok) {
            let errorMessage = "Update failed";
            let errorData: { message: string; [key: string]: unknown } = {
              message: errorMessage,
            };
            try {
              errorData = await res.json();
              const errorMsg =
                (errorData as { message?: string; error?: string }).message ||
                (errorData as { message?: string; error?: string }).error;
              if (errorMsg) {
                errorMessage = errorMsg;
              }
            } catch (e) {
              errorMessage = res.statusText || "Update failed";
              errorData = { message: errorMessage };
            }
            const error = new Error(errorMessage) as ApiError;
            error.status = res.status;
            error.response = { status: res.status, data: errorData };
            throw error;
          }
          return await res.json();
        } catch (error: unknown) {
          if (
            error instanceof TypeError &&
            (error.message.includes("fetch") ||
              error.message.includes("Failed to fetch"))
          ) {
            const port = this.baseUrl.includes(`:${DEFAULT_MASTER_PORT}`)
              ? String(DEFAULT_MASTER_PORT)
              : this.baseUrl.includes(`:${DEFAULT_TOUCH_PORT}`)
                ? String(DEFAULT_TOUCH_PORT)
                : "unknown";
            const networkError = new Error(
              `Cannot connect to backend server at ${this.baseUrl}. Please ensure the server is running on port ${port}.`,
            ) as ApiError;
            networkError.isNetworkError = true;
            networkError.originalError =
              error instanceof Error ? error : new Error(String(error));
            throw networkError;
          }
          throw error;
        }
      },
      delete: async (id: string) => {
        const res = await this.request(
          `/api/collections/${name}/records/${id}`,
          {
            method: "DELETE",
          },
        );

        if (!res.ok) {
          let errorMessage = "Delete failed";
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = res.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        return true;
      },
      getFirstListItem: async (filter: string) => {
        const all = await this.collection(name).getFullList({ filter });
        return all.length > 0 ? all[0] : null;
      },
      subscribe: (
        topic: string,
        callback: (e: {
          action: string;
          record: PocketRecord;
          collection?: string;
        }) => void,
      ) => {
        // Register the listener locally
        const listener = (payload: any) => {
          if (payload.collection === name || topic === "*") {
            callback({
              action: payload.action,
              record: payload.record,
              collection: payload.collection,
            });
          }
        };
        this._sseListeners.add(listener);

        // Connect shared EventSource if not connected
        if (!this._sharedEventSource && !this._sseIsClosed) {
          this._connectSSE();
        }

        return Promise.resolve(() => {
          this._sseListeners.delete(listener);
          // We could optionally close the EventSource if listeners are empty,
          // but keeping it alive is fine and prevents thrashing.
        });
      },
      unsubscribe: (_topic?: string) => {
        // Handled via the returned unsubscribe function above

        // and the real-time implementation uses a single EventSource for all,
        // we can't easily unsubscribe just one topic without more complex logic.
        // However, the subscribe method returns a cleanup function which is the preferred way to unsubscribe.
        // We'll leave this as a no-op or log a warning if strict behavior is needed.
        // For now, to "finalize" it, we can add a log.
        // logger.debug('[PB Adapter] unsubscribe called', topic);
      },
    };
  }

  get files() {
    return {
      getUrl: (record: PocketRecord, filename: string) => {
        if (!filename) return "";
        if (filename.startsWith("http") || filename.startsWith("data:"))
          return filename;
        return `${this.baseUrl}/api/files/${record?.collectionId}/${record?.id}/${filename}`;
      },
    };
  }

  get health() {
    return {
      check: async () => {
        try {
          const res = await fetch(`${this.baseUrl}/api/health`);
          if (!res.ok) return { code: 500 };
          return await res.json();
        } catch (e) {
          return { code: 0 };
        }
      },
    };
  }

  get admins() {
    return {
      authWithPassword: async (email?: string, pass?: string) => {
        if (!email || !pass) {
          throw new Error("Email and password required");
        }
        const csrfToken = await this.getCsrfToken();
        const res = await fetch(`${this.baseUrl}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
          },
          body: JSON.stringify({ email, password: pass }),
          credentials: "include",
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Login failed");
        }
        const data = await res.json();

        // Store token if returned (for hybrid auth support)
        if (data.token) {
          this._authToken = data.token;
        }

        return {
          token: data.token || "",
          admin: { id: data.user.id },
        } as AuthResponse;
      },
    };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; user: PocketRecord }> {
    const csrfToken = await this.getCsrfToken();
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Login failed");
    }
    const data = await res.json();

    // Store token if returned
    if (data.token) {
      this._authToken = data.token;
    }

    return { token: data.token || "", user: data.user } as {
      token: string;
      user: PocketRecord;
    };
  }

  get collections() {
    return {
      getOne: async (_name: string) => ({ name: "mock", type: "base" }),
      create: async (_data: Record<string, unknown>) => ({ name: "mock" }),
    };
  }

  private _connectSSE() {
    if (this._sseIsClosed) return;
    
    const store = useConnectionStore.getState();
    
    if (this._sseRetryCount > 0) {
      store.setStatus('reconnecting');
    }
    
    this._sharedEventSource = new EventSource(`${this.baseUrl}/api/realtime`);
    
    this._sharedEventSource.onopen = () => {
      store.setStatus('connected');
      store.resetErrors();
      this._sseRetryCount = 0;
    };

    this._sharedEventSource.onmessage = (e) => {
      if (e.data && e.data !== ": connected") {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'HEARTBEAT') {
            store.recordHeartbeat();
            return;
          }
          // Notify all listeners
          for (const listener of Array.from(this._sseListeners)) {
            listener(payload);
          }
        } catch (err) {
          if (e.data.includes('HEARTBEAT')) {
            store.recordHeartbeat();
          } else {
            logger.error("SSE Parse Error", err instanceof Error ? err : new Error(String(err)));
          }
        }
      } else if (e.data === ": connected") {
        store.setStatus('connected');
      }
    };

    this._sharedEventSource.onerror = () => {
      if (this._sseIsClosed) return;
      
      store.incrementError();
      this._sharedEventSource?.close();
      this._sharedEventSource = null;
      
      const delay = Math.min(1000 * Math.pow(2, this._sseRetryCount), 30000);
      this._sseRetryCount++;
      
      if (this._sseRetryCount < 5) {
        logger.info(`[SSE] Connection lost, retrying in ${delay / 1000}s... (Attempt ${this._sseRetryCount})`);
      }
      
      setTimeout(() => this._connectSSE(), delay);
    };
  }
}

// Initialize Adapter (Default)
export const pb = new CustomPocketBaseAdapter(getBaseUrl());

// Local-only instance (always targets local backend even in cloud mode)
const localUrl =
  typeof window !== "undefined"
    ? `http://127.0.0.1:${DEFAULT_MASTER_PORT}`
    : DEFAULT_API_URL;
export const localPB = new CustomPocketBaseAdapter(localUrl);

export const configureConnection = () => {
  // This is now mostly handled by App.tsx setting pb.baseUrlValue directly
  // But kept for manual switches in Settings
  const currentSettings = JSON.parse(
    safeStorage.getItem("connectionSettings") || '{"mode":"local"}',
  );
  const cloudSettings = JSON.parse(
    safeStorage.getItem("masterCloudSettings") || '{"url":""}',
  );

  // Default to current base, don't overwrite unless mode changed
  let targetUrl = pb.baseUrl;

  if (currentSettings.mode === "cloud" && cloudSettings.url) {
    targetUrl = cloudSettings.url;
  } else if (
    currentSettings.mode === "local" &&
    targetUrl.includes("starmaster.cloud")
  ) {
    // If switching back to local from cloud, revert to default 8090
    targetUrl = `http://127.0.0.1:${DEFAULT_MASTER_PORT}`;
  }

  if (pb.baseUrl !== targetUrl) {
    pb.baseUrlValue = targetUrl;
    // @ts-ignore - Check for Vite dev environment
    if (
      typeof jest !== "undefined" ||
      (typeof import.meta !== "undefined" && import.meta.env?.DEV)
    ) {
      logger.debug(`[PB] Reconfigured connection to: ${targetUrl}`);
    }
  }
};

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const health = await pb.health.check();
    return health.code === 200;
  } catch (error) {
    return false;
  }
};

export const getBackendStats = async (): Promise<{
  code?: number;
  message?: string;
} | null> => {
  try {
    const res = await fetch(`${pb.baseUrl}/api/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
};
