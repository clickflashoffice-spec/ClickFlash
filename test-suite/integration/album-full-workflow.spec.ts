import { test, expect } from '@playwright/test';
import { AlbumHelper } from './helpers/album';
import { PhotoHelper } from './helpers/photo';
import { OrderHelper } from './helpers/order';
import { CloudHelper } from './helpers/cloud';
import { TouchHelper } from './helpers/touch';

const TEST_ALBUM_PATH = 'C:/Users/alamo/Desktop/album';
const TEST_ALBUM_NAME = 'Production Test Album - June 2026';
const BASE_URL = 'http://localhost:8090';
const TOUCH_URL = 'http://localhost:8091';

test.describe('Cross-App Integration: Album Import → Touch → Order → Cloud', () => {
  test.beforeAll(async () => {
    // Verify test album exists
    const albumFiles = await AlbumHelper.getPhotoFiles(TEST_ALBUM_PATH);
    expect(albumFiles.length).toBeGreaterThanOrEqual(20);
    console.log(`✅ Test album verified: ${albumFiles.length} photos found`);
  });

  test('Step 1: Import album into Master', async ({ request }) => {
    // Create album
    const album = await request.post(`${BASE_URL}/api/albums`, {
      data: {
        title: TEST_ALBUM_NAME,
        description: 'Production test album with real photos',
        location: 'Test Studio',
        date: new Date().toISOString(),
      }
    });
    expect(album.status()).toBe(201);
    const albumData = await album.json();
    const albumId = albumData.id;

    // Import photos
    const files = await AlbumHelper.getPhotoFiles(TEST_ALBUM_PATH);
    for (const file of files) {
      const photo = await request.post(`${BASE_URL}/api/albums/${albumId}/photos`, {
        multipart: {
          file: {
            name: file,
            mimeType: 'image/jpeg',
            buffer: await AlbumHelper.readPhotoFile(TEST_ALBUM_PATH, file),
          },
          metadata: JSON.stringify({
            filename: file,
            originalName: file,
          }),
        }
      });
      expect(photo.status()).toBe(201);
    }

    // Verify all photos imported
    const photos = await request.get(`${BASE_URL}/api/albums/${albumId}/photos`);
    expect(photos.status()).toBe(200);
    const photosData = await photos.json();
    expect(photosData.length).toBe(files.length);

    console.log(`✅ Step 1: Imported ${photosData.length} photos into album ${albumId}`);
  });

  test('Step 2: Edit photos in Master', async ({ request }) => {
    // Get first album
    const albums = await request.get(`${BASE_URL}/api/albums`);
    expect(albums.status()).toBe(200);
    const albumsData = await albums.json();
    const album = albumsData.find((a: any) => a.title === TEST_ALBUM_NAME);
    expect(album).toBeDefined();

    // Get first photo
    const photos = await request.get(`${BASE_URL}/api/albums/${album.id}/photos`);
    const photosData = await photos.json();
    const photo = photosData[0];

    // Apply edit
    const edit = await request.post(`${BASE_URL}/api/photos/${photo.id}/edit`, {
      data: {
        enhance: true,
        filter: 'vintage',
        crop: { ratio: '4:5', x: 0, y: 0, width: 100, height: 100 },
        rotate: 90,
      }
    });
    expect(edit.status()).toBe(200);

    console.log(`✅ Step 2: Edited photo ${photo.id}`);
  });

  test('Step 3: Sync album to Touch Kiosk', async ({ request }) => {
    // Get album
    const albums = await request.get(`${BASE_URL}/api/albums`);
    const albumsData = await albums.json();
    const album = albumsData.find((a: any) => a.title === TEST_ALBUM_NAME);

    // Trigger sync to Touch
    const sync = await request.post(`${BASE_URL}/api/sync/albums`, {
      data: {
        albumId: album.id,
        target: 'touch',
        syncType: 'full',
      }
    });
    expect(sync.status()).toBe(200);

    // Verify Touch received album
    const touchAlbums = await request.get(`${TOUCH_URL}/api/albums`);
    expect(touchAlbums.status()).toBe(200);
    const touchData = await touchAlbums.json();
    const touchAlbum = touchData.find((a: any) => a.title === TEST_ALBUM_NAME);
    expect(touchAlbum).toBeDefined();

    console.log(`✅ Step 3: Synced album to Touch Kiosk`);
  });

  test('Step 4: Customer selects photos on Touch', async ({ request }) => {
    // Get album on Touch
    const albums = await request.get(`${TOUCH_URL}/api/albums`);
    const albumsData = await albums.json();
    const album = albumsData.find((a: any) => a.title === TEST_ALBUM_NAME);

    // Get photos
    const photos = await request.get(`${TOUCH_URL}/api/albums/${album.id}/photos`);
    const photosData = await photos.json();
    const selectedPhotos = photosData.slice(0, 5); // Select first 5

    // Create order
    const order = await request.post(`${TOUCH_URL}/api/orders`, {
      data: {
        albumId: album.id,
        photos: selectedPhotos.map((p: any) => p.id),
        customerEmail: 'test-customer@example.com',
        customerName: 'Test Customer',
        items: selectedPhotos.map((p: any) => ({
          photoId: p.id,
          productType: 'print_4x6',
          quantity: 1,
          price: 500, // $5.00 in cents
        })),
      }
    });
    expect(order.status()).toBe(201);
    const orderData = await order.json();

    console.log(`✅ Step 4: Created order ${orderData.id} with ${selectedPhotos.length} photos`);
  });

  test('Step 5: Master receives and processes order', async ({ request }) => {
    // Get orders on Master
    const orders = await request.get(`${BASE_URL}/api/orders`);
    expect(orders.status()).toBe(200);
    const ordersData = await orders.json();
    const order = ordersData.find((o: any) => o.customerEmail === 'test-customer@example.com');
    expect(order).toBeDefined();

    // Process payment (Stripe test mode)
    const payment = await request.post(`${BASE_URL}/api/orders/${order.id}/payment`, {
      data: {
        paymentMethod: 'stripe',
        stripeToken: 'tok_visa', // Test token
      }
    });
    expect(payment.status()).toBe(200);

    // Mark as fulfilled
    const fulfill = await request.patch(`${BASE_URL}/api/orders/${order.id}`, {
      data: { status: 'fulfilled' }
    });
    expect(fulfill.status()).toBe(200);

    console.log(`✅ Step 5: Processed order ${order.id}`);
  });

  test('Step 6: Cloud sync upload', async ({ request }) => {
    // Get album
    const albums = await request.get(`${BASE_URL}/api/albums`);
    const albumsData = await albums.json();
    const album = albumsData.find((a: any) => a.title === TEST_ALBUM_NAME);

    // Trigger cloud sync
    const sync = await request.post(`${BASE_URL}/api/sync/cloud`, {
      data: {
        albumId: album.id,
        syncType: 'full',
      }
    });
    expect(sync.status()).toBe(200);

    // Verify cloud health
    const cloudHealth = await request.get('https://gallery.clicketflash.com/api/health');
    expect(cloudHealth.status()).toBe(200);

    console.log(`✅ Step 6: Synced album to cloud`);
  });

  test('Step 7: Gallery publication', async ({ page }) => {
    // Get album
    const albums = await request.get(`${BASE_URL}/api/albums`);
    const albumsData = await albums.json();
    const album = albumsData.find((a: any) => a.title === TEST_ALBUM_NAME);

    // Publish to gallery
    const publish = await request.post(`${BASE_URL}/api/albums/${album.id}/publish`, {
      data: {
        visibility: 'public',
        allowDownloads: true,
        allowSharing: true,
      }
    });
    expect(publish.status()).toBe(200);
    const publishData = await publish.json();

    // Verify gallery page
    await page.goto(publishData.galleryUrl);
    await expect(page.locator('.gallery-container')).toBeVisible();
    await expect(page.locator('.gallery-photo')).toHaveCount(27);

    console.log(`✅ Step 7: Published gallery at ${publishData.galleryUrl}`);
  });

  test('Step 8: MoneyTrash upload for unsold photos', async ({ request }) => {
    // Get album
    const albums = await request.get(`${BASE_URL}/api/albums`);
    const albumsData = await albums.json();
    const album = albumsData.find((a: any) => a.title === TEST_ALBUM_NAME);

    // Get unsold photos
    const photos = await request.get(`${BASE_URL}/api/albums/${album.id}/photos`);
    const photosData = await photos.json();
    const unsoldPhotos = photosData.slice(5, 15); // 10 unsold photos

    // Upload to MoneyTrash
    for (const photo of unsoldPhotos) {
      const upload = await request.post(`${BASE_URL}/api/moneytrash/upload`, {
        data: {
          photoId: photo.id,
          pricing: {
            digital: 299, // $2.99
            print: 499,   // $4.99
          }
        }
      });
      expect(upload.status()).toBe(200);
    }

    console.log(`✅ Step 8: Uploaded ${unsoldPhotos.length} photos to MoneyTrash`);
  });

  test('Step 9: Analytics verification', async ({ request }) => {
    // Get album analytics
    const analytics = await request.get(`${BASE_URL}/api/analytics/albums`);
    expect(analytics.status()).toBe(200);
    const analyticsData = await analytics.json();

    // Verify metrics exist
    expect(analyticsData).toHaveProperty('totalAlbums');
    expect(analyticsData).toHaveProperty('totalPhotos');
    expect(analyticsData).toHaveProperty('totalOrders');
    expect(analyticsData).toHaveProperty('revenue');

    console.log(`✅ Step 9: Analytics verified`);
  });

  test('Step 10: Backup and recovery', async ({ request }) => {
    // Get album
    const albums = await request.get(`${BASE_URL}/api/albums`);
    const albumsData = await albums.json();
    const album = albumsData.find((a: any) => a.title === TEST_ALBUM_NAME);

    // Create backup
    const backup = await request.post(`${BASE_URL}/api/backup`, {
      data: {
        albumId: album.id,
        includePhotos: true,
        encrypt: true,
      }
    });
    expect(backup.status()).toBe(200);
    const backupData = await backup.json();

    // Verify backup file exists
    expect(backupData.backupPath).toBeDefined();
    expect(backupData.size).toBeGreaterThan(0);

    console.log(`✅ Step 10: Created backup at ${backupData.backupPath}`);
  });
});
