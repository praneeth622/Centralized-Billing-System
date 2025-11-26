/**
 * Enhanced Application Configuration
 * 
 * Centralized configuration management for the enterprise billing system.
 * All environment variables are loaded and validated here.
 * Supports enterprise features: rate limiting, health checks, monitoring, etc.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Enhanced application configuration interface
 */
interface AppConfig {
  // Application
  port: number;
  nodeEnv: string;
  apiVersion: string;
  frontendUrl: string;
  serviceName: string;
  serviceVersion: string;
  
  // Database
  database: {
    url: string;
    maxConnections: number;
    connectionTimeout: number;
    queryTimeout: number;
    ssl: boolean;
    // Read replica configuration
    readReplica?: {
      url: string;
      maxConnections: number;
    };
    // Backup configuration
    backup: {
      enabled: boolean;
      schedule: string;
      retention: number; // days
    };
  };
  
  // Redis
  redis: {
    url: string;
    password?: string;
    tls: boolean;
    db: number;
    maxRetries: number;
    retryDelay: number;
    connectTimeout: number;
    commandTimeout: number;
    ttl: number;
    // Sentinel configuration for HA
    sentinel?: {
      masterName: string;
      sentinels: Array<{ host: string; port: number }>;
    };
  };
  
  // Authentication
  auth: {
    clerkPublishableKey: string;
    clerkSecretKey: string;
    clerkWebhookSecret: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptRounds: number;
  };
  
  // Stripe
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    apiVersion: string;
    timeout: number;
    maxRetries: number;
  };
  
  // Security
  security: {
    corsOrigin: string | string[];
    encryptionKey: string;
    allowedOrigins: string[];
    trustedProxies: string[];
    sessionSecret: string;
    csrfSecret: string;
  };
  
  // Rate Limiting
  rateLimiting: {
    enabled: boolean;
    general: {
      windowMs: number;
      max: number;
    };
    user: {
      windowMs: number;
      max: number;
    };
    ip: {
      windowMs: number;
      max: number;
    };
    auth: {
      windowMs: number;
      max: number;
    };
    payment: {
      windowMs: number;
      max: number;
    };
    webhook: {
      windowMs: number;
      max: number;
    };
  };
  
  // Logging & Monitoring
  logging: {
    level: string;
    format: string;
    console: boolean;
    file: boolean;
    dir: string;
    maxSize: string;
    maxFiles: string;
    enableStructured: boolean;
    enableTracing: boolean;
  };
  
  // Health Checks
  healthChecks: {
    enabled: boolean;
    timeout: number;
    interval: number;
    retries: number;
    endpoints: {
      health: string;
      ready: string;
      live: string;
      metrics: string;
    };
  };
  
  // Monitoring & Alerting
  monitoring: {
    enabled: boolean;
    sentry?: {
      dsn: string;
      environment: string;
      sampleRate: number;
    };
    datadog?: {
      apiKey: string;
      serviceName: string;
      env: string;
    };
    newRelic?: {
      licenseKey: string;
      appName: string;
    };
    prometheus: {
      enabled: boolean;
      port: number;
      path: string;
    };
  };
  
  // Business Logic
  business: {
    paymentGracePeriodDays: number;
    trialReminderDays: number;
    dataRetentionDays: number;
    invoiceReminderDays: number[];
    maxRetryAttempts: number;
  };
  
  // Email
  email: {
    provider: string;
    from: string;
    smtp?: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
    };
    sendgrid?: {
      apiKey: string;
    };
    ses?: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
  
  // Webhooks
  webhooks: {
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    maxPayloadSize: number;
    signatureValidation: boolean;
  };
  
  // Feature Flags
  features: {
    enableAnalytics: boolean;
    enableAuditLog: boolean;
    enableRateLimiting: boolean;
    enableHealthChecks: boolean;
    enableMetrics: boolean;
    enableTracing: boolean;
    enableCaching: boolean;
    enableBackups: boolean;
  };
  
  // Performance
  performance: {
    maxRequestSize: string;
    requestTimeout: number;
    compressionEnabled: boolean;
    staticCacheMaxAge: number;
  };
}
/**
 * Get configuration with validation and defaults
 */
