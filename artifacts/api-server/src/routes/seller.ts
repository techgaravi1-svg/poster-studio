import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { prisma, type Seller } from '@workspace/db';
import { z } from 'zod';
import {
  createSellerToken,
  rateLimiter,
  requireSellerAuth,
  sellerAuthConfigured,
  type SellerSessionPayload,
} from '../middlewares/security';
import { clientIp, hashPassword, verifyPassword } from '../lib/auth';
import { isAcceptableImageInput, uploadBase64ToCloudinary } from '../lib/cloudinary';
import { isPosterCategory } from '../lib/pricing';
import { round2, SELLABLE_CATEGORY_SLUGS, sellerEarnings, serializeSeller, slugify } from '../lib/marketplace';
import { logger } from '../lib/logger';

// ==============================================================================
// MARKETPLACE SELLER PORTAL API  (/api/seller/*)
// Sellers register -> admin approves -> seller lists products -> admin reviews
// each listing -> approved listings appear in the store -> seller ships orders.
// ==============================================================================

const router: Router = Router();

const PHONE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^[1-9]\d{5}$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_RE = /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/;

const normalizePhone = (v: string) => v.replace(/\D/g, '').slice(-10);
const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const categoryEnum = z.enum(SELLABLE_CATEGORY_SLUGS as [string, ...string[]]);

/** Fields for a seller account. Accounts are created by an admin (see admin-sellers.ts). */
export const SellerAccountSchema = z.object({
  // Only email + password are required. Everything else is optional and can be
  // filled in later by the seller under "Profile & payouts".
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  ownerName: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(100).optional()),
  businessName: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(100).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().transform(normalizePhone).refine((v) => PHONE_RE.test(v), 'Enter a valid 10-digit Indian mobile number').optional()),
  gstin: z.preprocess(emptyToUndefined, z.string().transform((v) => v.trim().toUpperCase()).refine((v) => GSTIN_RE.test(v), 'Invalid GSTIN').optional()),
  pan: z.preprocess(emptyToUndefined, z.string().transform((v) => v.trim().toUpperCase()).refine((v) => PAN_RE.test(v), 'Invalid PAN').optional()),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  categories: z.array(categoryEnum).max(SELLABLE_CATEGORY_SLUGS.length).optional(),
  addressLine: z.preprocess(emptyToUndefined, z.string().trim().min(5).max(300).optional()),
  city: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(100).optional()),
  state: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(100).optional()),
  pincode: z.preprocess(emptyToUndefined, z.string().trim().refine((v) => PINCODE_RE.test(v), 'Enter a valid 6-digit PIN code').optional()),
});

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().min(1).max(128),
});

const ProfileUpdateSchema = z.object({
  ownerName: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(100).optional()),
  businessName: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(100).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().transform(normalizePhone).refine((v) => PHONE_RE.test(v), 'Enter a valid 10-digit mobile number').optional()),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  categories: z.array(categoryEnum).max(SELLABLE_CATEGORY_SLUGS.length).optional(),
  addressLine: z.preprocess(emptyToUndefined, z.string().trim().min(5).max(300).optional()),
  city: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(100).optional()),
  state: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(100).optional()),
  pincode: z.preprocess(emptyToUndefined, z.string().trim().refine((v) => PINCODE_RE.test(v), 'Enter a valid 6-digit PIN code').optional()),
  gstin: z.preprocess(emptyToUndefined, z.string().transform((v) => v.trim().toUpperCase()).refine((v) => GSTIN_RE.test(v), 'Invalid GSTIN').optional()),
  pan: z.preprocess(emptyToUndefined, z.string().transform((v) => v.trim().toUpperCase()).refine((v) => PAN_RE.test(v), 'Invalid PAN').optional()),
  bankAccountName: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(100).optional()),
  bankAccountNumber: z.preprocess(emptyToUndefined, z.string().trim().regex(/^\d{9,18}$/, 'Account number must be 9-18 digits').optional()),
  bankIfsc: z.preprocess(emptyToUndefined, z.string().transform((v) => v.trim().toUpperCase()).refine((v) => IFSC_RE.test(v), 'Invalid IFSC code').optional()),
  upiId: z.preprocess(emptyToUndefined, z.string().trim().refine((v) => UPI_RE.test(v), 'Invalid UPI ID').optional()),
});

const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

const posterSizePrices = z
  .object({ A5: z.number().positive().max(100000), A4: z.number().positive().max(100000), A3: z.number().positive().max(100000) })
  .partial();

const SellerProductSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().min(10).max(3000),
    category: categoryEnum,
    orientation: z.enum(['portrait', 'landscape', 'square']).default('portrait'),
    price: z.number().positive().max(500000),
    compareAtPrice: z.number().positive().max(1000000).optional().nullable(),
    sizePrices: posterSizePrices.optional(),
    stock: z.number().int().min(0).max(100000),
    // Only fresh uploads or images already on our Cloudinary account (no external hotlinks)
    images: z
      .array(
        z
          .string()
          .refine(
            (v) => isAcceptableImageInput(v) && (v.startsWith('data:image/') || v.startsWith('https://res.cloudinary.com/')),
            'Images must be PNG/JPEG/WEBP uploads under 8MB',
          ),
      )
      .min(1, 'Add at least one product photo')
      .max(6, 'Up to 6 photos per listing'),
    tags: z.array(z.string().trim().min(1).max(30)).max(15).default([]),
    isActive: z.boolean().default(true),
  })
  .refine((d) => d.compareAtPrice == null || d.compareAtPrice >= d.price, {
    message: 'MRP (compare-at price) must be greater than or equal to the selling price',
    path: ['compareAtPrice'],
  });

const ItemStatusSchema = z.object({
  fulfillmentStatus: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED']),
  trackingNumber: z.string().trim().max(100).optional().nullable(),
});

export function zodMessage(error: z.ZodError): string {
  return error.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)).join('; ');
}

/** Loads the signed-in seller; optionally requires an APPROVED account. Sends the error response itself. */
async function loadSeller(req: Request, res: Response, opts: { requireApproved?: boolean } = {}): Promise<Seller | null> {
  const session = (req as any).sellerSession as SellerSessionPayload;
  const seller = await prisma.seller.findUnique({ where: { id: session.sellerId } });
  if (!seller) {
    res.status(401).json({ success: false, error: 'Seller account not found. Please sign in again.', code: 'SELLER_UNAUTHORIZED' });
    return null;
  }
  if (opts.requireApproved && seller.status !== 'APPROVED') {
    const reason =
      seller.status === 'PENDING'
        ? 'Your seller account is under review. You can list products once it is approved.'
        : seller.status === 'SUSPENDED'
          ? 'Your seller account is suspended. Please contact support.'
          : 'Your seller application was not approved.';
    res.status(403).json({ success: false, error: reason, code: `SELLER_${seller.status}` });
    return null;
  }
  return seller;
}

