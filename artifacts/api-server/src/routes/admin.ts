import { Router, type Request, type Response } from 'express';
import { prisma } from '@workspace/db';
import { z } from 'zod';
import { rateLimiter, requireAdminAuth, createAdminToken, isMasterApiKey } from '../middlewares/security';
import { isAcceptableImageInput, uploadBase64ToCloudinary } from '../lib/cloudinary';
import { clientIp, safeEqual, usableSecret } from '../lib/auth';
import { logger } from '../lib/logger';

/**
 * Wall art photo per frame colour, stored as `frame-image:<Colour>:<https url>`.
 * Uploads base64 photos to Cloudinary, drops anything that is not a safe https image,
 * and keeps one photo per colour. Other tags pass through untouched.
 */
const FRAME_IMAGE_COLORS = ['Black', 'Brown', 'White'];
async function resolveFrameImageTags(tags: unknown[], slug: string): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    if (!tag.toLowerCase().startsWith('frame-image:')) {
      out.push(tag);
      continue;
    }
    const rest = tag.slice('frame-image:'.length);
    const cut = rest.indexOf(':');
    if (cut < 0) continue;
    const color = FRAME_IMAGE_COLORS.find((c) => c.toLowerCase() === rest.slice(0, cut).trim().toLowerCase());
    let value = rest.slice(cut + 1).trim();
    if (!color || seen.has(color) || !isAcceptableImageInput(value)) continue;
    if (value.startsWith('data:')) {
      value = await uploadBase64ToCloudinary(value, `${String(slug).slice(0, 50)}_${color.toLowerCase()}_frame`);
    }
    if (!/^https:\/\/\S+$/i.test(value) || value.length > 2048) continue;
    seen.add(color);
    out.push(`frame-image:${color}:${value}`);
  }
  return out;
}

const router: Router = Router();

// In-memory brute force lockout store for admin login
interface FailedAttemptRecord {
  attempts: number;
  lockoutUntil: number;
}
const loginAttemptStore = new Map<string, FailedAttemptRecord>();

// Configurable credentials.
let currentAdminPassword = usableSecret(process.env.ADMIN_PASSWORD || 'Admin@Poster2026!', 10);
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@posterstudio.com').trim().toLowerCase();
if (!currentAdminPassword || !ADMIN_EMAIL) {
  logger.warn('Admin email/password login disabled: set ADMIN_EMAIL and a new ADMIN_PASSWORD (min 10 chars, not a previously leaked value).');
}

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
    const ip = clientIp(req);
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
    if (typeof adminKey === 'string' && isMasterApiKey(adminKey)) {
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
    const isValidUser =
      Boolean(currentAdminPassword && ADMIN_EMAIL) &&
      safeEqual(normalizedEmail, ADMIN_EMAIL) &&
      safeEqual(typeof password === 'string' ? password : '', currentAdminPassword);

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
  } catch (error: any) {
    console.error('CRITICAL ADMIN LOGIN ERROR:', error);
    logger.error({ err: error }, 'Admin login failed');
    return res.status(500).json({ success: false, error: error?.message || 'Login authentication failed' });
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
    if (!safeEqual(typeof currentPassword === 'string' ? currentPassword : '', currentAdminPassword)) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }
    if (typeof newPassword !== 'string' || !usableSecret(newPassword, 10)) {
      return res.status(400).json({ success: false, error: 'New password must be at least 10 characters long' });
    }
    currentAdminPassword = newPassword;
    return res.json({
      success: true,
      message: 'Admin password updated for this server instance. Also update ADMIN_PASSWORD in your hosting environment so it persists across restarts.',
    });
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
  sizePrices: z.record(z.string(), z.number()).optional(),
  sizeComparePrices: z.record(z.string(), z.number()).optional(),
  images: z
    .array(z.string().refine(isAcceptableImageInput, 'Images must be https URLs or PNG/JPEG/WEBP uploads under 8MB'))
    .min(1, 'At least one image URL is required')
    .max(10),
  tags: z.array(z.string()).default([]),
  stock: z.number().int().nonnegative().default(50),
  isBestSeller: z.boolean().default(false),
  isNewRelease: z.boolean().default(false),
  isTrending: z.boolean().optional(),
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
    const [orders, products, coupons, subscribers, sellerCounts, pendingListings] = await Promise.all([
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.product.findMany(),
      prisma.coupon.findMany(),
      prisma.newsletterSubscriber.count(),
      prisma.seller.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.product.count({ where: { approvalStatus: 'PENDING_REVIEW' } }),
    ]);

    const totalOrders = orders.length;
    // Revenue only counts orders whose payment was verified
    const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
    const totalRevenue = paidOrders.reduce((acc, o) => acc + o.total, 0);
    const sellerStatusCount = (st: string) => sellerCounts.find((c) => c.status === st)?._count._all ?? 0;
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

    for (const o of paidOrders) {
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
        totalSellers: sellerCounts.reduce((acc, c) => acc + c._count._all, 0),
        pendingSellers: sellerStatusCount('PENDING'),
        approvedSellers: sellerStatusCount('APPROVED'),
        pendingListings,
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
        take: Math.min(Math.max(Number(limit) || 100, 1), 500),
        skip: Math.max(Number(offset) || 0, 0),
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { seller: { select: { id: true, businessName: true } } } } },
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
    const id = String(req.params.id);
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
    const id = String(req.params.id);
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
    const id = String(req.params.id);
    const existing = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
    });
    if (existing) {
      await prisma.order.delete({ where: { id: existing.id } });
    }
    return res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete order' });
  }
});

