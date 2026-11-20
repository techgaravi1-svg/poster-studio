import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { prisma } from '@workspace/db';
import { z } from 'zod';
import { requireAdminAuth } from '../middlewares/security';
import { clientIp, hashPassword } from '../lib/auth';
import { SellerAccountSchema, uniqueStoreSlug, zodMessage } from './seller';
import { round2, sellerEarnings, serializeSeller } from '../lib/marketplace';
import { logger } from '../lib/logger';

// ==============================================================================
// ADMIN: MARKETPLACE SELLER MANAGEMENT & LISTING MODERATION
// ==============================================================================

const router: Router = Router();

/** Prisma P2021/P2022 = table/column missing: the marketplace schema has not been pushed yet. */
const SCHEMA_MISSING_ERROR =
  'Database not updated for sellers yet. Run "pnpm --filter @workspace/db run push", then restart the API.';
const isSchemaMissing = (error: any) => error?.code === 'P2021' || error?.code === 'P2022';

const SellerStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']),
  reason: z.string().trim().max(500).optional().nullable(),
  commissionRate: z.number().min(0).max(60).optional(),
});

const CreateSellerSchema = SellerAccountSchema.extend({
  commissionRate: z.number().min(0).max(60).optional(),
});

const ResetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const ListingReviewSchema = z.object({
  approvalStatus: z.enum(['APPROVED', 'REJECTED', 'PENDING_REVIEW']),
  reason: z.string().trim().max(500).optional().nullable(),
});

/** GET /api/admin/sellers?status=PENDING&search= */
router.get('/admin/sellers', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const where: any = {};
    if (['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].includes(status)) where.status = status;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const sellers = await prisma.seller.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 500,
      include: { _count: { select: { products: true } } },
    });

    const paidItems = await prisma.orderItem.findMany({
      where: { sellerId: { in: sellers.map((s) => s.id) }, order: { paymentStatus: 'PAID' } },
      select: { sellerId: true, price: true, quantity: true, commissionRate: true },
    });
    const totals = new Map<string, { gross: number; commission: number; net: number }>();
    for (const i of paidItems) {
      if (!i.sellerId) continue;
      const seller = sellers.find((s) => s.id === i.sellerId);
      const e = sellerEarnings(i.price, i.quantity, i.commissionRate ?? seller?.commissionRate);
      const t = totals.get(i.sellerId) || { gross: 0, commission: 0, net: 0 };
      t.gross += e.gross;
      t.commission += e.commission;
      t.net += e.net;
      totals.set(i.sellerId, t);
    }

    return res.json({
      success: true,
      sellers: sellers.map(({ _count, ...s }) => {
        const t = totals.get(s.id) || { gross: 0, commission: 0, net: 0 };
        return {
          ...serializeSeller(s),
          productCount: _count.products,
          grossSales: round2(t.gross),
          commissionEarned: round2(t.commission),
          payoutDue: round2(t.net),
        };
      }),
    });
  } catch (error) {
    logger.error({ err: error }, 'Admin sellers list failed');
    return res.status(500).json({ success: false, error: isSchemaMissing(error) ? SCHEMA_MISSING_ERROR : 'Failed to retrieve sellers' });
  }
});

/**
 * POST /api/admin/sellers
 * Admin creates a seller account (after reviewing their "Partner With Us" email).
 * The account is approved immediately; the admin shares the email + password with the seller.
 */
