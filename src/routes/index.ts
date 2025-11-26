import { Router } from 'express';
import billingRoutes from './billing.routes';

const router = Router();

router.use('/billing', billingRoutes);

export default router;
