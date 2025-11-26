import { Router } from 'express';
import billingRoutes from './billing.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/', healthRoutes);
router.use('/billing', billingRoutes);

export default router;
