import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs-extra';
import orderRoutes from '../orders';

// Mock Redis Cache
vi.mock('../../services/redisCacheService', () => ({
  redisCache: {
    publishEvent: vi.fn().mockResolvedValue('stream-msg-123'),
    get: vi.fn(),
    set: vi.fn()
  }
}));

describe('Orders Route Test Suite', () => {
  let app: express.Express;
  let mockDbManager: any;
  let mockLogger: any;
  let mockHardwareService: any;
  let mockFulfillmentService: any;
  let mockFulfillmentSlipService: any;
  let mockSyncManager: any;
  let mockLedgerService: any;
  let mockAuditLogger: any;
  let mockOrderValidationService: any;
  let mockPhotographerEventLedgerService: any;
  let currentUser: { id: string; email: string; role: string } | null;

  beforeEach(() => {
    vi.clearAllMocks();

    currentUser = {
      id: 'admin-usr-01',
      email: 'admin@clickflash.com',
      role: 'Admin'
    };

    mockDbManager = {
      get: vi.fn(),
      query: vi.fn(),
      run: vi.fn()
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    mockHardwareService = {
      enqueuePrint: vi.fn().mockResolvedValue('job-print-999')
    };

    mockFulfillmentService = {
      broadcastStatusToKiosks: vi.fn().mockResolvedValue(undefined),
      processSinglePhoto: vi.fn().mockResolvedValue('/tmp/photos/photo-1.jpg'),
      cleanup: vi.fn()
    };

    mockFulfillmentSlipService = {
      generateSlip: vi.fn().mockResolvedValue('/tmp/slips/slip-1.jpg'),
      cleanup: vi.fn().mockResolvedValue(undefined)
    };

    mockSyncManager = {
      broadcastOrderStatus: vi.fn()
    };

    mockLedgerService = {
      recordTransaction: vi.fn()
    };

    mockAuditLogger = {
      logDataAccess: vi.fn(),
      logRateLimitExceeded: vi.fn()
    };

    mockOrderValidationService = {
      handlePostValidationActions: vi.fn()
    };

    mockPhotographerEventLedgerService = {
      append: vi.fn()
    };

    app = express();
    app.use(express.json());

    // Inject current user for RBAC middleware testing
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (currentUser) {
        req.user = currentUser;
      }
      next();
    });

    const context = {
      dbManager: mockDbManager,
      logger: mockLogger,
      hardwareService: mockHardwareService,
      fulfillmentService: mockFulfillmentService,
      fulfillmentSlipService: mockFulfillmentSlipService,
      syncManager: mockSyncManager,
      ledgerService: mockLedgerService,
      auditLogger: mockAuditLogger,
      orderValidationService: mockOrderValidationService,
      photographerEventLedgerService: mockPhotographerEventLedgerService
    };

    app.use('/api/orders', orderRoutes(context as any));
  });

  describe('GET /api/orders', () => {
    it('should return paginated orders with parsed items', async () => {
      const mockOrdersInDb = [
        {
          id: 'ORD-101',
          clientName: 'Alice Smith',
          email: 'alice@example.com',
          total: 45.0,
          status: 'Pending',
          items: JSON.stringify([{ id: 'item-1', name: 'Digital 8x10', price: 45.0, quantity: 1 }]),
          created_at: '2026-10-01T10:00:00Z'
        }
      ];

      mockDbManager.get.mockReturnValue({ total: 1 });
      mockDbManager.query.mockReturnValue(mockOrdersInDb);

      const res = await request(app).get('/api/orders?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.totalPages).toBe(1);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('ORD-101');
      expect(res.body.data[0].items).toEqual([
        { id: 'item-1', name: 'Digital 8x10', price: 45.0, quantity: 1 }
      ]);
    });

    it('should apply search and status filters to SQL query', async () => {
      mockDbManager.get.mockReturnValue({ total: 0 });
      mockDbManager.query.mockReturnValue([]);

      const res = await request(app).get('/api/orders?search=Alice&status=Completed&dateFrom=2026-01-01&dateTo=2026-12-31');

      expect(res.status).toBe(200);
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('AND (clientName LIKE ? OR id LIKE ? OR orderNumber LIKE ? OR email LIKE ?)'),
        expect.arrayContaining(['%Alice%', 'Completed', '2026-01-01', '2026-12-31'])
      );
    });

    it('should handle database errors gracefully with 500 response', async () => {
      mockDbManager.get.mockImplementation(() => {
        throw new Error('Database read failure');
      });

      const res = await request(app).get('/api/orders');

      expect(res.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to list orders', expect.any(Error));
    });
  });

  describe('POST /api/orders', () => {
    const validOrderPayload = {
      clientMutationId: 'mutation-uuid-001',
      clientDeviceId: 'kiosk-unit-7',
      clientName: 'Bob Vance',
      email: 'bob@vancefrigeration.com',
      items: [
        { id: 'item-photo-1', name: 'Photo Print', price: 25.0, quantity: 2 }
      ],
      appliedDiscount: 10,
      tipAmount: 5.0,
      destinationId: 'dest-99'
    };

    it('should create an order, publish event, and broadcast status', async () => {
      mockDbManager.get.mockReturnValue(null); // No existing order (no deduplication)

      const res = await request(app)
        .post('/api/orders')
        .send(validOrderPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.id).toMatch(/^ORD-/);
      expect(mockSyncManager.broadcastOrderStatus).toHaveBeenCalledWith(
        res.body.id,
        'Pending',
        expect.objectContaining({
          clientName: 'Bob Vance',
          email: 'bob@vancefrigeration.com',
          total: 45 // (25 * 2) * (1 - 0.10) = 45
        })
      );
    });

    it('should deduplicate order by clientMutationId and return 208', async () => {
      mockDbManager.get.mockReturnValue({ id: 'ORD-EXISTING-123' });

      const res = await request(app)
        .post('/api/orders')
        .send(validOrderPayload);

      expect(res.status).toBe(208);
      expect(res.body.success).toBe(true);
      expect(res.body.id).toBe('ORD-EXISTING-123');
      expect(res.body.deduplicated).toBe(true);
    });

    it('should reject order with missing clientMutationId', async () => {
      const invalidPayload = { ...validOrderPayload, clientMutationId: undefined };

      const res = await request(app)
        .post('/api/orders')
        .send(invalidPayload);

      expect(res.status).toBe(400);
    });

    it('should reject order with empty items array', async () => {
      const invalidPayload = { ...validOrderPayload, items: [] };

      const res = await request(app)
        .post('/api/orders')
        .send(invalidPayload);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orders/by-credentials', () => {
    it('should reject requests missing pin or email', async () => {
      const res = await request(app).get('/api/orders/by-credentials?pin=ORD-123');
      expect(res.status).toBe(400);
    });

    it('should return 404 when order is not found', async () => {
      mockDbManager.get.mockReturnValue(null);

      const res = await request(app).get('/api/orders/by-credentials?pin=ORD-123&email=nobody@test.com');
      expect(res.status).toBe(404);
    });

    it('should return order when credentials match', async () => {
      mockDbManager.get.mockReturnValue({
        id: 'ORD-123',
        email: 'guest@test.com',
        total: 50.0,
        items: JSON.stringify([{ id: 'p1', name: 'Digital', price: 50, quantity: 1 }])
      });

      const res = await request(app).get('/api/orders/by-credentials?pin=ORD-123&email=guest@test.com');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('ORD-123');
      expect(res.body.data.items).toEqual([{ id: 'p1', name: 'Digital', price: 50, quantity: 1 }]);
    });
  });

  describe('POST /api/orders/:id/fulfillment/push', () => {
    it('should trigger broadcastStatusToKiosks and return success', async () => {
      const res = await request(app).post('/api/orders/ORD-999/fulfillment/push');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockFulfillmentService.broadcastStatusToKiosks).toHaveBeenCalledWith('ORD-999');
    });

    it('should handle service errors with 500 status', async () => {
      mockFulfillmentService.broadcastStatusToKiosks.mockRejectedValue(new Error('Network partition'));

      const res = await request(app).post('/api/orders/ORD-999/fulfillment/push');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/orders/:id/print', () => {
    it('should return 400 when photoId is missing', async () => {
      const res = await request(app)
        .post('/api/orders/ORD-101/print')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should process photo and enqueue print job', async () => {
      const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const res = await request(app)
        .post('/api/orders/ORD-101/print')
        .send({ photoId: 'photo-xyz', printerName: 'FrontDesk-DNP' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBe('job-print-999');
      expect(mockFulfillmentService.processSinglePhoto).toHaveBeenCalledWith('photo-xyz');
      expect(mockHardwareService.enqueuePrint).toHaveBeenCalledWith(
        '/tmp/photos/photo-1.jpg',
        'FrontDesk-DNP'
      );

      existsSpy.mockRestore();
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('should reject non-admin users with 403', async () => {
      currentUser = { id: 'guest-1', email: 'guest@clickflash.com', role: 'Guest' };

      const res = await request(app)
        .patch('/api/orders/ORD-101/status')
        .send({ status: 'Processing' });

      expect(res.status).toBe(403);
    });

    it('should return 400 if status is omitted', async () => {
      const res = await request(app)
        .patch('/api/orders/ORD-101/status')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should update status and broadcast to kiosks', async () => {
      const res = await request(app)
        .patch('/api/orders/ORD-101/status')
        .send({ status: 'Processing' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDbManager.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'),
        expect.arrayContaining(['Processing', expect.any(String), 'ORD-101'])
      );
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        'admin-usr-01',
        'admin@clickflash.com',
        'UPDATE',
        'orders',
        'ORD-101'
      );
      expect(mockSyncManager.broadcastOrderStatus).toHaveBeenCalledWith('ORD-101', 'Processing');
      expect(mockFulfillmentService.broadcastStatusToKiosks).toHaveBeenCalledWith('ORD-101');
    });

    it('should append immutable ledger events and trigger post-validation when status is Completed', async () => {
      mockDbManager.get.mockReturnValue({
        id: 'ORD-101',
        photographerId: 'photographer-88',
        total: 120.0,
        items: JSON.stringify([{ id: 'item-1', name: 'Digital Pack', price: 120, quantity: 1 }])
      });

      const res = await request(app)
        .patch('/api/orders/ORD-101/status')
        .send({ status: 'Completed' });

      expect(res.status).toBe(200);
      expect(mockPhotographerEventLedgerService.append).toHaveBeenCalledTimes(2);
      expect(mockPhotographerEventLedgerService.append).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          producer: 'MASTER',
          photographerId: 'photographer-88',
          payload: expect.objectContaining({
            kind: 'ORDER_COMPLETED',
            orderId: 'ORD-101',
            gross: { currency: 'USD', currencyExponent: 2, amountMinor: 12000 }
          })
        })
      );
      expect(mockPhotographerEventLedgerService.append).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          producer: 'MASTER',
          photographerId: 'photographer-88',
          payload: expect.objectContaining({
            kind: 'ATTRIBUTION_ASSIGNED',
            orderId: 'ORD-101',
            method: 'KIOSK_SESSION'
          })
        })
      );
      expect(mockOrderValidationService.handlePostValidationActions).toHaveBeenCalledWith('ORD-101');
    });
  });

  describe('POST /api/orders/kiosk/orders', () => {
    const kioskOrderPayload = {
      clientMutationId: 'kiosk-mutation-777',
      clientDeviceId: 'touch-kiosk-lobby',
      clientName: 'Claire Bennet',
      email: 'claire@heroes.org',
      items: [
        { id: 'print-4x6', name: 'Photo 4x6', price: 15.0, quantity: 1 }
      ],
      appliedDiscount: 0,
      tipAmount: 3.0
    };

    it('should create a kiosk order with 201 status', async () => {
      mockDbManager.get.mockReturnValue(null);

      const res = await request(app)
        .post('/api/orders/kiosk/orders')
        .send(kioskOrderPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.id).toBeDefined();
    });

    it('should return 208 for duplicate kiosk order', async () => {
      mockDbManager.get.mockReturnValue({ id: 'ORD-KIOSK-PREV' });

      const res = await request(app)
        .post('/api/orders/kiosk/orders')
        .send(kioskOrderPayload);

      expect(res.status).toBe(208);
      expect(res.body.id).toBe('ORD-KIOSK-PREV');
      expect(res.body.deduplicated).toBe(true);
    });
  });

  describe('POST /api/orders/:id/payment', () => {
    it('should reject payment from non-admin with 403', async () => {
      currentUser = { id: 'kiosk-1', email: 'kiosk@clickflash.com', role: 'Kiosk' };

      const res = await request(app)
        .post('/api/orders/ORD-101/payment')
        .send({ amount: 50.0, method: 'Card' });

      expect(res.status).toBe(403);
    });

    it('should return 400 if amount or method is missing', async () => {
      const res = await request(app)
        .post('/api/orders/ORD-101/payment')
        .send({ amount: 50.0 }); // missing method

      expect(res.status).toBe(400);
    });

    it('should return 404 if order does not exist or lacks photographerId', async () => {
      mockDbManager.get.mockReturnValue(null);

      const res = await request(app)
        .post('/api/orders/ORD-101/payment')
        .send({ amount: 50.0, method: 'Card' });

      expect(res.status).toBe(404);
    });

    it('should capture payment and append PAYMENT_CAPTURED event to ledger', async () => {
      mockDbManager.get.mockReturnValue({
        id: 'ORD-101',
        photographerId: 'photographer-42'
      });

      const res = await request(app)
        .post('/api/orders/ORD-101/payment')
        .send({ amount: 50.0, method: 'Card' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.paymentId).toBeDefined();
      expect(mockPhotographerEventLedgerService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          producer: 'MASTER',
          photographerId: 'photographer-42',
          payload: expect.objectContaining({
            kind: 'PAYMENT_CAPTURED',
            orderId: 'ORD-101',
            amount: { currency: 'USD', currencyExponent: 2, amountMinor: 5000 },
            method: 'Card'
          })
        })
      );
    });
  });
});
