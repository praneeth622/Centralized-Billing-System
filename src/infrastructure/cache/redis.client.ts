/**
 * Redis Client Setup
 * 
 * Provides a singleton Redis client with connection management, retry logic,
 * and helper methods for common operations used throughout the billing system.
 * 
 * Features:
 * - Singleton pattern for connection reuse
 * - Automatic retry logic with exponential backoff
 * - TLS and authentication support
 * - Structured logging for all operations
 * - Helper methods for common operations
 * - Pattern-based key invalidation
 */

import Redis, { RedisOptions } from 'ioredis';

/**
 * Redis configuration interface
 */
interface RedisConfig {
  url: string;
  maxRetriesPerRequest: number;
  connectTimeout: number;
  commandTimeout: number;
  enableReadyCheck: boolean;
  password?: string;
  tls?: boolean;
  db?: number;
}

/**
 * Redis client status
 */
type RedisStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Redis operation result
 */
interface RedisOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Redis Client Class
 * 
 * Singleton Redis client with comprehensive error handling and logging
 */
class RedisClient {
  private static instance: RedisClient;
  private client: Redis;
  private status: RedisStatus = 'disconnected';
  private config: RedisConfig;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.config = this.getConfig();
    this.client = this.createClient();
    this.setupEventHandlers();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Get Redis configuration from environment variables
   */
  private getConfig(): RedisConfig {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    return {
      url: redisUrl,
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
      commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000'),
      enableReadyCheck: true,
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === 'true',
      db: parseInt(process.env.REDIS_DB || '0'),
    };
  }

