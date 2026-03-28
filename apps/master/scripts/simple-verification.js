
const FormData = require('form-data');
const http = require('http');
const fs = require('fs');

const LOG_FILE = 'verification.log';
function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(LOG_FILE, line);
}

const BASE_URL = 'http://localhost:8090';
const USER_EMAIL = 'alaeddine@example.com';
const USER_PASSWORD = 'DEFAULT_PASSWORD_PLACEHOLDER';

function request(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                    ok: res.statusCode >= 200 && res.statusCode < 300
                });
            });
        });

        req.on('error', reject);

        if (body) {
            if (typeof body === 'string' || Buffer.isBuffer(body)) {
                req.write(body);
            } else if (body.pipe) {
                body.pipe(req);
                return; // Pipe handles end
            }
        }
        req.end();
    });
}

async function run() {
    console.log('🚀 Starting SIMPLE Verification...');

    // 1. Login
    console.log('🔑 Login...');
    const loginPayload = JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD });
    const loginRes = await request('POST', '/api/auth/login', {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload)
    }, loginPayload);

    if (!loginRes.ok) {
        console.error('Login Failed', loginRes.body);
        process.exit(1);
    }
    const cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0].split(';')[0] : '';
    console.log('✅ Logged In');

    // 2. Create Album
    console.log('📁 Create Album...');
    const albumPayload = JSON.stringify({ title: 'Simple Test ' + Date.now(), date: '2025-01-01', status: 'New' });
    const albumRes = await request('POST', '/api/collections/albums/records', {
        'Content-Type': 'application/json',
        'Cookie': cookie,
        'Content-Length': Buffer.byteLength(albumPayload)
    }, albumPayload);

    if (!albumRes.ok) {
        console.error('Album Failed', albumRes.body);
        process.exit(1);
    }
    const albumId = JSON.parse(albumRes.body).id;
    console.log(`✅ Album: ${albumId}`);

    // 3. Upload Photo
    console.log('📤 Uploading 1 Photo...');
    const form = new FormData();
    form.append('albumId', albumId);
    const dummy = Buffer.from('dummyimage'); // Minimal invalid image might be rejected?
    // Let's use valid JPEG header
    const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7F, 0xFF, 0xD9]);

    form.append('url', jpeg, { filename: 'test.jpg', contentType: 'image/jpeg' });

    // Use form.submit() which handles http request internally, OR manually piping
    // form-data submit doesn't return existing promise, uses callback.
    // Easier to pipe to manual request to capture response body easily.

    await new Promise((resolve, reject) => {
        const headers = form.getHeaders();
        headers['Cookie'] = cookie;

        const req = http.request({
            method: 'POST',
            host: 'localhost',
            port: 8090,
            path: '/api/collections/photos/records',
            headers: headers
        }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`✅ Upload Success: ${res.statusCode}`);
                    resolve();
                } else {
                    console.error('❌ Upload Failed', res.statusCode, d);
                    reject(new Error('Upload failed'));
                }
            });
        });

        form.pipe(req);
    });

    // 4. Cleanup
    console.log('🧹 Cleanup...');
    await request('DELETE', `/api/collections/albums/records/${albumId}`, { 'Cookie': cookie });
    console.log('✅ Done');
}

run().catch(console.error);
