import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import compression from 'compression';
import 'express-async-errors';

// Routes and middleware
import routes from './routes';
import stripeWebhookRouter from './webhooks/stripeWebhook';

// Enhanced middleware
import { errorHandler, notFoundHandler } from './shared/middleware/error-handler.middleware';
import distributedTracing, { tracingMiddlewares } from './shared/middleware/distributed-tracing.middleware';
import rateLimitManager, { rateLimiters } from './shared/middleware/rate-limiting.middleware';
import { 
  healthCheck, 
  readinessCheck, 
  livenessCheck, 
  systemMetrics 
} from './shared/middleware/health-check.middleware';

import config from './config';
import logger from './shared/utils/logger.util';
import { setupSwagger } from './infrastructure/swagger/setup';

const app = express();

// Trust proxy for accurate IP addresses
if (config.security.trustedProxies.length > 0) {
  app.set('trust proxy', config.security.trustedProxies);
} else {
  app.set('trust proxy', true); // Default trust proxy for load balancers
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Correlation-ID',
    'X-Request-ID',
    'X-Trace-ID',
    'X-User-ID',
    'X-Session-ID'
  ]
}));

// Compression middleware
if (config.performance.compressionEnabled) {
  app.use(compression());
}

// Request size limiting
app.use(bodyParser.json({ 
  limit: config.performance.maxRequestSize,
  verify: (req, res, buf) => {
    // Store raw body for webhook signature verification
    (req as any).rawBody = buf;
  }
}));

app.use(bodyParser.urlencoded({ 
  extended: true, 
  limit: config.performance.maxRequestSize 
}));

// Distributed tracing and correlation ID middleware
app.use(tracingMiddlewares.correlationId);
app.use(tracingMiddlewares.requestContext);
app.use(tracingMiddlewares.performanceMonitoring);

// Request logging with correlation ID support
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim(), { source: 'http' });
    }
  }
}));

// Rate limiting middleware (applied selectively)
if (config.rateLimiting.enabled) {
  // General rate limiting for all requests
  app.use(rateLimiters.general);
  
  // Adaptive rate limiting for system protection
  app.use(rateLimiters.adaptive);
  
  // Progressive slowdown
  app.use(rateLimiters.slowDown);
}

// Health check endpoints (before authentication)
if (config.healthChecks.enabled) {
  app.get(config.healthChecks.endpoints.health, healthCheck);
  app.get(config.healthChecks.endpoints.ready, readinessCheck);
  app.get(config.healthChecks.endpoints.live, livenessCheck);
  app.get(config.healthChecks.endpoints.metrics, systemMetrics);
}

// Stripe webhook must receive raw body: mount BEFORE the general JSON parser
app.use('/api/webhooks/stripe', stripeWebhookRouter);

// API Documentation (development only)
if (config.nodeEnv !== 'production') {
  setupSwagger(app);
  logger.info('API documentation available at /api-docs');
}

// Apply user-specific rate limiting to API routes
if (config.rateLimiting.enabled) {
  app.use('/api', rateLimiters.user);
}

// API routes with enhanced middleware
app.use('/api', routes);

// Error tracking middleware
app.use(tracingMiddlewares.errorTracking);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);
  
  // Close server
  const server = app.listen();
  server?.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Add cleanup for other resources here
  // - Database connections
  // - Redis connections
  // - Background jobs
  
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  // Don't exit immediately, let the error handler deal with it
});

// Log application startup
logger.info('Enterprise billing service initialized', {
  version: config.serviceVersion,
  environment: config.nodeEnv,
  features: config.features,
  port: config.port
});

export default app;
