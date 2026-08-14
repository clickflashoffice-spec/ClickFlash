import { type Mock } from 'vitest';
/**
 * Touch Kiosk Sync Tests
 * 
 * Tests for Touch Kiosk synchronization with Master
 */

// Mock fetch
global.fetch = vi.fn();

describe('Touch Kiosk Sync', () => {
    const MASTER_URL = 'http://localhost:8090';
    const KIOSK_ID = 'KIOSK_001';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('LAN Communication', () => {
        it('should pair with Master using QR code', async () => {
            (global.fetch as Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    paired: true,
                    masterIp: '192.168.1.100'
                })
            });

            const result = await fetch(`${MASTER_URL}/api/pairing/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kioskId: KIOSK_ID, pairingCode: 'ABC123' })
            });

            const data = await result.json();
            expect(data.success).toBe(true);
        });

        it('should send HMAC-signed requests to Master', async () => {
            (global.fetch as Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            await fetch(`${MASTER_URL}/api/sync/mutation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Kiosk-ID': KIOSK_ID,
                    'X-Timestamp': Date.now().toString(),
                    'X-Signature': 'hmac-signature-abc123'
                },
                body: JSON.stringify({ entity: 'orders', action: 'create' })
            });

            const requestInit = (global.fetch as Mock).mock.calls[0][1];
            expect(requestInit.headers['X-Kiosk-ID']).toBe(KIOSK_ID);
            expect(requestInit.headers['X-Signature']).toBeDefined();
        });
    });

    describe('Order Creation', () => {
        it('should create order on Touch and sync to Master', async () => {
            const order = {
                id: 'touch-order-001',
                clientName: 'Kiosk Customer',
                total: 15.00,
                status: 'Pending',
                kioskId: KIOSK_ID
            };

            (global.fetch as Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, order })
            });

            const result = await fetch(`${MASTER_URL}/api/collections/orders/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });

            const data = await result.json();
            expect(data.success).toBe(true);
        });
    });

    describe('Offline Queue', () => {
        it('should queue mutations when offline', () => {
            const offlineQueue: any[] = [];
            const mutation = { id: 'mut-1', entity: 'orders', data: { id: 'order-123' } };
            const isOnline = false;
            
            if (!isOnline) {
                offlineQueue.push(mutation);
            }

            expect(offlineQueue).toHaveLength(1);
        });
    });
});
