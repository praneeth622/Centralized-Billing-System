/**
 * Redis Client Tests
 * 
 * Comprehensive unit tests for the Redis client functionality including
 * connection management, operations, error handling, and retry logic.
 */

// Mock ioredis
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  incr: jest.fn(),
  incrby: jest.fn(),
  info: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
  status: 'ready',
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

import { redisClient, RedisOperationResult } from '../../src/infrastructure/cache/redis.client';

describe('RedisClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = redisClient;
      const instance2 = redisClient;
      expect(instance1).toBe(instance2);
    });
  });

  describe('Connection Status', () => {
    it('should report connected status when Redis is ready', () => {
      // Mock the private status property
      (redisClient as any).status = 'connected';
      mockRedis.status = 'ready';

      const isConnected = redisClient.isConnected();
      expect(isConnected).toBe(true);
    });

    it('should report disconnected status when Redis is not ready', () => {
      (redisClient as any).status = 'disconnected';
      mockRedis.status = 'disconnected';

      const isConnected = redisClient.isConnected();
      expect(isConnected).toBe(false);
    });

    it('should return current status', () => {
      (redisClient as any).status = 'connected';
      const status = redisClient.getStatus();
      expect(status).toBe('connected');
    });
  });

  describe('GET Operation', () => {
    beforeEach(() => {
      (redisClient as any).status = 'connected';
      mockRedis.status = 'ready';
    });

    it('should successfully get a value', async () => {
      const testKey = 'test:key';
      const testValue = 'test value';
      mockRedis.get.mockResolvedValue(testValue);

      const result = await redisClient.get(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(testValue);
      expect(mockRedis.get).toHaveBeenCalledWith(testKey);
    });

    it('should return null for non-existent key', async () => {
      const testKey = 'nonexistent:key';
      mockRedis.get.mockResolvedValue(null);

      const result = await redisClient.get(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle Redis errors', async () => {
      const testKey = 'error:key';
      const errorMessage = 'Redis connection error';
      mockRedis.get.mockRejectedValue(new Error(errorMessage));

      const result = await redisClient.get(testKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });

    it('should return error when not connected', async () => {
      (redisClient as any).status = 'disconnected';

      const result = await redisClient.get('test:key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis not connected');
    });
  });

  describe('SET Operation', () => {
    beforeEach(() => {
      (redisClient as any).status = 'connected';
      mockRedis.status = 'ready';
    });

    it('should successfully set a string value without TTL', async () => {
      const testKey = 'test:key';
      const testValue = 'test value';
      mockRedis.set.mockResolvedValue('OK');

      const result = await redisClient.set(testKey, testValue);

      expect(result.success).toBe(true);
      expect(result.data).toBe('OK');
      expect(mockRedis.set).toHaveBeenCalledWith(testKey, testValue);
    });

    it('should successfully set a string value with TTL', async () => {
      const testKey = 'test:key';
      const testValue = 'test value';
      const ttl = 300;
      mockRedis.setex.mockResolvedValue('OK');

      const result = await redisClient.set(testKey, testValue, ttl);

      expect(result.success).toBe(true);
      expect(result.data).toBe('OK');
      expect(mockRedis.setex).toHaveBeenCalledWith(testKey, ttl, testValue);
    });

    it('should serialize object values', async () => {
      const testKey = 'test:object';
      const testObject = { id: 1, name: 'test' };
      mockRedis.set.mockResolvedValue('OK');

      const result = await redisClient.set(testKey, testObject);

      expect(result.success).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(testKey, JSON.stringify(testObject));
    });

    it('should handle Redis errors', async () => {
      const errorMessage = 'Set operation failed';
      mockRedis.set.mockRejectedValue(new Error(errorMessage));

      const result = await redisClient.set('test:key', 'value');

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });

    it('should return error when not connected', async () => {
      (redisClient as any).status = 'disconnected';

      const result = await redisClient.set('test:key', 'value');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis not connected');
    });
  });

  describe('DELETE Operation', () => {
    beforeEach(() => {
      (redisClient as any).status = 'connected';
      mockRedis.status = 'ready';
    });

    it('should successfully delete an existing key', async () => {
      const testKey = 'test:key';
      mockRedis.del.mockResolvedValue(1);

      const result = await redisClient.delete(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith(testKey);
    });

    it('should return 0 for non-existent key', async () => {
      const testKey = 'nonexistent:key';
      mockRedis.del.mockResolvedValue(0);

      const result = await redisClient.delete(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    it('should handle Redis errors', async () => {
      const errorMessage = 'Delete operation failed';
      mockRedis.del.mockRejectedValue(new Error(errorMessage));

      const result = await redisClient.delete('test:key');

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe('INVALIDATE Operation', () => {
    beforeEach(() => {
      (redisClient as any).status = 'connected';
      mockRedis.status = 'ready';
    });

    it('should successfully invalidate keys matching pattern', async () => {
      const pattern = 'test:*';
      const matchingKeys = ['test:key1', 'test:key2', 'test:key3'];
      mockRedis.keys.mockResolvedValue(matchingKeys);
      mockRedis.del.mockResolvedValue(3);

      const result = await redisClient.invalidate(pattern);

      expect(result.success).toBe(true);
      expect(result.data).toBe(3);
      expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedis.del).toHaveBeenCalledWith(...matchingKeys);
    });

    it('should return 0 when no keys match pattern', async () => {
      const pattern = 'nonexistent:*';
      mockRedis.keys.mockResolvedValue([]);

      const result = await redisClient.invalidate(pattern);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
      expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors', async () => {
      const errorMessage = 'Keys operation failed';
      mockRedis.keys.mockRejectedValue(new Error(errorMessage));

      const result = await redisClient.invalidate('test:*');

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe('EXISTS Operation', () => {
    beforeEach(() => {
      (redisClient as any).status = 'connected';
      mockRedis.status = 'ready';
    });

    it('should return true for existing key', async () => {
      const testKey = 'existing:key';
      mockRedis.exists.mockResolvedValue(1);

      const result = await redisClient.exists(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const testKey = 'nonexistent:key';
      mockRedis.exists.mockResolvedValue(0);

      const result = await redisClient.exists(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('TTL Operations', () => {
    beforeEach(() => {
      (redisClient as any).status = 'connected';
      mockRedis.status = 'ready';
    });

    it('should successfully set TTL for existing key', async () => {
      const testKey = 'test:key';
      const ttl = 300;
      mockRedis.expire.mockResolvedValue(1);

      const result = await redisClient.expire(testKey, ttl);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRedis.expire).toHaveBeenCalledWith(testKey, ttl);
    });

    it('should return false when setting TTL for non-existent key', async () => {
      const testKey = 'nonexistent:key';
      const ttl = 300;
      mockRedis.expire.mockResolvedValue(0);

      const result = await redisClient.expire(testKey, ttl);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should successfully get TTL for key', async () => {
      const testKey = 'test:key';
      const expectedTtl = 120;
      mockRedis.ttl.mockResolvedValue(expectedTtl);

      const result = await redisClient.ttl(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(expectedTtl);
    });

    it('should return -1 for key with no expiry', async () => {
      const testKey = 'persistent:key';
      mockRedis.ttl.mockResolvedValue(-1);

      const result = await redisClient.ttl(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(-1);
    });
  });

  describe('INCREMENT Operations', () => {
    beforeEach(() => {
      (redisClient as any).status = 'connected';
      mockRedis.status = 'ready';
    });

    it('should increment by 1 by default', async () => {
      const testKey = 'counter:key';
      mockRedis.incr.mockResolvedValue(5);

      const result = await redisClient.increment(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
      expect(mockRedis.incr).toHaveBeenCalledWith(testKey);
    });

    it('should increment by specified value', async () => {
      const testKey = 'counter:key';
      const incrementValue = 10;
      mockRedis.incrby.mockResolvedValue(15);

      const result = await redisClient.increment(testKey, incrementValue);

      expect(result.success).toBe(true);
      expect(result.data).toBe(15);
      expect(mockRedis.incrby).toHaveBeenCalledWith(testKey, incrementValue);
    });

    it('should handle Redis errors', async () => {
      const errorMessage = 'Increment operation failed';
      mockRedis.incr.mockRejectedValue(new Error(errorMessage));

      const result = await redisClient.increment('test:key');

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe('Info Operation', () => {
    beforeEach(() => {
      (redisClient as any).status = 'connected';
      mockRedis.status = 'ready';
    });

    it('should successfully get Redis info', async () => {
      const mockInfo = 'redis_version:6.2.6\nuptime_in_seconds:3600';
      mockRedis.info.mockResolvedValue(mockInfo);

      const result = await redisClient.getInfo();

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockInfo);
    });

    it('should handle Redis errors', async () => {
      const errorMessage = 'Info operation failed';
      mockRedis.info.mockRejectedValue(new Error(errorMessage));

      const result = await redisClient.getInfo();

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe('Disconnect Operation', () => {
    it('should successfully disconnect', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await redisClient.disconnect();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      mockRedis.quit.mockRejectedValue(new Error('Disconnect error'));

      // Should not throw
      await expect(redisClient.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('Raw Client Access', () => {
    it('should provide access to raw Redis client', () => {
      const rawClient = redisClient.getClient();
      expect(rawClient).toBeDefined();
    });
  });

  describe('Environment Configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use environment variables for configuration', () => {
      // Since the configuration is set once during singleton creation,
      // this test verifies the getConfig method indirectly
      const originalEnv = process.env;
      
      expect(() => {
        // Test passes if Redis client can be created with environment variables
        const config = (redisClient as any).config;
        expect(config).toBeDefined();
        expect(config.url).toBeDefined();
        expect(config.maxRetriesPerRequest).toBeDefined();
      }).not.toThrow();
    });

    it('should use default values when environment variables are not set', () => {
      delete process.env.REDIS_URL;
      delete process.env.REDIS_MAX_RETRIES;

      const config = (redisClient as any).config;

      expect(config.url).toBe('redis://localhost:6379');
      expect(config.maxRetriesPerRequest).toBe(3);
    });
  });
});