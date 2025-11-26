/**
 * Enhanced Enterprise-Grade Error Handler Middleware
 * 
 * Centralized error handling middleware for the Express billing system.
 * Provides comprehensive error management, security, and monitoring.
 * 
 * Features:
 * - Custom exception classes with proper hierarchy
 * - Environment-specific error sanitization
 * - Comprehensive error logging and monitoring
 * - Security-conscious sensitive data filtering
 * - Distributed tracing integration
 * - Performance impact monitoring
 * - Automated error alerting thresholds
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util';
import {
  BaseError,
  ErrorCode,
  ErrorSeverity,
  ErrorFactory,
  isBaseError,
/**
 * Enhanced Enterprise-Grade Error Handler Middleware
 * 
 * Centralized error handling middleware for the Express billing system.
 * Provides comprehensive error management, security, and monitoring.
 * 
 * Features:
 * - Custom exception classes with proper hierarchy
 * - Environment-specific error sanitization
 * - Comprehensive error logging and monitoring
 * - Security-conscious sensitive data filtering
 * - Distributed tracing integration
 * - Performance impact monitoring
 * - Automated error alerting thresholds
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util';
import {
  BaseError,
  ErrorCode,
  ErrorSeverity,
  ErrorFactory,
  isBaseError,
  isOperationalError,
  isCriticalError,
  ValidationError,
  RateLimitError,
  ServiceUnavailableError
} from '../errors/custom-errors';

/**
 * Standard error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    type: string;
    statusCode: number;
    severity: string;
    timestamp: string;
    correlationId?: string;
    requestId?: string;
    details?: any;
    validationDetails?: Record<string, string[]>;
    retryAfter?: number;
    stack?: string;
  };
}

/**
 * Sensitive data patterns to filter from error responses
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /authorization/i,
  /credential/i,
  /session/i,
  /cookie/i,
  /ssn/i,
  /social.*security/i,
  /credit.*card/i,
  /card.*number/i,
  /cvv/i,
  /expir/i
];

/**
 * Enhanced Error Handler Class
 */
