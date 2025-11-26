import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import RedisClient from '../../infrastructure/cache/redis.client';
import logger from '../utils/logger.util';
import config from '../../config';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: any;
  error?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

/**
 * Enterprise Health Check System
 * Provides comprehensive health monitoring for all system dependencies
 */
class HealthCheckService {
  private prisma: PrismaClient;
  private stripe: Stripe;
  private redisClient: RedisClient;
  private readonly startTime: number;

  constructor() {
    this.prisma = new PrismaClient();
    this.stripe = new Stripe(config.stripe.secretKey);
    this.redisClient = RedisClient.getInstance();
    this.startTime = Date.now();
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(includeExternal: boolean = true): Promise<HealthStatus> {
    const checks: HealthCheckResult[] = [];
    
    // Core infrastructure checks
    checks.push(await this.checkDatabase());
    checks.push(await this.checkRedis());
    checks.push(await this.checkMemory());
    checks.push(await this.checkCPU());
    checks.push(await this.checkDisk());
    
    // External service checks (optional for readiness probe)
    if (includeExternal) {
      checks.push(await this.checkStripe());
    }
    
    // Calculate overall status
    const summary = this.calculateSummary(checks);
    const overallStatus = this.determineOverallStatus(summary);
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: config.nodeEnv,
      checks,
      summary
    };
    
    // Log health check results
    logger.info('Health check completed', {
      status: overallStatus,
      summary,
      duration: checks.reduce((total, check) => total + check.responseTime, 0)
    });
    
    return healthStatus;
  }

  /**
   * Database health check
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      // Simple connectivity check
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Check database responsiveness with a simple count
      const userCount = await this.prisma.user.count({
        take: 1
      });
      
      const responseTime = Date.now() - start;
      
      // Performance thresholds
      let status: 'healthy' | 'degraded' = 'healthy';
      if (responseTime > 2000) {
        status = 'degraded';
      }
      
      return {
        service: 'database',
        status,
        responseTime,
        details: {
          connectionState: 'connected',
          queryTime: responseTime,
          sampleQueryResult: userCount >= 0 ? 'success' : 'no_data'
        }
      };
      
    } catch (error) {
      const responseTime = Date.now() - start;
      
      logger.error('Database health check failed', {
        error: error as Error,
        responseTime
      });
      
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * Redis health check
   */
  private async checkRedis(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      // Test Redis connectivity with ping
      const pingResult = await this.redisClient.ping();
      
      // Test basic operations
      const testKey = 'health_check_test';
      const testValue = Date.now().toString();
      
      await this.redisClient.set(testKey, testValue, 10); // 10 second TTL
      const retrievedValue = await this.redisClient.get(testKey);
      await this.redisClient.delete(testKey);
      
      const responseTime = Date.now() - start;
      
      // Verify operations worked correctly
      const operationsSuccess = pingResult === 'PONG' && retrievedValue === testValue;
      
      let status: 'healthy' | 'degraded' = 'healthy';
      if (responseTime > 1000 || !operationsSuccess) {
        status = 'degraded';
      }
      
      return {
        service: 'redis',
        status,
        responseTime,
        details: {
          pingResult,
          operationsTest: operationsSuccess ? 'success' : 'failed',
          connectionState: 'connected'
        }
      };
      
    } catch (error) {
      const responseTime = Date.now() - start;
      
      logger.error('Redis health check failed', {
        error: error as Error,
        responseTime
      });
      
      return {
        service: 'redis',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown Redis error'
      };
    }
  }

  /**
   * Stripe service health check
   */
  private async checkStripe(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      // Test Stripe API connectivity
      const account = await this.stripe.accounts.retrieve();
      
      const responseTime = Date.now() - start;
      
      let status: 'healthy' | 'degraded' = 'healthy';
      if (responseTime > 3000) {
        status = 'degraded';
      }
      
      return {
        service: 'stripe',
        status,
        responseTime,
        details: {
          accountId: account.id,
          country: account.country,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled
        }
      };
      
    } catch (error) {
      const responseTime = Date.now() - start;
      
      logger.error('Stripe health check failed', {
        error: error as Error,
        responseTime
      });
      
      return {
        service: 'stripe',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown Stripe error'
      };
    }
  }

  /**
   * Memory usage health check
   */
  private async checkMemory(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;
      const usagePercentage = (usedMemory / totalMemory) * 100;
      
      const responseTime = Date.now() - start;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (usagePercentage > 90) {
        status = 'unhealthy';
      } else if (usagePercentage > 80) {
        status = 'degraded';
      }
      
      return {
        service: 'memory',
        status,
        responseTime,
        details: {
          heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
          heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
          usagePercentage: Math.round(usagePercentage * 100) / 100,
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
        }
      };
      
    } catch (error) {
      const responseTime = Date.now() - start;
      
      return {
        service: 'memory',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Memory check error'
      };
    }
  }

  /**
   * CPU usage health check
   */
  private async checkCPU(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      const startUsage = process.cpuUsage();
      
      // Wait a small amount to measure CPU usage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endUsage = process.cpuUsage(startUsage);
      const totalTime = endUsage.user + endUsage.system;
      const usagePercentage = (totalTime / 100000); // Convert microseconds to percentage
      
      const responseTime = Date.now() - start;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (usagePercentage > 90) {
        status = 'unhealthy';
      } else if (usagePercentage > 80) {
        status = 'degraded';
      }
      
      return {
        service: 'cpu',
        status,
        responseTime,
        details: {
          userTime: Math.round(endUsage.user / 1000), // ms
          systemTime: Math.round(endUsage.system / 1000), // ms
          usagePercentage: Math.round(usagePercentage * 100) / 100
        }
      };
      
    } catch (error) {
      const responseTime = Date.now() - start;
      
      return {
        service: 'cpu',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'CPU check error'
      };
    }
  }

  /**
   * Disk space health check
   */
  private async checkDisk(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Check current working directory disk space
      const stats = fs.statSync(process.cwd());
      
      const responseTime = Date.now() - start;
      
      return {
        service: 'disk',
        status: 'healthy', // Basic check - in production you'd use proper disk space monitoring
        responseTime,
        details: {
          workingDirectory: process.cwd(),
          accessible: true,
          lastCheck: new Date().toISOString()
        }
      };
      
    } catch (error) {
      const responseTime = Date.now() - start;
      
      return {
        service: 'disk',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Disk check error'
      };
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(checks: HealthCheckResult[]) {
    const total = checks.length;
    const healthy = checks.filter(c => c.status === 'healthy').length;
    const degraded = checks.filter(c => c.status === 'degraded').length;
    const unhealthy = checks.filter(c => c.status === 'unhealthy').length;
    
    return { total, healthy, degraded, unhealthy };
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(summary: any): 'healthy' | 'degraded' | 'unhealthy' {
    if (summary.unhealthy > 0) {
      return 'unhealthy';
    }
    
    if (summary.degraded > 0) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect();
    } catch (error) {
      logger.error('Error during health check cleanup', { error: error as Error });
    }
  }
}

