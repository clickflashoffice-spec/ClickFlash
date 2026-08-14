/**
 * Register External Uploader Hotel
 * 
 * This script registers the MoneyTrash "External Uploader" app
 * as a hotel/office in the Cloudflare Management Hub
 */

const https = require('https');

// Configuration
const HUB_URL = process.env.HUB_URL || 'https://management-hub.clickflash-office.workers.dev';
const MASTER_API_KEY = process.env.MASTER_API_KEY || 'master_key_for_registration';

// External Uploader Hotel Configuration
const HOTEL_CONFIG = {
  deskId: 'EXT001',
  name: 'External Uploader',
  contactEmail: 'external-uploader@clickflash.ai',
  location: 'Cloud',
  type: 'external_uploader',
  settings: {
    retentionDays: 90,
    singlePhotoPrice: '5.00',
    fullGalleryPrice: '25.00',
    watermarkEnabled: true,
    autoSync: true
  }
};

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     REGISTER EXTERNAL UPLOADER HOTEL                           ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('Hotel Configuration:');
console.log(`  Desk ID: ${HOTEL_CONFIG.deskId}`);
console.log(`  Name: ${HOTEL_CONFIG.name}`);
console.log(`  Email: ${HOTEL_CONFIG.contactEmail}`);
console.log(`  Hub URL: ${HUB_URL}\n`);

// Register office/hotel
async function registerOffice() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${HUB_URL}/api/office/register`);
    const postData = JSON.stringify({
      deskId: HOTEL_CONFIG.deskId,
      name: HOTEL_CONFIG.name,
      contactEmail: HOTEL_CONFIG.contactEmail,
      apiKey: MASTER_API_KEY,
      location: HOTEL_CONFIG.location,
      type: HOTEL_CONFIG.type,
      settings: HOTEL_CONFIG.settings
    });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };

    console.log('Sending registration request...\n');

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('✅ Registration SUCCESSFUL!\n');
            console.log('Response:', JSON.stringify(json, null, 2));
            resolve(json);
          } else {
            console.log(`❌ Registration failed: ${res.statusCode}\n`);
            console.log('Response:', JSON.stringify(json, null, 2));
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        } catch (e) {
          console.log('Response:', data);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Request failed: ${e.message}`);
      reject(e);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Verify the registration
async function verifyOffice(apiKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${HUB_URL}/api/office/verify`);
    const postData = JSON.stringify({
      deskId: HOTEL_CONFIG.deskId,
      apiKey: apiKey
    });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };

    console.log('\nVerifying office credentials...\n');

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('✅ Verification SUCCESSFUL!\n');
            console.log('Token:', json.token?.substring(0, 30) + '...');
            console.log('Office:', JSON.stringify(json.office, null, 2));
            resolve(json);
          } else {
            console.log(`❌ Verification failed: ${res.statusCode}\n`);
            console.log('Response:', JSON.stringify(json, null, 2));
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        } catch (e) {
          console.log('Response:', data);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    // Register the office
    const registration = await registerOffice();
    
    // Save credentials to file
    const fs = require('fs');
    const credentials = {
      deskId: HOTEL_CONFIG.deskId,
      apiKey: registration.apiKey || MASTER_API_KEY,
      apiUrl: HUB_URL,
      registeredAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      './external-uploader-credentials.json',
      JSON.stringify(credentials, null, 2)
    );
    
    console.log('\n✅ Credentials saved to external-uploader-credentials.json\n');
    
    // Verify
    await verifyOffice(credentials.apiKey);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('              REGISTRATION COMPLETE                            ');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('Next Steps:');
    console.log('1. Copy credentials to MoneyTrash .env:');
    console.log(`   DESK_ID=${HOTEL_CONFIG.deskId}`);
    console.log(`   CLOUD_API_KEY=${credentials.apiKey}`);
    console.log('');
    console.log('2. Start MoneyTrash app');
    console.log('3. Verify connection in app settings');
    
  } catch (error) {
    console.error('\n❌ Registration failed:', error.message);
    process.exit(1);
  }
}

main();