const getConfig = (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  
  return {
    // Application
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv,
    apiVersion: process.env.API_VERSION || 'v1',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    serviceName: process.env.SERVICE_NAME || 'billing-service',
    serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
    
    // Database
    database: {
      url: process.env.DATABASE_URL || '',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
      queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
      ssl: process.env.DB_SSL === 'true' || isProduction,
      readReplica: process.env.DATABASE_READ_REPLICA_URL ? {
        url: process.env.DATABASE_READ_REPLICA_URL,
        maxConnections: parseInt(process.env.DB_READ_REPLICA_MAX_CONNECTIONS || '10')
      } : undefined,
      backup: {
        enabled: process.env.DB_BACKUP_ENABLED === 'true',
        schedule: process.env.DB_BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
        retention: parseInt(process.env.DB_BACKUP_RETENTION_DAYS || '30')
      }
    },
    
    // Redis
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === 'true' || isProduction,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
      commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000'),
      ttl: parseInt(process.env.REDIS_TTL || '300'),
      sentinel: process.env.REDIS_SENTINEL_MASTER_NAME ? {
        masterName: process.env.REDIS_SENTINEL_MASTER_NAME,
        sentinels: JSON.parse(process.env.REDIS_SENTINELS || '[{"host":"localhost","port":26379}]')
      } : undefined
    },
    
    // Authentication
    auth: {
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
      clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
      clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET || '',
      jwtSecret: process.env.JWT_SECRET || generateSecretIfNeeded('jwt'),
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12')
    },
    
    // Stripe
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      apiVersion: process.env.STRIPE_API_VERSION || '2023-10-16',
      timeout: parseInt(process.env.STRIPE_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.STRIPE_MAX_RETRIES || '3')
    },
    
    // Security
    security: {
      corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
      encryptionKey: process.env.ENCRYPTION_KEY || generateSecretIfNeeded('encryption'),
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
      trustedProxies: process.env.TRUSTED_PROXIES?.split(',') || [],
      sessionSecret: process.env.SESSION_SECRET || generateSecretIfNeeded('session'),
      csrfSecret: process.env.CSRF_SECRET || generateSecretIfNeeded('csrf')
    },
    
    // Rate Limiting
    rateLimiting: {
      enabled: process.env.RATE_LIMITING_ENABLED !== 'false',
      general: {
        windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS || '900000'), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '1000')
      },
      user: {
        windowMs: parseInt(process.env.RATE_LIMIT_USER_WINDOW_MS || '60000'), // 1 minute
        max: parseInt(process.env.RATE_LIMIT_USER_MAX || '100')
      },
      ip: {
        windowMs: parseInt(process.env.RATE_LIMIT_IP_WINDOW_MS || '900000'), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_IP_MAX || '1000')
      },
      auth: {
        windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000'), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5')
      },
      payment: {
        windowMs: parseInt(process.env.RATE_LIMIT_PAYMENT_WINDOW_MS || '60000'), // 1 minute
        max: parseInt(process.env.RATE_LIMIT_PAYMENT_MAX || '10')
      },
      webhook: {
        windowMs: parseInt(process.env.RATE_LIMIT_WEBHOOK_WINDOW_MS || '60000'), // 1 minute
        max: parseInt(process.env.RATE_LIMIT_WEBHOOK_MAX || '100')
      }
    },
    
    // Logging
    logging: {
      level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      format: process.env.LOG_FORMAT || (isDevelopment ? 'simple' : 'json'),
      console: process.env.LOG_CONSOLE !== 'false',
      file: process.env.LOG_FILE !== 'false',
      dir: process.env.LOG_DIR || 'logs',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      enableStructured: process.env.LOG_ENABLE_STRUCTURED !== 'false',
      enableTracing: process.env.LOG_ENABLE_TRACING !== 'false'
    },
    
    // Health Checks
    healthChecks: {
      enabled: process.env.HEALTH_CHECKS_ENABLED !== 'false',
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '30000'),
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3'),
      endpoints: {
        health: process.env.HEALTH_ENDPOINT || '/health',
        ready: process.env.READINESS_ENDPOINT || '/ready',
        live: process.env.LIVENESS_ENDPOINT || '/live',
        metrics: process.env.METRICS_ENDPOINT || '/metrics'
      }
    },
    
    // Monitoring
    monitoring: {
      enabled: process.env.MONITORING_ENABLED !== 'false',
      sentry: process.env.SENTRY_DSN ? {
        dsn: process.env.SENTRY_DSN,
        environment: nodeEnv,
        sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0')
      } : undefined,
      datadog: process.env.DATADOG_API_KEY ? {
        apiKey: process.env.DATADOG_API_KEY,
        serviceName: process.env.DATADOG_SERVICE_NAME || 'billing-service',
        env: nodeEnv
      } : undefined,
      newRelic: process.env.NEW_RELIC_LICENSE_KEY ? {
        licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
        appName: process.env.NEW_RELIC_APP_NAME || 'billing-service'
      } : undefined,
      prometheus: {
        enabled: process.env.PROMETHEUS_ENABLED !== 'false',
        port: parseInt(process.env.PROMETHEUS_PORT || '9090'),
        path: process.env.PROMETHEUS_PATH || '/metrics'
      }
    },
    
    // Business Logic
    business: {
      paymentGracePeriodDays: parseInt(process.env.PAYMENT_GRACE_PERIOD_DAYS || '7'),
      trialReminderDays: parseInt(process.env.TRIAL_REMINDER_DAYS || '3'),
      dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '2555'), // 7 years
      invoiceReminderDays: JSON.parse(process.env.INVOICE_REMINDER_DAYS || '[7, 3, 1]'),
      maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3')
    },
    
    // Email
    email: {
      provider: process.env.EMAIL_PROVIDER || 'smtp',
      from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
      smtp: process.env.EMAIL_PROVIDER === 'smtp' ? {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      } : undefined,
      sendgrid: process.env.EMAIL_PROVIDER === 'sendgrid' ? {
        apiKey: process.env.SENDGRID_API_KEY || ''
      } : undefined,
      ses: process.env.EMAIL_PROVIDER === 'ses' ? {
        region: process.env.AWS_SES_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      } : undefined
    },
    
    // Webhooks
    webhooks: {
      timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY || '1000'),
      maxPayloadSize: parseInt(process.env.WEBHOOK_MAX_PAYLOAD_SIZE || '1048576'), // 1MB
      signatureValidation: process.env.WEBHOOK_SIGNATURE_VALIDATION !== 'false'
    },
    
    // Feature Flags
    features: {
      enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
      enableAuditLog: process.env.ENABLE_AUDIT_LOG !== 'false',
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
      enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false',
      enableMetrics: process.env.ENABLE_METRICS !== 'false',
      enableTracing: process.env.ENABLE_TRACING !== 'false',
      enableCaching: process.env.ENABLE_CACHING !== 'false',
      enableBackups: process.env.ENABLE_BACKUPS !== 'false'
    },
    
    // Performance
    performance: {
      maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
      compressionEnabled: process.env.COMPRESSION_ENABLED !== 'false',
      staticCacheMaxAge: parseInt(process.env.STATIC_CACHE_MAX_AGE || '86400000') // 1 day
    }
  };
};

