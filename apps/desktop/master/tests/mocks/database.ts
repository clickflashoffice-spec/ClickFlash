function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export interface MockUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface MockAlbum {
  id: string;
  name: string;
  description?: string;
  coverPhotoUrl?: string;
  photoCount?: number;
  eventDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MockPhoto {
  id: string;
  albumId: string;
  title?: string;
  url: string;
  thumbnailUrl?: string;
  category?: string;
  status?: string;
  rating?: number;
  version?: number;
  createdAt: string;
}

export interface MockOrder {
  id: string;
  orderNumber: string;
  status: string;
  clientName: string;
  clientEmail: string;
  items: Array<{ type: string; quantity: number; size?: string }>;
  total?: number;
  createdAt: string;
}

export interface MockDB {
  users: Map<string, MockUser>;
  albums: Map<string, MockAlbum>;
  photos: Map<string, MockPhoto>;
  orders: Map<string, MockOrder>;
  settings: Map<string, string>;
  faces: Map<string, unknown>;
  syncLogs: Map<string, unknown>;
  reset: () => void;
}

export const db: MockDB = {
  users: new Map(),
  albums: new Map(),
  photos: new Map(),
  orders: new Map(),
  settings: new Map(),
  faces: new Map(),
  syncLogs: new Map(),

  reset() {
    this.users.clear();
    this.albums.clear();
    this.photos.clear();
    this.orders.clear();
    this.settings.clear();
    this.faces.clear();
    this.syncLogs.clear();
    
    const adminId = generateId('user');
    this.users.set(adminId, {
      id: adminId,
      email: 'admin@localhost',
      password: 'admin123',
      name: 'Administrator',
      role: 'Admin',
      createdAt: new Date().toISOString(),
    });

    const albumId = generateId('album');
    this.albums.set(albumId, {
      id: albumId,
      name: 'Smith Wedding',
      description: 'Smith wedding ceremony and reception',
      coverPhotoUrl: '/photos/thumbs/sunset-1.jpg',
      photoCount: 150,
      eventDate: '2024-06-15T14:00:00Z',
      createdAt: new Date().toISOString(),
    });

    const photoId = generateId('photo');
    this.photos.set(photoId, {
      id: photoId,
      albumId: albumId,
      title: 'Sunset Portrait',
      url: '/photos/sunset-1.jpg',
      thumbnailUrl: '/photos/thumbs/sunset-1.jpg',
      category: 'print',
      status: 'approved',
      rating: 5,
      version: 1,
      createdAt: new Date().toISOString(),
    });

    const orderId = generateId('order');
    this.orders.set(orderId, {
      id: orderId,
      orderNumber: 'CF-2024-0001',
      status: 'paid',
      clientName: 'John Smith',
      clientEmail: 'john@example.com',
      items: [
        { type: 'print', quantity: 1, size: '8x10' },
        { type: 'canvas', quantity: 2, size: '16x20' },
      ],
      total: 299.99,
      createdAt: new Date().toISOString(),
    });

    this.settings.set('setup_completed', 'true');
    this.settings.set('deployment_completed', 'true');
  },
};

db.reset();

export function initializeDatabase(): void {
  db.reset();
}

export function resetDatabase(): void {
  db.reset();
}

export async function closeDatabase(): Promise<void> {
  db.users.clear();
  db.albums.clear();
  db.photos.clear();
  db.orders.clear();
  db.settings.clear();
  db.faces.clear();
  db.syncLogs.clear();
}
