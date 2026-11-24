import { Router, type Request, type Response } from 'express';
import { prisma } from '@workspace/db';
import { z } from 'zod';
import { requireAdminAuth } from '../middlewares/security';
import { isAcceptableImageInput, uploadBase64ToCloudinary } from '../lib/cloudinary';
import { clientIp } from '../lib/auth';
import { logger } from '../lib/logger';

// ==============================================================================
// HOMEPAGE HERO SLIDER
// Public: GET /api/hero-slides (active slides, in order).
// Admin:  list / create / update / delete slides.
// If the hero_slides table does not exist yet (db push not run), the public
// route returns an empty list so the storefront keeps its built-in slides.
// ==============================================================================

const router: Router = Router();

const SCHEMA_MISSING_ERROR =
  'Database not updated for hero slides yet. Run "pnpm --filter @workspace/db run push", then restart the API.';
const isSchemaMissing = (error: any) => error?.code === 'P2021' || error?.code === 'P2022';

/** Internal path ("/collections/wall-art") or a full https link. No javascript:, no protocol-relative. */
const isSafeLink = (value: string) =>
  (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) || /^https:\/\/[^\s]+$/i.test(value);

const SlideSchema = z.object({
  title: z.string().trim().max(120).default(''),
  image: z.string().refine(isAcceptableImageInput, 'Image must be an https URL or a PNG/JPEG/WEBP upload under 8MB'),
  link: z.string().trim().max(500).refine(isSafeLink, 'Link must start with / (a page on this site) or https://').default('/collections'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
const SlideUpdateSchema = SlideSchema.partial();

const serialize = (s: any) => ({
  id: s.id,
  title: s.title,
  image: s.image,
  link: s.link,
  isActive: s.isActive,
  sortOrder: s.sortOrder,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

const zodMessage = (err: z.ZodError) => err.issues.map((i) => i.message).join(', ');

async function storeImage(image: string, title: string): Promise<string> {
  if (image.startsWith('data:')) {
    return uploadBase64ToCloudinary(image, `hero_${(title || 'slide').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`);
  }
  return image;
}

async function audit(req: Request, action: string, entityId: string, details: any) {
  try {
    await prisma.auditLog.create({ data: { action, entity: 'HeroSlide', entityId, details, ipAddress: clientIp(req) } });
  } catch (err) {
    logger.warn({ err }, 'hero slide audit log failed');
  }
}

/** Public list used by the homepage. */
router.get('/hero-slides', async (_req: Request, res: Response) => {
  try {
    const slides = await prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 20,
    });
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=60');
    return res.json({ success: true, slides: slides.map(serialize) });
  } catch (error: any) {
    if (isSchemaMissing(error)) return res.json({ success: true, slides: [], configured: false });
    return res.status(500).json({ success: false, error: 'Failed to load hero slides' });
  }
});

router.get('/admin/hero-slides', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const slides = await prisma.heroSlide.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return res.json({ success: true, slides: slides.map(serialize) });
  } catch (error: any) {
    if (isSchemaMissing(error)) return res.status(503).json({ success: false, error: SCHEMA_MISSING_ERROR });
    return res.status(500).json({ success: false, error: 'Failed to load hero slides' });
  }
});

router.post('/admin/hero-slides', requireAdminAuth, async (req: Request, res: Response) => {
  const parsed = SlideSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: zodMessage(parsed.error) });
  try {
    const count = await prisma.heroSlide.count();
    if (count >= 20) return res.status(400).json({ success: false, error: 'You can have up to 20 hero slides. Delete one first.' });
    const last = await prisma.heroSlide.aggregate({ _max: { sortOrder: true } });
    const image = await storeImage(parsed.data.image, parsed.data.title);
    const slide = await prisma.heroSlide.create({
      data: {
        title: parsed.data.title,
        image,
        link: parsed.data.link,
        isActive: parsed.data.isActive,
        sortOrder: parsed.data.sortOrder ?? (last._max.sortOrder ?? -1) + 1,
      },
    });
    await audit(req, 'HERO_SLIDE_CREATED', slide.id, { title: slide.title, link: slide.link });
    return res.status(201).json({ success: true, slide: serialize(slide) });
  } catch (error: any) {
    if (isSchemaMissing(error)) return res.status(503).json({ success: false, error: SCHEMA_MISSING_ERROR });
    logger.error({ err: error }, 'create hero slide failed');
    return res.status(500).json({ success: false, error: error?.message?.includes('Cloudinary') ? error.message : 'Failed to save hero slide' });
  }
});

router.patch('/admin/hero-slides/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const parsed = SlideUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: zodMessage(parsed.error) });
  try {
    const id = String(req.params.id);
    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Hero slide not found' });
    const data: any = { ...parsed.data };
    if (data.image) data.image = await storeImage(data.image, data.title ?? existing.title);
    const slide = await prisma.heroSlide.update({ where: { id }, data });
    await audit(req, 'HERO_SLIDE_UPDATED', slide.id, { fields: Object.keys(parsed.data) });
    return res.json({ success: true, slide: serialize(slide) });
  } catch (error: any) {
    if (isSchemaMissing(error)) return res.status(503).json({ success: false, error: SCHEMA_MISSING_ERROR });
    logger.error({ err: error }, 'update hero slide failed');
    return res.status(500).json({ success: false, error: 'Failed to update hero slide' });
  }
});

router.delete('/admin/hero-slides/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Hero slide not found' });
    await prisma.heroSlide.delete({ where: { id } });
    await audit(req, 'HERO_SLIDE_DELETED', id, { title: existing.title });
    return res.json({ success: true });
  } catch (error: any) {
    if (isSchemaMissing(error)) return res.status(503).json({ success: false, error: SCHEMA_MISSING_ERROR });
    return res.status(500).json({ success: false, error: 'Failed to delete hero slide' });
  }
});

export default router;
