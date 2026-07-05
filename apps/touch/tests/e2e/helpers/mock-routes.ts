import { Page } from "@playwright/test";

export const MOCK_PHOTO_URLS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1000&auto=format&fit=crop",
];

export const mockAlbums = [
  {
    id: "album_e2e_101",
    title: "Sunset Couples",
    date: "2025-10-24",
    photographerId: 2,
    source: "100_NIKON",
    roomNumber: "101",
    status: "Finalized",
    categories: '["Photo Session","Evening"]',
    kiosk_ready: 1,
    coverPhotoUrl: MOCK_PHOTO_URLS[1],
    created_at: "2025-10-24T00:00:00.000Z",
    updated_at: "2025-10-24T00:00:00.000Z",
    expand: {
      photos_via_album: [
        {
          id: "p1a1",
          title: "Golden Hour Kiss",
          url: MOCK_PHOTO_URLS[1],
          photographerId: 2,
          albumId: "album_e2e_101",
          collectionId: "photos",
          collectionName: "photos",
        },
        {
          id: "p1a2",
          title: "Walking on Beach",
          url: MOCK_PHOTO_URLS[0],
          photographerId: 2,
          albumId: "album_e2e_101",
          collectionId: "photos",
          collectionName: "photos",
        },
        {
          id: "p1a3",
          title: "Silhouette",
          url: MOCK_PHOTO_URLS[2],
          photographerId: 2,
          albumId: "album_e2e_101",
          collectionId: "photos",
          collectionName: "photos",
        },
      ],
    },
  },
  {
    id: "album_e2e_205",
    title: "Smith Family Fun",
    date: "2025-10-24",
    photographerId: 3,
    source: "101_CANON",
    roomNumber: "205",
    status: "Finalized",
    categories: '["Beach & Pool","Activities"]',
    kiosk_ready: 1,
    coverPhotoUrl: MOCK_PHOTO_URLS[0],
    created_at: "2025-10-24T00:00:00.000Z",
    updated_at: "2025-10-24T00:00:00.000Z",
    expand: {
      photos_via_album: [
        {
          id: "p2a1",
          title: "Jump Shot",
          url: MOCK_PHOTO_URLS[0],
          photographerId: 3,
          albumId: "album_e2e_205",
          collectionId: "photos",
          collectionName: "photos",
        },
      ],
    },
  },
];

export const mockProducts = [
  { id: "prod1", name: "Standard Print 10x15", category: "Print", price: 10, stock: 500, isFeatured: 1 },
  { id: "prod2", name: "Large Print 20x30", category: "Print", price: 25, stock: 100, isFeatured: 0 },
  { id: "prod3", name: "Digital Photo", category: "Digital", price: 15, stock: 9999, isFeatured: 1 },
];

export const mockPacks: Record<string, unknown>[] = [];

export const mockUsers = [
  { id: 1, name: "Admin User", email: "admin@local", role: "Admin", destinationId: "dest1" },
  { id: 2, name: "Jane Doe", email: "jane@example.com", role: "Photographer", destinationId: "dest1" },
];

export const mockDestinations = [
  { id: "dest1", name: "Test Resort", country: "Tunisia", type: "Resort", licenseKey: "TEST-001", featuresJSON: '{"ai":true,"face":true,"watermark":true}' },
];

export async function installMockRoutes(page: Page) {
  await page.route("**/api/collections/albums/records*", async (route) => {
    const url = route.request().url();
    if (url.includes("filter=kiosk_ready%3D1") || url.includes("filter=kiosk_ready=1")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: mockAlbums, page: 1, perPage: 50, totalItems: mockAlbums.length, totalPages: 1 }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], page: 1, perPage: 50, totalItems: 0, totalPages: 1 }),
      });
    }
  });

  await page.route("**/api/collections/photos/records*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], page: 1, perPage: 50, totalItems: 0, totalPages: 1 }),
    });
  });

  await page.route("**/api/collections/products/records*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: mockProducts, page: 1, perPage: 50, totalItems: mockProducts.length, totalPages: 1 }),
    });
  });

  await page.route("**/api/collections/packs/records*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: mockPacks, page: 1, perPage: 50, totalItems: 0, totalPages: 1 }),
    });
  });

  await page.route("**/api/collections/users/records*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: mockUsers, page: 1, perPage: 50, totalItems: mockUsers.length, totalPages: 1 }),
    });
  });

  await page.route("**/api/collections/destinations/records*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: mockDestinations, page: 1, perPage: 50, totalItems: mockDestinations.length, totalPages: 1 }),
    });
  });

  await page.route("**/api/collections/settings/records*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], page: 1, perPage: 50, totalItems: 0, totalPages: 1 }),
    });
  });

  // Health checks pass through to real backend
  await page.route("**/api/health", async (route) => route.continue());

  // Heartbeat to master can be aborted safely
  await page.route("**/api/kiosk/heartbeat", async (route) => {
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });
}
