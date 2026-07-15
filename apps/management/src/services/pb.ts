import { logger } from '@/utils/logger';
import { CollectionOptions, PocketRecord, AuthResponse } from "./pbTypes";
import {
  isPublicDomain,
  getCloudBaseUrl,
  isSafeConnection,
} from "../utils/environment";

// Custom PocketBase Adapter to handle:
// 1. Dynamic Base URL switching (Local vs Cloud)
// 2. Auth State Persistence
// 3. Type Safety

const DEFAULT_LOCAL_URL = "http://127.0.0.1:8092";

export const getBaseUrl = (): string => {
  // 1. Critical Security Check: Public Domain Enforcement
  // If we are on a deployed public domain, we MUST use the Cloud Backend.
  // We strictly ignore any local storage settings that might point to localhost.
  if (isPublicDomain()) {
    logger.info("[PB] Public Domain Detected. Enforcing Cloud Mode.");
    return getCloudBaseUrl();
  }

  // 2. Priority: Runtime Environment Variable (if injected during build)
  if (import.meta.env.VITE_PB_URL) {
    return import.meta.env.VITE_PB_URL;
  }

  // 3. Priority: Query Parameter Override (useful for debugging/kiosks)
  // format: ?server=http://192.168.1.100:8090
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const serverParam = params.get("server");
    if (serverParam) {
      // Basic validation
      if (serverParam.startsWith("http")) {
        if (isPublicDomain() && !isSafeConnection(serverParam)) {
          logger.warn(`[PB] Blocked unsafe server param: ${serverParam}`);
        } else {
          return serverParam;
        }
      }
    }
  }

  // 4. Priority: LocalStorage Settings (User configured)
  if (typeof window !== "undefined") {
    const savedSettings = localStorage.getItem("connectionSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.mode === "cloud") {
          // Check for legacy dedicated cloud settings
          const cloudSettings = localStorage.getItem("masterCloudSettings");
          if (cloudSettings) {
            const cloudParsed = JSON.parse(cloudSettings);
            if (cloudParsed.url) return cloudParsed.url;
          }
          return getCloudBaseUrl();
        }
        // If mode is local, we continue to default local logic
      } catch (e) {
        logger.error("Failed to parse connection settings", e);
      }
    }
  }

  // 5. Default Fallback -> Localhost (ONLY if not public/cloud forced)
  return DEFAULT_LOCAL_URL;
};

class CustomPocketBaseAdapter {
  baseUrl: string;
  authStore: {
    isValid: boolean;
    isAdmin: boolean;
    model: { id: string; email: string };
    token: string;
    onChange: () => () => void;
    clear: () => void;
  };
  private authToken: string | null = null;
  // Helper property to check if we are in cloud mode
  public isCloud: boolean = false;

