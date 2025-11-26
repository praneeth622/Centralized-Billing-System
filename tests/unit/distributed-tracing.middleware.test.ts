import request from 'supertest';
import express from 'express';
import { tracingMiddlewares } from '../../src/shared/middleware/distributed-tracing.middleware';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

jest.mock('../../src/shared/utils/logger.util', () => ({
  __esModule: true,
  default: mockLogger
}));

describe('Distributed Tracing Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();
  });

  describe('Correlation ID Middleware', () => {
    it('should generate correlation ID when not provided', async () => {
      app.use(tracingMiddlewares.correlationId);
      app.get('/test', (req, res) => {
        res.json({
          correlationId: req.tracing?.correlationId,
          requestId: req.tracing?.requestId
        });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.correlationId).toBeDefined();
      expect(response.body.requestId).toBeDefined();
      expect(response.headers['x-correlation-id']).toBe(response.body.correlationId);
      expect(response.headers['x-request-id']).toBe(response.body.requestId);
    });

    it('should use provided correlation ID', async () => {
      const providedCorrelationId = 'custom-correlation-id-123';
      
      app.use(tracingMiddlewares.correlationId);
      app.get('/test', (req, res) => {
        res.json({
          correlationId: req.tracing?.correlationId
        });
      });

      const response = await request(app)
        .get('/test')
        .set('X-Correlation-ID', providedCorrelationId)
        .expect(200);

      expect(response.body.correlationId).toBe(providedCorrelationId);
      expect(response.headers['x-correlation-id']).toBe(providedCorrelationId);
    });

    it('should extract trace ID from headers', async () => {
      const traceId = 'trace-123';
      const parentSpanId = 'parent-span-456';
      
      app.use(tracingMiddlewares.correlationId);
      app.get('/test', (req, res) => {
        res.json({
          traceId: req.tracing?.traceId,
          parentSpanId: req.tracing?.parentSpanId,
          spanId: req.tracing?.spanId
        });
      });

      const response = await request(app)
        .get('/test')
        .set('X-Trace-ID', traceId)
        .set('X-Parent-Span-ID', parentSpanId)
        .expect(200);

      expect(response.body.traceId).toBe(traceId);
      expect(response.body.parentSpanId).toBe(parentSpanId);
      expect(response.body.spanId).toBeDefined();
      expect(response.headers['x-trace-id']).toBe(traceId);
    });

    it('should extract user ID from JWT token', async () => {
      // Mock JWT token (base64 encoded payload)
      const payload = { sub: 'user-123', userId: 'user-456' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const mockToken = `header.${encodedPayload}.signature`;
      
      app.use(tracingMiddlewares.correlationId);
      app.get('/test', (req, res) => {
        res.json({
          userId: req.tracing?.userId
        });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.userId).toBe('user-123'); // Uses 'sub' field
    });

    it('should extract user ID from custom header', async () => {
      const userId = 'custom-user-789';
      
      app.use(tracingMiddlewares.correlationId);
      app.get('/test', (req, res) => {
        res.json({
          userId: req.tracing?.userId
        });
      });

      const response = await request(app)
        .get('/test')
        .set('X-User-ID', userId)
        .expect(200);

      expect(response.body.userId).toBe(userId);
    });

    it('should extract session ID from headers and cookies', async () => {
      const sessionId = 'session-123';
      
      app.use(tracingMiddlewares.correlationId);
      app.get('/test', (req, res) => {
        res.json({
          sessionId: req.tracing?.sessionId
        });
      });

      const response = await request(app)
        .get('/test')
        .set('X-Session-ID', sessionId)
        .expect(200);

      expect(response.body.sessionId).toBe(sessionId);
    });

    it('should log request start and completion', async () => {
      app.use(tracingMiddlewares.correlationId);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });

      await request(app)
        .get('/test')
        .expect(200);

      // Check that request started was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Request started',
        expect.objectContaining({
          correlationId: expect.any(String),
          requestId: expect.any(String),
          method: 'GET',
          path: '/test'
        })
      );

      // Check that request completed was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          correlationId: expect.any(String),
          requestId: expect.any(String),
          method: 'GET',
          path: '/test',
          statusCode: 200,
          duration: expect.any(Number)
        })
      );
    });

    it('should capture request metadata', async () => {
      app.use(tracingMiddlewares.correlationId);
      app.get('/test', (req, res) => {
        res.json({
          metadata: req.tracing?.metadata
        });
      });

      const response = await request(app)
        .get('/test?param=value')
        .set('User-Agent', 'test-agent')
        .set('Referer', 'http://example.com')
        .expect(200);

      const metadata = response.body.metadata;
      expect(metadata).toMatchObject({
        userAgent: 'test-agent',
        referer: 'http://example.com',
        method: 'GET',
        path: '/test',
        query: { param: 'value' }
      });
    });
  });

  describe('Error Tracking Middleware', () => {
    it('should log errors with tracing context', async () => {
      const testError = new Error('Test error');
      
      app.use(tracingMiddlewares.correlationId);
      app.get('/test', (req, res, next) => {
        next(testError);
      });
      app.use(tracingMiddlewares.errorTracking);
      app.use((err: any, req: any, res: any, next: any) => {
        res.status(500).json({ error: err.message });
      });

      await request(app)
        .get('/test')
        .expect(500);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          error: {
            name: 'Error',
            message: 'Test error',
            stack: expect.any(String)
          },
          correlationId: expect.any(String),
          requestId: expect.any(String),
          method: 'GET',
          path: '/test'
        })
      );
    });

    it('should handle missing tracing context gracefully', async () => {
      const testError = new Error('Test error');
      
      // Don't use correlation ID middleware
      app.get('/test', (req, res, next) => {
        next(testError);
      });
      app.use(tracingMiddlewares.errorTracking);
      app.use((err: any, req: any, res: any, next: any) => {
        res.status(500).json({ error: err.message });
      });

      await request(app)
        .get('/test')
        .expect(500);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          correlationId: 'unknown',
          requestId: 'unknown',
          traceId: 'unknown'
        })
      );
    });
  });

  describe('Performance Monitoring Middleware', () => {
    it('should detect slow requests', async () => {
      app.use(tracingMiddlewares.correlationId);
      app.use(tracingMiddlewares.performanceMonitoring);
      app.get('/test', async (req, res) => {
        // Simulate a slow request
        await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1 seconds
        res.json({ message: 'slow response' });
      });

      await request(app)
        .get('/test')
        .expect(200);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow request detected',
        expect.objectContaining({
          correlationId: expect.any(String),
          method: 'GET',
          path: '/test',
          duration: expect.any(Number),
          threshold: 1000
        })
      );
    });

    it('should detect very slow requests', async () => {
      app.use(tracingMiddlewares.correlationId);
      app.use(tracingMiddlewares.performanceMonitoring);
      app.get('/test', async (req, res) => {
        // Simulate a very slow request
        await new Promise(resolve => setTimeout(resolve, 5100)); // 5.1 seconds
        res.json({ message: 'very slow response' });
      });

      await request(app)
        .get('/test')
        .expect(200);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Very slow request detected',
        expect.objectContaining({
          correlationId: expect.any(String),
          method: 'GET',
          path: '/test',
          duration: expect.any(Number),
          threshold: 5000
        })
      );
    });

    it('should not log warnings for fast requests', async () => {
      app.use(tracingMiddlewares.correlationId);
      app.use(tracingMiddlewares.performanceMonitoring);
      app.get('/test', (req, res) => {
        res.json({ message: 'fast response' });
      });

      await request(app)
        .get('/test')
        .expect(200);

      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('slow request')
      );
    });

    it('should log performance metrics for all requests', async () => {
      app.use(tracingMiddlewares.correlationId);
      app.use(tracingMiddlewares.performanceMonitoring);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });

      await request(app)
        .get('/test')
        .expect(200);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Performance metrics',
        expect.objectContaining({
          type: 'performance',
          correlationId: expect.any(String),
          method: 'GET',
          path: '/test',
          duration: expect.any(Number),
          statusCode: 200,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('Request Context Middleware', () => {
    it('should store context for async operations', async () => {
      app.use(tracingMiddlewares.correlationId);
      app.use(tracingMiddlewares.requestContext);
      app.get('/test', (req, res) => {
        res.json({
          context: (req as any).context
        });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.context).toMatchObject({
        correlationId: expect.any(String),
        requestId: expect.any(String),
        traceId: expect.any(String)
      });
    });
  });

  describe('Integration', () => {
    it('should work with all middlewares together', async () => {
      app.use(tracingMiddlewares.correlationId);
      app.use(tracingMiddlewares.requestContext);
      app.use(tracingMiddlewares.performanceMonitoring);
      app.get('/test', (req, res) => {
        res.json({
          correlationId: req.tracing?.correlationId,
          context: (req as any).context
        });
      });
      app.use(tracingMiddlewares.errorTracking);

      const response = await request(app)
        .get('/test')
        .set('X-Correlation-ID', 'integration-test-123')
        .expect(200);

      expect(response.body.correlationId).toBe('integration-test-123');
      expect(response.body.context.correlationId).toBe('integration-test-123');
      expect(response.headers['x-correlation-id']).toBe('integration-test-123');
      
      // Check all logging occurred
      expect(mockLogger.info).toHaveBeenCalledWith('Request started', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Request completed', expect.any(Object));
      expect(mockLogger.debug).toHaveBeenCalledWith('Performance metrics', expect.any(Object));
    });

    it('should handle errors in middleware chain', async () => {
      const testError = new Error('Middleware error');
      
      app.use(tracingMiddlewares.correlationId);
      app.use(tracingMiddlewares.requestContext);
      app.use((req, res, next) => {
        throw testError;
      });
      app.use(tracingMiddlewares.errorTracking);
      app.use((err: any, req: any, res: any, next: any) => {
        res.status(500).json({ error: err.message });
      });

      await request(app)
        .get('/test')
        .expect(500);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          error: {
            name: 'Error',
            message: 'Middleware error'
          }
        })
      );
    });

    it('should preserve tracing context across async operations', async () => {
      app.use(tracingMiddlewares.correlationId);
      app.use(tracingMiddlewares.requestContext);
      app.get('/test', async (req, res) => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        
        res.json({
          correlationId: req.tracing?.correlationId,
          contextAfterAsync: (req as any).context
        });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.correlationId).toBeDefined();
      expect(response.body.contextAfterAsync.correlationId).toBe(response.body.correlationId);
    });
  });

  describe('Header Handling', () => {
    it('should handle various correlation ID header formats', async () => {
      const testCases = [
        { header: 'X-Correlation-ID', value: 'x-correlation-id-123' },
        { header: 'X-Request-ID', value: 'x-request-id-456' },
        { header: 'Correlation-ID', value: 'correlation-id-789' },
        { header: 'Request-ID', value: 'request-id-abc' }
      ];

      for (const testCase of testCases) {
        app = express();
        app.use(tracingMiddlewares.correlationId);
        app.get('/test', (req, res) => {
          res.json({ correlationId: req.tracing?.correlationId });
        });

        const response = await request(app)
          .get('/test')
          .set(testCase.header, testCase.value)
          .expect(200);

        expect(response.body.correlationId).toBe(testCase.value);
      }
    });
  });
});