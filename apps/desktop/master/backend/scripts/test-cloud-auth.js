import { logger } from "@/utils/logger";
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

logger.info('🔍 Cloud Bridge Authentication Test\n');
logger.info('Configuration:');
logger.info(`  Hub URL: ${HUB_URL}`);
logger.info(`  Desk ID: ${DESK_ID}`);
logger.info(`  Email:   ${EMAIL || '(not set)'}`);
logger.info(`  Password: ${PASSWORD ? '*****' : '(not set)'}`);
logger.info('');

// Check credentials
if (!EMAIL || !PASSWORD) {
    logger.error('❌ Missing credentials!');
    logger.error('Set CLOUD_EMAIL and CLOUD_PASSWORD environment variables.');
    logger.error('');
    logger.error('Example:');
    logger.error('  $env:CLOUD_EMAIL="your-email@clickflash.ai"');
    logger.error('  $env:CLOUD_PASSWORD="your-password"');
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

logger.info('🚀 Sending authentication request...\n');

const req = protocol.request(options, (res) => {
    logger.info(`Response Status: ${res.statusCode} ${res.statusMessage}`);
    logger.info('Response Headers:', JSON.stringify(res.headers, null, 2));
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        logger.info('\nResponse Body:');
        try {
            const json = JSON.parse(data);
            logger.info(JSON.stringify(json, null, 2));
            
            if (res.statusCode === 200 && json.token) {
                logger.info('\n✅ Authentication SUCCESSFUL!');
                logger.info(`Token: ${json.token.substring(0, 20)}...`);
                
                // Test heartbeat
                testHeartbeat(json.token);
            } else if (res.statusCode === 423) {
                logger.info('\n❌ Hardware Lock Error!');
                logger.info('This desk is already registered to another machine.');
            } else if (res.statusCode === 401) {
                logger.info('\n❌ Authentication FAILED!');
                logger.info('Invalid email or password.');
            } else {
                logger.info('\n⚠️ Unexpected response');
            }
        } catch (e) {
            logger.info(data);
        }
    });
});

req.on('error', (e) => {
    logger.error(`\n❌ Request failed: ${e.message}`);
    if (e.code === 'ECONNREFUSED') {
        logger.error('The Management Hub is not reachable.');
    }
});

req.write(postData);
req.end();

// Test heartbeat with token
function testHeartbeat(token) {
    logger.info('\n📡 Testing heartbeat...\n');
    
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
        logger.info(`Heartbeat Status: ${res.statusCode} ${res.statusMessage}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                logger.info('Response:', JSON.stringify(json, null, 2));
                
                if (res.statusCode === 200) {
                    logger.info('\n✅ Heartbeat SUCCESSFUL!');
                    logger.info('\n✨ Cloud Bridge is FULLY OPERATIONAL');
                } else {
                    logger.info('\n⚠️ Heartbeat failed');
                }
            } catch (e) {
                logger.info(data);
            }
        });
    });
    
    hbReq.on('error', (e) => {
        logger.error(`\n❌ Heartbeat failed: ${e.message}`);
    });
    
    hbReq.write(heartbeatData);
    hbReq.end();
}
