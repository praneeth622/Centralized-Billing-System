/**
 * Error Handler Middleware
 * 
 * Centralized error handling middleware for the Express billing system.
 * Provides consistent error responses, environment-specific behavior,
 * and comprehensive logging for all error types.
 * 
 * Features:
 * - Consistent JSON error response format
 * - Environment-specific error details (dev vs prod)
 * - Error type classification and mapping
 * - Status code determination
 * - Structured error logging
 * - Security-conscious error sanitization
 * - Request correlation tracking
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util';

/**
 * Standard error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    type?: string;
    statusCode: number;
    timestamp: string;
    requestId?: string;
    details?: any;
    stack?: string;
  };
}

/**
 * Custom application error class
 */
class AppError extends Error {
  public statusCode: number;
  public code?: string;
  public type: string;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    type: string = 'ApplicationError',
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.type = type;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', 'ValidationError', details);
  }
}

/**
 * Authentication error class
 */
class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR', 'AuthenticationError');
  }
}

/**
 * Authorization error class
 */
class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR', 'AuthorizationError');
  }
}

/**
 * Not found error class
 */
class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR', 'NotFoundError');
  }
}

/**
 * Conflict error class
 */
class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT_ERROR', 'ConflictError', details);
  }
}

/**
 * Rate limit error class
 */
class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR', 'RateLimitError');
  }
}

/**
 * External service error class
 */
class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: any) {
    super(`${service} service error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', 'ExternalServiceError', details);
  }
}

/**
 * Database error class
 */
class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', 'DatabaseError', details);
  }
}

/**
 * Determine status code from error
 */
const getStatusCode = (error: any): number => {
  // Custom app errors
  if (error.statusCode) {
    return error.statusCode;
  }

  // Prisma errors
  if (error.code && error.code.startsWith('P')) {
    switch (error.code) {
      case 'P2002': return 409; // Unique constraint violation
      case 'P2025': return 404; // Record not found
      case 'P2003': return 400; // Foreign key constraint violation
      case 'P2014': return 400; // Invalid ID
      default: return 500;
    }
  }

  // Express validation errors
  if (error.name === 'ValidationError') {
    return 400;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return 401;
  }

  // Stripe errors
  if (error.type) {
    switch (error.type) {
      case 'StripeCardError':
      case 'StripeInvalidRequestError':
        return 400;
      case 'StripeAPIError':
      case 'StripeConnectionError':
      case 'StripeAuthenticationError':
        return 500;
      case 'StripeRateLimitError':
        return 429;
      default:
        return 500;
    }
  }

  // Default to 500 for unknown errors
  return 500;
};

/**
 * Get error type from error object
 */
const getErrorType = (error: any): string => {
  if (error.type) return error.type;
  if (error.name) return error.name;
  if (error.code) return `${error.code}_ERROR`;
  return 'UnknownError';
};

/**
 * Get error code from error object
 */
const getErrorCode = (error: any): string | undefined => {
  if (error.code) return error.code;
  if (error.name) return error.name.toUpperCase();
  return undefined;
};

/**
 * Sanitize error message for production
 */
const sanitizeErrorMessage = (error: any, isDevelopment: boolean): string => {
  // In development, show all error messages
  if (isDevelopment) {
    return error.message || 'An error occurred';
  }

  // In production, only show safe messages for operational errors
  if (error.isOperational) {
    return error.message;
  }

  // For non-operational errors, return generic message
  const statusCode = getStatusCode(error);
  
  switch (statusCode) {
    case 400: return 'Bad Request';
    case 401: return 'Authentication required';
    case 403: return 'Access forbidden';
    case 404: return 'Resource not found';
    case 409: return 'Resource conflict';
    case 429: return 'Rate limit exceeded';
    case 500: return 'Internal server error';
    default: return 'An error occurred';
  }
};

/**
 * Log error with appropriate level and metadata
 */
const logError = (error: any, req: Request): void => {
  const statusCode = getStatusCode(error);
  const errorType = getErrorType(error);
  
  const metadata = {
    requestId: req.headers['x-request-id'] as string,
    method: req.method,
    url: req.url,
    ip: req.ip || (req.connection?.remoteAddress) || 'unknown',
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    organizationId: req.headers['x-organization-id'] as string,
    statusCode,
    errorType,
    errorCode: getErrorCode(error),
    errorMessage: error.message,
    errorStack: error.stack,
    errorDetails: error.details,
  };

  // Log as error for 5xx, warn for 4xx
  if (statusCode >= 500) {
    logger.error(`Server Error: ${error.message}`, metadata);
  } else if (statusCode >= 400) {
    logger.warn(`Client Error: ${error.message}`, metadata);
  } else {
    logger.info(`Request Error: ${error.message}`, metadata);
  }
};

/**
 * Main error handling middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  const statusCode = getStatusCode(error);
  const errorType = getErrorType(error);
  const errorCode = getErrorCode(error);

  // Log the error
  logError(error, req);

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: sanitizeErrorMessage(error, isDevelopment),
      code: errorCode,
      type: errorType,
      statusCode,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string,
    },
  };

  // Add details in development or for operational errors
  if (isDevelopment || error.isOperational) {
    if (error.details) {
      errorResponse.error.details = error.details;
    }
  }

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    errorResponse.error.stack = error.stack;
  }

  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  });

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler middleware
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create error response helper
 */
export const createErrorResponse = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): never => {
  throw new AppError(message, statusCode, code, undefined, details);
};

/**
 * Validation helper
 */
export const validateRequired = (value: any, field: string): void => {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${field} is required`);
  }
};

/**
 * Export error classes
 */
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
};

/**
 * Export error response type
 */
export type { ErrorResponse };