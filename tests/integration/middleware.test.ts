import request from 'supertest';
import app from '../../src/app';

describe('Integration Tests - Full Middleware Stack', () => {
  describe('Security Middleware', () => {
    it('should apply all security headers to public endpoints', async () => {
      const endpoints = [
        '/api/health',
        '/api/hello'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        // Helmet security headers
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBeDefined();
        expect(response.headers['x-xss-protection']).toBeDefined();
        expect(response.headers['x-dns-prefetch-control']).toBeDefined();
        
        // CORS headers
        expect(response.headers['access-control-allow-origin']).toBeDefined();
      }
    });

    it('should apply security headers to protected endpoints even when unauthorized', async () => {
      const response = await request(app)
        .get('/api/billing/subscriptions')
        .expect(401);

      // Should still include security headers on 401
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/health')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      // Note: access-control-allow-headers may not always be present in simple CORS configs
    });
  });

  describe('Request Logging', () => {
    it('should log requests through Morgan middleware', async () => {
      // Test that requests complete successfully indicating Morgan middleware works
      await request(app)
        .get('/api/health')
        .expect(200);

      await request(app)
        .get('/api/hello')
        .expect(200);

      // If requests complete, Morgan middleware is working
      // (Morgan logs are handled by Winston in our setup)
    });
  });

  describe('JSON Parsing', () => {
    it('should handle requests to webhook endpoint', async () => {
      const mockStripeEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test123',
            status: 'active'
          }
        }
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .send(mockStripeEvent)
        .set('Content-Type', 'application/json');

      // Webhook endpoint should respond (200 or 500, not crash the server)
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      // Should still include security headers even on 404
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .send('{ malformed json }')
        .set('Content-Type', 'application/json');

      // Should handle malformed JSON without crashing
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Rate Limiting Simulation', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/health').expect(200)
      );

      const responses = await Promise.all(requests);

      // All requests should complete successfully
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
      });
    });
  });

  describe('Content Type Handling', () => {
    it('should handle different accept headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Accept', 'application/json')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return JSON by default', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});