import request from 'supertest';
import express from 'express';
import {
  healthCheck,
  readinessCheck,
  livenessCheck,
  systemMetrics
} from '../../src/shared/middleware/health-check.middleware';

// Mock dependencies
const mockPrisma = {
  $queryRaw: jest.fn(),
  user: {
    count: jest.fn()
  },
  $disconnect: jest.fn()
};

const mockRedis = {
  ping: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  delete: jest.fn()
};

const mockStripe = {
  accounts: {
    retrieve: jest.fn()
  }
};

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

// Mock Redis client
jest.mock('../../src/infrastructure/cache/redis.client', () => ({
  __esModule: true,
  default: {
    getInstance: () => mockRedis
  }
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn(() => mockStripe);
});

// Mock config
jest.mock('../../src/config', () => ({
  __esModule: true,
  default: {
    nodeEnv: 'test',
    stripe: {
      secretKey: 'sk_test_123'
    }
  }
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

jest.mock('../../src/shared/utils/logger.util', () => ({
  __esModule: true,
  default: mockLogger
}));

describe('Health Check Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    jest.clearAllMocks();
    
    // Setup default successful mocks
    mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
    mockPrisma.user.count.mockResolvedValue(5);
    mockRedis.ping.mockResolvedValue('PONG');
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue('test-value');
    mockRedis.delete.mockResolvedValue(1);
    mockStripe.accounts.retrieve.mockResolvedValue({
      id: 'acct_test123',
      country: 'US',
      charges_enabled: true,
      payouts_enabled: true
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return healthy status when all services are working', async () => {
      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.checks).toHaveLength(6); // database, redis, memory, cpu, disk, stripe
      
      const checks = response.body.data.checks;
      const databaseCheck = checks.find((c: any) => c.service === 'database');
      const redisCheck = checks.find((c: any) => c.service === 'redis');
      const stripeCheck = checks.find((c: any) => c.service === 'stripe');
      
      expect(databaseCheck.status).toBe('healthy');
      expect(redisCheck.status).toBe('healthy');
      expect(stripeCheck.status).toBe('healthy');
    });

    it('should return unhealthy status when database is down', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));
      
      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.data.status).toBe('unhealthy');
      
      const databaseCheck = response.body.data.checks.find((c: any) => c.service === 'database');
      expect(databaseCheck.status).toBe('unhealthy');
      expect(databaseCheck.error).toContain('Connection refused');
    });

    it('should return unhealthy status when Redis is down', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));
      
      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.data.status).toBe('unhealthy');
      
      const redisCheck = response.body.data.checks.find((c: any) => c.service === 'redis');
      expect(redisCheck.status).toBe('unhealthy');
      expect(redisCheck.error).toContain('Redis connection failed');
    });

    it('should return degraded status for slow responses', async () => {
      // Mock slow database response
      mockPrisma.$queryRaw.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ result: 1 }]), 2500))
      );
      
      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.data.status).toBe('degraded');
      
      const databaseCheck = response.body.data.checks.find((c: any) => c.service === 'database');
      expect(databaseCheck.status).toBe('degraded');
      expect(databaseCheck.responseTime).toBeGreaterThan(2000);
    });

    it('should include detailed service information', async () => {
      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(200);

      const checks = response.body.data.checks;
      
      // Database check details
      const databaseCheck = checks.find((c: any) => c.service === 'database');
      expect(databaseCheck.details).toMatchObject({
        connectionState: 'connected',
        queryTime: expect.any(Number),
        sampleQueryResult: 'success'
      });
      
      // Redis check details
      const redisCheck = checks.find((c: any) => c.service === 'redis');
      expect(redisCheck.details).toMatchObject({
        pingResult: 'PONG',
        operationsTest: 'success',
        connectionState: 'connected'
      });
      
      // Stripe check details
      const stripeCheck = checks.find((c: any) => c.service === 'stripe');
      expect(stripeCheck.details).toMatchObject({
        accountId: 'acct_test123',
        country: 'US',
        chargesEnabled: true,
        payoutsEnabled: true
      });
    });

    it('should include system metadata', async () => {
      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.data).toMatchObject({
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        environment: 'test',
        summary: {
          total: expect.any(Number),
          healthy: expect.any(Number),
          unhealthy: expect.any(Number),
          degraded: expect.any(Number)
        }
      });
    });

    it('should handle Stripe API errors gracefully', async () => {
      mockStripe.accounts.retrieve.mockRejectedValue(new Error('Invalid API key'));
      
      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(503);

      const stripeCheck = response.body.data.checks.find((c: any) => c.service === 'stripe');
      expect(stripeCheck.status).toBe('unhealthy');
      expect(stripeCheck.error).toContain('Invalid API key');
    });

    it('should log health check results', async () => {
      app.get('/health', healthCheck);

      await request(app)
        .get('/health')
        .expect(200);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Health check completed',
        expect.objectContaining({
          status: 'healthy',
          summary: expect.any(Object),
          duration: expect.any(Number)
        })
      );
    });
  });

  describe('Readiness Check Endpoint', () => {
    it('should return ready when core services are healthy', async () => {
      app.get('/ready', readinessCheck);

      const response = await request(app)
        .get('/ready')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ready');
      expect(response.body.data.coreChecks).toBeDefined();
      
      // Should not include external services like Stripe
      const coreChecks = response.body.data.coreChecks;
      const stripeCheck = coreChecks.find((c: any) => c.service === 'stripe');
      expect(stripeCheck).toBeUndefined();
    });

    it('should return not ready when core services fail', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis down'));
      
      app.get('/ready', readinessCheck);

      const response = await request(app)
        .get('/ready')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.data.status).toBe('not_ready');
    });

    it('should be ready even if external services fail', async () => {
      // This endpoint shouldn't include external services, so Stripe failure shouldn't affect it
      mockStripe.accounts.retrieve.mockRejectedValue(new Error('Stripe down'));
      
      app.get('/ready', readinessCheck);

      const response = await request(app)
        .get('/ready')
        .expect(200);

      expect(response.body.data.status).toBe('ready');
    });

    it('should include uptime and timestamp', async () => {
      app.get('/ready', readinessCheck);

      const response = await request(app)
        .get('/ready')
        .expect(200);

      expect(response.body.data).toMatchObject({
        timestamp: expect.any(String),
        uptime: expect.any(Number)
      });
    });
  });

  describe('Liveness Check Endpoint', () => {
    it('should always return alive status', async () => {
      app.get('/live', livenessCheck);

      const response = await request(app)
        .get('/live')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('alive');
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body.data.pid).toBe(process.pid);
    });

    it('should be very fast', async () => {
      app.get('/live', livenessCheck);

      const startTime = Date.now();
      await request(app)
        .get('/live')
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(50); // Should be very fast
    });
  });

  describe('System Metrics Endpoint', () => {
    it('should return detailed system metrics', async () => {
      app.get('/metrics', systemMetrics);

      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: {
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number),
          external: expect.any(Number)
        },
        cpu: {
          user: expect.any(Number),
          system: expect.any(Number)
        },
        process: {
          pid: expect.any(Number),
          version: expect.any(String),
          platform: expect.any(String),
          arch: expect.any(String)
        },
        environment: {
          nodeEnv: 'test',
          version: expect.any(String)
        }
      });
    });

    it('should handle metrics collection errors', async () => {
      // Mock process.memoryUsage to throw error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory usage error');
      });

      app.get('/metrics', systemMetrics);
      app.use((err: any, req: any, res: any, next: any) => {
        res.status(500).json({ error: err.message });
      });

      await request(app)
        .get('/metrics')
        .expect(500);

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Memory and CPU Health Checks', () => {
    it('should detect high memory usage', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        heapUsed: 185 * 1024 * 1024, // 92.5% usage - should be unhealthy
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(503);

      const memoryCheck = response.body.data.checks.find((c: any) => c.service === 'memory');
      expect(memoryCheck.status).toBe('unhealthy');
      expect(memoryCheck.details.usagePercentage).toBeGreaterThan(90);

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should detect degraded memory usage', async () => {
      // Mock degraded memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        heapUsed: 170 * 1024 * 1024, // 85% usage - should be degraded
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.data.status).toBe('degraded');
      const memoryCheck = response.body.data.checks.find((c: any) => c.service === 'memory');
      expect(memoryCheck.status).toBe('degraded');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should provide detailed memory metrics', async () => {
      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(200);

      const memoryCheck = response.body.data.checks.find((c: any) => c.service === 'memory');
      expect(memoryCheck.details).toMatchObject({
        heapTotal: expect.any(Number),
        heapUsed: expect.any(Number),
        usagePercentage: expect.any(Number),
        external: expect.any(Number),
        rss: expect.any(Number)
      });
    });

    it('should measure CPU usage over time', async () => {
      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(200);

      const cpuCheck = response.body.data.checks.find((c: any) => c.service === 'cpu');
      expect(cpuCheck.details).toMatchObject({
        userTime: expect.any(Number),
        systemTime: expect.any(Number),
        usagePercentage: expect.any(Number)
      });
      expect(cpuCheck.responseTime).toBeGreaterThanOrEqual(100); // Should take at least 100ms for measurement
    });
  });

  describe('Redis Operations Test', () => {
    it('should test Redis set/get/delete operations', async () => {
      mockRedis.get.mockResolvedValueOnce('test-value-123');
      
      app.get('/health', healthCheck);

      await request(app)
        .get('/health')
        .expect(200);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'health_check_test',
        expect.any(String),
        10
      );
      expect(mockRedis.get).toHaveBeenCalledWith('health_check_test');
      expect(mockRedis.delete).toHaveBeenCalledWith('health_check_test');
    });

    it('should detect failed Redis operations', async () => {
      mockRedis.get.mockResolvedValueOnce('wrong-value'); // Wrong value returned
      
      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(200); // Still 200 because it's degraded, not unhealthy

      const redisCheck = response.body.data.checks.find((c: any) => c.service === 'redis');
      expect(redisCheck.status).toBe('degraded');
      expect(redisCheck.details.operationsTest).toBe('failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection timeouts', async () => {
      mockPrisma.$queryRaw.mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 100))
      );
      
      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(503);

      const databaseCheck = response.body.data.checks.find((c: any) => c.service === 'database');
      expect(databaseCheck.status).toBe('unhealthy');
      expect(databaseCheck.error).toContain('Connection timeout');
    });

    it('should handle unexpected errors in health check', async () => {
      // Mock an error in the health check itself
      const originalError = console.error;
      console.error = jest.fn();

      app.get('/health', (req, res, next) => {
        // Simulate an error in the health check middleware
        throw new Error('Health check system error');
      });
      app.use((err: any, req: any, res: any, next: any) => {
        res.status(500).json({ error: err.message });
      });

      await request(app)
        .get('/health')
        .expect(500);

      console.error = originalError;
    });

    it('should log errors appropriately', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));
      
      app.get('/health', healthCheck);

      await request(app)
        .get('/health')
        .expect(503);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database health check failed',
        expect.objectContaining({
          error: expect.any(Error),
          responseTime: expect.any(Number)
        })
      );
    });
  });

  describe('Performance', () => {
    it('should complete health checks within reasonable time', async () => {
      app.get('/health', healthCheck);

      const startTime = Date.now();
      await request(app)
        .get('/health')
        .expect(200);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should not be significantly impacted by multiple concurrent requests', async () => {
      app.get('/health', healthCheck);

      const promises = Array.from({ length: 10 }, () => 
        request(app).get('/health').expect(200)
      );

      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // Should handle concurrent requests well
    });
  });
});