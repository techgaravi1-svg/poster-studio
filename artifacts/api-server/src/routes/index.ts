import { Router } from 'express';
import healthRouter from './health';
import ordersRouter from './orders';
import addressesRouter from './addresses';
import couponsRouter from './coupons';
import newsletterRouter from './newsletter';
import productsRouter from './products';
import adminRouter from './admin';
import adminSellersRouter from './admin-sellers';
import sellerRouter from './seller';

const router: Router = Router();

router.use(healthRouter);
router.use(ordersRouter);
router.use(addressesRouter);
router.use(couponsRouter);
router.use(newsletterRouter);
router.use(productsRouter);
router.use(adminRouter);
router.use(adminSellersRouter);
router.use(sellerRouter);

export default router;
