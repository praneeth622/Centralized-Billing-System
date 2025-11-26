import request from 'supertest';
import express from 'express';

// Import actual middleware
import { rateLimitingMiddleware } from '../../src/shared/middleware/rate-limiting.middleware';
import { distributedTracingMiddleware } from '../../src/shared/middleware/distributed-tracing.middleware';
import { enhancedErrorHandler } from '../../src/shared/middleware/error-handler.middleware';
import { healthCheck } from '../../src/shared/middleware/health-check.middleware';
import { ValidationError, ErrorCode, ErrorSeverity } from '../../src/shared/errors/custom-errors';

// Mock Redis client
const mockRedis = {
  incr: jest.fn(),
  expire: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  ping: jest.fn()
};

jest.mock('../../src/infrastructure/cache/redis.client', () => ({
  getInstance: () => mockRedis
}));

// Mock Prisma
const mockPrisma = {
  $queryRaw: jest.fn(),
  user: {
    count: jest.fn(),
    findUnique: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

// Mock Stripe
const mockStripe = {
  accounts: {
    retrieve: jest.fn()
  }
};

jest.mock('stripe', () => jest.fn(() => mockStripe));

// Mock config
jest.mock('../../src/config', () => ({
  default: {
    nodeEnv: 'test',
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 1000
    },
    stripe: {
      secretKey: 'sk_test_123'
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
  default: mockLogger
}));

describe('Enterprise Features Simple Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    jest.clearAllMocks();
    
    // Setup successful mocks
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.ping.mockResolvedValue('PONG');
    mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
    mockPrisma.user.count.mockResolvedValue(5);
    mockStripe.accounts.retrieve.mockResolvedValue({
      id: 'acct_test',
      charges_enabled: true
    });
  });

  it('should handle basic request flow with middleware stack', async () => {
    app.use(express.json());
    app.use(distributedTracingMiddleware);
    
    app.get('/api/test', (req, res) => {
      res.json({ success: true, message: 'Test successful' });
    });
    
    app.use(enhancedErrorHandler);

    const response = await request(app)
      .get('/api/test')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.headers['x-correlation-id']).toBeDefined();
  });

  it('should handle health check endpoint', async () => {
    app.get('/health', healthCheck);
    
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('healthy');
  });

  it('should handle validation errors properly', async () => {
    app.use(express.json());
    app.use(distributedTracingMiddleware);
    
    app.post('/api/validate', (req, res, next) => {
      const error = new ValidationError(
        'Validation failed',
        { field: 'email', message: 'Invalid email' }
      );
      next(error);
    });
    
    app.use(enhancedErrorHandler);

    const response = await request(app)
      .post('/api/validate')
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('should apply rate limiting', async () => {
    app.use(rateLimitingMiddleware);
    
    app.get('/api/limited', (req, res) => {
      res.json({ success: true });
    });

    // First request should succeed
    await request(app)
      .get('/api/limited')
      .expect(200);

    // Mock rate limit exceeded
    mockRedis.incr.mockResolvedValue(1001);

    // Second request should be rate limited
    await request(app)
      .get('/api/limited')
      .expect(429);
  });
});