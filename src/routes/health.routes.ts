import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import config from '../config';

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Get system health status
 *     description: Returns comprehensive system health information including uptime, memory usage, and CPU statistics
 *     responses:
 *       200:
 *         description: Health check successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: Service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };

    logger.info('Health check requested');
    res.status(200).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * @swagger
 * /api/hello:
 *   get:
 *     tags: [Health]
 *     summary: Simple greeting endpoint
 *     description: Returns a simple greeting message with timestamp and environment information
 *     responses:
 *       200:
 *         description: Greeting message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Hello from Centralized Billing System!"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: "development"
 */
// Hello world endpoint
router.get('/hello', (req: Request, res: Response) => {
  try {
    const response = {
      message: 'Hello from Centralized Billing System!',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv
    };

    logger.info('Hello endpoint accessed');
    res.status(200).json(response);
  } catch (error) {
    logger.error('Hello endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;