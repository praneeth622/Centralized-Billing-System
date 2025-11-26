import request from 'supertest';
import express from 'express';
import { errorHandler, notFoundHandler } from '../../src/shared/middleware/error-handler.middleware';
import {
  BaseError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  PaymentError,
  StripeError,
  DatabaseError,
  SecurityError,
  ErrorCode,
  ErrorSeverity,
  ErrorFactory
} from '../../src/shared/errors/custom-errors';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

jest.mock('../../src/shared/utils/logger.util', () => ({
  logger: mockLogger,
  __esModule: true,
  default: mockLogger
}));

// Mock config
jest.mock('../../src/config', () => ({
  __esModule: true,
  default: {
    nodeEnv: 'development'
  }
}));

describe('Enhanced Error Handler Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();
  });

  describe('Custom Error Classes', () => {
    it('should handle BaseError instances correctly', async () => {
      app.get('/test', (req, res, next) => {
        const error = new BaseError(
          'Test base error',
          400,
          ErrorCode.BAD_REQUEST,
          ErrorSeverity.LOW,
          true,
          { correlationId: 'test-123' }
        );
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Test base error',
          code: ErrorCode.BAD_REQUEST,
          type: 'BaseError',
          statusCode: 400,
          severity: ErrorSeverity.LOW,
          correlationId: 'test-123'
        }
      });
    });

    it('should handle ValidationError with validation details', async () => {
      app.post('/test', (req, res, next) => {
        const validationDetails = {
          email: ['Email is required', 'Email format is invalid'],
          password: ['Password must be at least 8 characters']
        };
        const error = new ValidationError('Validation failed', validationDetails);
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .post('/test')
        .send({ invalid: 'data' })
        .expect(422);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
          code: ErrorCode.VALIDATION_ERROR,
          type: 'ValidationError',
          statusCode: 422,
          validationDetails: {
            email: ['Email is required', 'Email format is invalid'],
            password: ['Password must be at least 8 characters']
          }
        }
      });
    });

    it('should handle UnauthorizedError correctly', async () => {
      app.get('/test', (req, res, next) => {
        const error = new UnauthorizedError('Invalid token');
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Invalid token',
          code: ErrorCode.UNAUTHORIZED,
          type: 'UnauthorizedError',
          statusCode: 401
        }
      });
    });

    it('should handle ForbiddenError correctly', async () => {
      app.get('/test', (req, res, next) => {
        const error = new ForbiddenError('Access denied');
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Access denied',
          code: ErrorCode.FORBIDDEN,
          type: 'ForbiddenError',
          statusCode: 403
        }
      });
    });

    it('should handle NotFoundError correctly', async () => {
      app.get('/test', (req, res, next) => {
        const error = new NotFoundError('User not found');
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'User not found',
          code: ErrorCode.NOT_FOUND,
          type: 'NotFoundError',
          statusCode: 404
        }
      });
    });

    it('should handle ConflictError correctly', async () => {
      app.post('/test', (req, res, next) => {
        const error = new ConflictError('Email already exists');
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .post('/test')
        .send({ email: 'test@example.com' })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Email already exists',
          code: ErrorCode.CONFLICT,
          type: 'ConflictError',
          statusCode: 409
        }
      });
    });

    it('should handle RateLimitError with retry information', async () => {
      app.get('/test', (req, res, next) => {
        const error = new RateLimitError('Rate limit exceeded', 60);
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Rate limit exceeded',
          code: ErrorCode.RATE_LIMIT_EXCEEDED,
          type: 'RateLimitError',
          statusCode: 429,
          retryAfter: 60
        }
      });

      expect(response.headers['retry-after']).toBe('60');
    });

    it('should handle PaymentError correctly', async () => {
      app.post('/test', (req, res, next) => {
        const error = new PaymentError('Payment declined');
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .post('/test')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Payment declined',
          code: ErrorCode.PAYMENT_FAILED,
          type: 'PaymentError',
          statusCode: 400
        }
      });
    });

    it('should handle StripeError with Stripe code', async () => {
      app.post('/test', (req, res, next) => {
        const error = new StripeError('Your card was declined', 'card_declined');
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .post('/test')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Your card was declined',
          code: ErrorCode.STRIPE_ERROR,
          type: 'StripeError',
          statusCode: 400,
          stripeCode: 'card_declined'
        }
      });
    });

    it('should handle DatabaseError as critical', async () => {
      app.get('/test', (req, res, next) => {
        const error = new DatabaseError('Connection failed');
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'An internal error occurred. Please try again later.',
          code: ErrorCode.DATABASE_ERROR,
          type: 'DatabaseError',
          statusCode: 500,
          severity: ErrorSeverity.CRITICAL
        }
      });
    });

    it('should handle SecurityError appropriately', async () => {
      app.get('/test', (req, res, next) => {
        const error = new SecurityError('Suspicious activity detected');
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Suspicious activity detected',
          code: ErrorCode.SUSPICIOUS_ACTIVITY,
          type: 'SecurityError',
          statusCode: 403,
          severity: ErrorSeverity.CRITICAL
        }
      });
    });
  });

  describe('Error Factory', () => {
    it('should create ValidationError from validation result', async () => {
      app.post('/test', (req, res, next) => {
        const validationErrors = {
          name: ['Name is required'],
          email: ['Email is invalid']
        };
        const error = ErrorFactory.fromValidationResult(validationErrors);
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .post('/test')
        .expect(422);

      expect(response.body.error.validationDetails).toEqual({
        name: ['Name is required'],
        email: ['Email is invalid']
      });
    });

    it('should create StripeError from Stripe error object', async () => {
      app.post('/test', (req, res, next) => {
        const stripeError = {
          message: 'Your card was declined.',
          code: 'card_declined',
          type: 'card_error'
        };
        const error = ErrorFactory.fromStripeError(stripeError);
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .post('/test')
        .expect(400);

      expect(response.body.error.stripeCode).toBe('card_declined');
    });

    it('should create DatabaseError from database error', async () => {
      app.get('/test', (req, res, next) => {
        const dbError = new Error('Connection timeout');
        const error = ErrorFactory.fromDatabaseError(dbError);
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body.error.code).toBe(ErrorCode.DATABASE_ERROR);
    });

    it('should handle unknown errors', async () => {
      app.get('/test', (req, res, next) => {
        const unknownError = { weird: 'error object' };
        const error = ErrorFactory.fromUnknownError(unknownError);
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body.error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    });
  });

  describe('Error Conversion and Normalization', () => {
    it('should convert Prisma errors correctly', async () => {
      app.get('/test', (req, res, next) => {
        const prismaError = {
          code: 'P2002',
          message: 'Unique constraint failed',
          meta: { target: ['email'] }
        };
        next(prismaError);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(500); // Should be converted to DatabaseError

      expect(response.body.error.code).toBe(ErrorCode.DATABASE_ERROR);
    });

    it('should convert JWT errors correctly', async () => {
      app.get('/test', (req, res, next) => {
        const jwtError = new Error('jwt expired');
        jwtError.name = 'TokenExpiredError';
        next(jwtError);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body.error.code).toBe(ErrorCode.TOKEN_EXPIRED);
    });

    it('should convert regular validation errors', async () => {
      app.post('/test', (req, res, next) => {
        const validationError = new Error('Validation failed');
        validationError.name = 'ValidationError';
        (validationError as any).errors = [
          { path: 'email', message: 'Email is required' }
        ];
        next(validationError);
      });
      app.use(errorHandler);

      await request(app)
        .post('/test')
        .expect(422);
    });
  });

  describe('Sensitive Data Filtering', () => {
    it('should filter sensitive data from error messages', async () => {
      app.get('/test', (req, res, next) => {
        const error = new BaseError(
          'Database error: password authentication failed for user admin with password secret123',
          500,
          ErrorCode.INTERNAL_SERVER_ERROR,
          ErrorSeverity.HIGH,
          false // Not operational - should be sanitized
        );
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(500);

      // Should not contain sensitive information
      expect(response.body.error.message).toBe('An internal error occurred. Please try again later.');
    });

    it('should filter authorization headers from context', async () => {
      app.get('/test', (req, res, next) => {
        req.headers.authorization = 'Bearer secret-token-123';
        req.headers.cookie = 'sessionId=secret-session';
        
        const error = new BaseError('Test error', 400, ErrorCode.BAD_REQUEST);
        error.context.additionalInfo = {
          headers: req.headers
        };
        next(error);
      });
      app.use(errorHandler);

      await request(app)
        .get('/test')
        .expect(400);

      // Check that sensitive headers are not logged
      const logCall = mockLogger.warn.mock.calls.find(call => 
        call[0] === 'Medium severity error'
      );
      expect(logCall).toBeDefined();
      
      const logData = logCall[1];
      expect(logData.request.headers).not.toHaveProperty('authorization');
      expect(logData.request.headers).not.toHaveProperty('cookie');
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should show stack traces in development', async () => {
      // Mock development environment
      jest.doMock('../../src/config', () => ({
        __esModule: true,
        default: { nodeEnv: 'development' }
      }));

      app.get('/test', (req, res, next) => {
        const error = new BaseError('Test error', 500, ErrorCode.INTERNAL_SERVER_ERROR);
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body.error.stack).toBeDefined();
    });

    it('should hide stack traces in production', async () => {
      // Mock production environment
      jest.doMock('../../src/config', () => ({
        __esModule: true,
        default: { nodeEnv: 'production' }
      }));

      app.get('/test', (req, res, next) => {
        const error = new BaseError('Test error', 500, ErrorCode.INTERNAL_SERVER_ERROR);
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body.error.stack).toBeUndefined();
    });
  });

  describe('Security Headers', () => {
    it('should set security headers on error responses', async () => {
      app.get('/test', (req, res, next) => {
        const error = new BaseError('Test error', 400, ErrorCode.BAD_REQUEST);
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(400);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('Error Logging and Metrics', () => {
    it('should log errors with appropriate severity levels', async () => {
      app.get('/critical', (req, res, next) => {
        const error = new DatabaseError('Database connection failed');
        next(error);
      });
      app.get('/medium', (req, res, next) => {
        const error = new UnauthorizedError('Invalid token');
        next(error);
      });
      app.get('/low', (req, res, next) => {
        const error = new ValidationError('Invalid input');
        next(error);
      });
      app.use(errorHandler);

      // Test critical error
      await request(app).get('/critical').expect(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'CRITICAL ERROR',
        expect.any(Object)
      );

      // Test medium error
      await request(app).get('/medium').expect(401);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Medium severity error',
        expect.any(Object)
      );

      // Test low error
      await request(app).get('/low').expect(422);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Low severity error',
        expect.any(Object)
      );
    });

    it('should emit error metrics', async () => {
      app.get('/test', (req, res, next) => {
        const error = new BaseError('Test error', 400, ErrorCode.BAD_REQUEST);
        next(error);
      });
      app.use(errorHandler);

      await request(app)
        .get('/test')
        .expect(400);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Error metrics',
        expect.objectContaining({
          type: 'error_metric',
          errorCode: ErrorCode.BAD_REQUEST,
          severity: ErrorSeverity.MEDIUM
        })
      );
    });
  });

  describe('Not Found Handler', () => {
    it('should handle 404 routes correctly', async () => {
      app.use(notFoundHandler);
      app.use(errorHandler);

      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Route GET /nonexistent-route not found',
          code: ErrorCode.NOT_FOUND,
          type: 'BaseError',
          statusCode: 404
        }
      });
    });
  });

  describe('Fallback Error Handling', () => {
    it('should handle errors in error handler gracefully', async () => {
      // Create a malformed error that might cause issues
      app.get('/test', (req, res, next) => {
        const circularRef: any = {};
        circularRef.self = circularRef;
        const error = new BaseError('Test error', 500, ErrorCode.INTERNAL_SERVER_ERROR);
        (error as any).circularRef = circularRef;
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(500);

      // Should still return a valid error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Response Headers Already Sent', () => {
    it('should not modify response if headers already sent', async () => {
      app.get('/test', (req, res, next) => {
        res.status(200).json({ message: 'success' });
        // Simulate error after response sent
        process.nextTick(() => {
          next(new BaseError('Too late error', 500, ErrorCode.INTERNAL_SERVER_ERROR));
        });
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'success' });
    });
  });
});