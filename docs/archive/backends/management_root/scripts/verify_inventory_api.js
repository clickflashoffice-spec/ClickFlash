import { logger } from '@/utils/logger';

const http = require('http');

const PORT = 8092; // Assuming default port
const BASE_URL = `http://localhost:${PORT}/api`;

// Helper to make HTTP requests
function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: `/api${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    logger.info('Starting Inventory API Verification...');

    // 1. Authenticate (Need a valid user/pass. Assuming admin/admin or similar standard dev creds. 
    // If not, we might need to create a script that inserts a user directly into DB or use an existing token strategy.
    // However, server.js likely has "admin@clickflash.com" // "password" or "MasterAdmin!" based on typical setups.
    // Let's try to login.

    // Actually, to avoid auth issues in this script, we can skip auth if we run this locally and server is in dev mode? 
    // No, server enforces auth. 
    // Let's try to grab a token using a known dev credential or just creating a temp user via SQL first?
    // Better: let's try the login endpoint first with expected creds.

    let token = '';
    try {
        logger.info('Attempting login...');
        // Try common dev credentials. If this fails, the user will need to provide creds or we adjust.
        // Based on previous contexts, maybe 'admin@clickflash.com' / 'password123'?
        // Let's try a safe bet or just report if login fails.
        const loginRes = await request('POST', '/login', { email: 'admin@clickflash.com', password: 'password' });

        if (loginRes.status === 200 && loginRes.data.token) {
            token = loginRes.data.token;
            logger.info('Login successful.');
        } else {
            // Fallback: Try another common set
            const loginRes2 = await request('POST', '/login', { email: 'admin', password: 'password' });
            if (loginRes2.status === 200 && loginRes2.data.token) {
                token = loginRes2.data.token;
                logger.info('Login successful (admin/password).');
            } else {
                logger.warn('Login failed. Automation might fail if auth is required. proceeding anonymously (might 401).');
                logger.info('Login Response:', loginRes.status, loginRes.data);
            }
        }
    } catch (e) {
        logger.error('Login error:', e.message);
    }

    // 1. Test Equipment Categories
    logger.info('\n--- Testing Equipment Categories ---');
    const category = { label: 'Cameras' };
    let catId = '';

    // CREATE
    const createCat = await request('POST', '/collections/equipment_categories/records', category, token);
    logger.info('Create Category:', createCat.status);
    if (createCat.status >= 200 && createCat.status < 300) {
        catId = createCat.data.id;
        logger.info('Category ID:', catId);
    } else {
        logger.error('Failed to create category:', createCat.data);
    }

    if (catId) {
        // READ
        const getCat = await request('GET', `/collections/equipment_categories/records/${catId}`, null, token);
        logger.info('Get Category:', getCat.status, getCat.data.label === 'Cameras' ? 'MATCH' : 'MISMATCH');

        // UPDATE
        const updateCat = await request('PATCH', `/collections/equipment_categories/records/${catId}`, { label: 'Digital Cameras' }, token);
        logger.info('Update Category:', updateCat.status, updateCat.data.label === 'Digital Cameras' ? 'MATCH' : 'MISMATCH');

        // DELETE
        const deleteCat = await request('DELETE', `/collections/equipment_categories/records/${catId}`, null, token);
        logger.info('Delete Category:', deleteCat.status);
    }

    // 2. Test Inventory
    logger.info('\n--- Testing Inventory ---');
    const inventoryItem = { name: 'SD Card 64GB', type: 'Storage', current_count: 50, low_stock_threshold: 10 };
    let invId = '';

    // CREATE
    const createInv = await request('POST', '/collections/inventory/records', inventoryItem, token);
    logger.info('Create Inventory:', createInv.status);
    if (createInv.status >= 200 && createInv.status < 300) {
        invId = createInv.data.id;
        logger.info('Inventory ID:', invId);
    } else {
        logger.error('Failed to create inventory:', createInv.data);
    }

    if (invId) {
        // READ
        const getInv = await request('GET', `/collections/inventory/records/${invId}`, null, token);
        logger.info('Get Inventory:', getInv.status, getInv.data.name === 'SD Card 64GB' ? 'MATCH' : 'MISMATCH');

        // UPDATE
        const updateInv = await request('PATCH', `/collections/inventory/records/${invId}`, { current_count: 45 }, token);
        logger.info('Update Inventory:', updateInv.status, updateInv.data.current_count === 45 ? 'MATCH' : 'MISMATCH');

        // DELETE
        const deleteInv = await request('DELETE', `/collections/inventory/records/${invId}`, null, token);
        logger.info('Delete Inventory:', deleteInv.status);
    }

    // 3. Test Equipment
    logger.info('\n--- Testing Equipment ---');
    const equipmentItem = { name: 'Canon R5 #1', type: 'Camera', status: 'Available' };
    let equipId = '';

    // CREATE
    const createEquip = await request('POST', '/collections/equipment/records', equipmentItem, token);
    logger.info('Create Equipment:', createEquip.status);
    if (createEquip.status >= 200 && createEquip.status < 300) {
        equipId = createEquip.data.id;
        logger.info('Equipment ID:', equipId);
    } else {
        logger.error('Failed to create equipment:', createEquip.data);
    }

    if (equipId) {
        // READ
        const getEquip = await request('GET', `/collections/equipment/records/${equipId}`, null, token);
        logger.info('Get Equipment:', getEquip.status, getEquip.data.name === 'Canon R5 #1' ? 'MATCH' : 'MISMATCH');

        // UPDATE
        const updateEquip = await request('PATCH', `/collections/equipment/records/${equipId}`, { status: 'In Use' }, token);
        logger.info('Update Equipment:', updateEquip.status, updateEquip.data.status === 'In Use' ? 'MATCH' : 'MISMATCH');

        // DELETE
        const deleteEquip = await request('DELETE', `/collections/equipment/records/${equipId}`, null, token);
        logger.info('Delete Equipment:', deleteEquip.status);
    }
}

runTests();
