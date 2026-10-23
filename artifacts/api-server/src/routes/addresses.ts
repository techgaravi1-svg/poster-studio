import { Router, type Request, type Response } from 'express';
import { prisma } from '@workspace/db';
import { z } from 'zod';
import { rateLimiter } from '../middlewares/security';

const router: Router = Router();

const AddressSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(15),
  pincode: z.string().min(4).max(10),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  locality: z.string().min(2).max(250),
  flat: z.string().min(1).max(250),
  landmark: z.string().max(250).optional(),
  type: z.enum(['home', 'office', 'other']).default('home'),
  isDefault: z.boolean().default(false),
});

/**
 * GET /api/addresses
 * Retrieve saved addresses (optionally filter by phone)
 */
router.get('/addresses', async (req: Request, res: Response) => {
  try {
    const { phone } = req.query;

    if (!phone || !String(phone).trim()) {
      return res.json({ success: true, addresses: [] });
    }

    const addresses = await prisma.address.findMany({
      where: { phone: String(phone).trim() },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return res.json({ success: true, addresses });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve addresses' });
  }
});

/**
 * POST /api/addresses
 * Create a new address
 */
router.post(
  '/addresses',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 30 }),
  async (req: Request, res: Response) => {
    try {
      const parsed = AddressSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Invalid address data', details: parsed.error.format() });
      }

      const { name, phone, pincode, city, state, locality, flat, landmark, type, isDefault } = parsed.data;

      const addressTypeEnum = type === 'office' ? 'OFFICE' : type === 'other' ? 'OTHER' : 'HOME';

      // If marked as default, unset other defaults for this phone
      if (isDefault) {
        await prisma.address.updateMany({
          where: { phone, isDefault: true },
          data: { isDefault: false },
        });
      }

      const newAddress = await prisma.address.create({
        data: {
          name,
          phone,
          pincode,
          city,
          state,
          locality,
          flat,
          landmark,
          type: addressTypeEnum,
          isDefault,
        },
      });

      return res.status(201).json({ success: true, address: newAddress });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Could not save address' });
    }
  }
);

/**
 * DELETE /api/addresses/:id
 * Delete an address
 */
router.delete('/addresses/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.address.delete({ where: { id } });
    return res.json({ success: true, message: 'Address removed successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Could not delete address' });
  }
});

export default router;
