/**
 * Global teardown for E2E tests
 *
 * Cleans up test data seeded by global-setup.ts.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8090";

const PHOTO_IDS = ["e2e-photo-001", "e2e-photo-002", "e2e-photo-003"];
const ALBUM_ID = "e2e-test-album-001";

async function globalTeardown() {
  if (process.env.SKIP_GLOBAL_SETUP === "true") {
    console.log("[E2E Teardown] Skipping global teardown (SKIP_GLOBAL_SETUP=true)");
    return;
  }
  console.log("[E2E Teardown] Starting cleanup...");

  // Login to get JWT
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@clickflash.local",
      password: "ClickFlash2025!",
    }),
  });

  if (!loginRes.ok) {
    console.warn(`[E2E Teardown] Login failed (${loginRes.status}) — cleanup skipped`);
    return;
  }

  const loginBody = await loginRes.json();
  const token = loginBody.token ?? loginBody.accessToken ?? loginBody.jwt;
  if (!token) {
    console.warn("[E2E Teardown] No token in login response — cleanup skipped");
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Delete photos first (foreign key to album)
  for (const photoId of PHOTO_IDS) {
    const res = await fetch(
      `${BASE_URL}/api/collections/photos/records/${photoId}`,
      { method: "DELETE", headers },
    );
    if (res.ok) {
      console.log(`[E2E Teardown] Deleted photo ${photoId}`);
    } else if (res.status === 404) {
      console.log(`[E2E Teardown] Photo ${photoId} already gone`);
    } else {
      console.warn(`[E2E Teardown] Photo ${photoId} delete returned ${res.status}`);
    }
  }

  // Delete album
  const albumRes = await fetch(
    `${BASE_URL}/api/collections/albums/records/${ALBUM_ID}`,
    { method: "DELETE", headers },
  );
  if (albumRes.ok) {
    console.log(`[E2E Teardown] Deleted album ${ALBUM_ID}`);
  } else if (albumRes.status === 404) {
    console.log(`[E2E Teardown] Album ${ALBUM_ID} already gone`);
  } else {
    console.warn(`[E2E Teardown] Album delete returned ${albumRes.status}`);
  }

  console.log("[E2E Teardown] Global teardown complete");
}

export default globalTeardown;
