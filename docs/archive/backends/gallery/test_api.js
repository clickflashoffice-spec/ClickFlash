/**
 * API Test Script
 * Tests CRUD operations, filtering, and expansion features
 */

const http = require('http');

const PORT = 8090;
const BASE_URL = `http://localhost:${PORT}/api`;

/**
 * Make HTTP request using Node.js http module
 * @param {string} url - Full URL path
 * @param {string} method - HTTP method
 * @param {Object} headers - Request headers
 * @param {Object} body - Request body data
 * @returns {Promise<Object>} Response with status and parsed data
 */
function makeRequest(url, method = 'GET', headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : null;
                    resolve({ status: res.statusCode, data: parsed, raw: data });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, raw: data });
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

/**
 * Run API tests
 */
async function test() {
    try {
        // 1. Create Album
        console.log("Creating Album...");
        const albumRes = await makeRequest(
            `${BASE_URL}/collections/albums/records`,
            'POST',
            {},
            {
                title: 'Test Album',
                date: '2023-01-01',
                status: 'Finalized',
                roomNumber: '101'
            }
        );
        
        if (albumRes.status !== 200) {
            throw new Error(`Failed to create album: ${albumRes.status} - ${JSON.stringify(albumRes.data)}`);
        }
        
        const album = albumRes.data;
        console.log("Album Created:", album.id);

        // 2. Create Photo linked to Album
        console.log("Creating Photo...");
        const photoRes = await makeRequest(
            `${BASE_URL}/collections/photos/records`,
            'POST',
            {},
            {
                albumId: album.id,
                url: 'test.jpg',
                title: 'Test Photo'
            }
        );
        
        if (photoRes.status !== 200) {
            throw new Error(`Failed to create photo: ${photoRes.status} - ${JSON.stringify(photoRes.data)}`);
        }
        console.log("Photo Created:", photoRes.data.id);

        // 3. Test Filter
        console.log("Testing Filter...");
        const filterRes = await makeRequest(
            `${BASE_URL}/collections/albums/records?filter=status="Finalized"`
        );
        
        if (filterRes.status !== 200) {
            throw new Error(`Filter request failed: ${filterRes.status} - ${JSON.stringify(filterRes.data)}`);
        }
        
        const filterData = filterRes.data;
        console.log("Filter Result Count:", filterData.items ? filterData.items.length : 0);
        if (!filterData.items || filterData.items.length === 0) {
            throw new Error("Filter failed - no results");
        }

        // 4. Test Expand
        console.log("Testing Expand...");
        const expandRes = await makeRequest(
            `${BASE_URL}/collections/albums/records?filter=status="Finalized"&expand=photos_via_album`
        );
        
        if (expandRes.status !== 200) {
            throw new Error(`Expand request failed: ${expandRes.status} - ${JSON.stringify(expandRes.data)}`);
        }
        
        const expandData = expandRes.data;
        const expandedAlbum = expandData.items ? expandData.items.find(a => a.id === album.id) : null;

        if (expandedAlbum && expandedAlbum.expand && expandedAlbum.expand.photos_via_album) {
            console.log("Expand Success. Photos:", expandedAlbum.expand.photos_via_album.length);
        } else {
            console.log("Expand Failed:", JSON.stringify(expandedAlbum, null, 2));
            throw new Error("Expand failed - no expanded data");
        }

        console.log("All API Tests Passed.");

    } catch (e) {
        console.error("Test Failed:", e.message || e);
        if (e.stack) {
            console.error("Stack:", e.stack);
        }
        process.exit(1);
    }
}

// Wait for server to be ready (assuming it's running)
test();
