/**
 * Error Handler Middleware Tests
 * 
 * Comprehensive unit tests for the error handling middleware including
 * error classification, status code mapping, response formatting,
 * and environment-specific behavior.
 */

import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createErrorResponse,
  validateRequired,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  ErrorResponse,
} from '../../src/shared/middleware/error-handler.middleware';

// Mock the logger
jest.mock('../../src/shared/utils/logger.util', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { logger } from '../../src/shared/utils/logger.util';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      path: '/api/test',
      ip: '192.168.1.1',
      headers: {
        'x-request-id': 'req-123',
        'x-organization-id': 'org-456',
      },
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
    };

    mockResponse = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('Custom Error Classes', () => {
    describe('AppError', () => {
      it('should create AppError with default values', () => {
        const error = new AppError('Test error');
        
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.type).toBe('ApplicationError');
        expect(error.isOperational).toBe(true);
        expect(error.code).toBeUndefined();
        expect(error.details).toBeUndefined();
      });

      it('should create AppError with all parameters', () => {
        const details = { field: 'value' };
        const error = new AppError('Custom error', 400, 'CUSTOM_ERROR', 'CustomType', details);
        
        expect(error.message).toBe('Custom error');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('CUSTOM_ERROR');
        expect(error.type).toBe('CustomType');
        expect(error.details).toBe(details);
      });
    });

    describe('ValidationError', () => {
      it('should create ValidationError with correct properties', () => {
        const details = { field: 'email', value: 'invalid' };
        const error = new ValidationError('Invalid email format', details);
        
        expect(error.message).toBe('Invalid email format');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.type).toBe('ValidationError');
        expect(error.details).toBe(details);
      });
    });

    describe('AuthenticationError', () => {
      it('should create AuthenticationError with default message', () => {
        const error = new AuthenticationError();
        
        expect(error.message).toBe('Authentication required');
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('AUTHENTICATION_ERROR');
        expect(error.type).toBe('AuthenticationError');
      });

      it('should create AuthenticationError with custom message', () => {
        const error = new AuthenticationError('Invalid token');
        
        expect(error.message).toBe('Invalid token');
        expect(error.statusCode).toBe(401);
      });
    });

    describe('AuthorizationError', () => {
      it('should create AuthorizationError with default message', () => {
        const error = new AuthorizationError();
        
        expect(error.message).toBe('Insufficient permissions');
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('AUTHORIZATION_ERROR');
      });
    });

    describe('NotFoundError', () => {
      it('should create NotFoundError with default message', () => {
        const error = new NotFoundError();
        
        expect(error.message).toBe('Resource not found');
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND_ERROR');
      });
    });

    describe('ConflictError', () => {
      it('should create ConflictError with details', () => {
        const details = { conflictingField: 'email' };
        const error = new ConflictError('Email already exists', details);
        
        expect(error.message).toBe('Email already exists');
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('CONFLICT_ERROR');
        expect(error.details).toBe(details);
      });
    });

    describe('RateLimitError', () => {
      it('should create RateLimitError with default message', () => {
        const error = new RateLimitError();
        
        expect(error.message).toBe('Rate limit exceeded');
        expect(error.statusCode).toBe(429);
        expect(error.code).toBe('RATE_LIMIT_ERROR');
      });
    });

    describe('ExternalServiceError', () => {
      it('should create ExternalServiceError with service name', () => {
        const details = { statusCode: 502 };
        const error = new ExternalServiceError('Stripe', 'Payment failed', details);
        
        expect(error.message).toBe('Stripe service error: Payment failed');
        expect(error.statusCode).toBe(502);
        expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
        expect(error.details).toBe(details);
      });
    });

    describe('DatabaseError', () => {
      it('should create DatabaseError with details', () => {
        const details = { query: 'SELECT * FROM users', duration: 5000 };
        const error = new DatabaseError('Connection timeout', details);
        
        expect(error.message).toBe('Connection timeout');
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('DATABASE_ERROR');
        expect(error.details).toBe(details);
      });
    });
  });

  describe('Error Handler Middleware', () => {
    it('should skip if response headers already sent', () => {
      mockResponse.headersSent = true;
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle AppError in development environment', () => {
      process.env.NODE_ENV = 'development';
      const error = new AppError('Test error', 400, 'TEST_ERROR', 'TestError', { field: 'value' });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Test error',
          code: 'TEST_ERROR',
          type: 'TestError',
          statusCode: 400,
          timestamp: expect.any(String),
          requestId: 'req-123',
          details: { field: 'value' },
          stack: expect.any(String),
        },
      });
    });

    it('should handle AppError in production environment', () => {
      process.env.NODE_ENV = 'production';
      const error = new AppError('Test error', 400, 'TEST_ERROR', 'TestError', { field: 'value' });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Test error',
          code: 'TEST_ERROR',
          type: 'TestError',
          statusCode: 400,
          timestamp: expect.any(String),
          requestId: 'req-123',
          details: { field: 'value' },
          // No stack in production
        },
      });
    });

    it('should sanitize non-operational errors in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal database connection failed');
      error.name = 'DatabaseConnectionError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Internal server error', // Sanitized
          code: 'DATABASECONNECTIONERROR',
          type: 'DatabaseConnectionError',
          statusCode: 500,
          timestamp: expect.any(String),
          requestId: 'req-123',
        },
      });
    });

    it('should handle Prisma errors correctly', () => {
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';

      errorHandler(prismaError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409); // Unique constraint -> 409
    });

    it('should handle JWT errors correctly', () => {
      const jwtError = new Error('Invalid token');
      jwtError.name = 'JsonWebTokenError';

      errorHandler(jwtError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should handle Stripe errors correctly', () => {
      const stripeError = new Error('Your card was declined');
      (stripeError as any).type = 'StripeCardError';

      errorHandler(stripeError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should log errors with appropriate metadata', () => {
      const error = new AppError('Test error', 500);
      (mockRequest as any).user = { id: 'user-123' };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Server Error: Test error',
        expect.objectContaining({
          requestId: 'req-123',
          method: 'GET',
          url: '/api/test',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          userId: 'user-123',
          organizationId: 'org-456',
          statusCode: 500,
          errorMessage: 'Test error',
          errorType: 'ApplicationError',
        })
      );
    });

    it('should log client errors as warnings', () => {
      const error = new ValidationError('Invalid input');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        'Client Error: Invalid input',
        expect.any(Object)
      );
    });

    it('should set security headers in response', () => {
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.set).toHaveBeenCalledWith({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      });
    });
  });

  describe('Not Found Handler', () => {
    it('should create NotFoundError with route information', () => {
      const testRequest = {
        ...mockRequest,
        method: 'POST',
        path: '/api/nonexistent',
      };

      notFoundHandler(testRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route POST /api/nonexistent not found',
          statusCode: 404,
          code: 'NOT_FOUND_ERROR',
        })
      );
    });
  });

  describe('Async Handler', () => {
    it('should handle successful async operations', async () => {
      const asyncFunction = jest.fn().mockResolvedValue('success');
      const wrappedFunction = asyncHandler(asyncFunction);

      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch async errors and pass to next', async () => {
      const error = new Error('Async error');
      const asyncFunction = jest.fn().mockRejectedValue(error);
      const wrappedFunction = asyncHandler(asyncFunction);

      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle sync errors in wrapped function', async () => {
      // Create error outside the function to avoid Jest compilation issues
      let testError: Error;
      const syncFunction = jest.fn().mockImplementation(() => {
        testError = new Error('Sync error');
        throw testError;
      });
      const wrappedFunction = asyncHandler(syncFunction);

      // The wrapped function should catch the error and pass it to next
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(testError!);
    });
  });

  describe('Helper Functions', () => {
    describe('createErrorResponse', () => {
      it('should throw AppError with provided parameters', () => {
        expect(() => {
          createErrorResponse('Custom error', 418, 'CUSTOM_CODE', { detail: 'info' });
        }).toThrow(AppError);

        try {
          createErrorResponse('Custom error', 418, 'CUSTOM_CODE', { detail: 'info' });
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).message).toBe('Custom error');
          expect((error as AppError).statusCode).toBe(418);
          expect((error as AppError).code).toBe('CUSTOM_CODE');
          expect((error as AppError).details).toEqual({ detail: 'info' });
        }
      });

      it('should use default status code when not provided', () => {
        expect(() => {
          createErrorResponse('Error without status');
        }).toThrow(AppError);

        try {
          createErrorResponse('Error without status');
        } catch (error) {
          expect((error as AppError).statusCode).toBe(500);
        }
      });
    });

    describe('validateRequired', () => {
      it('should not throw for valid values', () => {
        expect(() => validateRequired('valid', 'field')).not.toThrow();
        expect(() => validateRequired(123, 'number')).not.toThrow();
        expect(() => validateRequired(true, 'boolean')).not.toThrow();
        expect(() => validateRequired([], 'array')).not.toThrow();
        expect(() => validateRequired({}, 'object')).not.toThrow();
      });

      it('should throw ValidationError for undefined', () => {
        expect(() => validateRequired(undefined, 'field')).toThrow(ValidationError);
        try {
          validateRequired(undefined, 'field');
        } catch (error) {
          expect((error as ValidationError).message).toBe('field is required');
        }
      });

      it('should throw ValidationError for null', () => {
        expect(() => validateRequired(null, 'field')).toThrow(ValidationError);
      });

      it('should throw ValidationError for empty string', () => {
        expect(() => validateRequired('', 'field')).toThrow(ValidationError);
      });
    });
  });

  describe('Error Status Code Mapping', () => {
    const testCases = [
      // Prisma errors
      { error: { code: 'P2002' }, expectedStatus: 409 },
      { error: { code: 'P2025' }, expectedStatus: 404 },
      { error: { code: 'P2003' }, expectedStatus: 400 },
      { error: { code: 'P2014' }, expectedStatus: 400 },
      { error: { code: 'P9999' }, expectedStatus: 500 },

      // Express/Mongoose validation errors
      { error: { name: 'ValidationError' }, expectedStatus: 400 },

      // JWT errors
      { error: { name: 'JsonWebTokenError' }, expectedStatus: 401 },
      { error: { name: 'TokenExpiredError' }, expectedStatus: 401 },

      // Stripe errors
      { error: { type: 'StripeCardError' }, expectedStatus: 400 },
      { error: { type: 'StripeInvalidRequestError' }, expectedStatus: 400 },
      { error: { type: 'StripeAPIError' }, expectedStatus: 500 },
      { error: { type: 'StripeConnectionError' }, expectedStatus: 500 },
      { error: { type: 'StripeAuthenticationError' }, expectedStatus: 500 },
      { error: { type: 'StripeRateLimitError' }, expectedStatus: 429 },

      // Default case
      { error: {}, expectedStatus: 500 },
    ];

    testCases.forEach(({ error, expectedStatus }) => {
      it(`should map ${JSON.stringify(error)} to status ${expectedStatus}`, () => {
        const testError = new Error('Test error');
        Object.assign(testError, error);

        errorHandler(testError, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(expectedStatus);
      });
    });
  });

  describe('Environment-Specific Behavior', () => {
    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Development error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            stack: expect.any(String),
          }),
        })
      );
    });

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Production error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error.stack).toBeUndefined();
    });

    it('should show detailed messages in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Detailed development error message');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Detailed development error message',
          }),
        })
      );
    });

    it('should sanitize error messages in production for non-operational errors', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal database connection string leaked');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Internal server error', // Sanitized
          }),
        })
      );
    });
  });
});