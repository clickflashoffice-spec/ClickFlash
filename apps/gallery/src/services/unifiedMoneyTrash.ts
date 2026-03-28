/**
 * Unified Money Trash Integration Architecture
 * 
 * Master App (Primary): Automatic photo retention + albums
 * Money Trash Uploader (Secondary): Manual upload gateway  
 * Customer Gallery (Destination): Customer purchase interface
 */

import { EventEmitter } from 'events';

interface MoneyTrashSource {
  type: 'master' | 'uploader';
  id: string;
  name: string;
  url: string;
  lastSync: Date;
  status: 'active' | 'inactive';
}

interface UnifiedTrashPhoto {
  id: string;
  source: 'master' | 'uploader';
  sourceId: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  originalPrice: number;
  discountPrice: number;
  discountPercentage: number;
  archivedAt: Date;
  expiresAt: Date;
  daysRemaining: number;
  albumName?: string;
  eventDate?: string;
  metadata?: {
    width: number;
    height: number;
    size: number;
  };
}

interface UnifiedTrashGallery {
  accessCode: string;
  eventName: string;
  sources: MoneyTrashSource[];
  photos: UnifiedTrashPhoto[];
  totalCount: number;
  expiresAt: Date;
  discountConfig: {
    percentage: number;
    validUntil: Date;
  };
}

class UnifiedMoneyTrashIntegration extends EventEmitter {
  private sources: Map<string, MoneyTrashSource> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * Register a Money Trash source (Master App or Uploader)
   */
  registerSource(source: Omit<MoneyTrashSource, 'lastSync'>): MoneyTrashSource {
    const fullSource: MoneyTrashSource = {
      ...source,
      lastSync: new Date()
    };
    
    this.sources.set(source.id, fullSource);
    this.emit('source:registered', fullSource);
    
    console.log(`[MoneyTrash] Registered source: ${source.name} (${source.type})`);
    return fullSource;
  }

  /**
   * Fetch unified gallery from all sources
   */
  async fetchUnifiedGallery(accessCode: string): Promise<UnifiedTrashGallery | null> {
    const photos: UnifiedTrashPhoto[] = [];
    const sources: MoneyTrashSource[] = [];
    
    // Fetch from all registered sources
    for (const [sourceId, source] of this.sources) {
      if (source.status !== 'active') continue;
      
      try {
        const gallery = await this.fetchFromSource(source, accessCode);
        if (gallery) {
          photos.push(...gallery.photos);
          sources.push({
            ...source,
            lastSync: new Date()
          });
        }
      } catch (error) {
        console.error(`[MoneyTrash] Failed to fetch from ${source.name}:`, error);
      }
    }
    
    if (photos.length === 0) return null;
    
    // Sort by expiration (most urgent first)
    photos.sort((a, b) => a.daysRemaining - b.daysRemaining);
    
    return {
      accessCode,
      eventName: photos[0]?.albumName || 'Archived Photos',
      sources,
      photos,
      totalCount: photos.length,
      expiresAt: new Date(Math.max(...photos.map(p => p.expiresAt.getTime()))),
      discountConfig: {
        percentage: photos[0]?.discountPercentage || 50,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    };
  }

  /**
   * Fetch from individual source
   */
  private async fetchFromSource(
    source: MoneyTrashSource, 
    accessCode: string
  ): Promise<{ photos: UnifiedTrashPhoto[] } | null> {
    const endpoint = source.type === 'master'
      ? `${source.url}/api/cloud/gallery/${accessCode}`
      : `${source.url}/api/gallery/${accessCode}`;
    
    try {
      const response = await fetch(endpoint, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      return {
        photos: (data.photos || []).map((p: any) => this.transformPhoto(p, source))
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Transform photo from any source to unified format
   */
  private transformPhoto(photo: any, source: MoneyTrashSource): UnifiedTrashPhoto {
    const now = new Date();
    const expiresAt = new Date(photo.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000);
    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const originalPrice = photo.originalPrice || 15;
    const discountPercentage = photo.discountPercentage || 50;
    const discountPrice = Math.round(originalPrice * (1 - discountPercentage / 100) * 100) / 100;
    
    return {
      id: photo.id,
      source: source.type,
      sourceId: source.id,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl || photo.url,
      title: photo.title || 'Archived Photo',
      originalPrice,
      discountPrice,
      discountPercentage,
      archivedAt: new Date(photo.archivedAt || photo.createdAt),
      expiresAt,
      daysRemaining,
      albumName: photo.albumName || photo.album?.title,
      eventDate: photo.eventDate,
      metadata: photo.metadata
    };
  }

  /**
   * Purchase photo from trash
   */
  async purchasePhoto(
    photoId: string,
    sourceType: 'master' | 'uploader',
    orderDetails: {
      orderId: string;
      customerEmail: string;
      paymentMethod: 'stripe' | 'cash';
    }
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    const source = Array.from(this.sources.values())
      .find(s => s.type === sourceType && s.status === 'active');
    
    if (!source) {
      return { success: false, error: 'Source not available' };
    }
    
    try {
      const endpoint = source.type === 'master'
        ? `${source.url}/api/cloud/recover`
        : `${source.url}/api/purchase`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId,
          ...orderDetails
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message };
      }
      
      const result = await response.json();
      
      this.emit('photo:purchased', {
        photoId,
        source: sourceType,
        orderId: orderDetails.orderId
      });
      
      return {
        success: true,
        downloadUrl: result.downloadUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
  }

  /**
   * Start automatic sync
   */
  startAutoSync(intervalMinutes: number = 5): void {
    if (this.syncInterval) clearInterval(this.syncInterval);
    
    this.syncInterval = setInterval(() => {
      this.emit('sync:start');
      
      // Health check all sources
      for (const [id, source] of this.sources) {
        this.checkSourceHealth(id);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Check source health
   */
  private async checkSourceHealth(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) return;
    
    try {
      const response = await fetch(`${source.url}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const wasActive = source.status === 'active';
      const isActive = response.ok;
      
      source.status = isActive ? 'active' : 'inactive';
      source.lastSync = new Date();
      
      if (wasActive && !isActive) {
        this.emit('source:offline', source);
      } else if (!wasActive && isActive) {
        this.emit('source:online', source);
      }
    } catch (error) {
      source.status = 'inactive';
      this.emit('source:error', source, error);
    }
  }

  /**
   * Get source statistics
   */
  getSourceStats(): Array<{
    source: MoneyTrashSource;
    photoCount: number;
    lastSync: Date;
    health: 'healthy' | 'degraded' | 'offline';
  }> {
    return Array.from(this.sources.values()).map(source => ({
      source,
      photoCount: 0, // Would be populated from actual data
      lastSync: source.lastSync,
      health: source.status === 'active' 
        ? (Date.now() - source.lastSync.getTime() < 300000 ? 'healthy' : 'degraded')
        : 'offline'
    }));
  }

  /**
   * Stop auto sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Remove source
   */
  removeSource(sourceId: string): boolean {
    const source = this.sources.get(sourceId);
    if (!source) return false;
    
    this.sources.delete(sourceId);
    this.emit('source:removed', source);
    return true;
  }
}

// Export singleton
export const unifiedMoneyTrash = new UnifiedMoneyTrashIntegration();
export type { MoneyTrashSource, UnifiedTrashPhoto, UnifiedTrashGallery };
