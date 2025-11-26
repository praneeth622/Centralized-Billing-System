/**
 * Logger Utility (Winston)
 * 
 * Provides structured, consistent logging for the centralized billing system.
 * Supports different environments with appropriate transports and formatting.
 * 
 * Features:
 * - Environment-specific configuration (dev/prod)
 * - Multiple transports (console, file)
 * - Structured logging with metadata
 * - Log levels: error, warn, info, debug
 * - Request ID correlation
 * - Production-ready JSON formatting
 * - Development-friendly console output
 */

import winston, { Logger, LoggerOptions } from 'winston';
import { Format } from 'logform';
import path from 'path';
import fs from 'fs';

/**
 * Custom log levels
 */
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Log colors for console output
 */
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

/**
 * Logger configuration interface
 */
interface LoggerConfig {
  level: string;
  format: string;
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
  maxSize: string;
  maxFiles: string;
  datePattern: string;
}

/**
 * Log metadata interface
 */
interface LogMetadata {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  error?: Error | string;
  [key: string]: any;
}

/**
 * Logger utility class
 */
class LoggerUtil {
  private static instance: LoggerUtil;
  private logger: Logger;
  private config: LoggerConfig;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.config = this.getConfig();
    this.ensureLogDirectory();
    this.logger = this.createLogger();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LoggerUtil {
    if (!LoggerUtil.instance) {
      LoggerUtil.instance = new LoggerUtil();
    }
    return LoggerUtil.instance;
  }