class EnhancedErrorHandler {
  private readonly isDevelopment: boolean;
  private readonly errorAlertThresholds: Map<ErrorCode, number>;
  private readonly errorCounters: Map<string, number>;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.errorAlertThresholds = new Map([
      [ErrorCode.INTERNAL_SERVER_ERROR, 10],
      [ErrorCode.DATABASE_ERROR, 5],
      [ErrorCode.STRIPE_ERROR, 15],
      [ErrorCode.REDIS_ERROR, 8],
      [ErrorCode.SERVICE_UNAVAILABLE, 3]
    ]);
    this.errorCounters = new Map();
  }

  /**
   * Main error handling middleware
   */
  handle() {
    return (error: any, req: Request, res: Response, next: NextFunction): void => {
      // Skip if response already sent
      if (res.headersSent) {
        return next(error);
      }

      try {
        // Convert unknown errors to BaseError instances
        const normalizedError = this.normalizeError(error, req);
        
        // Extract tracing context
        const tracingContext = this.extractTracingContext(req);
        
        // Update error context with request information
        this.enrichErrorContext(normalizedError, req, tracingContext);
        
        // Log the error comprehensively
        this.logError(normalizedError, req);
        
        // Track error metrics
        this.trackErrorMetrics(normalizedError);
        
        // Check if critical error alerting is needed
        this.checkAlertThresholds(normalizedError);
        
        // Create sanitized response
        const errorResponse = this.createErrorResponse(normalizedError, tracingContext);
        
        // Set security headers
        this.setSecurityHeaders(res);
        
        // Add rate limiting headers if applicable
        if (normalizedError instanceof RateLimitError && normalizedError.retryAfter) {
          res.set('Retry-After', normalizedError.retryAfter.toString());
        }
        
        // Send error response
        res.status(normalizedError.statusCode).json(errorResponse);
        
      } catch (handlerError) {
        // Fallback error handling
        this.handleFallbackError(handlerError, res);
      }
    };
  }

  /**
   * Convert any error to BaseError instance
   */
  private normalizeError(error: any, req: Request): BaseError {
    if (isBaseError(error)) {
      return error;
    }

    // Handle specific error types
    if (this.isPrismaError(error)) {
      return this.handlePrismaError(error);
    }

    if (this.isStripeError(error)) {
      return ErrorFactory.fromStripeError(error);
    }

    if (this.isValidationError(error)) {
      return this.handleValidationError(error);
    }

    if (this.isJWTError(error)) {
      return this.handleJWTError(error);
    }

    // Default to internal server error
    return ErrorFactory.fromUnknownError(error);
  }

  /**
   * Extract tracing context from request
   */
  private extractTracingContext(req: Request): any {
    return {
      correlationId: req.headers['x-correlation-id'] || req.tracing?.correlationId,
      requestId: req.headers['x-request-id'] || req.tracing?.requestId,
      traceId: req.headers['x-trace-id'] || req.tracing?.traceId,
      spanId: req.tracing?.spanId,
      userId: req.tracing?.userId || (req as any).user?.id,
      sessionId: req.tracing?.sessionId
    };
  }

  /**
   * Enrich error context with request information
   */
  private enrichErrorContext(error: BaseError, req: Request, tracingContext: any): void {
    error.context.correlationId = tracingContext.correlationId;
    error.context.requestId = tracingContext.requestId;
    error.context.userId = tracingContext.userId;
    error.context.sessionId = tracingContext.sessionId;
    error.context.ip = req.ip;
    error.context.userAgent = req.get('User-Agent');
    error.context.endpoint = `${req.method} ${req.path}`;
    error.context.method = req.method;
    error.context.additionalInfo = {
      headers: this.sanitizeHeaders(req.headers),
      query: req.query,
      params: req.params
    };
  }

  /**
   * Comprehensive error logging
   */
  private logError(error: BaseError, req: Request): void {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        severity: error.severity,
        statusCode: error.statusCode,
        stack: error.stack
      },
      context: error.context,
      request: {
        method: req.method,
        path: req.path,
        query: req.query,
        params: req.params,
        headers: this.sanitizeHeaders(req.headers)
      },
      originalError: error.originalError ? {
        name: error.originalError.name,
        message: error.originalError.message,
        stack: error.originalError.stack
      } : undefined
    };

    // Log with appropriate level based on severity
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('CRITICAL ERROR', logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity error', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity error', logData);
        break;
      case ErrorSeverity.LOW:
        logger.info('Low severity error', logData);
        break;
    }
  }

  /**
   * Track error metrics for monitoring
   */
  private trackErrorMetrics(error: BaseError): void {
    const metricKey = `${error.code}_${error.severity}`;
    const currentCount = this.errorCounters.get(metricKey) || 0;
    this.errorCounters.set(metricKey, currentCount + 1);

    // Emit metrics
    logger.info('Error metrics', {
      type: 'error_metric',
      errorCode: error.code,
      severity: error.severity,
      count: currentCount + 1,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if error thresholds are exceeded and trigger alerts
   */
  private checkAlertThresholds(error: BaseError): void {
    if (!isCriticalError(error)) return;

    const threshold = this.errorAlertThresholds.get(error.code);
    if (!threshold) return;

    const metricKey = `${error.code}_${error.severity}`;
    const currentCount = this.errorCounters.get(metricKey) || 0;

    if (currentCount >= threshold) {
      logger.error('ERROR THRESHOLD EXCEEDED - ALERT TRIGGERED', {
        errorCode: error.code,
        severity: error.severity,
        currentCount,
        threshold,
        alertLevel: 'CRITICAL'
      });

      // Reset counter after alert
      this.errorCounters.set(metricKey, 0);
    }
  }

  /**
   * Create sanitized error response
   */
  private createErrorResponse(error: BaseError, tracingContext: any): ErrorResponse {
    const response: ErrorResponse = {
      success: false,
      error: {
        message: this.sanitizeErrorMessage(error),
        code: error.code,
        type: error.name,
        statusCode: error.statusCode,
        severity: error.severity,
        timestamp: error.context.timestamp,
        correlationId: tracingContext.correlationId,
        requestId: tracingContext.requestId
      }
    };

    // Add validation details for validation errors
    if (error instanceof ValidationError && error.validationDetails) {
      response.error.validationDetails = error.validationDetails;
    }

    // Add retry information for rate limit errors
    if (error instanceof RateLimitError && error.retryAfter) {
      response.error.retryAfter = error.retryAfter;
    }

    // Add stack trace in development or for operational errors
    if (this.isDevelopment && error.stack) {
      response.error.stack = error.stack;
    }

    return response;
  }

  /**
   * Sanitize error message based on environment and error type
   */
  private sanitizeErrorMessage(error: BaseError): string {
    // In development, show all messages
    if (this.isDevelopment) {
      return error.message;
    }

    // For operational errors, show the message if it doesn't contain sensitive data
    if (isOperationalError(error) && !this.containsSensitiveData(error.message)) {
      return error.message;
    }

    // For critical errors in production, return generic message
    if (isCriticalError(error)) {
      return 'An internal error occurred. Please try again later.';
    }

    // Default sanitized messages by status code
    switch (error.statusCode) {
      case 400: return 'Bad Request';
      case 401: return 'Authentication required';
      case 403: return 'Access forbidden';
      case 404: return 'Resource not found';
      case 409: return 'Resource conflict';
      case 429: return 'Rate limit exceeded';
      case 500: return 'Internal server error';
      case 503: return 'Service temporarily unavailable';
      default: return 'An error occurred';
    }
  }

  /**
   * Check if text contains sensitive data patterns
   */
  private containsSensitiveData(text: string): boolean {
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(text));
  }

  /**
   * Sanitize request headers
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    delete sanitized['x-auth-token'];
    
    return sanitized;
  }

  /**
   * Set security headers
   */
  private setSecurityHeaders(res: Response): void {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    });
  }

  /**
   * Fallback error handler
   */
  private handleFallbackError(handlerError: any, res: Response): void {
    logger.error('Error in error handler', { error: handlerError });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          message: 'An internal error occurred',
          code: 'INTERNAL_SERVER_ERROR',
          type: 'InternalServerError',
          statusCode: 500,
          severity: 'critical',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Error type detection methods
  private isPrismaError(error: any): boolean {
    return error.code && error.code.startsWith('P');
  }

  private isStripeError(error: any): boolean {
    return error.type && error.type.startsWith('Stripe');
  }

  private isValidationError(error: any): boolean {
    return error.name === 'ValidationError' || error.name === 'ValidatorError';
  }

  private isJWTError(error: any): boolean {
    return error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError';
  }

  // Error conversion methods
  private handlePrismaError(error: any): BaseError {
    return ErrorFactory.fromDatabaseError(error);
  }

  private handleValidationError(error: any): ValidationError {
    const validationDetails = this.extractValidationDetails(error);
    return new ValidationError('Validation failed', validationDetails);
  }

  private handleJWTError(error: any): BaseError {
    if (error.name === 'TokenExpiredError') {
      return new BaseError('Token expired', 401, ErrorCode.TOKEN_EXPIRED, ErrorSeverity.MEDIUM);
    }
    return new BaseError('Invalid token', 401, ErrorCode.INVALID_TOKEN, ErrorSeverity.MEDIUM);
  }

  private extractValidationDetails(error: any): Record<string, string[]> {
    if (error.errors && Array.isArray(error.errors)) {
      const details: Record<string, string[]> = {};
      error.errors.forEach((err: any) => {
        if (err.path) {
          if (!details[err.path]) {
            details[err.path] = [];
          }
          details[err.path].push(err.message);
        }
      });
      return details;
    }
    return {};
  }
}

// Export singleton instance
const enhancedErrorHandler = new EnhancedErrorHandler();

/**
 * Main error handling middleware export
 */
export const errorHandler = enhancedErrorHandler.handle();

/**
 * 404 handler middleware
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const context = {
    correlationId: req.headers['x-correlation-id'] as string,
    requestId: req.headers['x-request-id'] as string,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    endpoint: `${req.method} ${req.path}`
  };
  
  const error = new BaseError(
    `Route ${req.method} ${req.path} not found`,
    404,
    ErrorCode.NOT_FOUND,
    ErrorSeverity.LOW,
    true,
    context
  );
  
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
 * Export for backward compatibility
 */
export default errorHandler;
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