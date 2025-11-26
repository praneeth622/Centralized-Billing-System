import request from 'supertest';
import app from '../../src/app';

describe('Health Routes', () => {
  describe('GET /api/health', () => {
    it('should return health status with 200', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      
      // Validate timestamp is a valid ISO string
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      
      // Validate uptime is a positive number
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
      
      // Validate memory object structure (process.memoryUsage() format)
      expect(response.body.memory).toHaveProperty('rss');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(response.body.memory).toHaveProperty('heapUsed');
      expect(response.body.memory).toHaveProperty('external');
      expect(response.body.memory).toHaveProperty('arrayBuffers');
      
      // Validate CPU object structure (process.cpuUsage() format)
      expect(response.body.cpu).toHaveProperty('user');
      expect(response.body.cpu).toHaveProperty('system');
    });

    it('should return JSON content-type', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Check for Helmet security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('GET /api/hello', () => {
    it('should return hello message with 200', async () => {
      const response = await request(app)
        .get('/api/hello')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
      
      // Validate message content
      expect(response.body.message).toContain('Hello');
      expect(response.body.message).toContain('Centralized Billing System');
      
      // Validate timestamp is a valid ISO string
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      
      // Validate environment
      expect(['development', 'test', 'production']).toContain(response.body.environment);
    });

    it('should return JSON content-type', async () => {
      const response = await request(app)
        .get('/api/hello')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/hello')
        .expect(200);

      // Check for Helmet security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/api/non-existent')
        .expect(404);
    });
  });
});