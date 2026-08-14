import { CollectionOptions, PocketRecord, AuthResponse } from './pbTypes';
import { DEFAULT_TOUCH_PORT, DEFAULT_MASTER_PORT, DEFAULT_TOUCH_PORT as FALLBACK_PORT } from '../constants'; // Using fallback logic if needed
import { logger } from '@/utils/logger';

// Helper to reliably detect network errors across browsers
const isNetworkError = (error: any): boolean => {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    return (
        error instanceof TypeError && (
            msg.includes('fetch') ||
            msg.includes('network') ||
            msg.includes('failed to fetch') ||
            msg.includes('connection refused')
        )
    ) || msg.includes('err_connection_refused');
};

// Retry helper
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        // Only retry network errors
        if (isNetworkError(error)) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryWithBackoff(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}

// A Custom Adapter to replace the PocketBase SDK dependency
// This allows the frontend to keep using 'pb.collection()...' syntax
// while actually talking to our custom local Node.js server.

// 1. Load Connection Settings
const savedConnSettings = localStorage.getItem('connectionSettings');
const connConfig = savedConnSettings ? JSON.parse(savedConnSettings) : { mode: 'local' };
const savedCloudSettings = localStorage.getItem('masterCloudSettings');
const cloudConfig = savedCloudSettings ? JSON.parse(savedCloudSettings) : { url: '', key: '' };

export const isCloudMode = connConfig.mode === 'cloud';

const getBaseUrl = () => {
    if (isCloudMode && cloudConfig.url) return cloudConfig.url;

    // 1. Check for Manual IP in connectionSettings (set by DeviceSetup)
    if (connConfig.manualIp) {
        return `http://${connConfig.manualIp}:${DEFAULT_MASTER_PORT}`; // Port 8090 for Master Backend
    }

    // 2. Removed Legacy Fallback: Do NOT use kioskSettingsV2.serverUrl for main PB instance.
    // That setting points to Master (8090), but we want PB to point to Local Backend (8092).

    // 3. Default Environment Logic
    if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        // If we are running in Electron (file://) or origin is null
        if (origin.startsWith('file:') || origin === 'null') {
            return `http://127.0.0.1:${DEFAULT_TOUCH_PORT}`; // Default fallback
        }
        // Development/Localhost: Use origin (Vite proxy)
        return origin;
    }
    return `http://127.0.0.1:${DEFAULT_TOUCH_PORT}`;
};



class CustomPocketBaseAdapter {
    baseUrl: string;
    authStore: { isValid: boolean; isAdmin: boolean; model: { id: string; email: string }; token: string; onChange: (callback?: (token: string, model: any) => void) => () => void; clear: () => void; };
    private authToken: string | null = null;
    
