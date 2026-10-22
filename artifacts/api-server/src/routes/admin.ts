import { Router, type Request, type Response } from 'express';
import { prisma } from '@workspace/db';
import { z } from 'zod';
import { rateLimiter, requireAdminAuth, createAdminToken } from '../middlewares/security';

const router: Router = Router();

// In-memory brute force lockout store for admin login
interface FailedAttemptRecord {
  attempts: number;
  lockoutUntil: number;
}
const loginAttemptStore = new Map<string, FailedAttemptRecord>();

// Configurable credentials
let currentAdminPassword = process.env.ADMIN_PASSWORD || 'Admin@Poster2026!';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@posterstudio.com').toLowerCase();
const MASTER_KEY = process.env.ADMIN_API_KEY || 'dungeons_adm_sec_9941a87b1c3e04e2';

// Clean up stale login attempts every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttemptStore.entries()) {
    if (now > record.lockoutUntil) loginAttemptStore.delete(key);
  }
}, 15 * 60 * 1000);

// ==============================================================================
// 0. ADMIN AUTHENTICATION & SECURITY GATES
// ==============================================================================

/**
 * POST /api/admin/auth/login
 * High-security login with brute-force lockout (5 attempts / 15m)
 */
router.post('/admin/auth/login', rateLimiter({ windowMs: 60 * 1000, maxRequests: 20 }), async (req: Request, res: Response) => {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const attemptRecord = loginAttemptStore.get(ip) || { attempts: 0, lockoutUntil: 0 };

    if (attemptRecord.lockoutUntil > now) {
      const waitSeconds = Math.ceil((attemptRecord.lockoutUntil - now) / 1000);
      return res.status(429).json({
        success: false,
        error: `Account temporarily locked due to consecutive failed attempts. Please retry in ${waitSeconds} seconds.`,
        lockoutSeconds: waitSeconds,
      });
    }

    const { email, password, adminKey } = req.body;

    // Direct Master Key login
    if (adminKey && adminKey === MASTER_KEY) {
      loginAttemptStore.delete(ip);
      const token = createAdminToken('master@dungeons.com', 'ROOT_ADMIN', 'Master Admin');
      return res.json({
        success: true,
        token,
        admin: {
          email: 'master@dungeons.com',
          name: 'Master Admin',
          role: 'ROOT_ADMIN',
        },
      });
    }

    // Email + Password login
    const normalizedEmail = (email || '').trim().toLowerCase();
    const isValidUser = normalizedEmail === ADMIN_EMAIL && password === currentAdminPassword;

    if (!isValidUser) {
      attemptRecord.attempts += 1;
      if (attemptRecord.attempts >= 5) {
        attemptRecord.lockoutUntil = now + 15 * 60 * 1000; // 15 minutes lockout
      }
      loginAttemptStore.set(ip, attemptRecord);

      const remainingAttempts = Math.max(0, 5 - attemptRecord.attempts);
      return res.status(401).json({
        success: false,
        error: remainingAttempts > 0
          ? `Invalid credentials. ${remainingAttempts} attempts remaining before temporary lockout.`
          : 'Too many failed login attempts. Portal locked for 15 minutes.',
        remainingAttempts,
      });
    }

    // Login successful
    loginAttemptStore.delete(ip);
    const token = createAdminToken(ADMIN_EMAIL, 'SUPER_ADMIN', 'Super Admin');

    return res.json({
      success: true,
      token,
      admin: {
        email: ADMIN_EMAIL,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
      expiresIn: '24h',
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Login authentication failed' });
  }
});

/**
 * GET /api/admin/auth/verify
 * Validates current session token
 */
router.get('/admin/auth/verify', requireAdminAuth, async (req: Request, res: Response) => {
  return res.json({
    success: true,
    valid: true,
    admin: (req as any).adminUser || { name: 'Super Admin', role: 'SUPER_ADMIN' },
  });
});

/**
 * POST /api/admin/auth/change-password
 * Allows changing the admin password securely
 */
router.post('/admin/auth/change-password', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (currentPassword !== currentAdminPassword) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long' });
    }
    currentAdminPassword = newPassword;
    return res.json({ success: true, message: 'Admin password updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update password' });
  }
});

