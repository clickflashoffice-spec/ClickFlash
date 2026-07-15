/**
 * Global setup for E2E tests
 *
 * Seeds test data (album + photos) via the backend API so that editor,
 * album, photo, export, and visual regression tests have data to work with.
 *
 * The backend uses CSRF protection:
 *   1. GET /api/health  -> establishes session cookie + XSRF-TOKEN cookie
 *   2. POST with Cookie header + x-csrf-token header
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8090";

const TEST_ALBUM = {
  id: "e2e-test-album-001",
  title: "E2E Test Album",
  date: "2026-01-15",
  status: "Draft",
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

/** Extract Set-Cookie values from a Response as a `Cookie:` header string */
function extractCookies(res: Response): string {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  // Each Set-Cookie looks like "NAME=VALUE; Path=/; ..."
  // We only need "NAME=VALUE" for the Cookie header
  return setCookies.map((sc) => sc.split(";")[0]).join("; ");
}

/** Extract the XSRF-TOKEN value from cookie string */
function extractXsrf(cookies: string): string {
  const match = cookies.match(/XSRF-TOKEN=([^;,\s]+)/);
  return match?.[1] ?? "";
}

async function globalSetup() {
  if (process.env.SKIP_GLOBAL_SETUP === "true") {
    console.log("[E2E Seed] Skipping global setup (SKIP_GLOBAL_SETUP=true)");
    return;
  }
  console.log("[E2E Seed] Starting global setup...");

  // Step 1: Establish a session by hitting health endpoint
  console.log("[E2E Seed] Establishing session...");
  let healthRes: Response | null = null;
  for (let i = 0; i < 30; i++) {
    try {
      healthRes = await fetch(`${BASE_URL}/api/health`);
      if (healthRes.ok) break;
    } catch (e) {
      // Backend not ready yet
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!healthRes || !healthRes.ok) {
    console.warn(`[E2E Seed] Health check failed (${healthRes?.status || "ECONNREFUSED"}) — seeding skipped`);
    return;
  }
  let cookies = extractCookies(healthRes);
  let xsrf = extractXsrf(cookies);
  console.log(`[E2E Seed] Session established, XSRF token: ${xsrf ? "OK" : "MISSING"}`);

  // Step 2: Login to get JWT
  console.log("[E2E Seed] Authenticating...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
      "x-csrf-token": xsrf,
    },
    body: JSON.stringify({
      email: "admin@clickflash.local",
      password: "ClickFlash2025!",
    }),
  });

  if (!loginRes.ok) {
    const body = await loginRes.text().catch(() => "");
    console.warn(`[E2E Seed] Login failed (${loginRes.status}): ${body} — seeding skipped`);
    return;
  }

  // Merge new cookies from login response (session is now authenticated)
  const loginCookies = extractCookies(loginRes);
  cookies = mergeCookies(cookies, loginCookies);
  xsrf = extractXsrf(cookies);

  const loginBody = await loginRes.json();
  const token = loginBody.token ?? loginBody.accessToken ?? loginBody.jwt;
  console.log(`[E2E Seed] Login successful, JWT: ${token ? "OK" : "MISSING"}`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Cookie: cookies,
    "x-csrf-token": xsrf,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Step 3: Create album
  console.log("[E2E Seed] Creating test album...");
  const albumRes = await fetch(`${BASE_URL}/api/collections/albums/records`, {
    method: "POST",
    headers,
    body: JSON.stringify(TEST_ALBUM),
  });
  if (albumRes.ok) {
    console.log("[E2E Seed] Album created");
  } else if (albumRes.status === 409) {
    console.log("[E2E Seed] Album already exists");
  } else {
    const body = await albumRes.text().catch(() => "");
    console.warn(`[E2E Seed] Album creation returned ${albumRes.status}: ${body}`);
  }

  // Step 4: Create photos
  for (const photo of TEST_PHOTOS) {
    console.log(`[E2E Seed] Creating photo ${photo.id}...`);
    const photoRes = await fetch(`${BASE_URL}/api/collections/photos/records`, {
      method: "POST",
      headers,
      body: JSON.stringify(photo),
    });
    if (photoRes.ok) {
      console.log(`[E2E Seed] Photo ${photo.id} created`);
    } else if (photoRes.status === 409) {
      console.log(`[E2E Seed] Photo ${photo.id} already exists`);
    } else {
      const body = await photoRes.text().catch(() => "");
      console.warn(`[E2E Seed] Photo ${photo.id} returned ${photoRes.status}: ${body}`);
    }
  }

  console.log("[E2E Seed] Global setup complete");
}

/** Merge two cookie strings, with newer values overriding older ones */
function mergeCookies(existing: string, newer: string): string {
  const map = new Map<string, string>();
  for (const cookie of existing.split("; ").filter(Boolean)) {
    const [name] = cookie.split("=", 1);
    map.set(name, cookie);
  }
  for (const cookie of newer.split("; ").filter(Boolean)) {
    const [name] = cookie.split("=", 1);
    map.set(name, cookie);
  }
  return [...map.values()].join("; ");
}

export default globalSetup;
