
// import fetch from 'node-fetch'; // Removed to rely on global fetch
import FormData from 'form-data';
import { logger } from '@/utils/logger';

// --- Configuration ---
const BASE_URL = 'http://localhost:8090'; // Assuming default port
const USER_EMAIL = process.env.TEST_EMAIL || 'admin@clickflash.local';
const USER_PASSWORD = process.env.TEST_PASSWORD || (() => { logger.error('Set TEST_PASSWORD env var'); process.exit(1); return ''; })();

// Polyfill fetch if needed (Node 18+ has it globally, but for safety in TS if types are weird)
// @ts-ignore
const fetchClient = global.fetch;

async function runVerification() {
    logger.info('🚀 Starting System Integration Verification...');

    let cookie = '';
    let albumId = '';

    // 1. Health Check
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        logger.info('📡 Pinging server...');
        const healthRes = await fetchClient(`${BASE_URL}/api/health`, { signal: controller.signal });
        clearTimeout(timeout);

        if (!healthRes.ok) throw new Error('Server not reachable');
        logger.info('✅ Server is online');
    } catch (e: any) {
        logger.error(`❌ Server check failed: ${e.message}`);
        if (e.name === 'AbortError') logger.error('   (Request timed out)');
        logger.error('   Please ensure backend is running via "npm run dev:backend"');
        process.exit(1);
    }

    // 2. Authentication
    try {
        logger.info('🔑 Authenticating...');
        const loginRes = await fetchClient(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD })
        });

        if (!loginRes.ok) {
            const text = await loginRes.text();
            throw new Error(`Login failed: ${loginRes.status} ${text}`);
        }

        const setCookie = loginRes.headers.get('set-cookie');
        if (setCookie) {
            cookie = setCookie.split(';')[0];
            logger.info('✅ Authenticated successfully');
        } else {
            logger.warn('⚠️ No Set-Cookie header received. Proceeding, but subsequent requests might fail.');
        }

    } catch (e: any) {
        logger.error(`❌ Authentication Error: ${e.message}`);
        process.exit(1);
    }

    // 3. Create Test Album
    try {
        logger.info('📁 Creating Test Album...');
        const albumRes = await fetchClient(`${BASE_URL}/api/collections/albums/records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookie
            },
            body: JSON.stringify({
                title: 'Integration Test Album ' + Date.now(),
                date: new Date().toISOString().split('T')[0],
                status: 'New'
            })
        });

        if (!albumRes.ok) throw new Error(`Album creation failed: ${albumRes.status}`);
        const albumData = await albumRes.json() as any;
        albumId = albumData.id;
        logger.info(`✅ Album created: ${albumId}`);

    } catch (e: any) {
        logger.error(`❌ Album Creation Error: ${e.message}`);
        process.exit(1);
    }

    // 4. Concurrent Image Uploads (Simulating Zero-Block IO)
    try {
        logger.info('📤 Uploading 5 photos concurrently...');

        const dummyJpg = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
            0xFF, 0xDB, 0x00, 0x43, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7F, 0xFF, 0xD9
        ]);

        const uploadPromises = Array(5).fill(0).map((_, i) => {
            const form = new FormData();
            form.append('albumId', albumId);
            form.append('url', dummyJpg, { filename: `test_photo_${i}.jpg`, contentType: 'image/jpeg' });

            return fetchClient(`${BASE_URL}/api/collections/photos/records`, {
                method: 'POST',
                headers: {
                    'Cookie': cookie,
                    ...form.getHeaders()
                },
                body: form as any
            });
        });

        const start = Date.now();
        const responses = await Promise.all(uploadPromises);
        const duration = Date.now() - start;

        const failed = responses.filter(r => !r.ok);
        if (failed.length > 0) {
            throw new Error(`${failed.length} uploads failed`);
        }

        logger.info(`✅ Uploads complete in ${duration}ms (Avg ${duration / 5}ms/req)`);

    } catch (e: any) {
        logger.error(`❌ Upload Error: ${e.message}`);
        await cleanup(albumId, cookie);
        process.exit(1);
    }

    // 5. Verify Processing
    try {
        logger.info('🔍 Verifying Data Consistency...');
        // thumbnails might take time
        await new Promise(r => setTimeout(r, 2000));

        const checkRes = await fetchClient(`${BASE_URL}/api/collections/photos/records?filter=(albumId='${albumId}')`, {
            headers: { 'Cookie': cookie }
        });

        const data = await checkRes.json() as any;
        const count = data.items ? data.items.length : 0;

        if (count === 5) {
            logger.info(`✅ Verification Passed: 5/5 photos found in DB.`);
        } else {
            throw new Error(`Verification Failed: Expected 5 photos, found ${count}`);
        }

    } catch (e: any) {
        logger.error(`❌ Verification Error: ${e.message}`);
        await cleanup(albumId, cookie);
        process.exit(1);
    }

    // 6. Cleanup
    await cleanup(albumId, cookie);
    logger.info('🎉 System Integration Verification Passed!');
}

async function cleanup(albumId: string, cookie: string) {
    if (!albumId) return;
    try {
        logger.info('🧹 Cleaning up...');
        await fetchClient(`${BASE_URL}/api/collections/albums/records/${albumId}`, {
            method: 'DELETE',
            headers: { 'Cookie': cookie }
        });
    } catch (e) {
        logger.warn('Cleanup warning:', e);
    }
}

runVerification();
