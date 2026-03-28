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

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           CLOUD BRIDGE DIAGNOSTIC TOOL                         ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

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

console.log('📋 Configuration:');
console.log(`   Hub URL:    ${HUB_URL}`);
console.log(`   Desk ID:    ${DESK_ID}`);
console.log(`   Email:      ${EMAIL || '(NOT SET)'}`);
console.log(`   Password:   ${PASSWORD ? '*****' : '(NOT SET)'}`);
console.log(`   Machine ID: ${machineId.substring(0, 16)}...`);
console.log('');

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
    console.log('────────────────────────────────────────────────────────────────');
    console.log('STEP 1: Checking Credentials');
    console.log('────────────────────────────────────────────────────────────────');
    
    if (!EMAIL || !PASSWORD) {
        console.log('❌ CREDENTIALS MISSING\n');
        console.log('   The following environment variables are required:\n');
        console.log('   CLOUD_EMAIL     - Your Management Hub login email');
        console.log('   CLOUD_PASSWORD  - Your Management Hub password\n');
        console.log('   Set them in your .env file:\n');
        console.log('   CLOUD_EMAIL=your-email@clickflash.ai');
        console.log('   CLOUD_PASSWORD=your-password\n');
        return;
    }
    
    console.log('✅ Credentials configured\n');
    results.credentials = true;
    
    // Step 2: Test connectivity
    console.log('────────────────────────────────────────────────────────────────');
    console.log('STEP 2: Testing Hub Connectivity');
    console.log('────────────────────────────────────────────────────────────────');
    
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
                console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
                if (res.statusCode === 200) {
                    console.log('✅ Hub is reachable\n');
                    results.connectivity = true;
                } else {
                    console.log('⚠️  Hub returned unexpected status\n');
                }
                resolve();
            });
            
            req.on('error', (e) => {
                console.log(`❌ Connection failed: ${e.message}\n`);
                reject(e);
            });
            
            req.on('timeout', () => {
                console.log('❌ Connection timeout\n');
                req.destroy();
                reject(new Error('Timeout'));
            });
            
            req.end();
        });
    } catch (e) {
        console.log('❌ Cannot reach Management Hub\n');
        console.log('   Possible causes:');
        console.log('   - Internet connection issue');
        console.log('   - Hub URL is incorrect');
        console.log('   - Management Hub is down\n');
        return;
    }
    
    // Step 3: Test authentication
    console.log('────────────────────────────────────────────────────────────────');
    console.log('STEP 3: Testing Authentication');
    console.log('────────────────────────────────────────────────────────────────');
    
    let token = null;
    try {
        token = await authenticate();
        if (token) {
            console.log('✅ Authentication successful\n');
            results.authentication = true;
        }
    } catch (e) {
        if (e.status === 423) {
            console.log('❌ HARDWARE LOCK ERROR\n');
            console.log('   This desk is registered to a different machine.\n');
            console.log('   SOLUTIONS:\n');
            console.log('   1. Use the original machine for this desk ID');
            console.log('   2. Contact support to reset hardware lock');
            console.log('   3. Use a different DESK_ID (e.g., DESK_002)\n');
            results.hardwareLock = true;
        } else if (e.status === 401) {
            console.log('❌ INVALID CREDENTIALS\n');
            console.log('   The email or password is incorrect.\n');
            console.log('   SOLUTIONS:\n');
            console.log('   1. Verify your Management Hub login credentials');
            console.log('   2. Reset password at Management Hub');
            console.log('   3. Check for typos in CLOUD_EMAIL or CLOUD_PASSWORD\n');
        } else {
            console.log(`❌ Authentication error: ${e.message}\n`);
        }
        return;
    }
    
    // Step 4: Test heartbeat
    if (token) {
        console.log('────────────────────────────────────────────────────────────────');
        console.log('STEP 4: Testing Heartbeat');
        console.log('────────────────────────────────────────────────────────────────');
        
        try {
            await sendHeartbeat(token);
            console.log('✅ Heartbeat successful\n');
            results.heartbeat = true;
        } catch (e) {
            console.log(`❌ Heartbeat failed: ${e.message}\n`);
        }
    }
    
    // Summary
    console.log('════════════════════════════════════════════════════════════════');
    console.log('                      DIAGNOSTIC SUMMARY                        ');
    console.log('════════════════════════════════════════════════════════════════\n');
    
    const total = Object.keys(results).length;
    const passed = Object.values(results).filter(v => v).length;
    
    console.log(`   Checks Passed: ${passed}/${total}\n`);
    
    if (passed === total) {
        console.log('   ✅ ALL CHECKS PASSED!');
        console.log('   Cloud Bridge is fully operational.\n');
    } else {
        console.log('   ⚠️  SOME CHECKS FAILED');
        console.log('   See above for details and solutions.\n');
    }
    
    // Recommendations
    console.log('────────────────────────────────────────────────────────────────');
    console.log('                     RECOMMENDATIONS                            ');
    console.log('────────────────────────────────────────────────────────────────\n');
    
    if (!results.credentials) {
        console.log('1. Add CLOUD_EMAIL and CLOUD_PASSWORD to:');
        console.log(`   ${envPath}\n`);
    }
    
    if (results.hardwareLock) {
        console.log('2. To fix Hardware Lock:');
        console.log('   - Contact: support@clickflash.ai');
        console.log('   - Subject: Hardware Lock Reset Request');
        console.log(`   - Desk ID: ${DESK_ID}`);
        console.log(`   - Machine: ${machineId.substring(0, 16)}...\n`);
    }
    
    if (!results.connectivity) {
        console.log('3. Check your internet connection and firewall settings.');
        console.log(`   Hub URL: ${HUB_URL}\n`);
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
    console.error('Fatal error:', err);
    process.exit(1);
});
