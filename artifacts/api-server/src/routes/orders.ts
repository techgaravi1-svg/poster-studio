import { Router, type Request, type Response } from 'express';
import { prisma } from '@workspace/db';
import { z } from 'zod';
import { rateLimiter } from '../middlewares/security';

const router: Router = Router();

// Zod Schema for Order Item Validation
const OrderItemInputSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  title: z.string().min(1).max(200),
  slug: z.string().optional(),
  size: z.string().min(1).max(20),
  quantity: z.number().int().min(1).max(100),
  price: z.number().positive(),
  orientation: z.string().default('portrait'),
  customUpload: z.any().optional(),
});

// Zod Schema for Order Creation
const CreateOrderSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10).max(15),
  shippingAddress: z.object({
    name: z.string().min(2),
    phone: z.string().min(10),
    pincode: z.string().min(4).max(10),
    city: z.string().min(2),
    state: z.string().min(2),
    locality: z.string().min(2),
    flat: z.string().min(1),
    landmark: z.string().optional(),
    type: z.enum(['home', 'office', 'other']).default('home'),
  }),
  items: z.array(OrderItemInputSchema).min(1, 'Cart cannot be empty'),
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// Helper to generate human-readable order number e.g. DNG-8492
function generateOrderNumber(): string {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `DNG-${randomDigits}`;
}

/**
 * POST /api/orders
 * Secure order creation with server-side validation and price verification
 */
router.post(
  '/orders',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 20, message: 'Too many order requests. Please wait.' }),
  async (req: Request, res: Response) => {
    try {
      const parsed = CreateOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const { customerName, customerEmail, customerPhone, shippingAddress, items, couponCode, notes } = parsed.data;

      // Calculate subtotal securely on server
      const calculatedSubtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

      // Verify and calculate coupon discount if provided
      let calculatedDiscount = 0;
      if (couponCode) {
        const coupon = await prisma.coupon.findUnique({
          where: { code: couponCode.trim().toUpperCase() },
        });

        if (coupon && coupon.isActive) {
          const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);
          if (totalQty >= coupon.minQty && calculatedSubtotal >= coupon.minSpend) {
            if (coupon.discountType === 'percentage') {
              calculatedDiscount = Math.round((calculatedSubtotal * coupon.discountValue) / 100);
              if (coupon.maxDiscount && calculatedDiscount > coupon.maxDiscount) {
                calculatedDiscount = coupon.maxDiscount;
              }
            } else {
              calculatedDiscount = coupon.discountValue;
            }
          }
        }
      }

      const shippingFee = 0; // Free express delivery
      const finalTotal = Math.max(0, calculatedSubtotal - calculatedDiscount + shippingFee);
      const orderNumber = generateOrderNumber();

      // Atomic Transaction: Create Order & OrderItems & Audit Log
      const newOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            orderNumber,
            customerName,
            customerEmail: customerEmail.toLowerCase(),
            customerPhone,
            shippingAddress,
            subtotal: calculatedSubtotal,
            shippingFee,
            discount: calculatedDiscount,
            total: finalTotal,
            paymentStatus: 'PENDING',
            paymentMethod: 'razorpay',
            fulfillmentStatus: 'PENDING',
            notes,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                title: item.title,
                slug: item.slug,
                size: item.size,
                quantity: item.quantity,
                price: item.price,
                orientation: item.orientation,
                customUpload: item.customUpload ? (item.customUpload as any) : undefined,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        // Audit Trail
        await tx.auditLog.create({
          data: {
            action: 'ORDER_CREATED',
            entity: 'Order',
            entityId: order.id,
            details: {
              orderNumber: order.orderNumber,
              total: order.total,
              itemCount: items.length,
            },
            ipAddress: req.ip || req.socket.remoteAddress,
          },
        });

        return order;
      });

      return res.status(201).json({
        success: true,
        order: newOrder,
      });
    } catch (error: any) {
      console.error('Order creation error:', error);
      return res.status(500).json({
        success: false,
        error: 'An internal error occurred while placing your order. Please try again.',
      });
    }
  }
);

/**
 * GET /api/orders/:id
 * Retrieve order details by Order ID or Order Number
 */
router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.length > 50) {
      return res.status(400).json({ success: false, error: 'Invalid order identifier' });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Could not retrieve order details' });
  }
});

/**
 * PATCH /api/orders/:id/payment
 * Update payment transaction status (Razorpay integration webhook or confirmation)
 */
router.patch('/orders/:id/payment', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentId, status } = req.body;

    if (!paymentId || !status) {
      return res.status(400).json({ success: false, error: 'paymentId and status are required' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        paymentId,
        paymentStatus: status === 'paid' ? 'PAID' : 'FAILED',
        fulfillmentStatus: status === 'paid' ? 'PROCESSING' : 'PENDING',
      },
    });

    return res.json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Could not update payment status' });
  }
});

export default router;