  constructor(baseUrl: string) {
    // Sanitize baseUrl: remove trailing slash and 'api' suffix if present
    this.baseUrl = baseUrl.replace(/\/+$/, "").replace(/\/api$/, "");
    this.isCloud =
      !this.baseUrl.includes("localhost") &&
      !this.baseUrl.includes("127.0.0.1") &&
      !this.baseUrl.includes("192.168");

    // SECURITY: Use sessionStorage for auth tokens — cleared on tab close,
    // reducing persistence window vs localStorage. Full httpOnly-cookie
    // migration tracked separately (requires backend Set-Cookie support).
    const savedToken = sessionStorage.getItem("authToken");
    if (savedToken) {
      this.authToken = savedToken;
    }

    const self = this;
    this.authStore = {
      isValid: true,
      isAdmin: true,
      model: { id: "admin", email: "admin@local" },
      get token() {
        return self.authToken || "";
      },
      onChange: () => () => {}, // No-op unsubscribe
      clear: () => {
        self.authToken = null;
        sessionStorage.removeItem("authToken");
      },
    };
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
    if (token) {
      sessionStorage.setItem("authToken", token);
    } else {
      sessionStorage.removeItem("authToken");
    }
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  // Helper to support dynamic URL switching
  set baseUrlValue(url: string) {
    if (isPublicDomain() && !isSafeConnection(url)) {
      logger.warn(
        `[PB] Security Block: Attempted to set unsafe URL ${url} on public domain. Ignoring.`,
      );
      return;
    }
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

          const res = await fetch(
            `${this.baseUrl}/api/collections/${name}/records${query}`,
            {
              headers: this.getAuthHeaders(),
            },
          );
          if (!res.ok) {
            if (res.status === 401) {
              const error = new Error("Authentication required") as Error & {
                status: number;
                code: string;
              };
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
          if (e instanceof Error && (e as { status?: number }).status === 401) {
            throw e;
          }
          return [];
        }
      },
      getList: async (
        page: number,
        perPage: number,
        options?: CollectionOptions,
      ) => {
        const res = await fetch(
          `${this.baseUrl}/api/collections/${name}/records?page=${page}&perPage=${perPage}${options?.sort ? `&sort=${encodeURIComponent(options.sort)}` : ""}${options?.filter ? `&filter=${encodeURIComponent(options.filter)}` : ""}${options?.expand ? `&expand=${encodeURIComponent(options.expand)}` : ""}`,
          {
            headers: this.getAuthHeaders(),
          },
        );
        if (!res.ok) {
          if (res.status === 401) {
            const error = new Error("Authentication required") as Error & {
              status: number;
              code: string;
            };
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
          const res = await fetch(
            `${this.baseUrl}/api/collections/${name}/records${query}`,
            {
              headers: this.getAuthHeaders(),
            },
          );
          if (!res.ok) {
            if (res.status === 401) {
              const error = new Error("Authentication required") as Error & {
                status: number;
                code: string;
              };
              error.status = 401;
              error.code = "AUTHENTICATION_ERROR";
              throw error;
            }
            return null;
          }

          let data: unknown = null;
          try {
            const responseText = await res.text();
            if (responseText) {
              data = JSON.parse(responseText);
            }
          } catch {
            return null;
          }

          if (!data || typeof data !== "object") {
            return null;
          }

          const dataObj = data as Record<string, unknown> | null;
          if (
            dataObj &&
            Array.isArray(dataObj.items) &&
            dataObj.items.length > 0
          ) {
            return dataObj.items[0];
          }

          return null;
        } catch (error) {
          if (error instanceof Error && (error as { status?: number }).status === 401) {
            throw error;
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
            } catch {
              hasFile = false;
            }
          }

          if (hasFile) {
            body = new FormData();
            const recordData = data as Record<string, unknown>;
            for (const key in recordData) {
              body.append(key, recordData[key] as string | Blob);
            }
          } else {
            body = JSON.stringify(data);
            headers = { "Content-Type": "application/json" };
          }
        }

        const authHeaders = this.getAuthHeaders();
        const allHeaders = { ...authHeaders, ...headers };
        const res = await fetch(
          `${this.baseUrl}/api/collections/${name}/records`,
          {
            method: "POST",
            headers: allHeaders,
            body,
          },
        );
        if (!res.ok) {
          let errorMessage = `Create failed (HTTP ${res.status})`;
          let errorData: Record<string, unknown> = { message: errorMessage };
          try {
            const responseText = await res.text();
            errorData = JSON.parse(responseText) as Record<string, unknown>;
            errorMessage =
              (errorData.message as string | undefined) ||
              (errorData.error as string | undefined) ||
              responseText;
          } catch {
            // Response body not valid JSON — use default error message
          }

          const error = new Error(errorMessage) as Error & {
            status: number;
            response: { status: number; data: Record<string, unknown> };
          };
          error.status = res.status;
          error.response = { status: res.status, data: errorData };
          throw error;
        }
        return await res.json();
      },
      update: async (id: string, data: Partial<PocketRecord>) => {
        const authHeaders = this.getAuthHeaders();
        const res = await fetch(
          `${this.baseUrl}/api/collections/${name}/records/${id}`,
          {
            method: "PATCH",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );
        if (!res.ok) {
          // Try to extract error message from response
          let errorMessage = "Update failed";
          let errorData: Record<string, unknown> = { message: errorMessage };
          try {
            errorData = (await res.json()) as Record<string, unknown>;
            if (errorData.message) errorMessage = errorData.message as string;
            else if (errorData.error) errorMessage = errorData.error as string;
          } catch {
            errorMessage = res.statusText || "Update failed";
          }
          const error = new Error(errorMessage) as Error & {
            status: number;
            response: { status: number; data: Record<string, unknown> };
          };
          error.status = res.status;
          error.response = { status: res.status, data: errorData };
          throw error;
        }
        return await res.json();
      },
      delete: async (id: string) => {
        const res = await fetch(
          `${this.baseUrl}/api/collections/${name}/records/${id}`,
          {
            method: "DELETE",
            headers: this.getAuthHeaders(),
          },
        );
        if (!res.ok) throw new Error("Delete failed");
        return true;
      },
      getFirstListItem: async (filter: string) => {
        const all = await this.collection(name).getFullList({ filter });
        return all.length > 0 ? all[0] : null;
      },
      subscribe: (
        topic: string,
        callback: (e: { action: string; record: PocketRecord }) => void,
      ) => {
        const evtSource = new EventSource(`${this.baseUrl}/api/realtime`);
        evtSource.onmessage = (e) => {
          if (e.data && e.data !== ": connected") {
            try {
              const payload = JSON.parse(e.data);
              if (payload.collection === name || topic === "*") {
                callback({
                  action: payload.action,
                  record: payload.record,
                });
              }
            } catch (err) {
              logger.error("SSE Parse Error", err);
            }
          }
        };
        return Promise.resolve(() => evtSource.close());
      },
      unsubscribe: (_topic?: string) => {},
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
        } catch {
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
        const res = await fetch(`${this.baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pass }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Login failed");
        }
        const data = await res.json();
        this.setAuthToken(data.token);
        return {
          token: data.token,
          admin: { id: data.user.id },
        } as AuthResponse;
      },
    };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; user: PocketRecord }> {
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Login failed");
    }
    const data = await res.json();
    this.setAuthToken(data.token);
    return data;
  }

  get collections() {
    return {
      getOne: async (_name: string) => ({ _name: "mock", type: "base" }),
      create: async (_data: Record<string, unknown>) => ({ name: "mock" }),
    };
  }
}

// Initialize Adapter (Default)
export const pb = new CustomPocketBaseAdapter(getBaseUrl());

export const configureConnection = () => {
  // If public domain, enforce strict cloud mode, do NOT allow local override
  if (isPublicDomain()) {
    const cloudUrl = getCloudBaseUrl();
    if (pb.baseUrl !== cloudUrl) {
      pb.baseUrlValue = cloudUrl;
      logger.info(`[PB] Public Domain Enforced Connection: ${cloudUrl}`);
    }
    // Early exit to prevent reading any local settings
    return;
  }

  // Manual Local/Cloud switch for dev/localhost
  const currentSettings = JSON.parse(
    localStorage.getItem("connectionSettings") || '{"mode":"local"}',
  );
  const cloudSettings = JSON.parse(
    localStorage.getItem("masterCloudSettings") || '{"url":""}',
  );

  let targetUrl = pb.baseUrl;

  if (currentSettings.mode === "cloud" && cloudSettings.url) {
    targetUrl = cloudSettings.url;
  } else if (
    currentSettings.mode === "local" &&
    targetUrl.includes("starmaster.cloud")
  ) {
    targetUrl = DEFAULT_LOCAL_URL;
  }

  if (pb.baseUrl !== targetUrl) {
    pb.baseUrlValue = targetUrl;
    logger.info(`[PB] Reconfigured connection to: ${targetUrl}`);
  }
};

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const health = await pb.health.check();
    return health.code === 200;
  } catch {
    return false;
  }
};

export const getBackendStats = async (): Promise<Record<string, unknown> | null> => {
  try {
    const res = await fetch(`${pb.baseUrl}/api/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};
