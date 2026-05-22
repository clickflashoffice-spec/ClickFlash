/**
 * Global setup for E2E tests
 *
 * Seeds test data (album + photos) via the backend API so that editor,
 * album, photo, export, and visual regression tests have data to work with.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8090";

const TEST_ALBUM = {
  id: "e2e-test-album-001",
  title: "E2E Test Album",
  date: "2026-01-15",
  status: "imported",
  source: "e2e-test",
};

const TEST_PHOTOS = [
  {
    id: "e2e-photo-001",
    albumId: "e2e-test-album-001",
    url: "/test-placeholder.jpg",
    title: "Test Photo 1",
    originalFilename: "test1.jpg",
    mimeType: "image/jpeg",
    width: 1920,
    height: 1080,
  },
  {
    id: "e2e-photo-002",
    albumId: "e2e-test-album-001",
    url: "/test-placeholder.jpg",
    title: "Test Photo 2",
    originalFilename: "test2.jpg",
    mimeType: "image/jpeg",
    width: 1920,
    height: 1080,
  },
  {
    id: "e2e-photo-003",
    albumId: "e2e-test-album-001",
    url: "/test-placeholder.jpg",
    title: "Test Photo 3",
    originalFilename: "test3.jpg",
    mimeType: "image/jpeg",
    width: 1920,
    height: 1080,
  },
];

async function globalSetup() {
  console.log("[E2E Seed] Starting global setup...");

  // Step 1: Login to get JWT
  console.log("[E2E Seed] Authenticating...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@clickflash.local",
      password: "ClickFlash2025!",
    }),
  });

  if (!loginRes.ok) {
    console.warn(`[E2E Seed] Login failed (${loginRes.status}) — seeding skipped`);
    return;
  }

  const loginBody = await loginRes.json();
  const token = loginBody.token ?? loginBody.accessToken ?? loginBody.jwt;
  if (!token) {
    console.warn("[E2E Seed] No token in login response — seeding skipped");
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Step 2: Create album
  console.log("[E2E Seed] Creating test album...");
  const albumRes = await fetch(
    `${BASE_URL}/api/collections/albums/records`,
    { method: "POST", headers, body: JSON.stringify(TEST_ALBUM) },
  );
  if (albumRes.ok) {
    console.log("[E2E Seed] Album created");
  } else if (albumRes.status === 409) {
    console.log("[E2E Seed] Album already exists — skipping");
  } else {
    console.warn(`[E2E Seed] Album creation returned ${albumRes.status}`);
  }

  // Step 3: Create photos
  for (const photo of TEST_PHOTOS) {
    console.log(`[E2E Seed] Creating photo ${photo.id}...`);
    const photoRes = await fetch(
      `${BASE_URL}/api/collections/photos/records`,
      { method: "POST", headers, body: JSON.stringify(photo) },
    );
    if (photoRes.ok) {
      console.log(`[E2E Seed] Photo ${photo.id} created`);
    } else if (photoRes.status === 409) {
      console.log(`[E2E Seed] Photo ${photo.id} already exists — skipping`);
    } else {
      console.warn(`[E2E Seed] Photo ${photo.id} creation returned ${photoRes.status}`);
    }
  }

  console.log("[E2E Seed] Global setup complete");
}

export default globalSetup;
