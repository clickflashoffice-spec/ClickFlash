
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:8090';

async function runDebug() {
    console.log('[Debug] Starting Album Creation Test...');

    const albumId = 'test_album_' + Date.now();
    const photoId = 'test_photo_' + Date.now();

    // 1. Create Album
    console.log(`[Debug] Creating Album ${albumId}...`);
    try {
        const albumBody = {
            id: albumId,
            title: 'Debug Album',
            date: new Date().toISOString().split('T')[0],
            status: 'Draft'
        };

        const albumRes = await fetch(`${API_URL}/api/collections/albums/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(albumBody)
        });

        const albumText = await albumRes.text();
        console.log(`[Debug] Album Create Response: ${albumRes.status} ${albumRes.statusText}`);
        console.log(`[Debug] Body: ${albumText}`);

        if (!albumRes.ok) {
            console.error('[Debug] Album Creation FAILED. Stopping.');
            return;
        }
    } catch (e) {
        console.error('[Debug] Album Creation Network Error:', e);
        return;
    }

    // 2. Immediate Photo Upload (Simulate Race)
    console.log(`[Debug] Uploading Photo to ${albumId} (Simulating Race)...`);
    try {
        const form = new FormData();
        form.append('albumId', albumId);
        form.append('id', photoId);

        // Dummy file
        const dummyPath = path.join(__dirname, 'dummy.txt');
        fs.writeFileSync(dummyPath, 'dummy image content');
        form.append('url', fs.createReadStream(dummyPath), 'test.jpg');

        const uploadRes = await fetch(`${API_URL}/api/collections/photos/records`, {
            method: 'POST',
            body: form
        });

        const uploadText = await uploadRes.text();
        console.log(`[Debug] Photo Upload Response: ${uploadRes.status} ${uploadRes.statusText}`);
        console.log(`[Debug] Body: ${uploadText}`);

        // Cleanup
        fs.unlinkSync(dummyPath);

    } catch (e) {
        console.error('[Debug] Photo Upload Network Error:', e);
    }
}

runDebug();