  /**
   * Get logger configuration from environment
   */
  private getConfig(): LoggerConfig {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isDevelopment = nodeEnv === 'development';

    return {
      level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      format: process.env.LOG_FORMAT || (isDevelopment ? 'simple' : 'json'),
      enableConsole: process.env.LOG_CONSOLE !== 'false',
      enableFile: process.env.LOG_FILE !== 'false',
      logDir: process.env.LOG_DIR || 'logs',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
    };
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    if (this.config.enableFile && !fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  /**
   * Create custom format for development
   */
  private getDevelopmentFormat(): Format {
    return winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let logMessage = `${timestamp} [${level}]: ${message}`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
          logMessage += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
        return logMessage;
      })
    );
  }

  /**
   * Create custom format for production
   */
  private getProductionFormat(): Format {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );
  }

  /**
   * Create Winston logger instance
   */
  private createLogger(): Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          level: this.config.level,
          format: this.config.format === 'json' 
            ? this.getProductionFormat()
            : this.getDevelopmentFormat(),
        })
      );
    }

    // File transports
    if (this.config.enableFile) {
      // Error logs
      transports.push(
        new winston.transports.File({
          level: 'error',
          filename: path.join(this.config.logDir, 'error.log'),
          format: this.getProductionFormat(),
          maxsize: this.parseSize(this.config.maxSize),
          maxFiles: 5,
          tailable: true,
        })
      );

      // Combined logs
      transports.push(
        new winston.transports.File({
          level: this.config.level,
          filename: path.join(this.config.logDir, 'combined.log'),
          format: this.getProductionFormat(),
          maxsize: this.parseSize(this.config.maxSize),
          maxFiles: 10,
          tailable: true,
        })
      );
    }

    const loggerOptions: LoggerOptions = {
      level: this.config.level,
      levels: logLevels,
      transports,
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true,
    };

    const logger = winston.createLogger(loggerOptions);

    // Add colors
    winston.addColors(logColors);

    return logger;
  }

  /**
   * Parse size string to bytes
   */
  private parseSize(size: string): number {
    const units: { [key: string]: number } = {
      b: 1,
      k: 1024,
      m: 1024 * 1024,
      g: 1024 * 1024 * 1024,
    };

    const match = size.toLowerCase().match(/^(\d+)([bkmg]?)$/);
    if (!match) return 20 * 1024 * 1024; // Default 20MB

    const [, num, unit] = match;
    return parseInt(num) * (units[unit || 'b'] || 1);
  }

  /**
   * Log info message
   */
  public info(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, metadata);
  }

  /**
   * Log warning message
   */
  public warn(message: string, metadata?: LogMetadata): void {
    this.logger.warn(message, metadata);
  }

  /**
   * Log error message
   */
  public error(message: string, metadata?: LogMetadata | Error): void {
    if (metadata instanceof Error) {
      this.logger.error(message, { 
        error: {
          message: metadata.message,
          stack: metadata.stack,
          name: metadata.name,
        }
      });
    } else {
      this.logger.error(message, metadata);
    }
  }

  /**
   * Log debug message
   */
  public debug(message: string, metadata?: LogMetadata): void {
    this.logger.debug(message, metadata);
  }

  /**
   * Log HTTP request
   */
  public logRequest(metadata: {
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    ip?: string;
    userAgent?: string;
    userId?: string;
    requestId?: string;
  }): void {
    const { method, url, statusCode, duration } = metadata;
    const level = statusCode >= 400 ? 'warn' : 'info';
    
    this.logger.log(level, `${method} ${url} ${statusCode} - ${duration}ms`, metadata);
  }

  /**
   * Log business event
   */
  public logBusinessEvent(event: string, metadata?: LogMetadata): void {
    this.info(`[BUSINESS] ${event}`, {
      ...metadata,
      eventType: 'business',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log security event
   */
  public logSecurityEvent(event: string, metadata?: LogMetadata): void {
    this.warn(`[SECURITY] ${event}`, {
      ...metadata,
      eventType: 'security',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log database operation
   */
  public logDatabaseOperation(operation: string, metadata?: LogMetadata): void {
    this.debug(`[DATABASE] ${operation}`, {
      ...metadata,
      eventType: 'database',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log cache operation
   */
  public logCacheOperation(operation: string, metadata?: LogMetadata): void {
    this.debug(`[CACHE] ${operation}`, {
      ...metadata,
      eventType: 'cache',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log payment operation
   */
  public logPaymentOperation(operation: string, metadata?: LogMetadata): void {
    this.info(`[PAYMENT] ${operation}`, {
      ...metadata,
      eventType: 'payment',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log webhook event
   */
  public logWebhook(event: string, metadata?: LogMetadata): void {
    this.info(`[WEBHOOK] ${event}`, {
      ...metadata,
      eventType: 'webhook',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Create child logger with default metadata
   */
  public child(defaultMetadata: LogMetadata): ChildLogger {
    return new ChildLogger(this, defaultMetadata);
  }

  /**
   * Get the underlying Winston logger
   */
  public getLogger(): Logger {
    return this.logger;
  }

  /**
   * Close all transports
   */
  public close(): void {
    this.logger.close();
  }
}

/**
 * Child logger with default metadata
 */
class ChildLogger {
  constructor(
    private parent: LoggerUtil,
    private defaultMetadata: LogMetadata
  ) {}

  private mergeMetadata(metadata?: LogMetadata): LogMetadata {
    return { ...this.defaultMetadata, ...metadata };
  }

  public info(message: string, metadata?: LogMetadata): void {
    this.parent.info(message, this.mergeMetadata(metadata));
  }

  public warn(message: string, metadata?: LogMetadata): void {
    this.parent.warn(message, this.mergeMetadata(metadata));
  }

  public error(message: string, metadata?: LogMetadata | Error): void {
    if (metadata instanceof Error) {
      this.parent.error(message, metadata);
    } else {
      this.parent.error(message, this.mergeMetadata(metadata));
    }
  }

  public debug(message: string, metadata?: LogMetadata): void {
    this.parent.debug(message, this.mergeMetadata(metadata));
  }
}

// Export singleton instance
export const logger = LoggerUtil.getInstance();

// Export types for use in other modules
export type { LogMetadata, LoggerConfig };

// Export child logger class
export { ChildLogger };