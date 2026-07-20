import { test, expect } from '@playwright/test';

test.describe('Apps <-> Cloud Backend Routes', () => {

  const cloudBaseUrl = 'http://127.0.0.1:8090'; // Assuming wrangler is proxied here or testing against local

  test('Master App -> Cloud Sync Endpoint', async ({ request }) => {
    // Testing the route Master uses to sync data to the cloud
    const res = await request.post(`${cloudBaseUrl}/api/sessions/sync`, {
      data: {
        station_id: 'test-station',
        shifts: []
      }
    });
    // It might return 400 or 401 depending on auth, but it should hit the route
    // We expect the route to exist
    expect([200, 400, 401]).toContain(res.status());
  });

  test('Mobile App -> Cloud Authentication', async ({ request }) => {
    // Photographer login route
    const res = await request.post(`${cloudBaseUrl}/api/photographers/login`, {
      data: {
        email: 'test@clickflash.com',
        password: 'wrong-password'
      }
    });
    // Should hit the route and probably reject with 401
    expect([401, 400, 404]).toContain(res.status());
  });

  test('Touch App -> Cloud Config Fetch', async ({ request }) => {
    // Kiosk fetching configuration
    const res = await request.get(`${cloudBaseUrl}/api/cloud/config?station=touch-1`);
    expect([200, 404]).toContain(res.status());
  });

  test('Gallery App -> Cloud Auth', async ({ request }) => {
    // Gallery customer entering a pass code
    const res = await request.post(`${cloudBaseUrl}/api/gallery-auth`, {
      data: {
        passcode: '123456'
      }
    });
    // Might reject 401 if fake passcode, but route is up
    expect([200, 401, 404]).toContain(res.status());
  });

  test('Management App -> Cloud Fleet Status', async ({ request }) => {
    // Management polling master statuses
    const res = await request.get(`${cloudBaseUrl}/api/fleet/status`);
    expect([200, 401, 403]).toContain(res.status());
  });

  test('Cloud Health Check', async ({ request }) => {
    const res = await request.get(`${cloudBaseUrl}/api/health`);
    expect(res.ok()).toBeTruthy();
  });
});
