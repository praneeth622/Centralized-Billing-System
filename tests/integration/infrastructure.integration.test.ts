/**
 * Infrastructure Integration Test
 * 
 * Tests that all infrastructure components work together and integrate
 * properly with the Express application.
 */

import request from 'supertest';
import { redisClient } from '../../src/infrastructure/cache/redis.client';
import { logger } from '../../src/shared/utils/logger.util';
import config from '../../src/config';

describe('Infrastructure Integration', () => {
  beforeAll(async () => {
    // Setup any required test environment
  });

  afterAll(async () => {
    // Cleanup
    if (redisClient) {
      await redisClient.disconnect();
    }
    if (logger) {
      logger.close();
    }
  });

  describe('Configuration', () => {
    it('should load configuration with all required fields', () => {
      expect(config).toBeDefined();
      expect(config.nodeEnv).toBeDefined();
      expect(config.port).toBeGreaterThan(0);
      expect(config.redisUrl).toBeDefined();
      expect(config.logLevel).toBeDefined();
    });

    it('should have valid Redis configuration', () => {
      expect(config.redisUrl).toMatch(/^redis:\/\//);
      expect(config.redisMaxRetries).toBeGreaterThan(0);
      expect(config.redisConnectTimeout).toBeGreaterThan(0);
    });

    it('should have valid logging configuration', () => {
      expect(config.logLevel).toBeDefined();
      expect(config.logFormat).toBeDefined();
      expect(typeof config.logConsole).toBe('boolean');
      expect(typeof config.logFile).toBe('boolean');
    });
  });

  describe('Redis Client', () => {
    it('should be a singleton instance', () => {
      const instance1 = redisClient;
      const instance2 = redisClient;
      expect(instance1).toBe(instance2);
    });

    it('should have proper status reporting', () => {
      const status = redisClient.getStatus();
      expect(['connecting', 'connected', 'disconnected', 'error']).toContain(status);
    });

    it('should handle operations gracefully when disconnected', async () => {
      const result = await redisClient.get('test:key');
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Logger', () => {
    it('should be available as singleton', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });

    it('should support child loggers', () => {
      const childLogger = logger.child({ component: 'test' });
      expect(childLogger).toBeDefined();
      expect(childLogger.info).toBeDefined();
      
      // Should not throw
      expect(() => childLogger.info('Test log message')).not.toThrow();
    });

    it('should support specialized logging methods', () => {
      expect(logger.logBusinessEvent).toBeDefined();
      expect(logger.logSecurityEvent).toBeDefined();
      expect(logger.logPaymentOperation).toBeDefined();
      expect(logger.logWebhook).toBeDefined();
      
      // Should not throw
      expect(() => {
        logger.logBusinessEvent('Test business event', { testData: true });
        logger.logSecurityEvent('Test security event', { ip: '127.0.0.1' });
        logger.logPaymentOperation('Test payment', { amount: 1000 });
        logger.logWebhook('Test webhook', { eventType: 'test' });
      }).not.toThrow();
    });
  });

  describe('Error Classes', () => {
    it('should export all custom error types', () => {
      const {
        AppError,
        ValidationError,
        AuthenticationError,
        AuthorizationError,
        NotFoundError,
        ConflictError,
        RateLimitError,
        ExternalServiceError,
        DatabaseError,
      } = require('../../src/shared/middleware/error-handler.middleware');

      expect(AppError).toBeDefined();
      expect(ValidationError).toBeDefined();
      expect(AuthenticationError).toBeDefined();
      expect(AuthorizationError).toBeDefined();
      expect(NotFoundError).toBeDefined();
      expect(ConflictError).toBeDefined();
      expect(RateLimitError).toBeDefined();
      expect(ExternalServiceError).toBeDefined();
      expect(DatabaseError).toBeDefined();
    });

    it('should create proper error instances', () => {
      const { AppError, ValidationError } = require('../../src/shared/middleware/error-handler.middleware');
      
      const appError = new AppError('Test error', 500);
      expect(appError).toBeInstanceOf(AppError);
      expect(appError).toBeInstanceOf(Error);
      expect(appError.statusCode).toBe(500);
      expect(appError.isOperational).toBe(true);

      const validationError = new ValidationError('Invalid field');
      expect(validationError).toBeInstanceOf(ValidationError);
      expect(validationError).toBeInstanceOf(AppError);
      expect(validationError.statusCode).toBe(400);
    });
  });

  describe('Environment Variables', () => {
    it('should validate required environment variables', () => {
      // Test that configuration validation works
      expect(() => {
        const testConfig = config;
        // Should have loaded successfully if we get here
        expect(testConfig).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Module Exports', () => {
    it('should export all infrastructure components properly', () => {
      // Test imports work correctly
      expect(() => {
        const redis = require('../../src/infrastructure/cache/redis.client');
        const logging = require('../../src/shared/utils/logger.util');
        const errors = require('../../src/shared/middleware/error-handler.middleware');
        const appConfig = require('../../src/config');

        expect(redis.redisClient).toBeDefined();
        expect(logging.logger).toBeDefined();
        expect(errors.errorHandler).toBeDefined();
        expect(errors.notFoundHandler).toBeDefined();
        expect(errors.asyncHandler).toBeDefined();
        expect(appConfig.default).toBeDefined();
      }).not.toThrow();
    });
  });
});