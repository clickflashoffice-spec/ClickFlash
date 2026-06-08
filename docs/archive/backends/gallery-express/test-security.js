/**
 * Security Test Script
 * Comprehensive security verification tests for the API
 * Tests SQL injection prevention, authentication, CORS, and authorization
 * 
 * @module test-security
 */

const http = require('http');

// Test Configuration
const BASE_URL = 'http://localhost:8090';

// Helper function to make HTTP requests
function makeRequest(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data ? JSON.parse(data) : null
                });
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runSecurityTests() {
    console.log('🔒 SECURITY VERIFICATION TESTS\n');
    console.log('='.repeat(60));

    // Test 1: Health Check (Public Endpoint)
    console.log('\n✅ Test 1: Health Check (Should Work - Public Endpoint)');
    try {
        const response = await makeRequest('GET', '/api/health');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, response.body);
        console.log(`   Security Enabled: ${response.body.security === 'enabled' ? 'YES ✓' : 'NO ✗'}`);
    } catch (err) {
        console.log(`   ✗ Error: ${err.message}`);
    }

    // Test 2: SQL Injection Prevention
    console.log('\n🛡️  Test 2: SQL Injection Prevention');
    console.log('   Attempting malicious filter: id=1 UNION SELECT password FROM users--');
    try {
        const response = await makeRequest('GET', '/api/collections/users/records?filter=id=1 UNION SELECT password FROM users--');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, response.body);
        if (response.status === 400 || response.status === 401) {
            console.log('   ✓ SQL Injection BLOCKED!');
        } else {
            console.log('   ✗ SQL Injection NOT BLOCKED - VULNERABILITY!');
        }
    } catch (err) {
        console.log(`   ✗ Error: ${err.message}`);
    }

    // Test 3: Invalid Column Name
    console.log('\n🛡️  Test 3: Invalid Column Filter (Not in Whitelist)');
    console.log('   Attempting filter with non-whitelisted column: malicious_column=value');
    try {
        const response = await makeRequest('GET', '/api/collections/users/records?filter=malicious_column=value');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, response.body);
        if (response.status === 400 || response.status === 401) {
            console.log('   ✓ Invalid column BLOCKED!');
        } else {
            console.log('   ✗ Invalid column NOT BLOCKED - VULNERABILITY!');
        }
    } catch (err) {
        console.log(`   ✗ Error: ${err.message}`);
    }

    // Test 4: Authentication Required
    console.log('\n🔐 Test 4: Authentication Middleware');
    console.log('   Attempting to access protected endpoint without token');
    try {
        const response = await makeRequest('GET', '/api/collections/orders/records');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, response.body);
        if (response.status === 401) {
            console.log('   ✓ Authentication REQUIRED!');
        } else {
            console.log('   ✗ Authentication NOT REQUIRED - VULNERABILITY!');
        }
    } catch (err) {
        console.log(`   ✗ Error: ${err.message}`);
    }

    // Test 5: Invalid Token
    console.log('\n🔐 Test 5: Invalid JWT Token');
    console.log('   Attempting to access protected endpoint with invalid token');
    try {
        const response = await makeRequest('GET', '/api/collections/orders/records', {
            'Authorization': 'Bearer invalid-token-12345'
        });
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, response.body);
        if (response.status === 401) {
            console.log('   ✓ Invalid token REJECTED!');
        } else {
            console.log('   ✗ Invalid token ACCEPTED - VULNERABILITY!');
        }
    } catch (err) {
        console.log(`   ✗ Error: ${err.message}`);
    }

    // Test 6: CORS Headers
    console.log('\n🌐 Test 6: CORS Configuration');
    try {
        const response = await makeRequest('GET', '/api/health', {
            'Origin': 'http://localhost:5173'
        });
        console.log(`   CORS Headers:`);
        console.log(`   - Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin']}`);
        console.log(`   - Access-Control-Allow-Credentials: ${response.headers['access-control-allow-credentials']}`);

        if (response.headers['access-control-allow-origin'] !== '*') {
            console.log('   ✓ CORS Whitelist ENABLED (not using wildcard)');
        } else {
            console.log('   ✗ CORS using wildcard - VULNERABILITY!');
        }
    } catch (err) {
        console.log(`   ✗ Error: ${err.message}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ SECURITY VERIFICATION COMPLETE\n');
}

// Run tests
runSecurityTests().catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
});
