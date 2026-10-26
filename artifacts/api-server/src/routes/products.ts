import { Router, type Request, type Response } from 'express';
import { prisma } from '@workspace/db';
import { z } from 'zod';
import { requireAdminAuth } from '../middlewares/security';

const router: Router = Router();

/**
 * GET /api/products
 * Fetch products with optional filtering by category and search
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { category, search, limit = '50', offset = '0' } = req.query;

    const whereClause: any = { isActive: true };

    if (category && typeof category === 'string' && category !== 'all' && category !== 'posters') {
      whereClause.category = { equals: category, mode: 'insensitive' };
    }

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        take: Math.min(Number(limit) || 100, 500),
        skip: Number(offset) || 0,
        orderBy: [{ isBestSeller: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json({
      success: true,
      products,
      pagination: {
        total,
        limit: Number(limit) || 50,
        offset: Number(offset) || 0,
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
        OR: [{ slug }, { id: slug }],
        isActive: true,
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch product details' });
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
        description: 'Fierce, vibrant yellow background Asta artwork from Black Clover, printed on 350 GSM premium archival matte paper.',
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
