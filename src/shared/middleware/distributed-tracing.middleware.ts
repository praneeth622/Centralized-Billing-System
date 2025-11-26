import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.util';

export interface TracingContext {
  correlationId: string;
  requestId: string;
  sessionId?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  startTime: number;
  metadata: Record<string, any>;
}

// Extend Express Request interface to include tracing context
declare global {
  namespace Express {
    interface Request {
      tracing: TracingContext;
    }
  }
}

/**
 * Distributed Tracing and Request Correlation Middleware
 * Implements enterprise-grade request tracking and monitoring
 */
class DistributedTracingMiddleware {
  /**
   * Main correlation ID and tracing middleware
   */
  correlationId() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Extract or generate correlation ID
      const correlationId = this.extractCorrelationId(req);
      const requestId = uuidv4();
      const traceId = req.headers['x-trace-id'] as string || uuidv4();
      const spanId = uuidv4();
      const parentSpanId = req.headers['x-parent-span-id'] as string;
      
      // Extract user context
      const userId = this.extractUserId(req);
      const sessionId = this.extractSessionId(req);
      
      // Create tracing context
      const tracingContext: TracingContext = {
        correlationId,
        requestId,
        sessionId,
        userId,
        traceId,
        spanId,
        parentSpanId,
        startTime,
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          referer: req.get('Referer'),
          origin: req.get('Origin'),
          method: req.method,
          path: req.path,
          query: req.query,
          timestamp: new Date().toISOString()
        }
      };
      
      // Attach to request object
      req.tracing = tracingContext;
      
      // Set response headers for client tracking
      res.setHeader('X-Correlation-ID', correlationId);
      res.setHeader('X-Request-ID', requestId);
      res.setHeader('X-Trace-ID', traceId);
      
      // Log request start
      logger.info('Request started', {
        correlationId,
        requestId,
        traceId,
        spanId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId,
        sessionId
      });
      
      // Capture response end
      const originalSend = res.send;
      res.send = function(body) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Log request completion
        logger.info('Request completed', {
          correlationId,
          requestId,
          traceId,
          spanId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('Content-Length'),
          userId,
          sessionId
        });
        
        // Emit metrics for monitoring
        this.emitMetrics(req, res, duration);
        
        return originalSend.call(this, body);
      }.bind(this);
      
      next();
    };
  }

  /**
   * Extract correlation ID from various sources
   */
  private extractCorrelationId(req: Request): string {
    return (
      req.headers['x-correlation-id'] as string ||
      req.headers['x-request-id'] as string ||
      req.headers['correlation-id'] as string ||
      req.headers['request-id'] as string ||
      uuidv4()
    );
  }

  /**
   * Extract user ID from authentication headers or JWT
   */
  private extractUserId(req: Request): string | undefined {
    try {
      // Extract from custom header
      const userIdHeader = req.headers['x-user-id'] as string;
      if (userIdHeader) return userIdHeader;
      
      // Extract from JWT token
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Note: In production, you'd properly decode and validate the JWT
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload.sub || payload.userId || payload.user_id;
      }
      
      return undefined;
    } catch (error) {
      logger.debug('Failed to extract user ID', { error: error as Error });
      return undefined;
    }
  }

  /**
   * Extract session ID from cookies or headers
   */
  private extractSessionId(req: Request): string | undefined {
    return (
      req.headers['x-session-id'] as string ||
      req.cookies?.sessionId ||
      req.cookies?.session_id ||
      undefined
    );
  }

  /**
   * Emit metrics for external monitoring systems
   */
  private emitMetrics(req: Request, res: Response, duration: number) {
    const metrics = {
      type: 'http_request',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
      correlationId: req.tracing.correlationId,
      userId: req.tracing.userId,
      ip: req.ip
    };
    
    // Log metrics for aggregation by monitoring systems
    logger.info('Request metrics', metrics);
    
    // Here you would integrate with your monitoring system
    // Examples:
    // - DataDog: dogapi.metric('http.request.duration', duration, tags)
    // - New Relic: newrelic.recordMetric('Custom/HttpRequest/Duration', duration)
    // - Prometheus: httpDurationHistogram.observe(duration)
    // - CloudWatch: cloudwatch.putMetricData(params)
  }

  /**
   * Error tracking middleware
   */
  errorTracking() {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
      const correlationId = req.tracing?.correlationId || 'unknown';
      const requestId = req.tracing?.requestId || 'unknown';
      const traceId = req.tracing?.traceId || 'unknown';
      
      // Enhanced error logging with tracing context
      logger.error('Request error', {
        error: {
          name: err.name,
          message: err.message,
          stack: err.stack
        },
        correlationId,
        requestId,
        traceId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId: req.tracing?.userId,
        sessionId: req.tracing?.sessionId,
        userAgent: req.get('User-Agent')
      });
      
      // Emit error metrics
      this.emitErrorMetrics(err, req);
      
      next(err);
    };
  }

  /**
   * Emit error metrics for monitoring
   */
  private emitErrorMetrics(err: Error, req: Request) {
    const errorMetrics = {
      type: 'error',
      errorName: err.name,
      errorMessage: err.message,
      method: req.method,
      path: req.path,
      correlationId: req.tracing?.correlationId,
      userId: req.tracing?.userId,
      timestamp: new Date().toISOString()
    };
    
    logger.error('Error metrics', errorMetrics);
    
    // Integration points for error tracking services:
    // - Sentry: Sentry.captureException(err, { extra: errorMetrics })
    // - Bugsnag: bugsnag.notify(err, errorMetrics)
    // - Rollbar: rollbar.error(err, errorMetrics)
  }

  /**
   * Performance monitoring middleware
   */
  performanceMonitoring() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      
      res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        // Performance thresholds
        const slowRequestThreshold = 1000; // 1 second
        const verySlowRequestThreshold = 5000; // 5 seconds
        
        if (duration > verySlowRequestThreshold) {
          logger.warn('Very slow request detected', {
            correlationId: req.tracing?.correlationId,
            method: req.method,
            path: req.path,
            duration,
            threshold: verySlowRequestThreshold
          });
        } else if (duration > slowRequestThreshold) {
          logger.warn('Slow request detected', {
            correlationId: req.tracing?.correlationId,
            method: req.method,
            path: req.path,
            duration,
            threshold: slowRequestThreshold
          });
        }
        
        // Emit performance metrics
        logger.debug('Performance metrics', {
          type: 'performance',
          correlationId: req.tracing?.correlationId,
          method: req.method,
          path: req.path,
          duration,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString()
        });
      });
      
      next();
    };
  }

  /**
   * Request context middleware for async operations
   */
  requestContext() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Store context for async operations
      const context = {
        correlationId: req.tracing?.correlationId,
        requestId: req.tracing?.requestId,
        traceId: req.tracing?.traceId,
        userId: req.tracing?.userId,
        sessionId: req.tracing?.sessionId
      };
      
      // You can use AsyncLocalStorage for Node.js 14+ to maintain context across async calls
      // For now, we'll attach it to the request object
      (req as any).context = context;
      
      next();
    };
  }
}

// Export singleton instance
export default new DistributedTracingMiddleware();

// Export individual middlewares for granular control
export const tracingMiddlewares = {
  correlationId: new DistributedTracingMiddleware().correlationId(),
  errorTracking: new DistributedTracingMiddleware().errorTracking(),
  performanceMonitoring: new DistributedTracingMiddleware().performanceMonitoring(),
  requestContext: new DistributedTracingMiddleware().requestContext()
};