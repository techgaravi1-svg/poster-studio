import { Router, type Request, type Response } from 'express';
import { prisma } from '@workspace/db';
import { z } from 'zod';
import { rateLimiter } from '../middlewares/security';

const router: Router = Router();

const NewsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(150),
});

/**
 * POST /api/newsletter
 * Secure newsletter registration
 */
router.post(
  '/newsletter',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 10, message: 'Too many subscription attempts.' }),
  async (req: Request, res: Response) => {
    try {
      const parsed = NewsletterSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
      }

      const email = parsed.data.email.trim().toLowerCase();

      // Upsert to handle existing emails gracefully
      await prisma.newsletterSubscriber.upsert({
        where: { email },
        update: {},
        create: { email },
      });

      return res.status(200).json({
        success: true,
        message: 'Thank you for subscribing to DUNGEONS updates!',
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Could not process newsletter subscription' });
    }
  }
);

export default router;
