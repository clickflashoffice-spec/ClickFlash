/**
 * Cloud Bridge Authentication Test
 * 
 * Tests the authentication flow to the Management Hub
 */

const https = require('https');
const http = require('http');

// Configuration
const HUB_URL = process.env.CLOUD_API_URL || 'https://management-hub.clickflash-office.workers.dev';
const EMAIL = process.env.CLOUD_EMAIL;
const PASSWORD = process.env.CLOUD_PASSWORD;
const DESK_ID = process.env.DESK_ID || 'MASTER_01';

console.log('🔍 Cloud Bridge Authentication Test\n');
console.log('Configuration:');
console.log(`  Hub URL: ${HUB_URL}`);
console.log(`  Desk ID: ${DESK_ID}`);
console.log(`  Email:   ${EMAIL || '(not set)'}`);
console.log(`  Password: ${PASSWORD ? '*****' : '(not set)'}`);
console.log('');

// Check credentials
if (!EMAIL || !PASSWORD) {
    console.error('❌ Missing credentials!');
    console.error('Set CLOUD_EMAIL and CLOUD_PASSWORD environment variables.');
    console.error('');
    console.error('Example:');
    console.error('  $env:CLOUD_EMAIL="your-email@clickflash.ai"');
    console.error('  $env:CLOUD_PASSWORD="your-password"');
    process.exit(1);
}

// Get hardware/machine ID
const crypto = require('crypto');
const machineId = crypto.randomBytes(32).toString('hex');

// Make authentication request
const url = new URL(`${HUB_URL}/api/auth/login`);
const postData = JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
    machine_id: machineId
});

const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const protocol = url.protocol === 'https:' ? https : http;

console.log('🚀 Sending authentication request...\n');

const req = protocol.request(options, (res) => {
    console.log(`Response Status: ${res.statusCode} ${res.statusMessage}`);
    console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('\nResponse Body:');
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));
            
            if (res.statusCode === 200 && json.token) {
                console.log('\n✅ Authentication SUCCESSFUL!');
                console.log(`Token: ${json.token.substring(0, 20)}...`);
                
                // Test heartbeat
                testHeartbeat(json.token);
            } else if (res.statusCode === 423) {
                console.log('\n❌ Hardware Lock Error!');
                console.log('This desk is already registered to another machine.');
            } else if (res.statusCode === 401) {
                console.log('\n❌ Authentication FAILED!');
                console.log('Invalid email or password.');
            } else {
                console.log('\n⚠️ Unexpected response');
            }
        } catch (e) {
            console.log(data);
        }
    });
});

req.on('error', (e) => {
    console.error(`\n❌ Request failed: ${e.message}`);
    if (e.code === 'ECONNREFUSED') {
        console.error('The Management Hub is not reachable.');
    }
});

req.write(postData);
req.end();

// Test heartbeat with token
function testHeartbeat(token) {
    console.log('\n📡 Testing heartbeat...\n');
    
    const heartbeatUrl = new URL(`${HUB_URL}/api/cloud/heartbeat`);
    const heartbeatData = JSON.stringify({
        deskId: DESK_ID,
        status: 'online',
        version: '4.1.0',
        timestamp: new Date().toISOString()
    });
    
    const heartbeatOptions = {
        hostname: heartbeatUrl.hostname,
        port: heartbeatUrl.port || (heartbeatUrl.protocol === 'https:' ? 443 : 80),
        path: heartbeatUrl.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Length': Buffer.byteLength(heartbeatData),
            'X-Desk-ID': DESK_ID
        }
    };
    
    const hbReq = protocol.request(heartbeatOptions, (res) => {
        console.log(`Heartbeat Status: ${res.statusCode} ${res.statusMessage}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log('Response:', JSON.stringify(json, null, 2));
                
                if (res.statusCode === 200) {
                    console.log('\n✅ Heartbeat SUCCESSFUL!');
                    console.log('\n✨ Cloud Bridge is FULLY OPERATIONAL');
                } else {
                    console.log('\n⚠️ Heartbeat failed');
                }
            } catch (e) {
                console.log(data);
            }
        });
    });
    
    hbReq.on('error', (e) => {
        console.error(`\n❌ Heartbeat failed: ${e.message}`);
    });
    
    hbReq.write(heartbeatData);
    hbReq.end();
}
