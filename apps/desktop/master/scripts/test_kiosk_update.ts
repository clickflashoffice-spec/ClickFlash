
import fetch from 'node-fetch';
import { logger } from '@/utils/logger';

const BASE_URL = 'http://localhost:8090';
const EMAIL = process.env.TEST_EMAIL || 'admin@clickflash.local';
const PASSWORD = process.env.TEST_PASSWORD || (() => { logger.error('Set TEST_PASSWORD env var'); process.exit(1); return ''; })();

async function run() {
    logger.info('--- Testing Kiosk API Persistence ---');

    // 1. Login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    if (!loginRes.ok) {
        logger.error('Login failed:', await loginRes.text());
        return;
    }

    const loginData: any = await loginRes.json();
    logger.info('Login successful. User:', loginData.user.email);
    const cookie = loginRes.headers.get('set-cookie');
    const headers = {
        'Content-Type': 'application/json',
        'Cookie': cookie || ''
    };

    // 2. Create Dummy Kiosk
    const createRes = await fetch(`${BASE_URL}/api/collections/kiosks/records`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: 'Test Kiosk ' + Date.now(),
            status: 'Disconnected'
        })
    });

    if (!createRes.ok) {
        logger.error('Create failed:', await createRes.text());
        return;
    }
    const kiosk: any = await createRes.json();
    logger.info('Created Kiosk ID:', kiosk.id);

    // 3. Update Kiosk with ordersFolderPath
    const testPath = 'C:\\Test\\Orders';
    logger.info(`Updating kiosk with ordersFolderPath: ${testPath}`);
    const updateRes = await fetch(`${BASE_URL}/api/collections/kiosks/records/${kiosk.id}`, {
        method: 'PATCH', // Collections uses PATCH for update
        headers,
        body: JSON.stringify({
            ordersFolderPath: testPath
        })
    });

    if (!updateRes.ok) {
        logger.error('Update failed:', await updateRes.text());
        return;
    }
    const updatedKiosk: any = await updateRes.json();
    logger.info('Update response ordersFolderPath:', updatedKiosk.ordersFolderPath);

    // 4. Verification Check
    if (updatedKiosk.ordersFolderPath === testPath) {
        logger.info('SUCCESS: API returned the updated path.');
    } else {
        logger.error('FAILURE: API did not return the updated path.');
    }

    // 5. Fetch again to double check
    // 5. Fetch again to double check
    const fetchUrl = `${BASE_URL}/api/collections/kiosks/records?filter=id="${kiosk.id}"`;
    logger.info('Fetching from:', fetchUrl);
    const fetchRes = await fetch(fetchUrl, { headers });

    if (!fetchRes.ok) {
        logger.error('Fetch Failed:', fetchRes.status, await fetchRes.text());
        return;
    }

    const fetchResult: any = await fetchRes.json();
    const fetchedKiosk = fetchResult.items ? fetchResult.items[0] : null;

    if (!fetchedKiosk) {
        logger.error('Kiosk not found in list response');
        return;
    }

    logger.info('Refetched Full Object:', JSON.stringify(fetchedKiosk, null, 2));
    logger.info('Refetched ordersFolderPath:', fetchedKiosk.ordersFolderPath);

    if (fetchedKiosk.ordersFolderPath === testPath) {
        logger.info('SUCCESS: Persistence confirmed.');
    } else {
        logger.error('FAILURE: Persistence Check Failed.');
    }
}

run().catch(logger.error);
