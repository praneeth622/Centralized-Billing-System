import request from 'supertest';
import express from 'express';
import { rateLimitingMiddleware } from '../../src/shared/middleware/rate-limiting.middleware';
import { distributedTracingMiddleware } from '../../src/shared/middleware/distributed-tracing.middleware';
import { enhancedErrorHandler } from '../../src/shared/middleware/error-handler.middleware';
import { healthCheck } from '../../src/shared/middleware/health-check.middleware';
import { DatabaseManager } from '../../src/infrastructure/database/database-manager';
import { CustomError, ErrorCode, ErrorSeverity } from '../../src/shared/errors/custom-errors';

// Mock dependencies
const mockRedis = {
  incr: jest.fn(),
  expire: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  ping: jest.fn()
};

const mockPrisma = {
  $queryRaw: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  user: {
    count: jest.fn(),
    findUnique: jest.fn()
  }
};

const mockStripe = {
  accounts: {
    retrieve: jest.fn()
  }
};

// Mock Redis client
jest.mock('../../src/infrastructure/cache/redis.client', () => ({
  __esModule: true,
  default: {
    getInstance: () => mockRedis
  }
}));

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
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
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 1000,
      userLimit: 100,
      authLimit: 5,
      skipSuccessfulRequests: false,
      legacyHeaders: false,
      standardHeaders: true
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: undefined,
      db: 0
    },
    stripe: {
      secretKey: 'sk_test_123'
    },
    database: {
      url: 'postgresql://test:test@localhost:5432/billing_test'
    }
  }
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.mock('../../src/shared/utils/logger.util', () => ({
  __esModule: true,
  default: mockLogger
}));

