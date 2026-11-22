import { Router, type Request, type Response } from 'express';
import { prisma } from '@workspace/db';
import { z } from 'zod';
import { requireAdminAuth } from '../middlewares/security';

const router: Router = Router();

/** Only approved listings from first-party (sellerId null) or currently-approved sellers are public. */
const PUBLIC_LISTING_FILTER = {
  isActive: true,
  approvalStatus: 'APPROVED' as const,
  OR: [{ sellerId: null }, { seller: { status: 'APPROVED' as const } }],
};

const PUBLIC_SELLER_SELECT = { select: { businessName: true, storeSlug: true } } as const;

/**
 * GET /api/products
 * Fetch products with optional filtering by category and search
 */
/**
 * GET /api/catalog-version
 * Tiny, never-cached fingerprint of the public catalog. It changes whenever a
 * product is added, edited, deleted, hidden or approved, so the storefront can
 * request /api/products?v=<version> and still get instant updates while the
 * full list stays cached on the CDN between changes.
 */
router.get('/catalog-version', async (_req: Request, res: Response) => {
  try {
    const [total, publicCount, latest] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: PUBLIC_LISTING_FILTER }),
      prisma.product.aggregate({ _max: { updatedAt: true } }),
    ]);
    const stamp = latest._max.updatedAt ? latest._max.updatedAt.getTime() : 0;
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json({ success: true, version: `${total}-${publicCount}-${stamp}` });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to read catalog version' });
  }
});

router.get('/products', async (req: Request, res: Response) => {
  try {
    const { category, search, limit = '50', offset = '0' } = req.query;

    const and: any[] = [PUBLIC_LISTING_FILTER];

    if (category && typeof category === 'string' && category !== 'all' && category !== 'posters') {
      and.push({ category: { equals: category, mode: 'insensitive' } });
    }

    if (search && typeof search === 'string') {
      const term = search.slice(0, 100);
      and.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      });
    }
    const whereClause = { AND: and };
    const take = Math.min(Math.max(Number(limit) || 2000, 1), 5000);
    const skip = Math.max(Number(offset) || 0, 0);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        take,
        skip,
        orderBy: [{ isBestSeller: 'desc' }, { createdAt: 'desc' }],
        include: { seller: PUBLIC_SELLER_SELECT },
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    // Versioned URLs (?v=) are immutable snapshots: cache them hard on the CDN.
    // Un-versioned requests (older clients) get a short cache so edits/deletes show within about a minute.
    res.setHeader(
      'Cache-Control',
      typeof req.query.v === 'string' && req.query.v
        ? 'public, max-age=60, s-maxage=86400'
        : 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
    );
    return res.json({
      success: true,
      products,
      pagination: {
        total,
        limit: take,
        offset: skip,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/products/:slug
 * Fetch a single product by slug or id
 */
router.get('/products/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);

    const product = await prisma.product.findFirst({
      where: {
        AND: [PUBLIC_LISTING_FILTER, { OR: [{ slug }, { id: slug }] }],
      },
      include: { seller: PUBLIC_SELLER_SELECT },
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=120');
    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch product details' });
  }
});

/**
 * GET /api/stores/:storeSlug
 * Public marketplace storefront for an approved seller.
 */
router.get('/stores/:storeSlug', async (req: Request, res: Response) => {
  try {
    const storeSlug = String(req.params.storeSlug).slice(0, 120);
    const seller = await prisma.seller.findFirst({
      where: { storeSlug, status: 'APPROVED' },
      select: { id: true, businessName: true, storeSlug: true, description: true, city: true, state: true, categories: true, approvedAt: true },
    });
    if (!seller) return res.status(404).json({ success: false, error: 'Store not found' });

    const products = await prisma.product.findMany({
      where: { sellerId: seller.id, isActive: true, approvalStatus: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { seller: PUBLIC_SELLER_SELECT },
    });

    const { id: _id, ...publicSeller } = seller;
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return res.json({ success: true, store: publicSeller, products });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch store' });
  }
});

/**
 * POST /api/products/seed
 * Seed catalog products into Prisma PostgreSQL database
 */
router.post('/products/seed', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    // Check if products already exist
    const count = await prisma.product.count();
    if (count > 0) {
      return res.json({ success: true, message: `Database already contains ${count} products.` });
    }

    // Default sample products
    const initialProducts = [
      {
        slug: 'asta-black-clover-anime-poster',
        title: 'ASTA POSTER | BLACK CLOVER ANIME POSTER',
        description: 'Fierce, vibrant yellow background Asta artwork from Black Clover, printed on premium archival matte paper.',
        category: 'anime',
        price: 79.0,
        compareAtPrice: 159.0,
        images: ['/assets/posters/poster-01.jpg'],
        isBestSeller: true,
        tags: ['anime', 'black clover', 'asta', 'action'],
      },
      {
        slug: 'batman-dark-knight-dc-poster',
        title: 'THE DARK KNIGHT | BATMAN DC POSTER',
        description: 'The brooding protector of Gotham in stark contrast noir aesthetic.',
        category: 'marvel-dc',
        price: 79.0,
        compareAtPrice: 159.0,
        images: ['/assets/posters/poster-02.jpg'],
        isBestSeller: true,
        tags: ['dc', 'batman', 'dark knight', 'gotham'],
      },
      {
        slug: 'spider-man-across-spider-verse',
        title: 'MILES MORALES | SPIDER-MAN ACROSS SPIDER-VERSE',
        description: 'Vibrant neon dimensional leap of Miles Morales over Neo-Manhattan.',
        category: 'marvel-dc',
        price: 79.0,
        compareAtPrice: 159.0,
        images: ['/assets/posters/poster-03.jpg'],
        isBestSeller: true,
        tags: ['marvel', 'spider-man', 'miles morales'],
      },
      {
        slug: 'mount-fuji-cherry-blossoms-landscape',
        title: 'MOUNT FUJI & SAKURA | JAPANESE LANDSCAPE POSTER',
        description: 'Serene sunrise over Mount Fuji framed by blooming cherry blossoms in misty spring.',
        category: 'landscapes',
        price: 79.0,
        compareAtPrice: 159.0,
        images: ['/assets/posters/poster-04.jpg'],
        isBestSeller: false,
        tags: ['landscapes', 'japan', 'fuji', 'nature'],
      },
    ];

    for (const prod of initialProducts) {
      await prisma.product.upsert({
        where: { slug: prod.slug },
        update: {},
        create: prod,
      });
    }

    return res.json({ success: true, message: `Seeded ${initialProducts.length} initial products.` });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Database seeding failed' });
  }
});

export default router;