export async function uniqueStoreSlug(base: string): Promise<string> {
  const root = slugify(base) || 'store';
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? root : `${root}-${crypto.randomBytes(2).toString('hex')}`;
    const taken = await prisma.seller.findUnique({ where: { storeSlug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${root}-${crypto.randomBytes(4).toString('hex')}`;
}

function notConfigured(res: Response) {
  return res.status(503).json({ success: false, error: 'Seller accounts are not available right now. Please try again later.' });
}

// In-memory lockout for repeated failed seller logins (per email + IP)
const failedLogins = new Map<string, { count: number; until: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of failedLogins) if (v.until < now) failedLogins.delete(k);
}, 15 * 60 * 1000).unref?.();

// A fixed hash so unknown emails take the same time as wrong passwords
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'));

// ------------------------------------------------------------------------------
// AUTH
// ------------------------------------------------------------------------------

// Self-registration is turned off: sellers apply through the "Partner With Us"
// email, and an admin creates their account (POST /api/admin/sellers).
router.post('/seller/register', (_req: Request, res: Response) => {
  return res.status(403).json({
    success: false,
    error: 'Seller accounts are created by the DUNGEONS team. Please use "Partner With Us" to send your details.',
    code: 'SELLER_SIGNUP_CLOSED',
  });
});

router.post('/seller/login', rateLimiter({ windowMs: 60 * 1000, maxRequests: 10 }), async (req: Request, res: Response) => {
  if (!sellerAuthConfigured()) return notConfigured(res);
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: 'Enter your email and password.' });
    const { email, password } = parsed.data;

    const key = `${email}|${clientIp(req)}`;
    const lock = failedLogins.get(key);
    if (lock && lock.count >= 5 && lock.until > Date.now()) {
      return res.status(429).json({ success: false, error: 'Too many failed attempts. Please wait 15 minutes and try again.' });
    }

    const seller = await prisma.seller.findUnique({ where: { email } });
    const ok = verifyPassword(password, seller?.passwordHash || DUMMY_HASH) && Boolean(seller);
    if (!ok || !seller) {
      const rec = lock && lock.until > Date.now() ? lock : { count: 0, until: 0 };
      rec.count += 1;
      rec.until = Date.now() + 15 * 60 * 1000;
      failedLogins.set(key, rec);
      return res.status(401).json({ success: false, error: 'Incorrect email or password.' });
    }

    failedLogins.delete(key);
    return res.json({ success: true, token: createSellerToken(seller.id, seller.email), seller: serializeSeller(seller) });
  } catch (error) {
    logger.error({ err: error }, 'Seller login failed');
    return res.status(500).json({ success: false, error: 'Sign in failed. Please try again.' });
  }
});

// ------------------------------------------------------------------------------
// PROFILE
// ------------------------------------------------------------------------------

router.get('/seller/me', requireSellerAuth, async (req: Request, res: Response) => {
  try {
    const seller = await loadSeller(req, res);
    if (!seller) return;
    return res.json({ success: true, seller: serializeSeller(seller) });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Could not load your seller profile.' });
  }
});

router.put('/seller/me', requireSellerAuth, async (req: Request, res: Response) => {
  try {
    const seller = await loadSeller(req, res);
    if (!seller) return;
    const parsed = ProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: zodMessage(parsed.error) });

    const updated = await prisma.seller.update({ where: { id: seller.id }, data: parsed.data });
    return res.json({ success: true, seller: serializeSeller(updated) });
  } catch (error) {
    logger.error({ err: error }, 'Seller profile update failed');
    return res.status(500).json({ success: false, error: 'Could not update your profile.' });
  }
});

router.post('/seller/me/password', requireSellerAuth, rateLimiter({ windowMs: 60 * 1000, maxRequests: 5 }), async (req: Request, res: Response) => {
  try {
    const seller = await loadSeller(req, res);
    if (!seller) return;
    const parsed = PasswordChangeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: 'New password must be at least 8 characters.' });
    if (!verifyPassword(parsed.data.currentPassword, seller.passwordHash)) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
    }
    await prisma.seller.update({ where: { id: seller.id }, data: { passwordHash: hashPassword(parsed.data.newPassword) } });
    return res.json({ success: true, message: 'Password updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Could not update password.' });
  }
});

// ------------------------------------------------------------------------------
// DASHBOARD
// ------------------------------------------------------------------------------

router.get('/seller/dashboard', requireSellerAuth, async (req: Request, res: Response) => {
  try {
    const seller = await loadSeller(req, res);
    if (!seller) return;

    const [listingGroups, paidItems] = await Promise.all([
      prisma.product.groupBy({ by: ['approvalStatus'], where: { sellerId: seller.id }, _count: { _all: true } }),
      prisma.orderItem.findMany({
        where: { sellerId: seller.id, order: { paymentStatus: 'PAID' } },
        select: { price: true, quantity: true, commissionRate: true, fulfillmentStatus: true, orderId: true },
      }),
    ]);

    let gross = 0;
    let commission = 0;
    let net = 0;
    let unitsSold = 0;
    let awaitingShipment = 0;
    for (const item of paidItems) {
      const e = sellerEarnings(item.price, item.quantity, item.commissionRate ?? seller.commissionRate);
      gross += e.gross;
      commission += e.commission;
      net += e.net;
      unitsSold += item.quantity;
      if (item.fulfillmentStatus === 'PENDING' || item.fulfillmentStatus === 'PROCESSING') awaitingShipment += 1;
    }
    const countFor = (st: string) => listingGroups.find((g) => g.approvalStatus === st)?._count._all ?? 0;

    return res.json({
      success: true,
      seller: serializeSeller(seller),
      stats: {
        listings: {
          total: listingGroups.reduce((a, g) => a + g._count._all, 0),
          approved: countFor('APPROVED'),
          pendingReview: countFor('PENDING_REVIEW'),
          rejected: countFor('REJECTED'),
        },
        orders: new Set(paidItems.map((i) => i.orderId)).size,
        unitsSold,
        awaitingShipment,
        grossSales: round2(gross),
        commission: round2(commission),
        netEarnings: round2(net),
        commissionRate: seller.commissionRate,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Seller dashboard failed');
    return res.status(500).json({ success: false, error: 'Could not load your dashboard.' });
  }
});

// ------------------------------------------------------------------------------
// PRODUCTS (each new or materially edited listing goes to admin review)
// ------------------------------------------------------------------------------

router.get('/seller/products', requireSellerAuth, async (req: Request, res: Response) => {
  try {
    const seller = await loadSeller(req, res);
    if (!seller) return;
    const products = await prisma.product.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Could not load your products.' });
  }
});

router.post('/seller/upload-image', requireSellerAuth, rateLimiter({ windowMs: 60 * 1000, maxRequests: 30 }), async (req: Request, res: Response) => {
  try {
    const seller = await loadSeller(req, res, { requireApproved: true });
    if (!seller) return;
    const { image } = req.body || {};
    if (typeof image !== 'string' || !image.startsWith('data:image') || !isAcceptableImageInput(image)) {
      return res.status(400).json({ success: false, error: 'Please upload a PNG, JPEG or WEBP image under 8MB.' });
    }
    const url = await uploadBase64ToCloudinary(image, `seller_${seller.id}`);
    return res.json({ success: true, url });
  } catch (error: any) {
    return res.status(502).json({ success: false, error: error?.message || 'Upload failed.' });
  }
});

function buildProductData(input: z.infer<typeof SellerProductSchema>) {
  const poster = isPosterCategory(input.category);
  let sizePrices: Record<string, number> | undefined;
  let price = input.price;
  if (poster) {
    sizePrices = {
      A5: input.sizePrices?.A5 ?? input.price,
      A4: input.sizePrices?.A4 ?? Math.round(input.price * 1.5),
      A3: input.sizePrices?.A3 ?? Math.round(input.price * 2.2),
    };
    price = sizePrices.A5;
  }
  // Sellers cannot inject the internal pricing/rating tags the storefront parses
  const tags = input.tags.filter((t) => !/^(sizeprice|sizecompare|rating|reviews|avail-size|frame-color|wall-art-cat):/i.test(t) && t.toLowerCase() !== 'trending');
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    orientation: input.orientation,
    price,
    compareAtPrice: input.compareAtPrice ?? null,
    sizePrices: sizePrices ?? undefined,
    stock: input.stock,
    tags,
    isActive: input.isActive,
  };
}

async function uploadImages(images: string[], sellerId: string): Promise<string[]> {
  return Promise.all(images.map((img, i) => uploadBase64ToCloudinary(img, `seller_${sellerId}_${i}`)));
}

router.post('/seller/products', requireSellerAuth, rateLimiter({ windowMs: 60 * 1000, maxRequests: 20 }), async (req: Request, res: Response) => {
  try {
    const seller = await loadSeller(req, res, { requireApproved: true });
    if (!seller) return;
    const parsed = SellerProductSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: zodMessage(parsed.error) });

    const data = buildProductData(parsed.data);
    const images = await uploadImages(parsed.data.images, seller.id);
    const slug = `${slugify(parsed.data.title) || 'listing'}-${crypto.randomBytes(3).toString('hex')}`;

    const product = await prisma.product.create({
      data: { ...data, images, slug, sellerId: seller.id, approvalStatus: 'PENDING_REVIEW' },
    });
    return res.status(201).json({ success: true, product, message: 'Listing submitted for review. It will go live once approved.' });
  } catch (error: any) {
    logger.error({ err: error }, 'Seller product create failed');
    return res.status(error?.message?.includes('upload') ? 502 : 500).json({ success: false, error: error?.message?.includes('upload') ? error.message : 'Could not create the listing.' });
  }
});

router.put('/seller/products/:id', requireSellerAuth, rateLimiter({ windowMs: 60 * 1000, maxRequests: 30 }), async (req: Request, res: Response) => {
  try {
    const seller = await loadSeller(req, res, { requireApproved: true });
    if (!seller) return;
    const existing = await prisma.product.findFirst({ where: { id: String(req.params.id), sellerId: seller.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Listing not found.' });

    const parsed = SellerProductSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: zodMessage(parsed.error) });

    const data = buildProductData(parsed.data);
    const images = await uploadImages(parsed.data.images, seller.id);

    // Content changes (what shoppers see) need re-review; price/stock/pause do not.
    const contentChanged =
      data.title !== existing.title ||
      data.description !== (existing.description || '') ||
      data.category !== existing.category ||
      data.orientation !== existing.orientation ||
      JSON.stringify(images) !== JSON.stringify(existing.images);
    const needsReview = contentChanged || existing.approvalStatus === 'REJECTED';

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...data,
        images,
        ...(needsReview ? { approvalStatus: 'PENDING_REVIEW' as const, rejectionReason: null } : {}),
      },
    });
    return res.json({
      success: true,
      product,
      message: needsReview ? 'Changes submitted for review.' : 'Listing updated.',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Seller product update failed');
    return res.status(500).json({ success: false, error: error?.message?.includes('upload') ? error.message : 'Could not update the listing.' });
  }
});

router.delete('/seller/products/:id', requireSellerAuth, async (req: Request, res: Response) => {
  try {
    const seller = await loadSeller(req, res);
    if (!seller) return;
    const result = await prisma.product.deleteMany({ where: { id: String(req.params.id), sellerId: seller.id } });
    if (result.count === 0) return res.status(404).json({ success: false, error: 'Listing not found.' });
    return res.json({ success: true, message: 'Listing deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Could not delete the listing.' });
  }
});

// ------------------------------------------------------------------------------
// ORDERS (only paid orders containing this seller's items)
// ------------------------------------------------------------------------------

router.get('/seller/orders', requireSellerAuth, async (req: Request, res: Response) => {
  try {
    const seller = await loadSeller(req, res);
    if (!seller) return;
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : '';
    const items = await prisma.orderItem.findMany({
      where: {
        sellerId: seller.id,
        order: { paymentStatus: 'PAID' },
        ...(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status) ? { fulfillmentStatus: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        order: {
          select: { id: true, orderNumber: true, createdAt: true, customerName: true, customerPhone: true, shippingAddress: true, fulfillmentStatus: true },
        },
      },
    });

    return res.json({
      success: true,
      items: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        title: i.title,
        size: i.size,
        quantity: i.quantity,
        price: i.price,
        fulfillmentStatus: i.fulfillmentStatus,
        trackingNumber: i.trackingNumber,
        createdAt: i.createdAt,
        earnings: sellerEarnings(i.price, i.quantity, i.commissionRate ?? seller.commissionRate),
        order: i.order,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, 'Seller orders failed');
    return res.status(500).json({ success: false, error: 'Could not load your orders.' });
  }
});

const STATUS_RANK = { PENDING: 0, PROCESSING: 1, SHIPPED: 2, DELIVERED: 3, CANCELLED: -1 } as const;

router.patch('/seller/orders/items/:id', requireSellerAuth, async (req: Request, res: Response) => {
  try {
    const seller = await loadSeller(req, res);
    if (!seller) return;
    const parsed = ItemStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: zodMessage(parsed.error) });

    const item = await prisma.orderItem.findFirst({
      where: { id: String(req.params.id), sellerId: seller.id, order: { paymentStatus: 'PAID' } },
      include: { order: { select: { id: true, fulfillmentStatus: true } } },
    });
    if (!item) return res.status(404).json({ success: false, error: 'Order item not found.' });
    if (item.order.fulfillmentStatus === 'CANCELLED' || item.fulfillmentStatus === 'CANCELLED') {
      return res.status(400).json({ success: false, error: 'This order was cancelled.' });
    }
    if (STATUS_RANK[parsed.data.fulfillmentStatus] < STATUS_RANK[item.fulfillmentStatus]) {
      return res.status(400).json({ success: false, error: `Cannot move an item from ${item.fulfillmentStatus} back to ${parsed.data.fulfillmentStatus}.` });
    }
    if (parsed.data.fulfillmentStatus === 'SHIPPED' && !(parsed.data.trackingNumber || item.trackingNumber)) {
      return res.status(400).json({ success: false, error: 'Add a courier tracking number when marking an item as shipped.' });
    }

    const updated = await prisma.orderItem.update({
      where: { id: item.id },
      data: {
        fulfillmentStatus: parsed.data.fulfillmentStatus,
        ...(parsed.data.trackingNumber !== undefined ? { trackingNumber: parsed.data.trackingNumber || null } : {}),
      },
    });

    // If every line in the order belongs to marketplace sellers, roll the order status up
    const siblings = await prisma.orderItem.findMany({ where: { orderId: item.orderId }, select: { sellerId: true, fulfillmentStatus: true } });
    if (siblings.every((s) => s.sellerId)) {
      const minRank = Math.min(...siblings.map((s) => STATUS_RANK[s.fulfillmentStatus]));
      const rolled = (Object.keys(STATUS_RANK) as Array<keyof typeof STATUS_RANK>).find((k) => STATUS_RANK[k] === minRank);
      if (rolled && rolled !== 'CANCELLED' && STATUS_RANK[rolled] > STATUS_RANK[item.order.fulfillmentStatus]) {
        await prisma.order.update({ where: { id: item.orderId }, data: { fulfillmentStatus: rolled } });
      }
    }

    await prisma.auditLog.create({
      data: {
        action: 'SELLER_ITEM_STATUS',
        entity: 'OrderItem',
        entityId: item.id,
        details: { sellerId: seller.id, status: parsed.data.fulfillmentStatus },
        ipAddress: clientIp(req),
      },
    });

    return res.json({ success: true, item: updated });
  } catch (error) {
    logger.error({ err: error }, 'Seller item status update failed');
    return res.status(500).json({ success: false, error: 'Could not update the order item.' });
  }
});

export default router;
