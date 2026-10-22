import { Router } from 'express';
import healthRouter from './health';
import ordersRouter from './orders';
import addressesRouter from './addresses';
import couponsRouter from './coupons';
import newsletterRouter from './newsletter';
import productsRouter from './products';

const router: Router = Router();

router.use(healthRouter);
router.use(ordersRouter);
router.use(addressesRouter);
router.use(couponsRouter);
router.use(newsletterRouter);
router.use(productsRouter);

export default router;
