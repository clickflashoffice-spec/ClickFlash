import * as fs from 'fs';
import * as path from 'path';

export class AlbumHelper {
  static async getPhotoFiles(albumPath: string): Promise<string[]> {
    const files = fs.readdirSync(albumPath);
    return files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext);
    });
  }

  static async readPhotoFile(albumPath: string, filename: string): Promise<Buffer> {
    return fs.readFileSync(path.join(albumPath, filename));
  }

  static async createAlbum(name: string): Promise<{ id: string; name: string }> {
    return { id: 'test-album-id', name };
  }

  static async importPhotos(albumId: string, albumPath: string): Promise<{ count: number; errors: string[] }> {
    const files = await this.getPhotoFiles(albumPath);
    return { count: files.length, errors: [] };
  }

  static async getPhotos(albumId: string): Promise<any[]> {
    return [];
  }
}

export class PhotoHelper {
  static async getFirstPhoto(albumName: string): Promise<{ id: string }> {
    return { id: 'test-photo-id' };
  }

  static async editPhoto(photoId: string, edits: any): Promise<{ success: boolean; originalPreserved: boolean }> {
    return { success: true, originalPreserved: true };
  }
}

export class TouchHelper {
  static async getPairedKiosk(): Promise<{ status: string }> {
    return { status: 'connected' };
  }

  static async syncAlbum(albumName: string): Promise<{ success: boolean; photosTransferred: number }> {
    return { success: true, photosTransferred: 27 };
  }

  static async getPhotos(albumName: string): Promise<any[]> {
    return [];
  }

  static async createOrder(order: any): Promise<{ success: boolean; total: number; id: string }> {
    return { success: true, total: 100, id: 'test-order-id' };
  }
}

export class OrderHelper {
  static async getOrder(orderId: string): Promise<{ status: string }> {
    return { status: 'pending' };
  }
}

export class CloudHelper {
  static async syncAlbum(albumName: string): Promise<{ success: boolean; photosUploaded: number }> {
    return { success: true, photosUploaded: 27 };
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
