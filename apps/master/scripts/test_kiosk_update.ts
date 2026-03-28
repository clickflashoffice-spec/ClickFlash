
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8090';
const EMAIL = 'alaeddine@example.com';
const PASSWORD = 'DEFAULT_PASSWORD_PLACEHOLDER';

async function run() {
    console.log('--- Testing Kiosk API Persistence ---');

    // 1. Login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    if (!loginRes.ok) {
        console.error('Login failed:', await loginRes.text());
        return;
    }

    const loginData: any = await loginRes.json();
    console.log('Login successful. User:', loginData.user.email);
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
        console.error('Create failed:', await createRes.text());
        return;
    }
    const kiosk: any = await createRes.json();
    console.log('Created Kiosk ID:', kiosk.id);

    // 3. Update Kiosk with ordersFolderPath
    const testPath = 'C:\\Test\\Orders';
    console.log(`Updating kiosk with ordersFolderPath: ${testPath}`);
    const updateRes = await fetch(`${BASE_URL}/api/collections/kiosks/records/${kiosk.id}`, {
        method: 'PATCH', // Collections uses PATCH for update
        headers,
        body: JSON.stringify({
            ordersFolderPath: testPath
        })
    });

    if (!updateRes.ok) {
        console.error('Update failed:', await updateRes.text());
        return;
    }
    const updatedKiosk: any = await updateRes.json();
    console.log('Update response ordersFolderPath:', updatedKiosk.ordersFolderPath);

    // 4. Verification Check
    if (updatedKiosk.ordersFolderPath === testPath) {
        console.log('SUCCESS: API returned the updated path.');
    } else {
        console.error('FAILURE: API did not return the updated path.');
    }

    // 5. Fetch again to double check
    // 5. Fetch again to double check
    const fetchUrl = `${BASE_URL}/api/collections/kiosks/records?filter=id="${kiosk.id}"`;
    console.log('Fetching from:', fetchUrl);
    const fetchRes = await fetch(fetchUrl, { headers });

    if (!fetchRes.ok) {
        console.error('Fetch Failed:', fetchRes.status, await fetchRes.text());
        return;
    }

    const fetchResult: any = await fetchRes.json();
    const fetchedKiosk = fetchResult.items ? fetchResult.items[0] : null;

    if (!fetchedKiosk) {
        console.error('Kiosk not found in list response');
        return;
    }

    console.log('Refetched Full Object:', JSON.stringify(fetchedKiosk, null, 2));
    console.log('Refetched ordersFolderPath:', fetchedKiosk.ordersFolderPath);

    if (fetchedKiosk.ordersFolderPath === testPath) {
        console.log('SUCCESS: Persistence confirmed.');
    } else {
        console.error('FAILURE: Persistence Check Failed.');
    }
}

run().catch(console.error);
