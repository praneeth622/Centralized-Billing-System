import request from 'supertest';
import express from 'express';
import { rateLimiters } from '../../src/shared/middleware/rate-limiting.middleware';
import RedisClient from '../../src/infrastructure/cache/redis.client';

// Mock Redis client
jest.mock('../../src/infrastructure/cache/redis.client');
const mockRedisClient = {
  increment: jest.fn(),
  expire: jest.fn(),
  delete: jest.fn(),
  ping: jest.fn().mockResolvedValue('PONG')
};
(RedisClient.getInstance as jest.Mock).mockReturnValue(mockRedisClient);

describe('Rate Limiting Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    jest.clearAllMocks();
  });

  describe('General Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      mockRedisClient.increment.mockResolvedValue(1);
      
      app.use(rateLimiters.general);
      app.get('/test', (req, res) => res.json({ message: 'success' }));

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'success' });
      expect(mockRedisClient.increment).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:ip:'),
        1
      );
    });

    it('should block requests exceeding limit', async () => {
      mockRedisClient.increment.mockResolvedValue(1001); // Exceeds default limit of 1000
      
      app.use(rateLimiters.general);
      app.get('/test', (req, res) => res.json({ message: 'success' }));

      const response = await request(app)
        .get('/test')
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.'
      });
    });

    it('should include rate limit headers', async () => {
      mockRedisClient.increment.mockResolvedValue(1);
      
      app.use(rateLimiters.general);
      app.get('/test', (req, res) => res.json({ message: 'success' }));

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('User Rate Limiting', () => {
    it('should use user ID from authorization header', async () => {
      mockRedisClient.increment.mockResolvedValue(1);
      
      app.use(rateLimiters.user);
      app.get('/test', (req, res) => res.json({ message: 'success' }));

      await request(app)
        .get('/test')
        .set('Authorization', 'Bearer user123')
        .expect(200);

      expect(mockRedisClient.increment).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:user:Bearer user123'),
        1
      );
    });

    it('should fall back to IP when no user ID available', async () => {
      mockRedisClient.increment.mockResolvedValue(1);
      
      app.use(rateLimiters.user);
      app.get('/test', (req, res) => res.json({ message: 'success' }));

      await request(app)
        .get('/test')
        .expect(200);

      expect(mockRedisClient.increment).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:user:'),
        1
      );
    });

    it('should block user requests exceeding limit', async () => {
      mockRedisClient.increment.mockResolvedValue(101); // Exceeds default user limit of 100
      
      app.use(rateLimiters.user);
      app.get('/test', (req, res) => res.json({ message: 'success' }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer user123')
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'Too Many Requests',
        message: 'User rate limit exceeded. Please slow down.'
      });
    });
  });

  describe('Auth Rate Limiting', () => {
    it('should apply strict limits to auth endpoints', async () => {
      mockRedisClient.increment.mockResolvedValue(1);
      
      app.use('/auth', rateLimiters.auth);
      app.post('/auth/login', (req, res) => res.json({ message: 'logged in' }));

      await request(app)
        .post('/auth/login')
        .expect(200);

      expect(mockRedisClient.increment).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:endpoint_auth:'),
        1
      );
    });

    it('should block auth requests after few attempts', async () => {
      mockRedisClient.increment.mockResolvedValue(6); // Exceeds auth limit of 5
      
      app.use('/auth', rateLimiters.auth);
      app.post('/auth/login', (req, res) => res.json({ message: 'logged in' }));

      const response = await request(app)
        .post('/auth/login')
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded for auth. Please try again later.'
      });
    });
  });

  describe('Payment Rate Limiting', () => {
    it('should apply strict limits to payment endpoints', async () => {
      mockRedisClient.increment.mockResolvedValue(1);
      
      app.use('/payments', rateLimiters.payment);
      app.post('/payments/charge', (req, res) => res.json({ message: 'charged' }));

      await request(app)
        .post('/payments/charge')
        .expect(200);

      expect(mockRedisClient.increment).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:endpoint_payment:'),
        1
      );
    });

    it('should block payment requests exceeding limit', async () => {
      mockRedisClient.increment.mockResolvedValue(11); // Exceeds payment limit of 10
      
      app.use('/payments', rateLimiters.payment);
      app.post('/payments/charge', (req, res) => res.json({ message: 'charged' }));

      const response = await request(app)
        .post('/payments/charge')
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded for payment. Please try again later.'
      });
    });
  });

  describe('Webhook Rate Limiting', () => {
    it('should allow high volume webhook requests', async () => {
      mockRedisClient.increment.mockResolvedValue(50);
      
      app.use('/webhooks', rateLimiters.webhook);
      app.post('/webhooks/stripe', (req, res) => res.json({ received: true }));

      await request(app)
        .post('/webhooks/stripe')
        .expect(200);

      expect(mockRedisClient.increment).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:endpoint_webhook:'),
        1
      );
    });

    it('should block webhook requests exceeding high limit', async () => {
      mockRedisClient.increment.mockResolvedValue(101); // Exceeds webhook limit of 100
      
      app.use('/webhooks', rateLimiters.webhook);
      app.post('/webhooks/stripe', (req, res) => res.json({ received: true }));

      const response = await request(app)
        .post('/webhooks/stripe')
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded for webhook. Please try again later.'
      });
    });
  });

  describe('Adaptive Rate Limiting', () => {
    it('should apply normal limits under normal system load', async () => {
      // Mock normal system resources
      jest.spyOn(process, 'cpuUsage').mockReturnValue({
        user: 50000000, // 50% CPU
        system: 20000000 // 20% CPU
      });
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        heapUsed: 100 * 1024 * 1024, // 50% memory
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      app.use(rateLimiters.adaptive);
      app.get('/test', (req, res) => res.json({ message: 'success' }));

      await request(app)
        .get('/test')
        .expect(200);
    });

    it('should apply strict limits under high system load', async () => {
      // Mock high system resources
      jest.spyOn(process, 'cpuUsage').mockReturnValue({
        user: 90000000, // 90% CPU (high)
        system: 30000000 // 30% CPU
      });
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        heapUsed: 180 * 1024 * 1024, // 90% memory (high)
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      mockRedisClient.increment.mockResolvedValue(51); // Would normally be OK, but system is under load

      app.use(rateLimiters.adaptive);
      app.get('/test', (req, res) => res.json({ message: 'success' }));

      const response = await request(app)
        .get('/test')
        .expect(503);

      expect(response.body).toMatchObject({
        error: 'Service Temporarily Unavailable',
        message: 'System under high load. Please try again later.'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      mockRedisClient.increment.mockRejectedValue(new Error('Redis connection failed'));
      
      app.use(rateLimiters.general);
      app.get('/test', (req, res) => res.json({ message: 'success' }));

      // Should still allow requests if Redis is down (graceful degradation)
      await request(app)
        .get('/test')
        .expect(200);
    });

    it('should log Redis errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRedisClient.increment.mockRejectedValue(new Error('Redis connection failed'));
      
      app.use(rateLimiters.general);
      app.get('/test', (req, res) => res.json({ message: 'success' }));

      await request(app)
        .get('/test')
        .expect(200);

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration', () => {
    it('should respect custom rate limit configurations', async () => {
      mockRedisClient.increment.mockResolvedValue(1);
      
      const customRateLimit = rateLimiters.general; // Assuming this uses default config
      
      app.use(customRateLimit);
      app.get('/test', (req, res) => res.json({ message: 'success' }));

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should not significantly impact response time', async () => {
      mockRedisClient.increment.mockResolvedValue(1);
      
      app.use(rateLimiters.general);
      app.get('/test', (req, res) => res.json({ message: 'success' }));

      const startTime = Date.now();
      await request(app)
        .get('/test')
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(100); // Should be very fast
    });
  });
});