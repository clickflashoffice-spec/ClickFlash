import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { logger } from '../utils/logger';

// Use standard fetch if available (Node 18+), otherwise need a polyfill or axios.
// The user environment ran 'npx tsx' which should have fetch.

const API_URL = 'http://127.0.0.1:8090';

const main = async () => {
    try {
        logger.info('0. Checking Health...');
        const healthRes = await fetch(`${API_URL}/api/system/health`);
        logger.info('Health Check:', { status: healthRes.status, text: await healthRes.text() });

        logger.info('1. Creating Album (Simulating Frontend Payload)...');

        // Exact payload structure from albumService.ts / ImportAlbumModal.tsx
        const albumPayload = {
            title: "Repro Album " + Date.now(),
            date: new Date().toISOString().split('T')[0],
            photographerId: "1", // Assuming '1' exists. If not, this might fail with FK error.
            roomNumber: "101",
            source: 'master_import',
            status: 'Draft',
            categories: ['Photo Session'],
            customerEmail: 'test@example.com'
        };

        const albumRes = await fetch(`${API_URL}/api/collections/albums/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(albumPayload)
        });

        if (!albumRes.ok) {
            const text = await albumRes.text();
            throw new Error(`Failed to create album: ${albumRes.status} ${text}`);
        }

        const album = await albumRes.json();
        logger.info('Album created:', album.id);

        logger.info('2. Uploading Photo...');
        const formData = new FormData();
        formData.append('title', 'test_photo.jpg');
        formData.append('albumId', album.id);
        formData.append('photographerId', "1");

        // Create a dummy file if it doesn't exist
        const dummyPath = path.join(__dirname, 'test_photo.jpg');
        if (!fs.existsSync(dummyPath)) {
            fs.writeFileSync(dummyPath, 'dummy data');
        }

        const fileStream = fs.createReadStream(dummyPath);
        formData.append('url', fileStream, { filename: 'test_photo.jpg' });
        if (albumRes.status === 200) {
            const album = await albumRes.json();
            logger.info('2. Album Created:', album.id);

            // Simulating Race Condition: Upload immediately
            logger.info('3. Uploading Photo IMMEDIATELY...');

            // Create a dummy file
            const uploadFormData = new FormData();
            const blob = new Blob(['fake image content'], { type: 'image/jpeg' });
            uploadFormData.append('url', blob, 'test_photo.jpg'); // Field name 'url' matching backend
            uploadFormData.append('albumId', album.id); // Valid Album ID
            uploadFormData.append('photographerId', '1'); // Assuming ID 1 exists or is skipped

            const uploadRes = await fetch(`${API_URL}/api/collections/photos/records`, {
                method: 'POST',
                body: uploadFormData as any
            });

            logger.info('Upload Result:', { status: uploadRes.status, text: await uploadRes.text() });
        } else {
            logger.error("Simulation failed:", { status: albumRes.status });
        }

    } catch (err: any) {
        logger.error(`Simulation completed with errors:`, { err, stack: err.stack });
    }
};

main();