describe('Enterprise Features Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    jest.clearAllMocks();
    
    // Setup default successful mocks
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.delete.mockResolvedValue(1);
    mockRedis.ping.mockResolvedValue('PONG');
    
    mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
    mockPrisma.$connect.mockResolvedValue(undefined);
    mockPrisma.user.count.mockResolvedValue(5);
    mockPrisma.user.findUnique.mockResolvedValue({ id: '1', name: 'Test User' });
    
    mockStripe.accounts.retrieve.mockResolvedValue({
      id: 'acct_test123',
      country: 'US',
      charges_enabled: true,
      payouts_enabled: true
    });
  });

  describe('Full Middleware Stack Integration', () => {
    it('should handle a complete request flow with all enterprise features', async () => {
      // Setup middleware stack in order
      app.use(express.json());
      app.use(distributedTracingMiddleware);
      app.use(rateLimitingMiddleware);
      
      // Test route
      app.get('/api/test', async (req, res) => {
        // Simulate some business logic
        const user = await mockPrisma.user.findUnique({ where: { id: '1' } });
        res.json({ success: true, user, correlationId: req.correlationId });
      });
      
      // Health check route
      app.get('/health', healthCheck);
      
      app.use(enhancedErrorHandler);

      const response = await request(app)
        .get('/api/test')
        .expect(200);

      // Verify response includes correlation ID
      expect(response.body.correlationId).toBeDefined();
      expect(response.body.user).toEqual({ id: '1', name: 'Test User' });
      
      // Verify headers were set by tracing middleware
      expect(response.headers['x-correlation-id']).toBeDefined();
      
      // Verify rate limiting was applied
      expect(mockRedis.incr).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalled();
      
      // Verify logging occurred
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          correlationId: expect.any(String),
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
          responseTime: expect.any(Number)
        })
      );
    });

    it('should handle error flow through complete middleware stack', async () => {
      app.use(express.json());
      app.use(distributedTracingMiddleware);
      app.use(rateLimitingMiddleware);
      
      // Route that throws an error
      app.get('/api/error', () => {
        throw new CustomError(
          'Test error for integration',
          ErrorCode.VALIDATION_ERROR,
          ErrorSeverity.MEDIUM,
          { testField: 'Invalid value' }
        );
      });
      
      app.use(enhancedErrorHandler);

      const response = await request(app)
        .get('/api/error')
        .expect(400);

      // Verify error response structure
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Test error for integration',
          severity: ErrorSeverity.MEDIUM,
          details: { testField: 'Invalid value' }
        },
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      });

      // Verify correlation ID is consistent
      expect(response.headers['x-correlation-id']).toBe(response.body.correlationId);
      
      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request failed',
        expect.objectContaining({
          correlationId: expect.any(String),
          error: expect.objectContaining({
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Test error for integration'
          }),
          path: '/api/error',
          method: 'GET'
        })
      );
    });

    it('should apply rate limiting correctly in the middleware stack', async () => {
      app.use(express.json());
      app.use(distributedTracingMiddleware);
      app.use(rateLimitingMiddleware);
      
      app.get('/api/limited', (req, res) => {
        res.json({ success: true, message: 'Request processed' });
      });
      
      app.use(enhancedErrorHandler);

      // First request should succeed
      await request(app)
        .get('/api/limited')
        .expect(200);

      // Mock rate limit exceeded
      mockRedis.incr.mockResolvedValue(1001); // Exceed the limit

      // Second request should be rate limited
      const response = await request(app)
        .get('/api/limited')
        .expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.correlationId).toBeDefined();
      
      // Verify rate limit headers
      expect(response.headers['retry-after']).toBeDefined();
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('Health Check Integration', () => {
    it('should perform comprehensive health check through middleware stack', async () => {
      app.use(distributedTracingMiddleware);
      app.get('/health', healthCheck);
      
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Verify health check response
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.checks).toHaveLength(6); // database, redis, memory, cpu, disk, stripe
      
      // Verify correlation ID was added by tracing middleware
      expect(response.headers['x-correlation-id']).toBeDefined();
      
      // Verify all services were checked
      const checks = response.body.data.checks;
      const serviceNames = checks.map((c: any) => c.service);
      expect(serviceNames).toContain('database');
      expect(serviceNames).toContain('redis');
      expect(serviceNames).toContain('stripe');
      expect(serviceNames).toContain('memory');
      expect(serviceNames).toContain('cpu');
    });

    it('should handle partial service failures in health check', async () => {
      // Mock Redis failure
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));
      
      app.use(distributedTracingMiddleware);
      app.get('/health', healthCheck);
      app.use(enhancedErrorHandler);
      
      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.data.status).toBe('unhealthy');
      
      // Verify specific service failure
      const redisCheck = response.body.data.checks.find((c: any) => c.service === 'redis');
      expect(redisCheck.status).toBe('unhealthy');
      expect(redisCheck.error).toContain('Redis connection failed');
      
      // Other services should still be checked
      const databaseCheck = response.body.data.checks.find((c: any) => c.service === 'database');
      expect(databaseCheck.status).toBe('healthy');
    });
  });

  describe('Error Handling and Logging Integration', () => {
    it('should maintain correlation ID through error scenarios', async () => {
      app.use(distributedTracingMiddleware);
      app.use(rateLimitingMiddleware);
      
      app.get('/api/database-error', async () => {
        // Simulate database error
        mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection lost'));
        throw new Error('Database operation failed');
      });
      
      app.use(enhancedErrorHandler);

      const response = await request(app)
        .get('/api/database-error')
        .expect(500);

      // Verify correlation ID consistency
      const correlationId = response.headers['x-correlation-id'];
      expect(correlationId).toBeDefined();
      expect(response.body.correlationId).toBe(correlationId);
      
      // Verify error was logged with correlation ID
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request failed',
        expect.objectContaining({
          correlationId: correlationId,
          error: expect.objectContaining({
            message: expect.stringContaining('Database operation failed')
          })
        })
      );
    });

    it('should sanitize sensitive data in error responses', async () => {
      app.use(distributedTracingMiddleware);
      
      app.post('/api/payment', (req, res) => {
        const error = new CustomError(
          'Payment processing failed',
          ErrorCode.PAYMENT_ERROR,
          ErrorSeverity.HIGH,
          {
            cardNumber: '4111-1111-1111-1111',
            cvv: '123',
            apiKey: 'sk_test_secret_key',
            userEmail: 'user@example.com',
            amount: 1000
          }
        );
        throw error;
      });
      
      app.use(enhancedErrorHandler);

      const response = await request(app)
        .post('/api/payment')
        .send({ cardNumber: '4111-1111-1111-1111' })
        .expect(402);

      // Verify sensitive data is sanitized
      expect(response.body.error.details).toMatchObject({
        cardNumber: '****-****-****-1111',
        cvv: '***',
        apiKey: '***REDACTED***',
        userEmail: 'user@example.com', // Email should remain
        amount: 1000 // Amount should remain
      });
    });
  });

  describe('Performance and Monitoring Integration', () => {
    it('should track performance metrics across middleware stack', async () => {
      app.use(distributedTracingMiddleware);
      app.use(rateLimitingMiddleware);
      
      app.get('/api/performance', (req, res) => {
        // Simulate processing time
        setTimeout(() => {
          res.json({ success: true, message: 'Performance test completed' });
        }, 100);
      });
      
      app.use(enhancedErrorHandler);

      const response = await request(app)
        .get('/api/performance')
        .expect(200);

      // Verify performance logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          responseTime: expect.any(Number),
          method: 'GET',
          path: '/api/performance',
          statusCode: 200
        })
      );
    });

    it('should handle high load scenarios with all middleware', async () => {
      app.use(distributedTracingMiddleware);
      app.use(rateLimitingMiddleware);
      
      app.get('/api/load-test', (req, res) => {
        res.json({ success: true, requestId: req.correlationId });
      });
      
      app.use(enhancedErrorHandler);

      // Simulate concurrent requests
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .get('/api/load-test')
          .expect(200)
      );

      const responses = await Promise.all(promises);
      
      // Verify each request got unique correlation ID
      const correlationIds = responses.map(r => r.body.requestId);
      const uniqueIds = new Set(correlationIds);
      expect(uniqueIds.size).toBe(10);
      
      // Verify rate limiting was applied to each request
      expect(mockRedis.incr).toHaveBeenCalledTimes(10);
    });
  });

  describe('Security Integration', () => {
    it('should apply security measures across the stack', async () => {
      app.use(distributedTracingMiddleware);
      app.use(rateLimitingMiddleware);
      
      app.get('/api/secure', (req, res) => {
        res.json({ success: true, message: 'Secure endpoint accessed' });
      });
      
      app.use(enhancedErrorHandler);

      const response = await request(app)
        .get('/api/secure')
        .expect(200);

      // Verify security headers from error handler middleware
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should protect against injection attacks in error responses', async () => {
      app.use(distributedTracingMiddleware);
      
      app.get('/api/injection-test', (req, res) => {
        const maliciousInput = '<script>alert("xss")</script>';
        throw new CustomError(
          `Invalid input: ${maliciousInput}`,
          ErrorCode.VALIDATION_ERROR,
          ErrorSeverity.MEDIUM
        );
      });
      
      app.use(enhancedErrorHandler);

      const response = await request(app)
        .get('/api/injection-test')
        .expect(400);

      // Verify script tags are escaped/removed
      expect(response.body.error.message).not.toContain('<script>');
      expect(response.body.error.message).not.toContain('alert(');
    });
  });

  describe('Database Integration', () => {
    it('should handle database operations with error handling and tracing', async () => {
      app.use(distributedTracingMiddleware);
      
      app.get('/api/users/:id', async (req, res) => {
        try {
          const user = await mockPrisma.user.findUnique({
            where: { id: req.params.id }
          });
          
          if (!user) {
            throw new CustomError(
              'User not found',
              ErrorCode.RESOURCE_NOT_FOUND,
              ErrorSeverity.LOW
            );
          }
          
          res.json({ success: true, user });
        } catch (error) {
          throw error;
        }
      });
      
      app.use(enhancedErrorHandler);

      // Test successful user fetch
      const successResponse = await request(app)
        .get('/api/users/1')
        .expect(200);

      expect(successResponse.body.user).toEqual({ id: '1', name: 'Test User' });
      
      // Test user not found
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      const notFoundResponse = await request(app)
        .get('/api/users/999')
        .expect(404);

      expect(notFoundResponse.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(notFoundResponse.body.error.message).toBe('User not found');
    });
  });

  describe('Real-world Scenario Integration', () => {
    it('should handle a complete user authentication flow', async () => {
      app.use(express.json());
      app.use(distributedTracingMiddleware);
      app.use('/auth', rateLimitingMiddleware); // Apply stricter rate limiting to auth endpoints
      
      app.post('/auth/login', async (req, res) => {
        const { email, password } = req.body;
        
        if (!email || !password) {
          throw new CustomError(
            'Email and password are required',
            ErrorCode.VALIDATION_ERROR,
            ErrorSeverity.MEDIUM,
            { fields: ['email', 'password'] }
          );
        }
        
        // Simulate database lookup
        const user = await mockPrisma.user.findUnique({
          where: { email }
        });
        
        if (!user) {
          throw new CustomError(
            'Invalid credentials',
            ErrorCode.AUTHENTICATION_ERROR,
            ErrorSeverity.MEDIUM
          );
        }
        
        res.json({ 
          success: true, 
          user: { id: user.id, email },
          correlationId: req.correlationId
        });
      });
      
      app.use(enhancedErrorHandler);

      // Test successful login
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'user@example.com',
        name: 'Test User'
      });
      
      const successResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'password123' })
        .expect(200);

      expect(successResponse.body.success).toBe(true);
      expect(successResponse.body.user.email).toBe('user@example.com');
      expect(successResponse.body.correlationId).toBeDefined();
      
      // Test validation error
      const validationResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com' }) // Missing password
        .expect(400);

      expect(validationResponse.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(validationResponse.body.error.details.fields).toContain('password');
      
      // Test authentication error
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      const authResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'invalid@example.com', password: 'wrongpassword' })
        .expect(401);

      expect(authResponse.body.error.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
      expect(authResponse.body.error.message).toBe('Invalid credentials');
    });
  });
});