import { Router } from 'express';
import { body } from 'express-validator';
import validateRequest from '../middleware/validateRequest';
import auth from '../middleware/auth';
import BillingController from '../controllers/billing.controller';

const router = Router();

router.post(
  '/customers',
  auth,
  [body('email').isEmail().withMessage('Valid email required')],
  validateRequest,
  BillingController.createCustomer
);

router.post(
  '/subscriptions',
  auth,
  [body('customerId').isString(), body('priceId').isString()],
  validateRequest,
  BillingController.createSubscription
);

router.post(
  '/payments',
  auth,
  [body('customerId').optional().isString(), body('amount').isInt({ min: 50 })],
  validateRequest,
  BillingController.createPayment
);

router.get('/invoices/:customerId', auth, BillingController.listInvoices);

export default router;
