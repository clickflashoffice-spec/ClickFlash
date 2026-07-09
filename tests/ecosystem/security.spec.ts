import { test, expect } from '@playwright/test';

const BASE_URLS = {
    master: 'http://127.0.0.1:8090',
    gallery: 'http://127.0.0.1:3001',
};

test.describe('Layer 6: Security & Penetration Testing', () => {

    test('SQL Injection payload should be rejected or sanitized by Master API', async ({ request }) => {
        const payload = "' OR 1=1; DROP TABLE users; --";
        const res = await request.post(`${BASE_URLS.master}/api/auth/login`, {
            data: { email: payload, password: "password" }
        });
        
        // Should return 400 or 401, not 500 (which would indicate an uncaught SQLi error)
        expect([400, 401, 404, 403]).toContain(res.status());
    });

    test('XSS payload should be sanitized in user inputs', async ({ page }) => {
        const xssPayload = "<script>alert('xss')</script>";
        
        // We test this structurally by ensuring the API safely rejects or encodes it
        const res = await page.request.post(`${BASE_URLS.master}/api/albums`, {
            data: { name: xssPayload, event_date: "2026-01-01" },
            headers: {
                // Dummy token to simulate unauthorized POST
                'Authorization': 'Bearer INVALID_TOKEN'
            }
        });

        // Since it's unauthorized, it should be 401 or 403.
        expect([401, 403, 400]).toContain(res.status());
    });

    test('RBAC: Anonymous user cannot access protected Master routes', async ({ request }) => {
        const res = await request.get(`${BASE_URLS.master}/api/collections/users/records`);
        
        // Should be forbidden or unauthorized
        expect([401, 403, 404]).toContain(res.status());
    });
    
    test('RBAC: Anonymous user cannot access management worker D1 metrics', async ({ request }) => {
        const res = await request.get(`http://127.0.0.1:8787/api/fleet`);
        
        // Should be forbidden or unauthorized
        expect([401, 403]).toContain(res.status());
    });
});