router.post('/admin/sellers', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const parsed = CreateSellerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: zodMessage(parsed.error) });
    const { password, commissionRate, ...input } = parsed.data;
    // Neutral placeholder name (never the email username, which would show publicly as "Sold by").
    // The seller can rename their store under "Profile & payouts".
    const placeholder = `Seller ${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const businessName = input.businessName || placeholder;
    const data = {
      ...input,
      businessName,
      ownerName: input.ownerName || businessName,
      phone: input.phone || '',
      addressLine: input.addressLine || '',
      city: input.city || '',
      state: input.state || '',
      pincode: input.pincode || '',
      categories: input.categories || [],
    };

    const existing = await prisma.seller.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existing) return res.status(409).json({ success: false, error: 'A seller with this email already exists.' });

    const seller = await prisma.seller.create({
      data: {
        ...data,
        storeSlug: await uniqueStoreSlug(data.businessName),
        passwordHash: hashPassword(password),
        status: 'APPROVED',
        approvedAt: new Date(),
        ...(commissionRate !== undefined ? { commissionRate } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'SELLER_CREATED_BY_ADMIN',
        entity: 'Seller',
        entityId: seller.id,
        details: { businessName: seller.businessName, by: (req as any).adminUser?.email },
        ipAddress: clientIp(req),
      },
    });

    return res.status(201).json({ success: true, seller: serializeSeller(seller) });
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(409).json({ success: false, error: 'A seller with this email already exists.' });
    logger.error({ err: error }, 'Admin seller create failed');
    return res.status(500).json({ success: false, error: isSchemaMissing(error) ? SCHEMA_MISSING_ERROR : 'Could not create the seller account.' });
  }
});

/** POST /api/admin/sellers/:id/password — set a new password for a seller (e.g. they forgot it). */
router.post('/admin/sellers/:id/password', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const parsed = ResetPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: zodMessage(parsed.error) });
    const id = String(req.params.id);
    const exists = await prisma.seller.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return res.status(404).json({ success: false, error: 'Seller not found' });

    await prisma.seller.update({ where: { id }, data: { passwordHash: hashPassword(parsed.data.password) } });
    await prisma.auditLog.create({
      data: { action: 'SELLER_PASSWORD_RESET', entity: 'Seller', entityId: id, details: { by: (req as any).adminUser?.email }, ipAddress: clientIp(req) },
    });
    return res.json({ success: true, message: 'Seller password updated.' });
  } catch (error) {
    logger.error({ err: error }, 'Admin seller password reset failed');
    return res.status(500).json({ success: false, error: 'Could not update the password.' });
  }
});

/** PATCH /api/admin/sellers/:id/status — approve, reject, suspend or reinstate a seller. */
router.patch('/admin/sellers/:id/status', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const parsed = SellerStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid seller status update' });
    const { status, reason, commissionRate } = parsed.data;

    if ((status === 'REJECTED' || status === 'SUSPENDED') && !reason) {
      return res.status(400).json({ success: false, error: 'Please give the seller a reason.' });
    }

    const existing = await prisma.seller.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Seller not found' });

    const seller = await prisma.seller.update({
      where: { id },
      data: {
        status,
        statusReason: status === 'APPROVED' ? null : reason || null,
        ...(commissionRate !== undefined ? { commissionRate } : {}),
        ...(status === 'APPROVED' && !existing.approvedAt ? { approvedAt: new Date() } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'SELLER_STATUS_UPDATED',
        entity: 'Seller',
        entityId: id,
        details: { from: existing.status, to: status, reason: reason || null, commissionRate: commissionRate ?? null, by: (req as any).adminUser?.email },
        ipAddress: clientIp(req),
      },
    });

    return res.json({ success: true, seller: serializeSeller(seller) });
  } catch (error) {
    logger.error({ err: error }, 'Admin seller status update failed');
    return res.status(500).json({ success: false, error: 'Failed to update seller' });
  }
});

/** GET /api/admin/listings?status=PENDING_REVIEW — seller listings awaiting moderation. */
router.get('/admin/listings', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : 'PENDING_REVIEW';
    const products = await prisma.product.findMany({
      where: {
        sellerId: { not: null },
        ...(['PENDING_REVIEW', 'APPROVED', 'REJECTED'].includes(status) ? { approvalStatus: status as any } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
      include: { seller: { select: { id: true, businessName: true, storeSlug: true, status: true, email: true } } },
    });
    return res.json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve listings' });
  }
});

/** PATCH /api/admin/products/:id/approval — approve or reject a seller listing. */
router.patch('/admin/products/:id/approval', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const parsed = ListingReviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid review decision' });
    const { approvalStatus, reason } = parsed.data;
    if (approvalStatus === 'REJECTED' && !reason) {
      return res.status(400).json({ success: false, error: 'Please tell the seller why the listing was rejected.' });
    }

    const product = await prisma.product.update({
      where: { id },
      data: { approvalStatus, rejectionReason: approvalStatus === 'REJECTED' ? reason : null },
      include: { seller: { select: { id: true, businessName: true } } },
    });

    await prisma.auditLog.create({
      data: {
        action: 'LISTING_REVIEWED',
        entity: 'Product',
        entityId: id,
        details: { approvalStatus, reason: reason || null, sellerId: product.sellerId, by: (req as any).adminUser?.email },
        ipAddress: clientIp(req),
      },
    });

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json({ success: true, product });
  } catch (error: any) {
    if (error?.code === 'P2025') return res.status(404).json({ success: false, error: 'Listing not found' });
    return res.status(500).json({ success: false, error: 'Failed to review listing' });
  }
});

export default router;
