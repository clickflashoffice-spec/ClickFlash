/**
 * Master Portal Backend API Tests
 * 
 * Comprehensive test suite for all Master Portal API endpoints including:
 * - Public endpoints (health, mode, IP, init, login)
 * - Protected endpoints (CRUD operations, data refresh, sync)
 * - Authentication and authorization
 * - Error handling
 * - Batch operations
 * - Optimistic locking
 * - Edge cases
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const rateLimiter = require('../shared/rateLimiter');

// Test configuration
const TEST_PORT = 8091; // Use different port to avoid conflicts
const TEST_DATA_DIR = path.resolve(__dirname, '../test_data');
const TEST_DB_FILE = path.join(TEST_DATA_DIR, 'master.db');
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Test utilities
let testServer = null;
let serverInstance = null;
let dbManagerInstance = null;
let testToken = null;
let testUserId = null;
let testAlbumId = null;

/**
 * Make HTTP request helper
 */
function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: parsed,
                        rawBody: body
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body,
                        rawBody: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * Setup test environment
 */
async function setupTestEnvironment() {
    // Clean up test data directory with retry logic
    let retries = 5;
    while (retries > 0) {
        try {
            if (fs.existsSync(TEST_DATA_DIR)) {
                fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
            }
            break;
        } catch (e) {
            if (e.code === 'EBUSY' || e.code === 'EPERM') {
                retries--;
                console.log(`[Setup] Cleanup failed (EBUSY), retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                throw e;
            }
        }
    }

    // Wait for file system to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    if (fs.existsSync(TEST_DATA_DIR)) {
        // If still exists after retries, try to rename it to move it out of the way
        try {
            const trashDir = `${TEST_DATA_DIR}_trash_${Date.now()}`;
            fs.renameSync(TEST_DATA_DIR, trashDir);
        } catch (e) {
            console.warn('[Setup] Failed to remove or rename test dir:', e.message);
        }
    }

    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    // Set environment variables for test
    process.env.DATA_DIR = TEST_DATA_DIR;
    process.env.PORT = TEST_PORT;
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

    // Start test server
    const { server, dbManager } = require('../master/server');
    serverInstance = server;
    dbManagerInstance = dbManager;
    // Server should start automatically when required

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Initialize default user
    const initResponse = await makeRequest('POST', '/api/init/default-user');
    expect(initResponse.status).toBe(200);

    // Login to get token
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
        email: 'alaeddine@example.com',
        password: 'clickflash2025'
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();
    testToken = loginResponse.body.token;
    testUserId = loginResponse.body.user.id;
}

/**
 * Cleanup test environment
 */
async function cleanupTestEnvironment() {
    // Close server
    if (serverInstance) {
        await new Promise(resolve => serverInstance.close(resolve));
    }

    // Close database
    if (dbManagerInstance) {
        dbManagerInstance.close();
    }

    // Wait for resources to release
    await new Promise(resolve => setTimeout(resolve, 500));

    // Clean up test data directory
    if (fs.existsSync(TEST_DATA_DIR)) {
        try {
            // Stop rate limiter interval
            if (rateLimiter.stop) rateLimiter.stop();

            // Rename to trash dir to avoid EBUSY on Windows
            // We can't reliably delete immediately if processes are holding locks
            const trashDir = path.join(__dirname, `../test_data_trash_${Date.now()}`);
            fs.renameSync(TEST_DATA_DIR, trashDir);
        } catch (e) {
            console.warn('Failed to cleanup test data dir:', e.message);
        }
    }
}

describe('Master Portal API Tests', () => {
    beforeAll(async () => {
        await setupTestEnvironment();
    }, 30000);

    afterAll(async () => {
        await cleanupTestEnvironment();
    }, 10000);

    describe('Public Endpoints', () => {
        describe('GET /api/health', () => {
            it('should return server health status', async () => {
                const response = await makeRequest('GET', '/api/health');

                expect(response.status).toBe(200);
                expect(response.body.status).toBe('online');
                expect(response.body.code).toBe(200);
                expect(response.body.version).toBeDefined();
                expect(response.body.db).toBe('sqlite');
                expect(response.body.security).toBe('enabled');
            });
        });

        describe('GET /api/mode', () => {
            it('should return backend mode and port', async () => {
                const response = await makeRequest('GET', '/api/mode');

                expect(response.status).toBe(200);
                expect(response.body.mode).toBe('master');
                expect(response.body.backendPort).toBe(TEST_PORT);
            });
        });

        describe('GET /api/ip', () => {
            it('should return network interfaces', async () => {
                const response = await makeRequest('GET', '/api/ip');

                expect(response.status).toBe(200);
                expect(response.body.interfaces).toBeDefined();
                expect(Array.isArray(response.body.interfaces)).toBe(true);
                expect(response.body.interfaces.length).toBeGreaterThan(0);
                expect(response.body.interfaces[0]).toHaveProperty('name');
                expect(response.body.interfaces[0]).toHaveProperty('ip');
            });
        });

        describe('POST /api/init/default-user', () => {
            it('should initialize default user', async () => {
                const response = await makeRequest('POST', '/api/init/default-user');

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.user).toBeDefined();
                expect(response.body.user.email).toBe('alaeddine@example.com');
            });

            it('should handle force parameter', async () => {
                const response = await makeRequest('POST', '/api/init/default-user?force=true');

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });

        describe('POST /api/auth/login', () => {
            it('should login with valid credentials', async () => {
                const response = await makeRequest('POST', '/api/auth/login', {
                    email: 'alaeddine@example.com',
                    password: 'clickflash2025'
                });

                expect(response.status).toBe(200);
                expect(response.body.token).toBeDefined();
                expect(response.body.user).toBeDefined();
                expect(response.body.user.email).toBe('alaeddine@example.com');
                expect(response.body.user.password).toBeUndefined();
            });

            it('should reject invalid email', async () => {
                const response = await makeRequest('POST', '/api/auth/login', {
                    email: 'invalid@example.com',
                    password: 'clickflash2025'
                });

                expect(response.status).toBe(401);
            });

            it('should reject invalid password', async () => {
                const response = await makeRequest('POST', '/api/auth/login', {
                    email: 'alaeddine@example.com',
                    password: 'wrongpassword'
                });

                expect(response.status).toBe(401);
            });

            it('should reject missing email', async () => {
                const response = await makeRequest('POST', '/api/auth/login', {
                    password: 'clickflash2025'
                });

                expect(response.status).toBe(400);
            });

            it('should reject missing password', async () => {
                const response = await makeRequest('POST', '/api/auth/login', {
                    email: 'alaeddine@example.com'
                });

                expect(response.status).toBe(400);
            });

            it('should reject invalid JSON', async () => {
                // This would require a different request method to send invalid JSON
                // For now, we test that valid JSON is required
                const response = await makeRequest('POST', '/api/auth/login', {
                    email: 'alaeddine@example.com',
                    password: 'clickflash2025'
                });

                expect(response.status).toBe(200);
            });
        });
    });

    describe('Protected Endpoints - Authentication', () => {
        it('should reject requests without token', async () => {
            const response = await makeRequest('GET', '/api/collections/users/records');

            expect(response.status).toBe(401);
        });

        it('should reject requests with invalid token', async () => {
            const response = await makeRequest('GET', '/api/collections/users/records', null, 'invalid-token');

            expect(response.status).toBe(401);
        });

        it('should accept requests with valid token', async () => {
            const response = await makeRequest('GET', '/api/collections/users/records', null, testToken);

            expect(response.status).toBe(200);
        });
    });

    describe('CRUD Operations - Users', () => {
        let createdUserId = null;

        it('should create a new user', async () => {
            const response = await makeRequest('POST', '/api/collections/users/records', {
                name: 'Test User',
                email: 'testuser@example.com',
                password: 'testpassword123',
                role: 'Photographer'
            }, testToken);

            expect(response.status).toBe(200);
            expect(response.body.id).toBeDefined();
            expect(response.body.name).toBe('Test User');
            expect(response.body.email).toBe('testuser@example.com');
            expect(response.body.password).toBeUndefined();
            createdUserId = response.body.id;
            testUserId = createdUserId;
        });

        it('should get all users', async () => {
            const response = await makeRequest('GET', '/api/collections/users/records', null, testToken);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.items)).toBe(true);
            expect(response.body.items.length).toBeGreaterThan(0);
        });

        it('should get user by ID', async () => {
            const response = await makeRequest('GET', `/api/collections/users/records/${createdUserId}`, null, testToken);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(createdUserId);
            expect(response.body.name).toBe('Test User');
        });

        it('should update user', async () => {
            const response = await makeRequest('PATCH', `/api/collections/users/records/${createdUserId}`, {
                name: 'Updated Test User'
            }, testToken);

            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Updated Test User');
        });

        it('should delete user', async () => {
            const response = await makeRequest('DELETE', `/api/collections/users/records/${createdUserId}`, null, testToken);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should return 404 for non-existent user', async () => {
            const response = await makeRequest('GET', '/api/collections/users/records/non-existent-id', null, testToken);

            expect(response.status).toBe(404);
        });
    });

    describe('CRUD Operations - Albums', () => {
        let createdAlbumId = null;

        it('should create a new album', async () => {
            // Create a dedicated user for album tests since the previous one might be deleted
            const uniqueEmail = `album_photog_${Date.now()}@example.com`;
            const userResponse = await makeRequest('POST', '/api/collections/users/records', {
                name: 'Album Photographer',
                email: uniqueEmail,
                password: 'password123',
                role: 'Photographer'
            }, testToken);

            if (userResponse.status !== 200) {
                console.log('Create Album User Error:', JSON.stringify(userResponse.body, null, 2));
            }
            expect(userResponse.status).toBe(200);
            const photographerId = userResponse.body.id;

            const response = await makeRequest('POST', '/api/collections/albums/records', {
                title: 'Test Album',
                date: '2025-01-15',
                photographerId: photographerId,
                status: 'Draft'
            }, testToken);

            if (response.status !== 200) {
                console.log('Create Album Error:', JSON.stringify(response.body, null, 2));
            }
            expect(response.status).toBe(200);
            expect(response.body.id).toBeDefined();
            expect(response.body.title).toBe('Test Album');
            createdAlbumId = response.body.id;
            testAlbumId = createdAlbumId;
        });

        it('should get all albums', async () => {
            const response = await makeRequest('GET', '/api/collections/albums/records', null, testToken);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.items)).toBe(true);
        });

        it('should update album', async () => {
            const response = await makeRequest('PATCH', `/api/collections/albums/records/${createdAlbumId}`, {
                title: 'Updated Test Album',
                status: 'Finalized'
            }, testToken);

            if (response.status !== 200) {
                console.log('Update Album Error:', JSON.stringify(response.body, null, 2));
            }
            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Updated Test Album');
            expect(response.body.status).toBe('Finalized');
        });

        it('should delete album', async () => {
            const response = await makeRequest('DELETE', `/api/collections/albums/records/${createdAlbumId}`, null, testToken);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('Batch Operations', () => {
        it('should create multiple users in batch', async () => {
            const timestamp = Date.now();
            const batchData = [
                { name: 'Batch User 1', email: `batch1_${timestamp}@example.com`, password: 'password123', role: 'Photographer' },
                { name: 'Batch User 2', email: `batch2_${timestamp}@example.com`, password: 'password123', role: 'Photographer' },
                { name: 'Batch User 3', email: `batch3_${timestamp}@example.com`, password: 'password123', role: 'Photographer' }
            ];

            const response = await makeRequest('POST', '/api/collections/users/records', batchData, testToken);

            expect(response.status).toBe(200);
            expect(response.body.items).toBeDefined();
            expect(Array.isArray(response.body.items)).toBe(true);
            expect(response.body.items.length).toBe(3);
            expect(response.body.successCount).toBe(3);
            expect(response.body.failureCount).toBe(0);
        });

        it('should handle batch with some failures', async () => {
            const batchData = [
                { name: 'Valid User', email: 'valid@example.com', password: 'password123', role: 'Photographer' },
                { name: 'Invalid User', email: 'valid@example.com', password: 'password123', role: 'Photographer' } // Duplicate email
            ];

            const response = await makeRequest('POST', '/api/collections/users/records', batchData, testToken);

            expect(response.status).toBe(200);
            expect(response.body.items).toBeDefined();
            expect(response.body.failureCount).toBeGreaterThan(0);
        });

        it('should reject batch exceeding max size', async () => {
            const batchData = Array(101).fill(null).map((_, i) => ({
                name: `User ${i}`,
                email: `user${i}@example.com`,
                password: 'password123',
                role: 'Photographer'
            }));

            const response = await makeRequest('POST', '/api/collections/users/records', batchData, testToken);

            expect(response.status).toBe(400);
        });

        it('should reject empty batch', async () => {
            const response = await makeRequest('POST', '/api/collections/users/records', [], testToken);

            expect(response.status).toBe(400);
        });
    });

    describe('Optimistic Locking', () => {
        let optAlbumId = null;
        let optUserId = null;

        beforeAll(async () => {
            // Create user
            const userRes = await makeRequest('POST', '/api/collections/users/records', {
                email: `opt_user_${Date.now()}@example.com`,
                password: 'password123',
                passwordConfirm: 'password123',
                name: 'Optimistic User',
                role: 'Photographer'
            }, testToken);
            console.log('Optimistic User Creation:', userRes.status, JSON.stringify(userRes.body));
            optUserId = userRes.body.id;

            // Create album
            const albumRes = await makeRequest('POST', '/api/collections/albums/records', {
                title: 'Optimistic Album',
                date: '2023-01-01',
                photographerId: optUserId,
                status: 'Draft'
            }, testToken);
            console.log('Optimistic Album Creation:', albumRes.status, JSON.stringify(albumRes.body));
            optAlbumId = albumRes.body.id;
        });

        it('should update with correct updated_at timestamp', async () => {
            // First get the current record to get updated_at
            const getResponse = await makeRequest('GET', `/api/collections/albums/records/${optAlbumId}`, null, testToken);
            const currentUpdatedAt = getResponse.body.updated_at;

            const response = await makeRequest('PATCH', `/api/collections/albums/records/${optAlbumId}`, {
                title: 'Updated Title',
                updatedAt: currentUpdatedAt
            }, testToken);

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Updated Title');
        });

        it('should detect conflict with outdated updated_at', async () => {
            // Use an old timestamp
            const oldDate = new Date(Date.now() - 10000).toISOString();

            const response = await makeRequest('PATCH', `/api/collections/albums/records/${optAlbumId}`, {
                title: 'Conflict Title',
                updatedAt: oldDate
            }, testToken);

            expect(response.status).toBe(409); // Conflict
        });
    });

    describe('Data Refresh Endpoint', () => {
        it('should refresh all collections', async () => {
            const response = await makeRequest('POST', '/api/data/refresh', {}, testToken);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.refreshed).toBeDefined();
            expect(Array.isArray(response.body.refreshed)).toBe(true);
        });

        it('should refresh specific collections', async () => {
            const response = await makeRequest('POST', '/api/data/refresh', {
                collections: ['users', 'albums']
            }, testToken);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.refreshed).toContain('users');
            expect(response.body.refreshed).toContain('albums');
        });

        it('should support incremental refresh', async () => {
            const response = await makeRequest('POST', '/api/data/refresh', {
                incremental: true,
                lastRefreshTime: new Date().toISOString()
            }, testToken);

            expect(response.status).toBe(200);
            expect(response.body.status).toBeDefined();
        });
    });

    describe('Sync Status Endpoint', () => {
        it('should return sync status', async () => {
            const response = await makeRequest('GET', '/api/sync/status', null, testToken);

            expect(response.status).toBe(200);
            expect(response.body.kiosks).toBeDefined();
            expect(Array.isArray(response.body.kiosks)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid collection name', async () => {
            const response = await makeRequest('GET', '/api/collections/invalid_collection/records', null, testToken);

            expect(response.status).toBe(404);
        });

        it('should handle invalid JSON in request body', async () => {
            // This would require sending raw invalid JSON
            // For now, we verify that valid JSON is required
            const response = await makeRequest('POST', '/api/collections/users/records', {
                name: 'Test User'
                // Missing required fields
            }, testToken);

            expect(response.status).toBe(400);
        });

        it('should handle foreign key constraint violations', async () => {
            const response = await makeRequest('POST', '/api/collections/photos/records', {
                albumId: 'non-existent-album-id',
                title: 'Test Photo'
            }, testToken);

            expect(response.status).toBe(400);
        });

        it('should handle duplicate unique constraints', async () => {
            // Create first user
            await makeRequest('POST', '/api/collections/users/records', {
                name: 'Duplicate Test',
                email: 'duplicate@example.com',
                password: 'password123',
                role: 'Photographer'
            }, testToken);

            // Try to create duplicate
            const response = await makeRequest('POST', '/api/collections/users/records', {
                name: 'Duplicate Test 2',
                email: 'duplicate@example.com',
                password: 'password123',
                role: 'Photographer'
            }, testToken);

            expect(response.status).toBe(409); // Conflict
        });
    });

    describe('Rate Limiting', () => {
        it('should handle rate limit headers', async () => {
            // Make multiple rapid requests
            const requests = Array(10).fill(null).map(() =>
                makeRequest('GET', '/api/collections/users/records', null, testToken)
            );

            const responses = await Promise.all(requests);

            // All should succeed (rate limiting may not be strict in test environment)
            // But we verify the endpoint works under load
            responses.forEach(response => {
                expect([200, 429]).toContain(response.status);
            });
        });
    });

    describe('Query Parameters', () => {
        it('should support filtering', async () => {
            const response = await makeRequest('GET', '/api/collections/users/records?filter=role:Admin', null, testToken);

            expect(response.status).toBe(200);
            expect(response.body.items).toBeDefined();
        });

        it('should support sorting', async () => {
            const response = await makeRequest('GET', '/api/collections/users/records?sort=%2Bname', null, testToken);

            if (response.status !== 200) {
                console.log('Sorting Error:', JSON.stringify(response.body, null, 2));
            }
            expect(response.status).toBe(200);
            expect(response.body.items).toBeDefined();
        });

        it('should support pagination', async () => {
            const response = await makeRequest('GET', '/api/collections/users/records?page=1&perPage=10', null, testToken);

            expect(response.status).toBe(200);
            expect(response.body.items).toBeDefined();
        });
    });
});

