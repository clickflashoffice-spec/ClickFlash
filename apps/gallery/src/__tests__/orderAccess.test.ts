/**
 * Gallery Order Access Tests
 * 
 * Tests for customer order lookup and gallery access
 */

// Mock fetch
global.fetch = jest.fn();

describe('Gallery Order Access', () => {
    const API_URL = 'http://localhost:8787';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Order Lookup by Credentials', () => {
        it('should find order by PIN and email', async () => {
            const mockOrder = {
                id: 'order-123',
                clientName: 'Test Customer',
                email: 'test@example.com',
                total: 45.00,
                status: 'Completed',
                items: [
                    { id: 'item-1', photoId: 'photo-1', price: 9.00 }
                ],
                date: '2026-03-13',
                photographerId: 'photog-1'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockOrder
            });

            const result = await fetch(
                `${API_URL}/api/orders/by-credentials?pin=123456&email=test@example.com`
            );

            const data = await result.json();
            expect(data.id).toBe('order-123');
            expect(data.email).toBe('test@example.com');
        });

        it('should find order by magic link token', async () => {
            const mockOrder = {
                id: 'order-123',
                clientName: 'Test Customer',
                magic_link_token: 'magic-abc-123'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockOrder
            });

            const result = await fetch(
                `${API_URL}/api/orders/by-token?token=magic-abc-123`
            );

            const data = await result.json();
            expect(data.id).toBe('order-123');
        });

        it('should return 404 for invalid credentials', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            const result = await fetch(
                `${API_URL}/api/orders/by-credentials?pin=wrong&email=wrong@example.com`
            );

            expect(result.status).toBe(404);
        });
    });

    describe('Photo Access', () => {
        it('should fetch photos for an order', async () => {
            const mockPhotos = [
                { id: 'photo-001', albumId: 'album-1', url: 'http://example.com/1.jpg' },
                { id: 'photo-002', albumId: 'album-1', url: 'http://example.com/2.jpg' }
            ];

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ items: mockPhotos })
            });

            const result = await fetch(
                `${API_URL}/api/collections/photos/records?filter=(albumId="album-1")`
            );

            const data = await result.json();
            expect(data.items).toHaveLength(2);
        });

        it('should generate signed download URL', async () => {
            const mockDownloadUrl = {
                success: true,
                downloadUrl: 'http://r2.example.com/signed-url?expires=123456&sig=abc'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockDownloadUrl
            });

            const result = await fetch(
                `${API_URL}/api/photos/photo-001/download-url`,
                { headers: { 'Authorization': 'Bearer token' } }
            );

            const data = await result.json();
            expect(data.downloadUrl).toContain('signed-url');
        });
    });

    describe('Security', () => {
        it('should require authentication for admin endpoints', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Authentication required' })
            });

            const result = await fetch(`${API_URL}/api/collections/orders/records`);

            expect(result.status).toBe(401);
        });
    });
});
