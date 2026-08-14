import request from 'supertest';
import express from 'express';
import healthRouter from '../health';
import { HardwareService } from '../../services/SystemHardwareService';

// Mock dependencies
const mockDb = {
  get: jest.fn()
};

const mockThermalService = {
  getStatus: jest.fn()
};

jest.mock('../../services/SystemHardwareService', () => ({
  HardwareService: {
    getHealthStatus: jest.fn()
  }
}));

describe('Health API Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).isEcosystemInitialized = true;
    
    app = express();
    // Mount the router
    app.use('/api/health', healthRouter(mockDb as any, mockThermalService as any, {}));
  });

  describe('GET /api/health/', () => {
    it('should return basic liveness status', async () => {
      const response = await request(app).get('/api/health/');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return healthy status when all checks pass', async () => {
      // Mock healthy responses
      (HardwareService.getHealthStatus as jest.Mock).mockResolvedValue({
        diskPercent: 50,
        memoryPercent: 50,
        memoryUsed: 4000,
        memoryTotal: 8000,
        diskUsed: 100,
        diskTotal: 500
      });
      
      mockThermalService.getStatus.mockReturnValue({
        status: 'NORMAL'
      });
      
      mockDb.get.mockReturnValue({ one: 1 });

      const response = await request(app).get('/api/health/detailed');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.checks.database).toBe(true);
      expect(response.body.checks.diskSpace).toBe(true);
      expect(response.body.checks.memory).toBe(true);
      expect(response.body.checks.thermal).toBe(true);
    });

    it('should return unhealthy status when database check fails', async () => {
      (HardwareService.getHealthStatus as jest.Mock).mockResolvedValue({ diskPercent: 50, memoryPercent: 50 });
      mockThermalService.getStatus.mockReturnValue({ status: 'NORMAL' });
      mockDb.get.mockImplementation(() => { throw new Error('DB error'); });

      const response = await request(app).get('/api/health/detailed');
      
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks.database).toBe(false);
    });

    it('should return degraded status when a non-critical check fails', async () => {
      // Memory > 90%
      (HardwareService.getHealthStatus as jest.Mock).mockResolvedValue({ diskPercent: 50, memoryPercent: 95 });
      mockThermalService.getStatus.mockReturnValue({ status: 'NORMAL' });
      mockDb.get.mockReturnValue({ one: 1 });

      const response = await request(app).get('/api/health/detailed');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('degraded');
      expect(response.body.checks.memory).toBe(false);
      expect(response.body.checks.database).toBe(true);
    });
  });
});

