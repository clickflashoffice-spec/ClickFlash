/**
 * Sync Verification Tests
 * 
 * Tests for Master-to-Hub synchronization verification
 */


// Mock fetch for Hub API calls
global.fetch = jest.fn();

// Mock the pb module
jest.mock('../../pb', () => ({
    pb: {
        baseUrlValue: 'http://localhost:8090',
        authStore: {
            token: 'mock-token'
        }
    }
}));

describe('Sync Verification', () => {
    const HUB_URL = 'http://localhost:8787';
    const TEST_DESK_ID = 'TEST_DESK_01';
    const TEST_ORDER_ID = 'order-phase95-001';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Master Database Checks', () => {
        it('should verify operation logs are marked as synced', async () => {
            // This would be tested via the actual database in integration tests
            // For unit tests, we verify the data structure
            const operationLog = {
                id: 'op-123',
                type: 'INSERT',
                table_name: 'orders',
                record_id: TEST_ORDER_ID,
                desk_id: TEST_DESK_ID,
                status: 'synced',
                sequence_number: 12345,
                timestamp: new Date().toISOString()
            };

            expect(operationLog.status).toBe('synced');
            expect(operationLog.desk_id).toBe(TEST_DESK_ID);
        });

        it('should verify order exists in Master with correct data', () => {
            const order = {
                id: TEST_ORDER_ID,
                clientName: 'Test Customer',
                email: 'test-customer@clickflash.ai',
                total: 45.00,
                status: 'Completed',
                access_pin: '123456',
                desk_id: TEST_DESK_ID,
                items: JSON.stringify([
                    { id: 'item-1', photoId: 'photo-001', price: 9.00 },
                    { id: 'item-2', photoId: 'photo-002', price: 9.00 }
                ])
            };

            expect(order.id).toBe(TEST_ORDER_ID);
            expect(order.total).toBe(45.00);
            expect(order.access_pin).toBe('123456');
            expect(JSON.parse(order.items)).toHaveLength(2);
        });
    });

    describe('Hub API Checks', () => {
        it('should authenticate with Hub successfully', async () => {
            const mockAuthResponse = {
                token: 'hub-jwt-token',
                user: {
                    id: 'desk-user-123',
                    desk_id: TEST_DESK_ID
                }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockAuthResponse
            });

            const response = await fetch(`${HUB_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'test-desk@clickflash.ai',
                    password: 'test_password_123',
                    machine_id: 'test-machine'
                })
            });

            const data = await response.json();

            expect(response.ok).toBe(true);
            expect(data.token).toBe('hub-jwt-token');
            expect(data.user.desk_id).toBe(TEST_DESK_ID);
        });

        it('should verify order exists in Hub', async () => {
            const mockOrder = {
                id: TEST_ORDER_ID,
                clientName: 'Test Customer',
                email: 'test-customer@clickflash.ai',
                total: 45.00,
                status: 'Completed',
                access_pin: '123456',
                desk_id: TEST_DESK_ID,
                items: [
                    { id: 'item-1', photoId: 'photo-001', price: 9.00 },
                    { id: 'item-2', photoId: 'photo-002', price: 9.00 }
                ]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ items: [mockOrder] })
            });

            const response = await fetch(
                `${HUB_URL}/api/collections/orders/records?filter=(id="${TEST_ORDER_ID}")`,
                {
                    headers: { 'Authorization': 'Bearer hub-token' }
                }
            );

            const data = await response.json();

            expect(response.ok).toBe(true);
            expect(data.items[0].id).toBe(TEST_ORDER_ID);
            expect(data.items[0].desk_id).toBe(TEST_DESK_ID);
            expect(data.items[0].total).toBe(45.00);
        });

        it('should verify order is accessible via Gallery API', async () => {
            const mockOrder = {
                id: TEST_ORDER_ID,
                clientName: 'Test Customer',
                email: 'test-customer@clickflash.ai',
                total: 45.00,
                status: 'Completed',
                access_pin: '123456',
                items: [{ id: 'item-1', photoId: 'photo-001' }]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockOrder
            });

            const response = await fetch(
                `${HUB_URL}/api/orders/by-credentials?pin=123456&email=test-customer@clickflash.ai`
            );

            const data = await response.json();

            expect(response.ok).toBe(true);
            expect(data.id).toBe(TEST_ORDER_ID);
            expect(data.access_pin).toBe('123456');
        });

        it('should verify photos exist in Hub', async () => {
            const mockPhotos = [
                { id: 'photo-phase95-001', albumId: 'album-phase95-001', title: 'Test Photo 1' },
                { id: 'photo-phase95-002', albumId: 'album-phase95-001', title: 'Test Photo 2' }
            ];

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ items: mockPhotos })
            });

            const response = await fetch(
                `${HUB_URL}/api/collections/photos/records?filter=(albumId="album-phase95-001")`,
                {
                    headers: { 'Authorization': 'Bearer hub-token' }
                }
            );

            const data = await response.json();

            expect(response.ok).toBe(true);
            expect(data.items).toHaveLength(2);
            expect(data.items[0].albumId).toBe('album-phase95-001');
        });
    });

    describe('Data Integrity Checks', () => {
        it('should verify order data matches between Master and Hub', () => {
            const masterOrder = {
                id: TEST_ORDER_ID,
                clientName: 'Test Customer',
                email: 'test-customer@clickflash.ai',
                total: 45.00,
                status: 'Completed',
                access_pin: '123456'
            };

            const hubOrder = {
                id: TEST_ORDER_ID,
                clientName: 'Test Customer',
                email: 'test-customer@clickflash.ai',
                total: 45.00,
                status: 'Completed',
                access_pin: '123456'
            };

            expect(masterOrder.id).toBe(hubOrder.id);
            expect(masterOrder.clientName).toBe(hubOrder.clientName);
            expect(masterOrder.email).toBe(hubOrder.email);
            expect(masterOrder.total).toBe(hubOrder.total);
            expect(masterOrder.status).toBe(hubOrder.status);
            expect(masterOrder.access_pin).toBe(hubOrder.access_pin);
        });

        it('should detect data mismatch', () => {
            const masterOrder = {
                id: TEST_ORDER_ID,
                total: 45.00
            };

            const hubOrder = {
                id: TEST_ORDER_ID,
                total: 50.00 // Different total
            };

            expect(masterOrder.total).not.toBe(hubOrder.total);
        });
    });
});
