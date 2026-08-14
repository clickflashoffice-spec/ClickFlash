/**
 * dataService.ts — Unified IPC & Data Layer Bridge for ClickFlash Master OS
 *
 * Direct IPC-first repository interface for local SQLite operations via `repo:request`.
 * Automatically falls back to HTTP API when running in standalone browser mode.
 */

import { logger } from '../utils/logger';

declare global {
  interface Window {
    electron?: {
      invoke(channel: string, ...args: any[]): Promise<any>;
      on(channel: string, func: (...args: any[]) => void): void;
      dialogs?: any;
      printing?: any;
      kiosk?: any;
      updater?: any;
    };
  }
}

export interface IPCRepoRequest {
  repo: 'albums' | 'photos' | 'orders' | 'users' | 'settings' | 'products';
  action: string;
  payload?: any;
}

export interface IPCRepoResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

class DataService {
  private isElectron: boolean;

  constructor() {
    this.isElectron = typeof window !== 'undefined' && Boolean(window.electron?.invoke);
  }

  /**
   * Universal IPC/HTTP Request Router
   */
  private async request<T = any>(
    repo: IPCRepoRequest['repo'],
    action: string,
    payload?: any
  ): Promise<T> {
    if (this.isElectron) {
      try {
        const response: any = await window.electron!.invoke('repo:request', {
          collection: repo,
          action,
          params: payload,
          repo,
          payload,
        });

        const isOk = response?.ok ?? response?.success;
        if (!isOk) {
          throw new Error(response?.error || response?.data?.error || `IPC Repository request failed: ${repo}.${action}`);
        }

        return (response.data !== undefined ? response.data : response) as T;
      } catch (err: any) {
        logger.error(`[IPC Error] ${repo}.${action}:`, err);
        throw err;
      }
    }

    // Browser Fallback via HTTP API
    const res = await fetch(`/api/${repo}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });

    if (!res.ok) {
      throw new Error(`HTTP fallback request failed: ${res.statusText}`);
    }

    return res.json();
  }

  // --- Albums Repository ---
  public albums = {
    getAll: () => this.request('albums', 'findAll'),
    getById: (id: string) => this.request('albums', 'findById', { id }),
    create: (data: any) => this.request('albums', 'create', data),
    update: (id: string, data: any) => this.request('albums', 'update', { id, data }),
    delete: (id: string) => this.request('albums', 'delete', { id }),
  };

  // --- Photos Repository ---
  public photos = {
    getByAlbumId: (albumId: string) => this.request('photos', 'findByAlbumId', { albumId }),
    getById: (id: string) => this.request('photos', 'findById', { id }),
    create: (data: any) => this.request('photos', 'create', data),
    update: (id: string, data: any) => this.request('photos', 'update', { id, data }),
    delete: (id: string) => this.request('photos', 'delete', { id }),
    search: (query: string) => this.request('photos', 'search', { query }),
  };

  // --- Orders Repository ---
  public orders = {
    getAll: () => this.request('orders', 'findAll'),
    getById: (id: string) => this.request('orders', 'findById', { id }),
    create: (data: any) => this.request('orders', 'create', data),
    update: (id: string, data: any) => this.request('orders', 'update', { id, data }),
  };

  // --- Users Repository ---
  public users = {
    getAll: () => this.request('users', 'findAll'),
    getById: (id: string) => this.request('users', 'findById', { id }),
  };

  // --- Settings Repository ---
  public settings = {
    getAll: () => this.request('settings', 'findAll'),
    get: (key: string) => this.request('settings', 'findByKey', { key }),
    set: (key: string, value: string) => this.request('settings', 'upsert', { key, value }),
  };

  // --- Products Repository ---
  public products = {
    getAll: () => this.request('products', 'findAll'),
    getByCategory: (category: string) => this.request('products', 'findByCategory', { category }),
  };
}

export const dataService = new DataService();
export default dataService;
