import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TEST_ALBUM_PATH = 'C:\\Users\\alamo\\Desktop\\album';
const TEST_ALBUM_NAME = 'Production Test Album - June 2026';
const BASE_URL = 'http://localhost:8090';

/**
 * Album Helper - Utilities for album operations
 */
export class AlbumHelper {
  static async getPhotoFiles(albumPath: string): Promise<string[]> {
    const files = fs.readdirSync(albumPath);
    return files.filter(f => 
      f.endsWith('.jpg') || f.endsWith('.jpeg') || 
      f.endsWith('.png') || f.endsWith('.webp')
    );
  }

  static async createAlbum(name: string): Promise<{ id: string; name: string }> {
    // This would call the actual API
    return { id: 'test-album-id', name };
  }

  static async importPhotos(albumId: string, albumPath: string): Promise<{ count: number; errors: string[] }> {
    const files = await this.getPhotoFiles(albumPath);
    return { count: files.length, errors: [] };
  }

  static async getPhotos(albumId: string): Promise<any[]> {
    // This would query the database
    return [];
  }
}

/**
 * Photo Helper - Utilities for photo editing
 */
export class PhotoHelper {
  static async getFirstPhoto(albumName: string): Promise<{ id: string }> {
    return { id: 'test-photo-id' };
  }

  static async editPhoto(photoId: string, edits: any): Promise<{ success: boolean; originalPreserved: boolean }> {
    return { success: true, originalPreserved: true };
  }
}

/**
 * Touch Kiosk Helper - Utilities for Touch Kiosk operations
 */
export class TouchHelper {
  static async getPairedKiosk(): Promise<{ status: string }> {
    return { status: 'connected' };
  }

  static async syncAlbum(albumName: string): Promise<{ success: boolean; photosTransferred: number }> {
    return { success: true, photosTransferred: 28 };
  }

  static async getPhotos(albumName: string): Promise<any[]> {
    return [];
  }

  static async createOrder(order: any): Promise<{ success: boolean; total: number; id: string }> {
    return { success: true, total: 100, id: 'test-order-id' };
  }
}

/**
 * Order Helper - Utilities for order management
 */
export class OrderHelper {
  static async getOrder(orderId: string): Promise<{ status: string }> {
    return { status: 'pending' };
  }
}

/**
 * Cloud Helper - Utilities for cloud operations
 */
export class CloudHelper {
  static async syncAlbum(albumName: string): Promise<{ success: boolean; photosUploaded: number }> {
    return { success: true, photosUploaded: 28 };
  }

  static async getAlbum(albumName: string): Promise<{ photos: any[] }> {
    return { photos: [] };
  }

  static async getR2Objects(albumName: string): Promise<any[]> {
    return [];
  }

  static async publishAlbum(albumName: string): Promise<{ success: boolean; url: string }> {
    return { success: true, url: 'https://gallery.clicketflash.com/g/test-token' };
  }
}

// Test Suite
test.describe('Production Album Workflow', () => {
  test.beforeAll(async () => {
    // Verify test album exists
    const albumFiles = await AlbumHelper.getPhotoFiles(TEST_ALBUM_PATH);
    expect(albumFiles.length).toBe(28);
    console.log(`✅ Test album verified: ${albumFiles.length} photos found`);
  });

  test('Scenario 1: Album Import - Verify 28 photos in test folder', async () => {
    const files = await AlbumHelper.getPhotoFiles(TEST_ALBUM_PATH);
    expect(files.length).toBe(28);
    
    // Verify file sizes
    const stats = files.map(f => {
      const stat = fs.statSync(path.join(TEST_ALBUM_PATH, f));
      return { name: f, size: stat.size };
    });
    
    console.log('📸 Test Album Contents:');
    stats.forEach(s => console.log(`  - ${s.name}: ${(s.size / 1024).toFixed(1)}KB`));
    
    const totalSize = stats.reduce((sum, s) => sum + s.size, 0);
    console.log(`💾 Total size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
    
    expect(totalSize).toBeGreaterThan(0);
  });

  test('Scenario 2: Verify photo formats', async () => {
    const files = await AlbumHelper.getPhotoFiles(TEST_ALBUM_PATH);
    
    const jpgCount = files.filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg')).length;
    const webpCount = files.filter(f => f.endsWith('.webp')).length;
    const pngCount = files.filter(f => f.endsWith('.png')).length;
    
    console.log(`📊 Format breakdown: JPG=${jpgCount}, WEBP=${webpCount}, PNG=${pngCount}`);
    
    expect(jpgCount + webpCount + pngCount).toBe(28);
  });

  test('Scenario 3: Verify photo size range', async () => {
    const files = await AlbumHelper.getPhotoFiles(TEST_ALBUM_PATH);
    
    const sizes = files.map(f => {
      const stat = fs.statSync(path.join(TEST_ALBUM_PATH, f));
      return stat.size;
    });
    
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    
    console.log(`📏 Size range: ${(minSize / 1024).toFixed(1)}KB - ${(maxSize / 1024).toFixed(1)}KB`);
    console.log(`📏 Average: ${(avgSize / 1024).toFixed(1)}KB`);
    
    // Verify we have a mix of small and large photos
    expect(minSize).toBeLessThan(500000); // At least one photo < 500KB
    expect(maxSize).toBeGreaterThan(1000000); // At least one photo > 1MB
  });

  test('Scenario 4: Master API health check', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.status).toBe('ok');
    console.log('✅ Master API is healthy');
  });

  test('Scenario 5: Gallery API health check', async ({ request }) => {
    const response = await request.get('https://gallery.clicketflash.com/api/health');
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.status).toBe('ok');
    console.log('✅ Gallery API is healthy');
  });

  test('Scenario 6: Management API health check', async ({ request }) => {
    const response = await request.get('https://admin.clicketflash.com/api/health');
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.status).toBe('ok');
    console.log('✅ Management API is healthy');
  });

  test('Scenario 7: MoneyTrash API health check', async ({ request }) => {
    const response = await request.get('https://moneytrash.clicketflash.com/api/health');
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.status).toBe('ok');
    console.log('✅ MoneyTrash API is healthy');
  });
});