/**
 * Generate secret if needed (dev only)
 */
function generateSecretIfNeeded(type: string): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${type} secret must be provided in production`);
  }
  
  // Generate a simple secret for development
  return `dev-${type}-secret-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Validate required configuration
 */
const validateConfig = (config: AppConfig): void => {
  const isProduction = config.nodeEnv === 'production';
  
  const requiredFields: Array<{path: string, required: boolean}> = [
    { path: 'database.url', required: true },
    { path: 'stripe.secretKey', required: true },
    { path: 'stripe.webhookSecret', required: true },
    { path: 'auth.jwtSecret', required: isProduction },
    { path: 'security.encryptionKey', required: isProduction },
    { path: 'auth.clerkSecretKey', required: isProduction }
  ];
  
  const missing = requiredFields.filter(field => {
    if (!field.required) return false;
    
    const value = getNestedValue(config, field.path);
    return !value || value === '';
  });
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.map(f => f.path).join(', ')}`);
  }
  
  // Validate Redis URL format
  if (config.redis.url && !config.redis.url.startsWith('redis://') && !config.redis.url.startsWith('rediss://')) {
    throw new Error('REDIS_URL must be a valid Redis connection string');
  }
  
  // Validate database URL format
  if (config.database.url && !config.database.url.startsWith('postgresql://') && !config.database.url.startsWith('postgres://')) {
    console.warn('DATABASE_URL should be a valid PostgreSQL connection string');
  }
  
  // Validate Stripe configuration
  if (config.stripe.secretKey && !config.stripe.secretKey.startsWith('sk_')) {
    throw new Error('STRIPE_SECRET_KEY must be a valid Stripe secret key');
  }
  
  // Validate rate limiting configuration
  if (config.rateLimiting.enabled) {
    const rateLimitConfigs = [
      config.rateLimiting.general,
      config.rateLimiting.user,
      config.rateLimiting.ip,
      config.rateLimiting.auth,
      config.rateLimiting.payment,
      config.rateLimiting.webhook
    ];
    
    for (const rlConfig of rateLimitConfigs) {
      if (rlConfig.max <= 0 || rlConfig.windowMs <= 0) {
        throw new Error('Rate limiting configuration must have positive max and windowMs values');
      }
    }
  }
};

/**
 * Get nested object value by dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Create and validate configuration
const config = getConfig();
validateConfig(config);

// Log configuration summary (without secrets)
if (process.env.NODE_ENV !== 'test') {
  console.log('Configuration loaded:', {
    nodeEnv: config.nodeEnv,
    serviceName: config.serviceName,
    serviceVersion: config.serviceVersion,
    port: config.port,
    features: config.features,
    rateLimiting: config.rateLimiting.enabled,
    healthChecks: config.healthChecks.enabled,
    monitoring: config.monitoring.enabled
  });
}

// Export configuration
export default config;

// Export configuration interface for type checking
export type { AppConfig };
