export class ConnectionManager {
  private baseUrl: string;
  private authToken: string | null = null;
  private csrfToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
  }

  public setCsrfToken(token: string | null) {
    this.csrfToken = token;
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    if (this.authToken) {
      headers.set("Authorization", `Bearer ${this.authToken}`);
    }
    if (this.csrfToken) {
      headers.set("X-CSRF-Token", this.csrfToken);
    }

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        // Auto-retry on 503 Service Unavailable or 429 Too Many Requests
        if ((response.status === 503 || response.status === 429) && retries > 0) {
          console.warn(`[API] Connection to ${endpoint} failed (${response.status}), retrying...`);
          await new Promise((res) => setTimeout(res, 1000 * (4 - retries)));
          return this.request<T>(endpoint, options, retries - 1);
        }

        if (response.status === 401) {
          // TODO: Implement token refresh logic or callback here
          console.warn(`[API] 401 Unauthorized for ${endpoint}`);
        }

        throw new Error(`API Error ${response.status}: ${await response.text()}`);
      }

      return response.json() as Promise<T>;
    } catch (err: any) {
      if (err.name === "TypeError" && err.message === "Failed to fetch" && retries > 0) {
        // Network error (offline), retry with backoff
        console.warn(`[API] Network error connecting to ${endpoint}, retrying...`);
        await new Promise((res) => setTimeout(res, 2000 * (4 - retries)));
        return this.request<T>(endpoint, options, retries - 1);
      }
      throw err;
    }
  }

  public async get<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", headers });
  }

  public async post<T>(endpoint: string, body: any, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    });
  }

  public async put<T>(endpoint: string, body: any, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
      headers,
    });
  }

  public async delete<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", headers });
  }
}

export const api = new ConnectionManager(
  typeof window !== "undefined" ? window.location.origin : "http://localhost:8090"
);

export class SSEManager {
  private url: string;
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(url: string) {
    this.url = url;
  }

  public connect() {
    if (this.eventSource) return;

    this.eventSource = new EventSource(this.url);

    this.eventSource.onopen = () => {
      console.log(`[SSE] Connected to ${this.url}`);
      this.reconnectAttempts = 0;
    };

    this.eventSource.onerror = (error) => {
      console.error(`[SSE] Connection error on ${this.url}`, error);
      this.disconnect();
      this.reconnect();
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const type = data.type || 'message';
        this.notifyListeners(type, data.payload);
      } catch (e) {
        console.error('[SSE] Failed to parse message', e);
      }
    };
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[SSE] Max reconnect attempts reached for ${this.url}`);
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[SSE] Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  public on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  private notifyListeners(event: string, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }
}
