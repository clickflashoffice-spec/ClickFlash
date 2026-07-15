import { test, expect } from '@playwright/test';

test.describe('Layer 4: Cross-App Sync Gauntlet', () => {
  test('Touch should have mDNS discovery endpoint available', async ({ request }) => {
    // The touch backend runs on port 8091 in E2E
    const res = await request.post('http://127.0.0.1:8091/api/pairing/discover');
    
    expect(res.ok()).toBeTruthy();
    
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.masters)).toBeTruthy();
  });

  test('Touch should properly forward pairing token to Master for validation', async ({ request }) => {
    // This will hit the Touch backend, which forwards it to Master (8090)
    const res = await request.post('http://127.0.0.1:8091/api/pairing/complete', {
      data: {
        masterIp: '127.0.0.1',
        port: 8090,
        pairingToken: 'INVALID_E2E_TOKEN',
        kioskId: 'TEST_KIOSK_L4',
        kioskName: 'E2E Test Kiosk'
      }
    });

    // The Touch backend should return a 400 or 404 because Master rejects the invalid token
    // Our fix maps Master's 404/410 to the response appropriately.
    expect(res.status()).toBeGreaterThanOrEqual(400);
    
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('Invalid or expired pairing token'); // Master's specific error message propagates
  });

  test('Touch should successfully pair with a valid token and configure Master WebSocket', async ({ request }) => {
    // 1. Generate a valid token in Master (8090)
    const validToken = 'VALID_E2E_TOKEN_123';
    const registerRes = await request.post('http://127.0.0.1:8090/api/pairing/register', {
      data: {
        pairingToken: validToken,
        kioskId: 'TEST_KIOSK_L4_VALID',
        kioskName: 'E2E Test Kiosk Valid',
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      }
    });
    expect(registerRes.ok()).toBeTruthy();

    // 2. Pair using the Touch backend (8091), pointing to Master (8090)
    const res = await request.post('http://127.0.0.1:8091/api/pairing/complete', {
      data: {
        masterIp: '127.0.0.1',
        port: 8090,
        pairingToken: validToken,
        kioskId: 'TEST_KIOSK_L4_VALID',
        kioskName: 'E2E Test Kiosk Valid'
      }
    });

    expect(res.ok()).toBeTruthy();
    
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.kioskId).toBeDefined();
    expect(body.syncTest).toBeDefined();
  });
});
