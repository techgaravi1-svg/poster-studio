import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { prisma } from '@workspace/db';
import { z } from 'zod';
import { rateLimiter } from '../middlewares/security';
import { clientIp } from '../lib/auth';
import { computeTotals, MIN_ORDER_AMOUNT, PricingError, resolveCart } from '../lib/pricing';
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId, verifyRazorpaySignature } from '../lib/razorpay';
import { logger } from '../lib/logger';

const router: Router = Router();

// Custom print snapshot (photos are compressed previews from the custom builder)
const CustomUploadSchema = z
  .object({
    name: z.string().max(200).optional(),
    preview: z.string().max(3_000_000).optional(),
    photos: z.array(z.string().max(3_000_000)).max(10).optional(),
    borderStyle: z.string().max(40).optional(),
    customType: z.string().max(60).optional(),
    format: z.string().max(20).optional(),
  })
  .strip();

// Prices / titles sent by the browser are ignored: the server prices every line.
const OrderItemInputSchema = z.object({
  productId: z.string().min(1).max(100),
  slug: z.string().max(250).optional(),
  title: z.string().max(200).optional(),
  size: z.string().min(1).max(20),
  quantity: z.number().int().min(1).max(50),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
  customUpload: CustomUploadSchema.optional().nullable(),
});

const CreateOrderSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email().max(150),
  customerPhone: z.string().min(10).max(15),
  shippingAddress: z.object({
    name: z.string().min(2).max(100),
    phone: z.string().min(10).max(15),
    pincode: z.string().min(4).max(10),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    locality: z.string().min(2).max(250),
    flat: z.string().min(1).max(250),
    landmark: z.string().max(250).optional(),
    type: z.enum(['home', 'office', 'other']).default('home'),
  }),
  items: z.array(OrderItemInputSchema).min(1, 'Cart cannot be empty').max(50),
  couponCode: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
});

const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(256),
});

/** Unguessable, human-friendly order number, e.g. DNG-7KQ2M9XA */
function generateOrderNumber(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `DNG-${out}`;
}

const digits = (v: string) => v.replace(/\D/g, '').slice(-10);

/**
 * POST /api/orders
 * Step 1 of checkout: validates the bag, prices it on the server, creates a
 * PENDING order and a matching Razorpay order for the server-computed amount.
 * The order only becomes PAID through POST /api/orders/:id/verify-payment.
 */
router.post(
  '/orders',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 15, message: 'Too many order requests. Please wait.' }),
  async (req: Request, res: Response) => {
    try {
      const parsed = CreateOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Please check your delivery details and bag items.', details: parsed.error.format() });
      }

      const { customerName, customerEmail, customerPhone, shippingAddress, items, couponCode, notes } = parsed.data;

      const lines = await resolveCart(items);
      const totals = await computeTotals(lines, couponCode);

      if (totals.total < MIN_ORDER_AMOUNT) {
        return res.status(400).json({
          success: false,
          error: `Minimum order amount is ₹${MIN_ORDER_AMOUNT} (current: ₹${totals.total}).`,
        });
      }

      if (!razorpayConfigured()) {
        logger.error('Checkout attempted but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured');
        return res.status(503).json({ success: false, error: 'Online payments are temporarily unavailable. Please try again shortly.' });
      }

      const orderNumber = generateOrderNumber();
      const rzpOrder = await createRazorpayOrder(totals.total, orderNumber, { orderNumber });

      const order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            orderNumber,
            customerName,
            customerEmail: customerEmail.toLowerCase(),
            customerPhone,
            shippingAddress,
            subtotal: totals.subtotal,
            shippingFee: totals.shippingFee,
            platformFee: totals.platformFee,
            discount: totals.discount,
            total: totals.total,
            couponCode: totals.couponApplied,
            paymentStatus: 'PENDING',
            paymentMethod: 'razorpay',
            razorpayOrderId: rzpOrder.id,
            fulfillmentStatus: 'PENDING',
            notes,
            items: {
              create: lines.map((l) => ({
                productId: l.productId,
                title: l.title,
                slug: l.slug,
                size: l.size,
                quantity: l.quantity,
                price: l.unitPrice,
                orientation: l.orientation,
                customUpload: (l.customUpload as any) ?? undefined,
                sellerId: l.sellerId,
                commissionRate: l.commissionRate,
              })),
            },
          },
          include: { items: true },
        });

        await tx.auditLog.create({
          data: {
            action: 'ORDER_CREATED',
            entity: 'Order',
            entityId: created.id,
            details: { orderNumber, total: totals.total, itemCount: lines.length, coupon: totals.couponApplied },
            ipAddress: clientIp(req),
          },
        });

        return created;
      });

      return res.status(201).json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          platformFee: order.platformFee,
          discount: order.discount,
          total: order.total,
          paymentStatus: order.paymentStatus,
          items: order.items.map((i) => ({ title: i.title, size: i.size, quantity: i.quantity, price: i.price })),
        },
        payment: {
          provider: 'razorpay',
          keyId: razorpayKeyId(),
          razorpayOrderId: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
        },
      });
    } catch (error: any) {
      if (error instanceof PricingError) {
        return res.status(400).json({ success: false, error: error.message });
      }
      logger.error({ err: error }, 'Order creation error');
      return res.status(500).json({
        success: false,
        error: 'An internal error occurred while placing your order. Please try again.',
      });
    }
  }
);