  /**
   * Create Redis client with configuration
   */
  private createClient(): Redis {
    const options: RedisOptions = {
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      connectTimeout: this.config.connectTimeout,
      commandTimeout: this.config.commandTimeout,
      enableReadyCheck: this.config.enableReadyCheck,
      db: this.config.db,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`[Redis] Retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
    };

    // Add password if configured
    if (this.config.password) {
      options.password = this.config.password;
    }

    // Add TLS if configured
    if (this.config.tls) {
      options.tls = {};
    }

    return new Redis(this.config.url, options);
  }

  /**
   * Setup event handlers for connection management
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.status = 'connecting';
      console.log('[Redis] Connecting to Redis server...');
    });

    this.client.on('ready', () => {
      this.status = 'connected';
      console.log('[Redis] ✅ Successfully connected to Redis server');
    });

    this.client.on('error', (error) => {
      this.status = 'error';
      console.error('[Redis] ❌ Connection error:', {
        message: error.message,
        code: (error as any).code || 'UNKNOWN',
        timestamp: new Date().toISOString(),
      });
    });

    this.client.on('close', () => {
      this.status = 'disconnected';
      console.log('[Redis] 🔌 Connection closed');
    });

    this.client.on('reconnecting', (time: number) => {
      this.status = 'connecting';
      console.log(`[Redis] 🔄 Reconnecting in ${time}ms...`);
    });

    this.client.on('end', () => {
      this.status = 'disconnected';
      console.log('[Redis] 📴 Connection ended');
    });
  }

  /**
   * Get current connection status
   */
  public getStatus(): RedisStatus {
    return this.status;
  }

  /**
   * Check if Redis is connected and ready
   */
  public isConnected(): boolean {
    return this.status === 'connected' && this.client.status === 'ready';
  }

  /**
   * Get a value from Redis
   * 
   * @param key - Redis key
   * @returns Promise with operation result
   */
  public async get(key: string): Promise<RedisOperationResult<string | null>> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: 'Redis not connected' };
      }

      const data = await this.client.get(key);
      console.log(`[Redis] GET ${key} - ${data ? 'HIT' : 'MISS'}`);
      
      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Redis] GET ${key} - ERROR:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Set a value in Redis with optional TTL
   * 
   * @param key - Redis key
   * @param value - Value to store
   * @param ttl - Time to live in seconds (optional)
   * @returns Promise with operation result
   */
  public async set(key: string, value: any, ttl?: number): Promise<RedisOperationResult<string>> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: 'Redis not connected' };
      }

      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      let result: string;
      if (ttl) {
        result = await this.client.setex(key, ttl, serializedValue);
        console.log(`[Redis] SET ${key} - TTL: ${ttl}s`);
      } else {
        result = await this.client.set(key, serializedValue);
        console.log(`[Redis] SET ${key} - No TTL`);
      }

      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Redis] SET ${key} - ERROR:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Delete a key from Redis
   * 
   * @param key - Redis key to delete
   * @returns Promise with operation result
   */
  public async delete(key: string): Promise<RedisOperationResult<number>> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: 'Redis not connected' };
      }

      const deletedCount = await this.client.del(key);
      console.log(`[Redis] DEL ${key} - Deleted: ${deletedCount}`);
      
      return { success: true, data: deletedCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Redis] DEL ${key} - ERROR:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Invalidate keys matching a pattern
   * 
   * @param pattern - Redis key pattern (supports wildcards)
   * @returns Promise with operation result
   */
  public async invalidate(pattern: string): Promise<RedisOperationResult<number>> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: 'Redis not connected' };
      }

      // Get all keys matching the pattern
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        console.log(`[Redis] INVALIDATE ${pattern} - No keys found`);
        return { success: true, data: 0 };
      }

      // Delete all matching keys
      const deletedCount = await this.client.del(...keys);
      console.log(`[Redis] INVALIDATE ${pattern} - Deleted: ${deletedCount}/${keys.length} keys`);
      
      return { success: true, data: deletedCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Redis] INVALIDATE ${pattern} - ERROR:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if a key exists
   * 
   * @param key - Redis key to check
   * @returns Promise with operation result
   */
  public async exists(key: string): Promise<RedisOperationResult<boolean>> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: 'Redis not connected' };
      }

      const exists = await this.client.exists(key);
      console.log(`[Redis] EXISTS ${key} - ${exists ? 'YES' : 'NO'}`);
      
      return { success: true, data: exists === 1 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Redis] EXISTS ${key} - ERROR:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Set TTL for an existing key
   * 
   * @param key - Redis key
   * @param ttl - Time to live in seconds
   * @returns Promise with operation result
   */
  public async expire(key: string, ttl: number): Promise<RedisOperationResult<boolean>> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: 'Redis not connected' };
      }

      const result = await this.client.expire(key, ttl);
      console.log(`[Redis] EXPIRE ${key} ${ttl}s - ${result ? 'SUCCESS' : 'FAILED'}`);
      
      return { success: true, data: result === 1 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Redis] EXPIRE ${key} - ERROR:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get TTL for a key
   * 
   * @param key - Redis key
   * @returns Promise with operation result (-1 = no expiry, -2 = key doesn't exist)
   */
  public async ttl(key: string): Promise<RedisOperationResult<number>> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: 'Redis not connected' };
      }

      const ttl = await this.client.ttl(key);
      console.log(`[Redis] TTL ${key} - ${ttl}s`);
      
      return { success: true, data: ttl };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Redis] TTL ${key} - ERROR:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Increment a numeric value
   * 
   * @param key - Redis key
   * @param value - Value to increment by (default: 1)
   * @returns Promise with operation result
   */
  public async increment(key: string, value: number = 1): Promise<RedisOperationResult<number>> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: 'Redis not connected' };
      }

      const result = value === 1 
        ? await this.client.incr(key)
        : await this.client.incrby(key, value);
      
      console.log(`[Redis] INCR ${key} by ${value} - Result: ${result}`);
      
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Redis] INCR ${key} - ERROR:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get Redis client info
   */
  public async getInfo(): Promise<RedisOperationResult<any>> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: 'Redis not connected' };
      }

      const info = await this.client.info();
      return { success: true, data: info };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Redis] INFO - ERROR:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    try {
      console.log('[Redis] Disconnecting...');
      await this.client.quit();
      console.log('[Redis] ✅ Disconnected successfully');
    } catch (error) {
      console.error('[Redis] ❌ Error during disconnect:', error);
    }
  }

  /**
   * Get the raw Redis client (use with caution)
   */
  public getClient(): Redis {
    return this.client;
  }
}

// Export singleton instance
export const redisClient = RedisClient.getInstance();

// Export types for use in other modules
export type { RedisOperationResult, RedisStatus };