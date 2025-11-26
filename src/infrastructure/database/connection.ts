/**
 * Database Connection Configuration
 * 
 * Implements connection pooling, error handling, and environment-specific
 * configurations for the centralized billing system.
 */

import { PrismaClient, Prisma } from '@prisma/client'

// Global variable to store Prisma client (prevents multiple instances in development)
declare global {
  var __prisma: PrismaClient | undefined
}

/**
 * Database Connection Configuration
 */
interface DatabaseConfig {
  url: string
  maxConnections: number
  connectionTimeout: number
  queryTimeout: number
  logLevel: Prisma.LogLevel[]
}

/**
 * Environment-specific database configurations
 */
const getConfig = (): DatabaseConfig => {
  const env = process.env.NODE_ENV || 'development'
  
  const baseConfig = {
    url: process.env.DATABASE_URL || '',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
  }

  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        logLevel: ['error', 'warn'],
      }
    
    case 'test':
      return {
        ...baseConfig,
        maxConnections: 5,
        logLevel: ['error'],
      }
    
    default: // development
      return {
        ...baseConfig,
        logLevel: ['query', 'info', 'warn', 'error'],
      }
  }
}

/**
 * Create a new Prisma client with optimized configuration
 */
const createPrismaClient = (): PrismaClient => {
  const config = getConfig()
  
  return new PrismaClient({
    log: config.logLevel,
    datasourceUrl: config.url,
    errorFormat: 'pretty',
  })
}

/**
 * Main database client instance
 * 
 * In development, we use global storage to prevent multiple instances
 * during hot reloading. In production, we create a new instance.
 */
export const db = (() => {
  if (process.env.NODE_ENV === 'production') {
    return createPrismaClient()
  }
  
  if (!global.__prisma) {
    global.__prisma = createPrismaClient()
  }
  
  return global.__prisma
})()

/**
 * Connection health check utilities
 */
export class DatabaseHealth {
  /**
   * Test database connectivity
   */
  static async checkConnection(): Promise<boolean> {
    try {
      await db.$connect()
      await db.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('Database connection failed:', error)
      return false
    }
  }

  /**
   * Get database metrics
   */
  static async getMetrics() {
    try {
      const result = await db.$queryRaw<Array<{ metric: string; value: number }>>`
        SELECT 
          'total_connections' as metric,
          COUNT(*) as value
        FROM pg_stat_activity
        WHERE state = 'active'
        UNION ALL
        SELECT 
          'database_size_mb' as metric,
          (pg_database_size(current_database()) / 1024 / 1024)::int as value
      `
      
      return result.reduce((acc, { metric, value }) => {
        acc[metric] = value
        return acc
      }, {} as Record<string, number>)
    } catch (error) {
      console.error('Failed to get database metrics:', error)
      return {}
    }
  }

  /**
   * Gracefully close database connections
   */
  static async closeConnections(): Promise<void> {
    try {
      await db.$disconnect()
      console.log('Database connections closed successfully')
    } catch (error) {
      console.error('Error closing database connections:', error)
    }
  }
}

/**
 * Graceful shutdown handler
 */
process.on('beforeExit', async () => {
  await DatabaseHealth.closeConnections()
})

process.on('SIGINT', async () => {
  await DatabaseHealth.closeConnections()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await DatabaseHealth.closeConnections()
  process.exit(0)
})

export default db