/**
 * POST /api/orders/:id/verify-payment
 * Step 2 of checkout: verifies the Razorpay signature server-side, then marks
 * the order PAID and decrements stock. Idempotent for repeated calls.
 */
router.post(
  '/orders/:id/verify-payment',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 20 }),
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const parsed = VerifyPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Invalid payment confirmation payload.' });
      }
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

      const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
      if (!order || !order.razorpayOrderId || order.razorpayOrderId !== razorpay_order_id) {
        return res.status(404).json({ success: false, error: 'Order not found for this payment.' });
      }

      if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        await prisma.auditLog.create({
          data: { action: 'PAYMENT_SIGNATURE_INVALID', entity: 'Order', entityId: order.id, ipAddress: clientIp(req) },
        });
        return res.status(400).json({ success: false, error: 'Payment could not be verified. If money was deducted, it will be refunded automatically.' });
      }

      if (order.paymentStatus === 'PAID') {
        return res.json({ success: true, order: { id: order.id, orderNumber: order.orderNumber, total: order.total, paymentStatus: order.paymentStatus } });
      }

      const updated = await prisma.$transaction(async (tx) => {
        // Only one concurrent request can flip PENDING -> PAID
        const flipped = await tx.order.updateMany({
          where: { id: order.id, paymentStatus: { not: 'PAID' } },
          data: { paymentStatus: 'PAID', paymentId: razorpay_payment_id, fulfillmentStatus: 'PROCESSING' },
        });
        if (flipped.count === 0) return tx.order.findUniqueOrThrow({ where: { id: order.id } });

        const oversold: string[] = [];
        for (const item of order.items) {
          if (item.customUpload || !item.productId) continue;
          const dec = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (dec.count === 0) oversold.push(item.title);
        }

        if (oversold.length) {
          await tx.order.update({
            where: { id: order.id },
            data: { notes: [order.notes, `STOCK ALERT: insufficient stock at payment time for ${oversold.join(', ')}`].filter(Boolean).join('\n') },
          });
        }

        await tx.auditLog.create({
          data: {
            action: 'ORDER_PAID',
            entity: 'Order',
            entityId: order.id,
            details: { orderNumber: order.orderNumber, paymentId: razorpay_payment_id, total: order.total, oversold },
            ipAddress: clientIp(req),
          },
        });

        return tx.order.findUniqueOrThrow({ where: { id: order.id } });
      });

      return res.json({
        success: true,
        order: { id: updated.id, orderNumber: updated.orderNumber, total: updated.total, paymentStatus: updated.paymentStatus },
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Payment verification error');
      return res.status(500).json({ success: false, error: 'Could not confirm payment. Please contact support with your order number.' });
    }
  }
);

/**
 * GET /api/orders/:orderNumber?phone=XXXXXXXXXX
 * Order tracking. Requires the phone number used at checkout so order numbers
 * alone cannot be used to read another customer's personal details.
 */
router.get(
  '/orders/:id',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 30 }),
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const phone = typeof req.query.phone === 'string' ? digits(req.query.phone) : '';
      if (!id || id.length > 50 || phone.length !== 10) {
        return res.status(400).json({ success: false, error: 'Order number and the 10-digit phone number used at checkout are required.' });
      }

      const order = await prisma.order.findFirst({
        where: { OR: [{ id }, { orderNumber: id }] },
        include: {
          items: {
            select: { id: true, title: true, slug: true, size: true, quantity: true, price: true, orientation: true, fulfillmentStatus: true, trackingNumber: true },
          },
        },
      });

      if (!order || digits(order.customerPhone) !== phone) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const { razorpayOrderId: _r, notes: _n, ...publicOrder } = order;
      return res.json({ success: true, order: publicOrder });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Could not retrieve order details' });
    }
  }
);

export default router;