// Export singleton instance
const healthCheckService = new HealthCheckService();

/**
 * Health check endpoint handler
 * Returns detailed health status including all dependencies
 */
export const healthCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const healthStatus = await healthCheckService.performHealthCheck(true);
    
    // Set appropriate HTTP status based on health
    let httpStatus = 200;
    if (healthStatus.status === 'degraded') {
      httpStatus = 200; // Still operational but with warnings
    } else if (healthStatus.status === 'unhealthy') {
      httpStatus = 503; // Service Unavailable
    }
    
    res.status(httpStatus).json({
      success: healthStatus.status !== 'unhealthy',
      data: healthStatus
    });
    
  } catch (error) {
    logger.error('Health check failed', { error: error as Error });
    next(error);
  }
};

/**
 * Readiness check endpoint handler
 * Returns whether the service is ready to accept traffic
 * Excludes external dependencies to avoid cascading failures
 */
export const readinessCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const healthStatus = await healthCheckService.performHealthCheck(false);
    
    // Readiness is more strict - any unhealthy core service means not ready
    const isReady = healthStatus.status === 'healthy' || healthStatus.status === 'degraded';
    
    res.status(isReady ? 200 : 503).json({
      success: isReady,
      data: {
        status: isReady ? 'ready' : 'not_ready',
        timestamp: healthStatus.timestamp,
        uptime: healthStatus.uptime,
        coreChecks: healthStatus.checks.filter(c => 
          ['database', 'redis', 'memory', 'cpu', 'disk'].includes(c.service)
        )
      }
    });
    
  } catch (error) {
    logger.error('Readiness check failed', { error: error as Error });
    next(error);
  }
};

/**
 * Liveness check endpoint handler
 * Simple check to verify the service is running
 */
export const livenessCheck = (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - healthCheckService['startTime'],
      pid: process.pid
    }
  });
};

/**
 * Detailed system metrics endpoint
 */
export const systemMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      environment: {
        nodeEnv: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0'
      }
    };
    
    res.status(200).json({
      success: true,
      data: metrics
    });
    
  } catch (error) {
    logger.error('System metrics failed', { error: error as Error });
    next(error);
  }
};

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down health check service');
  await healthCheckService.cleanup();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down health check service');
  await healthCheckService.cleanup();
});

export default healthCheckService;