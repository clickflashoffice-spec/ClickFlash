import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createConcessionRouter } from '../concession.routes';

describe('Concession Enterprise Routes', () => {
    let app: express.Express;
    let mockDb: any;
    let mockDbManager: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockDb = {
            prepare: vi.fn().mockReturnValue({
                all: vi.fn().mockReturnValue([
                    { id: 'gear-1', asset_tag: 'CAM-001', model: 'Sony Alpha 7 IV', status: 'AVAILABLE' }
                ]),
                run: vi.fn().mockReturnValue({ changes: 1 })
            })
        };

        mockDbManager = {
            getDb: vi.fn().mockReturnValue(mockDb)
        };

        app = express();
        app.use(express.json());
        app.use('/api/concession', createConcessionRouter(mockDbManager));
    });

    describe('Pillar 1: Gear Asset Tracking', () => {
        it('GET /api/concession/gear should return serialized fleet', async () => {
            const res = await request(app).get('/api/concession/gear?venueId=venue-1');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM gear_assets'));
        });

        it('POST /api/concession/gear/checkout should record sign-out', async () => {
            const res = await request(app)
                .post('/api/concession/gear/checkout')
                .send({
                    gearId: 'gear-1',
                    userId: 'usr-101',
                    userName: 'Alex Johnson',
                    checkoutCondition: 5
                });
            
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.checkoutId).toBeDefined();
        });
    });

    describe('Pillar 1: Print Spooler Queue', () => {
        it('POST /api/concession/print-queue should enqueue print job', async () => {
            const res = await request(app)
                .post('/api/concession/print-queue')
                .send({
                    venueId: 'venue-1',
                    printerName: 'DNP DS620 - Main Kiosk',
                    orderId: 'ord-9921',
                    photoUrl: 'https://cdn.clickflash.app/photos/p1.jpg',
                    paperSize: '6x8',
                    copies: 2
                });
            
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.printJobId).toBeDefined();
        });
    });

    describe('Pillar 3: Sleeping Money WhatsApp Hook', () => {
        it('POST /api/concession/sleeping-money/:id/trigger-swarm should dispatch closer swarm', async () => {
            const res = await request(app)
                .post('/api/concession/sleeping-money/lead-401/trigger-swarm')
                .send();
            
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('WhatsApp closer swarm dispatched');
        });
    });

    describe('Pillar 4: Review Protection Interceptor', () => {
        it('POST /api/concession/reviews/intercept should intercept 2-star rating internally', async () => {
            const res = await request(app)
                .post('/api/concession/reviews/intercept')
                .send({
                    venueId: 'venue-1',
                    guestName: 'John Doe',
                    ratingScore: 2,
                    feedbackText: 'Wait time at photo pickup counter was too long.'
                });
            
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.routingResult).toBe('INTERNAL_RESOLUTION_INTERCEPTED');
            expect(res.body.compensationOffered).toBeDefined();
            expect(res.body.redirectTo).toBeNull();
        });

        it('POST /api/concession/reviews/intercept should route 5-star rating to Google Reviews', async () => {
            const res = await request(app)
                .post('/api/concession/reviews/intercept')
                .send({
                    venueId: 'venue-1',
                    guestName: 'Jane Smith',
                    ratingScore: 5,
                    feedbackText: 'Incredible action shots on the coaster!'
                });
            
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.routingResult).toBe('GOOGLE_TRIPADVISOR_REDIRECT');
            expect(res.body.redirectTo).toBe('https://maps.google.com');
        });
    });
});
