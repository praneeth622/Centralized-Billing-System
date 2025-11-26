import request from 'supertest';
import app from '../../src/app';

describe('Billing Controller', () => {
  describe('GET /api/billing/subscriptions', () => {
    it('should require authentication and return 401', async () => {
      const response = await request(app)
        .get('/api/billing/subscriptions')
        .expect(401);

      // Should return JSON content-type even on error
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should include security headers even on unauthorized request', async () => {
      const response = await request(app)
        .get('/api/billing/subscriptions')
        .expect(401);

      // Check for Helmet security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('POST /api/billing/customers', () => {
    it('should require authentication for customer creation', async () => {
      const response = await request(app)
        .post('/api/billing/customers')
        .send({ email: 'test@example.com' })
        .expect(401);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('POST /api/billing/subscriptions', () => {
    it('should require authentication for subscription creation', async () => {
      const response = await request(app)
        .post('/api/billing/subscriptions')
        .send({ 
          customerId: 'cus_123',
          priceId: 'price_123'
        })
        .expect(401);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Error Handling', () => {
    it('should include security headers on all billing endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/billing/subscriptions' },
        { method: 'post', path: '/api/billing/customers' },
        { method: 'post', path: '/api/billing/subscriptions' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .send(endpoint.method === 'post' ? { test: 'data' } : undefined)
          .expect(401);

        // Check for Helmet security headers
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBeDefined();
        expect(response.headers['x-xss-protection']).toBeDefined();
      }
    });

    it('should return 404 for non-existent billing endpoints', async () => {
      await request(app)
        .get('/api/billing/non-existent')
        .expect(404);
    });
  });
});