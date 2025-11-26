/**
 * Application Configuration
 * 
 * Centralized configuration management for the billing system.
 * All environment variables are loaded and validated here.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Application configuration interface
 */
interface AppConfig {
  // Application
  port: number;
  nodeEnv: string;
  apiVersion: string;
  frontendUrl: string;
  
  // Database
  databaseUrl: string;
  dbMaxConnections: number;
  dbConnectionTimeout: number;
  dbQueryTimeout: number;
  
  // Redis
  redisUrl: string;
  redisPassword?: string;
  redisTls: boolean;
  redisDb: number;
  redisMaxRetries: number;
  redisRetryDelay: number;
  redisConnectTimeout: number;
  redisCommandTimeout: number;
  redisTtl: number;
  
  // Authentication
  clerkPublishableKey: string;
  clerkSecretKey: string;
  clerkWebhookSecret: string;
  jwtSecret: string;
  
  // Stripe
  stripeSecret: string;
  stripePublishableKey: string;
  stripeWebhookSecret: string;
  stripeApiVersion: string;
  
  // Security
  corsOrigin: string;
  encryptionKey: string;
  
  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMax: number;
  rateLimitMaxPerOrg: number;
  
  // Logging
  logLevel: string;
  logFormat: string;
  logConsole: boolean;
  logFile: boolean;
  logDir: string;
  logMaxSize: string;
  logMaxFiles: string;
  
  // Business Logic
  paymentGracePeriodDays: number;
  trialReminderDays: number;
  dataRetentionDays: number;
  
  // Email
  emailProvider: string;
  emailFrom: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  
  // Monitoring
  sentryDsn?: string;
  prometheusPort: number;
  
  // Webhooks
  webhookTimeout: number;
  webhookRetryAttempts: number;
  
  // Feature Flags
  enableAnalytics: boolean;
  enableAuditLog: boolean;
  enableRateLimiting: boolean;
}

/**
 * Get configuration with validation
 */
const getConfig = (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isDevelopment = nodeEnv === 'development';
  
  return {
    // Application
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv,
    apiVersion: process.env.API_VERSION || 'v1',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    
    // Database
    databaseUrl: process.env.DATABASE_URL || '',
    dbMaxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    dbConnectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    dbQueryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
    
    // Redis
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    redisPassword: process.env.REDIS_PASSWORD,
    redisTls: process.env.REDIS_TLS === 'true',
    redisDb: parseInt(process.env.REDIS_DB || '0'),
    redisMaxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    redisRetryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
    redisConnectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
    redisCommandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000'),
    redisTtl: parseInt(process.env.REDIS_TTL || '300'),
    
    // Authentication
    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
    clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
    clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET || '',
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key-here',
    
    // Stripe
    stripeSecret: process.env.STRIPE_SECRET_KEY || '',
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    stripeApiVersion: process.env.STRIPE_API_VERSION || '2023-10-16',
    
    // Security
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key',
    
    // Rate Limiting
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    rateLimitMaxPerOrg: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_PER_ORG || '1000'),
    
    // Logging
    logLevel: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    logFormat: process.env.LOG_FORMAT || (isDevelopment ? 'simple' : 'json'),
    logConsole: process.env.LOG_CONSOLE !== 'false',
    logFile: process.env.LOG_FILE !== 'false',
    logDir: process.env.LOG_DIR || 'logs',
    logMaxSize: process.env.LOG_MAX_SIZE || '20m',
    logMaxFiles: process.env.LOG_MAX_FILES || '14d',
    
    // Business Logic
    paymentGracePeriodDays: parseInt(process.env.PAYMENT_GRACE_PERIOD_DAYS || '7'),
    trialReminderDays: parseInt(process.env.TRIAL_REMINDER_DAYS || '3'),
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '30'),
    
    // Email
    emailProvider: process.env.EMAIL_PROVIDER || 'smtp',
    emailFrom: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
    smtpHost: process.env.SMTP_HOST || 'localhost',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    
    // Monitoring
    sentryDsn: process.env.SENTRY_DSN,
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090'),
    
    // Webhooks
    webhookTimeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000'),
    webhookRetryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3'),
    
    // Feature Flags
    enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
    enableAuditLog: process.env.ENABLE_AUDIT_LOG !== 'false',
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
  };
};

/**
 * Validate required configuration
 */
const validateConfig = (config: AppConfig): void => {
  const requiredFields: (keyof AppConfig)[] = [
    'databaseUrl',
    'stripeSecret',
    'stripeWebhookSecret',
  ];
  
  const missing = requiredFields.filter(field => !config[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Create and validate configuration
const config = getConfig();
validateConfig(config);

// Export configuration
export default config;

// Export configuration interface for type checking
export type { AppConfig };
