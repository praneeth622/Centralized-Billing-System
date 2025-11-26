/**
 * Enterprise-grade custom error classes for comprehensive error handling
 */

export enum ErrorCode {
  // General errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Authentication errors
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Business logic errors
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  PLAN_NOT_FOUND = 'PLAN_NOT_FOUND',
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  INVOICE_NOT_FOUND = 'INVOICE_NOT_FOUND',
  DUPLICATE_SUBSCRIPTION = 'DUPLICATE_SUBSCRIPTION',
  
  // External service errors
  STRIPE_ERROR = 'STRIPE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Rate limiting errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  IP_BLOCKED = 'IP_BLOCKED',
  
  // Security errors
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  CSRF_TOKEN_MISMATCH = 'CSRF_TOKEN_MISMATCH',
  INVALID_ORIGIN = 'INVALID_ORIGIN'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  timestamp: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Base application error class
 */
export abstract class BaseError extends Error {
  public readonly name: string;
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly isOperational: boolean;
  public readonly context: ErrorContext;
  public readonly originalError?: Error;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational: boolean = true,
    context: Partial<ErrorContext> = {},
    originalError?: Error
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.severity = severity;
    this.isOperational = isOperational;
    this.originalError = originalError;
    this.context = {
      timestamp: new Date().toISOString(),
      ...context
    };

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      severity: this.severity,
      timestamp: this.context.timestamp,
      correlationId: this.context.correlationId,
      requestId: this.context.requestId
    };
  }

  /**
   * Convert error to safe JSON (removes sensitive info)
   */
  toSafeJSON(): Record<string, any> {
    const safeError = this.toJSON();
    
    // Remove sensitive information in production
    if (process.env.NODE_ENV === 'production') {
      delete safeError.stack;
      if (this.severity === ErrorSeverity.CRITICAL) {
        safeError.message = 'An internal error occurred';
      }
    }
    
    return safeError;
  }
}

/**
 * HTTP 400 - Bad Request
 */
export class BadRequestError extends BaseError {
  constructor(
    message: string = 'Bad Request',
    code: ErrorCode = ErrorCode.BAD_REQUEST,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 400, code, ErrorSeverity.LOW, true, context, originalError);
  }
}

/**
 * HTTP 401 - Unauthorized
 */
export class UnauthorizedError extends BaseError {
  constructor(
    message: string = 'Unauthorized',
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 401, code, ErrorSeverity.MEDIUM, true, context, originalError);
  }
}

/**
 * HTTP 403 - Forbidden
 */
export class ForbiddenError extends BaseError {
  constructor(
    message: string = 'Forbidden',
    code: ErrorCode = ErrorCode.FORBIDDEN,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 403, code, ErrorSeverity.MEDIUM, true, context, originalError);
  }
}

/**
 * HTTP 404 - Not Found
 */
export class NotFoundError extends BaseError {
  constructor(
    message: string = 'Resource not found',
    code: ErrorCode = ErrorCode.NOT_FOUND,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 404, code, ErrorSeverity.LOW, true, context, originalError);
  }
}

/**
 * HTTP 409 - Conflict
 */
export class ConflictError extends BaseError {
  constructor(
    message: string = 'Resource conflict',
    code: ErrorCode = ErrorCode.CONFLICT,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 409, code, ErrorSeverity.MEDIUM, true, context, originalError);
  }
}

/**
 * HTTP 422 - Unprocessable Entity
 */
export class ValidationError extends BaseError {
  public readonly validationDetails?: Record<string, string[]>;

  constructor(
    message: string = 'Validation failed',
    validationDetails?: Record<string, string[]>,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 422, ErrorCode.VALIDATION_ERROR, ErrorSeverity.LOW, true, context, originalError);
    this.validationDetails = validationDetails;
  }

  toJSON(): Record<string, any> {
    const json = super.toJSON();
    if (this.validationDetails) {
      json.validationDetails = this.validationDetails;
    }
    return json;
  }
}

/**
 * HTTP 429 - Too Many Requests
 */
