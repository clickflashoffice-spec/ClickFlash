/**
 * Management Hub Server Tests
 * 
 * Tests for Cloudflare Worker backend API
 */

import { jest } from '@jest/globals';

// Mock D1 Database
const mockDb: any = {
    prepare: jest.fn(() => mockDb),
    bind: jest.fn(() => mockDb),
    first: jest.fn(),
    run: jest.fn(),
    all: jest.fn(),
};

// Mock R2 Bucket
const mockR2Bucket = {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
};

const createExecutionContext = (): any => ({
    waitUntil: jest.fn(),
    passThroughOnException: jest.fn(),
});

// Test environment
const createEnv = (): any => ({
    DB: mockDb,
    GALLERY_BUCKET: mockR2Bucket,
    JWT_SECRET: 'test-secret-key-for-jwt-signing',
    ALLOWED_ORIGINS: '*',
    RESEND_API_KEY: 'test-resend-key',
    FROM_EMAIL: 'test@clickflash.ai',
});

describe('Management Hub API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Health Check', () => {
        it('should return health status', async () => {
            const request = new Request('http://localhost:8787/api/health');
            const env = createEnv();
            
            // Import the server handler
            const { default: worker } = await import('../server');
            const response = await worker.fetch(request, env, createExecutionContext());
            
            expect(response.status).toBe(200);
            const data = (await response.json()) as any;
            expect(data.status).toBe('ok');
            expect(data.timestamp).toBeDefined();
        });
    });

    describe('Authentication', () => {
        it('should register a new desk', async () => {
            mockDb.run.mockResolvedValueOnce({});
            
            const request = new Request('http://localhost:8787/api/auth/register-desk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deskId: 'TEST_DESK_01',
                    deskName: 'Test Desk',
                    email: 'test@clickflash.ai',
                    password: 'DEFAULT_PASSWORD_PLACEHOLDER'
                })
            });
            
            const env = createEnv();
            const { default: worker } = await import('../server');
            const response = await worker.fetch(request, env, createExecutionContext());
            
            expect(response.status).toBe(201);
            const data = (await response.json()) as any;
            expect(data.success).toBe(true);
            expect(data.token).toBeDefined();
            expect(data.desk.deskId).toBe('TEST_DESK_01');
        });

        it('should login with valid credentials', async () => {
            mockDb.first.mockResolvedValueOnce({
                id: 'user-123',
                email: 'test@clickflash.ai',
                password: '$2b$10$moD2jKc7ePooDDqfE6OBJeWcjsEj6yN1cMj66nwqtLbowArvk7lsS',
                role: 'desk',
                desk_id: 'TEST_DESK_01',
                machine_id: null
            });
            
            const request = new Request('http://localhost:8787/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'test@clickflash.ai',
                    password: 'DEFAULT_PASSWORD_PLACEHOLDER',
                    machine_id: 'machine-abc'
                })
            });
            
            const env = createEnv();
            const { default: worker } = await import('../server');
            const response = await worker.fetch(request, env, createExecutionContext());
            
            expect(response.status).toBe(200);
            const data = (await response.json()) as any;
            expect(data.token).toBeDefined();
            expect(data.user.email).toBe('test@clickflash.ai');
        });

        it('should reject invalid credentials', async () => {
            mockDb.first.mockResolvedValueOnce(null);
            
            const request = new Request('http://localhost:8787/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'wrong@clickflash.ai',
                    password: 'wrongpassword'
                })
            });
            
            const env = createEnv();
            const { default: worker } = await import('../server');
            const response = await worker.fetch(request, env, createExecutionContext());
            
            expect(response.status).toBe(401);
        });
    });

    describe('Order Operations', () => {
        it('should get order by credentials', async () => {
            const mockOrder = {
                id: 'order-123',
                clientName: 'Test Customer',
                email: 'test@example.com',
                status: 'Completed',
                total: 45.00,
                access_pin: '123456',
                items: JSON.stringify([{ id: 'item-1', photoId: 'photo-1' }])
            };
            
            mockDb.first.mockResolvedValueOnce(mockOrder);
            
            const request = new Request(
                'http://localhost:8787/api/orders/by-credentials?pin=123456&email=test@example.com'
            );
            
            const env = createEnv();
            const { default: worker } = await import('../server');
            const response = await worker.fetch(request, env, createExecutionContext());
            
            expect(response.status).toBe(200);
            const data = (await response.json()) as any;
            expect(data.id).toBe('order-123');
            expect(Array.isArray(data.items)).toBe(true);
        });

        it('should get order by magic link token', async () => {
            const mockOrder = {
                id: 'order-123',
                clientName: 'Test Customer',
                magic_link_token: 'magic-token-abc'
            };
            
            mockDb.first.mockResolvedValueOnce(mockOrder);
            
            const request = new Request(
                'http://localhost:8787/api/orders/by-token?token=magic-token-abc'
            );
            
            const env = createEnv();
            const { default: worker } = await import('../server');
            const response = await worker.fetch(request, env, createExecutionContext());
            
            expect(response.status).toBe(200);
            const data = (await response.json()) as any;
            expect(data.id).toBe('order-123');
        });
    });

    describe('Sync Operations', () => {
        it('should receive operation logs from Master', async () => {
            mockDb.run.mockResolvedValue({});
            mockDb.all.mockResolvedValue([]);
            
            const operations = [
                {
                    id: 'op-1',
                    type: 'INSERT',
                    table: 'orders',
                    record_id: 'order-123',
                    payload: { id: 'order-123', total: 45.00 },
                    sequence_number: 1
                }
            ];
            
            const request = new Request('http://localhost:8787/api/cloud/sync/operations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer valid-token'
                },
                body: JSON.stringify({ operations })
            });
            
            const env = createEnv();
            const { default: worker } = await import('../server');
            const response = await worker.fetch(request, env, createExecutionContext());
            
            expect(response.status).toBe(200);
        });
    });

    describe('Fleet Management', () => {
        it('should receive heartbeat from Master', async () => {
            mockDb.run.mockResolvedValue({});
            
            const heartbeat = {
                desk_id: 'TEST_DESK_01',
                timestamp: new Date().toISOString(),
                version: '4.2.0',
                uptime: 3600,
                metrics: {
                    orders_today: 5,
                    photos_today: 25,
                    pending_sync: 0
                }
            };
            
            const request = new Request('http://localhost:8787/api/cloud/heartbeat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer valid-token'
                },
                body: JSON.stringify(heartbeat)
            });
            
            const env = createEnv();
            const { default: worker } = await import('../server');
            const response = await worker.fetch(request, env, createExecutionContext());
            
            expect(response.status).toBe(200);
        });
    });

    describe('CORS', () => {
        it('should handle CORS preflight', async () => {
            const request = new Request('http://localhost:8787/api/health', {
                method: 'OPTIONS'
            });
            
            const env = createEnv();
            const { default: worker } = await import('../server');
            const response = await worker.fetch(request, env, createExecutionContext());
            
            expect(response.status).toBe(200);
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        });
    });
});