    // SSE Singleton State
    private sseConnection: EventSource | null = null;
    private sseListeners: Map<string, Array<(e: { action: string; record: PocketRecord }) => void>> = new Map();
    private sseReconnectTimer: NodeJS.Timeout | null = null;
    private sseRetryCount = 0;
    private readonly SSE_MAX_RETRIES = 50;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        // Load token from localStorage if available
        const savedToken = localStorage.getItem('authToken');
        if (savedToken) {
            this.authToken = savedToken;
        }
        // Mock AuthStore to satisfy TS/UI checks. 
        // Use getter for token to return actual token value
        const self = this;
        this.authStore = {
            isValid: true,
            isAdmin: true,
            model: { id: 'admin', email: 'admin@local' },
            get token() {
                return self.authToken || '';
            },
            onChange: (callback?: (token: string, model: any) => void) => { return () => { }; }, // No-op unsubscribe
            clear: () => {
                self.authToken = null;
                localStorage.removeItem('authToken');
            }
        };
    }

    setAuthToken(token: string | null): void {
        this.authToken = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    private getAuthHeaders(): HeadersInit {
        const headers: HeadersInit = {};
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return headers;
    }

    // Helper to support dynamic URL switching
    set baseUrlValue(url: string) {
        this.baseUrl = url;
    }

    get baseUrlValue() {
        return this.baseUrl;
    }

    autoCancellation(enable: boolean) { return this; }

    // Mocking the 'collection' interface
    collection(name: string) {
        return {
            getFullList: async (options?: CollectionOptions) => {
                try {
                    let query = '';
                    const params = [];
                    if (options) {
                        if (options.sort) params.push(`sort=${encodeURIComponent(options.sort)}`);
                        if (options.filter) params.push(`filter=${encodeURIComponent(options.filter)}`);
                        if (options.expand) params.push(`expand=${encodeURIComponent(options.expand)}`);
                        if (options.page) params.push(`page=${options.page}`);
                        if (options.perPage) params.push(`perPage=${options.perPage}`);
                    }
                    if (params.length > 0) query = `?${params.join('&')}`;

                    const res = await fetch(`${this.baseUrl}/api/collections/${name}/records${query}`, {
                        headers: this.getAuthHeaders()
                    });
                    if (!res.ok) {
                        // For 401 errors, throw with status code so calling code can detect auth errors
                        if (res.status === 401) {
                            const error = new Error('Authentication required');
                            const apiError = error as Error & { status?: number; code?: string };
                            apiError.status = 401;
                            apiError.code = 'AUTHENTICATION_ERROR';
                            throw error;
                        }
                        throw new Error(res.statusText);
                    }
                    const data = await res.json();
                    // Safely handle null/undefined responses
                    if (data == null || typeof data !== 'object') {
                        return [];
                    }
                    return Array.isArray(data.items) ? data.items : [];
                } catch (e) {
                    // Re-throw auth errors so they can be handled by calling code
                    if (e instanceof Error && 'status' in e && e.status === 401) {
                        throw e;
                    }
                    // Check if it's a network error (backend not available)
                    const isNetError = isNetworkError(e);

                    // Only log non-network errors or log network errors at debug level
                    if (!isNetError) {
                        logger.warn(`[CustomAdapter] Failed to fetch list for ${name}`, e);
                    }
                    // Return empty array for all errors (network or otherwise)
                    return [];
                }
            },
            getList: async (page: number, perPage: number, options?: CollectionOptions) => {
                const mergedOptions = { ...options, page, perPage };
                const res = await fetch(`${this.baseUrl}/api/collections/${name}/records?page=${page}&perPage=${perPage}${options?.sort ? `&sort=${encodeURIComponent(options.sort)}` : ''}${options?.filter ? `&filter=${encodeURIComponent(options.filter)}` : ''}${options?.expand ? `&expand=${encodeURIComponent(options.expand)}` : ''}`, {
                    headers: this.getAuthHeaders()
                });
                if (!res.ok) {
                    // For 401 errors, throw with status code so calling code can detect auth errors
                    if (res.status === 401) {
                        const error = new Error('Authentication required');
                        const apiError = error as Error & { status?: number; code?: string };
                        apiError.status = 401;
                        apiError.code = 'AUTHENTICATION_ERROR';
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
                    totalPages: data.totalPages || Math.ceil((data.totalItems || data.items?.length || 0) / perPage)
                };
            },
            getOne: async (id: string, options?: CollectionOptions) => {
                // Backend doesn't support /records/{id}, use filter instead
                const filter = `id="${id}"`;
                let query = `?filter=${encodeURIComponent(filter)}`;
                if (options && options.expand) {
                    query += `&expand=${encodeURIComponent(options.expand)}`;
                }

                try {
                    const res = await retryWithBackoff(() => fetch(`${this.baseUrl}/api/collections/${name}/records${query}`, {
                        headers: this.getAuthHeaders()
                    }));
                    if (!res.ok) {
                        // For 401 errors, throw with status code so calling code can detect auth errors
                        if (res.status === 401) {
                            const error = new Error('Authentication required');
                            const apiError = error as Error & { status?: number; code?: string };
                            apiError.status = 401;
                            apiError.code = 'AUTHENTICATION_ERROR';
                            throw error;
                        }
                        // Return null instead of throwing to match expected behavior
                        return null;
                    }

                    // Safely parse JSON response
                    let data: any = null;
                    try {
                        const responseText = await res.text();
                        if (responseText) {
                            data = JSON.parse(responseText);
                        }
                    } catch (parseError) {
                        logger.warn(`[CustomAdapter] Failed to parse JSON response for ${name}.getOne`, parseError);
                        return null;
                    }

                    // Verify data is an object before accessing properties
                    if (!data || typeof data !== 'object') {
                        return null;
                    }

                    // Return the first item from the filtered results
                    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
                        return data.items[0];
                    }

                    // Return null if no items found (instead of throwing)
                    return null;
                } catch (error) {
                    // Re-throw auth errors so they can be handled by calling code
                    if (error instanceof Error && 'status' in error && error.status === 401) {
                        throw error;
                    }
                    // Handle network errors gracefully
                    const isNetError = isNetworkError(error);

                    if (!isNetError) {
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
                    // Safely check for files - ensure data is an object before calling Object.values
                    let hasFile = false;
                    if (data && typeof data === 'object' && !Array.isArray(data)) {
                        try {
                            hasFile = Object.values(data).some(val => val instanceof File || val instanceof Blob);
                        } catch (error) {
                            logger.warn('[CustomAdapter] Error checking for files in create', error);
                            hasFile = false;
                        }
                    }

                    if (hasFile) {
                        body = new FormData();
                        for (const key in data) {
                            const value = data[key];
                            if (value instanceof Blob || typeof value === 'string') {
                                body.append(key, value);
                            } else if (value !== undefined && value !== null) {
                                body.append(key, String(value));
                            }
                        }
                    } else {
                        body = JSON.stringify(data);
                        headers = { 'Content-Type': 'application/json' };
                    }
                }

                const authHeaders = this.getAuthHeaders();
                const allHeaders = { ...authHeaders, ...headers };
                try {
                    const res = await retryWithBackoff(() => fetch(`${this.baseUrl}/api/collections/${name}/records`, {
                        method: 'POST',
                        headers: allHeaders,
                        body
                    }));
                    if (!res.ok) {
                        // Try to extract error message from response
                        let errorMessage = `Create failed (HTTP ${res.status})`;
                        let errorData: any = { message: errorMessage };
                        try {
                            const responseText = await res.text();
                            try {
                                errorData = JSON.parse(responseText);
                                if (errorData.message) {
                                    errorMessage = errorData.message;
                                } else if (errorData.error) {
                                    errorMessage = errorData.error;
                                } else {
                                    errorMessage = responseText || errorMessage;
                                }
                            } catch (parseError) {
                                // Response is not JSON, use as-is
                                errorMessage = responseText || res.statusText || errorMessage;
                                errorData = { message: errorMessage };
                            }
                        } catch (e) {
                            // If reading fails, use status text
                            errorMessage = res.statusText || `HTTP ${res.status} error`;
                            errorData = { message: errorMessage };
                        }
                        logger.error(`[PB Adapter] Create failed for ${name}:`, {
                            status: res.status,
                            statusText: res.statusText,
                            errorData,
                            errorMessage
                        });
                        const error: any = new Error(errorMessage);
                        error.status = res.status;
                        error.response = { status: res.status, data: errorData };
                        throw error;
                    }
                    return await res.json();
                } catch (error: any) {
                    // Handle network errors (Failed to fetch, etc.)
                    if (isNetworkError(error)) {
                        // Check if it's a CORS or network issue
                        const port = this.baseUrl.includes(':8090') ? '8090' : (this.baseUrl.includes(':8091') ? '8091' : 'unknown');
                        const networkError: any = new Error(`Cannot connect to backend server at ${this.baseUrl}. Please ensure the server is running on port ${port}. If the server is running, check your authentication token.`);
                        networkError.isNetworkError = true;
                        networkError.originalError = error;
                        throw networkError;
                    }
                    throw error;
                }
            },
            update: async (id: string, data: Partial<PocketRecord>) => {
                const authHeaders = this.getAuthHeaders();
                try {
                    const res = await retryWithBackoff(() => fetch(`${this.baseUrl}/api/collections/${name}/records/${id}`, {
                        method: 'PATCH',
                        headers: { ...authHeaders, 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    }));
                    if (!res.ok) {
                        // Try to extract error message from response
                        let errorMessage = "Update failed";
                        let errorData: any = { message: errorMessage };
                        try {
                            errorData = await res.json();
                            if (errorData.message) {
                                errorMessage = errorData.message;
                            } else if (errorData.error) {
                                errorMessage = errorData.error;
                            }
                        } catch (e) {
                            errorMessage = res.statusText || "Update failed";
                            errorData = { message: errorMessage };
                        }
                        const error: any = new Error(errorMessage);
                        error.status = res.status;
                        error.response = { status: res.status, data: errorData };
                        throw error;
                    }
                    return await res.json();
                } catch (error: any) {
                    // Handle network errors (Failed to fetch, etc.)
                    if (isNetworkError(error)) {
                        // Check if it's a CORS or network issue
                        const port = this.baseUrl.includes(':8090') ? '8090' : (this.baseUrl.includes(':8091') ? '8091' : 'unknown');
                        const networkError: any = new Error(`Cannot connect to backend server at ${this.baseUrl}. Please ensure the server is running on port ${port}. If the server is running, check your authentication token.`);
                        networkError.isNetworkError = true;
                        networkError.originalError = error;
                        throw networkError;
                    }
                    throw error;
                }
            },
            delete: async (id: string) => {
                const res = await retryWithBackoff(() => fetch(`${this.baseUrl}/api/collections/${name}/records/${id}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                }));
                if (!res.ok) throw new Error("Delete failed");
                return true;
            },
            getFirstListItem: async (filter: string) => {
                const all = await this.collection(name).getFullList({ filter });
                return all.length > 0 ? all[0] : null;
            },
            subscribe: (topic: string, callback: (e: { action: string; record: PocketRecord }) => void) => {
                // Ensure array for topic exists
                const listeners = this.sseListeners.get(topic) || [];
                listeners.push(callback);
                this.sseListeners.set(topic, listeners);

                // Add to catch-all topic as well if it's not '*'
                if (topic !== '*') {
                    const allListeners = this.sseListeners.get('*') || [];
                    // We don't add specific callbacks to '*' to avoid duplicate calls, 
                    // but we ensure the SSE connection is alive.
                }

                if (!this.sseConnection) {
                    this.connectSSE();
                }

                return Promise.resolve(() => {
                    this.collection(name).unsubscribe(topic, callback);
                });
            },
            unsubscribe: (topic?: string, callback?: (e: { action: string; record: PocketRecord }) => void) => {
                if (topic && callback) {
                    const listeners = this.sseListeners.get(topic) || [];
                    this.sseListeners.set(topic, listeners.filter(cb => cb !== callback));
                } else if (topic) {
                    this.sseListeners.delete(topic);
                } else {
                    this.sseListeners.clear();
                }

                // If no listeners left, close connection
                let totalListeners = 0;
                this.sseListeners.forEach(list => totalListeners += list.length);
                if (totalListeners === 0 && this.sseConnection) {
                    this.sseConnection.close();
                    this.sseConnection = null;
                }
            }
        }
    }

    private connectSSE() {
        if (this.sseConnection) {
            this.sseConnection.close();
        }

        this.sseConnection = new EventSource(`${this.baseUrl}/api/realtime`);

        this.sseConnection.onopen = () => {
            logger.info('[PB Adapter] Realtime connected (Multiplexed)');
            this.sseRetryCount = 0;
        };

        this.sseConnection.onmessage = (e) => {
            if (e.data && e.data !== ': connected') {
                try {
                    const payload = JSON.parse(e.data);
                    const coll = payload.collection;
                    
                    // Trigger specific topic listeners
                    if (coll && this.sseListeners.has(coll)) {
                        this.sseListeners.get(coll)!.forEach(cb => cb({ action: payload.action, record: payload.record }));
                    }
                    
                    // Trigger wildcard listeners
                    if (this.sseListeners.has('*')) {
                        this.sseListeners.get('*')!.forEach(cb => cb({ action: payload.action, record: payload.record }));
                    }
                } catch (err) { logger.error("SSE Parse Error", err); }
            }
        };

        this.sseConnection.onerror = (err) => {
            logger.warn('[PB Adapter] SSE Error, reconnecting...', err);
            this.sseConnection?.close();
            this.sseConnection = null;

            const delay = Math.min(1000 * Math.pow(1.5, this.sseRetryCount), 10000);
            this.sseRetryCount++;

            if (this.sseRetryCount <= this.SSE_MAX_RETRIES) {
                if (this.sseReconnectTimer) clearTimeout(this.sseReconnectTimer);
                this.sseReconnectTimer = setTimeout(() => this.connectSSE(), delay);
            } else {
                logger.error('[PB Adapter] SSE Max retries reached');
            }
        };
    }

    get files() {
        return {
            getUrl: (record: PocketRecord, filename: string) => {
                if (!filename) return '';
                if (filename.startsWith('http') || filename.startsWith('data:')) return filename;

                // FORCE ABSOLUTE URL
                // If baseUrl is relative (starts with /), strict mode requires absolute.
                // We use the computed baseUrl which handles local/cloud logic.
                let base = this.baseUrl;

                // If for some reason baseUrl is relative or empty in a weird environment, fall back to localhost:8092
                if (!base || base.startsWith('/')) {
                    if (typeof window !== 'undefined') {
                        base = window.location.origin;
                    } else {
                        base = 'http://localhost:8091';
                    }
                }

                // Clean potential double slashes if baseUrl has trailing slash (it shouldn't, but safety first)
                base = base.replace(/\/$/, '');

                return `${base}/api/files/${record?.collectionId || 'photos'}/${record?.id || '0'}/${filename}`;
            }
        }
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
            }
        }
    }

    get admins() {
        return {
            authWithPassword: async (email?: string, pass?: string) => {
                if (!email || !pass) {
                    throw new Error('Email and password required');
                }
                const res = await fetch(`${this.baseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: pass })
                });
                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || 'Login failed');
                }
                const data = await res.json();
                this.setAuthToken(data.token);
                return { token: data.token, admin: { id: data.user.id } } as AuthResponse;
            }
        }
    }

    async login(email: string, password: string): Promise<{ token: string; user: PocketRecord }> {
        const res = await fetch(`${this.baseUrl}/api/collections/users/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: email, password })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || error.error || 'Login failed');
        }
        const data = await res.json();
        this.setAuthToken(data.token);
        return { token: data.token, user: data.record };
    }

    get collections() {
        return {
            getOne: async (name: string) => ({ name: 'mock', type: 'base' }),
            create: async (data: Record<string, unknown>) => ({ name: 'mock' })
        }
    }
}

// Initialize Adapter (Default)
export const pb = new CustomPocketBaseAdapter(getBaseUrl());

export const configureConnection = () => {
    // This is now mostly handled by App.tsx setting pb.baseUrlValue directly
    // But kept for manual switches in Settings
    const currentSettings = JSON.parse(localStorage.getItem('connectionSettings') || '{"mode":"local"}');
    const cloudSettings = JSON.parse(localStorage.getItem('masterCloudSettings') || '{"url":""}');

    // Default to current base, don't overwrite unless mode changed
    let targetUrl = pb.baseUrl;

    if (currentSettings.mode === 'cloud' && cloudSettings.url) {
        targetUrl = cloudSettings.url;
    } else if (currentSettings.mode === 'local' && targetUrl.includes('starmaster.cloud')) {
        // If switching back to local from cloud, revert to default 8091
        targetUrl = 'http://127.0.0.1:8091';
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
    } catch (error) {
        return false;
    }
};

export const getBackendStats = async (): Promise<any> => {
    try {
        const res = await fetch(`${pb.baseUrl}/api/health`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
};