router.post('/admin/orders', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const orderNumber = body.orderNumber || `DNG-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerName: body.customerName || 'Customer',
        customerEmail: body.customerEmail || 'customer@example.com',
        customerPhone: body.customerPhone || '9876543210',
        shippingAddress: body.shippingAddress || {},
        subtotal: Number(body.subtotal) || 0,
        shippingFee: Number(body.shippingFee) || 0,
        discount: Number(body.discount) || 0,
        total: Number(body.total) || 0,
        paymentStatus: body.paymentStatus || 'PAID',
        paymentMethod: body.paymentMethod || 'Manual Admin Order',
        fulfillmentStatus: body.fulfillmentStatus || 'PENDING',
        trackingNumber: body.trackingNumber || null,
        notes: body.notes || null,
        items: {
          create: (body.items || []).map((item: any) => ({
            productId: item.productId || item.id || null,
            title: item.title || item.productTitle || 'Custom Print',
            slug: item.slug || null,
            size: item.size || 'A4',
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0,
            orientation: item.orientation || 'portrait',
            customUpload: item.customUpload || null,
          })),
        },
      },
      include: { items: true },
    });
    return res.status(201).json({ success: true, order: newOrder });
  } catch (error: any) {
    console.error('Create admin order error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create manual order' });
  }
});

router.put('/admin/orders/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const body = req.body;
    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: {
        customerName: body.customerName !== undefined ? body.customerName : existing.customerName,
        customerEmail: body.customerEmail !== undefined ? body.customerEmail : existing.customerEmail,
        customerPhone: body.customerPhone !== undefined ? body.customerPhone : existing.customerPhone,
        shippingAddress: body.shippingAddress !== undefined ? body.shippingAddress : existing.shippingAddress,
        total: body.total !== undefined ? Number(body.total) : existing.total,
        paymentStatus: body.paymentStatus !== undefined ? body.paymentStatus : existing.paymentStatus,
        fulfillmentStatus: body.fulfillmentStatus !== undefined ? body.fulfillmentStatus : existing.fulfillmentStatus,
        trackingNumber: body.trackingNumber !== undefined ? body.trackingNumber : existing.trackingNumber,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
      include: { items: true },
    });
    return res.json({ success: true, order: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update order' });
  }
});

// ==============================================================================
// 3. PRODUCT CATALOG CRUD
// ==============================================================================

router.get('/admin/products', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { category, search, approval, sellerId } = req.query;
    const where: any = {};
    if (category && category !== 'all') {
      where.category = String(category);
    }
    if (typeof approval === 'string' && ['PENDING_REVIEW', 'APPROVED', 'REJECTED'].includes(approval)) {
      where.approvalStatus = approval;
    }
    if (typeof sellerId === 'string' && sellerId) {
      where.sellerId = sellerId === 'store' ? null : sellerId;
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
      include: { seller: { select: { id: true, businessName: true, storeSlug: true, status: true } } },
    });

    return res.json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve products' });
  }
});

router.post('/admin/upload-image', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { image, name } = req.body;
    if (typeof image !== 'string' || !isAcceptableImageInput(image)) {
      return res.status(400).json({ success: false, error: 'Please upload a PNG, JPEG or WEBP image under 8MB.' });
    }
    const cdnUrl = await uploadBase64ToCloudinary(image, String(name || 'poster').slice(0, 60));
    return res.json({ success: true, url: cdnUrl });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message || 'Upload failed' });
  }
});

router.post('/admin/products', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const parsed = ProductMutationSchema.safeParse(req.body);
    if (!parsed.success) {
      const issueSummary = parsed.error.issues
        .map((iss) => `${iss.path.join('.')}: ${iss.message}`)
        .join('; ');
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: `Error 400 (Bad Request): ${issueSummary || 'Invalid product details provided.'}`,
        details: parsed.error.format(),
      });
    }

    const { isTrending, ...rawProductData } = parsed.data as any;
    const productData = { ...rawProductData };
    if (isTrending) {
      productData.isStaffPick = true;
      if (!Array.isArray(productData.tags)) productData.tags = [];
      if (!productData.tags.some((t: string) => t.toLowerCase() === 'trending')) {
        productData.tags.push('trending');
      }
    }

    if (Array.isArray(productData.tags)) productData.tags = await resolveFrameImageTags(productData.tags, productData.slug || 'wall-art');

    // Automatically convert any base64 images to Cloudinary CDN URLs before DB save
    if (Array.isArray(productData.images) && productData.images.length > 0) {
      productData.images = await Promise.all(
        productData.images.map((img: string, idx: number) =>
          uploadBase64ToCloudinary(img, `${productData.slug || 'product'}_${idx}`)
        )
      );
    }

    const newProduct = await prisma.product.create({
      data: productData,
    });

    return res.status(201).json({ success: true, product: newProduct });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        error: `Error 409 (Conflict): A poster with the URL slug "${req.body?.slug || ''}" already exists. Please customize the slug.`,
      });
    }
    return res.status(500).json({
      success: false,
      statusCode: 500,
      error: 'Error 500 (Internal Server Error): Could not create the product. Check the image uploads and try again.',
    });
  }
});

router.put('/admin/products/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const parsed = ProductMutationSchema.safeParse(req.body);
    if (!parsed.success) {
      const issueSummary = parsed.error.issues
        .map((iss) => `${iss.path.join('.')}: ${iss.message}`)
        .join('; ');
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: `Error 400 (Bad Request): ${issueSummary || 'Invalid product update details.'}`,
        details: parsed.error.format(),
      });
    }

    // Updates must target the existing database record. Creating here when an
    // id is stale can silently turn an edit into a duplicate product.
    const existing = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const { isTrending, ...rawProductData } = parsed.data as any;
    const productData = { ...rawProductData };
    if (isTrending !== undefined) {
      if (!Array.isArray(productData.tags)) productData.tags = [];
      if (isTrending) {
        productData.isStaffPick = true;
        if (!productData.tags.some((t: string) => t.toLowerCase() === 'trending')) {
          productData.tags.push('trending');
        }
      } else {
        productData.tags = productData.tags.filter((t: string) => t.toLowerCase() !== 'trending');
      }
    }

    if (Array.isArray(productData.tags)) productData.tags = await resolveFrameImageTags(productData.tags, productData.slug || String(req.params.id));

    // Automatically convert any base64 images to Cloudinary CDN URLs before DB update
    if (Array.isArray(productData.images) && productData.images.length > 0) {
      productData.images = await Promise.all(
        productData.images.map((img: string, idx: number) =>
          uploadBase64ToCloudinary(img, `${productData.slug || 'product'}_${idx}`)
        )
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id: existing.id },
      data: productData,
    });

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        error: `Error 409 (Conflict): A poster with the URL slug "${req.body?.slug || ''}" already exists.`,
      });
    }
    return res.status(500).json({
      success: false,
      statusCode: 500,
      error: 'Error 500 (Internal Server Error): Could not update the product. Check the image uploads and try again.',
    });
  }
});

router.delete('/admin/products/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });
    if (existing) {
      await prisma.product.delete({ where: { id: existing.id } });
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
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
    const id = String(req.params.id);
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
    const id = String(req.params.id);
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
    const id = String(req.params.id);
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
      orderBy: { subscribedAt: 'desc' },
    });
    return res.json({ success: true, subscribers });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve subscribers' });
  }
});

router.post('/admin/subscribers', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email is required' });
    }
    const sub = await prisma.newsletterSubscriber.upsert({
      where: { email: email.trim().toLowerCase() },
      create: { email: email.trim().toLowerCase() },
      update: {},
    });
    return res.status(201).json({ success: true, subscriber: sub });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to add subscriber' });
  }
});

router.delete('/admin/subscribers/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.newsletterSubscriber.findFirst({
      where: { OR: [{ id }, { email: id }] },
    });
    if (existing) {
      await prisma.newsletterSubscriber.delete({ where: { id: existing.id } });
    }
    return res.json({ success: true, message: 'Subscriber deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete subscriber' });
  }
});

export default router;
