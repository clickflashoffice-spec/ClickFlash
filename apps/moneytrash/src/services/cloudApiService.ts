/**
 * Cloudflare Cloud API Service for MoneyTrash
 * Handles communication with the Cloudflare Worker API
 */

import { invoke } from '@tauri-apps/api/core';

interface CloudConfig {
  apiUrl: string;
  deskId: string;
  apiKey: string;
  token?: string;
}

interface UploadInitResponse {
  sessionId: string;
  expiresAt: string;
  chunkSize: number;
}

interface UploadProgressResponse {
  received: boolean;
  chunkIndex: number;
  uploadedChunks: number;
  totalChunks: number;
  progress: number;
}

interface FinalizeResponse {
  success: boolean;
  galleryUrl: string;
  assetId: string;
  accessCode: string;
}

interface GalleryCreateResponse {
  success: boolean;
  gallery: {
    id: string;
    accessCode: string;
    name: string;
    url: string;
  };
}

class CloudApiService {
  private config: CloudConfig | null = null;

  /**
   * Configure the service with API credentials
   */
  configure(config: CloudConfig): void {
    this.config = config;
  }

  /**
   * Verify office credentials and get JWT token
   */
  async verifyOffice(deskId: string, apiKey: string): Promise<{ token: string; office: any }> {
    const response = await fetch(`${this.getApiUrl()}/api/office/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deskId, apiKey }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Verification failed');
    }

    const data = await response.json();
    
    // Store token
    if (this.config) {
      this.config.token = data.token;
    }

    return data;
  }

  /**
   * Register a new office (requires master API key)
   */
  async registerOffice(registration: {
    deskId: string;
    name: string;
    contactEmail: string;
    masterApiKey: string;
  }): Promise<any> {
    const response = await fetch(`${this.getApiUrl()}/api/office/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deskId: registration.deskId,
        name: registration.name,
        contactEmail: registration.contactEmail,
        apiKey: registration.masterApiKey,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    return response.json();
  }

  /**
   * Initialize chunked upload session
   */
  async initUpload(params: {
    fileName: string;
    fileSize: number;
    totalChunks: number;
    metadata: {
      event_name: string;
      access_code: string;
      mode: 'moneytrash' | 'sold';
      mime_type: string;
      customer_email?: string;
      single_photo_price?: string;
      full_gallery_price?: string;
    };
  }): Promise<UploadInitResponse> {
    const response = await fetch(`${this.getApiUrl()}/api/upload/chunk/init`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to initialize upload');
    }

    return response.json();
  }

  /**
   * Upload a chunk using Tauri's native HTTP for better performance
   */
  async uploadChunk(
    sessionId: string,
    chunkIndex: number,
    chunkData: Uint8Array
  ): Promise<UploadProgressResponse> {
    // Use Tauri's native HTTP plugin for better large file handling
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('chunk', new Blob([chunkData as unknown as ArrayBuffer]));

    const response = await fetch(`${this.getApiUrl()}/api/upload/chunk`, {
      method: 'PUT',
      headers: {
        'Authorization': this.getAuthHeader(),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Chunk upload failed');
    }

    return response.json();
  }

  /**
   * Finalize upload and create gallery/order
   */
  async finalizeUpload(sessionId: string): Promise<FinalizeResponse> {
    const response = await fetch(`${this.getApiUrl()}/api/upload/chunk/finalize`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to finalize upload');
    }

    return response.json();
  }

  /**
   * Cancel upload and clean up
   */
  async cancelUpload(sessionId: string): Promise<void> {
    const response = await fetch(`${this.getApiUrl()}/api/upload/chunk/cancel`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel upload');
    }
  }

  /**
   * Create a gallery
   */
  async createGallery(params: {
    name: string;
    accessCode: string;
    description?: string;
    settings?: {
      singlePhotoPrice?: number;
      fullGalleryPrice?: number;
      watermarkEnabled?: boolean;
      allowDownloads?: boolean;
    };
  }): Promise<GalleryCreateResponse> {
    const response = await fetch(`${this.getApiUrl()}/api/galleries`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create gallery');
    }

    return response.json();
  }

  /**
   * Get gallery by access code
   */
  async getGallery(accessCode: string): Promise<any> {
    const response = await fetch(`${this.getApiUrl()}/api/galleries/${accessCode}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Gallery not found');
    }

    return response.json();
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    const response = await fetch(`${this.getApiUrl()}/api/health`);
    return response.json();
  }

  /**
   * Get stored configuration from Tauri storage
   */
  async loadConfig(): Promise<CloudConfig | null> {
    try {
      const config = await invoke<CloudConfig>('load_cloud_config');
      this.config = config;
      return config;
    } catch (e) {
      console.log('No cloud config found');
      return null;
    }
  }

  /**
   * Save configuration to Tauri storage
   */
  async saveConfig(config: CloudConfig): Promise<void> {
    await invoke('save_cloud_config', { config });
    this.config = config;
  }

  public getApiUrl(): string {
    if (!this.config) {
      return '';
    }
    return this.config.apiUrl.replace(/\/$/, '');
  }

  public getApiKey(): string {
    return this.config?.apiKey || this.config?.token || '';
  }

  private getAuthHeader(): string {
    if (!this.config?.token) {
      throw new Error('Not authenticated');
    }
    return `Bearer ${this.config.token}`;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Desk-Id': this.config?.deskId || '',
    };

    if (this.config?.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    }

    return headers;
  }
}

export const cloudApiService = new CloudApiService();