// Zod Schema for Product creation and update
const ProductMutationSchema = z.object({
  title: z.string().min(2).max(250),
  slug: z.string().min(2).max(250),
  description: z.string().optional().default(''),
  category: z.string().min(1).max(100),
  orientation: z.enum(['portrait', 'landscape', 'square']).default('portrait'),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional().nullable(),
  images: z.array(z.string()).min(1, 'At least one image URL is required'),
  tags: z.array(z.string()).default([]),
  stock: z.number().int().nonnegative().default(50),
  isBestSeller: z.boolean().default(false),
  isNewRelease: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// Zod Schema for Coupon mutation
const CouponMutationSchema = z.object({
  code: z.string().min(2).max(30),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']).default('percentage'),
  discountValue: z.number().positive(),
  minSpend: z.number().nonnegative().default(0),
  minQty: z.number().int().min(1).default(1),
  maxDiscount: z.number().positive().optional().nullable(),
  isActive: z.boolean().default(true),
  expiresAt: z.string().datetime().optional().nullable(),
});

// Zod Schema for Order Status update
const UpdateOrderStatusSchema = z.object({
  fulfillmentStatus: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  trackingNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ==============================================================================
// 1. DASHBOARD ANALYTICS & METRICS
// ==============================================================================

router.get('/admin/stats', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const [orders, products, coupons, subscribers] = await Promise.all([
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.product.findMany(),
      prisma.coupon.findMany(),
      prisma.newsletterSubscriber.count(),
    ]);

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((acc, o) => acc + (o.paymentStatus === 'PAID' ? o.total : o.total), 0);
    const pendingOrders = orders.filter((o) => o.fulfillmentStatus === 'PENDING').length;
    const processingOrders = orders.filter((o) => o.fulfillmentStatus === 'PROCESSING').length;
    const shippedOrders = orders.filter((o) => o.fulfillmentStatus === 'SHIPPED').length;
    const deliveredOrders = orders.filter((o) => o.fulfillmentStatus === 'DELIVERED').length;
    const totalProducts = products.length;

    // Distinct customer emails
    const uniqueEmails = new Set(orders.map((o) => o.customerEmail.toLowerCase()));
    const totalCustomers = uniqueEmails.size;

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    for (const p of products) {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    }

    // Daily Sales Trend (Last 7 days)
    const salesByDay: Record<string, { date: string; sales: number; orders: number }> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const displayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      salesByDay[dateKey] = { date: displayLabel, sales: 0, orders: 0 };
    }

    for (const o of orders) {
      const dateKey = new Date(o.createdAt).toISOString().split('T')[0];
      if (salesByDay[dateKey]) {
        salesByDay[dateKey].sales += o.total;
        salesByDay[dateKey].orders += 1;
      }
    }

    const salesTrend = Object.values(salesByDay);

    return res.json({
      success: true,
      stats: {
        totalRevenue: Math.round(totalRevenue),
        totalOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        totalProducts,
        totalCustomers,
        totalCoupons: coupons.length,
        totalSubscribers: subscribers,
        databaseConnected: true,
      },
      salesTrend,
      categoryDistribution: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })),
      recentOrders: orders.slice(0, 8),
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ success: false, error: 'Could not fetch dashboard analytics' });
  }
});

// ==============================================================================
// 2. ORDER MANAGEMENT & STATUS TRACKING
// ==============================================================================

router.get('/admin/orders', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { status, search, limit = '100', offset = '0' } = req.query;

    const where: any = {};
    if (status && status !== 'all') {
      where.fulfillmentStatus = String(status).toUpperCase();
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({ success: true, orders, total });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve orders' });
  }
});

router.get('/admin/orders/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    return res.json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve order' });
  }
});

router.patch('/admin/orders/:id/status', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = UpdateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid status update', details: parsed.error.format() });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: parsed.data as any,
      include: { items: true },
    });

    await prisma.auditLog.create({
      data: {
        action: 'ORDER_STATUS_UPDATED',
        entity: 'Order',
        entityId: id,
        details: parsed.data as any,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    return res.json({ success: true, order: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

router.delete('/admin/orders/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.order.delete({ where: { id } });
    return res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete order' });
  }
});

// ==============================================================================
// 3. PRODUCT CATALOG CRUD
// ==============================================================================

router.get('/admin/products', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;
    const where: any = {};
    if (category && category !== 'all') {
      where.category = String(category);
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ isBestSeller: 'desc' }, { createdAt: 'desc' }],
    });

    return res.json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve products' });
  }
});

router.post('/admin/products', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const parsed = ProductMutationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid product data', details: parsed.error.format() });
    }

    const newProduct = await prisma.product.create({
      data: parsed.data,
    });

    return res.status(201).json({ success: true, product: newProduct });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'A product with this URL slug already exists.' });
    }
    return res.status(500).json({ success: false, error: 'Could not create product' });
  }
});

router.put('/admin/products/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = ProductMutationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid product data', details: parsed.error.format() });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: parsed.data,
    });

    return res.json({ success: true, product: updatedProduct });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Could not update product' });
  }
});

router.delete('/admin/products/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    return res.json({ success: true, message: 'Product deleted from database' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Could not delete product' });
  }
});

// ==============================================================================
// 4. COUPONS CRUD
// ==============================================================================

router.get('/admin/coupons', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, coupons });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve coupons' });
  }
});

router.post('/admin/coupons', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const parsed = CouponMutationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid coupon data', details: parsed.error.format() });
    }

    const data = {
      ...parsed.data,
      code: parsed.data.code.trim().toUpperCase(),
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    };

    const newCoupon = await prisma.coupon.create({ data });
    return res.status(201).json({ success: true, coupon: newCoupon });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Coupon code already exists' });
    }
    return res.status(500).json({ success: false, error: 'Could not create coupon' });
  }
});

router.put('/admin/coupons/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = CouponMutationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid coupon data', details: parsed.error.format() });
    }

    const data = {
      ...parsed.data,
      code: parsed.data.code.trim().toUpperCase(),
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    };

    const updated = await prisma.coupon.update({
      where: { id },
      data,
    });
    return res.json({ success: true, coupon: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Could not update coupon' });
  }
});

router.delete('/admin/coupons/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.coupon.delete({ where: { id } });
    return res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Could not delete coupon' });
  }
});

// ==============================================================================
// 5. CATEGORIES
// ==============================================================================

router.get('/admin/categories', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({ select: { category: true } });
    const counts: Record<string, number> = {};
    for (const p of products) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return res.json({
      success: true,
      categories: Object.entries(counts).map(([name, count]) => ({ name, count })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve categories' });
  }
});

// Toggle coupon status
router.patch('/admin/coupons/:id/toggle', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Coupon not found' });
    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    return res.json({ success: true, coupon: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to toggle coupon' });
  }
});

// Newsletter subscribers list
router.get('/admin/subscribers', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, subscribers });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve subscribers' });
  }
});

export default router;