export class RateLimitError extends BaseError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 429, ErrorCode.RATE_LIMIT_EXCEEDED, ErrorSeverity.MEDIUM, true, context, originalError);
    this.retryAfter = retryAfter;
  }

  toJSON(): Record<string, any> {
    const json = super.toJSON();
    if (this.retryAfter) {
      json.retryAfter = this.retryAfter;
    }
    return json;
  }
}

/**
 * HTTP 500 - Internal Server Error
 */
export class InternalServerError extends BaseError {
  constructor(
    message: string = 'Internal server error',
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 500, code, ErrorSeverity.HIGH, false, context, originalError);
  }
}

/**
 * HTTP 503 - Service Unavailable
 */
export class ServiceUnavailableError extends BaseError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Service temporarily unavailable',
    retryAfter?: number,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 503, ErrorCode.SERVICE_UNAVAILABLE, ErrorSeverity.HIGH, true, context, originalError);
    this.retryAfter = retryAfter;
  }

  toJSON(): Record<string, any> {
    const json = super.toJSON();
    if (this.retryAfter) {
      json.retryAfter = this.retryAfter;
    }
    return json;
  }
}

/**
 * Business logic errors
 */
export class PaymentError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.PAYMENT_FAILED,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 400, code, ErrorSeverity.HIGH, true, context, originalError);
  }
}

export class StripeError extends BaseError {
  public readonly stripeCode?: string;

  constructor(
    message: string,
    stripeCode?: string,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 400, ErrorCode.STRIPE_ERROR, ErrorSeverity.HIGH, true, context, originalError);
    this.stripeCode = stripeCode;
  }

  toJSON(): Record<string, any> {
    const json = super.toJSON();
    if (this.stripeCode) {
      json.stripeCode = this.stripeCode;
    }
    return json;
  }
}

export class DatabaseError extends BaseError {
  constructor(
    message: string = 'Database operation failed',
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 500, ErrorCode.DATABASE_ERROR, ErrorSeverity.CRITICAL, false, context, originalError);
  }
}

export class RedisError extends BaseError {
  constructor(
    message: string = 'Redis operation failed',
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 500, ErrorCode.REDIS_ERROR, ErrorSeverity.HIGH, true, context, originalError);
  }
}

/**
 * Security-related errors
 */
export class SecurityError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.SUSPICIOUS_ACTIVITY,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(message, 403, code, ErrorSeverity.CRITICAL, true, context, originalError);
  }
}

/**
 * Error factory for creating errors from common scenarios
 */
export class ErrorFactory {
  static fromValidationResult(validationErrors: Record<string, string[]>, context?: Partial<ErrorContext>): ValidationError {
    const message = 'Validation failed for one or more fields';
    return new ValidationError(message, validationErrors, context);
  }

  static fromStripeError(stripeError: any, context?: Partial<ErrorContext>): StripeError {
    return new StripeError(
      stripeError.message || 'Stripe error occurred',
      stripeError.code,
      context,
      stripeError
    );
  }

  static fromDatabaseError(dbError: Error, context?: Partial<ErrorContext>): DatabaseError {
    return new DatabaseError(
      'Database operation failed',
      context,
      dbError
    );
  }

  static fromUnknownError(error: any, context?: Partial<ErrorContext>): BaseError {
    if (error instanceof BaseError) {
      return error;
    }

    if (error instanceof Error) {
      return new InternalServerError(
        error.message,
        ErrorCode.INTERNAL_SERVER_ERROR,
        context,
        error
      );
    }

    return new InternalServerError(
      'An unexpected error occurred',
      ErrorCode.INTERNAL_SERVER_ERROR,
      context
    );
  }
}

/**
 * Type guards for error checking
 */
export function isBaseError(error: any): error is BaseError {
  return error instanceof BaseError;
}

export function isOperationalError(error: any): boolean {
  return isBaseError(error) && error.isOperational;
}

export function isCriticalError(error: any): boolean {
  return isBaseError(error) && error.severity === ErrorSeverity.CRITICAL;
}

export function isRetryableError(error: any): boolean {
  return isBaseError(error) && [
    ErrorCode.SERVICE_UNAVAILABLE,
    ErrorCode.REDIS_ERROR,
    ErrorCode.EXTERNAL_SERVICE_ERROR
  ].includes(error.code);
}