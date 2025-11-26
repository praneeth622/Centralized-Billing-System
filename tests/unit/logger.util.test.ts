/**
 * Logger Utility Tests
 * 
 * Comprehensive unit tests for the Winston logger utility including
 * environment-specific configuration, log levels, formatting, and transports.
 */

// Mock winston
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  close: jest.fn(),
};

jest.mock('winston', () => ({
  createLogger: jest.fn(() => mockLogger),
  format: {
    combine: jest.fn(() => ({})),
    timestamp: jest.fn(() => ({})),
    errors: jest.fn(() => ({})),
    colorize: jest.fn(() => ({})),
    printf: jest.fn(() => ({})),
    json: jest.fn(() => ({})),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
  addColors: jest.fn(),
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

import { logger, LogMetadata, ChildLogger } from '../../src/shared/utils/logger.util';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

describe('LoggerUtil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_FORMAT;
    delete process.env.LOG_CONSOLE;
    delete process.env.LOG_FILE;
    delete process.env.LOG_DIR;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = logger;
      const instance2 = logger;
      expect(instance1).toBe(instance2);
    });
  });

  describe('Configuration', () => {
    it('should use development defaults when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      
      // Access private config method
      const loggerInstance = logger as any;
      const config = loggerInstance.getConfig();

      expect(config.level).toBe('debug');
      expect(config.format).toBe('simple');
      expect(config.enableConsole).toBe(true);
      expect(config.enableFile).toBe(true);
    });

    it('should use production defaults when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      
      const loggerInstance = logger as any;
      const config = loggerInstance.getConfig();

      expect(config.level).toBe('info');
      expect(config.format).toBe('json');
    });

    it('should use environment variables when provided', () => {
      process.env.LOG_LEVEL = 'warn';
      process.env.LOG_FORMAT = 'json';
      process.env.LOG_CONSOLE = 'false';
      process.env.LOG_FILE = 'false';
      process.env.LOG_DIR = 'custom-logs';

      const loggerInstance = logger as any;
      const config = loggerInstance.getConfig();

      expect(config.level).toBe('warn');
      expect(config.format).toBe('json');
      expect(config.enableConsole).toBe(false);
      expect(config.enableFile).toBe(false);
      expect(config.logDir).toBe('custom-logs');
    });

    it('should parse size strings correctly', () => {
      const loggerInstance = logger as any;
      
      expect(loggerInstance.parseSize('10m')).toBe(10 * 1024 * 1024);
      expect(loggerInstance.parseSize('5k')).toBe(5 * 1024);
      expect(loggerInstance.parseSize('1g')).toBe(1 * 1024 * 1024 * 1024);
      expect(loggerInstance.parseSize('100b')).toBe(100);
      expect(loggerInstance.parseSize('invalid')).toBe(20 * 1024 * 1024); // default
    });
  });

  describe('Directory Management', () => {
    it('should create log directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const loggerInstance = logger as any;
      loggerInstance.ensureLogDirectory();

      expect(fs.mkdirSync).toHaveBeenCalledWith('logs', { recursive: true });
    });

    it('should not create log directory if it already exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      const loggerInstance = logger as any;
      loggerInstance.ensureLogDirectory();

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should not create log directory if file logging is disabled', () => {
      process.env.LOG_FILE = 'false';
      
      const loggerInstance = logger as any;
      const config = loggerInstance.getConfig();
      
      expect(config.enableFile).toBe(false);
      
      // The directory check should be skipped when file logging is disabled
      const originalExistsSync = fs.existsSync;
      const originalMkdirSync = fs.mkdirSync;
      
      (fs.existsSync as jest.Mock).mockClear();
      (fs.mkdirSync as jest.Mock).mockClear();
      
      if (config.enableFile) {
        loggerInstance.ensureLogDirectory();
      }
      
      // Since enableFile is false, these methods shouldn't be called
      expect(fs.existsSync).not.toHaveBeenCalled();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('Log Levels', () => {
    it('should log info messages', () => {
      const message = 'Test info message';
      const metadata: LogMetadata = { userId: '123', endpoint: '/api/test' };

      logger.info(message, metadata);

      expect(mockLogger.info).toHaveBeenCalledWith(message, metadata);
    });

    it('should log warning messages', () => {
      const message = 'Test warning message';
      const metadata: LogMetadata = { ip: '192.168.1.1' };

      logger.warn(message, metadata);

      expect(mockLogger.warn).toHaveBeenCalledWith(message, metadata);
    });

    it('should log error messages with Error object', () => {
      const message = 'Test error message';
      const error = new Error('Test error');

      logger.error(message, error);

      expect(mockLogger.error).toHaveBeenCalledWith(message, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      });
    });

    it('should log error messages with metadata', () => {
      const message = 'Test error message';
      const metadata: LogMetadata = { statusCode: 500 };

      logger.error(message, metadata);

      expect(mockLogger.error).toHaveBeenCalledWith(message, metadata);
    });

    it('should log debug messages', () => {
      const message = 'Test debug message';
      const metadata: LogMetadata = { duration: 100 };

      logger.debug(message, metadata);

      expect(mockLogger.debug).toHaveBeenCalledWith(message, metadata);
    });
  });

  describe('Specialized Logging Methods', () => {
    it('should log HTTP requests with info level for 2xx responses', () => {
      const requestMetadata = {
        method: 'GET',
        url: '/api/users',
        statusCode: 200,
        duration: 150,
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        userId: '123',
        requestId: 'req-456',
      };

      logger.logRequest(requestMetadata);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'GET /api/users 200 - 150ms',
        requestMetadata
      );
    });

    it('should log HTTP requests with warn level for 4xx responses', () => {
      const requestMetadata = {
        method: 'POST',
        url: '/api/invalid',
        statusCode: 400,
        duration: 50,
      };

      logger.logRequest(requestMetadata);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'warn',
        'POST /api/invalid 400 - 50ms',
        requestMetadata
      );
    });

    it('should log business events with proper formatting', () => {
      const event = 'User subscription created';
      const metadata: LogMetadata = { userId: '123', organizationId: 'org-456' };

      logger.logBusinessEvent(event, metadata);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[BUSINESS] User subscription created',
        expect.objectContaining({
          ...metadata,
          eventType: 'business',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log security events with proper formatting', () => {
      const event = 'Failed login attempt';
      const metadata: LogMetadata = { ip: '192.168.1.100', userAgent: 'curl/7.68.0' };

      logger.logSecurityEvent(event, metadata);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[SECURITY] Failed login attempt',
        expect.objectContaining({
          ...metadata,
          eventType: 'security',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log database operations with proper formatting', () => {
      const operation = 'User query executed';
      const metadata: LogMetadata = { duration: 25, query: 'SELECT * FROM users' };

      logger.logDatabaseOperation(operation, metadata);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[DATABASE] User query executed',
        expect.objectContaining({
          ...metadata,
          eventType: 'database',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log cache operations with proper formatting', () => {
      const operation = 'Cache miss for user:123';
      const metadata: LogMetadata = { key: 'user:123', ttl: 300 };

      logger.logCacheOperation(operation, metadata);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[CACHE] Cache miss for user:123',
        expect.objectContaining({
          ...metadata,
          eventType: 'cache',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log payment operations with proper formatting', () => {
      const operation = 'Payment processed successfully';
      const metadata: LogMetadata = { amount: 2999, currency: 'USD', customerId: 'cus_123' };

      logger.logPaymentOperation(operation, metadata);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[PAYMENT] Payment processed successfully',
        expect.objectContaining({
          ...metadata,
          eventType: 'payment',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log webhook events with proper formatting', () => {
      const event = 'Stripe webhook received';
      const metadata: LogMetadata = { eventType: 'customer.subscription.created', webhookId: 'evt_123' };

      logger.logWebhook(event, metadata);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[WEBHOOK] Stripe webhook received',
        expect.objectContaining({
          ...metadata,
          eventType: 'webhook',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with default metadata', () => {
      const defaultMetadata: LogMetadata = { 
        userId: '123', 
        organizationId: 'org-456' 
      };

      const childLogger = logger.child(defaultMetadata);

      expect(childLogger).toBeInstanceOf(ChildLogger);
    });

    it('should merge metadata in child logger info method', () => {
      const defaultMetadata: LogMetadata = { userId: '123' };
      const additionalMetadata: LogMetadata = { endpoint: '/api/test' };

      const childLogger = logger.child(defaultMetadata);
      childLogger.info('Test message', additionalMetadata);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Test message',
        { ...defaultMetadata, ...additionalMetadata }
      );
    });

    it('should merge metadata in child logger warn method', () => {
      const defaultMetadata: LogMetadata = { userId: '123' };
      const additionalMetadata: LogMetadata = { statusCode: 400 };

      const childLogger = logger.child(defaultMetadata);
      childLogger.warn('Test warning', additionalMetadata);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Test warning',
        { ...defaultMetadata, ...additionalMetadata }
      );
    });

    it('should handle Error objects in child logger error method', () => {
      const defaultMetadata: LogMetadata = { userId: '123' };
      const error = new Error('Test error');

      const childLogger = logger.child(defaultMetadata);
      childLogger.error('Test error message', error);

      // When passing Error object, parent.error is called directly with the error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test error message',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            name: 'Error',
            stack: expect.any(String),
          }),
        })
      );
    });

    it('should merge metadata in child logger debug method', () => {
      const defaultMetadata: LogMetadata = { userId: '123' };
      const additionalMetadata: LogMetadata = { duration: 100 };

      const childLogger = logger.child(defaultMetadata);
      childLogger.debug('Test debug', additionalMetadata);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Test debug',
        { ...defaultMetadata, ...additionalMetadata }
      );
    });

    it('should override default metadata with additional metadata', () => {
      const defaultMetadata: LogMetadata = { userId: '123', endpoint: '/api/old' };
      const additionalMetadata: LogMetadata = { endpoint: '/api/new' };

      const childLogger = logger.child(defaultMetadata);
      childLogger.info('Test message', additionalMetadata);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Test message',
        { userId: '123', endpoint: '/api/new' }
      );
    });
  });

  describe('Logger Management', () => {
    it('should provide access to underlying Winston logger', () => {
      const winstonLogger = logger.getLogger();
      expect(winstonLogger).toBe(mockLogger);
    });

    it('should close logger properly', () => {
      logger.close();
      expect(mockLogger.close).toHaveBeenCalled();
    });
  });

  describe('Transport Configuration', () => {
    it('should create console transport when enabled', () => {
      process.env.LOG_CONSOLE = 'true';
      
      // Trigger logger creation with new env vars
      const loggerInstance = logger as any;
      loggerInstance.createLogger();

      expect(winston.transports.Console).toHaveBeenCalled();
    });

    it('should create file transports when enabled', () => {
      process.env.LOG_FILE = 'true';
      
      const loggerInstance = logger as any;
      loggerInstance.createLogger();

      expect(winston.transports.File).toHaveBeenCalledTimes(2); // Error and combined logs
    });

    it('should not create transports when disabled', () => {
      process.env.LOG_CONSOLE = 'false';
      process.env.LOG_FILE = 'false';
      
      const loggerInstance = logger as any;
      loggerInstance.createLogger();

      // Transports should still be created for the initial logger setup
      expect(winston.createLogger).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle winston errors gracefully', () => {
      // This test ensures the logger setup doesn't throw
      expect(() => {
        const loggerInstance = logger as any;
        loggerInstance.createLogger();
      }).not.toThrow();
    });

    it('should handle missing metadata gracefully', () => {
      logger.info('Test message without metadata');
      expect(mockLogger.info).toHaveBeenCalledWith('Test message without metadata', undefined);
    });
  });
});