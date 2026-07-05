import { logger } from "@/utils/logger";
/**
 * Cloud Bridge Diagnostic Tool
 * 
 * Diagnoses and fixes Cloud Bridge authentication issues:
 * - Tests Hub connectivity
 * - Validates credentials
 * - Checks hardware lock status
 * - Provides fix recommendations
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load .env if exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim();
        }
    });
}

// Configuration
const HUB_URL = process.env.CLOUD_API_URL || 'https://management-hub.clickflash-office.workers.dev';
const EMAIL = process.env.CLOUD_EMAIL;
const PASSWORD = process.env.CLOUD_PASSWORD;
const DESK_ID = process.env.DESK_ID || 'MASTER_01';

logger.info('╔════════════════════════════════════════════════════════════════╗');
logger.info('║           CLOUD BRIDGE DIAGNOSTIC TOOL                         ║');
logger.info('╚════════════════════════════════════════════════════════════════╝\n');

// Generate consistent machine ID
function getMachineId() {
    // Try to read existing machine ID
    const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'pb_data');
    const machineIdPath = path.join(dataDir, '.machine_id');
    
    if (fs.existsSync(machineIdPath)) {
        return fs.readFileSync(machineIdPath, 'utf8').trim();
    }
    
    // Generate new machine ID
    const newId = crypto.randomBytes(32).toString('hex');
    try {
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(machineIdPath, newId);
    } catch (e) {
        // Ignore write errors
    }
    return newId;
}

const machineId = getMachineId();

logger.info('📋 Configuration:');
logger.info(`   Hub URL:    ${HUB_URL}`);
logger.info(`   Desk ID:    ${DESK_ID}`);
logger.info(`   Email:      ${EMAIL || '(NOT SET)'}`);
logger.info(`   Password:   ${PASSWORD ? '*****' : '(NOT SET)'}`);
logger.info(`   Machine ID: ${machineId.substring(0, 16)}...`);
logger.info('');

// Diagnostic Results
const results = {
    credentials: false,
    connectivity: false,
    authentication: false,
    hardwareLock: false,
    heartbeat: false
};

async function runDiagnostics() {
    // Step 1: Check credentials
    logger.info('────────────────────────────────────────────────────────────────');
    logger.info('STEP 1: Checking Credentials');
    logger.info('────────────────────────────────────────────────────────────────');
    
    if (!EMAIL || !PASSWORD) {
        logger.info('❌ CREDENTIALS MISSING\n');
        logger.info('   The following environment variables are required:\n');
        logger.info('   CLOUD_EMAIL     - Your Management Hub login email');
        logger.info('   CLOUD_PASSWORD  - Your Management Hub password\n');
        logger.info('   Set them in your .env file:\n');
        logger.info('   CLOUD_EMAIL=your-email@clickflash.ai');
        logger.info('   CLOUD_PASSWORD=your-password\n');
        return;
    }
    
    logger.info('✅ Credentials configured\n');
    results.credentials = true;
    
    // Step 2: Test connectivity
    logger.info('────────────────────────────────────────────────────────────────');
    logger.info('STEP 2: Testing Hub Connectivity');
    logger.info('────────────────────────────────────────────────────────────────');
    
    try {
        const url = new URL(HUB_URL);
        await new Promise((resolve, reject) => {
            const protocol = url.protocol === 'https:' ? https : http;
            const req = protocol.request({
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: '/api/health',
                method: 'GET',
                timeout: 10000
            }, (res) => {
                logger.info(`   Status: ${res.statusCode} ${res.statusMessage}`);
                if (res.statusCode === 200) {
                    logger.info('✅ Hub is reachable\n');
                    results.connectivity = true;
                } else {
                    logger.info('⚠️  Hub returned unexpected status\n');
                }
                resolve();
            });
            
            req.on('error', (e) => {
                logger.info(`❌ Connection failed: ${e.message}\n`);
                reject(e);
            });
            
            req.on('timeout', () => {
                logger.info('❌ Connection timeout\n');
                req.destroy();
                reject(new Error('Timeout'));
            });
            
            req.end();
        });
    } catch (e) {
        logger.info('❌ Cannot reach Management Hub\n');
        logger.info('   Possible causes:');
        logger.info('   - Internet connection issue');
        logger.info('   - Hub URL is incorrect');
        logger.info('   - Management Hub is down\n');
        return;
    }
    
    // Step 3: Test authentication
    logger.info('────────────────────────────────────────────────────────────────');
    logger.info('STEP 3: Testing Authentication');
    logger.info('────────────────────────────────────────────────────────────────');
    
    let token = null;
    try {
        token = await authenticate();
        if (token) {
            logger.info('✅ Authentication successful\n');
            results.authentication = true;
        }
    } catch (e) {
        if (e.status === 423) {
            logger.info('❌ HARDWARE LOCK ERROR\n');
            logger.info('   This desk is registered to a different machine.\n');
            logger.info('   SOLUTIONS:\n');
            logger.info('   1. Use the original machine for this desk ID');
            logger.info('   2. Contact support to reset hardware lock');
            logger.info('   3. Use a different DESK_ID (e.g., DESK_002)\n');
            results.hardwareLock = true;
        } else if (e.status === 401) {
            logger.info('❌ INVALID CREDENTIALS\n');
            logger.info('   The email or password is incorrect.\n');
            logger.info('   SOLUTIONS:\n');
            logger.info('   1. Verify your Management Hub login credentials');
            logger.info('   2. Reset password at Management Hub');
            logger.info('   3. Check for typos in CLOUD_EMAIL or CLOUD_PASSWORD\n');
        } else {
            logger.info(`❌ Authentication error: ${e.message}\n`);
        }
        return;
    }
    
    // Step 4: Test heartbeat
    if (token) {
        logger.info('────────────────────────────────────────────────────────────────');
        logger.info('STEP 4: Testing Heartbeat');
        logger.info('────────────────────────────────────────────────────────────────');
        
        try {
            await sendHeartbeat(token);
            logger.info('✅ Heartbeat successful\n');
            results.heartbeat = true;
        } catch (e) {
            logger.info(`❌ Heartbeat failed: ${e.message}\n`);
        }
    }
    
    // Summary
    logger.info('════════════════════════════════════════════════════════════════');
    logger.info('                      DIAGNOSTIC SUMMARY                        ');
    logger.info('════════════════════════════════════════════════════════════════\n');
    
    const total = Object.keys(results).length;
    const passed = Object.values(results).filter(v => v).length;
    
    logger.info(`   Checks Passed: ${passed}/${total}\n`);
    
    if (passed === total) {
        logger.info('   ✅ ALL CHECKS PASSED!');
        logger.info('   Cloud Bridge is fully operational.\n');
    } else {
        logger.info('   ⚠️  SOME CHECKS FAILED');
        logger.info('   See above for details and solutions.\n');
    }
    
    // Recommendations
    logger.info('────────────────────────────────────────────────────────────────');
    logger.info('                     RECOMMENDATIONS                            ');
    logger.info('────────────────────────────────────────────────────────────────\n');
    
    if (!results.credentials) {
        logger.info('1. Add CLOUD_EMAIL and CLOUD_PASSWORD to:');
        logger.info(`   ${envPath}\n`);
    }
    
    if (results.hardwareLock) {
        logger.info('2. To fix Hardware Lock:');
        logger.info('   - Contact: support@clickflash.ai');
        logger.info('   - Subject: Hardware Lock Reset Request');
        logger.info(`   - Desk ID: ${DESK_ID}`);
        logger.info(`   - Machine: ${machineId.substring(0, 16)}...\n`);
    }
    
    if (!results.connectivity) {
        logger.info('3. Check your internet connection and firewall settings.');
        logger.info(`   Hub URL: ${HUB_URL}\n`);
    }
}

function authenticate() {
    return new Promise((resolve, reject) => {
        const url = new URL(`${HUB_URL}/api/auth/login`);
        const postData = JSON.stringify({
            email: EMAIL,
            password: PASSWORD,
            machine_id: machineId
        });
        
        const protocol = url.protocol === 'https:' ? https : http;
        const req = protocol.request({
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 10000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.token);
                    } catch (e) {
                        reject(new Error('Invalid response'));
                    }
                } else {
                    const error = new Error(`HTTP ${res.statusCode}`);
                    error.status = res.statusCode;
                    reject(error);
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

function sendHeartbeat(token) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${HUB_URL}/api/cloud/heartbeat`);
        const postData = JSON.stringify({
            deskId: DESK_ID,
            status: 'online',
            version: '4.1.0',
            timestamp: new Date().toISOString()
        });
        
        const protocol = url.protocol === 'https:' ? https : http;
        const req = protocol.request({
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Desk-ID': DESK_ID,
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 10000
        }, (res) => {
            if (res.statusCode === 200) {
                resolve();
            } else {
                reject(new Error(`HTTP ${res.statusCode}`));
            }
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

// Run diagnostics
runDiagnostics().catch(err => {
    logger.error('Fatal error:', err);
    process.exit(1);
});
