import { Router, type Request, type Response } from 'express';
import { prisma } from '@workspace/db';
import { z } from 'zod';
import { rateLimiter } from '../middlewares/security';

const router: Router = Router();

const ValidateCouponSchema = z.object({
  code: z.string().min(1).max(30),
  subtotal: z.number().nonnegative(),
  totalCount: z.number().int().nonnegative(),
});

/**
 * GET /api/coupons
 * Fetch active promo vouchers
 */
router.get('/coupons', async (_req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: { isActive: true },
      orderBy: { minQty: 'asc' },
    });

    return res.json({ success: true, coupons });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve vouchers' });
  }
});

/**
 * POST /api/coupons/validate
 * Validate promo code against current cart
 */
router.post(
  '/coupons/validate',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 40 }),
  async (req: Request, res: Response) => {
    try {
      const parsed = ValidateCouponSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Invalid coupon validation parameters' });
      }

      const { code, subtotal, totalCount } = parsed.data;
      const normalizedCode = code.trim().toUpperCase();

      const coupon = await prisma.coupon.findUnique({
        where: { code: normalizedCode },
      });

      if (!coupon || !coupon.isActive) {
        return res.status(404).json({
          success: false,
          error: 'Invalid coupon code. Please check and try again.',
        });
      }

      if (coupon.expiresAt && new Date() > coupon.expiresAt) {
        return res.status(400).json({
          success: false,
          error: 'This coupon has expired.',
        });
      }

      if (totalCount < coupon.minQty) {
        const needed = coupon.minQty - totalCount;
        return res.status(400).json({
          success: false,
          error: `Add ${needed} more poster${needed > 1 ? 's' : ''} to unlock this offer!`,
        });
      }

      if (subtotal < coupon.minSpend) {
        return res.status(400).json({
          success: false,
          error: `Minimum order value of ₹${coupon.minSpend} required.`,
        });
      }

      let discount = 0;
      if (coupon.discountType === 'percentage') {
        discount = Math.round((subtotal * coupon.discountValue) / 100);
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else {
        discount = coupon.discountValue;
      }

      return res.json({
        success: true,
        coupon: {
          code: coupon.code,
          description: coupon.description,
          discountValue: coupon.discountValue,
          discountType: coupon.discountType,
          discountAmount: discount,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Coupon validation failed' });
    }
  }
);

export default router;
