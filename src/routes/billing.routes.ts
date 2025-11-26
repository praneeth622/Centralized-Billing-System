import { Router } from 'express';
import { body } from 'express-validator';
import validateRequest from '../middleware/validateRequest';
import auth from '../middleware/auth';
import BillingController from '../controllers/billing.controller';

const router = Router();

/**
 * @swagger
 * /api/billing/customers:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Create a new customer
 *     description: Creates a new customer in the billing system
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCustomerRequest'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "cus_123abc"
 *                     email:
 *                       type: string
 *                       format: email
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post(
  '/customers',
  auth,
  [body('email').isEmail().withMessage('Valid email required')],
  validateRequest,
  BillingController.createCustomer
);

/**
 * @swagger
 * /api/billing/subscriptions:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Create a new subscription
 *     description: Creates a new subscription for a customer
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubscriptionRequest'
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post(
  '/subscriptions',
  auth,
  [body('customerId').isString(), body('priceId').isString()],
  validateRequest,
  BillingController.createSubscription
);

/**
 * @swagger
 * /api/billing/subscriptions:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get all subscriptions
 *     description: Retrieves a list of all subscriptions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/subscriptions', auth, BillingController.getSubscriptions);

export default router;
