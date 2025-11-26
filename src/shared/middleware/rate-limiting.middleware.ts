import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import RedisClient from '../../infrastructure/cache/redis.client';
import logger from '../../shared/utils/logger.util';
import config from '../../config';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}

/**
 * Enterprise-grade rate limiting middleware with Redis backing
 * Supports per-IP, per-user, and per-endpoint limits
 */
class RateLimitManager {
  private redisClient: RedisClient;

  constructor() {
    this.redisClient = RedisClient.getInstance();
  }

  /**
   * Generate cache key for rate limiting
   */
  private generateKey(prefix: string, identifier: string): string {
    return `rate_limit:${prefix}:${identifier}`;
  }

  /**
   * Custom rate limit store using Redis
   */
  private createRedisStore(prefix: string) {
    return {
      incr: async (key: string) => {
        const redisKey = this.generateKey(prefix, key);
        const current = await this.redisClient.increment(redisKey, 1);
        
        if (current === 1) {
          // Set expiration on first increment
          await this.redisClient.expire(redisKey, 60); // 1 minute window
        }
        
        return {
          totalHits: current,
          resetTime: new Date(Date.now() + 60000) // 1 minute from now
        };
      },

      decrement: async (key: string) => {
        const redisKey = this.generateKey(prefix, key);
        await this.redisClient.increment(redisKey, -1);
      },

      resetKey: async (key: string) => {
        const redisKey = this.generateKey(prefix, key);
        await this.redisClient.delete(redisKey);
      }
    };
  }

  /**
   * Per-IP rate limiting
   * Default: 1000 requests per 15 minutes
   */
  createIPRateLimit(options: Partial<RateLimitOptions> = {}) {
    const defaultOptions: RateLimitOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req: Request) => req.ip || 'unknown',
      handler: (req: Request, res: Response) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          correlationId: req.headers['x-correlation-id']
        });

        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.round(options.windowMs! / 1000) || 900
        });
      }
    };

    const mergedOptions = { ...defaultOptions, ...options };

    return rateLimit({
      ...mergedOptions,
      store: this.createRedisStore('ip'),
      standardHeaders: true, // Return rate limit info in headers
      legacyHeaders: false
    });
  }

  /**
   * Per-user rate limiting
   * Default: 100 requests per minute
   */
  createUserRateLimit(options: Partial<RateLimitOptions> = {}) {
    const defaultOptions: RateLimitOptions = {
      windowMs: 60 * 1000, // 1 minute
      max: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: true,
      keyGenerator: (req: Request) => {
        // Extract user ID from JWT token or session
        const userId = req.headers.authorization || req.headers['user-id'] || req.ip;
        return String(userId);
      },
      handler: (req: Request, res: Response) => {
        const userId = req.headers.authorization || req.headers['user-id'];
        
        logger.warn('User rate limit exceeded', {
          userId,
          ip: req.ip,
          path: req.path,
          method: req.method,
          correlationId: req.headers['x-correlation-id']
        });

        res.status(429).json({
          error: 'Too Many Requests',
          message: 'User rate limit exceeded. Please slow down.',
          retryAfter: Math.round(options.windowMs! / 1000) || 60
        });
      }
    };

    const mergedOptions = { ...defaultOptions, ...options };

    return rateLimit({
      ...mergedOptions,
      store: this.createRedisStore('user'),
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  /**
   * Per-endpoint rate limiting
   * Stricter limits for sensitive endpoints
   */
  createEndpointRateLimit(endpoint: string, options: Partial<RateLimitOptions> = {}) {
    const defaultOptions: RateLimitOptions = {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // Very strict for sensitive endpoints
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req: Request) => {
        const userId = req.headers.authorization || req.headers['user-id'] || req.ip;
        return `${endpoint}:${userId}`;
      },
      handler: (req: Request, res: Response) => {
        logger.warn('Endpoint rate limit exceeded', {
          endpoint,
          userId: req.headers.authorization || req.headers['user-id'],
          ip: req.ip,
          correlationId: req.headers['x-correlation-id']
        });

        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded for ${endpoint}. Please try again later.`,
          retryAfter: Math.round(options.windowMs! / 1000) || 60
        });
      }
    };

    const mergedOptions = { ...defaultOptions, ...options };

    return rateLimit({
      ...mergedOptions,
      store: this.createRedisStore(`endpoint_${endpoint}`),
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  /**
   * Progressive delay middleware
   * Slows down requests as they approach rate limits
   */
  createSlowDown(options: any = {}) {
    return slowDown({
      windowMs: 60 * 1000, // 1 minute
      delayAfter: 50, // Allow 50 requests at normal speed
      delayMs: 500, // Add 500ms delay per request after delayAfter
      maxDelayMs: 5000, // Maximum delay of 5 seconds
      skipFailedRequests: true,
      skipSuccessfulRequests: false,
      keyGenerator: (req: Request) => req.ip || 'unknown',
      onLimitReached: (req: Request) => {
        logger.warn('Slow down limit reached', {
          ip: req.ip,
          path: req.path,
          correlationId: req.headers['x-correlation-id']
        });
      },
      ...options
    });
  }

  /**
   * Adaptive rate limiting based on system load
   */
  createAdaptiveRateLimit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check system metrics (CPU, memory, etc.)
        const systemLoad = process.cpuUsage();
        const memoryUsage = process.memoryUsage();
        
        // Calculate dynamic rate limit based on system resources
        const cpuThreshold = 80; // 80% CPU usage threshold
        const memoryThreshold = 0.8; // 80% memory usage threshold
        
        const cpuPercent = (systemLoad.user + systemLoad.system) / 1000000; // Convert to percentage
        const memoryPercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
        
        if (cpuPercent > cpuThreshold || memoryPercent > memoryThreshold) {
          // Apply stricter rate limiting under high load
          const strictLimit = this.createIPRateLimit({
            windowMs: 60 * 1000,
            max: 50, // Reduced limit under high load
            handler: (req: Request, res: Response) => {
              logger.warn('Adaptive rate limit - system under high load', {
                cpuPercent,
                memoryPercent,
                ip: req.ip,
                correlationId: req.headers['x-correlation-id']
              });

              res.status(503).json({
                error: 'Service Temporarily Unavailable',
                message: 'System under high load. Please try again later.',
                retryAfter: 60
              });
            }
          });
          
          return strictLimit(req, res, next);
        }
        
        next();
      } catch (error) {
        logger.error('Error in adaptive rate limiting', { error: error as Error });
        next();
      }
    };
  }
}

// Export singleton instance
export default new RateLimitManager();

// Export specific rate limiters for common use cases
export const rateLimiters = {
  // General API rate limiting
  general: new RateLimitManager().createIPRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000
  }),

  // User-specific rate limiting
  user: new RateLimitManager().createUserRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100
  }),

  // Authentication endpoints (stricter)
  auth: new RateLimitManager().createEndpointRateLimit('auth', {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5
  }),

  // Payment endpoints (very strict)
  payment: new RateLimitManager().createEndpointRateLimit('payment', {
    windowMs: 60 * 1000, // 1 minute
    max: 10
  }),

  // Webhook endpoints
  webhook: new RateLimitManager().createEndpointRateLimit('webhook', {
    windowMs: 60 * 1000, // 1 minute
    max: 100
  }),

  // Progressive slowdown
  slowDown: new RateLimitManager().createSlowDown(),

  // Adaptive rate limiting
  adaptive: new RateLimitManager().createAdaptiveRateLimit()
};